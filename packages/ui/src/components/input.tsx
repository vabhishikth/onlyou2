import { forwardRef, type InputHTMLAttributes } from 'react'

import { cn } from '../lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-[10px] border bg-white px-4 py-3 text-base transition-colors',
          'placeholder:text-[color:var(--color-text-muted)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-0 focus-visible:border-[color:var(--color-border-focus)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-[color:var(--color-error)] focus-visible:ring-[color:var(--color-error)]'
            : 'border-[color:var(--color-border)]',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
