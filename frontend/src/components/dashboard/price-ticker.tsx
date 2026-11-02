'use client';

import { TriangleAlert } from 'lucide-react';
import { AssetDot } from '@/components/dashboard/panel';
import { usePrices } from '@/hooks/use-dashboard';
import { useTick } from '@/hooks/use-tick';
import { formatPercent, formatUsd } from '@/lib/format';
import { ASSET_META, ASSETS, type Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

function TickerItem({ asset, usd, change }: { asset: Asset; usd: number | null; change: number | null }) {
  const tick = useTick(usd);
  return (
    <div className="flex shrink-0 items-baseline gap-2 text-[13px]">
      <AssetDot color={ASSET_META[asset].color} className="translate-y-[-1px]" />
      <span className="font-medium text-mist">{asset}</span>
      <span
        key={tick.n}
        className={cn('tabular text-foreground', tick.dir === 'up' && 'animate-flash-up', tick.dir === 'down' && 'animate-flash-down')}
      >
        {usd === null ? '—' : formatUsd(usd)}
      </span>
      {asset !== 'USDT' && (
        <span className={cn('tabular text-[12px]', change === null ? 'text-mist' : change >= 0 ? 'text-up' : 'text-down')}>
          {formatPercent(change, { signed: true })}
        </span>
      )}
    </div>
  );
}

export function PriceTicker({ className }: { className?: string }) {
  const { data, isError } = usePrices();
  const quote = (a: Asset) => data?.quotes.find((q) => q.asset === a);

  return (
    <div className={cn('flex items-center gap-5', className)} aria-label="Live prices">
      {ASSETS.map((a) => {
        const q = quote(a);
        return <TickerItem key={a} asset={a} usd={q ? Number(q.usd) : null} change={q?.change24hPercent ?? null} />;
      })}
      {isError && (
        <span className="flex items-center gap-1.5 text-[12px] text-down" role="status">
          <TriangleAlert className="size-3.5" /> Prices unavailable
        </span>
      )}
    </div>
  );
}
