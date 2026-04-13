# APP-PATIENT.md — Change Summary
## Payment Flow Redesign: "Pay After Doctor, Not Before"

---

## AFFECTED SECTIONS

| Section | Change Type | Description |
|---------|-----------|-------------|
| §5 (Explore Tab) | Minor edit | "How It Works" steps + condition detail CTA updated |
| §4 (Home Tab) | Minor edit | Treatment card states updated for new statuses |
| §6 (Activity Tab) | No change | Delivery stepper unchanged (still starts after payment) |
| §11 (Plan Selection & Payment) | **Major restructure** | Split into 5 subsections, reordered for pay-after-doctor flow |
| §12 (Consultation Lifecycle) | **Status table rewrite** | 4 new statuses, updated patient-facing labels |
| §13 (Lab Booking) | Minor edit | First lab panel pricing note updated (free during initial consultation) |
| §16 (Wallet & Refunds) | Minor edit | Refund scenarios simplified |

---

## CHANGE 1: Section 5.2 — Explore Tab → Condition Detail Screen

### In the "How It Works" 3-step visual, replace:

**OLD:**
```
Step 1: "Tell us about your health" (questionnaire icon)
Step 2: "Get matched with a specialist" (doctor icon)
Step 3: "Receive your treatment at home" (package icon)
```

**NEW:**
```
Step 1: "Tell us about your health" (questionnaire icon)
Step 2: "Get a free doctor review" (doctor icon) — "A specialist reviews your case and creates a personalized plan — at no cost"
Step 3: "Subscribe & receive treatment at home" (package icon) — "Choose a plan only after you see your doctor's recommendation"
```

### Update the sticky bottom CTA:

**OLD:** `[Start Your Assessment — Free]`
**NEW:** `[Start Your Free Assessment]` (same intent, slightly cleaner)

### In the "What You Get" list, add as FIRST item:

```
✓ Free specialist consultation (no payment until you see your treatment plan)
```

---

## CHANGE 2: Section 4.3 — Home Tab → Active Treatment Cards

### Add new card states for `AWAITING_PAYMENT` and `EXPIRED_UNPAID`:

Add to the edge cases list at end of Section 4.3:

```
- Treatment plan ready (awaiting payment) → card shows "Treatment Plan Ready" in green + [View Plan & Subscribe] CTA
- Treatment plan expired (didn't pay within 30 days) → card removed from Home. Visible in Activity tab as "Plan Expired"
```

---

## CHANGE 3: Section 11 — MAJOR RESTRUCTURE

### OLD Section 11 structure:
```
11. Plan Selection & Payment
  11.1 Plan Selection — shown after questionnaire + photos
  11.2 Payment (Razorpay Checkout) — immediately after plan selection
  11.3 Confirmation — "You're all set! Doctor will review within 24 hours"
```

### NEW Section 11 structure:
```
11. Assessment Submission, Treatment Plan & Payment
  11.1 Post-Assessment Submission (FREE) — shown after questionnaire + photos
  11.2 Treatment Plan Ready Screen (NEW) — shown after doctor creates plan
  11.3 Plan Selection — triggered from Treatment Plan Ready screen
  11.4 Payment (Razorpay Checkout) — after plan selection
  11.5 Subscription Confirmation — "You're all set! Medication being prepared"
```

See companion file `APP-PATIENT-UPDATED-SECTIONS.md` for full replacement content.

---

## CHANGE 4: Section 12 — Consultation Lifecycle Status Table

### OLD Status Table (12.1):
```
| Internal Status | Patient Sees | Patient Actions |
|----------------|-------------|-----------------|
| SUBMITTED | "Under Review — A doctor will review within 24 hours" | Wait, Message |
| AI_PROCESSING | "Under Review" | Wait |
| AI_COMPLETE | "Under Review" | Wait |
| ASSIGNED | "Doctor Assigned — Dr. [Name] is reviewing" | Message |
| REVIEWING | "Doctor is reviewing your case" | Message |
| INFO_REQUESTED | "Action Needed — Your doctor needs more information" | Respond |
| PRESCRIPTION_CREATED | "Treatment Plan Ready — Review your prescription" | View prescription PDF |
| TREATMENT_ACTIVE | "Treatment Active — Day [X]" | Message, View prescription, Reorder |
| FOLLOW_UP_DUE | "Check-in Due — Time for your review" | Start follow-up |
| COMPLETED | "Treatment Completed" | Start new assessment |
| CANCELLED | "Cancelled" | Start new assessment |
```

### NEW Status Table (12.1):
```
| Internal Status | Patient Sees | Patient Actions |
|----------------|-------------|-----------------|
| SUBMITTED | "Under Review — A doctor will review within 24 hours" | Wait, Message |
| AI_PROCESSING | "Under Review" (same) | Wait |
| AI_COMPLETE | "Under Review" (same) | Wait |
| ASSIGNED | "Doctor Assigned — Dr. [Name] is reviewing" | Message |
| REVIEWING | "Doctor is reviewing your case" | Message |
| MORE_INFO_REQUESTED | "Action Needed — Your doctor needs more information" | Respond |
| PRESCRIBED | "Treatment Plan Ready" (intermediate, brief) | — |
| AWAITING_PAYMENT | "Treatment Plan Ready — View your plan & subscribe" | View treatment plan, Select plan, Pay |
| PAYMENT_COMPLETE | "Subscription Active — Preparing your medication" | Track delivery |
| EXPIRED_UNPAID | "Plan Expired — Your treatment plan has expired" | Start new assessment |
| REFERRED | "Referral — Your doctor recommends in-person care" | View referral details |
| DECLINED | "Not a Candidate — See doctor's recommendation" | View details, Try different vertical |
| TREATMENT_ACTIVE | "Treatment Active — Day [X]" | Message, View prescription, Reorder |
| FOLLOW_UP_DUE | "Check-in Due — Time for your review" | Start follow-up |
| COMPLETED | "Treatment Completed" | Start new assessment |
| CANCELLED | "Cancelled" | Start new assessment |
```

**New statuses added:** `AWAITING_PAYMENT`, `PAYMENT_COMPLETE`, `EXPIRED_UNPAID`, `DECLINED`
**Renamed:** `INFO_REQUESTED` → `MORE_INFO_REQUESTED`, `PRESCRIPTION_CREATED` → `PRESCRIBED` (per canonical naming)

---

## CHANGE 5: Section 13.1 — Lab Booking → Lab Test Pricing Model

### OLD:
```
Lab tests are billed separately from the subscription — they are NOT included in the monthly/quarterly/6-month plan price.
```

### NEW:
```
**Initial lab panel (during free consultation):** The first blood panel ordered by the doctor during the initial consultation is FREE to the patient. This cost is absorbed as part of the customer acquisition cost and factored into subscription pricing. The patient does NOT pay separately for the first lab order.

**Follow-up lab panels (during active subscription):** Subsequent lab orders during an active subscription are included in the subscription — no additional charge.

**Standalone lab orders (no active subscription):** If a patient somehow has a lab order without an active subscription (edge case), the standard panel pricing applies.
```

Also update the note after the pricing table:
```
> **Note:** The pricing table above applies to standalone lab orders only. During the initial free consultation, the first panel is free. During an active subscription, follow-up panels are included.
```

---

## CHANGE 6: Section 16 — Wallet & Refunds

### Replace the refund policy section with simplified version:

**OLD refund scenarios include:**
- Cancellation before doctor review: 100% to wallet
- Cancellation after doctor review, before pharmacy: 75% to wallet

**NEW — Remove those two rows entirely.** Replace with:
```
| Patient doesn't proceed after free consultation | N/A | No payment was collected |
| Doctor refers or declines patient | N/A | No payment was collected |
| Cancellation after payment, before pharmacy dispatches | 100% | Wallet |
```

Add note:
> Since patients don't pay until after seeing their treatment plan, pre-consultation refunds are eliminated entirely.

---

## SECTIONS WITH NO CHANGES

| Section | Reason |
|---------|--------|
| §1 (App Structure) | No change |
| §2 (Authentication) | No change |
| §3 (Phone OTP) | No change |
| §6 (Activity Tab) | No change (delivery still starts after payment) |
| §7 (Messages) | No change |
| §8 (Profile) | No change |
| §9 (Questionnaire Engine) | No change |
| §10 (Photo Upload) | No change — still ends with "proceed to confirmation" but that now goes to 11.1 not plan selection |
| §14 (Medication Delivery) | Minor: delivery trigger note — "created after patient pays" not "after doctor prescribes" |
| §15 (Subscription Management) | No change |
| §17 (Notifications) | No change |
| §18 (PCOS Period Tracker) | No change |
| §19 (Discreet Mode) | No change |
| §20-25 | No changes |
