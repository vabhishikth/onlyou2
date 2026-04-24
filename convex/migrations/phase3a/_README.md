# Phase 3A — phone E.164 migration

**Date added:** 2026-04-24

## Run on dev

    npx convex run migrations/phase3a/normalizePhones:run

Expected on first run: `{ usersUpdated: N, usersAlreadyCanonical: M, usersDeleted: K, otpAttemptsUpdated: P }`.

Re-run to confirm idempotency — `usersUpdated` and `otpAttemptsUpdated` must be 0 on the second run.

## Rollback

None. The migration strips spaces and prefixes; there is no canonical
un-normalised form to restore. If merge behaviour causes bad collapse,
restore from a Convex snapshot.

## Production invocation

Run once, after the code containing this file is deployed. Logs any
skipped rows (unparseable phones) for manual review.
