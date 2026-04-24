# Dev-OTP bypass: double-gated in Phase 3A

**Date:** 2026-04-24
**Status:** Decided

## Context

Phase 2 shipped `DEV_BYPASS_PREFIX = "+91 99999 000"` + `DEV_BYPASS_OTP = "000000"` — any number matching the prefix skips bcrypt compare. There was no environment gate: prod would accept the bypass.

Spec 2026-04-24-phase-3-hair-loss-e2e §3A requires gating behind `NODE_ENV !== "production"`.

## Decision

Gate the bypass behind **both** checks:

1. `process.env.NODE_ENV !== "production"`
2. `!isProdDeployment(process.env.CONVEX_DEPLOYMENT ?? "")` — same helper `admin.ts` uses for `assertNotProd()`.

Both must pass. If either is unset or ambiguous, default-deny.

## Why both

- `NODE_ENV` alone: Convex Node actions inherit `NODE_ENV` but dashboard-triggered actions don't reliably have it set; staging-as-prod without the env var would leave the bypass open.
- `isProdDeployment` alone: ties the gate to deployment naming convention. A new prod deployment outside `PROD_DEPLOYMENT_PATTERNS` would re-open the bypass.
- Both together: either axis failing closes the gate.

Also flip `DEV_BYPASS_PREFIX` to E.164 (`"+9199999000"`) to match Task 4's client emit shape.

## Consequences

- Test `auth.test.ts:102` flips from "works regardless of NODE_ENV" (lock-in) to "refuses when NODE_ENV=production" (guard).
- `scripts/run-manual-e2e.ts` already targets dev deployments matching non-prod patterns; no change needed.
- Prod `verifyOtp` calls on a `+919999900000..99` number run the real bcrypt compare — attempt fails because the real sender never creates an `otpAttempts` row for those numbers.
