'use client';

import * as React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-rule-strong transition-colors outline-none',
        'data-[state=checked]:border-brass/70 data-[state=checked]:bg-brass/25 data-[state=unchecked]:bg-ink',
        'focus-visible:ring-2 focus-visible:ring-brass/40 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-3.5 rounded-full transition-transform',
          'data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-brass data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:bg-mist',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
