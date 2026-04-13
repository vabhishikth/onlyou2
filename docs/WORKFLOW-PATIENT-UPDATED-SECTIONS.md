# WORKFLOW-PATIENT.md — Updated Sections 12–15
# Replace OLD sections 12–15 entirely with these new sections

---

## 12. Post-Assessment Confirmation & Waiting (FREE)

### 12.1 Confirmation Screen

**Screen:** `treatment/confirmation.tsx`
**Shown after:** Questionnaire + photos (if required) submitted

```
✅ Assessment Submitted!

Your Hair Loss assessment has been submitted.
A doctor will review your case within 24 hours — completely free.

What happens next:
1. Our specialist doctor reviews your health profile and photos
2. You'll receive a personalized treatment plan
3. If you'd like to proceed, choose a plan and start receiving treatment

No payment required until you see your treatment plan.

[Go to Home]
```

### 12.2 State After Submission

- Home tab: "Under Review" treatment card with animated spinner
- Activity tab: consultation listed with `SUBMITTED` status → patient-facing: "Under Review — A doctor will review your case within 24 hours"
- Messages tab: new conversation created for this vertical → placeholder: "Your doctor will respond here once they've reviewed your case."
- **No payment collected. No plan selected. Patient is waiting for free doctor review.**

### 12.3 What Happens Behind the Scenes

1. AI pre-assessment runs (Section 11) — typically 15–60 seconds
2. Case enters doctor case queue (ordered by priority, SLA timer starts)
3. Admin can manually assign to a specific doctor, or auto-assignment picks the first available specialist for that vertical
4. Doctor sees AI summary + raw questionnaire data + photos
5. Typical review time: 3–8 minutes per case
6. Doctor chooses one of several actions (see Section 13)

### 12.4 Edge Cases — Waiting Period

| Scenario | What Happens |
|----------|-------------|
| Doctor hasn't reviewed within 24 hours | Internal SLA escalation to admin (admin dashboard alert). Patient does NOT see an SLA breach notification — the promise is "within 24 hours" and admin intervenes to meet it. |
| Patient messages doctor during "Under Review" | Message delivered to the doctor's queue. Doctor sees it when reviewing the case. |
| Patient wants to cancel before doctor reviews | No payment has been collected, so no refund needed. Patient can simply not proceed. Consultation record marked as `ABANDONED` if no activity for 30 days. |
| Patient submits assessment then tries to start same vertical again | "You already have an assessment under review for this condition. [View Status]" |
| Patient submits assessments for multiple verticals simultaneously | Allowed. Each assessment is independent and enters its own specialist queue. |

> **Anti-abuse safeguard:** One free initial consultation per vertical per user. If a patient received a treatment plan, chose not to subscribe, and later wants another consultation for the same vertical, they must subscribe first. The system tracks `free_consultation_used` per user per vertical.

*(Source: PROJECT-OVERVIEW.md Section 6)*

---

## 13. Doctor Review Outcomes (Patient Perspective)

After a doctor reviews the case (for free), ONE of the following outcomes occurs. The patient is notified for each. **No payment has been collected at this point.**

### 13.1 Outcome: Treatment Plan Created (Most Common)

- Doctor writes prescription using condition-specific template
- Status changes to `PRESCRIBED` → then `AWAITING_PAYMENT`
- Patient receives push notification: "Great news! Dr. [Name] has reviewed your case and created a personalized treatment plan."
- WhatsApp message: "Your doctor has reviewed your case. Open the app to see your personalized treatment plan. [Open App]"
- Home tab treatment card updates to: "Treatment Plan Ready — [View Your Plan]"
- Patient navigates to Treatment Plan Ready screen (Section 14)
- **Patient has NOT paid yet.** The treatment plan is shown to build trust and demonstrate value before payment.

*(Source: PROJECT-OVERVIEW.md Section 6, PORTAL-DOCTOR.md Section 12)*

### 13.2 Outcome: Blood Work Ordered (Before Prescribing)

- Doctor orders lab tests before prescribing (common for PCOS, sometimes Hair Loss, sometimes Weight)
- Status changes to `LAB_ORDERED`
- Prescription is delayed until lab results are reviewed by the doctor
- Patient notified: "Your doctor has ordered blood tests before creating your treatment plan. Please book a home collection or upload your own results."
- **No payment collected yet.** Blood work is part of the free consultation phase.
- **Lab work cost:** The first blood panel is included as part of the consultation at no charge to the patient. This cost is factored into the subscription price. Follow-up blood panels during an active subscription are also included. Only standalone lab orders outside a subscription are charged separately.
- Patient proceeds to Lab Booking flow (see Section 17)
- Once lab results are ready and reviewed, the doctor creates the treatment plan → patient then sees Treatment Plan Ready (Section 14)

*(Source: PROJECT-OVERVIEW.md Section 5, onlyou-spec-resolved-v4.md Section 5)*

### 13.3 Outcome: More Info Requested

- Doctor needs clarification or additional photos
- Status changes to `MORE_INFO_REQUESTED`
- Patient notified: "Your doctor needs more information about your case"
- Home tab shows red "Action Needed" badge
- **No payment collected yet.** Patient provides info for free.
- See Section 16 for full flow
- After patient responds, doctor re-reviews and proceeds to one of the other outcomes

*(Source: PORTAL-DOCTOR.md Section 14)*

### 13.4 Outcome: Referral (Cannot Treat via Telehealth)

- Doctor determines the patient needs in-person care that Onlyou cannot provide
- Status changes to `REFERRED`
- Patient notified: "Based on your case, your doctor recommends seeing a specialist in person."
- **No payment has been collected, so no refund is needed.**
- Referral details shown in app: recommended specialist type, reason for referral, nearest partner clinic (if available)
- Patient can start a new assessment for a different vertical if applicable
- Examples: severe gynecomastia needing surgery, advanced hair loss requiring transplant, ED with suspected Peyronie's disease

*(Source: PORTAL-DOCTOR.md Section 15)*

### 13.5 Outcome: Not a Candidate (Declined)

- Doctor determines the patient is not suitable for treatment (e.g., contraindications, condition too mild for medication, condition too severe for telehealth)
- Status changes to `DECLINED`
- Patient notified: "After reviewing your case, your doctor has determined that [reason]. We recommend [alternative]."
- **No payment has been collected, so no refund is needed.**
- This is different from a referral — the patient genuinely doesn't need or shouldn't have the treatment
- Examples: BMI below 23 (no weight management medication warranted), hair loss is cosmetic and too mild for prescription treatment, patient is already on conflicting medications that cannot be adjusted via telehealth, pregnant/breastfeeding (hard exclusion for most verticals)

### 13.6 Edge Cases — Doctor Review Outcomes

| Scenario | What Happens |
|----------|-------------|
| Doctor creates treatment plan but patient never proceeds to payment | Treatment plan remains visible for 30 days. Reminder notifications sent at +3 days, +7 days, +14 days. After 30 days, consultation marked as `EXPIRED_UNPAID`. Patient must start new assessment (free consultation already used for this vertical — next one requires subscription). |
| Doctor creates treatment plan and patient comes back 2 weeks later to pay | Treatment plan still valid (within 30-day window). Patient can proceed to plan selection and payment normally. |
| Patient received a treatment plan, didn't pay, and wants another free consultation for same vertical | Not allowed. System shows: "You previously received a treatment plan for this condition. To get updated recommendations, please subscribe to a plan." Links to plan selection with the existing treatment plan (if within 30 days) or requires new assessment with upfront plan commitment (if expired). |
| Patient received a REFERRAL or DECLINED outcome and wants to try again for same vertical | Allowed — one additional free consultation, since the first one didn't result in a usable treatment plan. System tracks outcomes per consultation, not just attempts. |
| Doctor takes more than 24 hours to review | SLA escalation to admin. Patient sees no change — still "Under Review." Admin reassigns to available doctor if needed. |
| Doctor reviews case but is unsure — wants a second opinion | Doctor uses internal notes to flag for admin. Admin assigns a second doctor for review. Patient sees no delay messaging beyond the normal "Under Review." |

---

## 14. Treatment Plan Ready & Plan Selection

### 14.1 Treatment Plan Presentation Screen

**Screen:** `treatment/plan-ready.tsx`
**Shown when:** Doctor has created a treatment plan (consultation status: `AWAITING_PAYMENT`)
**Accessed from:** Push notification deep link, Home tab "Treatment Plan Ready" card, or Activity tab

```
✅ Your Treatment Plan is Ready!

Dr. Priya Sharma, Dermatologist
has reviewed your case and created a personalized
treatment plan for Hair Loss.

─────────────────────────────────

YOUR DIAGNOSIS
Male Pattern Hair Loss (Norwood Type III)
Classification: Moderate

YOUR MEDICATIONS
💊 Finasteride 1mg — 1 tablet daily
💊 Minoxidil 5% Solution — Apply to scalp twice daily
💊 Biotin 10,000mcg — 1 tablet daily

TREATMENT DURATION
Ongoing (minimum 6 months recommended)

WHAT TO EXPECT
• Reduced hair shedding within 1–3 months
• Visible improvement in 3–6 months
• Ongoing treatment recommended for maintained results

[View Full Prescription PDF]

─────────────────────────────────

Subscribe to start receiving your treatment:

[Choose Your Plan →]
```

### 14.2 Key UX Principles for This Screen

1. **Trust is the goal.** The patient should feel: "A real doctor reviewed MY case and created THIS plan specifically for ME." This is the single most important conversion screen in the entire app.
2. **Doctor's name and credentials visible.** Shows the specific doctor who reviewed the case, with their specialty (e.g., "Dr. Priya Sharma, Dermatologist"). Humanizes the experience.
3. **Personalization is paramount.** Shows the patient's specific classification (e.g., "Norwood Type III"), their specific medications with dosages, and their expected timeline. This is NOT a generic page — every element is derived from the doctor's actual prescription.
4. **Prescription PDF available before payment.** The patient can view their full prescription PDF before deciding to pay. This is a deliberate trust signal — "we're not hiding anything behind a paywall."
5. **No pressure.** The patient can leave this screen and come back later. The treatment plan doesn't expire for 30 days. Reminder notifications are sent at +3, +7, and +14 days.
6. **Endowment effect.** Behavioral economics research shows that when someone feels ownership of a personalized item, they're significantly more likely to commit. This plan is "theirs" — the doctor created it for them.

### 14.3 Transition to Plan Selection

When patient taps `[Choose Your Plan →]`:

**Screen:** `treatment/plan-selection.tsx`

**Header context (shown above plan cards):**
```
Your treatment plan from Dr. [Name] includes:
✓ [Medication 1], [Medication 2], [Medication 3]
✓ Monthly medication delivery to your door
✓ Ongoing monitoring & follow-up check-ins
✓ Unlimited messaging with your doctor
```

Three plan cards:

| Plan | Badge | Description |
|------|-------|-------------|
| Monthly | — | Full monthly price, maximum flexibility |
| Quarterly | "Popular" | 11–17% savings depending on vertical, billed quarterly |
| 6-Month | "Best Value" | 17–25% savings depending on vertical, one-time payment |

> **⚠️ Note — Pre-existing source discrepancy:** PROJECT-OVERVIEW.md states savings ranges as "15–17% quarterly, 22–25% 6-month." However, actual math from the pricing table shows Weight Management (Standard) has only 11% quarterly savings and 17% 6-month savings — outside those stated ranges. All other verticals fall within the PROJECT-OVERVIEW ranges. The per-vertical pricing table below is authoritative.

**Pricing per vertical (authoritative source: onlyou-spec-resolved-v4.md Section 5):**

| Vertical | Monthly | Quarterly (per mo / total) | 6-Month (per mo / total) |
|----------|---------|---------------------------|-------------------------|
| Hair Loss | ₹999 | ₹833/mo (₹2,499) | ₹750/mo (₹4,499) |
| ED | ₹1,299 | ₹1,100/mo (₹3,299) | ₹1,000/mo (₹5,999) |
| PE | ₹1,299 | ₹1,100/mo (₹3,299) | ₹1,000/mo (₹5,999) |
| Weight (Standard) | ₹2,999 | ₹2,666/mo (₹7,999) | ₹2,500/mo (₹14,999) |
| Weight (GLP-1) | ₹9,999 | ₹8,333/mo (₹24,999) | ₹7,500/mo (₹44,999) |
| PCOS | ₹1,499 | ₹1,266/mo (₹3,799) | ₹1,167/mo (₹6,999) |

**GLP-1 tier (Phase 2 — Coming Soon):** Row displayed but greyed out with "Coming Soon" badge. Not tappable.

### 14.4 Plan Selection Interaction

1. Cards shown side by side (horizontal scroll on small screens)
2. Tap to select (radio-button style — only one selected at a time)
3. Selected card shows blue border + checkmark
4. Bottom section shows: "Your plan includes: Doctor-prescribed medications, delivered monthly • Ongoing monitoring & check-ins • Unlimited messaging with your doctor"
5. `[Continue to Payment]` button at bottom

### 14.5 Critical Technical Detail: 6-Month Plans

The 6-month plan is a one-time Razorpay payment, NOT a Razorpay subscription. Razorpay subscriptions only support monthly and quarterly billing cycles. This affects renewal flow (see Section 28).

### 14.6 Edge Cases — Treatment Plan & Plan Selection

| Scenario | What Happens |
|----------|-------------|
| Patient views treatment plan but doesn't select a plan | Plan remains available. Reminder notification sent at +3 days: "Your treatment plan from Dr. [Name] is waiting." +7 days: "Don't miss out — your personalized treatment plan expires in 23 days." +14 days: "Last reminder — your treatment plan expires in 16 days. [View Plan]" |
| Treatment plan expires (30 days without payment) | Consultation status → `EXPIRED_UNPAID`. Treatment card removed from Home. Patient must start new assessment. Free consultation already used for this vertical — system requires subscription commitment before new consultation. |
| Patient's treatment plan includes medications that require blood work first | This shouldn't occur. If blood work is needed, the doctor orders it first (Section 13.2) and only creates the treatment plan after reviewing lab results. |
| GLP-1 tier selected (Weight Management) | Toast: "GLP-1 treatment is coming soon. We'll notify you when it's available." Card is not selectable. |
| Patient has wallet balance | Shown on plan selection screen: "You have ₹[X] wallet balance that will be auto-applied at checkout." |
| Patient closes app during plan selection | No data lost. Treatment plan and selected plan (if any) are preserved. Patient returns to plan-ready screen on next app open. |

*(Source: APP-PATIENT.md Section 11, onlyou-spec-resolved-v4.md Section 5)*

---

## 15. Payment & Subscription Activation (Razorpay Checkout)

### 15.1 Pre-Checkout Summary

**Screen:** `treatment/payment.tsx`
**Shown after:** Patient selected a plan on the plan selection screen

```
Order Summary
─────────────────────────────────

Hair Loss — Monthly Plan
₹999/month

Prescribed by: Dr. Priya Sharma
Medications: Finasteride 1mg, Minoxidil 5%, Biotin 10,000mcg

─────────────────────────────────

Wallet balance: ₹200 (auto-applied)
[ ] Don't use wallet balance

─────────────────────────────────

Amount to pay: ₹799

[Pay ₹799]
```

- Wallet balance auto-applied if > 0
- Patient can toggle "Don't use wallet balance" to pay full amount via Razorpay
- Note: Wallet balance is NOT applied to future auto-renewals (Razorpay charges the full amount on recurring payments directly to the saved payment method)

### 15.2 Razorpay Checkout Flow

1. Patient taps `[Pay ₹799]`
2. App creates Razorpay order/subscription on backend: `trpc.payments.create.mutate({ ... })`
3. Razorpay checkout sheet opens (native overlay via `react-native-razorpay` SDK)
4. Available payment methods: UPI (GPay, PhonePe, Paytm), Credit/Debit Card, Net Banking
5. Prefilled: patient email, phone, name
6. Patient selects payment method and completes payment
7. Razorpay webhook fires to backend: `payment.authorized` or `subscription.activated`
8. Backend verifies via Razorpay API (dual verification — webhook + API poll)
9. Backend activates subscription, creates first medication order
10. Consultation status: `AWAITING_PAYMENT` → `PAYMENT_COMPLETE`
11. Prescription automatically enters pharmacy pipeline (see Section 22)
12. App receives success callback → navigates to subscription confirmation screen

### 15.3 Post-Payment Confirmation

**Screen:** `treatment/subscription-confirmed.tsx`

```
🎉 You're all set!

Your Hair Loss treatment subscription is now active.
Your first medication kit is being prepared.

What happens next:
1. Our pharmacy partner prepares your medications
2. A delivery person will bring them to your door
3. You'll receive an OTP to confirm delivery

Estimated delivery: 2–4 business days

[Go to Home]
```

### 15.4 State After Payment

- Home tab: Treatment card now shows "Treatment Active" with medication list and daily tracker
- Activity tab: Delivery order visible with status stepper (Preparing → Dispatched → Out for Delivery → Delivered)
- Messages tab: Conversation with doctor now fully active for ongoing questions
- Subscription visible in Profile > My Subscriptions with plan details, next billing date, and manage options
- Push notification: "Your first medication kit is being prepared! Estimated delivery: 2–4 business days."

### 15.5 Edge Cases — Payment

| Scenario | What Happens |
|----------|-------------|
| Payment failed (insufficient funds, declined) | Razorpay shows failure reason. Patient returns to plan selection. "Payment failed. Your treatment plan is saved. [Try Again]" |
| Payment cancelled (user dismissed checkout) | "Payment cancelled. Your treatment plan is saved. [Try Again]" — treatment plan not lost |
| Network timeout during payment | App checks payment status via Razorpay API before showing error (payment may have succeeded). If confirmed: proceed to confirmation. If unconfirmed: "We're checking your payment status. Please wait…" with auto-retry. |
| Duplicate webhook from Razorpay | Idempotent handling — Razorpay event ID stored, duplicate skipped. No double-charge. |
| UPI autopay limit (₹15,000/txn) exceeded | Shouldn't happen for any standard plan. If custom pricing exceeds: fallback to card payment. |
| Patient tries to pay for a vertical they already have an active subscription for | Backend rejects: "You already have an active subscription for this condition." |
| Razorpay checkout SDK crashes | Sentry captures error. Patient taps retry → fresh checkout initiated. |
| Patient paid but treatment plan was created > 7 days ago | Still valid (within 30-day window). Prescription sent to pharmacy immediately after payment confirmation. |
| Patient navigates away during Razorpay checkout | Razorpay handles this — payment either completes or doesn't. App checks status on return. Treatment plan preserved regardless. |

*(Source: APP-PATIENT.md Section 11, BACKEND-PART2A.md Section 13)*
