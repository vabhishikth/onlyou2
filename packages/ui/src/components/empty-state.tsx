import { type ReactNode } from 'react'
import { Inbox, Search, Filter } from 'lucide-react'

import { cn } from '../lib/cn'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 p-12 text-center', className)}>
      <div className="text-[color:var(--color-text-muted)]">
        {icon || <Inbox className="h-12 w-12" />}
      </div>
      <h3 className="font-[family-name:var(--font-serif)] text-xl font-semibold text-[color:var(--color-text-primary)]">
        {title}
      </h3>
      {description && <p className="max-w-sm text-sm text-[color:var(--color-text-secondary)]">{description}</p>}
      {action}
    </div>
  )
}

export function SearchEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12" />}
      title="No results"
      description={`No matches for "${query}". Try a different search.`}
    />
  )
}

export function FilterEmptyState() {
  return (
    <EmptyState
      icon={<Filter className="h-12 w-12" />}
      title="Nothing matches these filters"
      description="Adjust the filters above to see more results."
    />
  )
}
