'use client';

import * as React from 'react';
import { Slider as SliderPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function Slider({
  className,
  rangeColor,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & { rangeColor?: string }) {
  const values = props.value ?? props.defaultValue ?? [0];
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        'relative flex w-full touch-none items-center select-none py-2 data-[disabled]:opacity-40',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-rule-strong">
        <SliderPrimitive.Range
          className="absolute h-full rounded-full"
          style={{ background: rangeColor ?? 'var(--brass)' }}
        />
      </SliderPrimitive.Track>
      {values.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className="block size-4 rounded-full border-2 border-brass bg-ink shadow-[0_0_0_4px_rgba(10,18,32,0.9)] transition-[box-shadow,transform] outline-none hover:scale-110 focus-visible:ring-4 focus-visible:ring-brass/30 data-[disabled]:cursor-not-allowed"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
