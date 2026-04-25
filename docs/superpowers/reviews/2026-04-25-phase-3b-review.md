# Phase 3B Code Review — `phase-3b` (15 commits, 14 tasks, ~3,481 LOC)

**Range:** `59b16bf` → `f847e6d` · **Branch:** `phase-3b` (worktree `D:\onlyou2-phase-3b`)
**Tests:** convex 250✓ / 1 skip · mobile 260✓ · **Lint:** clean (0 errors; 4 pre-existing import/order warnings in `packages/ui` unrelated to this phase) · **Typecheck:** clean (6/6 packages)

---

## 1. Critical (must fix before merge)

**None.** No data-loss, no broken contracts, no auth bypass, no committed secrets. Auth model (session-token only, never `ctx.auth.getUserIdentity()`) is honoured everywhere new in 3B (verified by grep — only legacy biomarker comments mention the forbidden API, and only to forbid it; new file `convex/consultations/photos.ts:2` adds the same warning).

---

## 2. Important (fix before merge)

### I-1. Race in `findOrCreateUserByEmail` — duplicate user rows possible on first social sign-in

File: `convex/auth/socialDb.ts:8-23`. `users` table has no DB-level unique constraint on `email`; two simultaneous Google sign-in actions for the same email can both observe `user === null` and both insert. Convex serializes mutations on conflicting _reads_ via OCC, but two parallel actions reading then inserting can race. Fix: re-query after insert; if a duplicate landed, delete the dupe (or wrap in a retry loop). Add a regression test that races two `signInWithGoogle` actions in `Promise.all`. **DECISION:** defer to Phase 8 polish — risk is low (founder is the only user; double-tap on a button that closes itself after one tap is unusual) and the data-cleanup script for any dupe is trivial.

### I-2. Double-tap on "Start assessment" can create orphan consultation rows

File: `apps/mobile/app/questionnaire/[condition]/index.tsx`. `start` is now async and there's no `disabled` while `startConsultation` is in flight. **DECISION: fix before merge.** Two-line change.

### I-3. Apple Sign-In nonce never wired client-side — replay-attack mitigation effectively disabled

Files: `apps/mobile/src/components/auth/AppleSignInButton.tsx` + `convex/auth/socialSignIn.ts:38-57`. The Convex action accepts and validates `nonce`, but the mobile button doesn't generate one or pass it. The `apple_nonce_mismatch` test is exercising a path that never fires in production. **DECISION:** defer client-side nonce wiring to Phase 8 (real production OAuth setup), keep the server-side check (it's free), and remove the misleading test OR rename it to document the contract. Simplest: keep test (locks the server contract for when nonce gets wired); add a `// TODO(phase-8): wire client nonce — see DEFERRED.md` comment in `AppleSignInButton.tsx`. Add DEFERRED.md entry.

### I-4. `uploadPhoto.ts`: `blob.size === 0` quirk on RN can trip server `invalid_file_size`

File: `apps/mobile/src/questionnaire/uploadPhoto.ts`. Pre-RN 0.74 `fetch(file://).blob()` returns size 0 on Android. Expo SDK 54 ships RN 0.76 — should be fine, but unverified until live E2E. **DECISION:** defer until founder live E2E (Task 14.1) surfaces it. If it bites, swap to `expo-image-picker` `asset.fileSize` and `expo-file-system.getInfoAsync(uri).size` for camera. Add DEFERRED.md entry.

### I-5. Library-pick fire-and-forget swallows upload errors

File: `apps/mobile/app/photo-upload/[condition].tsx:63-68`. `void pickFromLibrary(...)` — if upload throws, user sees nothing. **DECISION: fix before merge.** Wrap in try/catch + Alert.alert.

### I-6. `verifyIdToken` accepts the token but doesn't pin Google's `sub`

Accounts keyed only by email, not by Google `sub`. Edge cases (email change on Google side, Apple email-relay collision). **DECISION:** defer to Phase 8 polish. Add DEFERRED.md entry.

---

## 3. Minor (DEFERRED-worthy or follow-up commit)

- **M-1.** `apps/mobile/app/questionnaire/[condition]/review.tsx:215` — `color: "white"` literal, swap to `colors.white` token.
- **M-2.** `apps/mobile/app/photo-upload/camera.tsx` — permission-denied state lacks an in-screen Back button (OS swipe still works).
- **M-3.** Soft-delete loop in `convex/consultations/photos.ts:60-69` — Convex mutations are atomic at the function level; no partial state possible. Add inline comment to reassure future readers.
- **M-4.** `convex/auth/socialSignIn.ts:14` — defensive `if (payload.aud !== clientId)` after `getPayload()` would catch a future google-auth-library API change. Cheap.
- **M-5.** `useSubmitConsultation.ts` — read `schemaVersion` + `answers` via `useQuestionnaireStore.getState()` inside the callback for staleness defense.
- **M-6.** No new hex literals (only pre-existing). Clean.
- **M-7.** Submit guard order: photo guard before idempotency. Acceptable.
- **M-8.** `aiStub.ts` contract is forward-compatible with Phase 3C (allowed transitions already include `AI_PROCESSING → AI_COMPLETE` and `→ AI_FAILED`).
- **M-9.** `apps/mobile/.env.example` should add a comment explaining Convex-side env (`GOOGLE_OAUTH_CLIENT_ID` / `APPLE_OAUTH_CLIENT_ID`) is set via `pnpm convex env set`, not in the mobile `.env.local`.

---

## 4. Strengths

- **Schema isolation pattern** (`convex/consultations/schema.ts` exporting field maps for `convex/schema.ts` to spread) avoids circular import.
- **Transition engine** explicit `TERMINAL_STATES` set, validTransitions table reads as a literal port of SOT §3A.
- **Photo slot vocabulary** centralized in `convex/lib/photoSlot.ts`; no duplication across schema/mutation/mobile/submit guard.
- **Idempotency on `questionnaire_responses`** via `by_consultation` unique check is right shape and cheaper than status-based.
- **Test coverage** — +25 convex, +23 mobile. Covers attacker-token, missing photos, oversize files, duplicate submission, terminal-state guard, nonce mismatch, missing env.
- **Camera screen state machine** (perm-unknown → perm-denied → live → captured → uploading) correctly modeled.
- **Female-blocked hair-loss** affordance is gracious and on-brand.
- **`HAIR_LOSS_SCHEMA_VERSION`** captured at submit-time + persisted on response row — supports future migrations.

---

## 5. Spec coverage matrix

| Plan deliverable                                                          | Status                               | Evidence                 |
| ------------------------------------------------------------------------- | ------------------------------------ | ------------------------ |
| Schema (consultations + responses + photos + status history)              | Shipped                              | T1 `292c544`             |
| Transition engine (validTransitions + systemTransitions + terminal guard) | Shipped                              | T2 `889cf46` + `4b12a84` |
| 28 HL questions verbatim from VERTICAL-HAIR-LOSS.md §4                    | Shipped                              | T3 `5af8b37`             |
| Pure skip-logic engine                                                    | Shipped                              | T4 `787f5fd`             |
| Store + router refactor                                                   | Shipped                              | T5 `c4fa297`             |
| Review screen (grouped + consent + edit-tap)                              | Shipped                              | T6 `3428510`             |
| expo deps + Expo config                                                   | Shipped                              | T7 `5c52b22`             |
| Bottom-sheet photo picker                                                 | Shipped                              | T8 `60b173e`             |
| Real camera screen                                                        | Shipped                              | T9 `488955c`             |
| Photo upload mutations                                                    | Shipped                              | T10 `f42db55`            |
| Google Sign-In                                                            | Shipped                              | T11 `9f7a73d`            |
| Apple Sign-In                                                             | Shipped (with I-3 caveat)            | T12 `0bb87e0`            |
| `startConsultation` + `submitConsultation` + AI stub                      | Shipped                              | T13 `4f8caf0`            |
| Client wiring (review submit + camera/library → Convex)                   | Shipped (with I-2, I-4, I-5 caveats) | T14 `f847e6d`            |
| Phase review + DEFERRED strikes + merge                                   | In progress (this review)            | —                        |

---

## 6. DEFERRED ledger compliance

Strikes already applied at `docs/DEFERRED.md`:

- Line 60 (Hair Loss questionnaire content) — accurate ✓
- Line 66 (Social auth Google + Apple) — accurate ✓
- Line 277 (Photo upload "Choose from library") — accurate ✓
- Line 278 (Real camera) — accurate ✓

New deferrals 3B introduces (added to DEFERRED.md alongside this review):

1. Apple Sign-In client-side nonce wiring → Phase 8 (I-3)
2. `findOrCreateUserByEmail` race protection → Phase 8 (I-1)
3. OAuth account-linking by `sub` not `email` → Phase 8 (I-6)
4. `blob.size` reliability fallback to `asset.fileSize` / `FileSystem.getInfoAsync` → Phase 8 if live E2E surfaces it (I-4)
5. `color: "white"` token swap (M-1) → Phase 8
6. Camera permission-denied in-screen Back affordance (M-2) → Phase 8
7. `.env.example` Convex-side env comment block (M-9) — fix inline, no defer

---

## 7. Cross-cutting checks

| Check                                                    | Result                                                  |
| -------------------------------------------------------- | ------------------------------------------------------- |
| `ctx.auth.getUserIdentity()` not used in new code        | ✓                                                       |
| Session-token auth on every Convex surface               | ✓                                                       |
| No hardcoded hex outside eslint-disabled `app.config.ts` | ✓                                                       |
| No secrets committed                                     | ✓                                                       |
| Workspace lint clean                                     | ✓ (0 errors, 4 pre-existing warnings)                   |
| Workspace typecheck clean                                | ✓                                                       |
| Test counts                                              | convex 250✓/1 skip · mobile 260✓                        |
| Schema indexes adequate                                  | ✓                                                       |
| Validators centralized                                   | ✓                                                       |
| Live E2E run                                             | Deferred to Task 14.1 (founder runs on physical device) |

---

## 8. Final verdict

**APPROVED_WITH_MINORS** — pending:

1. **I-2** (double-tap guard) — fix before merge
2. **I-5** (library-pick alert) — fix before merge
3. **I-3** (Apple nonce) — deferred to Phase 8; add DEFERRED entry + `TODO(phase-8)` comment in `AppleSignInButton.tsx`
4. **I-1, I-4, I-6** — deferred to Phase 8 with ledger entries
5. **M-1 through M-9** — fold into Phase 8 polish PR (M-9 also fixed inline)
6. **Live E2E (Task 14.1)** — founder runs on physical device before final merge approval
