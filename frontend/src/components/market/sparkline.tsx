import { cn } from '@/lib/utils';

/** Tiny trend line; colour follows the overall direction. */
export function Sparkline({ values, className, width = 112, height = 32 }: { values: number[]; className?: string; width?: number; height?: number }) {
  if (values.length < 2) return <span className={cn('inline-block', className)} style={{ width, height }} />;
  // A floor of 2% of the price keeps stablecoin noise (fractions of a cent) visually flat.
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, Math.abs(hi) * 0.02) || 1;
  const min = (lo + hi) / 2 - span / 2;
  const step = width / (values.length - 1);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`).join(' ');
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={cn('overflow-visible', className)} aria-hidden="true">
      <path d={d} fill="none" stroke={up ? 'var(--up)' : 'var(--down)'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
