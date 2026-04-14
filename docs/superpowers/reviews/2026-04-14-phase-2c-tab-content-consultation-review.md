# Phase 2C Tab Content + Consultation Journey — Code Review

**Branch:** `feature/phase-2c-tab-content-consultation` (worktree `D:/onlyou2-phase-2c`)
**Reviewer:** superpowers:code-reviewer (Opus 4.6, 1M context)
**Date:** 2026-04-14
**Plan:** `docs/superpowers/plans/2026-04-14-phase-2c-tab-content-consultation.md`
**Verdict:** **APPROVE-WITH-FIXES** (no blockers; a handful of consultation-flow CTA and fixture-consistency fixes, plus a few copy cleanups — none requiring architectural rework)

---

## Summary

Phase 2C lands a huge, clean increment: 35 atomic commits, ~6,300 LOC added, ~370 LOC touched, 92 files. Every plan task (0 → 22) plus three pre-tasks (convex-test harness + 6 auth tests, auth polish for wordmark/back-nav/18+/OTP timer/OTP reset, CRO pass on all four auth screens) is accounted for. The full patient journey runs end-to-end against fixtures: Explore grid → condition detail → questionnaire engine (entry + gender branch + per-question + review) → photo upload modal stack → treatment confirmation → plan-ready → plan-selection → mocked payment → subscription-confirmed → active home with medications + delivery banner.

**Green lights:**

- **Lint clean** on mobile (2 `import/order` warnings, no errors; the Next.js apps' pre-existing `next lint` breakage is unrelated to Phase 2C and has been tracked since Plan 2A).
- **Typecheck clean** on mobile (`tsc --noEmit` silent).
- **Tests green**: 135/135 mobile (44 suites), 10/10 convex (3 suites, via the new vitest + convex-test harness).
- **No hardcoded hex in Phase 2C code** — a grep across `apps/mobile` turns up only the five long-standing hex constants in `app.config.ts` (Expo splash) and `design.tsx` (swatch showcase), both pre-existing. New `verticalTintHairLoss / Ed / Pe / Weight / Pcos` tints were added to `packages/core/src/tokens/colors.ts` properly and consumed via `VERTICALS[id].tintHex`.
- **Design tokens used consistently** — every new screen imports `colors` from the mobile theme re-export (which in turn imports `@onlyou/core/tokens/colors`). The design-system discipline Phase 2B established is intact.
- **One question per screen** is enforced by the router: each `[qid].tsx` renders exactly one `QuestionShell` with one input. Consultation flow CTAs use `PremiumButton variant="warm"` on all the right surfaces (condition detail Start, questionnaire entry, question shell Next, review Submit, plan-ready "Choose your plan", plan-selection "Continue to payment", payment Pay button). A few CTAs on terminal screens miss the warm variant — see I-2 below.
- **Pre-tasks were real.** The convex-test harness was not a paper exercise: `convex/__tests__/auth.test.ts` adds 6 tests covering OTP lockout, expiry, dev bypass (two cases), `finalizeSignIn` idempotency, and `signOut` session deletion. The second dev-bypass test intentionally locks in the current NODE_ENV-ungated behavior so the follow-up fix (already in `docs/DEFERRED.md`) flips it red. This is the right pattern. Auth polish shipped the missing wordmark, the multi-step back nav, the 18+ DOB enforcement (client + server, shared `computeAgeYears` in `@onlyou/core/validators/age`), the resend-interval fix, and the OtpBoxes `resetSignal`. CRO pass produced copy and layout tweaks on all four auth screens.
- **Fixture layer is typed end-to-end.** `FixtureUser` now has seven typed slices (consultations, prescriptions, orders, deliveries, conversations, subscriptions, plus the base user). Each of the four scenario users is populated with state-consistent data. No `any` leaks.
- **Questionnaire store is minimal and correct.** `useQuestionnaireStore` holds `{ condition, answers, photoUris }` + `start/setAnswer/getAnswer/setPhotoUri/reset`. Exactly the Zustand shape the plan called for — no over-engineering.
- **No scope creep into Plan 2D.** No profile sub-screens, no lab booking, no Visual Biomarker Report components, no real Razorpay. The payment screen explicitly mocks a 1.5s setTimeout then routes to subscription-confirmed — correct for 2C.
- **Dev-only coupling is localized and commented.** `subscription-confirmed.tsx` imports `useDevScenarioStore` and flips the scenario to `"active"` on tap so the Home tab reflects the new state — architecturally leaky (dev store reached from production code), but the scope rule "fixtures for everything except auth" makes this the simplest thing that works and the comment is explicit. Revisit when real Convex subscriptions land in Plan 3.

**Concerns (none blocking merge):** a few consultation-flow CTAs missed the warm variant, the payment screen displays a hardcoded "₹2,299" total regardless of the plan selected one screen earlier, plan-ready.tsx bakes hair-loss-specific "What to expect" bullets into a generic screen, and the Sanjana (PCOS active) fixture contradicts the `availableInPhase2: false` flag on PCOS — the Explore grid will show PCOS as "Coming soon" for a user who is actively subscribed to it. Everything else is hygiene.

No design-token violations. No new security issues. The `docs/DEFERRED.md` ledger was updated (one new entry for the dev-OTP-bypass NODE_ENV gate, carried forward to Plan 3) and the Phase 2B review deferrals (CRO pass, convex-test harness, 18+ DOB enforcement, OTP resend timer fix, OtpBoxes reset on failure) were all closed in this phase.

---

## Findings

### Critical

_None._

### Important

**I-1 — Payment screen displays hardcoded ₹2,299 total regardless of plan selection**
File: `D:/onlyou2-phase-2c/apps/mobile/app/treatment/payment.tsx:97-106,122`

```tsx
<Row label="Quarterly plan" value="₹2,499" />
<Row label="Wallet credit" value="−₹200" />
...
<Row label="Total" value="₹2,299" bold />
...
<PremiumButton variant="warm" label={processing ? "Processing…" : "Pay ₹2,299"} ... />
```

The previous screen (`plan-selection.tsx`) lets the user pick monthly / quarterly / six-month and computes prices from `VERTICALS[consultation.vertical].pricing` — but the payment screen reads none of that. It always shows "Quarterly plan ₹2,499" and "Pay ₹2,299", so:

1. A user who picked **Monthly** or **6-month** on plan-selection sees a total that silently contradicts their selection. That is the single most brand-damaging bug in the whole phase for a "trust me with your money" telehealth app.
2. A user subscribed to **ED** (₹1,499/mo) or any vertical other than hair-loss quarterly also sees the wrong number.
3. The "Wallet credit −₹200" is fabricated — there is no wallet in this phase.

Plan-selection doesn't pass the picked plan to payment (`router.push("/treatment/payment")` with no params) and there is no shared treatment store, so payment has no way to know what was picked. Two options:

- **Minimum fix (5 min, matches scope rule):** pass the plan via query params and compute the display values from `VERTICALS[vertical].pricing` in payment.tsx. Drop the wallet credit row entirely — no wallet exists yet, and inventing one makes the UI dishonest in a way the founder walkthrough will notice.
- **Cleaner:** add a tiny `useTreatmentStore` (zustand) mirroring the questionnaire store pattern, with `{ vertical, planId }` set from plan-selection and read from payment. Probably Plan 3 work once real Convex draft subscriptions land.

Recommend the minimum fix for now. This is the worst-of-Phase-2C — fix it before the founder walkthrough.

**I-2 — Consultation-flow terminal CTAs are missing `variant="warm"`**
Files:

- `D:/onlyou2-phase-2c/apps/mobile/app/treatment/confirmation.tsx:65-68` — "Back to home" uses default variant
- `D:/onlyou2-phase-2c/apps/mobile/app/treatment/subscription-confirmed.tsx:74` — "Go to home" uses default variant
- `D:/onlyou2-phase-2c/apps/mobile/app/photo-upload/camera.tsx:68` — "Capture" uses default variant

`CLAUDE.md` rule: "Consultation flow CTAs use `accentWarm` (#C4956B), not `primary` (#141414)." Every other CTA inside `app/treatment/` and `app/questionnaire/` correctly passes `variant="warm"`; these three are the exceptions. Confirmation and subscription-confirmed are literal consultation terminals — the founder sees them as the bookends of the whole journey, so a black CTA after six warm-CTA screens reads as a visual regression. The camera "Capture" button is inside the photo-upload modal stack that was itself spawned from a warm-CTA question, so the same rule applies.

**Fix:** add `variant="warm"` to the three `<PremiumButton>` call sites. Three one-line edits.

**I-3 — Sanjana (PCOS active) fixture contradicts `availableInPhase2: false` on PCOS**
Files:

- `D:/onlyou2-phase-2c/apps/mobile/src/fixtures/patient-states.ts:232-339` — Sanjana's entire fixture is PCOS
- `D:/onlyou2-phase-2c/apps/mobile/src/fixtures/verticals.ts:82-96` — PCOS `availableInPhase2: false`
- `D:/onlyou2-phase-2c/apps/mobile/src/components/explore/ConditionCard.tsx:12-61` — shows `isActive` ring + dimmed 0.55 opacity + non-pressable when `!available && isActive`

Consequence: if the founder flips to the "active" scenario and taps the Explore tab, they see a PCOS card labelled "Active" but dimmed at 0.55 opacity, non-pressable, with the action affordance showing "—" instead of "Start →". Tapping it does nothing — a patient on an active subscription cannot access their own condition detail page. If she taps Home, it works fine (Home reads from the consultations/prescriptions/subscriptions slices directly, not through `VERTICALS.availableInPhase2`).

**Root cause:** the active-state fixture was built to showcase a medication reminder and delivery tracker, and PCOS was picked arbitrarily for variety. The plan's intent was that only Hair Loss and ED get "real" condition detail pages in Phase 2C (`availableInPhase2: true`), so the active fixture should be on one of those verticals.

**Fix (pick one):**

1. **Simplest:** change Sanjana's fixture to Hair Loss (re-use Priya/Rahul's doctor name, diagnosis, meds). One file, no code changes elsewhere. Keeps the "active female patient" demographic, which matters because the triple-tap scenario switcher should cover gendered vertical availability in the Explore tab.
2. Switch Sanjana to Hair Loss **female** — but hair-loss female is explicitly blocked in the questionnaire entry screen (`questionnaire/[condition]/index.tsx:19-22`: `hairLossFemaleBlocked`), which would make the fixture state impossible to reach from the questionnaire flow. Avoid.
3. Switch Sanjana to ED — also a problem because ED is male-only (`availableFor: ["male", "other"]`), and changing her gender breaks the "female active patient" demographic.
4. Flip PCOS to `availableInPhase2: true` and write "Coming soon" teaser content inside `[condition].tsx` — more surface area, contradicts plan scope.
5. Change Sanjana to a **male** Hair Loss active patient (rename + re-gender) — clean, loses the female representation in the active state.

**Recommend fix 1 with a rename: make Sanjana a male Hair Loss active patient (e.g. "Aditya Rao") OR keep her female and give her a Weight plan — but Weight is also `availableInPhase2: false`.** The cleanest single-file fix is re-assign Sanjana's consultation/prescription/order/subscription slices to Hair Loss and keep her female; note that "Active" will now render as a female hair-loss patient even though the questionnaire itself is currently gender-blocked for women. The gender-block is for the _entry_ flow only; the active fixture bypasses the entry flow entirely, so it's internally consistent. This also doubles as a good reminder to the founder that female hair-loss is a real market we're deliberately blocking at this stage.

Whatever choice is made, fix this before the walkthrough. The current state is the only place in Phase 2C where a user can reach an inconsistent / dead-end UI state on the happy path.

**I-4 — `plan-ready.tsx` "What to expect" bullets are hardcoded hair-loss copy**
File: `D:/onlyou2-phase-2c/apps/mobile/app/treatment/plan-ready.tsx:119-144`

```tsx
<SectionHeader>What to expect</SectionHeader>
<Text ...>· Reduced shedding in 1–3 months</Text>
<Text ...>· Visible improvement in 3–6 months</Text>
<Text ...>· Unlimited messaging with your doctor during treatment</Text>
```

The first two bullets are hair-loss specific. The current fixture only shows this screen for Rahul (hair loss ready), so the error is latent — but the ED real-data fixture also exists and the plan's intent is that every vertical with `availableInPhase2: true` can reach plan-ready. If the founder ever pushes the ED fixture through the full journey (via the scenario switcher) they'll see "reduced shedding in 1–3 months" on an ED plan.

**Fix:** Either (a) move the vertical-specific bullets into `VERTICALS[vertical].expectations: string[]` and render from the map, or (b) drop the vertical-specific bullets entirely and keep only the generic "Unlimited messaging with your doctor during treatment" + one more generic bullet ("Your first kit ships within 48 hours of payment" is generic and true for all verticals). Option (b) is the stay-in-scope choice; option (a) is correct for Plan 3 when real per-vertical content lands.

Recommend (b) for the fix pass.

**I-5 — `plan-ready.tsx` also hardcodes the medication emoji "💊"**
File: `D:/onlyou2-phase-2c/apps/mobile/app/treatment/plan-ready.tsx:105`

Cosmetic — minor — but the Clinical Luxe aesthetic avoids emoji decoration on clinical surfaces (`docs/VISUAL_DIRECTION.md` §1 calls for "no decorative emoji on clinical surfaces; restrict emoji to success/confirmation beats"). Confirmation (`✓`) and subscription-confirmed (`🎉`) are OK per that rule; the medication-list pill emoji in plan-ready is not. The photo-upload container's `📷` and `✓` are similar borderline cases but are inside a dev-phase modal stack and the founder will read them as placeholders, not decoration.

**Fix:** remove the `💊` prefix from the `plan-ready.tsx` medication list item. Keep the text.

### Suggestions

**S-1 — Spacing token `spacing.horizontal` is never imported; every screen uses literal `24`**
Files: every screen in `app/(tabs)`, `app/questionnaire`, `app/treatment`, `app/photo-upload`

`CLAUDE.md` rule: "24px horizontal padding (`spacing.horizontal`) on every screen." A grep across `apps/mobile` finds zero imports from `@onlyou/core/tokens/spacing` in the new Phase 2C files. Every screen hardcodes `paddingHorizontal: 24`. Phase 2B did the same thing, so this is pre-existing drift, not Phase 2C regression — but Phase 2C was a chance to correct it and it was missed. Consequence: if `spacing.horizontal` ever needs to change (e.g. for tablet), every screen must be hand-edited.

**Fix (later, not in this phase):** add a Phase 2D task-0 housekeeping commit that replaces every literal `24` passed to `paddingHorizontal` with an import from the spacing token. Not worth doing in the 2C fix pass — it would touch every new screen and inflate the diff.

**S-2 — `questionnaire/[qid].tsx` `useEffect` can clobber `answers` on back-navigation between conditions**
File: `D:/onlyou2-phase-2c/apps/mobile/app/questionnaire/[condition]/[qid].tsx:32-36`

```ts
useEffect(() => {
  if (storedCondition !== condition) {
    start(condition);
  }
}, [condition, storedCondition, start]);
```

If a user starts a Hair Loss questionnaire (store `condition = "hair-loss"`), navigates back via the modal X, enters ED from explore, then navigates back to Hair Loss and enters that questionnaire again — the `start(condition)` call wipes `answers: {}`, which is correct semantically (we want a fresh start). But the same `useEffect` also runs on the _first question screen mount_, before the user has answered anything, and for the _second_ condition the initial `existing = answers[qid]` read on line 29 happens _before_ the effect runs `start()`. If a user hits back inside a single condition's flow and re-enters a question, `existing` will still be undefined on re-mount because the store is already correct. In practice nothing breaks — but the init-from-`existing` code path and the init-from-reset code path are subtly coupled and an edit here would be fragile. Flag for awareness.

**Fix:** not urgent. If you touch this file for I-1/I-2 anyway, consider using a layout-level effect that calls `start(condition)` once per condition entry, in `questionnaire/[condition]/index.tsx`, rather than in every `[qid].tsx` mount. Single source of truth for questionnaire session reset.

**S-3 — `photo-upload/[condition].tsx` uses `router.dismissAll()` then `router.push(review)`**
File: `D:/onlyou2-phase-2c/apps/mobile/app/photo-upload/[condition].tsx:23-31`

```ts
function onDone() {
  router.dismissAll();
  if (condition) {
    router.push(`/questionnaire/${condition}/review`);
  }
}
```

This works in Expo Router 3.x because `dismissAll` pops to the tab root, then `push` mounts the review modal on top. But the order is fragile — if Expo Router changes `dismissAll` to await animations, the push may race. The review screen's `onSubmit` does the same dance (`dismissAll()` → `router.push("/treatment/confirmation")`). Both work today. A more robust pattern would be `router.replace("/questionnaire/<cond>/review")` from inside the photo modal, keeping a single modal stack. Not urgent.

**S-4 — `subscription-confirmed.tsx` reaches into `useDevScenarioStore` from production code**
File: `D:/onlyou2-phase-2c/apps/mobile/app/treatment/subscription-confirmed.tsx:11,16`

Already noted in the Summary. The comment correctly calls out "Dev affordance", but the import is not `__DEV__`-guarded and the store is not eliminated in release builds. In Phase 3 when real Convex subscriptions land, this store read needs to become a Convex mutation call. Acceptable for Phase 2C (fixture-driven by design). Add a `// TODO(phase-3): replace with real Convex subscription mutation` if you're touching this file during the fix pass.

**S-5 — `camera.tsx` is a simulated camera but claims to "fake a capture by writing a mock file URI"**
File: `D:/onlyou2-phase-2c/apps/mobile/app/photo-upload/camera.tsx:9-14,20-26`

The screen works and the mock URI round-trips through the store correctly. Two minor issues:

1. On the founder walkthrough the "Capture" button is a black (primary) CTA on a black background — the button is the `PremiumButton` default variant, so its background is `colors.textPrimary` (`#141414`), and the screen `backgroundColor` is also `colors.textPrimary`. The button is probably rendered with a white label on a 1px ring, which works, but the contrast is weak. See I-2 for the warm-variant fix; on a dark background, warm gold has much better visual weight.
2. `PHOTOS_BY_CONDITION` in the container (`app/photo-upload/[condition].tsx:10-13`) lists Hair Loss slots ("Top of head", "Hairline", "Crown", "Problem areas") and Weight slots ("Full body front", "Full body side") — but Weight is `availableInPhase2: false` and unreachable from the current flow. Dead branch. Fine to keep as forward-wiring; not dead code in the strict sense because the plan will use it in Plan 3+.

**S-6 — `activity/[orderId].tsx` display has `order.id` in the title**
File: `D:/onlyou2-phase-2c/apps/mobile/app/(tabs)/activity/[orderId].tsx:47`

```tsx
<Text ...>Order {order.id}</Text>
```

`order.id` is a fixture string like `"o-rahul-1"`. The founder will see "Order o-rahul-1" in a Playfair Black 28pt headline. Fix: either render the last 8 chars of a hashed/truncated id or switch to a human label like "Your Hair Loss order" + smaller id underneath. Cosmetic but visible on the walkthrough.

**S-7 — `messages/[conversationId].tsx` renders a disabled `PremiumInput` as the "chat input"**
File: `D:/onlyou2-phase-2c/apps/mobile/app/(tabs)/messages/[conversationId].tsx:96-110`

The chat input is `<PremiumInput label="Message your doctor" editable={false} />` with a "Coming soon" caption underneath. The `PremiumInput` is a floating-label text field designed for auth forms; pressing on a disabled input doesn't give a clear affordance that it's disabled — it just doesn't open the keyboard. A cleaner pattern is a dedicated `<DisabledChatInputAffordance>` row with a lock icon and the "Coming soon — direct chat with your doctor" copy _as the primary label_, not as a helper underneath. Not blocking; revisit when real chat lands in Plan 3 tail.

**S-8 — `plan-ready.tsx` is fed by `usePatientState()` instead of a navigation param**
File: `D:/onlyou2-phase-2c/apps/mobile/app/treatment/plan-ready.tsx:11-13`

```ts
const user = usePatientState();
const consultation = user.consultations[0];
const prescription = user.prescriptions[0];
```

The screen implicitly assumes there is exactly one consultation and one prescription on the active user. This works for the fixtures but will break the day a patient has two verticals. The plan called for the consultation ID to thread through as a URL param (`/treatment/plan-ready?consultationId=X`), but the implementation took the shortcut of reading `[0]`. Plan 3 will need to retrofit this. Flag; not urgent.

**S-9 — `useDevScenarioStore` import trail is cross-layer**
File: `D:/onlyou2-phase-2c/apps/mobile/app/treatment/subscription-confirmed.tsx:6`

Same as S-4 — a production screen reaches into a dev store. If anyone greps for `useDevScenarioStore` in Plan 3 and doesn't read the comment, they'll assume this is allowed elsewhere. Add a one-line ESLint restrictedImports rule for `useDevScenarioStore` with the only allowlisted file being the profile scenario switcher + this terminal screen. Nitpick.

**S-10 — `confirmation.tsx` and `subscription-confirmed.tsx` both use `insets.top + 80` instead of a named top-padding token**
Files:

- `D:/onlyou2-phase-2c/apps/mobile/app/treatment/confirmation.tsx:16`
- `D:/onlyou2-phase-2c/apps/mobile/app/treatment/subscription-confirmed.tsx:25`

Literal `80`. Same family of "tokens not wired up" as S-1. Fine for now, fix in the spacing-token housekeeping pass.

**S-11 — Check: `treatment/plan-selection.tsx` stores the selected plan in local state only**
File: `D:/onlyou2-phase-2c/apps/mobile/app/treatment/plan-selection.tsx:17`

`useState<PlanId>("quarterly")` — the selection is lost the instant `router.push("/treatment/payment")` fires, which is the root of I-1. Not a separate suggestion, just an observation: once I-1 is fixed, remember to actually propagate the state.

**S-12 — `convex/auth` tests skip NODE_ENV gating on dev bypass**
File: `D:/onlyou2-phase-2c/convex/__tests__/auth.test.ts:97-117`

The test intentionally locks in the currently-wrong behavior (`works regardless of NODE_ENV`). This is excellent — it is exactly the TDD "lock in current behavior, break it red when fixing" pattern the `test-driven-development` skill calls for, _and_ the DEFERRED entry references this test by name. Zero action; calling out as a positive example for the fix-pass reviewer so nobody "fixes" the test by mistake before the NODE_ENV gate lands.

**S-13 — Trivial-render test check**
I spot-checked tests for `home/index.tsx`, `explore/[condition].tsx`, `questionnaire/[qid].tsx`, `photo-upload/container.tsx`, `treatment/payment.tsx`, `treatment/plan-ready.tsx`, `treatment/subscription-confirmed.tsx`, `messages/[conversationId].tsx`, and `activity/[orderId].tsx`. All of them assert meaningful text _and_ exercise at least one `fireEvent.press` → `router.push`/`replace` path. Nothing is trivial-render-only. The activity index test (`42` lines) and messages index test (`42` lines) are the thinnest, but they're thin because the screens themselves are lists — they still assert that the rendered rows come from the fixture layer rather than a hard-coded constant. OK.

**S-14 — Lint warnings**
File: `D:/onlyou2-phase-2c/apps/mobile/__tests__/components/questionnaire/question-shell.test.tsx:2,15`

Two `import/order` warnings on the question-shell test. Trivial: the `expo-router` import should move above `react-native`, and there's a stray blank line in an import group. Fix: one `pnpm --filter @onlyou/mobile lint --fix` pass.

### Observation

**O-1 — Pre-task ordering and commit hygiene are exemplary**
The three pre-tasks (vitest harness, auth polish, CRO pass) land in a clean, small, sequential series of commits before Task 1 begins. Each plan task is one commit with a `feat(phase-2c/NN)` prefix, the type identifier matches the task number, and the commit messages are scoped tightly to the files they touch. This is the cleanest-reading phase branch of the project so far — makes the reviewer's job much easier and gives the founder a good "what changed tonight" story. Keep this pattern.

**O-2 — The `checkpoint.md` diff in this branch is 301 lines rewritten**
File: `D:/onlyou2-phase-2c/checkpoint.md`

Not reviewed in depth (out of scope for a code review), but noting that the checkpoint was rewritten rather than appended. That's normal practice in this project but worth flagging for the `finishing-a-development-branch` skill's merge-prep step — make sure the rewritten content preserves the Phase 2A/2B history notes rather than overwriting them.

**O-3 — Vitest config is a single workspace-root file**
File: `D:/onlyou2-phase-2c/vitest.config.ts`

The comment explaining the `oxc.tsconfig: false` workaround is thoughtful and self-documenting. When Plan 3 adds more convex test surface area, this config will continue to work. Good forward-investment.

**O-4 — DEFERRED.md was updated at Task 0 as the rules require**
The review-deferral for the dev-OTP-bypass NODE_ENV gate was added to `docs/DEFERRED.md` under "Phase 2B review deferrals" with a clear destination (Plan 3) and a reference to the new test. All other Phase 2B review deferrals that landed in this phase were either closed in commits or carried forward with strikethrough markers. Rule 9 compliance is solid.

---

## Spec / plan compliance matrix

| Deliverable                                                     | Plan task | Status                                       |
| --------------------------------------------------------------- | --------- | -------------------------------------------- |
| Pre-task A: vitest + convex-test harness + 5 auth tests         | Pre-task  | ✅                                           |
| Pre-task B: auth polish (wordmark, back-nav, 18+, OTP timer)    | Pre-task  | ✅                                           |
| Pre-task C: CRO pass on welcome/phone-verify/otp/profile-setup  | Pre-task  | ✅                                           |
| Worktree + DEFERRED review + prereq check                       | Task 0    | ✅                                           |
| Extend `FixtureUser` with 6 slices, 4 scenarios populated       | Task 1    | ✅ (see I-3)                                 |
| 5-vertical metadata + gender filter + `visibleFor()`            | Task 2    | ✅                                           |
| 5 home state-aware components                                   | Task 3    | ✅                                           |
| Home tab 4-state rendering                                      | Task 4    | ✅                                           |
| Home tracking detail stepper                                    | Task 5    | ✅                                           |
| Explore grid + ConditionCard + gender filter                    | Task 6    | ⚠️ See I-3 — active+!available contradiction |
| Condition detail (Hair Loss + ED real; teasers for 3)           | Task 7    | ✅                                           |
| Stub questionnaire data (hair-loss + ed)                        | Task 8    | ✅                                           |
| Questionnaire shell components (ProgressCounter / Shell / Card) | Task 9    | ✅                                           |
| Questionnaire modal stack layout                                | Task 10   | ✅                                           |
| Questionnaire entry screen + gender branch                      | Task 11   | ✅                                           |
| Per-question screen + questionnaire store                       | Task 12   | ✅ (see S-2)                                 |
| Questionnaire review + submit                                   | Task 13   | ✅                                           |
| Photo upload modal stack + rewire questionnaire photo branch    | Task 14   | ✅ (see S-3)                                 |
| Treatment stack layout + confirmation                           | Task 15   | ✅ (see I-2)                                 |
| Plan-ready                                                      | Task 16   | ⚠️ I-4, I-5, S-8                             |
| Plan-selection                                                  | Task 17   | ✅                                           |
| Payment (mocked Razorpay)                                       | Task 18   | ⚠️ I-1 (hardcoded total)                     |
| Subscription-confirmed                                          | Task 19   | ⚠️ I-2 (CTA variant), S-4 (dev store)        |
| Activity tab index + detail stepper                             | Task 20   | ✅ (see S-6)                                 |
| Messages tab list + read-only chat                              | Task 21   | ✅ (see S-7)                                 |
| Checkpoint update + merge prep                                  | Task 22   | ⏳ per review protocol                       |

**Test coverage:** 44 mobile suites / 135 mobile tests. 3 convex suites / 10 convex tests. All green. See S-13 for the trivial-render check.

---

## Deviations from the plan worth recording

1. **Plan-ready screen is fed by `usePatientState()[0]` instead of a routed `consultationId` param.** The plan text at Task 16 expected a URL parameter so Plan 3 could deep-link. Implementation took the shortcut. See S-8. Recommend a DEFERRED entry for Plan 3 to add the param threading when real Convex consultations land.
2. **Payment screen does not receive the selected plan from plan-selection.** Plan text at Task 18 expected the `planId` to thread through (plan lines ~3500 per my earlier read of the spec skeleton). Implementation hardcoded "Quarterly ₹2,299". See I-1.
3. **Sanjana's active-state fixture is PCOS, not Hair Loss or ED.** The plan said "Hair Loss + ED real, teasers for the rest" but did not explicitly constrain the fixture scenarios to the real verticals. This drift was latent in the plan itself. See I-3 for the fix and add a line to the Task 1 template for the next writing-plans session: "active-state fixtures MUST be on a vertical with `availableInPhase2: true`".
4. **`subscription-confirmed.tsx` calls `useDevScenarioStore.setScenario("active")` from production code.** Plan text did not spell out how the screen transitions from ready → active; the implementer chose a dev-store flip. Acceptable for Phase 2C scope rule but is a known Plan 3 rewrite. See S-4, S-9.
5. **`plan-ready.tsx` "What to expect" bullets hard-code hair-loss copy.** Plan text at Task 16 showed example bullets drawn from hair-loss; the implementer transcribed them verbatim. Drift that the fix pass should resolve. See I-4.
6. **`PHOTOS_BY_CONDITION` contains slots for Weight** even though Weight is `availableInPhase2: false`. See S-5. Forward-wiring, not dead code — acceptable.
7. **`spacing.horizontal` token is defined in `packages/core/src/tokens/spacing.ts` but is never imported by any Phase 2C screen.** Pre-existing drift from Phase 2B. See S-1. Housekeeping for Plan 2D.

---

## Recommendations before merge

1. **[Required]** Fix I-1: payment screen reads the selected plan + vertical pricing from `plan-selection`. Pass plan + vertical via query params (or local zustand) and compute values from `VERTICALS[vertical].pricing`. Drop the invented "Wallet credit" row. Update the payment test to cover at least two plans. Commit as `fix(phase-2c/18): payment reads selected plan + vertical pricing`.
2. **[Required]** Fix I-2: add `variant="warm"` to the CTAs on `treatment/confirmation.tsx`, `treatment/subscription-confirmed.tsx`, and `photo-upload/camera.tsx`. Commit as `fix(phase-2c): warm variant on consultation terminal CTAs`.
3. **[Required]** Fix I-3: reassign Sanjana's fixture to Hair Loss (or swap her gender and switch to ED) so the "active" scenario's vertical has `availableInPhase2: true`. Re-run `pnpm --filter @onlyou/mobile test` — the home tests that hit `usePatientState("active")` may reference PCOS-specific strings. Commit as `fix(phase-2c/1): active-state fixture on available vertical`.
4. **[Required]** Fix I-4: drop the hair-loss-specific "reduced shedding" and "visible improvement" bullets from `plan-ready.tsx`; keep a vertical-agnostic bullet list (messaging + kit ships in 48h). Update the plan-ready test accordingly. Commit as `fix(phase-2c/16): generic plan-ready expectations copy`.
5. **[Required]** Fix I-5: remove the `💊` emoji from the medication list item in `plan-ready.tsx`. One-line edit. Fold into the I-4 commit.
6. **[Required]** Fix S-14: run `pnpm --filter @onlyou/mobile lint --fix` to clear the two `import/order` warnings on `question-shell.test.tsx`. Fold into the I-4 commit or its own `chore(phase-2c): lint --fix`.
7. **[Recommended]** Open a DEFERRED entry for: (a) payment/treatment store for real plan threading in Plan 3; (b) `plan-ready` consultationId param threading; (c) `subscription-confirmed` dev-store-flip → real Convex mutation swap; (d) spacing token housekeeping pass. Rule 9 compliance.
8. **[Then]** Update `checkpoint.md` with the Phase 2C completion block (Task 22) and commit.

## Recommendations for the plan process

1. **Spec cross-check on fixture / feature-flag consistency.** The Sanjana + PCOS contradiction (I-3) was a plan-authoring gap — the plan for Task 1 and the plan for Task 2 independently made choices that don't compose. The `writing-plans` skill could add a pre-commit check: "does every fixture state reach a screen that will render it correctly?" A one-page table at the top of any multi-fixture plan would catch this.
2. **CTA-variant enforcement as a lint rule.** `PremiumButton` is used ~25 times in Phase 2C; 3 of them are on consultation-flow terminals with the wrong variant (I-2). A repo-level ESLint custom rule — "inside `app/treatment/**`, `app/questionnaire/**`, `app/photo-upload/**`, `PremiumButton` must have `variant="warm"`" — would catch this mechanically and remove the reviewer burden. Add to Phase 2D housekeeping.
3. **State-threading in the plan text.** Task 18 (payment) and Task 17 (plan-selection) are adjacent screens, but the plan text for Task 18 did not specify how `planId` reaches Task 18 from Task 17. I-1 is the direct consequence. Future multi-screen flows should have an explicit "state routed between screens" section in the plan.
4. **Lock in the `spacing.horizontal` import convention during Phase 2D Task 0.** S-1 has now drifted across two phases. One dedicated housekeeping commit + a custom ESLint rule (`prefer-spacing-token`) would freeze the convention.

---

## Verdict

**APPROVE-WITH-FIXES.**

No blockers. Five required fixes, all mechanical, all < 15 minutes each:

1. Payment reads the selected plan + vertical pricing (I-1)
2. Warm CTA variant on confirmation, subscription-confirmed, camera (I-2)
3. Active-state fixture moves off PCOS (I-3)
4. Plan-ready bullets become vertical-agnostic (I-4)
5. Remove the `💊` emoji in plan-ready (I-5)

Plus a `lint --fix` on the one questionnaire test (S-14) and four new DEFERRED entries. Then checkpoint update → merge.

The phase is structurally excellent. The fixture layer is typed end-to-end, the questionnaire engine is minimal and correct, the consultation flow reads naturally, the design tokens are respected, and the test coverage is thorough. The pre-task work (convex-test harness + auth polish + CRO pass) closes every important deferral from the Phase 2B review. 35 commits, 6,300 LOC, zero lint errors, zero type errors, 145/145 tests across both runners.

The five fixes I'm asking for are the difference between a good internal build and a founder walkthrough that doesn't make anyone wince. The hardcoded ₹2,299 on payment is the one that genuinely matters — a telehealth app cannot show the user a total that contradicts the plan they just picked, even in a mocked phase. Fix that first.

Manual boot verification (iOS/Android/Expo Go, the `active` scenario at minimum) is a required step not performed in this review environment — it remains on the implementer's checklist before merge, and the five fixes above should be verified on device before the checkpoint update.

No design-token violations. Lint clean (mobile). Typecheck clean (mobile). 135/135 mobile suites green. 10/10 convex tests green. DEFERRED ledger updated. CLAUDE.md rules honored. The phase is ready for the fix pass → founder walkthrough → merge.
