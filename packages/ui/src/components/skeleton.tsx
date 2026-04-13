import { type HTMLAttributes } from 'react'

import { cn } from '../lib/cn'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[8px] bg-[color:var(--color-primary-100)]',
        className,
      )}
      {...props}
    />
  )
}
