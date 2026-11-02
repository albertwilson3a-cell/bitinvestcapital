'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Change } from '@/components/market/change';
import { CoinMark } from '@/components/market/coin-mark';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketCoins } from '@/hooks/use-market';
import { coinColor } from '@/lib/coins';
import { formatCompact, formatPercent, formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

function Card({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-rule bg-vault/60 p-5 sm:p-6', className)}>
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {description && <p className="mt-0.5 text-[13px] text-mist">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Headline numbers across all tracked coins. */
export function MarketStats({ className }: { className?: string }) {
  const { data } = useMarketCoins();
  const stats = useMemo(() => {
    if (!data) return null;
    const cap = data.coins.reduce((s, c) => s + (c.marketCapUsd ?? 0), 0);
    const vol = data.coins.reduce((s, c) => s + (c.volume24hUsd ?? 0), 0);
    const btc = data.coins.find((c) => c.symbol === 'BTC')?.marketCapUsd ?? 0;
    const stable = data.coins.filter((c) => c.symbol === 'USDT' || c.symbol === 'USDC').reduce((s, c) => s + (c.marketCapUsd ?? 0), 0);
    const up = data.coins.filter((c) => (c.change24hPercent ?? 0) > 0).length;
    return { cap, vol, btcShare: cap ? (btc / cap) * 100 : 0, stableShare: cap ? (stable / cap) * 100 : 0, up, total: data.coins.length };
  }, [data]);

  const items = stats
    ? [
        { label: 'Combined market cap', value: formatCompact(stats.cap), note: `${stats.total} coins we track` },
        { label: '24h trading volume', value: formatCompact(stats.vol), note: 'Across all markets' },
        { label: 'Bitcoin share', value: formatPercent(stats.btcShare, { digits: 1 }), note: 'Of the combined market cap' },
        { label: 'Coins up today', value: `${stats.up} of ${stats.total}`, note: `Stablecoins are ${formatPercent(stats.stableShare, { digits: 1 })} of the total` },
      ]
    : null;

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {(items ?? Array.from({ length: 4 }, () => null)).map((s, i) => (
        <div key={i} className="rounded-xl border border-rule bg-vault/60 p-5">
          {s ? (
            <>
              <p className="text-[12px] text-mist">{s.label}</p>
              <p className="tabular mt-2 text-[24px] leading-none font-semibold tracking-[-0.02em]">{s.value}</p>
              <p className="mt-2 text-[12px] text-mist">{s.note}</p>
            </>
          ) : (
            <Skeleton className="h-[76px] w-full" />
          )}
        </div>
      ))}
    </div>
  );
}

/** Share of combined market cap per coin. */
export function MarketShareChart({ className }: { className?: string }) {
  const { data } = useMarketCoins();
  const rows = useMemo(() => {
    if (!data) return null;
    const total = data.coins.reduce((s, c) => s + (c.marketCapUsd ?? 0), 0) || 1;
    return [...data.coins]
      .sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0))
      .map((c) => ({ symbol: c.symbol, share: ((c.marketCapUsd ?? 0) / total) * 100, cap: c.marketCapUsd ?? 0 }));
  }, [data]);

  return (
    <Card title="Market cap share" description="How the combined value of the coins we track is split." className={className}>
      {!rows ? (
        <Skeleton className="h-[300px] w-full" />
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full" role="img" aria-label="Market cap share by coin">
            {rows.map((r) => (
              <span key={r.symbol} style={{ width: `${r.share}%`, background: coinColor(r.symbol) }} />
            ))}
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
            {rows.map((r) => (
              <li key={r.symbol} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-[2px]" style={{ background: coinColor(r.symbol) }} />
                  {r.symbol}
                </span>
                <span className="tabular text-mist">{formatPercent(r.share, { digits: r.share < 1 ? 2 : 1 })}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function VolumeTip({ active, payload }: { active?: boolean; payload?: { payload: { symbol: string; vol: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-rule-strong bg-vault-raised px-3 py-2 text-[12px] shadow-xl">
      <span className="text-mist">{p.symbol}</span> <span className="tabular ml-2">{formatCompact(p.vol)}</span>
    </div>
  );
}

/** 24h trading volume per coin. */
export function VolumeChart({ className }: { className?: string }) {
  const { data } = useMarketCoins();
  const rows = useMemo(
    () => data && [...data.coins].sort((a, b) => (b.volume24hUsd ?? 0) - (a.volume24hUsd ?? 0)).map((c) => ({ symbol: c.symbol, vol: c.volume24hUsd ?? 0 })),
    [data],
  );
  return (
    <Card title="24-hour trading volume" description="Value traded across all markets in the last day." className={className}>
      {!rows ? (
        <Skeleton className="h-[300px] w-full" />
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="symbol" width={48} tick={{ fill: 'var(--mist)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<VolumeTip />} cursor={{ fill: 'var(--accent)' }} />
              <Bar dataKey="vol" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.symbol} fill={coinColor(r.symbol)} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/** Biggest gainers and decliners over 24 hours (stablecoins excluded). */
export function Movers({ className, hrefBase = '/markets' }: { className?: string; hrefBase?: string }) {
  const { data } = useMarketCoins();
  const sorted = useMemo(
    () => data && [...data.coins].filter((c) => c.symbol !== 'USDT' && c.symbol !== 'USDC').sort((a, b) => (b.change24hPercent ?? 0) - (a.change24hPercent ?? 0)),
    [data],
  );
  const list = (title: string, coins: typeof sorted) => (
    <Card title={title}>
      {!coins ? (
        <Skeleton className="h-[150px] w-full" />
      ) : (
        <ul className="divide-y divide-rule">
          {coins.map((c) => (
            <li key={c.symbol}>
              <Link href={`${hrefBase}/${c.symbol.toLowerCase()}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-foreground">
                <span className="flex items-center gap-2.5 text-[13px]">
                  <CoinMark symbol={c.symbol} size="sm" />
                  <span className="font-medium">{c.name}</span>
                </span>
                <span className="flex items-center gap-4 text-[13px]">
                  <span className="tabular text-mist">{formatPrice(c.priceUsd)}</span>
                  <Change value={c.change24hPercent} className="w-16 text-right font-medium" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {list('Top gainers (24h)', sorted?.slice(0, 4))}
      {list('Top decliners (24h)', sorted ? [...sorted].reverse().slice(0, 4) : undefined)}
    </div>
  );
}
