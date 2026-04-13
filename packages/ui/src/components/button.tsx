import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] hover:bg-[color:var(--color-primary-700)]',
        secondary: 'bg-white text-[color:var(--color-primary)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-primary-50)]',
        ghost: 'bg-transparent text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-50)]',
        accent: 'bg-[color:var(--color-accent)] text-white hover:bg-[color:var(--color-accent-500)]',
        destructive: 'bg-[color:var(--color-error)] text-white hover:bg-[color:var(--color-error)]/90',
        outline: 'border border-[color:var(--color-primary)] text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)] hover:text-white',
        link: 'text-[color:var(--color-accent)] underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm rounded-[8px]',
        md: 'h-11 px-5 text-base rounded-[10px]',
        lg: 'h-13 px-7 text-base rounded-[12px]',
        xl: 'h-14 px-8 text-lg rounded-[12px]',
        icon: 'h-11 w-11 rounded-[10px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? <span className="animate-pulse">…</span> : children}
      </button>
    )
  },
)
Button.displayName = 'Button'
