'use client';

import { useState } from 'react';
import { Pie, PieChart, ResponsiveContainer } from 'recharts';
import { AssetDot, Panel } from '@/components/dashboard/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortfolio } from '@/hooks/use-dashboard';
import { formatAmount, formatUsd } from '@/lib/format';
import { ASSET_META } from '@/lib/types';
import { cn } from '@/lib/utils';

export function DistributionPanel({ className }: { className?: string }) {
  const { data } = usePortfolio();
  const [active, setActive] = useState<number | null>(null);

  const rows = data?.rows ?? [];
  const slices = rows
    .filter((r) => (r.usd ?? 0) > 0)
    .map((r) => ({ name: r.asset, value: r.usd ?? 0, fill: ASSET_META[r.asset].color }));
  const focus = active !== null ? slices[active] : null;
  const focusRow = focus ? rows.find((r) => r.asset === focus.name) : null;

  return (
    <Panel title="Holdings distribution" description="Share of net worth by asset, at live prices." className={className}>
      {!data ? (
        <Skeleton className="mx-auto mt-2 aspect-square w-48 rounded-full" />
      ) : (
        <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,220px)_1fr]">
          <div className="relative mx-auto aspect-square w-full max-w-[220px]">
            {slices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices.map((s, i) => ({ ...s, fillOpacity: active === null || active === i ? 1 : 0.25 }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="74%"
                    outerRadius="100%"
                    paddingAngle={slices.length > 1 ? 2 : 0}
                    stroke="none"
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={false}
                    onMouseEnter={(_, i) => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="size-full rounded-full border-[14px] border-rule" />
            )}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[12px] text-mist">{focus ? ASSET_META[focus.name].name : 'Total'}</span>
              <span className="mt-0.5 text-[19px] font-medium tabular">
                {focus ? `${((focusRow?.share ?? 0) * 100).toFixed(1)}%` : formatUsd(data.totalUsd ?? 0, { compact: true })}
              </span>
            </div>
          </div>

          <ul className="flex flex-col divide-y divide-rule/70">
            {rows.map((r) => {
              const sliceIndex = slices.findIndex((s) => s.name === r.asset);
              return (
                <li
                  key={r.asset}
                  className={cn(
                    'grid grid-cols-[1fr_auto] items-center gap-x-4 py-2.5 transition-opacity',
                    active !== null && active !== sliceIndex && 'opacity-50',
                  )}
                  onMouseEnter={() => sliceIndex >= 0 && setActive(sliceIndex)}
                  onMouseLeave={() => setActive(null)}
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <AssetDot color={ASSET_META[r.asset].color} className="mt-[7px]" />
                    <div className="min-w-0">
                      <div className="text-[14px] whitespace-nowrap">{ASSET_META[r.asset].name}</div>
                      <div className="text-[12px] text-mist tabular">
                        {formatAmount(r.amount, ASSET_META[r.asset].decimals)} {r.asset}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] tabular">{r.usd === null ? '—' : formatUsd(r.usd)}</div>
                    <div className="text-[12px] text-mist tabular">{(r.share * 100).toFixed(1)}%</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Panel>
  );
}
