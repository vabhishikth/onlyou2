# REMAINING DOCS — Change Summary
## LANDING-PAGE.md, PORTAL-DOCTOR.md, PORTAL-ADMIN.md, WORKFLOW-DOCTOR-PART2.md
## Payment Flow Redesign: "Pay After Doctor, Not Before"

---

## OVERVIEW

| Document | Change Level | Key Changes |
|----------|-------------|-------------|
| **LANDING-PAGE.md** | MEDIUM | "How It Works" steps, pricing section notes, condition page template, FAQ updates, testing checklist |
| **PORTAL-DOCTOR.md** | LIGHT | Prescription action outcome note, status flow §23 update |
| **PORTAL-ADMIN.md** | LIGHT | Refund policy simplification, new "Awaiting Payment" monitoring |
| **WORKFLOW-DOCTOR-PART2.md** | MEDIUM | Status transition table §25, prescription workflow §18, refund flow §22, close case §23 |

---

# LANDING-PAGE.md CHANGES

---

## CHANGE LP-1: Section 4.3 — Homepage "How It Works" (3-Step Section)

### UPDATE Step 2:

**OLD:**
```
**Step 2: Doctor Reviews**
- Icon: Doctor with stethoscope (abstract)
- Title: "A specialist reviews your case"
- Description: "A licensed dermatologist, urologist, or endocrinologist reviews your AI-prepared case file."
```

**NEW:**
```
**Step 2: Free Doctor Review**
- Icon: Doctor with stethoscope (abstract)
- Title: "A specialist reviews your case — free"
- Description: "A licensed dermatologist, urologist, or endocrinologist reviews your AI-prepared case file and creates a personalized treatment plan. You see the plan before paying anything."
```

### ADD after Step 3 description:

```
> **Key message:** The first two steps are completely free. You only pay when you've seen your personalized treatment plan from a real doctor and decide to proceed with treatment.
```

---

## CHANGE LP-2: Section 4.1 — Hero Section CTA

### No change needed.

The primary CTA already says `[Start Your Free Assessment →]` — this naturally aligns with the free consultation model. No text change required.

---

## CHANGE LP-3: Section 4.5 — Pricing Preview Section

### UPDATE the fine print:

**OLD:**
```
**Fine print:** "Prices include consultation, prescription, medication, and doorstep delivery. First blood panel included when clinically indicated; follow-up panels charged separately (₹800-₹4,500). GLP-1 weight management plans available from ₹7,500/mo (limited availability)."
```

**NEW:**
```
**Fine print:** "Your first doctor consultation is free — you only pay when you see your personalized treatment plan. Subscription prices include prescription, medication, and doorstep delivery. First blood panel included when clinically indicated; follow-up panels charged separately (₹800-₹4,500). GLP-1 weight management plans available from ₹7,500/mo (limited availability)."
```

---

## CHANGE LP-4: Section 4.6 — Homepage FAQ

### UPDATE FAQ #1:

**OLD:**
```
1. **How does Onlyou work?** — Three-step process summary (questionnaire → doctor → delivery)
```

**NEW:**
```
1. **How does Onlyou work?** — Three-step process summary (questionnaire → free doctor review → see your treatment plan → subscribe & receive treatment). Emphasize that the consultation is free — no payment until the patient sees their personalized plan.
```

### UPDATE FAQ #5:

**OLD:**
```
5. **What's included in the subscription?** — AI assessment, doctor consultation, prescription, medication, delivery, ongoing check-ins (per PROJECT-OVERVIEW.md Section 5)
```

**NEW:**
```
5. **What's included in the subscription?** — Prescription medication, discreet doorstep delivery, ongoing check-ins, unlimited doctor messaging, follow-up blood panels when needed, auto-reorder on renewal. Note: the initial doctor consultation and AI assessment are free for everyone, even before subscribing. (per PROJECT-OVERVIEW.md Section 5)
```

### ADD FAQ #11 (new):

```
11. **Is the doctor consultation really free?** — Yes. Every patient gets a free specialist consultation. A real doctor reviews your case, creates a personalized treatment plan, and you can see the exact medications and timeline before paying anything. You only pay if you choose to proceed with treatment. One free consultation per condition.
```

---

## CHANGE LP-5: Section 10 — Condition Page Template (Shared Structure)

### UPDATE Section 5 in the template:

**OLD:**
```
5. **How Onlyou Treats [Condition]** — 3-step recap (questionnaire → doctor → treatment), specific to this condition's flow
```

**NEW:**
```
5. **How Onlyou Treats [Condition]** — 3-step recap (questionnaire → free doctor review & treatment plan → subscribe & receive treatment), specific to this condition's flow. Emphasize that the doctor creates a personalized plan before any payment.
```

### UPDATE Section 9 in the template:

**OLD:**
```
9. **What's Included** — Bulleted list: AI assessment, specialist consultation, prescription, medication delivery, ongoing check-ins, first blood panel (when indicated)
```

**NEW:**
```
9. **What's Included** — Two-part list:
   - **Free (before payment):** AI health assessment, specialist doctor consultation, personalized treatment plan, first blood panel (when clinically indicated)
   - **Subscription (after payment):** Prescription medication, monthly discreet delivery, ongoing check-ins, unlimited doctor messaging, follow-up blood panels, auto-reorder
```

---

## CHANGE LP-6: Section 11 — Pricing Page

### ADD after the "What's included" checklist:

```
**Free before you subscribe:** "Your specialist consultation is free. See your personalized treatment plan — including your specific diagnosis, prescribed medications, and timeline — before paying anything."
```

---

## CHANGE LP-7: Section 12 — How It Works Page (Expanded)

### This page is an expanded version of the homepage "How It Works." UPDATE to reflect the 4-step model:

**OLD implied flow:**
```
Step 1: Health Assessment → Step 2: Doctor Reviews → Step 3: Treatment Delivered
```

**NEW expanded flow:**
```
Step 1: Complete a Private Health Assessment (free)
  - "Answer condition-specific questions from your phone..."
  
Step 2: A Specialist Reviews Your Case (free)
  - "A licensed doctor reviews your AI-prepared case file and creates a personalized treatment plan tailored to your specific condition."
  - "You'll see your doctor's name, your diagnosis, the exact medications prescribed, and the expected timeline — all before paying anything."

Step 3: Choose Your Plan
  - "Once you've reviewed your treatment plan, choose the subscription that works for you: Monthly, Quarterly, or 6-Month."
  - "Every plan includes medication, delivery, and ongoing monitoring."

Step 4: Treatment Delivered to Your Door
  - "Your medication is prepared by a licensed pharmacy and delivered in discreet packaging..."
```

---

## CHANGE LP-8: Section 14 — Refund Policy Page

### UPDATE to reflect simplified refund model:

### ADD at the top of the refund policy content:

```
**Important:** Your initial doctor consultation is free. You only pay when you choose to subscribe after seeing your treatment plan. This means most common refund scenarios are eliminated — you won't need a refund for a consultation you never paid for.

**Refund policy applies to paid subscriptions only:**
```

### SIMPLIFY the refund scenarios (remove pre-consultation refund rows):

```
OLD rows to remove:
- "Cancellation before doctor review: 100% refund"
- "Cancellation after doctor review, before pharmacy: 75% refund"

These scenarios no longer exist because no payment is collected before or during doctor review.
```

---

## CHANGE LP-9: Section 28 — Testing Checklist

### UPDATE the "Cross-Reference Accuracy Checks" section:

**REPLACE this item:**
```
- [ ] Subscription "what's included" matches PROJECT-OVERVIEW.md Section 5
```

**WITH:**
```
- [ ] "What's Free" section matches PROJECT-OVERVIEW.md Section 5 (AI assessment, doctor consultation, treatment plan, first blood panel)
- [ ] "What's Included in Subscription" matches PROJECT-OVERVIEW.md Section 5 (medication, delivery, check-ins, messaging)
- [ ] "How It Works" steps reflect free consultation model (no payment before treatment plan)
```

### REPLACE the known cross-system issue note:

**OLD:**
```
**⚠️ Known Cross-System Issue — APP-PATIENT.md Pricing:** APP-PATIENT.md Section 11.1 contains stale/incorrect pricing from an earlier spec version...
```

**NEW:**
```
**✅ Resolved — APP-PATIENT.md Pricing:** APP-PATIENT.md Section 11 has been restructured (see APP-PATIENT-CHANGES.md). Pricing is now in §11.3 (plan selection) with correct values matching this spec. The free consultation flow is in §11.1 and §11.2.
```

---

## LANDING-PAGE.md — SECTIONS WITH NO CHANGES

| Section | Reason |
|---------|--------|
| §1 (Purpose & Scope) | No change |
| §2 (Site Architecture) | No change |
| §3 (Design System) | No change |
| §4.2 (Trust Badges) | No change — trust messaging still accurate |
| §4.4 (Condition Cards) | No change — cards still link to condition pages |
| §5-9 (Individual condition pages) | Minor — each inherits from template (LP-5) |
| §13 (About page) | No change |
| §15 (Blog) | No change |
| §16-20 (App Download, SEO, Structured Data, Responsive, Performance) | No change |
| §21 (Header/Footer) | No change — CTA already says "Start Your Free Assessment" |
| §22-26 (Analytics, Accessibility, Security, Deployment, Content) | No change |

---

# PORTAL-DOCTOR.md CHANGES

---

## CHANGE PD-1: Section 12 — Prescription Builder (Post-Action Note)

### ADD note after the prescription submission flow:

```
> **Post-prescription flow (pay-after-doctor model):** When a doctor submits a prescription,
> the consultation status transitions: REVIEWING → PRESCRIBED → AWAITING_PAYMENT (auto).
> The prescription does NOT immediately enter the pharmacy pipeline. Instead, the patient
> receives a push notification ("Treatment Plan Ready"), views their personalized plan
> (including prescription PDF), and chooses whether to subscribe.
>
> The pharmacy pipeline only starts when the patient pays (AWAITING_PAYMENT → PAYMENT_COMPLETE).
> This is a change from the original model where prescription immediately triggered the
> pharmacy. Doctors do NOT need to do anything differently — the prescription workflow is
> identical. The difference is downstream (payment before pharmacy, not before doctor).
```

---

## CHANGE PD-2: Section 15 — Doctor Actions: Refund → Decline

### In the doctor's action options, UPDATE the "Refund" action:

**OLD:**
```
**Refund:** Doctor determines patient cannot be treated. Issues full or partial refund.
```

**NEW:**
```
**Decline:** Doctor determines patient is not a candidate for treatment. Consultation closed with status `DECLINED`. Patient is notified and no charge is incurred (patient hasn't paid yet). If, in rare edge cases, the patient has already paid (e.g., follow-up consultation under active subscription), the existing refund request flow applies.
```

### ADD new action option:

```
**Close Case (No Treatment):** For cases where the doctor determines no treatment is needed (e.g., mild condition, lifestyle changes sufficient). Status → `COMPLETED`. No charge to patient.
```

---

## CHANGE PD-3: Section 23 — Status Flow Diagram

### UPDATE the status flow to include new statuses:

### ADD after `PRESCRIPTION_CREATED`:

```
PRESCRIPTION_CREATED
    │
    ▼ (auto-transition)
AWAITING_PAYMENT     ← Patient views treatment plan, decides whether to subscribe
    │
    ├──→ EXPIRED_UNPAID  ← 30 days, no payment (doctor not involved)
    │
    ▼ (patient pays)
PAYMENT_COMPLETE     ← Subscription activated, pharmacy pipeline begins
    │
    ▼
PHARMACY_PROCESSING  ← (continues existing flow)
```

### ADD `DECLINED` as a terminal status alongside `REFERRED` and `COMPLETED`:

```
REVIEWING → DECLINED  (Doctor determines patient not a candidate — no charge)
```

### UPDATE the transition table to include:

```
| `PRESCRIPTION_CREATED` | System auto-transition | `AWAITING_PAYMENT` | System | Treatment plan shown to patient |
| `AWAITING_PAYMENT` | Patient completes payment | `PAYMENT_COMPLETE` | System | Subscription created, order created |
| `AWAITING_PAYMENT` | 30 days expire without payment | `EXPIRED_UNPAID` | System | BullMQ job fires |
| `REVIEWING` | Doctor declines patient | `DECLINED` | Doctor | Patient notified, no charge |
```

---

## PORTAL-DOCTOR.md — SECTIONS WITH NO CHANGES

| Section | Reason |
|---------|--------|
| §1-4 (Auth, Layout, Dashboard) | No change |
| §5-11 (Case Review, AI, Questionnaire, Photos, Labs, Messages, Actions) | No change — doctor reviews same way |
| §12 (Prescription Builder) | Workflow unchanged — only post-action note added |
| §13-14 (Blood Work, More Info) | No change |
| §16-22 (Patient Directory, Detail, Stats, Profile, Messages, Notifications) | No change |
| §24-29 (Follow-up, Keyboard, Responsive, Errors, Security, Analytics) | No change |

---

# PORTAL-ADMIN.md CHANGES

---

## CHANGE PA-1: Overview Tab — New "Awaiting Payment" Metrics

### ADD to the admin dashboard Overview tab metrics:

```
**New metric cards:**
- "Awaiting Payment" — count of consultations in AWAITING_PAYMENT status
- "Expiring Soon" — count of AWAITING_PAYMENT consultations with 7 or fewer days remaining
- "Expired This Week" — count of consultations that moved to EXPIRED_UNPAID this week
- "Free-to-Paid Conversion Rate" — PAYMENT_COMPLETE / (PAYMENT_COMPLETE + EXPIRED_UNPAID) × 100
```

---

## CHANGE PA-2: Admin Dashboard — New Sub-Tab or Section

### ADD to the admin dashboard (could be a new sub-tab under "Consultations" or a dedicated section):

```
### Awaiting Payment Management

**Purpose:** Monitor treatment plans waiting for patient payment

**Table columns:**
- Patient (anonymous ID or name)
- Condition
- Doctor who created plan
- Treatment plan created date
- Days remaining (of 30-day window)
- Status indicator: Green (0-7 days), Amber (8-20 days), Red (21-30 days)
- Actions: [Send Reminder] [Extend Expiry] [View Plan]

**Filters:** All | Expiring Soon (< 7 days) | Expired

**Bulk actions:**
- Send reminder to all amber/red cases
- Export list (CSV)

**[Send Reminder]** — Triggers push + WhatsApp notification to patient
**[Extend Expiry]** — Admin can extend the 30-day window by 7/14/30 additional days (requires reason)
```

---

## CHANGE PA-3: Refund Policy Section

### UPDATE the admin refund management section:

### ADD note:

```
> **Simplified refund model:** With the pay-after-doctor flow, the two most common refund
> scenarios are eliminated:
> - "Before doctor review" refunds (100%) — eliminated (patient hasn't paid)
> - "After doctor review, before pharmacy" refunds (75%) — eliminated (patient hasn't paid)
>
> Remaining refund scenarios:
> 1. After payment, before pharmacy dispatches → 100% to wallet
> 2. Delivery failure → 100% to wallet or original payment
> 3. Wrong medication → 100% + replacement
> 4. Subscription cancellation mid-cycle → prorated to wallet
```

---

## CHANGE PA-4: Section 24 — Plan Management

### ADD note about free consultation tracking:

```
**Free Consultation Tracking:**
- Admin can view free consultation usage per patient per vertical
- `FreeConsultationTracker` table: patient ID, condition, used (boolean), consultation ID
- Admin can manually reset a patient's free consultation flag (e.g., if first consultation was system error)
- Admin can see conversion funnel: Assessments Submitted → Treatment Plans Created → Subscriptions Activated
```

---

## PORTAL-ADMIN.md — SECTIONS WITH NO CHANGES

| Section | Reason |
|---------|--------|
| Auth, Layout, User Management | No change |
| Partner Management (nurses, labs, pharmacies) | No change |
| Lab Order Management | No change |
| Delivery Management | No change |
| Notification Templates | No change (new events added in backend, admin template editor unchanged) |
| Settings, Audit Log, Feature Flags | No change |

---

# WORKFLOW-DOCTOR-PART2.md CHANGES

---

## CHANGE WD-1: Section 18 — Prescription Workflow

### ADD after the existing prescription submission steps:

```
### 18.X Post-Prescription: What Happens Next (Pay-After-Doctor Model)

When a doctor submits a prescription, the following happens automatically:

1. Prescription PDF generated and stored in S3
2. Consultation status: `REVIEWING` → `PRESCRIPTION_CREATED` (brief transitional state)
3. System auto-transitions: `PRESCRIPTION_CREATED` → `AWAITING_PAYMENT`
4. Patient receives push notification: "Your treatment plan is ready!"
5. Treatment plan expiry timer starts (30 days)
6. Reminder notifications scheduled: +3 days, +7 days, +14 days

**What does NOT happen:**
- Medication order is NOT created yet
- Prescription does NOT enter pharmacy pipeline
- No payment is collected

**The doctor's job is done.** The patient now views the treatment plan and decides whether to subscribe. If the patient pays, the system handles order creation and pharmacy routing automatically. If the patient doesn't pay within 30 days, the plan expires.

> **For the doctor, the workflow is identical to the old model.** The doctor reviews, prescribes, and moves to the next case. The payment timing is transparent to the doctor.
```

---

## CHANGE WD-2: Section 22 — Refund Flow

### UPDATE the refund trigger:

**OLD:**
```
Doctor determines patient cannot be treated → requests refund → admin approves
```

**NEW:**
```
> **Primary path (no payment to refund):** If the doctor determines a patient cannot be treated
> during the initial (free) consultation, the consultation is closed as `DECLINED` or `REFERRED`.
> No refund is needed because no payment was collected.
>
> **Secondary path (active subscriber):** If refund is needed for an active subscriber
> (e.g., follow-up consultation reveals the medication is ineffective or contraindicated),
> the existing refund request flow applies:
> 1. Doctor clicks "Request Refund" → enters amount and reason
> 2. Create `RefundRequest` record with status `PENDING_APPROVAL`
> 3. Notify admin
> 4. Admin reviews and approves/rejects
```

---

## CHANGE WD-3: Section 25 — Status Transition Table

### UPDATE the transition table to include new statuses:

### ADD rows:

```
| `PRESCRIPTION_CREATED` | Auto-transition | `AWAITING_PAYMENT` | System | Treatment plan shown to patient, expiry timer starts |
| `AWAITING_PAYMENT` | Patient pays | `PAYMENT_COMPLETE` | System | Subscription created, first medication order created |
| `AWAITING_PAYMENT` | 30 days expire | `EXPIRED_UNPAID` | System | BullMQ job, patient notified |
| `PAYMENT_COMPLETE` | Order enters pharmacy | `PHARMACY_PROCESSING` | System | Auto-transition |
| `REVIEWING` | Doctor declines patient | `DECLINED` | Doctor | No payment collected, patient notified |
```

### UPDATE the existing `PRESCRIPTION_CREATED` row:

**OLD:**
```
| `REVIEWING` | Doctor submits prescription | `PRESCRIPTION_CREATED` | Doctor | PDF generated, order created, notifications sent |
```

**NEW:**
```
| `REVIEWING` | Doctor submits prescription | `PRESCRIPTION_CREATED` | Doctor | PDF generated, auto-transitions to AWAITING_PAYMENT. Order NOT created until payment. |
```

### UPDATE the cross-reference note (§25.3):

### ADD to the existing cross-reference note:

```
> **New statuses (pay-after-doctor model):**
> - `AWAITING_PAYMENT` — treatment plan created, waiting for patient to subscribe
> - `PAYMENT_COMPLETE` — patient paid, triggers pharmacy pipeline
> - `EXPIRED_UNPAID` — 30 days without payment, terminal
> - `DECLINED` — doctor determined patient not a candidate, terminal, no payment
> - `ABANDONED` — patient started assessment but no activity for 30 days, terminal
>
> See BACKEND-ALL-CHANGES.md for complete enum definition and transition map.
```

---

## CHANGE WD-4: Section 23 — Close Case

### UPDATE the close case outcomes:

### ADD `DECLINED` as a distinct action from "Close Case":

```
### 23.X Decline Patient (New Action)

When a doctor determines a patient is not a candidate for treatment (different from "close case — no treatment needed"):

**Trigger:** Doctor clicks "✗ Decline" in Actions panel

**Decline Dialog:**
```
┌──────────────────────────────────────────────────────────┐
│  Decline this patient?                                    │
│                                                          │
│  Reason: [Select ▼]                                      │
│  • Contraindication (specify medication)                 │
│  • Condition too severe for telehealth                   │
│  • Not a suitable candidate                              │
│  • Other (specify)                                       │
│                                                          │
│  Patient message: [________________________]             │
│  (Explain why and suggest alternatives)                  │
│                                                          │
│  ⚠️ The patient has not been charged. This will close     │
│  the consultation with no payment collected.             │
│                                                          │
│  [Cancel]                              [Decline Patient] │
└──────────────────────────────────────────────────────────┘
```

**Backend actions:**
1. Consultation status → `DECLINED`
2. Patient notified: "After reviewing your case, Dr. [Name] has determined that our platform may not be the best fit for your needs. [Doctor's message with reason and alternatives]"
3. Free consultation flag: Reset for this vertical (patient can try again if circumstances change)
4. Audit log entry
```

---

## WORKFLOW-DOCTOR-PART2.md — SECTIONS WITH NO CHANGES

| Section | Reason |
|---------|--------|
| §11 (Case Review Workspace) | No change — same layout and API |
| §12-16 (AI, Questionnaire, Photos, Labs, Messages tabs) | No change |
| §17 (Actions Panel) | Minor — add "Decline" button alongside existing actions |
| §19 (Blood Work Ordering) | No change |
| §20 (Request More Info) | No change |
| §21 (Referral) | Minor — note "no charge to patient" |
| §24 (Follow-up Handling) | No change |

---

# OTHER DOCS — NO CHANGES NEEDED

| Document | Reason |
|----------|--------|
| **PORTAL-NURSE-FIXED.md** | No change — nurse workflow (visit, collect, deliver) is unaffected by payment timing |
| **PORTAL-LAB-FIXED.md** | No change — lab workflow (receive, process, upload) is unaffected |
| **PORTAL-PHARMACY.md** | No change — pharmacy still receives orders after payment (which is now after doctor, but pharmacy doesn't care about the upstream flow) |
| **WORKFLOW-NURSE-PART1/2/3** | No change |
| **WORKFLOW-DOCTOR-PART1** | No change — case queue, filtering, sort is unaffected |
| **WORKFLOW-DOCTOR-PART3** | No change — patient directory, stats, settings, security unaffected |
| **ARCHITECTURE.md** | Light — consultation status enum in architecture overview should reference BACKEND-ALL-CHANGES.md for canonical list. No structural change. |
| **DOCTOR-WORKFLOW-VERIFICATION-REPORT.md** | Reference doc — no changes needed (issues it flagged are being fixed) |
| **backend-errors-report.md** | Reference doc — the status enum issues it flagged are now resolved in BACKEND-ALL-CHANGES.md |

---

# GRAND SUMMARY — ALL CHANGES ACROSS ALL REMAINING DOCS

| Change ID | Document | Section | Description |
|-----------|----------|---------|-------------|
| LP-1 | LANDING-PAGE | §4.3 | "How It Works" Step 2 → "Free Doctor Review" |
| LP-2 | LANDING-PAGE | §4.1 | Hero CTA — no change needed (already says "Free Assessment") |
| LP-3 | LANDING-PAGE | §4.5 | Pricing fine print — add free consultation note |
| LP-4 | LANDING-PAGE | §4.6 | FAQ #1, #5 updated, #11 new (free consultation FAQ) |
| LP-5 | LANDING-PAGE | §10 | Condition page template — "How Onlyou Treats" + "What's Included" updated |
| LP-6 | LANDING-PAGE | §11 | Pricing page — add "free before you subscribe" note |
| LP-7 | LANDING-PAGE | §12 | How It Works page — expand to 4 steps |
| LP-8 | LANDING-PAGE | §14 | Refund policy — simplify, note free consultation |
| LP-9 | LANDING-PAGE | §28 | Testing checklist — update cross-reference checks |
| PD-1 | PORTAL-DOCTOR | §12 | Prescription post-action note (pharmacy delayed until payment) |
| PD-2 | PORTAL-DOCTOR | §15 | "Refund" action → "Decline" action |
| PD-3 | PORTAL-DOCTOR | §23 | Status flow + transition table: new statuses |
| PA-1 | PORTAL-ADMIN | Overview | New "Awaiting Payment" metrics |
| PA-2 | PORTAL-ADMIN | New section | Awaiting Payment management table |
| PA-3 | PORTAL-ADMIN | Refunds | Simplified refund model note |
| PA-4 | PORTAL-ADMIN | §24 | Free consultation tracking for admin |
| WD-1 | WORKFLOW-DOCTOR-PART2 | §18 | Post-prescription flow (pay-after-doctor) |
| WD-2 | WORKFLOW-DOCTOR-PART2 | §22 | Refund flow — primary path is now "no refund needed" |
| WD-3 | WORKFLOW-DOCTOR-PART2 | §25 | Status transition table — 5 new rows |
| WD-4 | WORKFLOW-DOCTOR-PART2 | §23 | New "Decline Patient" action with dialog |
