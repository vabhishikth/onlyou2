'use client'
import { forwardRef, useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react'

import { cn } from '../lib/cn'

export interface DialogProps extends HTMLAttributes<HTMLDialogElement> {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(
  ({ open, onOpenChange, children, className, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLDialogElement>(null)

    useEffect(() => {
      const el = innerRef.current
      if (!el) return
      if (open && !el.open) el.showModal()
      if (!open && el.open) el.close()
    }, [open])

    useEffect(() => {
      const el = innerRef.current
      if (!el) return
      const handleClose = () => onOpenChange(false)
      el.addEventListener('close', handleClose)
      return () => el.removeEventListener('close', handleClose)
    }, [onOpenChange])

    return (
      <dialog
        ref={(node) => {
          innerRef.current = node
          if (typeof forwardedRef === 'function') forwardedRef(node)
          else if (forwardedRef) forwardedRef.current = node
        }}
        className={cn(
          'rounded-[16px] border border-[color:var(--color-border)] bg-white p-6 shadow-[var(--shadow-xl)] backdrop:bg-black/50 backdrop:backdrop-blur-sm',
          className,
        )}
        {...props}
      >
        {children}
      </dialog>
    )
  },
)
Dialog.displayName = 'Dialog'

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('mb-2 font-[family-name:var(--font-serif)] text-2xl font-semibold', className)}
      {...props}
    />
  )
}

export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mb-4 text-sm text-[color:var(--color-text-secondary)]', className)} {...props} />
}
