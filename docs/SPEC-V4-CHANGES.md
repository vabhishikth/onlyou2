# onlyou-spec-resolved-v4.md — Change Summary
## Payment Flow Redesign: "Pay After Doctor, Not Before"

---

## OVERVIEW

This is the master spec — "single source of truth." Changes here are authoritative and cascade to all other documents. The payment flow redesign touches 6 sections across the document.

| Section | Change Type | Description |
|---------|-----------|-------------|
| §1 (Conflict Resolution Log) | **New entry** | New conflict #1.8: Payment Timing |
| §4.1 (Patient App — Key Patient Flows) | **Rewrite** | "New Assessment Flow" reordered |
| §4.3 (Admin Dashboard) | **Minor edit** | Refund policy simplification in admin context |
| §5 (Updated Pricing) | **Addition** | Free consultation note + subscription value split |
| §9 (Updated Build Order) | **Edit** | Phase 5 & 6 checkpoint descriptions updated |
| §10 (What Stays Unchanged) | **Critical edit** | v3 Sections 3, 10, 12 are NOW changed |

---

## CHANGE V4-1: Section 1 — New Conflict Resolution Entry

### ADD as §1.8 (new subsection at end of conflict resolution log):

```
### 1.8 Payment Timing: Before vs. After Doctor Review

| Source | Said |
|---|---|
| v3 .md specs (master Section 3) | Patient selects plan and pays BEFORE doctor reviews case |
| All condition-specific v3 specs | Same — "Selects plan & pays → Doctor reviews case" |

**RESOLUTION:** Payment moves to AFTER doctor review. Patient gets a free initial consultation (AI assessment + async doctor review + personalized treatment plan) before any payment is collected. Payment is only triggered when the patient views their treatment plan and chooses to subscribe.

**Rationale:**
- Proven model: Man Matters (India), Ro/Hims (US) use free consultation → treatment plan → payment
- MFine (India) required upfront payment for consultations — shut down in 2023
- For stigmatized conditions in India, trust must be built before asking for money
- Consultation cost is customer acquisition cost, not revenue
- Anti-abuse safeguard: One free initial consultation per vertical per user

**New flow:**
```
Questionnaire → Photos → AI Assessment → DOCTOR REVIEWS (FREE) → TREATMENT PLAN → PATIENT VIEWS PLAN → SELECTS PLAN & PAYS → Pharmacy pipeline
```

**Impacts:**
- v3 Section 3 (Shared User Journey — payment flow) — NOW CHANGED
- v3 Section 10 (Refund & Wallet) — NOW CHANGED (simplified)
- v3 Section 12 (Payment & Subscription) — NOW CHANGED (payment triggered by treatment plan, not assessment)
- New consultation statuses: AWAITING_PAYMENT, PAYMENT_COMPLETE, EXPIRED_UNPAID, DECLINED
- New database model: FreeConsultationTracker (anti-abuse)
- Treatment plan expires after 30 days if unpaid (EXPIRED_UNPAID)

See: PROJECT-OVERVIEW.md Section 5/6, WORKFLOW-PATIENT.md Sections 12-15, APP-PATIENT.md Section 11, BACKEND-ALL-CHANGES.md for full implementation details.
```

---

## CHANGE V4-2: Section 4.1 — Patient App "Key Patient Flows"

### Replace the "New Assessment Flow" line:

**OLD:**
```
**New Assessment Flow:**
Explore → Select Condition → Questionnaire (one Q per screen, skip logic, save progress) → Photo Upload (if required) → Review Summary → Consent → Select Plan (Monthly/Quarterly/6-Month) → Razorpay Payment → Confirmation → Home (shows "Under Review" status)
```

**NEW:**
```
**New Assessment Flow:**
Explore → Select Condition → Questionnaire (one Q per screen, skip logic, save progress) → Photo Upload (if required) → Review Summary → Consent → Submission Confirmation (FREE — no payment) → Home (shows "Under Review" status) → Doctor Reviews Case (FREE) → Treatment Plan Ready notification → Patient views personalized treatment plan → Select Plan (Monthly/Quarterly/6-Month) → Razorpay Payment → Subscription Confirmation → Home (shows "Treatment Active" + delivery tracking)

> **Key difference from v3:** Payment is no longer between "Consent" and "Confirmation." Patient submits assessment for free, receives a free doctor review, sees their personalized treatment plan, and THEN decides whether to pay. Anti-abuse: one free consultation per vertical per user.
```

### ADD new flow after "Delivery Confirmation Flow":

```
**Treatment Plan Flow (NEW):**
Notification ("Treatment Plan Ready") → Home tab card [View Plan & Subscribe] OR Activity tab → Treatment Plan screen (doctor name, diagnosis, medications, prescription PDF) → [Choose Your Plan] → Plan Selection (Monthly/Quarterly/6-Month) → Payment → Subscription Confirmation → Pharmacy pipeline begins
```

---

## CHANGE V4-3: Section 4.3 — Admin Dashboard

### In the "Tab: Deliveries" section, ADD to the "Monthly Auto-Reorder Section":

```
**Awaiting Payment Section (NEW):**
- List of consultations in AWAITING_PAYMENT status
- Shows: patient (anonymous ID), condition, doctor name, days since treatment plan created
- Color coding: Green (0-7 days), Amber (8-20 days), Red (21-30 days)
- "At risk" flag for plans approaching 30-day expiry
- Admin can send manual reminder or extend expiry if needed
```

### In the "Tab: Settings → Financial" area, ADD note:

```
> **Simplified refund model:** Since patients don't pay until after receiving their treatment plan, pre-consultation refunds are eliminated. Refund scenarios now only apply to post-payment events (pharmacy issues, delivery failures, subscription cancellations).
```

---

## CHANGE V4-4: Section 5 — Updated Pricing

### ADD new subsection after the pricing table (before or after the 6-month plan note):

```
### What's Free (Before Payment)

Every patient receives the following at no cost before any payment is collected:
1. **AI pre-assessment** — Claude analyzes questionnaire + photos, generates clinical summary
2. **Async doctor consultation** — Specialist reviews case (3-10 min), creates personalized treatment plan
3. **First blood panel** — If doctor orders lab work during initial consultation, it's free to the patient
4. **Personalized treatment plan** — Patient sees their specific diagnosis, medications, and timeline before paying

> **Business rationale:** The free consultation is customer acquisition cost, not lost revenue. Conversion from "free plan viewed" to "paid subscription" is the key metric. This model is proven by Man Matters (India's largest men's health telehealth) and Ro (US market leader). Anti-abuse: one free consultation per vertical per user.

### What's Included in Every Subscription (After Payment)

1. E-prescription (doctor-approved, PDF)
2. Medication delivery (monthly kit, discreet packaging, OTP confirmation)
3. Ongoing check-ins (4-week, 3-month, 6-month cadence)
4. Unlimited doctor messaging
5. Follow-up blood panels (included when ordered by doctor)
6. Auto-reorder on renewal
7. Wallet system for credits and prorated refunds
```

---

## CHANGE V4-5: Section 9 — Updated Build Order

### Phase 5: Delivery & Payment (Week 14-17)

**UPDATE item 22:**

**OLD:**
```
22. Razorpay integration (one-time payments + subscriptions + 6-month plans)
```

**NEW:**
```
22. Razorpay integration (one-time payments + subscriptions + 6-month plans) — payment triggered AFTER doctor creates treatment plan (AWAITING_PAYMENT → PAYMENT_COMPLETE flow)
```

**UPDATE checkpoint:**

**OLD:**
```
**✅ Checkpoint:** Can complete Razorpay test payment, see order in pharmacy portal, mark ready, generate delivery SMS link, enter OTP to confirm delivery. Admin dashboard shows full pipeline overview.
```

**NEW:**
```
**✅ Checkpoint:** Doctor creates treatment plan → patient views plan in app → patient completes Razorpay test payment → order appears in pharmacy portal → mark ready → generate delivery SMS link → enter OTP to confirm delivery. Admin dashboard shows full pipeline overview including "Awaiting Payment" cases. Treatment plan expiry (30-day) job fires correctly in test.
```

### Phase 6: Patient App Tracking (Week 17-19)

**UPDATE checkpoint:**

**OLD:**
```
**✅ Checkpoint:** Full Hair Loss patient journey end-to-end: sign up → questionnaire → AI → payment → doctor prescribes → pharmacy prepares → delivery confirmed → patient sees everything in Activity tab with steppers. Push/WhatsApp notifications fire at each step.
```

**NEW:**
```
**✅ Checkpoint:** Full Hair Loss patient journey end-to-end: sign up → questionnaire → AI → doctor reviews (free) → treatment plan ready → patient views plan → selects plan & pays → pharmacy prepares → delivery confirmed → patient sees everything in Activity tab with steppers. Push/WhatsApp notifications fire at each step including treatment plan ready notification and payment reminders.
```

---

## CHANGE V4-6: Section 10 — What Stays Unchanged (CRITICAL UPDATE)

### UPDATE the v3 reference list:

Three items that were previously marked "unchanged" are NOW changed:

**OLD:**
```
- Section 3: Shared User Journey (auth, profile, questionnaire engine, payment flow) — except video is muted
...
- Section 10: Refund & Wallet — unchanged
...
- Section 12: Payment & Subscription — updated pricing in this doc Section 5
```

**NEW:**
```
- Section 3: Shared User Journey (auth, profile, questionnaire engine) — except video is muted. **⚠️ PAYMENT FLOW CHANGED:** Patient no longer pays before doctor review. New flow: assessment → free doctor review → treatment plan → payment. See §1.8 conflict resolution and PROJECT-OVERVIEW.md Section 6 for updated flow.
...
- Section 10: Refund & Wallet — **SIMPLIFIED.** Pre-consultation refund scenarios eliminated (patient hasn't paid). Refunds now only apply post-payment. See WORKFLOW-PATIENT.md Section 30 and BACKEND-PART2B Section 17 for updated refund table.
...
- Section 12: Payment & Subscription — updated pricing in this doc Section 5. **⚠️ PAYMENT TRIGGER CHANGED:** Payment is now initiated from the "Treatment Plan Ready" screen (after doctor review), not from the assessment flow (before doctor review). New consultation statuses AWAITING_PAYMENT and PAYMENT_COMPLETE bridge the gap. See BACKEND-ALL-CHANGES.md for full implementation.
```

### ADD to the "condition-specific specs" section:

```
**From condition-specific specs:**
- `onlyou-spec-hair-loss.md` — **patient journey flow needs updating** (pay-after-doctor, remove REFUNDS outcome, add DECLINES)
- `onlyou-spec-erectile-dysfunction.md` — **patient journey flow needs updating** (same changes)
- `onlyou-spec-weight-management.md` — **patient journey flow needs updating** (same changes)
- `onlyou-spec-pcos.md` — **patient journey flow needs updating** (same changes, REFUNDS → DECLINES)
```

---

## CHANGE V4-7: Section 6 — PE Vertical (if patient journey flow exists in v4)

> **Note:** The PE vertical's patient journey flow is primarily defined in VERTICAL-PE.md (which will be updated separately). However, if Section 6 of v4 contains any inline patient journey references, apply this change:

### Any occurrence of this pattern in Section 6:
```
Selects plan & pays (Monthly/Quarterly/6-Month via Razorpay)
        │
        ▼
Doctor reviews case
```

### Replace with:
```
Assessment submitted (FREE — no payment collected)
        │
        ▼
Doctor reviews case (FREE — within 24 hours)
        │
        ├─── PRESCRIBES → Treatment plan shown to patient → Patient selects plan & pays → Pharmacy pipeline
        ...
        ├─── REFERS ──→ (no charge to patient)
        │
        └─── DECLINES ──→ (no charge to patient)
```

### Any occurrence of `REFUNDS` outcome, replace with `DECLINES`:
```
OLD: └─── REFUNDS ──→ Full/partial refund if cannot treat
NEW: └─── DECLINES ──→ Not a candidate for treatment (no charge — patient hasn't paid)
```

---

## SECTIONS WITH NO CHANGES

| Section | Reason |
|---------|--------|
| §2 (Platform Overview) | No change — high-level description still accurate |
| §3 (Tech Stack & Project Structure) | No change — architecture unchanged |
| §4.2 (Doctor Dashboard) | No change — doctor reviews same way, just before payment now |
| §4.4 (Nurse Portal) | No change |
| §4.5 (Lab Portal) | No change |
| §4.6 (Pharmacy Portal) | No change — pharmacy still receives orders after payment |
| §6 (PE Vertical — questionnaire, AI, scoring) | No change to clinical content — only patient journey flow |
| §7 (Nurse System) | No change |
| §8 (Video Consultation) | No change |

---

## SUMMARY

| Change ID | Section | Description |
|-----------|---------|-------------|
| V4-1 | §1.8 | New conflict resolution: Payment Timing (before vs after doctor) |
| V4-2 | §4.1 | Patient App "New Assessment Flow" rewritten for pay-after-doctor |
| V4-3 | §4.3 | Admin Dashboard: Awaiting Payment section + refund simplification note |
| V4-4 | §5 | "What's Free" and "What's Included" subsections added to pricing |
| V4-5 | §9 | Phase 5 & 6 checkpoint descriptions updated for new flow |
| V4-6 | §10 | v3 Sections 3, 10, 12 marked as CHANGED (were "unchanged") |
| V4-7 | §6 | PE patient journey flow: pay-after-doctor, REFUNDS→DECLINES |
