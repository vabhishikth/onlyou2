# WORKFLOW-PATIENT.md — Change Summary
## Payment Flow Redesign: "Pay After Doctor, Not Before"

---

## STRUCTURAL CHANGE: Section Reordering (11–15)

The OLD flow was: AI → Plan Selection → Payment → Wait for Doctor → Doctor Outcomes
The NEW flow is: AI → Wait for Doctor (FREE) → Doctor Outcomes → Treatment Plan → Plan Selection & Payment

### OLD Table of Contents (Sections 11–15):
```
11. AI Pre-Assessment (Background)
12. Plan Selection
13. Payment (Razorpay Checkout)
14. Post-Payment Confirmation & Waiting
15. Doctor Review Outcomes (Patient Perspective)
```

### NEW Table of Contents (Sections 11–15):
```
11. AI Pre-Assessment (Background) — minor update
12. Post-Assessment Confirmation & Waiting (FREE) — complete rewrite
13. Doctor Review Outcomes (Patient Perspective) — moved from old §15, rewritten for no-payment context
14. Treatment Plan Ready & Plan Selection — brand new section
15. Payment & Subscription Activation (Razorpay Checkout) — moved from old §13, reframed
```

**Impact:** Sections 16 onwards remain numbered the same. No other section renumbering needed.

---

## CHANGE 1: Table of Contents Lines

### OLD:
```
12. [Plan Selection](#12-plan-selection)
13. [Payment (Razorpay Checkout)](#13-payment-razorpay-checkout)
14. [Post-Payment Confirmation & Waiting](#14-post-payment-confirmation--waiting)
15. [Doctor Review Outcomes (Patient Perspective)](#15-doctor-review-outcomes-patient-perspective)
```

### NEW:
```
12. [Post-Assessment Confirmation & Waiting (FREE)](#12-post-assessment-confirmation--waiting-free)
13. [Doctor Review Outcomes (Patient Perspective)](#13-doctor-review-outcomes-patient-perspective)
14. [Treatment Plan Ready & Plan Selection](#14-treatment-plan-ready--plan-selection)
15. [Payment & Subscription Activation (Razorpay Checkout)](#15-payment--subscription-activation-razorpay-checkout)
```

---

## CHANGE 2: Section 11.2 — Minor Update

### OLD:
```
- Patient is either selecting a plan/paying (if plan selection happens before doctor review) or waiting for doctor assignment.
```

### NEW:
```
- Patient sees the Post-Assessment Confirmation screen (Section 12) — "Your assessment has been submitted. A doctor will review your case within 24 hours."
- No payment has been collected at this point. The patient has not selected a plan yet.
```

---

## CHANGE 3: Sections 12–15 — Complete Replacement

Delete everything from `## 12. Plan Selection` through to end of `## 15. Doctor Review Outcomes` (including all subsections), and replace with the 4 new sections in the companion file `WORKFLOW-PATIENT-UPDATED-SECTIONS.md`.

---

## CHANGE 4: Section 27.5 — Subscription Management Edge Case

### OLD row:
```
| Patient cancels then wants to restart immediately | Must start new assessment from Explore tab → questionnaire → payment. Previous medical records retained. |
```

### NEW row:
```
| Patient cancels then wants to restart immediately | Must start new assessment from Explore tab → questionnaire → free doctor review → treatment plan → payment. Previous medical records retained. Note: the free initial consultation has already been used for this vertical, so the system will require subscription commitment before a new consultation is processed. |
```

---

## CHANGE 5: Section 30 — Wallet & Refunds (Simplified Table)

### OLD Refund Scenarios Table:
```
| Cancellation (before doctor review) | 100% | Wallet |
| Cancellation (after doctor review, before pharmacy) | 75% | Wallet |
| Cancellation (medication already dispatched) | 0% | — |
| Delivery failed (platform fault) | 100% | Wallet or original payment method |
| Wrong medication delivered | 100% + replacement order | Wallet + new order |
| Subscription cancelled mid-cycle | Prorated remaining days | Wallet |
| Lab order cancelled (before nurse dispatch) | 100% | Wallet |
| Lab order cancelled (after nurse dispatched) | 50% | Wallet |
```

### NEW Refund Scenarios Table:
```
| Scenario | Refund Amount | Where | Notes |
|----------|-------------|-------|-------|
| Patient doesn't proceed after treatment plan | N/A | N/A | No payment was collected |
| Doctor refers or declines patient | N/A | N/A | No payment was collected |
| Cancellation (after payment, before pharmacy dispatches) | 100% | Wallet | Patient paid but medication hasn't shipped |
| Cancellation (medication already dispatched) | 0% | — | Delivery completes normally |
| Delivery failed (platform fault) | 100% | Wallet or original payment method | |
| Wrong medication delivered | 100% + replacement order | Wallet + new order | |
| Subscription cancelled mid-cycle | Prorated remaining days | Wallet | |
| Follow-up lab order cancelled (before nurse dispatch) | 100% | Wallet | Initial labs are free |
| Follow-up lab order cancelled (after nurse dispatched) | 50% | Wallet | Initial labs are free |
| Account deletion (active subscription) | Prorated remaining days | Original payment method | Per DPDPA compliance |
```

Add note after table:
> **Key simplification from "pay after doctor" model:** The most common refund scenarios in the old model — "cancellation before doctor review" (100% refund) and "cancellation after doctor review but before pharmacy" (75% refund) — are eliminated entirely. Since patients don't pay until after they've seen their treatment plan and chosen to proceed, the need for pre-treatment refunds is drastically reduced. This simplifies both the codebase and customer support operations.

---

## CHANGE 6: New Consultation Status Enum

4 new statuses added:
- `AWAITING_PAYMENT` — between PRESCRIBED and pharmacy pipeline. Patient has treatment plan but hasn't paid.
- `EXPIRED_UNPAID` — patient received treatment plan but didn't subscribe within 30 days.
- `PAYMENT_COMPLETE` — patient paid, triggers pharmacy pipeline.
- `DECLINED` — doctor determined patient is not a candidate (replaces old "refund" outcome).

Full updated flow:
```
SUBMITTED → AI_PROCESSING → AI_COMPLETE → ASSIGNED → REVIEWING
    → MORE_INFO_REQUESTED (loop back to REVIEWING)
    → PRESCRIBED → AWAITING_PAYMENT → PAYMENT_COMPLETE → PHARMACY_PROCESSING → DISPATCHED → DELIVERED → TREATMENT_ACTIVE → FOLLOW_UP_DUE
    → REFERRED (no payment collected)
    → DECLINED (no payment collected)
    → EXPIRED_UNPAID (treatment plan not paid within 30 days)
```

---

## SECTIONS WITH NO CHANGES (16+)

| Section | Status |
|---------|--------|
| 16: Doctor Requests More Info | No change (happens before payment, same as before) |
| 17: Blood Work / Lab Tests | No change (now before payment as part of free consultation) |
| 18: Lab Home Collection | No change |
| 19: Self-Upload Lab Results | No change |
| 20: Lab Results Received | No change |
| 21: Prescription Created | Minor note: also triggers Treatment Plan Ready (§14) |
| 22: Medication Delivery | No change (starts after payment) |
| 23: Delivery OTP | No change |
| 24: Treatment Active | No change |
| 25: Messaging | No change |
| 26: Follow-Up Check-Ins | No change |
| 27: Subscription Management | Minor edge case update (Change 4 above) |
| 28: Auto-Reorder & Renewal | No change |
| 29: Payment Failure & Retry | No change (applies to renewal payments only) |
| 30: Wallet & Refunds | Refund table update (Change 5 above) |
| 31–36 | No changes |
