# Deferred Items — Running Ledger

Every feature, screen, or decision intentionally deferred during a phase lives here. Update during each phase's brainstorm AND execution — this is the single source of truth for "what did we intentionally not build yet."

Rules:

1. **Every deferral gets an entry here the moment we decide it.** Not in a checkpoint, not in chat — here.
2. **Every entry names a destination phase.** "Later" is not a valid destination.
3. **When a phase ships the deferred work, strike it through and append the commit or phase that closed it.**
4. **Phase brainstorms must review this file** before starting — catches forgotten commitments.

---

## Phase 1 — Monorepo scaffold + Convex + design system ✅ (shipped 2026-04-13)

### Visual polish deferred

Captured retroactively from `checkpoint.md` — these two slipped through the cracks and proved the point that a ledger is needed.

| Item                                                                 | Deferred to             | Why                                                                                                                           |
| -------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Card styling (currently minimal — borders only)                      | Phase 3 (Hair Loss)     | Real card visual language emerges when real Hair Loss condition cards are built; Phase 1 shipped deliberately-bare primitives |
| Input polish: floating labels, +91 country prefix, validation states | Phase 2 (patient shell) | Primary consumer is patient auth + profile-setup forms — build the pattern when the real forms need it                        |

---

## Phase 2 — Patient app shell (🔨 in progress, brainstorm stage)

### Route stubs — navigable but render "Coming in Phase X"

Every one of these screens exists as a real Expo Router route so `router.push()` from Phase 3+ never hits a dead target. They render a `<PlaceholderScreen phase="X" />` component.

| Screen                                                          | Deferred to                      | Why                                                    |
| --------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------ |
| `notifications/index` (push inbox)                              | Phase 8 (notifications + polish) | Push infrastructure not built; nothing real to list    |
| `profile/wallet` (balance + transactions)                       | Phase 3 (Hair Loss tail)         | No real transactions until first payment flows through |
| `profile/period-tracker`                                        | PCOS vertical phase              | PCOS isn't Phase 3's target vertical                   |
| `profile/legal` (terms, privacy, refund policy)                 | Phase 8 (launch polish)          | Static copy written at launch time                     |
| `profile/help` (in-app support chat)                            | Phase 8+                         | Support chat system doesn't exist yet                  |
| Subscription deep-management (pause, cancel, change plan flows) | Phase 3 tail                     | Needs a real subscription to manage                    |

### Features stubbed in Phase 2, wired real later

| Feature                                                                  | Deferred to                              | Why                                                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Razorpay real integration (webhook + verification)                       | Phase 3 (Hair Loss)                      | Phase 2 mocks the checkout sheet; real wiring happens when the first real payment flows |
| Per-vertical questionnaire _content_ (real questions, scales, branching) | Phase 3 + later vertical phases          | Phase 2 builds the engine only; real question sets ship with each vertical              |
| Hair Loss questionnaire content                                          | Phase 3 (Hair Loss)                      | Stub questions in Phase 2                                                               |
| ED questionnaire content                                                 | Phase 4 (ED vertical) — TBD              | Stub questions in Phase 2                                                               |
| PE / Weight / PCOS condition detail pages + questionnaires               | Their respective vertical phases         | Phase 2 shows them as "Coming Soon" teaser cards in Explore                             |
| Convex Auth custom Gupshup OTP provider                                  | (to be decided in Phase 2 brainstorm Q6) | See open questions below                                                                |

### Convex wiring deferred

| Item                                     | Deferred to | Why                                                                                        |
| ---------------------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| Explore grid reading real feature flags  | Phase 3     | Phase 2 uses a fixture constant; scope-rule is "auth is real, everything else is fixtures" |
| Real user subscription state from Convex | Phase 3     | Shell uses the dev scenario switcher instead                                               |
| Real Convex queries anywhere except auth | Phase 3+    | Fixture hook `usePatientState()` reads from a TS file                                      |

### Deferred for founder re-visit at Phase 2 approval gate

Things the founder should explicitly weigh in on before Phase 3 starts:

- _(none yet — populated as brainstorm continues)_

### Open brainstorm questions still to answer in Phase 2

- Testing strategy (nav smoke tests? typecheck-only? full stack?)
- Convex Auth custom Gupshup provider (build in Phase 2 or defer to Phase 3?)
- Deep-link handling (`onlyou://` scheme) — implement in Phase 2 or defer?
- Android/iOS parity — test on both in Phase 2 or iOS-first?

---

## Phase 3 — Hair Loss end-to-end

_(populated when Phase 3 brainstorm begins)_

---

## Phase 4+ — later phases

_(populated when each phase's brainstorm begins)_
