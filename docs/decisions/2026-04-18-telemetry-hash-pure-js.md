---
date: "2026-04-18"
phase: 2.5b
status: accepted
tags:
  - architecture
  - convex
  - telemetry
  - phase-2.5b
---

# Telemetry user-id hash uses pure JS (FNV-1a + salt), not `node:crypto`

**Context:** Phase 2.5B Task 3 shipped `convex/lib/telemetry.ts` with `hashUserId` using Node's `createHash("sha256")` from `node:crypto`. Task 9's Convex push failed because the Convex JS runtime bundler does not include `node:crypto` by default — any action or mutation that transitively imports this helper fails to register.

## Decision

Replace the `node:crypto` SHA-256 implementation with a pure-JS salted FNV-1a hash, returning a 12-character hex prefix.

## Why

1. **Convex bundler constraint.** Convex runs actions and mutations in a V8 isolate without Node built-ins unless explicitly opted in (`node` runtime tag + SDK affordances). Pulling in `node:crypto` just for a telemetry hash adds a runtime constraint on every file that transitively touches this helper — including pure queries that should never care.
2. **Cryptographic strength is not needed here.** The hash only needs to be stable (same user → same hash) and collision-resistant across the ~10k-patient-scale we're planning. FNV-1a + a fixed salt satisfies both. We are NOT storing passwords, session tokens, or anything an attacker could brute-force a plaintext from.
3. **Stability across environments.** Pure JS runs in every Convex runtime tag (default V8, `"use node"`, tests). No bundler coordination.

## Consequences

- `convex/lib/telemetry.ts:hashUserId` is pure-JS FNV-1a with the salt string `USER_HASH_SALT = "onlyou-biomarker-telemetry-v1"`. Returns 12 hex chars.
- Existing telemetry tests (Task 3) assert `/^[0-9a-f]{12}$/` and input-determinism — both still pass under FNV-1a.
- **No PHI protection claim changes.** The hash is a log-correlation tool, not a privacy guarantee. Anyone with DB read access can still join hashed logs back to users by re-hashing the canonical id. Privacy comes from not logging raw userIds at all.
- **If we ever need SHA-256** (e.g., publishing aggregated analytics externally), we re-import `node:crypto` inside a specifically-flagged `"use node"` action rather than the shared lib file.

## References

- `convex/lib/telemetry.ts` — the reference implementation.
- [[superpowers/plans/2026-04-18-phase-2.5b-parse-pipeline]] Task 3 (original) + Task 9 (revision during execution).
- Convex docs on V8 isolate constraints vs Node runtime tag.
