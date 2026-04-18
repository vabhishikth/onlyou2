---
date: "2026-04-18"
phase: 2.5a
status: accepted
tags:
  - architecture
  - convex
  - seeder
  - phase-2.5a
---

# Seeder scripts invoke Convex CLI, not `ConvexHttpClient`

**Context:** Phase 2.5A shipped a Node seeder script (`scripts/seed-biomarker-ranges.ts`) that upserts 45 DRAFT reference-range rows into Convex via the `biomarker/internal/upsertRanges` mutation.

## Decision

Seeder scripts that call **internal** Convex mutations must invoke the Convex CLI bundle via `child_process.spawnSync`, not `ConvexHttpClient`.

## Why

1. **Internal mutations are not reachable over HTTP by design.** `internalMutation` is a Convex security boundary — the HTTP client cannot call it. This is not a bug, and there is no `--admin` flag on the HTTP client that bypasses it.

2. **The Convex CLI bundle has admin access.** Running `node node_modules/convex/dist/cli.bundle.cjs run <mutation>` from a machine with a valid `CONVEX_DEPLOY_KEY` authenticates as a deploy principal and can call internal mutations.

3. **`spawnSync` (no `shell: true`) avoids the Windows 8191-char command-line limit.** The reference-range payload is ~26 KB JSON. Without argv-array invocation via `spawnSync`, cmd.exe rejects the call. Passing the JSON through stdin (or an argv chunk via Node's native `execPath`) is the only working pattern on Windows.

## Consequences

- **Future internal-mutation seeders** (lab partners, explainer content, etc.) inherit this pattern. Do **not** add a `ConvexHttpClient` attempt first — it will fail with "function is not public" and waste cycles.
- **Developer ergonomics:** seeders need Node + a local Convex CLI install. They cannot run from a plain HTTP-only context (e.g. a serverless function on another provider).
- **CI implications:** any CI job that seeds must install Convex and have `CONVEX_DEPLOY_KEY` available.
- **Alternative considered and rejected:** expose the seed mutation as a public `mutation` guarded by an env check. Rejected because it widens the attack surface and weakens the invariant that only deploy principals can write reference-range rows.

## References

- `scripts/seed-biomarker-ranges.ts` — the reference implementation.
- [[superpowers/plans/2026-04-18-phase-2.5a-foundation]] Task 12 — where the constraint was discovered.
- [[decisions/2026-04-18-phase-2.5a-as-built]] — retro mention.
