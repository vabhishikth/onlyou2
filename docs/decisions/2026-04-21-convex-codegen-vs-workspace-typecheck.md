# Convex codegen runs its own tsc — workspace typecheck can diverge

**Date:** 2026-04-21
**Phase:** 2.5C Wave 3 (discovered mid-execution)
**Status:** Operational note — no code change required

## Problem

During Phase 2.5C Wave 3 Task 17, `npx convex codegen` failed with:

```
convex/__tests__/biomarker/notifications-band-change.test.ts:2:20 - error TS6133:
  'it' is declared but its value is never read.
```

But `pnpm -w typecheck` — which runs `turbo run typecheck` across every package that
has a `typecheck` script — passed cleanly. So one tsc pass is stricter than the other,
and our CI surface had drifted from the surface Convex runs at deploy time.

## Why

`pnpm -w typecheck` walks each package's own `tsconfig.json` via its `typecheck` script.
There is no package in the repo whose tsconfig's `include` covers `convex/**`. The
closest thing is `convex/tsconfig.json`, but the `convex/` directory has no
`package.json` — turbo doesn't run it, nothing runs it.

`npx convex codegen` internally runs `tsc --noEmit` against `convex/tsconfig.json`,
which extends `packages/config/tsconfig/base.json` where `noUnusedLocals: true`.
That's the only pass that ever compiles `convex/__tests__/**`.

## Consequence

An unused import that's only in a `convex/__tests__/**` file will pass every local
typecheck a developer runs but block `convex codegen` — which in turn blocks every
downstream mutation/action that relies on regenerated `_generated/api.d.ts`.

The Wave 2 placeholder test (`notifications-band-change.test.ts`, commit `70879ec`)
shipped with an `eslint-disable` comment on the unused `it` import, but TS6133 is
not eslint — it's tsc, which ignores eslint directives. The placeholder has been
latent since Wave 2 merged.

## What we did

- Wave 3 ran `npx convex codegen --typecheck=disable` to regenerate API types
  after the new `internalQueries.getCurationRowByKey` / `internalMutations.insertReferenceRange`
  / `internalMutations.patchCurationQueueRow` / `biomarker.reclassifyForCanonicalId` surfaces landed.
- `pnpm -w typecheck` still passes, because none of the real code has unused locals.
- The unused-`it` is scheduled to be replaced by real `it(...)` cases in Wave 4 Task 25
  (when `reclassifyForCanonicalId` lands and the band-change assertions become writable).

## Recommendation

Don't add `convex/` to turbo's `typecheck` graph as a blanket fix — that would
widen the stricter-tsc surface to cover every convex test file, and the whole
dev loop picks up that lag even when the convex functions themselves are clean.

Prefer: keep the stricter surface local to `convex codegen`, and treat codegen
failures as "resolve or --typecheck=disable and file a ticket" gated on the
real function surfaces being correct.

## Next time

If you hit TS6133 in a `convex/__tests__/**` placeholder and need codegen to
regenerate API types for the real work, `--typecheck=disable` is safe as long
as `pnpm -w typecheck` still passes on real code. The full codegen typecheck
will re-run automatically once the placeholder is filled in — Wave 4 Task 25
in this case.
