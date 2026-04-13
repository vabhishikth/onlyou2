import { Logo, Input, Button } from '@onlyou/ui'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[color:var(--color-background)]">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <Logo size={72} className="mb-6" />
        <p className="mb-12 text-sm uppercase tracking-[0.2em] text-[color:var(--color-text-tertiary)]">
          Care, privately — coming soon
        </p>
        <h1 className="mb-6 font-[family-name:var(--font-serif)] text-5xl font-bold leading-tight text-[color:var(--color-text-primary)] md:text-6xl">
          Your care, in private.
        </h1>
        <p className="mb-10 max-w-md text-lg leading-relaxed text-[color:var(--color-text-secondary)]">
          A specialist doctor reviews your case and writes a treatment plan. You only pay if they prescribe.
        </p>
        <form className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <Input placeholder="you@example.in" disabled className="flex-1" />
          <Button disabled>Join waitlist</Button>
        </form>
        <p className="mt-12 text-xs text-[color:var(--color-text-tertiary)]">
          <a href="/design" className="underline-offset-4 hover:underline">
            View design system →
          </a>
        </p>
      </div>
    </main>
  )
}
