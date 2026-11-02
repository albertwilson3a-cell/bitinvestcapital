'use client';

import { Change } from '@/components/market/change';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketCoins } from '@/hooks/use-market';
import { formatCompact, formatPrice } from '@/lib/format';

/** Live headline figures for one coin. */
export function CoinStats({ symbol }: { symbol: string }) {
  const { data } = useMarketCoins();
  const c = data?.coins.find((x) => x.symbol === symbol);
  const spark = c?.sparkline7d ?? [];
  const items = c
    ? [
        { label: 'Price', value: formatPrice(c.priceUsd) },
        { label: '24h change', value: <Change value={c.change24hPercent} /> },
        { label: '7d change', value: <Change value={c.change7dPercent} /> },
        { label: 'Market cap', value: formatCompact(c.marketCapUsd) },
        { label: '24h volume', value: formatCompact(c.volume24hUsd) },
        { label: '7d range', value: spark.length ? `${formatPrice(Math.min(...spark))} – ${formatPrice(Math.max(...spark))}` : '—' },
      ]
    : null;
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {(items ?? Array.from({ length: 6 }, () => null)).map((s, i) => (
        <div key={i} className="rounded-xl border border-rule bg-vault/60 p-4">
          {s ? (
            <>
              <dt className="text-[12px] text-mist">{s.label}</dt>
              <dd className="tabular mt-1.5 text-[17px] font-semibold">{s.value}</dd>
            </>
          ) : (
            <Skeleton className="h-12 w-full" />
          )}
        </div>
      ))}
    </dl>
  );
}
