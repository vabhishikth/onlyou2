# Phase 3 — decomposition + scope decisions

**Date:** 2026-04-24
**Context:** Brainstorm session at start of Phase 3 (Hair Loss end-to-end), after Phase 2.5E merged at `cf88ce5`.
**Spec:** [[../superpowers/specs/2026-04-24-phase-3-hair-loss-e2e-design]]

This note locks the architectural decisions taken during the Phase 3 brainstorm. The spec file captures the full design; this note is the decision register entry for future phases to reference.

---

## D1 · Phase 3 decomposes into six mergeable sub-phases (3A–3F)

**Decision:** Six sub-phases, each with its own spec, plan, implementation, code review, and merge cycle. Founder approval gate after 3F, before Phase 4.

- **3A** — Pre-flight hardening (phone E.164, dev-OTP gate, Anthropic key rotation, PENDING_HASH filter, 45 DRAFT ranges sign-off).
- **3B** — Questionnaire content (28 HL questions) + real photo pipeline + `consultations` table with full 22-status enum + transition validator + social auth (Google + Apple).
- **3C** — AI pre-assessment (Option B — questionnaire only, no photos).
- **3D** — Doctor simulator (Convex dashboard mutations + CLI wrapper; no admin UI).
- **3E** — Treatment plan + Razorpay test mode + Gupshup real sender + 30-day expiry scheduler.
- **3F** — Orders + pharmacy auto-advance + active-treatment UI. Approval gate at end.

**Why:** A monolithic Phase 3 plan would span security, UX, AI, state-machine, payments, and ops in one unit — too large to execute well, review coherently, or roll back safely. Six mergeable units keep each review coherent and each merge independently revertable.

**Dependency chain is strict.** No sub-phase skips its predecessor. `3A → 3B → 3C → 3D → 3E → 3F → approval gate → Phase 4`.

---

## D2 · AI pre-assessment ships Option B; Option C deferred to Phase 8

**Decision:** 3C ships **Option B** — a single Claude API call that reads questionnaire answers only, produces `{narrative, stage, flags[], confidence}`. Photos are uploaded and stored in 3B, visible to the doctor-sim operator, but **not** analyzed by Claude in 3C. Option **C** (vision call on 4 scalp photos + `photoAnalysis` + `recommendedTemplateHint` + `redFlags`) is deferred to Phase 8.

**Why:**

- B is a single, cost-bounded, well-understood call. C multiplies cost (vision tokens), latency (multi-step), and failure modes.
- Vision-based template hints are wasted effort while 3D's doctor simulator is operator-driven — the operator picks the template manually from a CLI flag or dashboard dropdown (see **D3**).
- Richer automated triage earns its keep only once the real doctor portal (Phase 4) is surfacing the output and patient volume justifies the cost.

**Forward-compat guarantee:** `ai_assessments` schema ships with **optional** `photoAnalysis`, `recommendedTemplateHint`, `redFlags` fields in 3C. Option C upgrade is additive — no migration required at Phase 8. Keep the 3C output JSON schema compatible with the C-upgraded schema from day one.

**Audit trail:** `docs/DEFERRED.md` Phase 3 section + Phase 8 section carry matching entries.

---

## D3 · Doctor simulator is CLI + Convex dashboard mutations — no admin UI

**Decision:** 3D does not build an admin-portal surface. Instead:

1. **Convex internal mutations** (`simulateDoctor.startReview`, `.requestMoreInfo`, `.prescribe`, `.decline`, `.refer`, `.orderLab`) — callable from the Convex dashboard during live demos.
2. **CLI wrapper** at `scripts/doctor-sim.ts` that calls the same mutations headlessly for E2E tests.

**Why:** An admin-portal page would partially duplicate work that Phase 4 (doctor portal) replaces wholesale. The CLI + dashboard combo carries zero UI debt into Phase 4. The CLI is retained for E2E tests even after the real portal ships, keeping integration tests deterministic.

**Boundary to Phase 4:** Phase 4 replaces the dashboard mutations with a real doctor portal backed by the same underlying `prescribe` / `decline` / `refer` mutation signatures. Test suite keeps calling the CLI — unchanged.

---

## D4 · Template selection in 3D is operator-driven — no auto-recommendation

**Decision:** Prescription-template selection in 3D is an explicit input to `simulateDoctor.prescribe(consultationId, templateId, meds[], doctorNotes)`. The server does **not** auto-recommend a template based on `ai_assessments.flags`, photo-derived fields, or any heuristic.

**Why:**

- 3C (Option B) does not analyze photos, so any photo-driven auto-recommendation would depend on a capability 3C doesn't ship.
- Keeping 3D independent of 3C's content means 3D is still valid even if AI flags are empty or unexpected.
- Auto-recommendation belongs with AI Option C (Phase 8) where vision analysis produces `recommendedTemplateHint`. When that ships, the doctor portal UI can surface the hint as advisory — the operator still picks.

**Hidden-dependency check passed:** A reviewer asked whether 3D templates lean on photo-derived stage data. Answer: they do not. Templates are operator-picked by ID, medications are the template's fixed payload. Photos are visible to the operator (human context) but never consumed programmatically by 3D.

---

## D5 · Razorpay in 3E is test mode only; live-key flip at Phase 8

**Decision:** 3E wires Razorpay end-to-end using test-mode keys. Live keys (`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` swapped to live values) flip at Phase 8 launch polish.

**Why:**

- E2E test suites must not burn real money on each CI run.
- Founder demos in 3F run dozens of times — test cards keep cost at zero.
- Webhook signing secrets differ between test and live; ensuring the signature-verify path works on test before real money reduces risk at launch.
- The founder already has a Razorpay Business account, so KYC is not a blocker. The flip is a one-env-var change, not a sub-phase.

**Forward-compat:** Same webhook handler code runs in both modes. Only the signing secret changes.

---

## D6 · Pharmacy auto-advance scheduler gated behind `PHARMACY_AUTO_ADVANCE` feature flag

**Decision:** 3F drives `PHARMACY_PROCESSING → DISPATCHED → DELIVERED → TREATMENT_ACTIVE` through a Convex scheduler chain (short delays in dev/staging) gated behind the `PHARMACY_AUTO_ADVANCE` feature flag. The pharmacy event interface (`pharmacyEvents.dispatched`, `pharmacyEvents.delivered`) is a stable surface — flag on = scheduler drives; flag off = real pharmacy partner drives (Phase 6).

**Why:**

- Founder demo needs the flow to progress without manual button-mashing between screens.
- CI tests need deterministic timing — CLI override (`scripts/pharmacy-sim.ts`) bypasses the scheduler.
- Phase 6 (pharmacy portal) swaps the implementation by flipping the flag off and wiring real pharmacy actions to the same event interface — no downstream consumer changes.

**Live-switch discipline (founder request):** Delay values are env-driven, not literal constants. The cut-over from mock to real pharmacy is a config change, not a code change.

---

## D7 · `consultations` table ships full 22-status enum + transition validator from 3B

**Decision:** 3B schema includes all 22 consultation statuses from [[../ONLYOU-SOURCE-OF-TRUTH]] §2, with `transitionStatus()` and `systemTransition()` validators wired in `convex/consultations/transitions.ts` before any sub-phase uses the unreachable statuses.

**Why:** Convex schema migrations are expensive. Shipping the full enum + validator once prevents drift between sub-phases and catches invalid transitions at the first write. The code cost is ~50 LOC; the risk of staged migrations across five future sub-phases is much higher.

---

## D8 · Deferred items rehomed to Phase 8

Three items previously destined for "Phase 3 tail" moved to Phase 8 during this brainstorm:

| Item                                                        | Previous destination | New destination | Why                                                                                                                                                                                                        |
| ----------------------------------------------------------- | -------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Subscription deep-management (cancel / pause / change-plan) | Phase 3 tail         | Phase 8         | Razorpay pause/cancel has mid-cycle refund edge cases per [[../ONLYOU-SOURCE-OF-TRUTH]] §18 worth their own pass. 3F ships read-only subscription state; founder approval gate clears without these flows. |
| `profile/wallet` (balance + transactions)                   | Phase 3 tail         | Phase 8         | Wallet is the refund destination per SOT §18. Phase 3 ships no refund flow, so wallet has nothing to display end-of-3F. Pairs with subscription deep-management.                                           |
| Razorpay live-key rotation + UPI Autopay cap handling       | —                    | Phase 8         | Captured for the first time during this brainstorm. Live flip + GLP-1 ₹15,000 cap workaround both belong at launch polish, not during functional wiring.                                                   |

All three entries carry **Why** and **How to apply** lines in [[../DEFERRED]] per CLAUDE.md rule 9.

---

## Cross-links

- [[../ONLYOU-SOURCE-OF-TRUTH]] — canonical status enum (§2), transition maps (§3), pricing (§5), SLAs (§7), privacy boundaries (§8), refund scenarios (§18).
- [[../VERTICAL-HAIR-LOSS]] — 28-Q questionnaire (§4), prescription templates (§8.1), pricing (§2).
- [[../DEFERRED]] — all items deferred during this brainstorm with destinations.
- [[2026-04-20-proceeding-on-draft-ranges]] — swap procedure for the 45 DRAFT ranges gating 3A.
- [[2026-04-24-phase-2.5e-as-built]] — predecessor retro; carries iOS-parity and seed-drift items forward into Phase 3.

---

## Change log

- **2026-04-24** — initial write at brainstorm close. Seven decisions locked; spec committed at `b969f27`.
