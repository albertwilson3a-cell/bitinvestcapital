import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export function Change({ value, className }: { value: number | null | undefined; className?: string }) {
  return (
    <span className={cn('tabular', value == null ? 'text-mist' : value >= 0 ? 'text-up' : 'text-down', className)}>
      {formatPercent(value, { signed: true })}
    </span>
  );
}
