import Link from 'next/link';
import { APP_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';

/** Ledger mark: three entries of decreasing weight, the last one settled in brass. */
export function Wordmark({ className, href = '/dashboard' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5 rounded-sm text-foreground', className)}>
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
        <rect x="2" y="3" width="16" height="3" rx="1" fill="var(--rule-strong)" />
        <rect x="2" y="8.5" width="12" height="3" rx="1" fill="var(--mist)" />
        <rect x="2" y="14" width="8" height="3" rx="1" fill="var(--brass)" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.01em]">{APP_NAME}</span>
    </Link>
  );
}
