'use client';

import { useMarketCoins } from '@/hooks/use-market';
import { cn } from '@/lib/utils';

/** Says where prices come from, and flags the development feed clearly. */
export function SourceNote({ className }: { className?: string }) {
  const { data, isError } = useMarketCoins();
  if (isError) return <p className={cn('text-[12px] text-down', className)}>Market data is temporarily unavailable.</p>;
  if (!data) return null;
  const time = new Date(data.updatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return (
    <p className={cn('text-[12px] text-mist', className)}>
      Live prices in USD from CoinGecko, updated {time}. Refreshes automatically.
    </p>
  );
}
