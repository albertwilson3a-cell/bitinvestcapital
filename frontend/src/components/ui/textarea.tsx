import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-[84px] w-full rounded-md border border-input bg-ink/60 px-3 py-2 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-mist/70',
        'hover:border-mist/40 focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/25 aria-invalid:border-destructive disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
