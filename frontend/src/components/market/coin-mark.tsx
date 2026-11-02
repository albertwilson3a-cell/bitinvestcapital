import { coinColor } from '@/lib/coins';
import { cn } from '@/lib/utils';

/** Neutral coin marker: the ticker on a tinted tile (no third-party logos). */
export function CoinMark({ symbol, size = 'md', className }: { symbol: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const color = coinColor(symbol);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-mono font-semibold tracking-tight',
        size === 'sm' && 'size-6 text-[8px]',
        size === 'md' && 'size-8 text-[9.5px]',
        size === 'lg' && 'size-12 text-[13px]',
        className,
      )}
      style={{ color, background: `color-mix(in oklab, ${color} 16%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 35%, transparent)` }}
    >
      {symbol.slice(0, 4)}
    </span>
  );
}
