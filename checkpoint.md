# Checkpoint

**Current phase:** Phase 3 (Hair Loss end-to-end) — sub-phase **3A code-complete 2026-04-24**, awaiting final merge to master. Six-sub-phase decomposition locked (3A hardening → 3B questionnaire+photos+consultations → 3C AI option B → 3D doctor-sim CLI+dashboard → 3E plan+Razorpay test+Gupshup → 3F orders+pharmacy auto+active UI → approval gate → Phase 4). **Artifacts:** `docs/superpowers/specs/2026-04-24-phase-3-hair-loss-e2e-design.md` (commit `b969f27`) · `docs/decisions/2026-04-24-phase-3-decomposition.md` — 8 decisions D1–D8 (commit `22cc83b`) · `docs/superpowers/plans/2026-04-24-phase-3a-hardening.md` (commit `f2127bf`) · `docs/DEFERRED.md` updated (Phase 3 AI B→C upgrade, Phase 8 Razorpay live-flip, sub-management rehome, wallet rehome, auto-template-recommendation rehome, clinical-signoff pre-prod gate).

## Phase 3A progress (2026-04-24)

**Branch:** `phase-3a` at tip `2278b06`, 13 commits ahead of `master` at `f2127bf`.

**Shipped (12/12 plan tasks):**

| Task | Commit(s)                         | What                                                                                                                                                                                                                                                                                                                                     |
| ---- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | —                                 | Worktree + `.env.local` + baseline tests green.                                                                                                                                                                                                                                                                                          |
| 1    | `0be4a24`                         | `packages/core/src/phone/e164.ts` — `normalizePhoneE164` + `isValidE164`. 16 unit tests.                                                                                                                                                                                                                                                 |
| 2    | `d6053e4`                         | Normalise at every Convex entry: 4 `otpDb` handlers, 2 `otp` actions, 2 `users.ts` handlers. +1 test (cross-caller row-convergence).                                                                                                                                                                                                     |
| 3    | `b97ca5e` + `30b2917` + `2278b06` | `internal.migrations.phase3a.normalizePhones.run` — idempotent + merges duplicate users by reassigning **9** userId-scoped FKs (all primary + 2 optional: `biomarker_curation_queue.resolvedByUserId`, `lab_orders.orderedByUserId`). PII-redacted log. +2 tests.                                                                        |
| 4    | `50c2059`                         | Mobile `phone-verify.tsx` line 32 + 4 fixture rows → E.164. Mobile suite 237/237.                                                                                                                                                                                                                                                        |
| 5    | `4c26900`                         | Dev-OTP double-gate: `NODE_ENV !== "production"` AND `!isProdDeployment(CONVEX_DEPLOYMENT)`. `DEV_BYPASS_PREFIX = "+9199999000"`. Lock-in test replaced with 2 guard tests. Decision: `docs/decisions/2026-04-24-phase-3a-dev-otp-gate.md`.                                                                                              |
| 6    | `ba2460a`                         | Phones swept to E.164 in 6 files (seeds + tests). e164.test.ts + normalizePhones.test.ts intentional spaced inputs left in place.                                                                                                                                                                                                        |
| 7    | `5ed247e` + `6796f2e`             | Runbook + `vitest.claude.config.ts` auto-loads `.env.local`. **Operator rotation complete 2026-04-24** — new key `onlyou-dev-2026Q2`, old revoked. `pnpm test:claude` 8/8 in 93s (prior 128s baseline). `pnpm e2e:manual` status=ready in 57.9s.                                                                                         |
| 8    | `bc953f5`                         | `findLabReportByContentHash` helper + grep-style guard test (fails CI on raw `withIndex("by_user_hash", …)` outside helper). `fast-glob` devDep. +2 tests.                                                                                                                                                                               |
| 9    | `38db33a`                         | Clinical advisor packet regenerated at `docs/clinical-review/`. Sign-off + stamping + seed-validation assertion **deferred to Phase 8 pre-prod gate** per founder decision 2026-04-24. Decision: `docs/decisions/2026-04-24-phase-3a-clinical-signoff-deferred.md`.                                                                      |
| 10   | —                                 | Live E2E green (covered under Task 7 operator rotation).                                                                                                                                                                                                                                                                                 |
| 11   | `8bf7314`                         | 4 DEFERRED strikes (phone norm, OTP gate, PENDING_HASH, Anthropic rotate) + Phase 8 clinical-signoff entry. Phase review at `docs/superpowers/reviews/2026-04-24-phase-3a-review.md` — **APPROVED_WITH_MINORS**. I-1 fixed in `2278b06`; M-1 pre-existing `parseLabReport.branches.test.ts` happy-path timeout flagged for a later pass. |
| 12   | _(this commit)_                   | Merge to master + push + worktree cleanup.                                                                                                                                                                                                                                                                                               |

**Tests at merge:** convex **225/225 vitest** · mobile **237/237 jest** · core **16/16 vitest** · seed **19/19 vitest** · `pnpm -w typecheck --force` clean across 6 packages. Typecheck ran on every commit via the pre-commit hook.

**Live verifications:** `pnpm test:claude` 8/8 in 93s · `pnpm e2e:manual` status=ready in 57.9s on `aromatic-labrador-938` with rotated key.

**Phase review artifact:** `docs/superpowers/reviews/2026-04-24-phase-3a-review.md`.

**Post-merge migration run (dev Convex `aromatic-labrador-938`, 2026-04-24 18:15 IST):**

- First run: `{ usersUpdated: 9, usersAlreadyCanonical: 0, usersDeleted: 0, otpAttemptsUpdated: 0 }`.
- Second run (idempotency): `{ usersUpdated: 0, usersAlreadyCanonical: 9, usersDeleted: 0, otpAttemptsUpdated: 0 }` ✓.
- No duplicate-merge cases hit — all 9 legacy rows were simple patch-in-place.

**Additional post-merge fix:** `0030a62` corrected `loadEnv` import in `vitest.claude.config.ts` from `vitest/config` → `vite` — Convex's push-time tsc caught a TS2305 that the workspace tsc missed.

**Pending (operator):** push `master` to `origin/master`. Master is now ~70 commits ahead of remote (2.5E merge + phase-3a merge + post-merge fix + migration).

---

**Phase 3 brainstorm decisions (summary):**

- **D1** Six sub-phases 3A–3F, each own spec/plan/merge cycle. Approval gate after 3F before Phase 4.
- **D2** AI option **B** in 3C (questionnaire only, no photos). Option C (vision + template hint + red flags) deferred to Phase 8. `ai_assessments` schema forward-compat with optional `photoAnalysis`/`recommendedTemplateHint`/`redFlags`.
- **D3** Doctor-sim = Convex dashboard mutations + `scripts/doctor-sim.ts` CLI. **No admin UI** in 3D.
- **D4** Template selection in 3D is operator-driven. No auto-recommendation. Keeps 3D independent of 3C output.
- **D5** Razorpay **test mode only** in 3E. Live-key flip at Phase 8 (founder already has Business account, no KYC gate).
- **D6** Pharmacy auto-advance via Convex scheduler gated behind `PHARMACY_AUTO_ADVANCE` feature flag with stable event interface for Phase 6 real-pharmacy swap.
- **D7** Full 22-status `consultations` enum + `transitionStatus`/`systemTransition` validators ship in 3B — no staged migrations.
- **D8** Subscription deep-management, `profile/wallet`, Razorpay live-flip, UPI Autopay ₹15,000 cap handling, auto-template-recommendation all rehomed to Phase 8 with **Why** + **How to apply** in DEFERRED.md.

**Sub-phase 3A scope locked:** phone E.164 normalization + migration, dev-OTP `NODE_ENV` gate, rotate `ANTHROPIC_API_KEY`, `PENDING_HASH_PREFIX` filter on all `by_user_hash` consumers, 45 DRAFT reference ranges → `reviewed` status (clinical-advisor sign-off). Out of scope for 3A: Gupshup (→3E), Google+Apple social auth (→3B), iOS parity screenshots (Mac-blocked external task, gates Phase 3 approval merge only).

**Approval gate demo script (end of 3F):** golden path (signup → 28-Q + skip logic → 4 photos → real AI → doctor-sim prescribe → Razorpay test card → auto-advance → `TREATMENT_ACTIVE`) + DECLINE terminal UI + MORE_INFO_REQUESTED reply-loop. LAB_ORDERED/REFERRED/EXPIRED_UNPAID/AI_FAILED covered by integration tests, not demo.

**Next action (new session):** start sub-phase 3A plan via `superpowers:writing-plans`. Feed it the spec's §3 (3A scope) + D8 deferred items. First concrete tasks likely: E.164 helper + users migration, dev-OTP NODE_ENV gate (intentionally flips existing lock-in test red — documented in DEFERRED line 231), Anthropic key rotation + verification run, PENDING_HASH filter audit across 4 `by_user_hash` consumers, clinical advisor sign-off round-trip on 45 ranges.

**Phase 2.5E state (preserved):** ✅ **MERGED to master `cf88ce5` on 2026-04-24.** 26 commits across 5 waves on the `phase-2.5e` branch. Real reference-range bounds + multi-point trend + prior-report `prev` now join in `myBiomarkerReports` (single `Promise.all` batch per marker). Hook transform consumes real server shape with direction-aware status, unbounded-range synthesis, and latest-report-only semantics; `id` maps to `canonicalId` so explainer lookup resolves. `RangeBar` gains `direction` prop — gradient stops adapt for unboundedHigh/Low (HDL shows no red zone on the right). Dashboard greeting/date/avatar wired to `useDisplayUser` + IST helpers (`Asia/Kolkata`). Detail byline reads `— Your care team`. Explainer module now `{base, byStatus}` with 31 entries covering mock ids + seed canonical ids + 6 new markers (hba1c/mcv/free_t3/free_t4/iron_serum/vitamin_b12) via alias fix `2c03e94`. Dev seed `seedArjunHistory` produces 4-report drifting history. `collectionDate` normalized to ISO-8601 at ingest via new helper (`normalizeCollectionDate.ts`). Code review APPROVED_WITH_MINORS (0 Critical, 3 Important — all fixed `43088c4`/`b440c66`/`d867563`; 5 Minor tracked in review). Live E2E on physical Android 2026-04-24 PASS_WITH_NOTES — 7 screenshots committed at `docs/superpowers/phases/2.5e/e2e/`; founder flagged range toggle as cosmetic (deferred to Phase 8). **Tests at merge:** mobile **237/237 jest** · convex **218/218 vitest** · seed **19/19 vitest** · `pnpm -w typecheck --force` clean across 6 packages · `pnpm -w lint` clean. **Open:** push `master` to `origin/master` (60+ commits ahead of remote). iOS parity still Mac-blocked (re-deferred to Phase 3 approval gate). 45 DRAFT reference-range rows still need clinical-advisor sign-off before any prod seed — Phase 2.5 approval prerequisite. **Next action:** brainstorm Phase 3 (Hair Loss end-to-end) or kick off any pending doc updates before phase pivot.
**Phase 2.5D:** ✅ merged to master `82e6f46` on 2026-04-23.
**Phase 2.5C:** ✅ merged to master `970f0d5` on 2026-04-22 (upstream state below, left intact).

## Phase 2.5D progress (as of 2026-04-22, end of session 1)

**Spec + plan:** `docs/superpowers/specs/2026-04-22-phase-2.5d-biomarker-mobile-ui-design.md` (`a66641e`) · `docs/superpowers/plans/2026-04-22-phase-2.5d-biomarker-mobile-ui.md` (`d566595`) — both on master already. Worktree branched off master at the plan commit.

**Commits on `phase-2.5d` (28, branch tip `7a36089`):**

| Wave | Commit    | Task                                                                                                                                                                                                                                 |
| ---- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | `8708ba0` | Task 1.1 — `react-native-svg@15.12.1` + smoke test                                                                                                                                                                                   |
| 1    | `bf95544` | Task 1.2 — `status-helpers.ts` (statusColor/statusLabel/rangePct) + fix missing `./tokens/biomarker` export in `packages/core/package.json`                                                                                          |
| 1    | `037a868` | Task 1.3 — `RangeBar` port (react-native-svg, `useId()` gradient, glow via opacity layer)                                                                                                                                            |
| 1    | `5c006b3` | Task 1.4 — `Sparkline` port                                                                                                                                                                                                          |
| 1    | `64b7e7c` | Task 1.5 — `Dial` port (60 tick marks, optimal arc, progress arc, needle; drop-shadow → opacity layer)                                                                                                                               |
| 1    | `22b9744` | Task 1.6 — `AreaChart` port (static halo; `<animate>` dropped)                                                                                                                                                                       |
| 2    | `35357bf` | Task 2.1 — 24 biomarker mock dataset + 7 categories (verbatim port)                                                                                                                                                                  |
| 2    | `0d8069e` | Task 2.2 — `SummaryStat` + `CategoryFilterPills` + `NewReportBanner` + `expo-linear-gradient` jest mock                                                                                                                              |
| 2    | `8a49a9d` | Task 2.3 — `BiomarkerCard` with delta colouring (downIsGood rule)                                                                                                                                                                    |
| 2    | `e2d4135` | Task 2.4 — `app/lab-results/_layout.tsx` + `index.tsx` (Dashboard) + root `Stack.Screen`                                                                                                                                             |
| 2    | `253fe22` | Task 2.5 — `hasUnreadReport` flag on dev-scenario store + home `NewReportBanner` entry (cross-register handoff)                                                                                                                      |
| 2    | `9175bf7` | Task 2.5.1 — dev scenario-switcher toggle UI + `[id].tsx` route stub (to unblock Expo Router typed-routes)                                                                                                                           |
| 3    | `6078615` | Task 3.1 — `RefRow` + `DetailHero` + `biomarker-explainers.ts` map                                                                                                                                                                   |
| 3    | `7006f3d` | Task 3.2 — `app/lab-results/[id].tsx` full Detail screen                                                                                                                                                                             |
| 3    | `a9f70e8` | Fix — AreaChart width shrunk by 34px to fit inside trend card (founder-reported overflow)                                                                                                                                            |
| 4    | `8e8258b` | Task 4.1 — `convex/biomarker/patient/myBiomarkerReports.ts` + 7 test cases                                                                                                                                                           |
| 4    | `f2b3081` | Task 4.2 — canonical join added to query + `use-biomarker-reports` hook + Dashboard/Detail wiring (mock default, `EXPO_PUBLIC_USE_MOCK_BIOMARKERS=0` opts into real data)                                                            |
| 4    | `645548a` | Task 4.3 — `onlyou://lab-results[/:id]` deep-link handler in root `_layout.tsx` (queues pre-hydration)                                                                                                                               |
| 4    | `b09c97b` | Task 4.4 — live E2E PASS on device-seeded Convex round-trip (2026-04-23)                                                                                                                                                             |
| 5    | `7278d50` | Task 5.2 — reanimated rise/pulse/shimmer animations (BiomarkerCard + NewReportBanner + jest mock extension for FadeInUp)                                                                                                             |
| 5    | `631e63d` | Task 5.2 fix — cancel animations on unmount + shimmer pointerEvents (code-review findings)                                                                                                                                           |
| 5    | `7c1625b` | Fix — restore lab-results test suites to green (jest `^react$` moduleNameMapper → hoisted copy collapses convex's nested React 19.2.x; per-file `jest.mock("convex/react")` in detail + index tests bypasses missing ConvexProvider) |
| 5    | `b76fe95` | Wave 5 Step 2-4 — Android device parity screenshots + README at `docs/superpowers/phases/2.5d/wave-5-parity/` (iOS flagged as 2.5E-setup follow-up)                                                                                  |
| 6    | `b16e83e` | Task 6.1 — fix `(tabs)/home/index.tsx` import/order warning introduced by cross-register comment placement                                                                                                                           |
| 6    | `61b732a` | Task 6.2 — code review report at `docs/superpowers/reviews/2026-04-23-phase-2.5d-review.md` (0 Critical, 3 Important, 11 Minor)                                                                                                      |
| 6    | `fcd8983` | Task 6.2 I-1 — guard BiomarkerCard delta against `prev=0` (one-line guard mirroring DetailHero pattern)                                                                                                                              |
| 6    | `918c9de` | Task 6.2 I-2 — derive AreaChart x-labels from `data.length` (1 → "now"; 2-6 → "Nmo"+blank+"now"; ≥7 → original 7-slot cadence)                                                                                                       |
| 6    | `7a36089` | Task 6.2 I-3 — validate deep-link path against `/lab-results` allowlist before `router.push`                                                                                                                                         |

Task 5.1 (register lint check) — clean, no commits needed. Task 5.3 (feel checklist code-side) — all checks PASS (24 px padding, SafeArea, no bottom-sheets, no hardcoded hex in runtime biomarker paths).

**Test counts (2026-04-23, end Wave 6):** Mobile **218/218 jest** · Convex **206/206 vitest** · Seed **19/19 vitest** · Monorepo `pnpm typecheck` clean (6 workspaces) · Monorepo `pnpm lint` clean except 4 × pre-existing `@onlyou/ui` `import/order` warnings (pre-date Phase 2.5D).

**Visual approval gates passed on device (2026-04-22 evening):**

- ✅ Wave 2 — Dashboard. Founder tested banner toggle → Dashboard route → 24-card filter list. Approved.
- ✅ Wave 3 — Detail. Approved after `a9f70e8` fix for last-point halo overflow.

**Pre-existing infra reused (not rebuilt):**

- `packages/core/src/tokens/biomarker.ts` — palette + font map already shipped in 2.5A.
- `apps/mobile/app/_layout.tsx` — Instrument Serif + JetBrains Mono already loaded.
- Decision record `docs/decisions/2026-04-17-biomarker-design-register.md` — two-register guardrail (ESLint `no-restricted-imports`). All biomarker UI stays inside `lab-results/**` + `components/biomarker/**` paths; the single permitted cross-register import is `NewReportBanner` into `(tabs)/home/index.tsx` (disabled with inline comment + rationale).

## Open items — Phase 2.5D

1. ~~**Merge `phase-2.5d` → `master`**~~ — ✅ merged `82e6f46` on 2026-04-23.
2. **iOS parity follow-up** — capture `ios-dashboard.png` + `ios-detail.png` on same seeded Arjun dataset when Mac access is available; commit into `docs/superpowers/phases/2.5d/wave-5-parity/`. Non-blocking.
3. **Push master to origin** — 34 commits ahead of `origin/master` as of 2026-04-23 (2.5C merge + 2.5D merge + doc commits).

## DEFERRED — Phase 2.5D items

All ~30 deferrals from Waves 1–6 are now cataloged in `docs/DEFERRED.md` §"Phase 2.5D Waves 1–6 deferrals" with per-row destinations (2.5E, Phase 8, etc.). Shipped items struck through with commit references. See that file for the authoritative list.

---

## Phase 2.5C progress

**Wave 1 — Real ingestion (12 commits, tip `55947ff`):** schema widens, IST rate-limit helpers, shared `createLabReport`, `parseLabReport` → internalAction, `intakeUpload` mutation with atomic rate-limit check+insert, `retryParseLabReport` with 3-lifetime cap, session-token auth, I-1/I-2 fixes, `findReferenceRangeId` isActive bug fix, shared `normalizeKey` persisted on `biomarker_values`, codegen regen.

**Wave 2 — Notifications (3 commits, tip `70879ec`):**

| #   | Task                                                                        | Commit    |
| --- | --------------------------------------------------------------------------- | --------- |
| 9   | Notification writer helper + `writeNotification` internalMutation (4 kinds) | `46c1e50` |
| 10  | Emit `lab_report_ready` + `lab_report_parse_failed` from `parseLabReport`   | `e4b1cae` |
| 11  | Placeholder test for `lab_report_updated` band-change emission (filled W4)  | `70879ec` |

Wave 2 observations flagged during review (consider DEFERRED entries before merging 2.5C):

- **Notification emit is not atomic with the status mutation.** If `writeNotificationFromAction` fails after `markReady`/`markParseFailed` commit, Convex retries the whole action, but the idempotency guards at the top of `parseLabReport` short-circuit on the retry — notification is silently dropped. Fix options: (a) make the notification write idempotent on `(userId, kind, biomarkerReportId ?? labReportId)` and emit from the idempotent-noop branch too, or (b) move the insert into the same mutation as `markReady`/`markParseFailed` (helper file already exports `writeNotificationFromMutation`).
- **Log ordering.** Emit sits between mark-status and `logParseEvent`; if the emit throws, the structured log for `parse_complete`/`parse_failed` is lost. Wrap-and-rethrow, or swap order.

**Test counts after Wave 2:** `pnpm test:convex` — 18 files passed + 1 skipped (Task 11 placeholder), **132 tests passing** (prior 112 + 20 new Wave 1 tests; Wave 2 added no active tests by design).

**Wave 3 — Smart unknowns (7 commits, tip `4030932`):**

| #   | Task                                                                                                                                                                                                                                                             | Commit    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 12  | `jaroWinkler` pure string-similarity fn + 6-test battery                                                                                                                                                                                                         | `3cc122d` |
| 13  | `fuzzyAliasMatch` — 3-way agreement gate (score ≥ 0.92 + unit match + Claude guess agreement) + 6 tests                                                                                                                                                          | `f672aa8` |
| 14  | `isPanelCode` helper + JSON regex patterns for lab codes, ratio codes, and explicit PANEL/PROFILE designators                                                                                                                                                    | `d7d8689` |
| 15  | Wire Layer A (panel-code skip) + Layer B (fuzzy re-classify) into `parseLabReport`; extend `classifyRow` with `forcedCanonicalId`; expose `aliases` on `getActiveRanges`; widen `upsertCurationRow` with `resolveAsWontFix`                                      | `6107c4e` |
| 16  | `autoGenerateDraftRange` — 7-gate generator (cooling-off + Claude guess + is_real_biomarker + confidence + category whitelist + citation + threshold ordering); `insertReferenceRange` mutation; `callAutoDraftRange` Claude wrapper                             | `8b0445c` |
| 17  | Wire Layer C into `parseLabReport`: occurrenceCount lookup → auto-DRAFT call → mark queue resolved → reclassify this marker → schedule `reclassifyForCanonicalId` (stub until Wave 4 Task 22); add `getCurationRowByKey` query, `patchCurationQueueRow` mutation | `8d87fac` |
| 18  | `describe.todo` smoke placeholder (filled in Wave 6 Task 31)                                                                                                                                                                                                     | `4030932` |

**Test counts after Wave 3:** `pnpm test:convex` — 22 files passed + 2 skipped (Tasks 11 + 18 placeholders), **156 tests passing** (prior 132 + 6 Jaro-Winkler + 6 fuzzy-alias + 5 panel-code + 7 auto-range). `pnpm -w typecheck` clean across all 6 packages.

**Wave 3 carry-forward — resolved in Wave 4:**

- ~~`convex/biomarker/reclassifyForCanonicalId.ts` stub~~ → **filled by Task 22 (`0822b86`).**
- ~~`notifications-band-change.test.ts` unused `it` import~~ → **filled by Task 25 (`d24fd1e`). `npx convex codegen` tsc now clean.**

**Wave 4 — Reclassify engine (10 commits, tip `d24fd1e`):**

| #   | Task                                                                                                                                                                                                                                                                                                                                                                  | Commit(s)             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 19  | 2.5B carry-forwards — I-3 few-shot (8 pairs), M-2 drop `classify_row` literal, M-6 findRetryCandidates return type; M-5/M-7 verified no-op                                                                                                                                                                                                                            | `c13dd28` + `0ec7dbc` |
| 20  | `reclassify_locks` acquire/release helpers + owner-token semantics + stale-sweep mutation (6 tests); `!`-assertion dropped after code review                                                                                                                                                                                                                          | `f74ef50` + `e7ade71` |
| 21  | Stale-lock sweep cron (5min)                                                                                                                                                                                                                                                                                                                                          | `a68eeb2`             |
| 22  | `reclassifyForCanonicalId` internal action — lock, chunked loop, classifyRow re-run, band-change notifications, `reclassify_canonical_commit` audit log (4 tests); fills Wave 3 Layer C stub                                                                                                                                                                          | `0822b86`             |
| 23  | `reclassifyAllReports` preview mode — coupled `computeReclassifyPayload(ctx, write)` helper, rangesSignature staleness contract (3 tests). Fix: hardcoded `age: 30` bug caught by code reviewer (would corrupt `referenceRangeId` for age-banded markers) + moved staleness check under lock (folds I1+I4) + regression test with pediatric range.                    | `59744d5` + `fcf4466` |
| 24  | `reclassifyAllReports` commit mode + real `writeAuditLog` (replaces Task 22 stub). Commit tests (2), audit-log tests (3). Fix: audit-assertion gap closed (test now seeds ADMIN + asserts admin_audit_log row); shared `adminAuditActionValidator` + `adminAuditTargetTableValidator` extracted to `convex/biomarker/lib/auditValidators.ts` (prevents schema drift). | `a22ae39` + `da357cb` |
| 25  | Fill `notifications-band-change.test.ts` — 2 tests (no-op emits zero; N-affected-reports → N-notifications contract)                                                                                                                                                                                                                                                  | `d24fd1e`             |

**Test counts after Wave 4:** `pnpm test:convex` — 28 files passed + 1 skipped (Task 18 Wave 6 placeholder only), **179 tests passing** (prior 156 + 6 lock + 4 reclassifyForCanonicalId + 6 preview+fix + 5 commit+audit + 2 band-change). `pnpm -w typecheck --force` clean across all 6 packages. `pnpm -w lint --force` clean. `npx convex codegen` tsc now clean (previously failed on Wave 2 placeholder).

**Wave 4 live-test validation:** `pnpm test:claude` re-run with populated `FEW_SHOT_EXAMPLES` — **8/8 golden fixtures pass in 80s** (2.5B baseline was 128s on empty few-shots; faster by 37%). No extraction regression from I-3 populate.

**Wave 4 DEFERRED additions:**

- `writeAuditLog` system-triggered attribution hardening — sentinel-admin lookup is non-deterministic + full-scan. Destination: **Phase 5 (admin portal)** (`docs/DEFERRED.md` under "Phase 5 — Admin portal").
- Code reviewer observations tracked for post-Wave-4 cleanup: N+1 user load in chunk loops (Tasks 22/23), commit-mode test coverage extensions, `findRange` vs `findReferenceRangeId` sex-preference drift (pre-existing 2.5B bug).

**Wave 5 — Portal contracts (5 commits incl. review fixes, tip `a39643b`):**

| #   | Task                                                                                                                                                                                                                                                                                                                                    | Commit    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 26  | `assertPortalEnabled` helper with double-flag prod guard (`LAB`/`DOCTOR` × `_PORTAL_ENABLED` + `_PORTAL_REAL_AUTH` on prod). 5 unit tests.                                                                                                                                                                                              | `8938304` |
| 27  | `labUploadResult` mutation (lab-partner upload surface). Guards: portal-enabled flag + nonempty partner token + order must be in `awaiting_results`. Emits `lab_report_uploaded_for_you`. 4 tests.                                                                                                                                      | `d7076bf` |
| 28  | `biomarkerReportsForPatient` query (doctor-portal read surface). Guards: DOCTOR portal-enabled + caller.role must be `DOCTOR`. `doctorContext` arg dropped — `consultations` table not in schema yet; Phase 4 re-adds. 3 tests.                                                                                                         | `9061c66` |
| 29  | `simulateLabUpload` admin action — reuses shared `createLabReportFromAction`; supports both `lab_upload` and `nurse_flow` sources via the same code path. Guarded by `assertNotProd()` + auth.                                                                                                                                          | `1c32920` |
| RFX | Review fixes C-1 (session-token auth on doctor query + drop identity check on admin action), I-1 (hoist anchored prod regex to `convex/lib/envGuards.ts`, dash-bounded), I-2 (explicit field projection on doctor query), I-3 (reject non-finite/non-positive `fileSizeBytes`). +2 false-positive regex tests, +1 unauthenticated test. | `a39643b` |

**Wave 5 notes:**

- Plan snippets used lowercase roles (`"patient"`, `"doctor"`, `"nurse"`) and `ctx.db.system.insert("_storage", …)` in test fixtures — actual `roleValidator` uses uppercase `ROLES` (`"PATIENT"/"DOCTOR"/"NURSE"`) and convex-test needs `ctx.storage.store(blob)` for storage. Adjusted tests in place; plan kept for future reference.
- Plan proposed an `_modules.ts` barrel for convex-test; repo convention is inline `import.meta.glob("../../**/*.ts")` per file (matches `intake-upload.test.ts`). Used inline glob.
- Task 29 dashboard smoke skipped (requires `npx convex dev` auth). Typecheck + full suite confirm the action compiles. Manual dashboard verify tracked as a follow-up before merging 2.5C.
- **C-1 root cause:** Wave 5 initial pass used `ctx.auth.getUserIdentity()` — forbidden because `auth.config.ts` has `providers: []`. The 2026-04-20 decision note (`docs/decisions/2026-04-20-session-token-auth-in-2-5c-mutations.md`) mandates session-token auth; Wave 5 regressed and review caught it. Fix extends the decision scope from mutations to queries.

**Wave 5 review artifact:** `docs/superpowers/reviews/2026-04-21-phase-2.5c-wave-5-review.md` (Critical: 1, Important: 4 — all addressed in `a39643b`; I-4 was a checkpoint-on-master-vs-worktree false alarm).

**Test counts after Wave 5 (post review fixes):** `pnpm test:convex` — 29 files passed + 1 skipped, **194 tests passing** (prior 179 + 5 helper + 4 labUpload + 3 doctor-query + 3 review-fix regressions). `pnpm -w typecheck --force` clean across all 6 packages.

**Next:** Wave 6 — Tests + E2E (Tasks 30–31+). Seed admin-user script + the canonical DRAFT→reviewed round-trip test. Starts at plan line 5420.

**Wave 6 — Tests + E2E (Tasks 30-32 complete, tip `c8c94a7`):**

| #   | Task                                                                                                                                                                                                                                                                                                                       | Commit(s)                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 30  | `scripts/seed-admin-user.ts` (dev-only, prod-guarded) + `internal.users.getUserByPhone` / `createUser` + `admin.seedAdminUser` internalAction + `pnpm seed:admin-user`. Review-fix unified the script's prod-regex with the canonical `envGuards.ts` `PROD_DEPLOYMENT_PATTERNS` dash-bounded pattern.                      | `83099b9` + `f11d4e8`                         |
| 31  | `convex/__tests__/biomarker/reclassify-roundtrip.test.ts` — 2 canonical round-trip tests (DRAFT→reviewed happy-path with band flip + aggregate recompute + `lab_report_updated` notification; stale `rangesSignature` rejection). 196/196 pass.                                                                            | `79d3087`                                     |
| 32  | Automated manual E2E replacement: `admin.generateUploadUrl` + `admin.getE2EStatus` public helpers (`assertNotProd`-guarded) + `scripts/run-manual-e2e.ts` driver + `pnpm e2e:manual`. First live end-to-end run surfaced three pre-existing Phase 2.5B bugs that unit tests had masked; all fixed before `ready` achieved. | `49b689f` + `8484b46` + `85ba690` + `c8c94a7` |

**Wave 6 Task 32 — bugs surfaced by the first live E2E (all Phase 2.5B pre-existing, masked by unit-test mocks):**

1. **Dynamic import in V8 query runtime.** `convex/biomarker/internalQueries.ts:57` `getUnitConversions` used `await import("../../packages/core/seeds/unit-conversions.json")` inside its handler. Convex V8 query runtime rejects dynamic imports — threw `Uncaught TypeError: dynamic module import unsupported` on every parse. Fix: static top-level JSON import + pre-shaped `UNIT_CONVERSIONS` module constant; handler returns the cached array (`8484b46`). Pattern mirrors `panelCodeDetect.ts`.
2. **`Buffer` in V8 action runtime.** `convex/biomarker/parseLabReport.ts:128` called `Buffer.from(pdfBlob).toString("base64")` to encode the PDF for Claude. No `"use node"` directive → Node's `Buffer` global unavailable → `Uncaught ReferenceError: Buffer is not defined`. Fix: `arrayBufferToBase64` helper using `Uint8Array` + chunked `String.fromCharCode.apply` + `btoa` (chunk size 32 KiB) (`85ba690`). Adding `"use node"` was the alternative but would force the whole action + transitive deps into Node runtime.
3. **Zod `.nullable()` on partial Claude JSON.** `convex/lib/claude.ts` `AutoDraftRangeOutputSchema` used `.nullable()` on ~15 fields, but Claude returns partial JSON when `is_real_biomarker: false` (omits keys entirely → `undefined`, not `null`). Zod threw; unhandled throw propagated through `autoGenerateDraftRange` into `parseLabReport` mid-loop (biomarker_report written with `narrativeModel: "pending"` but `lab_report` stuck `analyzing` forever because `markReady` / `markParseFailed` were never reached). Fix: schema `.nullable()` → `.nullish()`, `aliases` defaulted to `[]`, field-presence checks in `autoDraftRange.ts` switched `=== null` → `== null`, and `callAutoDraftRange` now wrapped in try/catch inside `autoGenerateDraftRange` with new outcome `rejected_claude_error` for defense-in-depth against future Claude schema drift (`c8c94a7`).

**Phase 2.5C manual E2E (2026-04-22) — PASSED**

Automated via `scripts/run-manual-e2e.ts` (`pnpm e2e:manual`) against dev deployment `aromatic-labrador-938`. Replaces the original plan Task 32's dashboard-clicking procedure (infeasible because Wave 5 locked `intakeUpload` behind session-token auth; the driver calls `admin.simulateLabUpload` instead, same parse pipeline).

- Fixture: `01-lal-pathlabs-cbc-happy.pdf` (59382 bytes)
- Test patient: `j97d9t2x395bb63hncyjsspcss850kzd` (role `PATIENT`, gender male, dob 1987-03-19, profileComplete true)
- `lab_report.status` terminal: **`ready`**
- `biomarker_report` created: **yes** (`narrativeModel: "claude-sonnet-4-6"`, narrative generated in English)
- `biomarker_values` count: **4** (Hemoglobin + MCV classified `optimal`; WBC + Platelets `unclassified` — `not_in_reference_db` / `unit_conversion_missing` for `/cumm` vs canonical `10^3/µL`; known seeded-range gap, not a pipeline bug)
- Aggregates: `optimalCount: 2`, `unclassifiedCount: 2`, `subOptimalCount: 0`, `actionRequiredCount: 0`
- `patientNameMatch: "mismatch"` (fixture "TEST PATIENT MALE" vs seeded user "Rajendra prasad" — expected)
- Notifications emitted: **1 × `lab_report_ready`** for this run
- Duration: **32.2s** (upload → `ready`, including 3 Claude API calls: extraction + narrative + 1 auto-draft attempt)
- Estimated cost per run: ~$0.03

Driver is reusable — future manual E2E runs against dev are `pnpm e2e:manual` with optional `E2E_USER_ID` / `E2E_FIXTURE` env overrides.

**Wave 6 completion additions (post-checkpoint tip `e3a275b`):**

- `e835151` — Task 33 phase-level code review report (APPROVED_WITH_MINORS: 0 critical, 2 important, 5 minor).
- `1428422` — I-1 fix: `admin.generateUploadUrl` + `admin.getE2EStatus` switched from public to `internalMutation`/`internalQuery`; driver script shells out via `npx convex run`.
- `cb3fec5` — I-2 fix: `simulateLabUpload` now calls `assertPortalEnabled("LAB", …)` when `source === "lab_upload"`.
- `17f9905` — M-4 fix: `PROD_DEPLOYMENT_PATTERNS` + `isProdDeployment` extracted to `packages/core/src/deployment/prod-patterns.ts`; `convex/lib/envGuards.ts` re-exports; both Node scripts now import from the shared source.
- `c53fcbc` — review doc appended with review-fix pass outcome (APPROVED).
- `970f0d5` — **merge commit on master.** Feature branch merged with `--no-ff`. 56 commits total.

**Phase 2.5C artifacts on master:**

- Plan: `docs/superpowers/plans/2026-04-20-phase-2.5c-ingestion-automation-reclassify.md`
- Spec: `docs/superpowers/specs/2026-04-20-phase-2.5c-ingestion-automation-reclassify-design.md`
- Phase review: `docs/superpowers/reviews/2026-04-22-phase-2.5c-ingestion-automation-reclassify-review.md`
- Wave 5 review: `docs/superpowers/reviews/2026-04-21-phase-2.5c-wave-5-review.md`
- As-built retro: `docs/decisions/2026-04-22-phase-2.5c-as-built.md`
- Decisions logged mid-execution:
  - `docs/decisions/2026-04-20-session-token-auth-in-2-5c-mutations.md`
  - `docs/decisions/2026-04-20-proceeding-on-draft-ranges.md`
  - `docs/decisions/2026-04-21-plan-verbatim-cross-check-siblings.md`

**Test counts at merge (2026-04-22):**

- `pnpm test:convex`: **196 passed / 1 skipped** (Task 18 placeholder deferred)
- `pnpm -w typecheck --force`: clean across 6 packages
- `pnpm -w lint`: clean
- `pnpm e2e:manual` (live Convex + Claude): **`status=ready` in 38.7s** against dev deployment `aromatic-labrador-938`
- `pnpm test:claude` (last run Wave 4): 8/8 golden fixtures pass in 80s

**⚠️ Carry-forward items before Phase 2.5D approval:**

- 45 reference-range rows remain `DRAFT — pending review`. Clinical advisor sign-off is a **Phase 2.5 approval prerequisite** before any prod seed.
- Rotate the dev `ANTHROPIC_API_KEY` — pasted into chat on 2026-04-19; exposed again in `npx convex env list` output on 2026-04-22. Entry in `docs/DEFERRED.md`.
- `LAB_PORTAL_ENABLED=1` is now required on the dev Convex deployment for `pnpm e2e:manual` to run (set via `npx convex env set`) — consequence of post-review I-2 fix.
- Phase-level review minor findings M-1, M-2, M-3, M-5 tracked as post-merge cleanup (below Minor severity).

---

## Prior history (2.5A/2.5B, merged to master)

**2.5B on master:** `eaea3b7` (2026-04-18). **2.5A on master:** `042f660` (same day). Both feature branches + worktrees cleaned up on 2026-04-19.

**Post-merge fixes on master (2026-04-19):**

- `e9bb225` — workspace lint restored: `next lint` removed in Next.js 16 → swap to `eslint .`; /design swatches now import from `@onlyou/core/tokens/colors` (30 `onlyou/no-hardcoded-hex` errors resolved).
- `54ea1ad` — first live `pnpm test:claude` run surfaced `betas: Extra inputs are not permitted` from SDK ^0.90. Routed `callExtraction` through `client.beta.messages.create` (the supported surface for per-request beta features). Live test now calls `extractMarkersWithRetry` (production path) to exercise the 8192-token retry on multipage wellness panels. Timeout bumped to 180s. **8/8 live fixtures pass** (128s, ~$0.25 per full run).
- Decision note: `docs/decisions/2026-04-19-anthropic-sdk-beta-namespace.md`

**⚠️ Carry-forward items before prod:**

- ~~`pnpm test:claude` live suite has never been run~~ → **✅ RAN 2026-04-19, 8/8 pass**. First time with a real `ANTHROPIC_API_KEY`.
- **Manual Convex dashboard E2E → deferred to Phase 2.5C** (entry in `docs/DEFERRED.md`). Pre-`intakeUpload`, manual setup is ~10 min of dashboard clicking per run; post-`intakeUpload` (2.5C) it becomes the real patient upload flow. Hard gate before Phase 2.5D approval.
- 45 reference-range rows remain `DRAFT — pending review`. Clinical advisor sign-off is a prerequisite before any prod seed.
- Rotate the dev `ANTHROPIC_API_KEY` — pasted into chat on 2026-04-19; lives in transcript/terminal history. Entry in `docs/DEFERRED.md` — do anytime after 2.5 approval gate.

**2.5B artifacts on master:**

- Plan: `docs/superpowers/plans/2026-04-18-phase-2.5b-parse-pipeline.md` (commit `a9fe4f2`)
- Spec: `docs/superpowers/specs/2026-04-18-phase-2.5b-parse-pipeline-design.md` (commit `5642dab`)
- Review: `docs/superpowers/reviews/2026-04-18-phase-2.5b-parse-pipeline-review.md`
- As-built retro: `docs/decisions/2026-04-18-phase-2.5b-as-built.md`

**2.5B commits on branch (27 total):**

| #   | Task                                                                                                 | Commit    |
| --- | ---------------------------------------------------------------------------------------------------- | --------- |
| 0   | Worktree scaffold                                                                                    | `ddc7e3f` |
| 1   | Schema widen (retry fields + `not_a_lab_report` status + `by_next_retry` index)                      | `bbb00f5` |
| 2   | Deps: `@anthropic-ai/sdk ^0.90.0`, `zod ^4.3.6`, `pdf-lib ^1.17.1` (dev), `puppeteer ^24.41.0` (dev) | `ba8eba7` |
| 3   | `convex/lib/telemetry.ts` — `hashUserId` + `logParseEvent` (structured logs, no PHI)                 | `ca5d2ce` |
| 4   | `convex/lib/claude.ts` — real SDK calls, Sonnet 4.6 model IDs, cache on system block                 | `b34489d` |
| 5   | `normalizeUnit` pure fn — numeric parse + factor conversion + qualitative + `<`/`>` qualifiers       | `9018868` |
| 6   | `matchPatientName` — honorifics + initials + reversed order                                          | `871f53d` |
| 7   | `classifyRow` — pregnancy-first guard → profile → range → unit → status                              | `d130a8a` |
| 8   | `retryScheduler` — per-class backoff (30s/2m/5m/15m + 429 `retry-after`), 30-min cap                 | `5dd7ddc` |
| 9   | `upsertCurationRow` internal mutation — normalizedKey dedup + occurrence counter                     | `fe68948` |
| 10  | 8 synthetic fixture PDFs + generator script + 3 golden JSONs                                         | `c6fb337` |
| 11  | `extractMarkersWithRetry` — zod + max_tokens + refusal in-process retries                            | `4c9f009` |
| 12  | `generateNarrativeWithGuard` — empty-markers fallback                                                | `a866308` |
| 13  | `parseLabReport` orchestrator action + 7 internal queries + 9 internal mutations                     | `2c748bb` |
| 14  | `crons.ts` — 2-min retry cron with stale-lock release                                                | `7785dbc` |
| 15  | `convex/admin.ts` — `triggerParseForLabReport` dev-only mutation                                     | `32561fe` |
| 16  | 28-scenario mocked-Claude branch-coverage test suite                                                 | `cc974ab` |
| 17  | `pnpm test:claude` live integration suite — 8 synthetic fixtures                                     | `8687bd3` |
| 18  | Conditional CI gate for `test:claude` when API key present                                           | `4f5fc2c` |
| 19  | First-pass code review report                                                                        | `d754633` |
| 20  | Review fix C-1: 400 terminal + alert:p1                                                              | `970a67d` |
| 21  | Review fix I-1: atomic cron lock-claim prevents double-fire                                          | `be92a30` |
| 22  | Review fix I-2: refusal detection false-positive on valid JSON                                       | `534e01a` |
| 23  | Review fix I-3: defer few-shot examples to 2.5C with ledger entry                                    | `689401a` |
| 24  | Review fix M-1: zod-retry re-throws network errors instead of wrapping                               | `cc50ce9` |
| 25  | Review fix M-3: dedupe computeAge — export from classifyRow                                          | `5da104d` |
| 26  | Review fix M-4: status guard on parseLabReport entry                                                 | `94feec9` |

**Decisions logged mid-execution (committed to master):**

- `docs/decisions/2026-04-18-cache-breakpoint-on-system-block.md` — `cache_control` placement rationale (`3bbfe40` on master)
- `docs/decisions/2026-04-18-telemetry-hash-pure-js.md` — Convex V8 bundler forced pure-JS FNV-1a hash over `node:crypto` SHA-256 (`d088a4b` on master)
- `docs/decisions/2026-04-19-anthropic-sdk-beta-namespace.md` — `betas` body param only valid on `client.beta.messages.create`; regular `messages.create` rejects it (`54ea1ad` on master)

## Test counts at acceptance (refreshed 2026-04-19)

- `pnpm test:convex` — **112 passed** (13 suites; mocked Anthropic SDK exposes both `messages.create` and `beta.messages.create` via same spy)
- `pnpm test:seed` — **19 passed**
- `pnpm test:claude` (live Anthropic API) — **✅ 8/8 passed** on first real run (2026-04-19, 128s duration, Sonnet 4.6 vision). Surfaced and fixed two real issues: SDK beta-namespace routing + multipage wellness `max_tokens` retry exercise.
- `pnpm --filter @onlyou/mobile test` — **150/150 passed** (44 suites; prior flake did not fire on re-run)
- `pnpm -w typecheck` — clean across 6 packages
- `pnpm -w lint` — clean across 6 packages (admin/doctor/landing lint now invokes `eslint .` directly)

## Next steps

1. **Brainstorm Plan 2.5C** (ingestion + curation + portal contracts). **← next session starts here.** Brainstorm must review `docs/DEFERRED.md` first — several items land in this phase (manual E2E, I-3 few-shot examples, M-2 telemetry, M-5–M-7 hygiene).
2. **Push master to `origin/master`** — multiple commits ahead as of 2026-04-19 (`e9bb225`, `54ea1ad`, `2546c6e`, plus this doc update).
3. Manual Convex dashboard E2E — deferred to 2.5C per `docs/DEFERRED.md`. Will be exercised via the real `intakeUpload` action once 2.5C ships it.

## Branch + worktree

- Master tip: `54ea1ad` (2026-04-19 SDK beta-namespace fix)
- Phase 2.5A + 2.5B branches: merged + deleted (local + remote)
- Worktrees: both unregistered from git on 2026-04-19. Physical dirs `D:/onlyou2-phase-2.5a` and `D:/onlyou2-phase-2.5b` may still exist on disk (Windows file locks held by Metro/editors at cleanup time); safe to `rm -rf` after closing processes.

## Untracked / gitignored files (leave alone)

- `apps/mobile/.env.local` — `EXPO_PUBLIC_CONVEX_URL=https://aromatic-labrador-938.convex.cloud`. Gitignored; must exist on any machine running the app.
- Root `.env.local` — copied into worktree during Task 1 for `CONVEX_DEPLOYMENT` env; gitignored.
- `convex/_generated/*` — auto-generated by `npx convex dev`.

## Prior context (still valid)

- **Plan 2.5 split:** 2.5A foundation (complete), 2.5B parse pipeline (this phase — complete), 2.5C ingestion/admin, 2.5D mobile UI. Only 2.5D triggers the Phase 2.5 approval gate.
- **45 rows are DRAFT.** Every row has `clinicalReviewer: "DRAFT — pending review"` and `reviewedAt: null`. Clinical advisor sign-off is a **Phase 2.5 prerequisite** before any prod Convex seed.
- **`parseLabReport` is registered as `api.*`** (public) in 2.5B for dashboard testing. Will be converted to `internal.*` in 2.5C when `intakeUpload` wraps it.
- **`FEW_SHOT_EXAMPLES` is an empty array** in the system prompt for 2.5B. Populating it with 8 format-specific examples is deferred to 2.5C.

## 2.5A completion (prior context)

- As-built retro: `docs/decisions/2026-04-18-phase-2.5a-as-built.md`
- Plan: `docs/superpowers/plans/2026-04-18-phase-2.5a-foundation.md`
- Spec: `docs/superpowers/specs/2026-04-17-phase-2.5-biomarker-foundation-design.md`
- Review: `docs/superpowers/reviews/2026-04-18-phase-2.5a-foundation-review.md`
