'use client'
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

import { cn } from '../lib/cn'

type ToastVariant = 'default' | 'success' | 'warning' | 'error' | 'info'
type Toast = { id: number; message: string; variant: ToastVariant }

const ToastContext = createContext<{
  show: (message: string, variant?: ToastVariant) => void
} | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, variant: ToastVariant = 'default') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[1500] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'min-w-[260px] rounded-[12px] border px-4 py-3 text-sm font-medium shadow-[var(--shadow-lg)]',
              t.variant === 'success' && 'border-[color:var(--color-success)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success)]',
              t.variant === 'warning' && 'border-[color:var(--color-warning)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning)]',
              t.variant === 'error' && 'border-[color:var(--color-error)] bg-[color:var(--color-error-bg)] text-[color:var(--color-error)]',
              t.variant === 'info' && 'border-[color:var(--color-info)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info)]',
              t.variant === 'default' && 'border-[color:var(--color-border)] bg-white text-[color:var(--color-text-primary)]',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
