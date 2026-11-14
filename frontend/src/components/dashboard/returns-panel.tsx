'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Panel } from '@/components/dashboard/panel';
import { CoinMark } from '@/components/market/coin-mark';
import { Skeleton } from '@/components/ui/skeleton';
import { growth } from '@/components/site/calculators';
import { useAllocations, usePortfolio } from '@/hooks/use-dashboard';
import { usePublicRates, weeklyLabel } from '@/hooks/use-public';
import { coinColor } from '@/lib/coins';
import { formatUsd } from '@/lib/format';
import type { Asset } from '@/lib/types';

const HORIZON = 12;
const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' });

interface Line {
  asset: Asset;
  usd: number;
  apy: number;
  apyPercent: string;
  weekly: string;
  interval: 'DAILY' | 'HOURLY';
}

function Tip({ active, payload, lines }: { active?: boolean; payload?: { payload: Record<string, number> }[]; lines: Line[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const total = lines.reduce((s, l) => s + (p[l.asset] ?? 0), 0);
  return (
    <div className="rounded-md border border-rule-strong bg-vault-raised px-3 py-2 text-[12px] shadow-xl">
      <div className="text-mist">{p.m === 0 ? 'Today' : `In ${p.m} month${p.m === 1 ? '' : 's'} (${monthFmt.format(p.t)})`}</div>
      {lines.map((l) => (
        <div key={l.asset} className="mt-1 flex justify-between gap-6">
          <span className="text-mist">{l.asset} yield</span>
          <span className="tabular">{formatUsd(p[l.asset] ?? 0)}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between gap-6 border-t border-rule pt-1">
        <span className="text-mist">Total</span>
        <span className="tabular text-up">{formatUsd(total)}</span>
      </div>
    </div>
  );
}

/**
 * Projected yield on the assets the client has switched on, at today's
 * published rates and prices. Labelled as a projection: rates are variable.
 */
export function ReturnsPanel({ className }: { className?: string }) {
  const portfolio = usePortfolio();
  const allocations = useAllocations();
  const rates = usePublicRates();

  const lines = useMemo<Line[] | null>(() => {
    if (!portfolio.data || !allocations.data || !rates.data) return null;
    return allocations.data.earningAssets.flatMap((asset) => {
      const rate = rates.data.yields.find((y) => y.asset === asset);
      const row = portfolio.data!.rows.find((r) => r.asset === asset);
      if (!rate || !row?.usd) return [];
      return [{
        asset,
        usd: row.usd,
        apy: Number(rate.apyPercent),
        apyPercent: rate.apyPercent,
        weekly: rate.weeklyPercent,
        interval: rate.interval,
      }];
    });
  }, [portfolio.data, allocations.data, rates.data]);

  const data = useMemo(() => {
    if (!lines) return null;
    const start = new Date();
    return Array.from({ length: HORIZON + 1 }, (_, m) => {
      const t = new Date(start.getFullYear(), start.getMonth() + m, start.getDate()).getTime();
      const point: Record<string, number> = { m, t };
      for (const l of lines) point[l.asset] = l.usd * (growth(l.apy, m / 12) - 1);
      return point;
    });
  }, [lines]);

  const total12 = lines?.reduce((s, l) => s + l.usd * (growth(l.apy, 1) - 1), 0) ?? 0;
  const earning = lines?.reduce((s, l) => s + l.usd, 0) ?? 0;

  return (
    <Panel
      id="returns"
      title="Projected returns"
      description="Yield your earning assets would add over the next 12 months at today’s rates and prices."
      className={className}
      actions={
        lines?.length ? (
          <div className="text-right">
            <div className="tabular text-[18px] font-medium text-up">+{formatUsd(total12)}</div>
            <div className="tabular text-[12px] text-mist">on {formatUsd(earning)} earning</div>
          </div>
        ) : undefined
      }
    >
      {!data || !lines ? (
        <Skeleton className="h-[240px] w-full" />
      ) : lines.length === 0 ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-rule text-center">
          <TrendingUp className="size-5 text-mist" />
          <p className="max-w-[340px] text-[13px] text-mist">
            Nothing is earning yet. Deposit an asset and switch it on in <a href="#allocation" className="text-brass underline-offset-4 hover:underline">your allocation</a> to see your projected returns here.
          </p>
        </div>
      ) : (
        <>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  {lines.map((l) => (
                    <linearGradient key={l.asset} id={`ret-${l.asset}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={coinColor(l.asset)} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={coinColor(l.asset)} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
                <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t: number) => monthFmt.format(t)} tick={{ fill: 'var(--mist)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
                <YAxis width={68} tickFormatter={(v: number) => formatUsd(v, { compact: true }).replace('.00', '')} tick={{ fill: 'var(--mist)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip lines={lines} />} cursor={{ stroke: 'var(--rule-strong)' }} />
                {lines.map((l) => (
                  <Area key={l.asset} type="monotone" dataKey={l.asset} stackId="1" stroke={coinColor(l.asset)} strokeWidth={1.5} fill={`url(#ret-${l.asset})`} isAnimationActive={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-4 divide-y divide-rule text-[13px]">
            {lines.map((l) => (
              <li key={l.asset} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="flex items-center gap-2.5">
                  <CoinMark symbol={l.asset} size="sm" />
                  <span className="font-medium">{l.asset}</span>
                  <span className="text-mist">{formatUsd(l.usd)} at {weeklyLabel(l.weekly)} a week ({l.apyPercent}% a year), paid {l.interval === 'HOURLY' ? 'hourly' : 'daily'}</span>
                </span>
                <span className="tabular text-up">+{formatUsd(l.usd * (growth(l.apy, 1) - 1))} / year</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-mist">
            A projection, not a promise: rates are variable and can change or be paused, and BTC and ETH yield is paid in those coins, so its dollar value moves with their prices.{' '}
            <Link href="/earn" className="text-foreground/80 underline-offset-4 hover:underline">How yield works</Link>
          </p>
        </>
      )}
    </Panel>
  );
}
