# Phase 3A Merge-Gate Review

**Branch:** `phase-3a` → `master`
**Base commit:** `f2127bf`
**Head commit:** `8bf7314`
**Reviewer:** claude-phase-3a-review
**Date:** 2026-04-24

---

## 1. Verdict

**APPROVED_WITH_MINORS**

One important finding (two optional FK columns missed in the merge migration — dangling-reference risk under a specific edge case) and one minor. No critical blockers. All primary security, gating, and consistency goals are met.

---

## 2. Scope Summary

Phase 3A ships five hardening items against the `phase-3a` branch (12 commits, +1017 / −77 lines across 30 files): an E.164 phone normaliser in `@onlyou/core`; normalisation wired at every Convex auth entry point (`otp.ts`, `otpDb.ts`, `users.ts`); a one-shot migration (`normalizePhones.ts`) that rewrites legacy phone strings and merges duplicate-user rows; a double-gated dev-OTP guard (`NODE_ENV` + `isProdDeployment`); a `findLabReportByContentHash` helper with a CI-enforced raw-index guard test; the Anthropic key rotation runbook; and documentation (DEFERRED strikes, decision records, clinical-signoff deferral). All per-task reviews were APPROVED inline.

---

## 3. Strengths

- **Defense-in-depth normalisation.** Every `by_phone` index consumer — `otpDb.upsertOtpAttempt`, `otpDb.getAttempt`, `otpDb.incrementAttempt`, `otpDb.finalizeSignIn`, `users.getUserByPhone`, `users.createUser`, and the migration itself — calls `normalizePhoneE164` before touching the index. No raw `args.phone` write escapes to storage.

- **Migration correctness — main path.** The merge path correctly sequences: reassign all 7 child tables → delete legacy user. No dangling-FK window on the covered tables. The `otpAttempts` dedup-delete-before-patch pattern (line 165) avoids the transient two-row unique-phone state.

- **Dev-OTP gate is thorough.** `isDevBypassAllowed()` defaults-deny on either `NODE_ENV === "production"` or `isProdDeployment(CONVEX_DEPLOYMENT)`. Two independent guard tests cover each axis; the original lock-in test updated to E.164 literal and still passes. `DEV_BYPASS_PREFIX = "+9199999000"` is correctly E.164.

- **PENDING_HASH helper is airtight.** Input-filters the caller's `contentHash` before the index query AND row-filters results (double defence). The CI guard test (`content-hash-guard.test.ts`) enforces that no production Convex file outside the helper uses `withIndex("by_user_hash", …)` — confirmed zero offenders on this diff.

- **Security posture.** No `sk-ant-` key appears in any committed file. Migration log redacts to `u.phone.slice(0, 4)` (the `+91` country-code prefix, no subscriber digits). Commit messages contain no PII. All 12 commits are correctly prefixed `feat/fix/chore/docs(phase-3a)`.

---

## 4. Critical Findings

None. No merge-blocking issues found.

---

## 5. Important Findings

### I-1 — Migration skips two optional `userId`-FK columns

**Files:** `convex/migrations/phase3a/normalizePhones.ts`, `convex/schema.ts`

**Evidence:**

```
convex/schema.ts:271  resolvedByUserId: v.optional(v.id("users"))  — biomarker_curation_queue
convex/schema.ts:278  orderedByUserId:  v.optional(v.id("users"))  — lab_orders
```

`reassignUserReferences` covers 7 tables but omits these two optional FK columns present in the schema. For `biomarker_curation_queue.resolvedByUserId`: if an admin user resolved a curation item under a legacy (un-normalised) phone and a merge runs, the `resolvedByUserId` column retains the now-deleted legacy `_id`. Convex does not enforce FK integrity at query time, so the dangling reference is silent — but any admin-portal query that joins on that field will miss the row or error. For `lab_orders.orderedByUserId` (the prescribing doctor, optional), same risk applies.

**Both columns are optional** and the tables have no real data yet (MVP), so this is not a production blocker today. But it should be fixed before the first real merge scenario reaches a deployment with populated `biomarker_curation_queue` rows.

**Proposed fix:** Add two loops to `reassignUserReferences`:

```typescript
// biomarker_curation_queue — resolvedByUserId (optional)
for (const q of await ctx.db
  .query("biomarker_curation_queue")
  .filter((q) => q.eq(q.field("resolvedByUserId"), fromUserId))
  .collect()) {
  await ctx.db.patch(q._id, { resolvedByUserId: toUserId });
}

// lab_orders — orderedByUserId (optional, doctor FK)
for (const o of await ctx.db
  .query("lab_orders")
  .filter((q) => q.eq(q.field("orderedByUserId"), fromUserId))
  .collect()) {
  await ctx.db.patch(o._id, { orderedByUserId: toUserId });
}
```

Also add a row to the migration test's "merge reassigns every userId-scoped table" scenario (`normalizePhones.test.ts`) exercising each of these columns.

---

## 6. Minor Findings

### M-1 — Pre-existing flaky test not introduced by Phase 3A

**File:** `convex/__tests__/biomarker/parse-pipeline/parseLabReport.branches.test.ts` (line 219)

This test ("happy path → status ready") times out at 5 000 ms and was **not modified in phase-3a** (empty `git diff master..phase-3a` for that file). It pre-exists on `master` (introduced in Phase 2.5B / Phase 2.5C). The convex test run shows: `Tests 1 failed | 224 passed (225)`. Because this failure predates the branch, it does not block merge, but it is suppressing clean CI signal. Recommend adding a `testTimeout` annotation or filing a dedicated fix ticket in DEFERRED.

---

## 7. Test Count Confirmations

| Suite                              | Claimed | Observed                                                                 |
| ---------------------------------- | ------- | ------------------------------------------------------------------------ |
| `convex` (offline)                 | 225     | 225 (224 passed, 1 pre-existing flaky timeout — not phase-3a introduced) |
| `mobile` (`apps/mobile pnpm test`) | 237     | 237 passed                                                               |
| `core` (`packages/core pnpm test`) | 16      | 16 passed                                                                |

TypeScript: `pnpm -w typecheck --force` — 6 packages, 0 errors, 27.6 s.

No `.only`, `.skip`, or `.todo` markers introduced in phase-3a test files. The single pre-existing `describe.todo` in `auto-classification-pipeline.test.ts` was introduced in Phase 2.5C (`f06af72`) and is out of scope.

---

## 8. Sign-off

Reviewer: claude-phase-3a-review · Date: 2026-04-24
