---
date: 2026-04-21
phase: 2.5c
tags:
  - phase-2.5c
  - auth
  - decision
---

# Session-token auth applies to queries, not just mutations

## Context

Decision note `2026-04-20-session-token-auth-in-2-5c-mutations.md` ruled that all Phase 2.5C mutations needing auth accept `token: v.string()` + resolve via `sessions.by_token`. That decision was scoped to mutations because the triggering review was on `intakeUpload`.

Phase 2.5C Wave 5 added the first **query** that needs caller identity (`biomarkerReportsForPatient` — doctor portal read surface). The initial implementation used `ctx.auth.getUserIdentity()` on the query handler. Code review (`docs/superpowers/reviews/2026-04-21-phase-2.5c-wave-5-review.md` C-1) caught this: `convex/auth.config.ts` exports `{ providers: [] }`, so `getUserIdentity()` returns `null` on every non-test call. The query was dead code on any real deployment.

## Decision

The session-token pattern applies to **every Convex function that needs caller identity** — query, mutation, action — until a real identity provider (Clerk, Auth0, custom OIDC) is wired. That means:

- Add `token: v.string()` to the function's `args` validator
- Resolve `sessions.by_token` + check `expiresAt > Date.now()`
- Treat missing/expired session as `ConvexError({ code: "unauthenticated" })`
- Then load the user row via `ctx.db.get(session.userId)` and apply role/ownership checks

This supersedes the 2026-04-20 note's narrow "mutations only" scope. The rule is: anywhere you would have typed `ctx.auth.getUserIdentity()`, use session-token resolution instead.

## Implications

- Doctor-portal queries that previously used `t.withIdentity(...)` in tests must seed a `sessions` row and pass the token as an arg. `t.withIdentity(...)` is not usable with session-token auth.
- Admin dashboard-only actions that can't receive a client-held session token (dashboard invocations have no user identity to forward) fall back to the existing `assertNotProd()` guard and don't attempt any identity check. `simulateLabUpload` in `convex/admin.ts` uses this pattern.
- When wiring Clerk/Auth0 later, both decisions get superseded by a single "use `getUserIdentity`" migration. No code lives in the middle.

## References

- Extends: `docs/decisions/2026-04-20-session-token-auth-in-2-5c-mutations.md`
- Triggered by: code-review C-1 on Wave 5 commit `9061c66`, fixed in `a39643b`
- Pattern reference: `convex/biomarker/retryParseLabReport.ts:32-44`, `convex/biomarker/portal/biomarkerReportsForPatient.ts:19-29`
