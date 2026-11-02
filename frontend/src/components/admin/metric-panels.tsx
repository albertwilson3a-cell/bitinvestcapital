'use client';

import { ArrowDownRight, ArrowUpRight, TriangleAlert } from 'lucide-react';
import { CumulativeArea, DailyBars } from '@/components/admin/mini-charts';
import { AssetDot } from '@/components/dashboard/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminMetrics } from '@/hooks/use-admin';
import { usePrices } from '@/hooks/use-dashboard';
import { relativeChange } from '@/lib/admin-format';
import type { AdminMetrics } from '@/lib/admin-types';
import { formatAmount, formatPercent, formatUsd } from '@/lib/format';
import { ASSET_META, ASSETS } from '@/lib/types';
import { cn } from '@/lib/utils';

function Metric({ title, value, children, footer, className }: { title: string; value: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col rounded-lg border border-rule bg-vault/55 p-5 sm:p-6', className)}>
      <h2 className="text-[13px] font-medium text-mist">{title}</h2>
      <div className="mt-2 text-[30px] leading-none font-medium tracking-[-0.02em] tabular">{value}</div>
      <div className="mt-4 flex-1">{children}</div>
      {footer && <div className="mt-4 border-t border-rule/70 pt-3 text-[12px] text-mist">{footer}</div>}
    </section>
  );
}

function Change({ current, previous, suffix = 'vs previous 30 days' }: { current: number | null; previous: number | null; suffix?: string }) {
  const pct = relativeChange(current, previous);
  if (pct === null) return <span className="text-[12px] text-mist">No prior period to compare</span>;
  const up = pct >= 0;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[12px] tabular', up ? 'text-up' : 'text-down')}>
      {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {formatPercent(pct, { signed: true, digits: 1 })}
      <span className="text-mist">{suffix}</span>
    </span>
  );
}

const usdOrDash = (v: number | null) => (v === null ? '—' : formatUsd(v));

function TvlPanel({ m }: { m: AdminMetrics }) {
  const prices = usePrices();
  const price = (a: (typeof ASSETS)[number]) => {
    const q = prices.data?.quotes.find((x) => x.asset === a);
    return q ? Number(q.usd) : null;
  };
  const rows = ASSETS.map((a) => {
    const amount = Number(m.tvl.byAsset[a]);
    const p = price(a);
    return { a, amount, usd: p === null ? null : amount * p };
  });
  const total = rows.reduce((s, r) => s + (r.usd ?? 0), 0);
  return (
    <Metric
      title="Total value locked"
      value={usdOrDash(m.tvl.usd)}
      footer={
        <>
          Net deposit flow, last 30 days:{' '}
          <span className="text-foreground tabular">{m.tvl.netFlow30dUsd === null ? '—' : formatUsd(m.tvl.netFlow30dUsd, { signed: true })}</span>
        </>
      }
    >
      <div className="flex h-1.5 w-full gap-[2px] overflow-hidden rounded-[2px] bg-rule" role="img" aria-label="Composition by asset">
        {total > 0 &&
          rows.filter((r) => (r.usd ?? 0) > 0).map((r) => (
            <div key={r.a} style={{ width: `${((r.usd ?? 0) / total) * 100}%`, background: ASSET_META[r.a].color }} />
          ))}
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.a} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-[13px]">
            <span className="flex items-center gap-2">
              <AssetDot color={ASSET_META[r.a].color} />
              {ASSET_META[r.a].name}
            </span>
            <span className="text-right text-mist tabular">
              {formatAmount(r.amount, ASSET_META[r.a].decimals)} {r.a}
            </span>
            <span className="w-[64px] text-right tabular">{total > 0 && r.usd !== null ? `${((r.usd / total) * 100).toFixed(1)}%` : '—'}</span>
          </li>
        ))}
      </ul>
    </Metric>
  );
}

function NetDepositsPanel({ m }: { m: AdminMetrics }) {
  const d = m.netDeposits;
  return (
    <Metric
      title="Net deposits, last 30 days"
      value={d.last30dUsd === null ? '—' : formatUsd(d.last30dUsd, { signed: true })}
      footer={
        <span className="flex flex-wrap justify-between gap-2">
          <span>
            All time: <span className="text-foreground tabular">{usdOrDash(d.allTime.netUsd)}</span>
          </span>
          <span className={cn(d.pending > 0 && 'text-brass')}>
            {d.pending} {d.pending === 1 ? 'deposit' : 'deposits'} confirming
          </span>
        </span>
      }
    >
      <Change current={d.last30dUsd} previous={d.previous30dUsd} />
      <div className="mt-3">
        <DailyBars data={d.series} unit="usd" />
      </div>
    </Metric>
  );
}

function AffiliatePanel({ m }: { m: AdminMetrics }) {
  const a = m.affiliatePayouts;
  return (
    <Metric
      title="Affiliate payouts, all time"
      value={usdOrDash(a.allTime.usd)}
      footer={
        <span className="flex flex-wrap justify-between gap-2">
          <span>
            <span className="text-foreground tabular">{a.breakdown.depositBonusCount.toLocaleString()}</span>{' '}
            {a.breakdown.depositBonusCount === 1 ? 'deposit bonus' : 'deposit bonuses'}
          </span>
          <span>
            <span className="text-foreground tabular">{a.breakdown.yieldShareCount.toLocaleString()}</span>{' '}
            {a.breakdown.yieldShareCount === 1 ? 'yield share' : 'yield shares'}
          </span>
        </span>
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[13px] tabular">{usdOrDash(a.last30dUsd)} in the last 30 days</span>
        <Change current={a.last30dUsd} previous={a.previous30dUsd} suffix="" />
      </div>
      <div className="mt-3">
        <CumulativeArea data={a.series} />
      </div>
    </Metric>
  );
}

function AccountsPanel({ m }: { m: AdminMetrics }) {
  const c = m.accounts;
  const rate = c.total ? (c.verified / c.total) * 100 : null;
  return (
    <Metric
      title="Verified accounts"
      value={
        <>
          {c.verified.toLocaleString()}
          <span className="text-[16px] text-mist"> of {c.total.toLocaleString()}</span>
        </>
      }
      footer={
        <span className="flex flex-wrap justify-between gap-2">
          <span>
            <span className="text-foreground tabular">{rate === null ? '—' : formatPercent(rate, { digits: 1 })}</span> confirmed their email
          </span>
          <span>
            <span className="text-foreground tabular">{c.admins}</span> {c.admins === 1 ? 'admin' : 'admins'}
          </span>
        </span>
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[13px] tabular">{c.verifiedLast30d.toLocaleString()} verified in the last 30 days</span>
        <Change current={c.verifiedLast30d} previous={c.verifiedPrevious30d} suffix="" />
      </div>
      <div className="mt-3">
        <DailyBars data={c.series} unit="count" color="var(--asset-usdt)" />
      </div>
    </Metric>
  );
}

export function MetricPanels() {
  const { data, isLoading, isError, error } = useAdminMetrics();
  if (isLoading) {
    return (
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[260px]" />)}
      </div>
    );
  }
  if (isError || !data) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-down/30 bg-down/5 px-4 py-3 text-[13px] text-down" role="alert">
        <TriangleAlert className="size-4" /> Metrics could not be loaded: {error?.message ?? 'unknown error'}.
      </p>
    );
  }
  return (
    <>
      {data.priceSource === null && (
        <p className="mb-4 flex items-center gap-2 text-[13px] text-brass" role="status">
          <TriangleAlert className="size-4" /> Prices are unavailable, so USD figures are hidden. Asset amounts are exact.
        </p>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <TvlPanel m={data} />
        <NetDepositsPanel m={data} />
        <AffiliatePanel m={data} />
        <AccountsPanel m={data} />
      </div>
    </>
  );
}
