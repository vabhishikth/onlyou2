import { type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../lib/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-[color:var(--color-primary-50)] text-[color:var(--color-primary)]',
        success: 'bg-[color:var(--color-success-bg)] text-[color:var(--color-success)]',
        warning: 'bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning)]',
        error: 'bg-[color:var(--color-error-bg)] text-[color:var(--color-error)]',
        info: 'bg-[color:var(--color-info-bg)] text-[color:var(--color-info)]',
        accent: 'bg-[color:var(--color-accent-light)] text-[color:var(--color-accent)]',
        gold: 'bg-[#FAF3E8] text-[color:var(--color-warm)]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
