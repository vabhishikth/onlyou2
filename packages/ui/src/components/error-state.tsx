import { type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

import { cn } from '../lib/cn'

export interface ErrorStateProps {
  title?: string
  description?: string
  action?: ReactNode
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again. If the problem persists, contact support.',
  action,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 p-12 text-center', className)}>
      <div className="text-[color:var(--color-error)]">
        <AlertTriangle className="h-12 w-12" />
      </div>
      <h3 className="font-[family-name:var(--font-serif)] text-xl font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-[color:var(--color-text-secondary)]">{description}</p>
      {action}
    </div>
  )
}

export function InlineError({ message }: { message: string }) {
  return <p className="text-sm text-[color:var(--color-error)]">{message}</p>
}

export function ErrorBoundaryFallback({ error }: { error: Error }) {
  return (
    <ErrorState
      title="Application error"
      description={error.message}
    />
  )
}
