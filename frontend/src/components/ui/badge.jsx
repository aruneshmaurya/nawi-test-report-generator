import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow',
        outline: 'text-foreground border-slate-300',
        pass: 'border-emerald-300 bg-emerald-100 text-emerald-800 font-bold',
        fail: 'border-rose-300 bg-rose-100 text-rose-800 font-bold',
        warning: 'border-amber-300 bg-amber-100 text-amber-800 font-bold',
        draft: 'border-slate-300 bg-slate-100 text-slate-700',
        progress: 'border-sky-300 bg-sky-100 text-sky-800 font-medium',
        approved: 'border-indigo-300 bg-indigo-100 text-indigo-800 font-bold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
