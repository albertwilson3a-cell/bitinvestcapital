'use client';

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Sprout } from 'lucide-react';
import { Panel } from '@/components/dashboard/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrices, useYieldHistory } from '@/hooks/use-dashboard';
import { formatUsd } from '@/lib/format';
import type { Asset, LedgerTransaction } from '@/lib/types';

interface Point {
  t: number;
  own: number;
  affiliate: number;
}

function cumulative(own: LedgerTransaction[], affiliate: LedgerTransaction[], price: (a: Asset) => number): Point[] {
  const events = [
    ...own.map((t) => ({ t: new Date(t.confirmedAt ?? t.createdAt).getTime(), own: Number(t.amount) * price(t.assetType), affiliate: 0 })),
    ...affiliate.map((t) => ({ t: new Date(t.confirmedAt ?? t.createdAt).getTime(), own: 0, affiliate: Number(t.amount) * price(t.assetType) })),
  ].sort((a, b) => a.t - b.t);

  // One point per day keeps the curve readable whether payouts are hourly or daily.
  const byDay = new Map<number, Point>();
  let own_ = 0;
  let aff = 0;
  for (const e of events) {
    own_ += e.own;
    aff += e.affiliate;
    const day = Math.floor(e.t / 86_400_000) * 86_400_000;
    byDay.set(day, { t: day, own: own_, affiliate: aff });
  }
  const points = [...byDay.values()];
  if (points.length === 1) points.unshift({ t: points[0].t - 86_400_000, own: 0, affiliate: 0 });
  return points;
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-rule-strong bg-vault-raised px-3 py-2 text-[12px] shadow-xl">
      <div className="text-mist">{dateFmt.format(p.t)}</div>
      <div className="mt-1 flex items-center justify-between gap-6">
        <span className="text-mist">Your yield</span>
        <span className="tabular">{formatUsd(p.own)}</span>
      </div>
      <div className="flex items-center justify-between gap-6">
        <span className="text-mist">Referral rewards</span>
        <span className="tabular">{formatUsd(p.affiliate)}</span>
      </div>
    </div>
  );
}

export function YieldPanel({ className }: { className?: string }) {
  const history = useYieldHistory();
  const prices = usePrices();

  const points = useMemo(() => {
    if (!history.data || !prices.data) return null;
    const map = new Map(prices.data.quotes.map((q) => [q.asset, Number(q.usd)]));
    return cumulative(history.data.own, history.data.affiliate, (a) => map.get(a) ?? 0);
  }, [history.data, prices.data]);

  const latest = points?.at(-1);

  return (
    <Panel
      title="Yield accrued"
      description="Cumulative interest and referral rewards, valued at current prices."
      className={className}
      actions={
        latest ? (
          <div className="text-right">
            <div className="text-[18px] font-medium tabular">{formatUsd(latest.own + latest.affiliate)}</div>
            <div className="text-[12px] text-mist tabular">
              {formatUsd(latest.own)} interest, {formatUsd(latest.affiliate)} referral
            </div>
          </div>
        ) : undefined
      }
    >
      {!points ? (
        <Skeleton className="h-[220px] w-full" />
      ) : points.length === 0 ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-rule text-center">
          <Sprout className="size-5 text-mist" />
          <p className="max-w-[300px] text-[13px] text-mist">
            Yield starts after your first full payout period. Switch on earning for an asset below to begin.
          </p>
        </div>
      ) : (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="g-own" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brass)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--brass)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-aff" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--parchment)" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="var(--parchment)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t: number) => dateFmt.format(t)}
                tick={{ fill: 'var(--mist)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={32}
              />
              <YAxis
                width={52}
                tickFormatter={(v: number) => formatUsd(v, { compact: true }).replace('.00', '')}
                tick={{ fill: 'var(--mist)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--rule-strong)' }} />
              <Area type="monotone" dataKey="own" stackId="1" stroke="var(--brass)" strokeWidth={1.5} fill="url(#g-own)" isAnimationActive={false} />
              <Area type="monotone" dataKey="affiliate" stackId="1" stroke="var(--mist)" strokeWidth={1.25} fill="url(#g-aff)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
