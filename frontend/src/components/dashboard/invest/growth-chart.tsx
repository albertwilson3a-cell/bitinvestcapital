'use client';

import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LineChart as LineIcon } from 'lucide-react';
import { Panel } from '@/components/dashboard/panel';
import { MoveDialog } from '@/components/dashboard/invest/move-dialog';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvestmentHistories, useLiveInvestments, type HistoryPoint } from '@/hooks/use-investments';
import type { ChartRange, PriceChart } from '@/hooks/use-market';
import { api } from '@/lib/api';
import { formatPercent, formatUsd } from '@/lib/format';
import type { Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

const RANGES: ChartRange[] = ['1D', '7D', '30D', '90D', '1Y'];
const RANGE_MS: Record<ChartRange, number> = { '1D': 86_400_000, '7D': 7 * 86_400_000, '30D': 30 * 86_400_000, '90D': 90 * 86_400_000, '1Y': 365 * 86_400_000 };

interface Point { t: number; value: number; contributed: number }

/** Coins held at time t: invested (incl. payouts) and contributed (your own money only). */
function unitsAt(points: HistoryPoint[], t: number) {
  let invested = 0;
  let contributed = 0;
  for (const p of points) {
    if (new Date(p.at).getTime() > t) break;
    invested = Number(p.invested);
    if (p.type === 'INVEST') contributed += Number(p.amount);
    else if (p.type === 'REDEEM') contributed -= Number(p.amount);
  }
  return { invested, contributed: Math.max(contributed, 0) };
}

function priceAt(series: [number, number][], t: number, fallback: number) {
  let lo = 0;
  let hi = series.length - 1;
  if (hi < 0) return fallback;
  if (t <= series[0][0]) return series[0][1];
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (series[mid][0] <= t) lo = mid;
    else hi = mid - 1;
  }
  return series[lo][1];
}

const fmt = {
  '1D': new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }),
  day: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }),
  full: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
};

function ChartTip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const gain = p.value - p.contributed;
  return (
    <div className="rounded-md border border-rule-strong bg-vault-raised px-3 py-2 text-[12px] shadow-xl">
      <div className="text-mist">{fmt.full.format(p.t)}</div>
      <div className="mt-1 flex justify-between gap-6"><span className="text-mist">Investment value</span><span className="tabular font-medium">{formatUsd(p.value)}</span></div>
      <div className="flex justify-between gap-6"><span className="text-mist">Your money in</span><span className="tabular">{formatUsd(p.contributed)}</span></div>
      <div className="flex justify-between gap-6"><span className="text-mist">Returns</span><span className={cn('tabular', gain >= 0 ? 'text-up' : 'text-down')}>{formatUsd(gain, { signed: true })}</span></div>
    </div>
  );
}

/**
 * Investment value over time: coins invested at each moment (rebuilt from the ledger,
 * payouts at the admin's rates included) × that coin's market price at the time,
 * with today's live value — interest building up right now — as the last point.
 */
export function GrowthChart() {
  const [range, setRange] = useState<ChartRange>('30D');
  const { rows, totals, now } = useLiveInvestments(5000);
  const assets = useMemo(() => (rows ?? []).filter((r) => r.investedSince).map((r) => r.asset), [rows]);
  const histories = useInvestmentHistories(assets);
  const charts = useQueries({
    queries: assets.map((a) => ({
      queryKey: ['market', 'chart', a, range],
      queryFn: () => api<PriceChart>(`market/coins/${a}/chart?range=${range}`, { auth: false }),
      refetchInterval: range === '1D' ? 60_000 : 300_000,
    })),
  });

  const data = useMemo<Point[] | null>(() => {
    if (!rows || !now || histories.some((h) => !h.data)) return null;
    if (!assets.length) return [];
    const byAsset = new Map<Asset, { hist: HistoryPoint[]; prices: [number, number][]; live: number }>();
    assets.forEach((a, i) => {
      const row = rows.find((r) => r.asset === a)!;
      byAsset.set(a, { hist: histories[i].data!.points, prices: charts[i].data?.points ?? [], live: row.price ?? 0 });
    });
    const first = Math.min(...assets.map((a) => new Date(byAsset.get(a)!.hist[0]?.at ?? now).getTime()));
    // Start at the first investment (or the range start), never at an empty account.
    const start = Math.max(now - RANGE_MS[range], first + 1);
    const steps = range === '1D' ? 96 : 120;
    const out: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = start + ((now - start) * i) / steps;
      let value = 0;
      let contributed = 0;
      for (const { hist, prices, live } of byAsset.values()) {
        const u = unitsAt(hist, t);
        const p = priceAt(prices, t, live);
        value += u.invested * p;
        contributed += u.contributed * p;
      }
      out.push({ t, value, contributed });
    }
    // Last point: live value including interest building up this period.
    out[out.length - 1] = { t: now, value: totals?.invested ?? out[out.length - 1].value, contributed: out[out.length - 1].contributed };
    return out;
  }, [rows, histories, charts, assets, range, now, totals?.invested]);

  // Returns over the range = change in (value − your money in), so deposits and moves never count as profit.
  const firstP = data?.[0];
  const lastP = data?.[data.length - 1];
  const change = firstP && lastP ? lastP.value - lastP.contributed - (firstP.value - firstP.contributed) : 0;
  const changePct = lastP && lastP.contributed > 0 ? (change / lastP.contributed) * 100 : 0;
  const lo = data?.length ? Math.min(...data.map((d) => Math.min(d.value, d.contributed))) : 0;
  const hi = data?.length ? Math.max(...data.map((d) => Math.max(d.value, d.contributed))) : 0;
  const pad = Math.max((hi - lo) * 0.25, hi * 0.002, 0.01);
  const tick = (t: number) => (range === '1D' ? fmt['1D'].format(t) : fmt.day.format(t));

  return (
    <Panel
      id="growth"
      title="Investment growth"
      description="Value of your investment over time, at market prices, including every return paid at the current admin rates."
      actions={<Segmented label="Chart range" value={range} onChange={setRange} options={RANGES.map((r) => ({ value: r, label: r }))} />}
    >
      {!data ? (
        <Skeleton className="h-[300px] w-full" />
      ) : data.length === 0 ? (
        <div className="flex h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-rule text-center">
          <LineIcon className="size-8 text-mist" />
          <p className="max-w-xs text-[14px] text-mist">Your growth chart starts with your first investment.</p>
          <MoveDialog mode="invest" trigger={<Button>Make your first investment</Button>} />
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="tabular text-[22px] font-semibold">{formatUsd(data[data.length - 1].value)}</span>
            <span className={cn('tabular text-[14px] font-medium', change >= 0 ? 'text-up' : 'text-down')}>
              {formatUsd(change, { signed: true })} ({formatPercent(changePct, { signed: true })}) returns · {range}
            </span>
          </div>
          <div className="h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--up)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--up)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--rule)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={tick} tick={{ fill: 'var(--mist)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={40} />
                <YAxis width={72} tickFormatter={(v: number) => formatUsd(v)} tick={{ fill: 'var(--mist)', fontSize: 11 }} tickLine={false} axisLine={false} domain={[Math.max(lo - pad, 0), hi + pad]} allowDataOverflow />
                <Tooltip content={<ChartTip />} cursor={{ stroke: 'var(--rule-strong)' }} />
                <Area type="monotone" dataKey="value" stroke="var(--up)" strokeWidth={2} fill="url(#growthFill)" baseValue="dataMin" isAnimationActive={false} />
                <Line type="stepAfter" dataKey="contributed" stroke="var(--mist)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-mist">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-up" /> Investment value</span>
            <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-mist" /> Your money in</span>
            <span>Gap between the lines = your returns{assets.some((a) => a !== 'USDT') ? ' (BTC and ETH also move with their price)' : ''}.</span>
          </div>
        </>
      )}
    </Panel>
  );
}
