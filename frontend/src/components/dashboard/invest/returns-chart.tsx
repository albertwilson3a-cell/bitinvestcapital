'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Sprout } from 'lucide-react';
import { Panel } from '@/components/dashboard/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrices, useYieldHistory } from '@/hooks/use-dashboard';
import { useNow } from '@/hooks/use-investments';
import { formatUsd } from '@/lib/format';

interface Day { t: number; usd: number }
const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

/** Returns paid into the investment, per day, over the last 30 days. */
export function ReturnsChart() {
  const history = useYieldHistory();
  const prices = usePrices();
  const now = useNow(60_000);

  const data = useMemo<Day[] | null>(() => {
    if (!history.data) return null;
    const price = (a: string) => (a === 'USDT' ? 1 : Number(prices.data?.quotes.find((q) => q.asset === a)?.usd ?? 0));
    const today = Math.floor(now / 86_400_000) * 86_400_000;
    const days = new Map<number, number>();
    for (let i = 29; i >= 0; i--) days.set(today - i * 86_400_000, 0);
    for (const t of history.data.own) {
      const d = Math.floor(new Date(t.confirmedAt ?? t.createdAt).getTime() / 86_400_000) * 86_400_000;
      if (days.has(d)) days.set(d, days.get(d)! + Number(t.amount) * price(t.assetType));
    }
    return [...days.entries()].map(([t, usd]) => ({ t, usd }));
  }, [history.data, prices.data, now]);

  const total = data?.reduce((s, d) => s + d.usd, 0) ?? 0;

  return (
    <Panel id="returns" title="Returns paid" description="Added to your investment at each payout, last 30 days, at today’s prices.">
      {!data ? (
        <Skeleton className="h-[220px] w-full" />
      ) : total === 0 ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-rule text-center">
          <Sprout className="size-7 text-mist" />
          <p className="max-w-xs text-[13px] text-mist">Your first return appears after your investment completes a full payout period.</p>
        </div>
      ) : (
        <>
          <p className="tabular mb-2 text-[20px] font-semibold text-up">+{formatUsd(total)} <span className="text-[12px] font-normal text-mist">in 30 days</span></p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--rule)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="t" tickFormatter={(t: number) => dayFmt.format(t)} tick={{ fill: 'var(--mist)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis width={56} tickFormatter={(v: number) => formatUsd(v, { compact: true })} tick={{ fill: 'var(--mist)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'var(--accent)' }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-md border border-rule-strong bg-vault-raised px-3 py-2 text-[12px] shadow-xl">
                        <div className="text-mist">{dayFmt.format((payload[0].payload as Day).t)}</div>
                        <div className="tabular mt-0.5 font-medium text-up">+{formatUsd((payload[0].payload as Day).usd)}</div>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="usd" fill="var(--up)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Panel>
  );
}
