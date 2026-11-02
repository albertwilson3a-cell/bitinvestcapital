import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  YieldInterval,
  YieldRunStatus,
  type YieldRun,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { latestCompletedPeriod, type Period } from './yield-math.js';
import { YieldRatesService, type RateSnapshotEntry } from './yield-rates.service.js';
import { SettingsService } from '../settings/settings.service.js';

export type RunTrigger = 'scheduler' | 'manual' | 'startup';

export type RunResult =
  | { status: 'completed'; run: YieldRun }
  | { status: 'failed'; run: YieldRun; error: string }
  | { status: 'already_completed'; run: YieldRun }
  | { status: 'in_progress'; run: YieldRun }
  | { status: 'skipped'; periodKey: string; reason: string };

interface ChunkResult {
  scanned: number;
  lastId: string | null;
  payouts: number;
  affiliateRewards: number;
}

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Pays interest on every active holding for the latest completed period.
 *
 * Correctness model:
 *  - A run is claimed via the unique period_key, so a period is paid once even
 *    with several app instances firing the same cron.
 *  - Holdings are processed in keyset-paginated chunks; each chunk is ONE database
 *    transaction of four set-based statements (no per-user round trips).
 *  - Payout rows are unique per (run, user, asset) and affiliate rows per source
 *    payout, so a crashed run can be resumed without double-paying anyone.
 *  - Principal = current balance − external inflows (deposits, deposit referral
 *    bonuses) credited after the period started: money must be held through the
 *    whole period to earn for it. Earlier yield and affiliate rewards compound.
 */
@Injectable()
export class YieldEngineService {
  private readonly logger = new Logger(YieldEngineService.name);
  private readonly batchSize: number;
  private readonly staleMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rates: YieldRatesService,
    private readonly settings: SettingsService,
    config: ConfigService,
  ) {
    this.batchSize = config.get<number>('YIELD_BATCH_SIZE') ?? 500;
    this.staleMinutes = config.get<number>('YIELD_STALE_RUN_MINUTES') ?? 60;
  }

  async runLatest(interval: YieldInterval, trigger: RunTrigger, now: Date = new Date()): Promise<RunResult> {
    const period = latestCompletedPeriod(interval, now);
    const claim = await this.claim(interval, period, trigger);
    if ('result' in claim) return claim.result;
    return this.execute(claim.run, claim.snapshot);
  }

  listRuns(limit: number) {
    return this.prisma.yieldRun.findMany({ orderBy: { startedAt: 'desc' }, take: limit });
  }

  // ─────────────────────────── claiming ───────────────────────────

  private async claim(
    interval: YieldInterval,
    period: Period,
    trigger: RunTrigger,
  ): Promise<{ run: YieldRun; snapshot: RateSnapshotEntry[] } | { result: RunResult }> {
    const existing = await this.prisma.yieldRun.findUnique({ where: { periodKey: period.key } });
    if (existing) return this.reclaim(existing);

    const snapshot = await this.rates.snapshotFor(interval);
    if (snapshot.length === 0) {
      return { result: { status: 'skipped', periodKey: period.key, reason: 'no_active_rates_for_interval' } };
    }

    try {
      const run = await this.prisma.yieldRun.create({
        data: {
          interval,
          periodKey: period.key,
          periodStart: period.start,
          periodEnd: period.end,
          status: YieldRunStatus.RUNNING,
          trigger,
          rateSnapshot: snapshot as unknown as Prisma.InputJsonValue,
          // Frozen at claim time so a resumed run pays the same share.
          affiliateRate: await this.settings.getDecimal('affiliateYieldRewardRate'),
        },
      });
      return { run, snapshot };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Another instance claimed it between our read and insert.
        const winner = await this.prisma.yieldRun.findUniqueOrThrow({ where: { periodKey: period.key } });
        return this.reclaim(winner);
      }
      throw err;
    }
  }

  /** Resumes FAILED or stale RUNNING runs with their ORIGINAL rate snapshot. */
  private async reclaim(run: YieldRun): Promise<{ run: YieldRun; snapshot: RateSnapshotEntry[] } | { result: RunResult }> {
    if (run.status === YieldRunStatus.COMPLETED) return { result: { status: 'already_completed', run } };
    const stale = run.startedAt.getTime() < Date.now() - this.staleMinutes * 60_000;
    if (run.status === YieldRunStatus.RUNNING && !stale) return { result: { status: 'in_progress', run } };

    // Compare-and-set so only one instance resumes it.
    const { count } = await this.prisma.yieldRun.updateMany({
      where: { id: run.id, status: run.status, startedAt: run.startedAt },
      data: { status: YieldRunStatus.RUNNING, startedAt: new Date(), error: null },
    });
    const fresh = await this.prisma.yieldRun.findUniqueOrThrow({ where: { id: run.id } });
    if (count !== 1) return { result: { status: 'in_progress', run: fresh } };
    this.logger.warn(`Resuming yield run ${run.periodKey} (was ${run.status})`);
    return { run: fresh, snapshot: run.rateSnapshot as unknown as RateSnapshotEntry[] };
  }

  // ─────────────────────────── execution ───────────────────────────

  private async execute(run: YieldRun, snapshot: RateSnapshotEntry[]): Promise<RunResult> {
    const started = Date.now();
    const ratesJson = JSON.stringify(snapshot.map(({ asset, rate, decimals }) => ({ asset, rate, decimals })));
    const affiliateRate = (run.affiliateRate ?? (await this.settings.getDecimal('affiliateYieldRewardRate'))).toFixed();
    let cursor = ZERO_UUID;
    let scanned = 0;

    try {
      for (;;) {
        const chunk = await this.withDeadlockRetry(() => this.processChunk(run, ratesJson, affiliateRate, cursor));
        scanned += chunk.scanned;
        if (chunk.scanned < this.batchSize || !chunk.lastId) break;
        cursor = chunk.lastId;
      }

      const totals = await this.totals(run.id);
      const done = await this.prisma.yieldRun.update({
        where: { id: run.id },
        data: {
          status: YieldRunStatus.COMPLETED,
          finishedAt: new Date(),
          holdingsScanned: scanned,
          payoutsCreated: totals.payoutCount,
          affiliateRewards: totals.affiliateCount,
          totals: totals.byAsset as Prisma.InputJsonValue,
        },
      });
      this.logger.log(
        `Yield run ${run.periodKey} completed in ${Date.now() - started} ms: ` +
          `${scanned} holdings, ${totals.payoutCount} payouts, ${totals.affiliateCount} affiliate rewards`,
      );
      return { status: 'completed', run: done };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Yield run ${run.periodKey} failed: ${message}`);
      const failed = await this.prisma.yieldRun.update({
        where: { id: run.id },
        data: { status: YieldRunStatus.FAILED, error: message.slice(0, 1000), finishedAt: new Date() },
      });
      return { status: 'failed', run: failed, error: message };
    }
  }

  private processChunk(run: YieldRun, ratesJson: string, affiliateRate: string, cursor: string): Promise<ChunkResult> {
    return this.prisma.$transaction(
      async (tx) => {
        // 1. Lock the next page of eligible holdings, compute principal and
        //    interest, and insert payout rows — one statement.
        const [page] = await tx.$queryRaw<{ scanned: number; last_id: string | null; payout_ids: string[] }[]>`
          WITH rates AS (
            SELECT r.asset, r.rate::numeric AS rate, r.decimals
            FROM jsonb_to_recordset(${ratesJson}::jsonb) AS r(asset text, rate text, decimals int)
          ),
          candidates AS (
            SELECT b.id AS balance_id, b.user_id, b.asset_type, b.balance
            FROM "balances" b
            JOIN "dynamic_allocations" a
              ON a.user_id = b.user_id AND a.asset_type = b.asset_type AND a.active_status
            WHERE b.asset_type::text IN (SELECT asset FROM rates)
              AND b.balance > 0
              AND b.id > ${cursor}::uuid
            ORDER BY b.id
            LIMIT ${this.batchSize}::int
            FOR UPDATE OF b
          ),
          fresh_inflows AS (
            SELECT t.user_id, t.asset_type, SUM(t.amount) AS inflow
            FROM "transactions" t
            JOIN candidates c ON c.user_id = t.user_id AND c.asset_type = t.asset_type
            WHERE t.status = 'completed'
              AND t.confirmed_at > ${run.periodStart}::timestamptz
              AND (
                t.type IN ('deposit', 'referral_bonus')
                OR (t.type = 'affiliate_yield_reward' AND t.metadata->>'yieldRunId' = ${run.id}::text)
              )
            GROUP BY t.user_id, t.asset_type
          ),
          computed AS (
            SELECT c.user_id, c.asset_type,
                   GREATEST(c.balance - COALESCE(f.inflow, 0), 0) AS principal,
                   r.rate, r.decimals
            FROM candidates c
            JOIN rates r ON r.asset = c.asset_type::text
            LEFT JOIN fresh_inflows f ON f.user_id = c.user_id AND f.asset_type = c.asset_type
          ),
          inserted AS (
            INSERT INTO "transactions"
              (id, user_id, type, asset_type, amount, status, yield_run_id, confirmed_at, metadata, created_at, updated_at)
            SELECT gen_random_uuid(), x.user_id, 'yield_payout'::transaction_type, x.asset_type,
                   trunc(x.principal * x.rate, x.decimals), 'completed'::transaction_status,
                   ${run.id}::uuid, now(),
                   jsonb_build_object(
                     'principal', x.principal::text, 'periodRate', x.rate::text,
                     'periodStart', ${run.periodStart}::timestamptz, 'periodEnd', ${run.periodEnd}::timestamptz),
                   now(), now()
            FROM computed x
            WHERE trunc(x.principal * x.rate, x.decimals) > 0
            ON CONFLICT (yield_run_id, user_id, asset_type) DO NOTHING
            RETURNING id
          )
          SELECT (SELECT count(*)::int FROM candidates) AS scanned,
                 (SELECT balance_id::text FROM candidates ORDER BY balance_id DESC LIMIT 1) AS last_id,
                 COALESCE((SELECT jsonb_agg(id) FROM inserted), '[]'::jsonb) AS payout_ids`;

        const payoutIds = JSON.stringify(page.payout_ids);
        if (page.payout_ids.length === 0) {
          return { scanned: page.scanned, lastId: page.last_id, payouts: 0, affiliateRewards: 0 };
        }

        // 2. Credit holders (rows already locked in step 1).
        await tx.$executeRaw`
          UPDATE "balances" b
          SET balance = b.balance + t.amount,
              flexible_yield_earned = b.flexible_yield_earned + t.amount,
              updated_at = now()
          FROM "transactions" t
          WHERE t.id IN (SELECT jsonb_array_elements_text(${payoutIds}::jsonb)::uuid)
            AND b.user_id = t.user_id AND b.asset_type = t.asset_type`;

        // 3. Affiliate reward: a share of each payout to the earner's direct referrer,
        //    in the same asset. Unique source_transaction_id = at most one per payout.
        const affiliate = await tx.$queryRaw<{ id: string }[]>`
          INSERT INTO "transactions"
            (id, user_id, type, asset_type, amount, status, source_transaction_id, confirmed_at, metadata, created_at, updated_at)
          SELECT gen_random_uuid(), u.referred_by_user_id, 'affiliate_yield_reward'::transaction_type, t.asset_type,
                 trunc(t.amount * ${affiliateRate}::numeric, r.decimals), 'completed'::transaction_status,
                 t.id, now(),
                 jsonb_build_object('refereeId', t.user_id, 'yieldRunId', ${run.id}::text,
                                    'rewardRate', ${affiliateRate}::text, 'sourceYield', t.amount::text),
                 now(), now()
          FROM "transactions" t
          JOIN "users" u ON u.id = t.user_id
          JOIN jsonb_to_recordset(${ratesJson}::jsonb) AS r(asset text, rate text, decimals int)
            ON r.asset = t.asset_type::text
          LEFT JOIN "referrals" rf ON rf.referee_id = t.user_id
          WHERE t.id IN (SELECT jsonb_array_elements_text(${payoutIds}::jsonb)::uuid)
            AND u.referred_by_user_id IS NOT NULL
            AND (rf.id IS NULL OR rf.registration_status <> 'rejected')
            AND trunc(t.amount * ${affiliateRate}::numeric, r.decimals) > 0
          ON CONFLICT (source_transaction_id) DO NOTHING
          RETURNING id`;

        // 4. Credit referrers, aggregated per (referrer, asset) — one referrer can
        //    have many referees in a chunk — and locked in a stable order.
        if (affiliate.length > 0) {
          const affiliateIds = JSON.stringify(affiliate.map((a) => a.id));
          await tx.$executeRaw`
            INSERT INTO "balances" (id, user_id, asset_type, balance, locked_balance, flexible_yield_earned, created_at, updated_at)
            SELECT gen_random_uuid(), t.user_id, t.asset_type, SUM(t.amount), 0, 0, now(), now()
            FROM "transactions" t
            WHERE t.id IN (SELECT jsonb_array_elements_text(${affiliateIds}::jsonb)::uuid)
            GROUP BY t.user_id, t.asset_type
            ORDER BY t.user_id, t.asset_type
            ON CONFLICT (user_id, asset_type)
            DO UPDATE SET balance = "balances".balance + EXCLUDED.balance, updated_at = now()`;
        }

        return {
          scanned: page.scanned,
          lastId: page.last_id,
          payouts: page.payout_ids.length,
          affiliateRewards: affiliate.length,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 10_000, timeout: 120_000 },
    );
  }

  /** Aggregates from the ledger itself, so totals are exact even for resumed runs. */
  private async totals(runId: string) {
    const rows = await this.prisma.$queryRaw<{ asset: string; kind: string; n: number; total: string }[]>`
      SELECT asset_type::text AS asset, 'yield' AS kind, count(*)::int AS n, SUM(amount)::text AS total
      FROM "transactions" WHERE yield_run_id = ${runId}::uuid
      GROUP BY asset_type
      UNION ALL
      SELECT t.asset_type::text, 'affiliate', count(*)::int, SUM(t.amount)::text
      FROM "transactions" t JOIN "transactions" s ON s.id = t.source_transaction_id
      WHERE s.yield_run_id = ${runId}::uuid AND t.type = 'affiliate_yield_reward'
      GROUP BY t.asset_type`;
    const byAsset: Record<string, { yield: string; yieldCount: number; affiliate: string; affiliateCount: number }> = {};
    let payoutCount = 0;
    let affiliateCount = 0;
    for (const r of rows) {
      byAsset[r.asset] ??= { yield: '0', yieldCount: 0, affiliate: '0', affiliateCount: 0 };
      if (r.kind === 'yield') {
        byAsset[r.asset].yield = r.total;
        byAsset[r.asset].yieldCount = r.n;
        payoutCount += r.n;
      } else {
        byAsset[r.asset].affiliate = r.total;
        byAsset[r.asset].affiliateCount = r.n;
        affiliateCount += r.n;
      }
    }
    return { byAsset, payoutCount, affiliateCount };
  }

  private async withDeadlockRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
    for (let i = 1; ; i++) {
      try {
        return await fn();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const code = err instanceof Prisma.PrismaClientKnownRequestError ? err.code : '';
        const transient = code === 'P2034' || /deadlock|40P01|40001|could not serialize/i.test(msg);
        if (!transient || i >= attempts) throw err;
        this.logger.warn(`Yield chunk hit a lock conflict; retrying (${i}/${attempts})`);
        await new Promise((r) => setTimeout(r, 50 * 2 ** i));
      }
    }
  }
}
