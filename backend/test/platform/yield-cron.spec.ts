/**
 * Suite 4: Yield distribution cron.
 * Unit-level test of the NestJS Tasks handler (YieldScheduler) wired to the real
 * engine and the real test database. The HTTP server is not started and the
 * cron timers are not registered; the test invokes the handlers directly.
 */
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { randomBytes } from 'node:crypto';
import { AssetType, Prisma, YieldInterval } from '../../src/generated/prisma/client.js';
import { YieldEngineService } from '../../src/yield/yield-engine.service.js';
import { latestCompletedPeriod, periodRate } from '../../src/yield/yield-math.js';
import { YieldRatesService } from '../../src/yield/yield-rates.service.js';
import { YieldScheduler } from '../../src/yield/yield.scheduler.js';
import { bootstrap, type Harness } from './support/harness.js';

const D = Prisma.Decimal;
const trunc = (v: Prisma.Decimal, dp: number) => v.toDecimalPlaces(dp, D.ROUND_DOWN);
const DECIMALS: Record<AssetType, number> = { USDT: 6, ETH: 18, BTC: 8 };
const APY: Record<AssetType, string> = { USDT: '8', BTC: '2.5', ETH: '4' };

interface Holder {
  id: string;
  holdings: Partial<Record<AssetType, string>>;
  allocated: AssetType[];
  referredBy?: string;
}

describe('Suite 4: Yield distribution cron', () => {
  let h: Harness;
  let engine: YieldEngineService;
  let scheduler: YieldScheduler;
  const admin = { id: '' };
  const people: Record<string, Holder> = {};

  /** Creates a user with balances, allocations and referral links as real related rows. */
  async function holder(name: string, holdings: Holder['holdings'], allocated: AssetType[], referredBy?: string) {
    const user = await h.prisma.user.create({
      data: {
        email: `${name}.${randomBytes(3).toString('hex')}@client.test`,
        passwordHash: '$2b$10$' + 'x'.repeat(53),
        isVerified: true,
        verifiedAt: new Date(),
        referralCode: randomBytes(5).toString('hex').toUpperCase(),
        referredByUserId: referredBy ?? null,
        balances: { create: (['USDT', 'ETH', 'BTC'] as AssetType[]).map((a) => ({ assetType: a, balance: holdings[a] ?? '0' })) },
        dynamicAllocations: {
          create: allocated.map((a) => ({ assetType: a, allocationPercentage: new D(100).div(allocated.length).toDecimalPlaces(2), activeStatus: true })),
        },
        ...(referredBy ? { referralReceived: { create: { referrerId: referredBy, registrationStatus: 'VERIFIED' } } } : {}),
      },
    });
    people[name] = { id: user.id, holdings, allocated, referredBy };
    return user.id;
  }

  const bal = async (name: string, a: AssetType) =>
    h.prisma.balance.findUniqueOrThrow({ where: { userId_assetType: { userId: people[name].id, assetType: a } } });

  beforeAll(async () => {
    // init() registers the real cron jobs; their handlers are no-ops here because the suite env
    // sets YIELD_SCHEDULER_ENABLED=false. No port is opened.
    h = await bootstrap();
    engine = h.app.get(YieldEngineService);
    // The cron handler under test, enabled explicitly (the suite env disables the real timers).
    scheduler = new YieldScheduler(engine, new ConfigService({ YIELD_SCHEDULER_ENABLED: 'true' }));

    admin.id = (
      await h.prisma.user.create({
        data: { email: `ops.${randomBytes(3).toString('hex')}@bitinvestcapital.com`, passwordHash: 'x', isVerified: true, role: 'ADMIN', referralCode: randomBytes(5).toString('hex').toUpperCase() },
      })
    ).id;
    const rates = h.app.get(YieldRatesService);
    await rates.set('USDT', { apyPercent: Number(APY.USDT), interval: YieldInterval.DAILY, isActive: true }, admin.id);
    await rates.set('BTC', { apyPercent: Number(APY.BTC), interval: YieldInterval.DAILY, isActive: true }, admin.id);
    await rates.set('ETH', { apyPercent: Number(APY.ETH), interval: YieldInterval.HOURLY, isActive: true }, admin.id); // not a daily asset

    const ref = await holder('referrer', { USDT: '1000' }, ['USDT']);
    const alice = await holder('alice', { USDT: '25000', BTC: '0.8', ETH: '5' }, ['USDT', 'BTC', 'ETH'], ref);
    await holder('bob', { USDT: '12000.5' }, ['USDT'], ref);
    await holder('grandchild', { USDT: '4000' }, ['USDT'], alice); // referred by alice → alice earns, referrer does not
    await holder('idle', { USDT: '50000' }, []); // holds funds but never allocated
    await holder('fresh', { USDT: '9000' }, ['USDT']); // 9,000 arrives during the period below
    await h.prisma.transaction.create({
      data: { userId: people.fresh.id, type: 'DEPOSIT', assetType: 'USDT', amount: '9000', status: 'COMPLETED', confirmedAt: new Date() },
    });
  });
  afterAll(async () => h?.close());

  it('is registered with the NestJS scheduler: daily at 00:00 UTC and hourly on the hour', () => {
    const registry = h.app.get(SchedulerRegistry);
    const daily = registry.getCronJob('yield-daily');
    const hourly = registry.getCronJob('yield-hourly');
    expect(String(daily.cronTime.source)).toBe('0 0 * * *');
    expect(String(hourly.cronTime.source)).toBe('0 * * * *');
    expect(daily.cronTime.timeZone).toBe('UTC');
    expect(hourly.cronTime.timeZone).toBe('UTC');
    // Next firing is a UTC midnight / the top of an hour.
    const next = daily.nextDate().toJSDate();
    expect([next.getUTCHours(), next.getUTCMinutes(), next.getUTCSeconds()]).toEqual([0, 0, 0]);
    expect(hourly.nextDate().toJSDate().getUTCMinutes()).toBe(0);
  });

  describe('daily cron run', () => {
    let runId: string;
    const rate = (a: AssetType) => new D(periodRate(APY[a], YieldInterval.DAILY));
    const expectedYield = (amount: string, a: AssetType) => trunc(new D(amount).mul(rate(a)), DECIMALS[a]);

    beforeAll(async () => {
      await scheduler.daily();
      const run = await h.prisma.yieldRun.findUniqueOrThrow({ where: { periodKey: latestCompletedPeriod(YieldInterval.DAILY).key } });
      runId = run.id;
    });

    it('completes a run for the period that just ended, with the rate matrix frozen on it', async () => {
      const run = await h.prisma.yieldRun.findUniqueOrThrow({ where: { id: runId } });
      expect(run).toMatchObject({ status: 'COMPLETED', interval: 'DAILY', trigger: 'scheduler' });
      expect(run.affiliateRate?.toString()).toBe('0.05');
      expect((run.rateSnapshot as { asset: string }[]).map((r) => r.asset).sort()).toEqual(['BTC', 'USDT']);
    });

    it('pays each active holding principal × daily rate, truncated to asset precision', async () => {
      for (const [name, asset, amount] of [
        ['alice', 'USDT', '25000'],
        ['alice', 'BTC', '0.8'],
        ['bob', 'USDT', '12000.5'],
        ['referrer', 'USDT', '1000'],
        ['grandchild', 'USDT', '4000'],
      ] as [string, AssetType, string][]) {
        const tx = await h.prisma.transaction.findUniqueOrThrow({
          where: { yieldRunId_userId_assetType: { yieldRunId: runId, userId: people[name].id, assetType: asset } },
        });
        expect(tx.type).toBe('YIELD_PAYOUT');
        expect(tx.amount.toString(), `${name} ${asset}`).toBe(expectedYield(amount, asset).toString());
        expect((await bal(name, asset)).flexibleYieldEarned.toString()).toBe(tx.amount.toString());
      }
      // Independent cross-check with plain floating point: 25,000 × (1.08^(1/365) − 1) ≈ 5.27186
      const independent = 25000 * (Math.pow(1.08, 1 / 365) - 1);
      expect(Number(expectedYield('25000', 'USDT'))).toBeCloseTo(independent, 5);
      expect(expectedYield('25000', 'USDT').toString()).toBe('5.271859');
    });

    it('skips holdings that are not allocated, assets paid hourly, and money deposited mid-period', async () => {
      const count = (name: string, asset?: AssetType) =>
        h.prisma.transaction.count({ where: { yieldRunId: runId, userId: people[name].id, ...(asset ? { assetType: asset } : {}) } });
      expect(await count('idle')).toBe(0);
      expect(await count('alice', 'ETH')).toBe(0);
      expect(await count('fresh')).toBe(0);
      expect((await bal('idle', 'USDT')).balance.toString()).toBe('50000');
    });

    it('credits each referrer a 5% share of their direct referees’ yield, in the same asset', async () => {
      const shares = await h.prisma.transaction.findMany({
        where: { type: 'AFFILIATE_YIELD_REWARD', sourceTransaction: { yieldRunId: runId } },
        include: { sourceTransaction: true },
      });
      const share = (from: string) => shares.filter((s) => s.sourceTransaction!.userId === people[from].id);

      for (const [from, asset, principal] of [['alice', 'USDT', '25000'], ['alice', 'BTC', '0.8'], ['bob', 'USDT', '12000.5']] as const) {
        const s = share(from).find((x) => x.assetType === asset)!;
        expect(s.userId).toBe(people.referrer.id);
        expect(s.amount.toString()).toBe(trunc(expectedYield(principal, asset).mul('0.05'), DECIMALS[asset]).toString());
      }
      // The grandchild's share goes to alice (direct referrer), never up to the top referrer.
      expect(share('grandchild').map((s) => s.userId)).toEqual([people.alice.id]);
      expect(share('referrer')).toHaveLength(0); // the top referrer has no referrer
    });

    it('leaves every balance equal to its starting amount plus exactly what the run posted', async () => {
      for (const [name, p] of Object.entries(people)) {
        for (const a of ['USDT', 'BTC', 'ETH'] as AssetType[]) {
          const posted = await h.prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
              userId: p.id, assetType: a,
              OR: [{ yieldRunId: runId }, { type: 'AFFILIATE_YIELD_REWARD', sourceTransaction: { yieldRunId: runId } }],
            },
          });
          const expected = new D(p.holdings[a] ?? '0').plus(posted._sum.amount ?? 0);
          expect((await bal(name, a)).balance.toString(), `${name} ${a}`).toBe(expected.toString());
        }
      }
    });

    it('is idempotent: firing the cron again for the same period pays nothing more', async () => {
      const before = (await bal('alice', 'USDT')).balance.toString();
      const n = await h.prisma.transaction.count();
      await scheduler.daily();
      expect(await h.prisma.transaction.count()).toBe(n);
      expect((await bal('alice', 'USDT')).balance.toString()).toBe(before);
    });
  });

  it('compounds: the next day’s payout is calculated on principal plus earlier yield', async () => {
    // Drive the engine (as the cron does) for two consecutive future days on a fresh holder.
    await holder('compounder', { USDT: '100000' }, ['USDT']);
    const day1 = new Date('2031-03-02T00:00:05Z');
    const day2 = new Date('2031-03-03T00:00:05Z');
    const r = new D(periodRate(APY.USDT, YieldInterval.DAILY));

    expect((await engine.runLatest(YieldInterval.DAILY, 'scheduler', day1)).status).toBe('completed');
    const p1 = trunc(new D(100000).mul(r), 6);
    expect((await bal('compounder', 'USDT')).balance.toString()).toBe(new D(100000).plus(p1).toString());

    expect((await engine.runLatest(YieldInterval.DAILY, 'scheduler', day2)).status).toBe('completed');
    const p2 = trunc(new D(100000).plus(p1).mul(r), 6);
    expect(p2.gt(p1)).toBe(true);
    const final = await bal('compounder', 'USDT');
    expect(final.balance.toString()).toBe(new D(100000).plus(p1).plus(p2).toString());
    expect(final.flexibleYieldEarned.toString()).toBe(p1.plus(p2).toString());
  });

  it('pays nothing when an asset’s rate is paused, and nothing at all when the scheduler is disabled', async () => {
    const rates = h.app.get(YieldRatesService);
    await rates.set('USDT', { apyPercent: Number(APY.USDT), interval: YieldInterval.DAILY, isActive: false }, admin.id);
    await rates.set('BTC', { apyPercent: Number(APY.BTC), interval: YieldInterval.DAILY, isActive: false }, admin.id);
    const result = await engine.runLatest(YieldInterval.DAILY, 'scheduler', new Date('2031-03-04T00:00:05Z'));
    expect(result).toMatchObject({ status: 'skipped', reason: 'no_active_rates_for_interval' });

    const n = await h.prisma.yieldRun.count();
    const disabled = new YieldScheduler(engine, new ConfigService({ YIELD_SCHEDULER_ENABLED: 'false' }));
    await disabled.daily();
    await disabled.hourly();
    expect(await h.prisma.yieldRun.count()).toBe(n);
  });
});
