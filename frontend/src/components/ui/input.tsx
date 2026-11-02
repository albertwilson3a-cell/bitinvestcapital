import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full min-w-0 rounded-md border border-input bg-ink/60 px-3 text-[15px] text-foreground transition-[border-color,box-shadow] outline-none placeholder:text-mist/70',
        'hover:border-mist/40 focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/25',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
