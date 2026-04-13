import { type HTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

export interface LogoProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number
  inverse?: boolean
}

export function Logo({ size = 36, inverse, className, style, ...props }: LogoProps) {
  return (
    <span
      className={cn(
        'inline-block font-[family-name:var(--font-serif)] font-[900] leading-[1.2] tracking-[-0.5px]',
        inverse ? 'text-white' : 'text-[color:var(--color-primary)]',
        className,
      )}
      style={{ fontSize: `${size}px`, ...style }}
      {...props}
    >
      onlyou
    </span>
  )
}
