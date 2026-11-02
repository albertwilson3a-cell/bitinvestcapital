'use client';

import { useId, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Change } from '@/components/market/change';
import { CoinMark } from '@/components/market/coin-mark';
import { Segmented } from '@/components/ui/segmented';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CHART_RANGES, useCoinChart, useMarketCoins, type ChartRange } from '@/hooks/use-market';
import { COIN_INFO, COIN_LIST } from '@/lib/coins';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const tickFmt: Record<ChartRange, Intl.DateTimeFormat> = {
  '1D': new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }),
  '7D': new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric' }),
  '30D': new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }),
  '90D': new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }),
  '1Y': new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }),
};
const axisWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const tipFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function ChartTip({ active, payload }: { active?: boolean; payload?: { payload: { t: number; p: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { t, p } = payload[0].payload;
  return (
    <div className="rounded-md border border-rule-strong bg-vault-raised px-3 py-2 text-[12px] shadow-xl">
      <div className="text-mist">{tipFmt.format(t)}</div>
      <div className="tabular mt-0.5 text-[13px] font-medium">{formatPrice(p)}</div>
    </div>
  );
}

/**
 * Price history for one coin with range buttons. With `selectable`, a coin
 * picker lets people switch between every supported coin.
 */
export function PriceChart({
  symbol: initial = 'BTC',
  selectable = false,
  defaultRange = '30D',
  height = 320,
  className,
  onSymbolChange,
}: {
  symbol?: string;
  selectable?: boolean;
  defaultRange?: ChartRange;
  height?: number;
  className?: string;
  onSymbolChange?: (symbol: string) => void;
}) {
  const [symbol, setSymbol] = useState(initial);
  const [range, setRange] = useState<ChartRange>(defaultRange);
  const chart = useCoinChart(symbol, range);
  const coins = useMarketCoins();
  const spot = coins.data?.coins.find((c) => c.symbol === symbol);
  const gid = useId().replace(/:/g, '');
  const data = chart.data?.points.map(([t, p]) => ({ t, p })) ?? [];
  const up = (chart.data?.changePercent ?? 0) >= 0;
  const stroke = up ? 'var(--up)' : 'var(--down)';
  const info = COIN_INFO[symbol];

  return (
    <div className={cn('rounded-xl border border-rule bg-vault/60 p-4 sm:p-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {selectable ? (
            <Select value={symbol} onValueChange={(v) => { setSymbol(v); onSymbolChange?.(v); }}>
              <SelectTrigger className="h-11 w-[210px]" aria-label="Choose a coin">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COIN_LIST.map((c) => (
                  <SelectItem key={c.symbol} value={c.symbol}>
                    <span className="flex items-center gap-2">
                      <CoinMark symbol={c.symbol} size="sm" />
                      {c.name} <span className="text-mist">{c.symbol}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              <CoinMark symbol={symbol} />
              <div>
                <p className="text-[15px] font-semibold">{info?.name ?? symbol}</p>
                <p className="text-[12px] text-mist">{symbol} / USD</p>
              </div>
            </>
          )}
        </div>
        <Segmented size="sm" label="Chart range" value={range} onChange={setRange} options={CHART_RANGES.map((r) => ({ value: r, label: r }))} />
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="tabular text-[28px] leading-none font-semibold tracking-[-0.02em]">{formatPrice(spot?.priceUsd ?? chart.data?.close)}</span>
        {chart.data && (
          <span className="text-[13px] text-mist">
            <Change value={chart.data.changePercent} className="font-medium" /> over {range === '1D' ? '24 hours' : range === '1Y' ? '1 year' : `${range.replace('D', '')} days`}
          </span>
        )}
      </div>
      {chart.data && (
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-mist">
          <div className="flex gap-1.5"><dt>High</dt><dd className="tabular text-foreground">{formatPrice(chart.data.high)}</dd></div>
          <div className="flex gap-1.5"><dt>Low</dt><dd className="tabular text-foreground">{formatPrice(chart.data.low)}</dd></div>
          <div className="flex gap-1.5"><dt>Open</dt><dd className="tabular text-foreground">{formatPrice(chart.data.open)}</dd></div>
        </dl>
      )}

      <div className="mt-4 w-full" style={{ height }}>
        {chart.isError ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-rule text-[13px] text-mist">
            Price history is temporarily unavailable.
          </div>
        ) : !chart.data ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`pc-${gid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t: number) => tickFmt[range].format(t)}
                tick={{ fill: 'var(--mist)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                width={68}
                domain={['auto', 'auto']}
                orientation="right"
                tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? axisWhole.format(v) : formatPrice(v))}
                tick={{ fill: 'var(--mist)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTip />} cursor={{ stroke: 'var(--rule-strong)' }} />
              <Area type="monotone" dataKey="p" stroke={stroke} strokeWidth={1.75} fill={`url(#pc-${gid})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
