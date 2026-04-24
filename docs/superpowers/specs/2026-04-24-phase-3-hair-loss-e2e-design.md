# Phase 3 — Hair Loss End-to-End: Design Spec

**Date:** 2026-04-24
**Vertical:** Hair Loss (first real vertical)
**Preceded by:** Phase 2.5E (biomarker real-data join, merged cf88ce5)
**Followed by:** Phase 4 (doctor portal)
**Approval gate:** Yes — founder walkthrough at end of 3F before Phase 4 begins

This spec decomposes Phase 3 into **six mergeable sub-phases (3A–3F)**. Each sub-phase gets its own plan, implementation, code review, and merge cycle. The approval gate lives after 3F.

---

## 1. Why decompose

Phase 3 as a monolithic plan spans:

- Security hardening (phone normalization, dev-OTP gate, API key rotation, filter guards, clinical sign-off)
- Questionnaire content expansion (4 → 28 questions with skip logic) + real photo pipeline
- Real AI pipeline (first Claude API integration)
- Full consultation state machine (22 statuses) + doctor workflow simulator
- Razorpay integration (first real payment flow) + WhatsApp sender (first real patient notifications)
- Orders + pharmacy auto-advance + active-treatment UI

Any one of these is a meaningful chunk. Bundling them would produce a plan too large to execute well, review coherently, or roll back safely. Six sub-phases = six mergeable units, each passing through live E2E verification before merge.

---

## 2. Dependency graph

```
3A (hardening) ──► 3B (questionnaire + photos + consultations) ──► 3C (AI pre-assess)
                                                                       │
                                                                       ▼
                                      3D (doctor-sim mutations + CLI) ─┘
                                                 │
                                                 ▼
                                           3E (plan + Razorpay test + Gupshup)
                                                 │
                                                 ▼
                                           3F (orders + pharmacy auto + active UI)
                                                 │
                                                 ▼
                             APPROVAL GATE — founder demo (golden + DECLINE + MORE_INFO)
                                                 │
                                                 ▼
                                           Phase 4 (doctor portal)
```

Each arrow = hard dependency. No sub-phase skips its predecessor.

---

## 3. Sub-phase 3A — Pre-flight hardening

**Goal:** Every unblocker that must ship before Phase 3B accepts real users.

### 3A.1 Scope (ships)

| Item                                                                     | Why it blocks real users                                                                                                                                                                  |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone number E.164 normalization (helper + users.by_phone migration)     | `+91 99999 12345` vs `+919999912345` vs `9999912345` would currently produce 3 separate `users` rows, silently duplicating accounts the moment Gupshup (3E) sends E.164-formatted numbers |
| Dev-OTP bypass gated behind `NODE_ENV !== "production"`                  | `+91 99999 000XX` + `000000` currently short-circuits bcrypt compare in all environments — hardcoded backdoor in prod                                                                     |
| Rotate `ANTHROPIC_API_KEY` + verify access                               | Dev key leaked during Phase 2.5C; rotate before any real Claude call in 3C                                                                                                                |
| `PENDING_HASH_PREFIX` filter on all `lab_reports.by_user_hash` consumers | Placeholder `pending:<fileId>` rows would false-match during the insert→parse window                                                                                                      |
| 45 DRAFT `biomarker_reference_ranges` → `reviewed` status                | Clinical-advisor sign-off round-trip + populate `clinicalReviewer` + `reviewedAt`                                                                                                         |

### 3A.2 Out of scope (moved elsewhere)

- **Gupshup real sender** → 3E (first real patient messages are plan-ready / payment confirmation)
- **Google + Apple social auth** → 3B (signup gateway)
- **iOS parity screenshots** → external Mac-blocked task, tracked outside Phase 3 sub-phases but gates the Phase 3 approval-gate merge

### 3A.3 Test strategy

- Unit: E.164 normalizer round-trip across representative inputs; dev-OTP gate refuses bypass with `NODE_ENV=production`; PENDING_HASH filter works on all four `by_user_hash` consumers.
- Integration: run existing 2.5E E2E with rotated Anthropic key; curation queue still functions with `reviewed`-status ranges.
- Manual: clinical advisor signs off 45 ranges; commit the reviewer-name + reviewedAt in the seed data file.

---

## 4. Sub-phase 3B — Questionnaire content + photo pipeline + consultations table

**Goal:** Patient signs up (phone or social), completes real 28-Q HL questionnaire with skip logic, uploads 4 real photos, `submitConsultation` mutation writes a real `SUBMITTED` consultation row.

### 4.1 Schema adds

```ts
// convex/schema.ts (additions)

consultations: defineTable({
  userId: v.id("users"),
  vertical: v.union(
    v.literal("hair_loss"),
    v.literal("ed"),
    v.literal("pe"),
    v.literal("weight"),
    v.literal("pcos"),
  ),
  status: consultationStatusValidator, // all 22 statuses, full enum from ONLYOU-SOURCE-OF-TRUTH §2
  statusUpdatedAt: v.number(),
  submittedAt: v.number(),
  declineReason: v.optional(v.string()),
  referralSpecialistType: v.optional(v.string()),
  referralReason: v.optional(v.string()),
  moreInfoQuestion: v.optional(v.string()),
  moreInfoAnsweredAt: v.optional(v.number()),
  assignedDoctorId: v.optional(v.id("users")),
  createdAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_user_status", ["userId", "status"])
  .index("by_status_updated", ["status", "statusUpdatedAt"])
  .index("by_vertical_status", ["vertical", "status"])
  .index("by_deleted", ["deletedAt"]);

questionnaire_responses: defineTable({
  consultationId: v.id("consultations"),
  userId: v.id("users"),
  schemaVersion: v.string(), // e.g. "hair-loss-v1"
  answers: v.any(), // JSON blob: { q1: "...", q2: "...", ... }
  completedAt: v.number(),
}).index("by_consultation", ["consultationId"]);

photos: defineTable({
  consultationId: v.id("consultations"),
  userId: v.id("users"),
  slot: v.union(
    v.literal("crown"),
    v.literal("hairline"),
    v.literal("left_temple"),
    v.literal("right_temple"),
  ),
  fileId: v.id("_storage"),
  mimeType: mimeTypeValidator,
  uploadedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_consultation_slot", ["consultationId", "slot"])
  .index("by_deleted", ["deletedAt"]);
```

### 4.2 Consultation status validator

Ship the full transition map from SOT §3A + §3B in `convex/consultations/transitions.ts`:

- `transitionStatus(consultationId, to)` — user/doctor-facing; validates against `validTransitions` table; throws on invalid.
- `systemTransition(consultationId, to)` — bypasses `validTransitions` for scheduler/webhook paths (abandon-check, expiry, PRESCRIBED → AWAITING_PAYMENT, etc.).

Both write to an `consultation_status_history` sub-record (or separate table — decide in plan) for audit.

### 4.3 Questionnaire content + engine

- Port all 28 HL questions from `docs/VERTICAL-HAIR-LOSS.md §4` into `apps/mobile/src/data/questionnaires/hair-loss.ts`, preserving question IDs, sections, and types.
- Skip logic: Q2=Female → Q3 swaps options + skips Q22–Q25 + reveals female-specific options in Q4/Q7/Q8. Q5={No family history, Not sure} → skip Q6. Q23="Not concerned" → skip Q24. Q26="None" → skip Q27.
- Expand `useQuestionnaireStore` to evaluate skip rules at each answer write; the screen router (`[qid].tsx`) consults the store for the next reachable qid.
- Review screen (`review.tsx`) renders real data grouped by section.

### 4.4 Photo pipeline

- Replace mocked `photo-upload/camera.tsx` with real `expo-camera`.
- Add bottom-sheet picker at entry point: "Take photo" / "Choose from library" (`expo-image-picker`). Founder request from 2C walkthrough.
- Enforce 4 slots (crown, hairline, left_temple, right_temple). All 4 required before `submitConsultation` unlocks.
- Upload flow: client gets signed storage URL from a Convex mutation, uploads file to Convex storage, POSTs `fileId` + slot to `recordPhoto` mutation. Same pattern as 2.5 lab-report upload.

### 4.5 Social auth

- Google Sign-In on Android + iOS (via `expo-auth-session` or Google one-tap SDK).
- Apple Sign-In on iOS only (Apple guideline requires Apple option if any third-party SSO is offered on iOS).
- Both wire into same `users` row via email; phone OTP still required for phone verification per DPDPA / regulatory requirements.

### 4.6 Entry mutation

`submitConsultation` inserts consultation (`status: "SUBMITTED"`), writes questionnaire_responses row, verifies 4 photos recorded, schedules 3C AI job via Convex scheduler (handoff boundary).

### 4.7 Test strategy

- Unit: skip-logic engine produces correct reachable-question sequence for every combination of Q2, Q5, Q23, Q26 answers; `submitConsultation` rejects incomplete photos; consultation-history audit row written.
- Integration: live E2E through welcome → phone OTP → questionnaire → 4 photos → submit; assert `SUBMITTED` row, questionnaire_responses count, photos count.
- UI: visual check of each question type on Android + iOS (iOS parity = Mac-blocked external task).

---

## 5. Sub-phase 3C — AI pre-assessment (Option B)

**Goal:** `submitConsultation` triggers a Claude call that reads questionnaire answers, produces narrative + classification + flags. Consultation auto-advances to `AI_COMPLETE` on success.

### 5.1 AI scope — Option B (locked in brainstorm, upgrade to C deferred to Phase 8)

- **Input:** questionnaire answers only (no photos in 3C).
- **Output JSON schema:**

  ```ts
  {
    narrative: string;          // 2-3 paragraph summary
    stage: string;              // "Norwood III-V" | "Ludwig II" | etc.
    flags: Array<              // machine-readable clinical flags
      | "alopecia_areata_suspected"
      | "finasteride_caution_under_25"
      | "finasteride_caution_conception_plan"
      | "telogen_effluvium_trigger_present"
      | "scarring_alopecia_possible"
      | "mixed_etiology"
      | "pre_existing_sexual_dysfunction"
      | "patient_prefers_topical_only"
      ...
    >;
    confidence: number;         // 0..1
    // Forward-compatible additions (populated in Phase 8 C upgrade, optional in B):
    photoAnalysis?: unknown;
    recommendedTemplateHint?: string;
    redFlags?: string[];
  }
  ```

- **Model:** `process.env.ANTHROPIC_MODEL` — never hardcoded.

### 5.2 Schema adds

```ts
ai_assessments: defineTable({
  consultationId: v.id("consultations"),
  userId: v.id("users"),
  narrative: v.string(),
  stage: v.string(),
  flags: v.array(v.string()),
  confidence: v.number(),
  modelUsed: v.string(),
  inputTokens: v.number(),
  outputTokens: v.number(),
  // Forward-compat (nullable/optional for future C upgrade):
  photoAnalysis: v.optional(v.any()),
  recommendedTemplateHint: v.optional(v.string()),
  redFlags: v.optional(v.array(v.string())),
  processedAt: v.number(),
  retryCount: v.optional(v.number()),
}).index("by_consultation", ["consultationId"]);
```

### 5.3 Action: `runAiAssessment(consultationId)`

Convex action (not a mutation — external network call). Steps:

1. Transition `SUBMITTED → AI_PROCESSING` via `systemTransition`.
2. Load questionnaire answers.
3. Call Anthropic SDK with the model from env + structured prompt (prompt file versioned in `convex/ai/prompts/hair-loss-assessment.ts`).
4. Parse response; validate against Zod schema of the output above.
5. On success: insert `ai_assessments` row, transition `AI_PROCESSING → AI_COMPLETE`, enqueue notification (deferred to 3E Gupshup).
6. On parse/network failure: increment retryCount, exponential backoff (1min, 5min, 15min), transition to `AI_FAILED` after 3 failed retries. `AI_FAILED` is flagged for admin-manual review (Phase 5 admin portal surface; for now, logged).

### 5.4 Test strategy

- Unit: prompt-construction produces expected shape; response parser validates + rejects malformed JSON; retry logic exercises backoff.
- Integration: mocked Claude with canned responses triggers correct transitions; real Claude call in live E2E run (counted against rotated dev key).
- Cost guardrail: log token counts; add a Convex-dashboard query `aiAssessmentCostPastWeek` for observability.

---

## 6. Sub-phase 3D — Doctor review simulator

**Goal:** A thin surface to drive `AI_COMPLETE → REVIEWING → {PRESCRIBED | DECLINED | REFERRED | MORE_INFO_REQUESTED | LAB_ORDERED}` without building the real doctor portal. Phase 4 replaces this with the real portal; CLI is retained for E2E tests.

### 6.1 Two surfaces, no UI

1. **Convex internal mutations** (called from Convex dashboard in dev/staging):
   - `simulateDoctor.startReview(consultationId)` → `ASSIGNED` → `REVIEWING`
   - `simulateDoctor.requestMoreInfo(consultationId, question)` → `MORE_INFO_REQUESTED`
   - `simulateDoctor.prescribe(consultationId, templateId, meds[], doctorNotes)` → `PRESCRIBED` (then scheduler auto-transitions to `AWAITING_PAYMENT` per SOT §3B)
   - `simulateDoctor.decline(consultationId, reason)` → `DECLINED` (terminal)
   - `simulateDoctor.refer(consultationId, specialistType, reason)` → `REFERRED` (terminal)
   - `simulateDoctor.orderLab(consultationId, panelName)` → `LAB_ORDERED` (used only in tests this sub-phase; not in demo walkthrough)

2. **CLI wrapper** at `scripts/doctor-sim.ts`:
   - `pnpm doctor:sim <consultationId> review`
   - `pnpm doctor:sim <consultationId> prescribe --template FIN_MIN`
   - `pnpm doctor:sim <consultationId> decline --reason "Contraindication — active nitrate use"`
   - etc.
   - Thin wrapper — calls the same mutations via Convex HTTP client. Used in CI E2E tests for deterministic results.

### 6.2 Prescription templates (seeded)

Seed 5 HL templates per VERTICAL-HAIR-LOSS.md §8.1 in `convex/seed/prescriptionTemplates.ts`:

| Template ID       | Name                    | Medications                                                  |
| ----------------- | ----------------------- | ------------------------------------------------------------ |
| `HL_FIN_MIN`      | Finasteride + Minoxidil | Finasteride 1mg OD, Minoxidil 5% 1mL BID, Biotin 10000mcg OD |
| `HL_MIN_ONLY`     | Minoxidil Only          | Minoxidil 5% 1mL BID, Biotin 10000mcg OD                     |
| `HL_DUT_MIN`      | Dutasteride + Minoxidil | Dutasteride 0.5mg OD, Minoxidil 5% 1mL BID                   |
| `HL_CONSERVATIVE` | Conservative (no Rx)    | Biotin 10000mcg OD, Ketoconazole 2% shampoo 3x/wk            |
| `HL_TOPICAL_ONLY` | Topical-Only            | Minoxidil 5% 1mL BID, Ketoconazole 2% shampoo 3x/wk          |

### 6.3 Template selection is operator-driven

Explicit design choice — the doctor-sim operator picks `templateId` via CLI arg or dashboard dropdown. No server-side auto-recommendation based on `ai_assessments.flags` or any photo-derived field. Auto-recommendation is an AI Option C concern (vision-enabled) and is deferred to Phase 8 in `docs/DEFERRED.md`.

This keeps 3D independent of 3C's content: even if Option B's flags are empty or unexpected, 3D still produces valid prescriptions. No hidden dependency on capabilities 3C doesn't ship.

### 6.4 Schema adds (also consumed by 3E)

```ts
medications: defineTable({
  name: v.string(), // "Finasteride"
  strength: v.string(), // "1mg"
  form: v.string(), // "tablet" | "topical" | "shampoo"
  defaultSig: v.string(), // "Once daily, with or without food"
  priceInPaise: v.number(), // reference price only; actual pricing lives on subscription plan
}).index("by_name_strength", ["name", "strength"]);

prescriptions: defineTable({
  consultationId: v.id("consultations"),
  userId: v.id("users"),
  templateId: v.string(),
  meds: v.array(
    v.object({
      medicationId: v.id("medications"),
      dosage: v.string(),
      sig: v.string(),
      durationDays: v.optional(v.number()),
    }),
  ),
  doctorNotes: v.optional(v.string()),
  signedAt: v.number(),
  signedByUserId: v.id("users"), // simulated-doctor user in 3D; real doctor in Phase 4
  status: v.union(
    v.literal("CREATED"),
    v.literal("SIGNED"),
    v.literal("SENT_TO_PHARMACY"),
    v.literal("FULFILLED"),
    v.literal("EXPIRED"),
    v.literal("CANCELLED"),
  ),
}).index("by_consultation", ["consultationId"]);
```

### 6.5 Test strategy

- Unit: each sim mutation enforces the correct `validTransitions` source→target; template lookup rejects unknown IDs.
- Integration: CLI script → mutation → assert consultation reaches the expected terminal or intermediate state.
- E2E: used as driver for 3E + 3F integration tests.

---

## 7. Sub-phase 3E — Treatment plan + Razorpay test + Gupshup

**Goal:** After 3D prescribes, the patient sees a real treatment plan, selects a subscription, pays with a Razorpay test card, webhook transitions to `PAYMENT_COMPLETE` → `PHARMACY_PROCESSING`. Gupshup sends WhatsApp notifications for plan-ready + payment-received.

### 7.1 Schema adds

```ts
treatment_plans: defineTable({
  consultationId: v.id("consultations"),
  prescriptionId: v.id("prescriptions"),
  userId: v.id("users"),
  summary: v.string(), // doctor-written overview
  pricingSnapshot: v.object({
    monthlyPaise: v.number(),
    quarterlyPaise: v.number(),
    sixMonthPaise: v.number(),
  }),
  expiresAt: v.number(), // submittedAt + 30 days
  selectedPlan: v.optional(
    v.union(
      v.literal("MONTHLY"),
      v.literal("QUARTERLY"),
      v.literal("SIX_MONTH"),
    ),
  ),
  selectedAt: v.optional(v.number()),
})
  .index("by_consultation", ["consultationId"])
  .index("by_expires", ["expiresAt"]);

payments: defineTable({
  consultationId: v.id("consultations"),
  userId: v.id("users"),
  razorpayOrderId: v.string(),
  razorpayPaymentId: v.optional(v.string()),
  razorpaySubscriptionId: v.optional(v.string()),
  amountPaise: v.number(),
  currency: v.literal("INR"),
  method: v.optional(v.string()), // "upi" | "card" | "netbanking" | "wallet"
  status: v.union(
    v.literal("CREATED"),
    v.literal("AUTHORIZED"),
    v.literal("CAPTURED"),
    v.literal("FAILED"),
    v.literal("REFUNDED"),
  ),
  createdAt: v.number(),
  capturedAt: v.optional(v.number()),
})
  .index("by_consultation", ["consultationId"])
  .index("by_razorpay_order", ["razorpayOrderId"]);

subscriptions: defineTable({
  consultationId: v.id("consultations"),
  userId: v.id("users"),
  plan: v.union(
    v.literal("MONTHLY"),
    v.literal("QUARTERLY"),
    v.literal("SIX_MONTH"),
  ),
  razorpaySubscriptionId: v.optional(v.string()), // monthly + quarterly only
  razorpayOneTimePaymentId: v.optional(v.string()), // six-month
  startedAt: v.number(),
  currentPeriodEndsAt: v.number(),
  status: v.union(
    v.literal("CREATED"),
    v.literal("ACTIVE"),
    v.literal("PAUSED"),
    v.literal("HALTED"),
    v.literal("CANCELLED"),
    v.literal("EXPIRED"),
  ),
})
  .index("by_consultation", ["consultationId"])
  .index("by_user_status", ["userId", "status"]);
```

### 7.2 UI rewires

- `apps/mobile/app/treatment/plan-ready.tsx`: accept `consultationId` URL param (resolves carry-forward from 2C review); query real Convex for the treatment plan; remove the `usePatientState().consultations[0]` fixture lookup.
- `treatment/plan-selection.tsx`: real 3 plans + per-month breakdown + "Most Popular" on Quarterly; values pulled from `treatment_plans.pricingSnapshot` (not recomputed client-side).
- `treatment/payment.tsx`: opens Razorpay test-mode checkout sheet via the official React Native SDK.
- `treatment/subscription-confirmed.tsx`: replaces the dev-scenario-store flip (deferred item from 2C) with a real `activateSubscription` mutation call (actually: `activateSubscription` is triggered by the Razorpay webhook, not the client — the screen just reads the new state and shows the confirmation). Drop the dev-store flip entirely.
- Zustand store: introduce `useTreatmentStore` to hold the in-flight plan selection during the payment handoff (deferred from 2C). Hydrates from Convex once the screen mounts.

### 7.3 Razorpay integration

- Test-mode keys only in 3E (brainstorm decision): `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` + `RAZORPAY_WEBHOOK_SECRET` in Convex env vars. Live keys flip at Phase 8 (documented in DEFERRED).
- `createRazorpayOrder(consultationId, plan)` Convex action: creates an Order (one-time 6-month) or Subscription (monthly/quarterly) via Razorpay REST API; returns the checkout token to the client.
- `/razorpay/webhook` Convex HTTP action: verify `x-razorpay-signature` header against `RAZORPAY_WEBHOOK_SECRET` (constant-time HMAC). On `payment.captured` or `subscription.charged`: write/update `payments` row, transition consultation `AWAITING_PAYMENT → PAYMENT_COMPLETE`, then system-transition `PAYMENT_COMPLETE → PHARMACY_PROCESSING`.
- Idempotency: webhook is keyed on Razorpay's event ID; duplicate deliveries noop.
- UPI Autopay ₹15,000 cap is relevant only for GLP-1 Weight (not HL); document in Phase 8 live-switch checklist.

### 7.4 Gupshup real sender

- Swap the console-log stub sender behind the existing OTP-provider interface with a real Gupshup Business API call.
- Templates this sub-phase uses:
  - `hl_plan_ready` — "Your doctor has prepared your treatment plan"
  - `hl_payment_received` — "Payment received. Preparing your medications"
  - OTP templates (already defined in 3A for the dev-gate swap)
- Same interface means the Gupshup credentials are an env-var drop-in. If Gupshup Business onboarding is incomplete when 3E lands, keep the stub sender behind a `GUPSHUP_ENABLED` feature flag so 3E merges without blocking on external approval.

### 7.5 30-day expiry

Convex scheduled function tree:

- At `AWAITING_PAYMENT` entry: enqueue three delayed notifications (+3d, +7d, +14d) + one expiry job (+30d).
- +30d job: if `consultation.status === "AWAITING_PAYMENT"`, system-transition to `EXPIRED_UNPAID`. If the patient has already paid, noop.

### 7.6 Test strategy

- Unit: Razorpay signature-verify accepts canonical test payloads + rejects tampered ones; pricing-snapshot is immutable from the moment the plan is generated (doctor change doesn't retroactively rewrite the patient's view).
- Integration: mock Razorpay webhook POST → full transition chain → active subscription.
- Live E2E: Convex dev + ngrok-tunneled webhook + real Razorpay test card (`4111 1111 1111 1111`) → observe WhatsApp template arriving on founder's phone.

---

## 8. Sub-phase 3F — Orders + pharmacy auto-advance + active-treatment UI

**Goal:** First medication order created automatically after payment, pharmacy status auto-advances through `PHARMACY_PROCESSING → DISPATCHED → DELIVERED → TREATMENT_ACTIVE` behind a feature flag. Patient sees real order tracking, profile shows real subscription. Phase 3 approval gate lives at the end of this sub-phase.

### 8.1 Schema adds

```ts
orders: defineTable({
  consultationId: v.id("consultations"),
  subscriptionId: v.id("subscriptions"),
  userId: v.id("users"),
  prescriptionId: v.id("prescriptions"),
  meds: v.array(
    v.object({
      medicationId: v.id("medications"),
      quantity: v.number(),
      sig: v.string(),
    }),
  ),
  status: v.union(
    v.literal("CREATED"),
    v.literal("SENT_TO_PHARMACY"),
    v.literal("PREPARING"),
    v.literal("READY"),
    v.literal("OUT_FOR_DELIVERY"),
    v.literal("DELIVERED"),
    v.literal("PHARMACY_ISSUE"),
    v.literal("DELIVERY_FAILED"),
    v.literal("REASSIGNED"),
    v.literal("CANCELLED"),
  ),
  scheduledAt: v.number(),
  dispatchedAt: v.optional(v.number()),
  deliveredAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_consultation", ["consultationId"])
  .index("by_user_status", ["userId", "status"])
  .index("by_subscription", ["subscriptionId"]);
```

### 8.2 Auto-advance scheduler

Convex scheduled function chain, all behind `PHARMACY_AUTO_ADVANCE` feature flag (`convex/featureFlags.ts` addition):

| Delay (dev / staging)     | Transition                             | Consultation impact                             |
| ------------------------- | -------------------------------------- | ----------------------------------------------- |
| +30s after order creation | `SENT_TO_PHARMACY → PREPARING`         | no consultation change                          |
| +60s                      | `PREPARING → READY → OUT_FOR_DELIVERY` | consultation → `DISPATCHED`                     |
| +60s                      | `OUT_FOR_DELIVERY → DELIVERED`         | consultation → `DELIVERED` → `TREATMENT_ACTIVE` |

Delays are config values, not literals — tunable via env var for demo pacing.

### 8.3 Real-pharmacy drop-in (forward-compat)

The pharmacy event surface is an interface — `pharmacyEvents.dispatched(orderId)`, `pharmacyEvents.delivered(orderId, otp)`. In 3F these events are fired by the scheduler. In Phase 6 (pharmacy portal) they're fired by real pharmacy staff actions. Flag off → real portal drives; flag on → scheduler drives. No downstream consumer (consultation transitions, patient UI, notification templates) changes between the two. CLI override `pnpm pharmacy:sim <orderId> <event>` for deterministic tests, same as the 3D doctor-sim pattern.

### 8.4 UI rewires

- Home tab: order status card when a live order exists. Reads real `orders` row.
- Profile tab: real subscription state replaces the fixture-based `usePatientState` scenario hook. `Subscription deep-management (cancel/pause/change plan)` — deferred to Phase 8 per brainstorm decision. Read-only in 3F.
- Explore grid: reads real `featureFlags` (carry-forward from 2C DEFERRED).
- Wallet tab: remains a placeholder. No real transactions flow in Phase 3 (the only payment is the subscription itself, which isn't a wallet credit; wallet is the refund destination per SOT §18, and refund flows ship in Phase 8 with subscription deep-management). Moved to Phase 8 in DEFERRED.md.

### 8.5 Notifications

Gupshup templates added in 3F:

- `hl_order_dispatched`
- `hl_order_delivered`
- `hl_treatment_day_1` (welcome to treatment)

### 8.6 Test strategy

- Unit: scheduler fires correct transitions at each step; CLI override bypasses timer for deterministic test runs; flag-off path is a noop.
- Integration: full chain from `submitConsultation` → AI → prescribe → pay → auto-advance → `TREATMENT_ACTIVE`, executed against live Convex dev.
- **Live E2E:** recorded golden-path run logged in `checkpoint.md`, screenshots at each major state.

### 8.7 Approval-gate demo script

Founder walkthrough at the end of 3F, before Phase 4 begins, covering **three scenarios**:

1. **Golden path** — new user, signup via Google (or phone), 28 questions + skip logic behaves, 4 photos uploaded, wait on real AI, you fire `doctor-sim prescribe --template HL_FIN_MIN`, patient sees treatment plan, Razorpay test-card pays, auto-advance fires, profile shows `TREATMENT_ACTIVE`.
2. **DECLINE** — different consultation, you fire `doctor-sim decline --reason "Under 18 per questionnaire Q1"`, patient sees terminal UI with decline reason + alternative suggestions.
3. **MORE_INFO_REQUESTED** — third consultation, you fire `doctor-sim request-more-info "Please clarify duration of Propecia use"`, patient receives in-app notification, responds, consultation returns to `REVIEWING`, you then fire `prescribe`.

LAB_ORDERED, REFERRED, EXPIRED_UNPAID, AI_FAILED are covered in integration tests — not demo. iOS-parity screenshots for each of the three scenarios are the Mac-blocked external gate.

---

## 9. Cross-cutting concerns

### 9.1 Auth pattern

Every new Convex query and mutation reuses the existing session-token pattern (query `sessions` by token, derive userId). **Never** use `ctx.auth.getUserIdentity()` — `auth.config.ts` has `providers: []` and this pattern was the root cause of a Phase 2 authentication bug. Locked in per user memory.

### 9.2 Privacy field whitelisting

Patient-facing queries never project: doctor internal notes, pharmacy anonymized IDs, other patients' data. Doctor-facing queries (none in Phase 3, but tests-only in 3D) never project: payment method, subscription state, other doctors' prescriptions. Field whitelist integration tests following the 2.5 pattern (see `convex/__tests__/biomarker/myBiomarkerReports.test.ts` as reference).

### 9.3 Forward-compat shapes

Three decisions reduce the cost of deferred upgrades:

1. **`ai_assessments` optional fields** (`photoAnalysis`, `recommendedTemplateHint`, `redFlags`) — Option C upgrade is additive, no migration.
2. **Pharmacy auto-advance flag + event interface** — real pharmacy partner swap flips the flag, same downstream code path.
3. **Razorpay test → live** — one env-var rotation, same webhook code path (signing secret is the only value that changes).

### 9.4 Scheduler abstraction

Convex scheduled functions are used where the spec would've called for BullMQ. Wrap the scheduler behind a thin interface (`convex/jobs/scheduler.ts`) so that if/when the project later introduces BullMQ-like durable jobs, migration is local.

### 9.5 Monetary invariants

All money in paise (integer) end to end — never rupees, never floats. Plan snapshot values are frozen at plan creation time and never recomputed client-side (prevents accidental price drift if the doctor edits the plan post-view).

---

## 10. Test strategy (overall)

| Layer                                             | Tooling                                                            | Runs when                                                |
| ------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| Unit (Convex functions, engines, parsers)         | `vitest` via existing convex-test harness                          | Every commit                                             |
| Integration (transition chains, mocked externals) | `vitest` + sim CLIs                                                | Every commit                                             |
| **Live E2E** (per Phase 2.5 memory — phase gate)  | `npx convex dev` + scripted patient flow + mocked or live Razorpay | Per sub-phase before merge                               |
| UI smoke (Android)                                | Expo dev build on founder's device                                 | Per sub-phase before merge                               |
| UI smoke (iOS)                                    | Expo dev build on iOS device                                       | Blocked on Mac availability; gates Phase 3 approval only |
| Demo walkthrough                                  | Founder screen-share                                               | Approval gate at end of 3F                               |

Every Convex sub-phase runs one live-E2E pass before merge. Unit-test mocks are insufficient for Convex V8 runtime correctness — locked lesson from Phase 2.5C.

---

## 11. Risks + mitigations

| Risk                                                                     | Mitigation                                                                                                                             |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Claude API cost runaway during repeated E2E loops                        | Log token counts to a Convex dashboard query; cap model via env var; dev-only prompts kept short                                       |
| Questionnaire skip-logic drift between schema version + stored responses | `schemaVersion` field on `questionnaire_responses`; any change to the question set bumps the version; old responses remain readable    |
| Razorpay webhook delivery unreliable in dev                              | Use `ngrok` tunnel (document the command in `docs/runbooks/3E-razorpay-dev.md`); idempotency-keyed handler survives duplicate delivery |
| Convex scheduler semantics differ from BullMQ                            | Wrapper interface + integration tests against the wrapper, not the platform directly                                                   |
| iOS parity still Mac-blocked                                             | External gate — does not block 3A–3F sub-phase merges; does block the Phase 3 approval-gate sign-off                                   |
| Razorpay test-mode webhook secrets leak into repo                        | `.env.local` pattern + gitignored; documented in the env-var onboarding note                                                           |
| Gupshup Business approval delayed                                        | `GUPSHUP_ENABLED` feature flag — stub sender remains until flag flipped; no blocking dependency on external approval                   |

---

## 12. Deferred items captured during this brainstorm

Recorded to `docs/DEFERRED.md` as they were decided:

- **AI Option B → C upgrade** (add vision call on 4 scalp photos + recommended template hint + red-flag list) → Phase 8.
- **Razorpay test-mode → live-mode flip** (env-var rotation, webhook signing secret swap, KYC-not-a-blocker per founder) → Phase 8.
- **Subscription deep-management** (cancel / pause / change-plan) → Phase 8 (moved from previous "Phase 3 tail" destination).
- **Pharmacy real-partner integration** — interface already in place; swap implementation when Phase 6 pharmacy portal lands.
- **Auto-template-recommendation based on photo analysis** — bundled with AI Option C upgrade at Phase 8. 3D's operator-driven template selection is intentional.

All five entries carry a **Why** and **How to apply** line in DEFERRED.md per rule 9.

---

## 13. Open items for plan-writing phase

- Exact consultation-status-history audit shape: separate table vs. sub-record on `consultations`.
- Whether `submitConsultation` schedules the 3C AI job directly or goes through a generic job-queue wrapper.
- Concrete Gupshup template IDs pending Business-account template approval — may lag 3E implementation; keep stub sender fallback.
- Whether the delivery OTP in `orders.delivered` (spec §8 says OTP-confirmed) is real or simulated in 3F — simulated is simpler; real OTP needs an SMS send + patient-side entry screen.

Each of these is resolved in the relevant sub-phase plan, not this design spec.

---

## Document ends here.

This spec is the input for six `writing-plans` invocations (one per sub-phase). Each sub-phase plan lives at `docs/superpowers/plans/2026-XX-XX-phase-3<letter>-<topic>.md`. The **approval gate** at the end of 3F is the only gate between Phase 3 and Phase 4.
