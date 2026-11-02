import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[12px] font-medium whitespace-nowrap [&>svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'border-rule-strong text-mist',
        success: 'border-up/30 bg-up/10 text-up',
        pending: 'border-brass/35 bg-brass/10 text-brass',
        danger: 'border-down/35 bg-down/10 text-down',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
