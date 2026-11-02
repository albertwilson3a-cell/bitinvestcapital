'use client';

import { cn } from '@/lib/utils';

/** Compact single-choice control (radio group semantics). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; disabled?: boolean }[];
  label: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-md border border-rule-strong bg-ink/60 p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-3 font-medium whitespace-nowrap text-mist transition-colors outline-none',
            size === 'sm' ? 'h-7 text-[12px]' : 'h-8 text-[13px]',
            'hover:text-foreground focus-visible:ring-2 focus-visible:ring-brass/40 disabled:opacity-40',
            value === o.value && 'bg-vault-raised text-foreground shadow-[inset_0_0_0_1px_var(--rule-strong)]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
