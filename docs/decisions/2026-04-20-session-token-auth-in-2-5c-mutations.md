---
date: 2026-04-20
phase: 2.5c
tags:
  - phase-2.5c
  - auth
  - decision
---

# Phase 2.5C mutations use session-token auth, not Convex identity

## Context

Plan `docs/superpowers/plans/2026-04-20-phase-2.5c-ingestion-automation-reclassify.md` Task 5 prescribed `ctx.auth.getUserIdentity()` for the `intakeUpload` mutation. Code review against commit `2d10125` flagged this as a plan/codebase divergence: ONLYOU v2 never wired Convex's built-in identity (no `auth.config.ts`, no `ConvexProviderWithAuth`), and every existing mutation resolves auth via the custom `sessions` table and `by_token` index.

The spec (`docs/superpowers/specs/2026-04-20-phase-2.5c-ingestion-automation-reclassify-design.md` §4.1) said "session's userId must match" — the plan accidentally swapped the pattern when writing out the code block.

## Decision

All Phase 2.5C mutations that need auth (`intakeUpload`, `retryParseLabReport`, and anything downstream in Wave 1) accept a `token: v.string()` arg and resolve via the session-token pattern used by `users.ts`. This matches the spec intent and every other mutation in the codebase.

## Implications

- No new auth bridge work lands in 2.5C. A migration to Convex identity is a separate future decision if we ever wire Clerk/Auth0.
- The convex-test harness needs to seed a `sessions` row and pass the token through `mutation(..., { token, ...args })`. `t.withIdentity(...)` is not usable with session-token auth.
- Phase 2.5D mobile integration passes the client-held session token (from secure-store) as an arg on every upload/retry call — mirroring how it already calls `getCurrentUser`.

## References

- Code-review finding: C-1 on commit `2d10125`
- Existing pattern: `convex/auth/sessions.ts`, `convex/users.ts`
