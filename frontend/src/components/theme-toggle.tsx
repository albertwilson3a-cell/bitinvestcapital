'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { setTheme, useResolvedTheme, useTheme, type ThemeChoice } from '@/lib/theme';
import { cn } from '@/lib/utils';

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Auto', icon: Monitor },
];

/** Light / Dark / Auto (follows the device). Remembered on this device. */
export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const theme = useTheme();
  return (
    <div role="radiogroup" aria-label="Colour theme" className={cn('inline-flex rounded-md border border-rule bg-vault/60 p-0.5', className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const on = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={value === 'system' ? 'Follow my device setting' : `${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              'flex min-h-9 items-center gap-1.5 rounded-[5px] px-2.5 text-[12.5px] font-medium transition-colors',
              on ? 'bg-brass text-primary-foreground' : 'text-mist hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
            {!compact && label}
          </button>
        );
      })}
    </div>
  );
}

/** One-tap switch between light and dark, for headers. */
export function ThemeQuickSwitch({ className }: { className?: string }) {
  const mode = useResolvedTheme();
  const next = mode === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cn('inline-flex size-9 items-center justify-center rounded-md text-mist transition-colors hover:bg-accent hover:text-foreground', className)}
    >
      {mode === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
