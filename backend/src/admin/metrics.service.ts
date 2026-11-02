import { Injectable } from '@nestjs/common';
import { AssetType, Prisma } from '../generated/prisma/client.js';
import { PriceService } from '../payments/price.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const ASSETS = Object.values(AssetType);
const DAYS = 30;

type ByAsset = Record<AssetType, string>;

export interface DayPoint {
  day: string; // YYYY-MM-DD (UTC)
  usd: number | null;
  count?: number;
}

function zeroByAsset(): ByAsset {
  return { USDT: '0', ETH: '0', BTC: '0' };
}

function utcDays(n: number, now = new Date()): string[] {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: n }, (_, i) => new Date(end - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

/**
 * Platform analytics for the admin console. Every figure is one aggregate query
 * over the ledger; USD values use live prices and are null if prices are down
 * (asset amounts are always returned).
 */
@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prices: PriceService,
  ) {}

  async overview() {
    const priceMap = await this.prices
      .getSnapshot()
      .then((s) => ({ source: s.source, map: new Map(s.quotes.map((q) => [q.asset, new Prisma.Decimal(q.usd)])) }))
      .catch(() => null);
    const toUsd = (amounts: ByAsset): number | null => {
      if (!priceMap) return null;
      return ASSETS.reduce((sum, a) => sum + Number(new Prisma.Decimal(amounts[a]).mul(priceMap.map.get(a) ?? 0)), 0);
    };

    const [tvl, flows, affiliates, accounts] = await Promise.all([this.tvl(), this.flows(), this.affiliates(), this.accounts()]);

    const series = (rows: { day: string; asset: AssetType; amount: string }[]): DayPoint[] => {
      const days = utcDays(DAYS);
      return days.map((day) => {
        const amounts = zeroByAsset();
        for (const r of rows.filter((x) => x.day === day)) amounts[r.asset] = r.amount;
        return { day, usd: toUsd(amounts) };
      });
    };

    return {
      generatedAt: new Date().toISOString(),
      priceSource: priceMap?.source ?? null,
      tvl: {
        byAsset: tvl,
        usd: toUsd(tvl),
        netFlow30dUsd: toUsd(flows.net30d),
      },
      netDeposits: {
        allTime: { deposits: flows.depositsAll, withdrawals: flows.withdrawalsAll, net: flows.netAll, netUsd: toUsd(flows.netAll) },
        last30dUsd: toUsd(flows.net30d),
        previous30dUsd: toUsd(flows.netPrev30d),
        pending: flows.pending,
        series: series(flows.daily),
      },
      affiliatePayouts: {
        allTime: { byAsset: affiliates.all, usd: toUsd(affiliates.all), count: affiliates.countAll },
        last30dUsd: toUsd(affiliates.last30d),
        previous30dUsd: toUsd(affiliates.prev30d),
        breakdown: affiliates.breakdown,
        series: series(affiliates.daily),
      },
      accounts: {
        ...accounts.totals,
        series: utcDays(DAYS).map((day) => ({ day, usd: null, count: accounts.daily.find((d) => d.day === day)?.count ?? 0 })),
      },
    };
  }

  private async tvl(): Promise<ByAsset> {
    const rows = await this.prisma.$queryRaw<{ asset: AssetType; amount: string }[]>`
      SELECT asset_type::text AS asset, SUM(balance + locked_balance)::text AS amount
      FROM "balances" GROUP BY asset_type`;
    const out = zeroByAsset();
    for (const r of rows) out[r.asset] = r.amount;
    return out;
  }

  private async flows() {
    const rows = await this.prisma.$queryRaw<
      { asset: AssetType; dep_all: string; wd_all: string; net_30: string; net_prev: string; pending: number }[]
    >`
      SELECT asset_type::text AS asset,
        COALESCE(SUM(amount) FILTER (WHERE type = 'deposit' AND status = 'completed'), 0)::text AS dep_all,
        COALESCE(SUM(amount) FILTER (WHERE type = 'withdrawal' AND status = 'completed'), 0)::text AS wd_all,
        COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END)
          FILTER (WHERE status = 'completed' AND confirmed_at >= now() - interval '30 days'), 0)::text AS net_30,
        COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END)
          FILTER (WHERE status = 'completed' AND confirmed_at >= now() - interval '60 days'
                    AND confirmed_at < now() - interval '30 days'), 0)::text AS net_prev,
        (COUNT(*) FILTER (WHERE type = 'deposit' AND status = 'pending'))::int AS pending
      FROM "transactions" WHERE type IN ('deposit', 'withdrawal')
      GROUP BY asset_type`;
    const daily = await this.prisma.$queryRaw<{ day: string; asset: AssetType; amount: string }[]>`
      SELECT to_char(date_trunc('day', confirmed_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day, asset_type::text AS asset,
             SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END)::text AS amount
      FROM "transactions"
      WHERE type IN ('deposit', 'withdrawal') AND status = 'completed'
        AND confirmed_at >= date_trunc('day', now() AT TIME ZONE 'UTC') - make_interval(days => ${DAYS - 1}::int)
      GROUP BY 1, 2`;

    const depositsAll = zeroByAsset();
    const withdrawalsAll = zeroByAsset();
    const netAll = zeroByAsset();
    const net30d = zeroByAsset();
    const netPrev30d = zeroByAsset();
    let pending = 0;
    for (const r of rows) {
      depositsAll[r.asset] = r.dep_all;
      withdrawalsAll[r.asset] = r.wd_all;
      netAll[r.asset] = new Prisma.Decimal(r.dep_all).minus(r.wd_all).toFixed();
      net30d[r.asset] = r.net_30;
      netPrev30d[r.asset] = r.net_prev;
      pending += r.pending;
    }
    return { depositsAll, withdrawalsAll, netAll, net30d, netPrev30d, pending, daily };
  }

  private async affiliates() {
    const rows = await this.prisma.$queryRaw<
      { asset: AssetType; type: string; all_amt: string; all_n: number; amt_30: string; amt_prev: string }[]
    >`
      SELECT asset_type::text AS asset, type::text AS type,
        SUM(amount)::text AS all_amt, COUNT(*)::int AS all_n,
        COALESCE(SUM(amount) FILTER (WHERE confirmed_at >= now() - interval '30 days'), 0)::text AS amt_30,
        COALESCE(SUM(amount) FILTER (WHERE confirmed_at >= now() - interval '60 days'
                                     AND confirmed_at < now() - interval '30 days'), 0)::text AS amt_prev
      FROM "transactions"
      WHERE type IN ('referral_bonus', 'affiliate_yield_reward') AND status = 'completed'
      GROUP BY asset_type, type`;
    const daily = await this.prisma.$queryRaw<{ day: string; asset: AssetType; amount: string }[]>`
      SELECT to_char(date_trunc('day', confirmed_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day, asset_type::text AS asset,
             SUM(amount)::text AS amount
      FROM "transactions"
      WHERE type IN ('referral_bonus', 'affiliate_yield_reward') AND status = 'completed'
        AND confirmed_at >= date_trunc('day', now() AT TIME ZONE 'UTC') - make_interval(days => ${DAYS - 1}::int)
      GROUP BY 1, 2`;

    const all = zeroByAsset();
    const last30d = zeroByAsset();
    const prev30d = zeroByAsset();
    const breakdown = { depositBonusCount: 0, yieldShareCount: 0 };
    let countAll = 0;
    for (const r of rows) {
      all[r.asset] = new Prisma.Decimal(all[r.asset]).plus(r.all_amt).toFixed();
      last30d[r.asset] = new Prisma.Decimal(last30d[r.asset]).plus(r.amt_30).toFixed();
      prev30d[r.asset] = new Prisma.Decimal(prev30d[r.asset]).plus(r.amt_prev).toFixed();
      countAll += r.all_n;
      if (r.type === 'referral_bonus') breakdown.depositBonusCount += r.all_n;
      else breakdown.yieldShareCount += r.all_n;
    }
    return { all, last30d, prev30d, countAll, breakdown, daily };
  }

  private async accounts() {
    const [totals] = await this.prisma.$queryRaw<
      { total: number; verified: number; verified_30: number; verified_prev: number; admins: number }[]
    >`
      SELECT COUNT(*)::int AS total,
        (COUNT(*) FILTER (WHERE is_verified))::int AS verified,
        (COUNT(*) FILTER (WHERE is_verified AND verified_at >= now() - interval '30 days'))::int AS verified_30,
        (COUNT(*) FILTER (WHERE is_verified AND verified_at >= now() - interval '60 days'
                                           AND verified_at < now() - interval '30 days'))::int AS verified_prev,
        (COUNT(*) FILTER (WHERE role = 'admin'))::int AS admins
      FROM "users"`;
    const daily = await this.prisma.$queryRaw<{ day: string; count: number }[]>`
      SELECT to_char(date_trunc('day', verified_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
      FROM "users"
      WHERE is_verified AND verified_at >= date_trunc('day', now() AT TIME ZONE 'UTC') - make_interval(days => ${DAYS - 1}::int)
      GROUP BY 1`;
    return {
      totals: {
        total: totals.total,
        verified: totals.verified,
        unverified: totals.total - totals.verified,
        verifiedLast30d: totals.verified_30,
        verifiedPrevious30d: totals.verified_prev,
        admins: totals.admins,
      },
      daily,
    };
  }
}
