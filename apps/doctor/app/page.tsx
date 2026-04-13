import { Logo } from '@onlyou/ui'

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-background)] px-6">
      <div className="text-center">
        <Logo size={56} className="mb-4" />
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[color:var(--color-text-tertiary)]">
          Doctor portal
        </p>
        <h1 className="mb-4 font-[family-name:var(--font-serif)] text-4xl font-semibold">
          Phase 1 scaffold
        </h1>
        <p className="mb-6 text-[color:var(--color-text-secondary)]">
          Real doctor portal features land in Phase 4.
        </p>
        <a href="/design" className="underline-offset-4 hover:underline">
          View design system →
        </a>
      </div>
    </main>
  )
}
