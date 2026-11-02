'use client';

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { AssetDot } from '@/components/dashboard/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortfolio, useYieldHistory } from '@/hooks/use-dashboard';
import { useTick } from '@/hooks/use-tick';
import { formatPercent, formatUsd, splitUsd, timeAgo } from '@/lib/format';
import { ASSET_META } from '@/lib/types';
import { cn } from '@/lib/utils';

/** The page's one bold element: net worth in the display serif, with the holdings ribbon. */
export function NetWorth() {
  const { data, prices } = usePortfolio();
  const history = useYieldHistory();
  const tick = useTick(data?.totalUsd ?? null);

  if (!data) {
    return (
      <section className="py-2" aria-busy="true">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-16 w-80 max-w-full" />
        <Skeleton className="mt-8 h-2 w-full" />
      </section>
    );
  }

  const { totalUsd, change24hUsd, yieldUsd, rows } = data;
  const { whole, cents } = splitUsd(totalUsd ?? 0);
  const base = totalUsd !== null && change24hUsd !== null ? totalUsd - change24hUsd : null;
  const changePct = base && base > 0 && change24hUsd !== null ? (change24hUsd / base) * 100 : null;
  const up = (change24hUsd ?? 0) >= 0;
  const lastPayout = history.data?.own[0]?.confirmedAt ?? history.data?.own[0]?.createdAt;
  const hasHoldings = (totalUsd ?? 0) > 0;

  return (
    <section aria-labelledby="networth-label" className="pt-2">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p id="networth-label" className="text-[13px] text-mist">
            Net worth
          </p>
          <p
            key={tick.n}
            className={cn(
              'mt-1 font-display text-[52px] leading-[0.95] tracking-[-0.01em] text-foreground sm:text-[76px]',
              tick.dir === 'up' && 'animate-flash-up',
              tick.dir === 'down' && 'animate-flash-down',
            )}
            aria-live="off"
          >
            {totalUsd === null ? (
              <span className="text-mist">{prices.isError ? 'Prices unavailable' : '—'}</span>
            ) : (
              <>
                {whole}
                <span className="text-[0.55em] text-mist">{cents}</span>
              </>
            )}
          </p>
          {change24hUsd !== null && hasHoldings && (
            <p className={cn('mt-3 flex items-center gap-1.5 text-[14px] tabular', up ? 'text-up' : 'text-down')}>
              {up ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
              {formatUsd(change24hUsd, { signed: true })}
              <span className="text-mist">({formatPercent(changePct, { signed: true })}) past 24 hours</span>
            </p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-10 gap-y-1 text-[13px] sm:flex sm:gap-12">
          <div>
            <dt className="text-mist">Interest earned</dt>
            <dd className="mt-1 text-[20px] font-medium tabular text-foreground">{yieldUsd === null ? '—' : formatUsd(yieldUsd)}</dd>
          </div>
          <div>
            <dt className="text-mist">Last payout</dt>
            <dd className="mt-1 text-[20px] font-medium text-foreground">{lastPayout ? timeAgo(lastPayout) : 'None yet'}</dd>
          </div>
        </dl>
      </div>

      {/* Holdings ribbon: each asset's share of net worth. Grows in once on load. */}
      <div className="mt-8">
        <div className="flex h-2 w-full origin-left animate-ribbon gap-[3px] overflow-hidden rounded-[2px]" role="img" aria-label={rows.map((r) => `${r.asset} ${(r.share * 100).toFixed(1)}%`).join(', ')}>
          {hasHoldings ? (
            rows.filter((r) => r.share > 0).map((r) => (
              <div key={r.asset} className="h-full first:rounded-l-[2px] last:rounded-r-[2px]" style={{ width: `${r.share * 100}%`, background: ASSET_META[r.asset].color }} />
            ))
          ) : (
            <div className="h-full w-full bg-rule" />
          )}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-[13px]">
          {rows.map((r) => (
            <li key={r.asset} className="flex items-center gap-2">
              <AssetDot color={ASSET_META[r.asset].color} />
              <span className="text-mist">{ASSET_META[r.asset].name}</span>
              <span className="tabular text-foreground">{(r.share * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
