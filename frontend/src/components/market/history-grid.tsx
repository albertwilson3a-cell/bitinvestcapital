'use client';

import Link from 'next/link';
import { useQueries } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Change } from '@/components/market/change';
import { CoinMark } from '@/components/market/coin-mark';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChartRange, PriceChart } from '@/hooks/use-market';
import { api } from '@/lib/api';
import { COIN_LIST } from '@/lib/coins';
import { formatPercent, formatPrice } from '@/lib/format';
import { useState } from 'react';

function useAllCharts(range: ChartRange) {
  return useQueries({
    queries: COIN_LIST.map((c) => ({
      queryKey: ['market', 'chart', c.symbol, range],
      queryFn: () => api<PriceChart>(`market/coins/${c.symbol}/chart?range=${range}`, { auth: false }),
      staleTime: 300_000,
    })),
  });
}

function PerfTip({ active, payload }: { active?: boolean; payload?: { payload: { symbol: string; change: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return <div className="rounded-md border border-rule-strong bg-vault-raised px-3 py-2 text-[12px] shadow-xl">{p.symbol} <span className="tabular ml-2">{formatPercent(p.change, { signed: true })}</span></div>;
}

/** Small-multiple charts for every coin plus a performance comparison. */
export function HistoryGrid() {
  const [range, setRange] = useState<ChartRange>('1Y');
  const charts = useAllCharts(range);
  const perf = COIN_LIST.map((c, i) => ({ symbol: c.symbol, change: charts[i].data?.changePercent ?? 0 })).sort((a, b) => b.change - a.change);
  const ready = charts.every((q) => q.data);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-mist">Showing performance over the selected period for all {COIN_LIST.length} coins.</p>
        <Segmented label="Period" value={range} onChange={setRange} options={(['30D', '90D', '1Y'] as const).map((r) => ({ value: r, label: r }))} />
      </div>

      <section className="rounded-xl border border-rule bg-vault/60 p-5 sm:p-6">
        <h3 className="text-[15px] font-semibold">Performance comparison</h3>
        <p className="mt-0.5 text-[13px] text-mist">Price change over {range === '1Y' ? 'the last year' : `the last ${range.replace('D', '')} days`}.</p>
        <div className="mt-4 h-[320px]">
          {!ready ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perf} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="symbol" tick={{ fill: 'var(--mist)', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis width={52} tickFormatter={(v: number) => `${v.toFixed(0)}%`} tick={{ fill: 'var(--mist)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<PerfTip />} cursor={{ fill: 'var(--accent)' }} />
                <Bar dataKey="change" radius={[3, 3, 3, 3]} isAnimationActive={false}>
                  {perf.map((p) => <Cell key={p.symbol} fill={p.change >= 0 ? 'var(--up)' : 'var(--down)'} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COIN_LIST.map((c, i) => {
          const q = charts[i];
          const d = q.data;
          const up = (d?.changePercent ?? 0) >= 0;
          const color = up ? 'var(--up)' : 'var(--down)';
          return (
            <Link key={c.symbol} href={`/markets/${c.symbol.toLowerCase()}`} className="group rounded-xl border border-rule bg-vault/60 p-4 transition-colors hover:border-rule-strong">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5">
                  <CoinMark symbol={c.symbol} size="sm" />
                  <span className="text-[14px] font-semibold group-hover:underline group-hover:underline-offset-4">{c.name}</span>
                </span>
                {d && <Change value={d.changePercent} className="text-[13px] font-medium" />}
              </div>
              <div className="mt-3 h-[110px]">
                {!d ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={d.points.map(([t, p]) => ({ t, p }))} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`hg-${c.symbol}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <YAxis hide domain={['auto', 'auto']} />
                      <Area type="monotone" dataKey="p" stroke={color} strokeWidth={1.5} fill={`url(#hg-${c.symbol})`} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
              {d && (
                <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div><dt className="text-mist">Now</dt><dd className="tabular text-foreground">{formatPrice(d.close)}</dd></div>
                  <div><dt className="text-mist">High</dt><dd className="tabular text-foreground">{formatPrice(d.high)}</dd></div>
                  <div><dt className="text-mist">Low</dt><dd className="tabular text-foreground">{formatPrice(d.low)}</dd></div>
                </dl>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
