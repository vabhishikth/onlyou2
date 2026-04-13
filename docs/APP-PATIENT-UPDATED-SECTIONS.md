# APP-PATIENT.md — Updated Sections
# Payment Flow Redesign: "Pay After Doctor, Not Before"

---

## SECTION 11 — FULL REPLACEMENT

Delete everything in old Section 11 (Plan Selection & Payment) and replace with:

---

## 11. Assessment Submission, Treatment Plan & Payment

### 11.1 Post-Assessment Submission (FREE)

**Screen:** `treatment/confirmation.tsx`
**Shown after:** Questionnaire + photos (if required) completed. This is the screen the patient sees immediately after finishing the assessment.

```
✅ Assessment Submitted!

Your Hair Loss assessment has been submitted.
A specialist doctor will review your case within 24 hours — completely free.

What happens next:
1. Our specialist reviews your health profile and photos
2. You'll receive a personalized treatment plan
3. If you'd like to proceed, choose a plan and start treatment

No payment required until you see your treatment plan.

[Go to Home]
```

**After submission:**
- Home tab now shows "Under Review" treatment card with animated spinner
- Activity tab shows consultation with `SUBMITTED` status → patient-facing: "Under Review — A doctor will review your case within 24 hours"
- Messages tab: new conversation created for this vertical → placeholder: "Your doctor will respond here once they've reviewed your case."
- **No payment collected. No plan selected. Patient is waiting for free doctor review.**

**What happens behind the scenes:**
1. AI pre-assessment runs (typically 15–60 seconds) — patient does NOT see this as a separate step
2. Case enters doctor queue (priority-ordered, SLA timer starts)
3. Doctor reviews AI summary + raw questionnaire + photos (3–8 min per case)
4. Doctor chooses an action → patient is notified of the outcome (see Section 12)

> **Anti-abuse safeguard:** One free initial consultation per vertical per user. System tracks `free_consultation_used` per user per vertical. If a patient received a treatment plan, chose not to subscribe, and later wants another consultation for the same vertical, they must subscribe first.

### 11.2 Treatment Plan Ready Screen (NEW)

**Screen:** `treatment/plan-ready.tsx`
**Shown when:** Doctor has created a treatment plan (consultation status: `AWAITING_PAYMENT`)
**Accessed from:** Push notification deep link, Home tab "Treatment Plan Ready" card, or Activity tab
**Trigger:** Doctor submits prescription → status moves to `PRESCRIBED` → system immediately transitions to `AWAITING_PAYMENT` → push notification sent to patient

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

**Data source:** All fields on this screen are populated from the doctor's actual prescription record:
- Doctor name + specialty: from `doctor` table joined via `consultation.assignedDoctorId`
- Diagnosis + classification: from `prescription.diagnosis` and `aiAssessment.classification`
- Medications: from `prescription.medications[]` (name, dosage, frequency, instructions)
- Treatment duration: from `prescription.recommendedDuration`
- What to expect: from vertical-specific content mapped to the classification level

**Key UX principles:**
1. **Trust is the goal.** Patient should feel: "A real doctor reviewed MY case and created THIS plan for ME."
2. **Doctor's name and credentials visible.** Humanizes the experience.
3. **Personalization is paramount.** Shows patient's specific classification, specific medications, specific timeline. NOT a generic page.
4. **Prescription PDF viewable before payment.** Deliberate trust signal — "we're not hiding anything behind a paywall."
5. **No pressure.** Patient can leave and come back. Treatment plan valid for 30 days.
6. **Endowment effect.** Personalized plan creates psychological ownership → higher conversion.

**Reminder notifications for unpaid treatment plans:**
- +3 days: "Your treatment plan from Dr. [Name] is waiting. [View Plan]"
- +7 days: "Don't miss out — your personalized treatment plan expires in 23 days."
- +14 days: "Last reminder — your treatment plan expires in 16 days. [View Plan]"
- +30 days: Plan expires → status: `EXPIRED_UNPAID` → card removed from Home

### 11.3 Plan Selection

**Screen:** `treatment/plan-selection.tsx`
**Shown when:** Patient taps `[Choose Your Plan →]` on the Treatment Plan Ready screen

**Header context (above plan cards):**
```
Your treatment plan from Dr. [Name] includes:
✓ Finasteride 1mg, Minoxidil 5%, Biotin 10,000mcg
✓ Monthly medication delivery to your door
✓ Ongoing monitoring & follow-up check-ins
✓ Unlimited messaging with your doctor
```

**Three plan cards:**

| Plan | Price | Savings | Badge |
|------|-------|---------|-------|
| Monthly | ₹X/mo | — | — |
| Quarterly | ₹X/mo | Save Y% | "Popular" |
| 6-Month | ₹X/mo | Save Z% | "Best Value" |

**Pricing per vertical (source: onlyou-spec-resolved-v4.md Section 5):**

| Vertical | Monthly | Quarterly | 6-Month |
|----------|---------|-----------|---------|
| Hair Loss | ₹999 | ₹833/mo (₹2,499 total) | ₹750/mo (₹4,499 total) |
| ED | ₹1,299 | ₹1,100/mo (₹3,299 total) | ₹1,000/mo (₹5,999 total) |
| PE | ₹1,299 | ₹1,100/mo (₹3,299 total) | ₹1,000/mo (₹5,999 total) |
| Weight (Standard) | ₹2,999 | ₹2,666/mo (₹7,999 total) | ₹2,500/mo (₹14,999 total) |
| Weight (GLP-1) | ₹9,999 | ₹8,333/mo (₹24,999 total) | ₹7,500/mo (₹44,999 total) |
| PCOS | ₹1,499 | ₹1,266/mo (₹3,799 total) | ₹1,167/mo (₹6,999 total) |

**GLP-1 tier — Phase 2 (Coming Soon):**
- GLP-1 row displayed but **greyed out** with "Coming Soon" badge overlay
- Not tappable — tap shows toast: "GLP-1 treatment is coming soon. We'll notify you when it's available."
- If patient's BMI qualifies for GLP-1 (BMI 35+): show note about upcoming program + set `glp1_interest` flag

**6-Month plan:** One-time Razorpay payment, NOT a Razorpay subscription. Razorpay subscriptions only support monthly and quarterly billing cycles.

**Plan card interaction:**
- Tap to select (radio-button style — only one selected at a time)
- Selected card shows blue border + checkmark
- `[Continue to Payment]` button at bottom

**Edge cases:**
- Patient has wallet balance → shown: "You have ₹X wallet balance that will be auto-applied at checkout."
- Patient already has active subscription for this vertical → backend rejects: "You already have an active subscription for this condition."

### 11.4 Payment (Razorpay Checkout)

**Screen:** `treatment/payment.tsx`
**Shown after:** Patient selected a plan

**Pre-checkout summary:**
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

**Razorpay Checkout integration:**
- Uses `react-native-razorpay` SDK
- Opens Razorpay checkout sheet (overlay)
- Payment methods available: UPI (GPay, PhonePe, Paytm), Credit/Debit Card, Net Banking
- Prefilled: patient email, phone, name

**Payment flow:**
1. Create Razorpay order/subscription on backend: `trpc.payments.create.mutate({ ... })`
2. Open Razorpay checkout with order/subscription ID
3. Patient completes payment
4. Razorpay webhook hits backend: `payment.authorized` or `subscription.activated`
5. Backend verifies via Razorpay API (dual verification — webhook + API poll)
6. Backend activates subscription, creates first medication order
7. Consultation status: `AWAITING_PAYMENT` → `PAYMENT_COMPLETE`
8. Prescription automatically enters pharmacy pipeline
9. App receives success callback → navigate to subscription confirmation screen

**Idempotent processing:**
- Store Razorpay event ID → check before processing → skip duplicates
- Daily reconciliation cron job compares local subscription state with Razorpay API

**Error handling:**
- Payment failed → Razorpay shows failure reason → patient returns to plan selection. "Payment failed. Your treatment plan is saved. [Try Again]"
- Payment cancelled (user dismissed) → "Payment cancelled. Your treatment plan is saved. [Try Again]"
- Network timeout during payment → check payment status via API before showing error (may have succeeded)
- Duplicate webhook → idempotent handling (skip if already processed)
- UPI autopay limit exceeded (₹15,000/txn) → shouldn't happen for any plan, but fallback to card
- Razorpay checkout SDK crashes → Sentry captures error, patient taps retry → fresh checkout

### 11.5 Subscription Confirmation

**Screen:** `treatment/subscription-confirmed.tsx`
**Shown after:** Payment successful

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

**After confirmation:**
- Home tab: Treatment card shows "Treatment Active" with medication list and daily tracker
- Activity tab: Delivery order visible with status stepper (Preparing → Dispatched → Delivered)
- Messages tab: Conversation with doctor now fully active for ongoing questions
- Subscription visible in Profile > My Subscriptions

---

## SECTION 12.1 — STATUS TABLE REPLACEMENT

Replace the status table in Section 12.1 with:

### 12.1 Status Flow (Patient-Facing)

The internal consultation statuses map to simplified patient-facing labels:

| Internal Status | Patient Sees | Home Tab Card | Patient Actions |
|----------------|-------------|---------------|-----------------|
| `SUBMITTED` | "Under Review — A doctor will review your case within 24 hours" | "Under Review" + spinner | Wait, Message doctor |
| `AI_PROCESSING` | "Under Review" (same — patient doesn't see AI step) | "Under Review" + spinner | Wait |
| `AI_COMPLETE` | "Under Review" (same) | "Under Review" + spinner | Wait |
| `ASSIGNED` | "Doctor Assigned — Dr. [Name] is reviewing your case" | "Under Review" + doctor name | Message doctor |
| `REVIEWING` | "Doctor is reviewing your case" | "Under Review" + doctor name | Message doctor |
| `MORE_INFO_REQUESTED` | "Action Needed — Your doctor needs more information" | Red "Action Needed" badge | Respond (text or photos) |
| `PRESCRIBED` | (Brief transitional state) | — | — |
| `AWAITING_PAYMENT` | "Treatment Plan Ready — View your plan & subscribe" | Green "Treatment Plan Ready" + [View Plan & Subscribe] | View treatment plan, Select plan, Pay |
| `PAYMENT_COMPLETE` | "Subscription Active — Preparing your medication" | "Preparing Medication" + spinner | Track delivery |
| `EXPIRED_UNPAID` | "Plan Expired — Your treatment plan has expired" | Card removed | Start new assessment |
| `REFERRED` | "Referral — Your doctor recommends in-person care" | "Referred" badge | View referral details |
| `DECLINED` | "Not a Candidate — See doctor's recommendation" | "Not Eligible" badge | View details, Try different vertical |
| `TREATMENT_ACTIVE` | "Treatment Active — Day [X]" | Active card with day counter | Message, View prescription, Reorder |
| `FOLLOW_UP_DUE` | "Check-in Due — Time for your [X] review" | "Check-in Due" + [Start Check-in] | Start follow-up questionnaire |
| `COMPLETED` | "Treatment Completed" | Card removed | Start new assessment if needed |
| `CANCELLED` | "Cancelled" | Card removed | Start new assessment |

> **New statuses added for pay-after-doctor flow:**
> - `AWAITING_PAYMENT` — Doctor created treatment plan, patient hasn't paid yet. This is the key conversion moment.
> - `PAYMENT_COMPLETE` — Patient paid, medication order created, entering pharmacy pipeline.
> - `EXPIRED_UNPAID` — Patient received treatment plan but didn't subscribe within 30 days. Free consultation used.
> - `DECLINED` — Doctor determined patient is not a candidate for treatment. No payment collected.

> **Renamed for canonical consistency:**
> - `INFO_REQUESTED` → `MORE_INFO_REQUESTED` (matches PORTAL-DOCTOR.md)
> - `PRESCRIPTION_CREATED` → `PRESCRIBED` (matches BACKEND-PART1.md canonical)

---

## SECTION 13.1 — LAB PRICING UPDATE

Replace the Lab Test Pricing Model paragraph in Section 13.1 with:

### Lab Test Pricing Model

**Initial lab panel (during free consultation phase):**
The first blood panel ordered by the doctor during the initial (free) consultation is at **no additional charge** to the patient. This cost is absorbed as part of the customer acquisition cost and factored into subscription pricing. The patient does NOT pay separately for the first lab order. This applies regardless of whether the patient eventually subscribes.

**Follow-up lab panels (during active subscription):**
Subsequent lab orders during an active subscription are **included in the subscription** — no additional charge to the patient.

**Standalone lab orders (edge case):**
If a patient somehow has a lab order without an active subscription (rare edge case), the standard panel pricing below applies and payment is collected at booking confirmation via Razorpay.

| Test Panel | Standalone Price | Used For |
|-----------|-----------------|----------|
| Extended Hair Panel | ₹1,200 | Hair Loss — thyroid, iron, vitamin D, DHT |
| PCOS Screen Panel | ₹1,500 | PCOS — hormones, glucose, lipids |
| Metabolic Panel | ₹1,800 | Weight Management — HbA1c, lipids, liver, kidney |
| Basic Health Check | ₹800 | ED/PE — testosterone, glucose, lipids |
| Follow-up Panel | ₹600–₹1,200 | Varies by vertical — subset of initial panel |

> **Note:** The pricing table above applies to standalone lab orders only. During the initial free consultation, the first panel is free. During an active subscription, follow-up panels are included. This resolves the previously noted discrepancy between APP-PATIENT.md (which said labs are billed separately) and PROJECT-OVERVIEW.md / onlyou-spec-resolved-v4.md / PORTAL-LAB-FIXED.md (which said first panel is included). The authoritative answer: first panel free, subscription panels included, standalone panels charged.

---

## SECTION 14.1 — DELIVERY TRIGGER UPDATE

In Section 14.1, replace the trigger list:

### OLD:
```
Delivery orders are created automatically when:
- Doctor creates a prescription (first order)
- Auto-reorder triggers on subscription renewal date
- Patient manually requests a reorder
```

### NEW:
```
Delivery orders are created automatically when:
- Patient completes payment after receiving treatment plan (first order) — prescription enters pharmacy pipeline only after payment confirmation
- Auto-reorder triggers on subscription renewal date
- Patient manually requests a reorder

> **Important:** The first delivery order is NOT created when the doctor writes the prescription. It is created when the patient pays. The prescription exists in `AWAITING_PAYMENT` state until payment is confirmed, at which point the backend creates the medication order and sends it to the pharmacy pipeline.
```
