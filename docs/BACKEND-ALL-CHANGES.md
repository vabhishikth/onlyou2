# BACKEND (ALL PARTS) — Change Summary
## Payment Flow Redesign: "Pay After Doctor, Not Before"

---

## OVERVIEW: Changes by Backend Part

| Part | Sections Affected | Severity |
|------|------------------|----------|
| **PART1** | §9 (Consultation Status Enum + Transitions), §10 (Prescription Service) | HEAVY |
| **PART2A** | §11 (Orders — creation trigger), §14 (Payments — flow restructure), §15 (Notifications — new events) | HEAVY |
| **PART2B** | §17 (Wallet — refund simplification), §18 (SLA — new status checks), §19 (BullMQ — new jobs) | MEDIUM |
| **PART3A** | §22 (CASL — new status permissions), §25 (Seed Data — new statuses) | LIGHT |
| **PART3B** | §29 (Testing — new test cases), §30.3 (Appendix — status flow diagram) | MEDIUM |

---

# BACKEND-PART1 CHANGES

---

## CHANGE B1-1: Section 9.1 — Consultation Status Enum (REWRITE)

> **Note:** BACKEND-PART1 §9 already has known issues from `backend-errors-report.md` (wrong status names like `PENDING_REVIEW`, `IN_REVIEW`, `PRESCRIBED`, etc.). This change both fixes those pre-existing issues AND adds the new pay-after-doctor statuses.

### OLD Consultation Status Enum (from §9.1):
```
SUBMITTED → AI_PROCESSING → PENDING_REVIEW → IN_REVIEW → PRESCRIBED / BLOOD_WORK_ORDERED / MORE_INFO_REQUESTED / REFERRED / CLOSED
```

### NEW Consultation Status Enum:
```typescript
enum ConsultationStatus {
  // Phase 1: Assessment submitted (FREE — no payment yet)
  SUBMITTED           // Patient completed questionnaire + photos
  AI_PROCESSING       // BullMQ job: Claude API analyzing case
  AI_FAILED           // Claude API error (retryable 3x, falls back to manual)
  AI_COMPLETE         // AI assessment ready, case enters doctor queue

  // Phase 2: Doctor review (FREE — still no payment)
  ASSIGNED            // Doctor opened case or admin assigned
  REVIEWING           // Doctor actively reviewing (30s on page or first action)
  MORE_INFO_REQUESTED // Doctor needs clarification from patient
  LAB_ORDERED         // Doctor ordered blood work before prescribing (labs are free during initial consultation)

  // Phase 3: Doctor decision — treatment plan or exit
  PRESCRIBED          // Doctor created treatment plan (brief transitional state)
  AWAITING_PAYMENT    // Treatment plan shown to patient, waiting for subscription payment ← NEW
  EXPIRED_UNPAID      // Patient didn't pay within 30 days ← NEW
  REFERRED            // Doctor refers to in-person specialist (no payment collected)
  DECLINED            // Doctor determined patient is not a candidate (no payment collected) ← NEW

  // Phase 4: Payment received — treatment begins
  PAYMENT_COMPLETE    // Patient subscribed and paid ← NEW
  PHARMACY_PROCESSING // Prescription sent to pharmacy partner
  DISPATCHED          // Medication shipped
  DELIVERED           // Delivery confirmed via OTP

  // Phase 5: Ongoing treatment
  TREATMENT_ACTIVE    // Patient on active treatment, day counter starts
  FOLLOW_UP_DUE       // Check-in timer fires (4 weeks / 3 months / 6 months)

  // Terminal states
  COMPLETED           // Treatment finished normally
  CANCELLED           // Patient or admin cancelled
  ABANDONED           // No activity for 30 days during free consultation phase ← NEW
}
```

### NEW statuses added (6 total):
| Status | Purpose | When |
|--------|---------|------|
| `AWAITING_PAYMENT` | Treatment plan created, patient hasn't paid | Doctor submits prescription → system auto-transitions |
| `EXPIRED_UNPAID` | Patient received plan but didn't subscribe in 30 days | BullMQ scheduled job fires at day 30 |
| `PAYMENT_COMPLETE` | Patient paid, triggers pharmacy pipeline | Razorpay webhook confirms payment |
| `DECLINED` | Doctor determined patient not a candidate | Doctor action — no payment collected |
| `ABANDONED` | Patient started free consultation but disappeared | BullMQ job checks for 30-day inactivity |
| `AI_FAILED` | AI processing error (already existed conceptually, now explicit) | Claude API error after 3 retries |

---

## CHANGE B1-2: Section 9.2 — Valid Transitions Map (REWRITE)

### NEW `validTransitions` map:
```typescript
const validTransitions: Record<ConsultationStatus, ConsultationStatus[]> = {
  SUBMITTED:           ['AI_PROCESSING'],
  AI_PROCESSING:       ['AI_COMPLETE', 'AI_FAILED'],
  AI_FAILED:           ['AI_PROCESSING', 'AI_COMPLETE'],  // Retry or manual completion
  AI_COMPLETE:         ['ASSIGNED'],
  ASSIGNED:            ['REVIEWING'],
  REVIEWING:           ['MORE_INFO_REQUESTED', 'LAB_ORDERED', 'PRESCRIBED', 'REFERRED', 'DECLINED', 'COMPLETED'],
  MORE_INFO_REQUESTED: ['REVIEWING'],                      // Patient responds → back to reviewing
  LAB_ORDERED:         ['REVIEWING'],                      // Lab results received → doctor re-reviews
  PRESCRIBED:          ['AWAITING_PAYMENT'],               // Auto-transition: plan shown to patient
  AWAITING_PAYMENT:    ['PAYMENT_COMPLETE', 'EXPIRED_UNPAID'], // Patient pays or plan expires
  EXPIRED_UNPAID:      [],                                 // Terminal — patient must start new assessment
  PAYMENT_COMPLETE:    ['PHARMACY_PROCESSING'],            // Auto-transition: order created
  PHARMACY_PROCESSING: ['DISPATCHED'],
  DISPATCHED:          ['DELIVERED'],
  DELIVERED:           ['TREATMENT_ACTIVE'],
  TREATMENT_ACTIVE:    ['FOLLOW_UP_DUE', 'COMPLETED', 'CANCELLED'],
  FOLLOW_UP_DUE:       ['REVIEWING'],                     // Follow-up enters review cycle
  REFERRED:            [],                                 // Terminal (no payment collected)
  DECLINED:            [],                                 // Terminal (no payment collected)
  COMPLETED:           [],                                 // Terminal
  CANCELLED:           [],                                 // Terminal
  ABANDONED:           [],                                 // Terminal
};
```

### Key flow difference from OLD:
```
OLD: SUBMITTED → AI → pay → doctor reviews → prescribes → pharmacy
NEW: SUBMITTED → AI → doctor reviews (free) → prescribes → AWAITING_PAYMENT → patient pays → pharmacy
```

---

## CHANGE B1-3: Section 9 — Add `transitionConsultationStatus` method update

### In the `transitionConsultationStatus()` method, add auto-transition logic:

```typescript
// After doctor submits prescription:
// PRESCRIBED is a brief transitional state — auto-advance to AWAITING_PAYMENT
if (newStatus === 'PRESCRIBED') {
  // Create the treatment plan record, generate prescription PDF
  // Then immediately transition:
  await this.transitionConsultationStatus(consultationId, 'AWAITING_PAYMENT', 'system');
  // Send push notification to patient: "Your treatment plan is ready!"
  this.eventEmitter.emit('notification.send', {
    userId: consultation.patientId,
    event: 'treatment_plan_ready',
    data: { consultationId, doctorName: assignedDoctor.name },
  });
}

// After payment confirmed:
// PAYMENT_COMPLETE auto-advances to PHARMACY_PROCESSING
if (newStatus === 'PAYMENT_COMPLETE') {
  // Create medication order → send to pharmacy pipeline
  await this.ordersService.createFirstOrder(consultationId);
  await this.transitionConsultationStatus(consultationId, 'PHARMACY_PROCESSING', 'system');
}
```

---

## CHANGE B1-4: Section 10.1 — Prescription Service Status Check

### OLD (also fixes pre-existing bug from backend-errors-report.md):
```typescript
if (!['IN_REVIEW', 'BLOOD_WORK_ORDERED'].includes(consultation.status)) {
```

### NEW:
```typescript
if (!['REVIEWING', 'LAB_ORDERED'].includes(consultation.status)) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Consultation must be in REVIEWING or LAB_ORDERED status to create prescription',
  });
}
```

---

## CHANGE B1-5: Section 10 — Add note about prescription-payment decoupling

### ADD after §10.1 `createPrescription()`:

```
> **IMPORTANT — Pay-after-doctor flow:** Creating a prescription does NOT trigger the pharmacy pipeline.
> The prescription is created and the consultation transitions to AWAITING_PAYMENT.
> The pharmacy pipeline is only triggered when the patient completes payment (PAYMENT_COMPLETE).
> This is handled in the payments webhook handler (BACKEND-PART2A §14), not in the prescription service.
```

---

# BACKEND-PART2A CHANGES

---

## CHANGE B2A-1: Section 14.1 — Architecture Overview (REWRITE)

### OLD:
```
Patient selects plan
  → Backend creates Razorpay Order (one-time) or Subscription (monthly/quarterly)
  → Frontend opens Razorpay Checkout SDK
  → Patient pays via UPI / Card / Net Banking
  → Razorpay webhook → POST /api/webhooks/razorpay
  → Backend verifies via Razorpay API (dual verification)
  → Activate subscription, create first medication order
  → Daily reconciliation cron job compares local state with Razorpay API
```

### NEW:
```
Doctor creates treatment plan (prescription)
  → Consultation status: PRESCRIBED → AWAITING_PAYMENT
  → Patient views treatment plan in app (free)
  → Patient selects plan (Monthly/Quarterly/6-Month)
  → Backend creates Razorpay Order (one-time) or Subscription (monthly/quarterly)
  → Frontend opens Razorpay Checkout SDK
  → Patient pays via UPI / Card / Net Banking
  → Razorpay webhook → POST /api/webhooks/razorpay
  → Backend verifies via Razorpay API (dual verification)
  → Consultation status: AWAITING_PAYMENT → PAYMENT_COMPLETE
  → Activate subscription, create first medication order, trigger pharmacy pipeline
  → Daily reconciliation cron job compares local state with Razorpay API
```

### Key differences:
1. Payment is initiated AFTER doctor creates treatment plan, not before
2. `createPayment` now requires a `consultationId` with status `AWAITING_PAYMENT`
3. Payment webhook transitions consultation from `AWAITING_PAYMENT` → `PAYMENT_COMPLETE`
4. Medication order creation happens in the payment webhook handler, not in the prescription service

---

## CHANGE B2A-2: Section 14.3 — `createPayment()` method

### ADD validation at the top of `createPayment()`:

```typescript
async createPayment(input: CreatePaymentInput, patientId: string) {
  const { condition, plan, walletDeduction, consultationId } = input;  // ← consultationId now required

  // Validate consultation exists and is in correct state
  const consultation = await this.prisma.consultation.findUnique({
    where: { id: consultationId },
  });

  if (!consultation) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Consultation not found' });
  }

  if (consultation.status !== 'AWAITING_PAYMENT') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Payment can only be created for consultations with a treatment plan (AWAITING_PAYMENT status)',
    });
  }

  if (consultation.patientId !== patientId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your consultation' });
  }

  // Check anti-abuse: if this is a second attempt after EXPIRED_UNPAID, block
  // (handled by the consultation creation logic — patient can't get here without valid AWAITING_PAYMENT)

  const pricing = this.getPricing(condition, plan);
  // ... rest of existing payment logic
```

### Update the Razorpay order/subscription `notes` to include `consultationId`:

```typescript
notes: { condition, plan, patientId, consultationId },  // ← add consultationId
```

---

## CHANGE B2A-3: Section 14.3 — Payment Webhook Handler Updates

### In `handleSubscriptionActivated()` and `handlePaymentCaptured()`, ADD:

```typescript
// After payment is confirmed, transition consultation and create order:

private async activateSubscriptionAndCreateOrder(subscriptionId: string): Promise<void> {
  const subscription = await this.prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { consultation: true },
  });

  if (!subscription) return;

  // 1. Activate subscription
  await this.prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: this.calculatePeriodEnd(subscription.plan),
    },
  });

  // 2. Transition consultation: AWAITING_PAYMENT → PAYMENT_COMPLETE
  if (subscription.consultationId) {
    await this.consultationService.transitionStatus(
      subscription.consultationId,
      'PAYMENT_COMPLETE',
      'system',
    );
    // This auto-triggers PHARMACY_PROCESSING and order creation (see BACKEND-PART1 §9)
  }

  // 3. Notify patient
  this.eventEmitter.emit('notification.send', {
    userId: subscription.patientId,
    event: 'subscription_activated',
    data: {
      condition: subscription.condition,
      plan: subscription.plan,
    },
  });
}
```

---

## CHANGE B2A-4: Section 14.2 — Prisma Schema Updates

### ADD `consultationId` to Subscription model:

```prisma
model Subscription {
  // ... existing fields ...

  consultationId        String?           // Links subscription to the consultation that generated it ← NEW
  consultation          Consultation?     @relation(fields: [consultationId], references: [id])

  // ... rest of fields ...
}
```

### ADD to Consultation model (if not already present):

```prisma
model Consultation {
  // ... existing fields ...

  subscription          Subscription?     // Created when patient pays ← NEW
  treatmentPlanExpiresAt DateTime?        // 30 days after AWAITING_PAYMENT ← NEW

  // ... rest of fields ...
}
```

---

## CHANGE B2A-5: Section 11 — Orders Module

### In §11, update the order creation trigger documentation:

### OLD trigger:
```
Order is created when doctor submits prescription (PRESCRIPTION_CREATED status).
```

### NEW trigger:
```
> **Order creation trigger:** The first medication order is created when the patient
> completes payment (PAYMENT_COMPLETE status), NOT when the doctor creates the
> prescription. The prescription exists in AWAITING_PAYMENT state until payment.
>
> Subsequent orders (auto-reorders) are created by Razorpay subscription renewal
> webhooks, same as before.
>
> createFirstOrder(consultationId):
>   1. Fetch prescription for this consultation
>   2. Create Order record with status SENT_TO_PHARMACY
>   3. Emit 'order.created' event → triggers pharmacy notification
>   4. Consultation transitions: PAYMENT_COMPLETE → PHARMACY_PROCESSING
```

---

## CHANGE B2A-6: Section 15 — Notifications Module

### ADD new notification events:

```typescript
// New events for pay-after-doctor flow:

'treatment_plan_ready': {
  trigger: 'Consultation transitions to AWAITING_PAYMENT',
  channels: ['push', 'whatsapp'],
  patientMessage: 'Great news! Dr. {doctorName} has reviewed your case and created a personalized treatment plan. Open the app to view your plan.',
  discreetMessage: 'Onlyou: New update available',
},

'treatment_plan_reminder_3d': {
  trigger: 'BullMQ scheduled job — 3 days after AWAITING_PAYMENT',
  channels: ['push'],
  patientMessage: 'Your treatment plan from Dr. {doctorName} is waiting. Tap to view.',
  discreetMessage: 'Onlyou: Reminder',
},

'treatment_plan_reminder_7d': {
  trigger: 'BullMQ scheduled job — 7 days after AWAITING_PAYMENT',
  channels: ['push', 'whatsapp'],
  patientMessage: 'Don\'t miss out — your personalized treatment plan expires in 23 days.',
  discreetMessage: 'Onlyou: Reminder',
},

'treatment_plan_reminder_14d': {
  trigger: 'BullMQ scheduled job — 14 days after AWAITING_PAYMENT',
  channels: ['push', 'whatsapp'],
  patientMessage: 'Last reminder — your treatment plan expires in 16 days.',
  discreetMessage: 'Onlyou: Important reminder',
},

'treatment_plan_expired': {
  trigger: 'BullMQ scheduled job — 30 days after AWAITING_PAYMENT',
  channels: ['push', 'whatsapp'],
  patientMessage: 'Your treatment plan has expired. Start a new assessment to get an updated plan.',
  discreetMessage: 'Onlyou: Update',
},

'subscription_activated': {
  trigger: 'Payment confirmed, subscription active',
  channels: ['push', 'whatsapp'],
  patientMessage: 'Your {condition} subscription is active! Your first medication kit is being prepared. Estimated delivery: 2-4 business days.',
  discreetMessage: 'Onlyou: Order confirmed',
},
```

---

## CHANGE B2A-7: Section 13 — Lab Orders — Free Initial Panel

### ADD note to §13 (Lab Orders):

```
> **Free initial lab panel:** When a doctor orders blood work during the initial
> (free) consultation phase, the lab order is created without any patient payment.
> The cost is absorbed as customer acquisition cost. The `labOrder.paymentStatus`
> field should be set to `WAIVED_INITIAL` for these orders.
>
> Follow-up lab panels during an active subscription are also included (no charge).
> Only standalone lab orders outside a subscription use the standard pricing table.
```

### ADD to LabOrder Prisma model:

```prisma
model LabOrder {
  // ... existing fields ...

  paymentStatus         LabPaymentStatus  @default(PENDING)  // ← NEW
  // ... rest ...
}

enum LabPaymentStatus {
  PENDING           // Awaiting payment (standalone orders)
  WAIVED_INITIAL    // Free — initial consultation lab order ← NEW
  INCLUDED          // Free — included in active subscription ← NEW
  PAID              // Patient paid (standalone order)
}
```

---

# BACKEND-PART2B CHANGES

---

## CHANGE B2B-1: Section 19 — BullMQ Jobs — New Scheduled Jobs

### ADD to the BullMQ job definitions:

```typescript
// Treatment plan expiry job — scheduled when consultation enters AWAITING_PAYMENT
{
  queue: 'treatment-plan',
  jobs: {
    'treatment-plan-reminder-3d': {
      delay: 3 * 24 * 60 * 60 * 1000,  // 3 days
      data: { consultationId, type: 'reminder_3d' },
      handler: 'Send treatment_plan_reminder_3d notification',
    },
    'treatment-plan-reminder-7d': {
      delay: 7 * 24 * 60 * 60 * 1000,  // 7 days
      data: { consultationId, type: 'reminder_7d' },
      handler: 'Send treatment_plan_reminder_7d notification',
    },
    'treatment-plan-reminder-14d': {
      delay: 14 * 24 * 60 * 60 * 1000,  // 14 days
      data: { consultationId, type: 'reminder_14d' },
      handler: 'Send treatment_plan_reminder_14d notification',
    },
    'treatment-plan-expire': {
      delay: 30 * 24 * 60 * 60 * 1000,  // 30 days
      data: { consultationId },
      handler: async (consultationId) => {
        const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } });
        if (consultation?.status === 'AWAITING_PAYMENT') {
          await consultationService.transitionStatus(consultationId, 'EXPIRED_UNPAID', 'system');
          // Send treatment_plan_expired notification
        }
        // If patient already paid (status != AWAITING_PAYMENT), job is a no-op
      },
    },
    'consultation-abandon-check': {
      delay: 30 * 24 * 60 * 60 * 1000,  // 30 days
      data: { consultationId },
      handler: async (consultationId) => {
        const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } });
        if (consultation?.status === 'SUBMITTED' || consultation?.status === 'AI_COMPLETE') {
          await consultationService.transitionStatus(consultationId, 'ABANDONED', 'system');
        }
      },
    },
  },
}
```

### ADD: When consultation enters AWAITING_PAYMENT, schedule all 4 jobs:

```typescript
// In consultation status transition handler:
if (newStatus === 'AWAITING_PAYMENT') {
  await this.treatmentPlanQueue.add('treatment-plan-reminder-3d', { consultationId }, { delay: 3 * DAY });
  await this.treatmentPlanQueue.add('treatment-plan-reminder-7d', { consultationId }, { delay: 7 * DAY });
  await this.treatmentPlanQueue.add('treatment-plan-reminder-14d', { consultationId }, { delay: 14 * DAY });
  await this.treatmentPlanQueue.add('treatment-plan-expire', { consultationId }, { delay: 30 * DAY });
}

// If patient pays (PAYMENT_COMPLETE), cancel all pending reminder/expiry jobs:
if (newStatus === 'PAYMENT_COMPLETE') {
  await this.treatmentPlanQueue.removeJobs(consultationId); // Cancel scheduled reminders
}
```

---

## CHANGE B2B-2: Section 17 — Wallet & Refunds

### UPDATE refund scenarios:

### REMOVE these scenarios (patient hasn't paid yet):
```
- Cancellation before doctor review: 100% to wallet
- Cancellation after doctor review, before pharmacy: 75% to wallet
```

### ADD note:
```
> **Simplified refund model:** Since patients don't pay until after receiving their
> treatment plan, the two most common refund scenarios (before doctor review, after
> doctor review but before pharmacy) are eliminated. Refunds now only apply to:
> 1. Cancellation after payment but before pharmacy dispatches (100% to wallet)
> 2. Delivery failures (100% to wallet or original payment method)
> 3. Wrong medication (100% + replacement)
> 4. Subscription cancellation mid-cycle (prorated to wallet)
```

---

## CHANGE B2B-3: Section 18 — SLA Engine — New Status Checks

### ADD to SLA check logic:

```typescript
// New SLA check: AWAITING_PAYMENT cases approaching expiry
async checkAwaitingPaymentSLAs(): Promise<void> {
  // Cases in AWAITING_PAYMENT for > 7 days without activity
  // → Flag in admin dashboard as "at risk of expiry"
  // This is informational only — no auto-action except the scheduled expiry job
  const atRiskCases = await this.prisma.consultation.findMany({
    where: {
      status: 'AWAITING_PAYMENT',
      updatedAt: { lt: new Date(Date.now() - 7 * DAY) },
    },
  });

  for (const c of atRiskCases) {
    await this.adminService.flagAtRisk(c.id, 'Treatment plan unpaid for 7+ days');
  }
}
```

---

# BACKEND-PART3A CHANGES

---

## CHANGE B3A-1: Section 22 — CASL Rules

### ADD permissions for new statuses:

```typescript
// Patient permissions for AWAITING_PAYMENT consultations:
case 'PATIENT':
  // ... existing rules ...
  can('read', 'Consultation', { patientId: userId, status: 'AWAITING_PAYMENT' });
  can('read', 'Prescription', { consultation: { patientId: userId, status: 'AWAITING_PAYMENT' } });
  // Patient can view their treatment plan (prescription PDF) before paying
  // Patient CANNOT modify the consultation or prescription — read only
  break;
```

---

## CHANGE B3A-2: Section 25 — Seed Data

### ADD new consultation statuses to seed data:

```typescript
// In seed.ts — consultation status enum seed:
const consultationStatuses = [
  'SUBMITTED', 'AI_PROCESSING', 'AI_FAILED', 'AI_COMPLETE',
  'ASSIGNED', 'REVIEWING', 'MORE_INFO_REQUESTED', 'LAB_ORDERED',
  'PRESCRIBED', 'AWAITING_PAYMENT', 'EXPIRED_UNPAID',     // ← NEW
  'PAYMENT_COMPLETE',                                       // ← NEW
  'PHARMACY_PROCESSING', 'DISPATCHED', 'DELIVERED',
  'TREATMENT_ACTIVE', 'FOLLOW_UP_DUE',
  'REFERRED', 'DECLINED', 'COMPLETED', 'CANCELLED', 'ABANDONED',  // ← DECLINED, ABANDONED NEW
];
```

### ADD `free_consultation_used` tracking to seed data:

```typescript
// Add to User seed or create dedicated table:
// Tracks whether a patient has used their free consultation for each vertical
model FreeConsultationTracker {
  id          String    @id @default(uuid())
  patientId   String
  condition   Condition
  used        Boolean   @default(false)
  usedAt      DateTime?
  consultationId String? // The consultation that used the free slot

  @@unique([patientId, condition])
}
```

---

# BACKEND-PART3B CHANGES

---

## CHANGE B3B-1: Section 29 — Testing Checklist — New Test Cases

### ADD to the Payments & Subscriptions test cases:

```
| P11 | Free consultation flow | Patient submits assessment without payment | Consultation created in SUBMITTED status, no Razorpay interaction |
| P12 | Treatment plan payment | Patient with AWAITING_PAYMENT consultation selects plan and pays | Status transitions: AWAITING_PAYMENT → PAYMENT_COMPLETE → PHARMACY_PROCESSING. Subscription created. Order created. |
| P13 | Treatment plan expiry | Wait 30 days with AWAITING_PAYMENT consultation | BullMQ job fires, status → EXPIRED_UNPAID. Patient cannot pay anymore. |
| P14 | Anti-abuse: second free consultation blocked | Patient with EXPIRED_UNPAID tries to start new assessment for same vertical | System blocks: "You previously received a treatment plan. Subscribe to proceed." |
| P15 | Anti-abuse: referral allows retry | Patient with REFERRED status starts new assessment for same vertical | Allowed — referral didn't produce a usable treatment plan |
| P16 | Payment for expired plan | Patient tries to call createPayment for EXPIRED_UNPAID consultation | Backend rejects: consultation not in AWAITING_PAYMENT status |
| P17 | Consultation abandonment | Patient submits assessment, no activity for 30 days | Status → ABANDONED. Free consultation NOT marked as used. |
```

### UPDATE existing test case C1:

**OLD C1:**
```
| C1 | Full consultation flow | Patient: submit assessment + pay → Doctor: review + prescribe | Full lifecycle through TREATMENT_ACTIVE |
```

**NEW C1:**
```
| C1 | Full consultation flow | Patient: submit assessment (free) → Doctor: review + prescribe → Patient: view treatment plan + select plan + pay | Full lifecycle: SUBMITTED → AI → REVIEWING → PRESCRIBED → AWAITING_PAYMENT → PAYMENT_COMPLETE → PHARMACY → TREATMENT_ACTIVE |
```

---

## CHANGE B3B-2: Section 30.3 — Appendix Status Flow Diagram (REWRITE)

### OLD diagram shows:
```
SUBMITTED → AI_PROCESSING → PENDING_REVIEW → IN_REVIEW → PRESCRIBED → TREATMENT_ACTIVE
```

### NEW diagram:
```
SUBMITTED                    ← Patient submits assessment (FREE — no payment)
    │
    ▼
AI_PROCESSING                ← BullMQ job: Claude API (15-60 sec)
    │
    ├──→ AI_FAILED           ← API error (retry 3x, then manual review)
    │
    ▼
AI_COMPLETE                  ← AI ready, case enters doctor queue
    │
    ▼
ASSIGNED                     ← Doctor opens case or admin assigns
    │
    ▼
REVIEWING                    ← Doctor actively reviewing
    │
    ├──→ MORE_INFO_REQUESTED ← Doctor needs clarification
    │         │
    │         ▼ (patient responds)
    │    REVIEWING
    │
    ├──→ LAB_ORDERED         ← Doctor orders blood work (free)
    │         │
    │         ▼ (results received + reviewed)
    │    REVIEWING
    │
    ├──→ PRESCRIBED          ← Doctor creates treatment plan
    │         │
    │         ▼ (auto-transition)
    │    AWAITING_PAYMENT    ← Patient views plan, decides whether to pay
    │         │
    │         ├──→ EXPIRED_UNPAID    ← 30 days, no payment
    │         │
    │         ▼ (patient pays)
    │    PAYMENT_COMPLETE    ← Subscription activated
    │         │
    │         ▼ (auto-transition: order created)
    │    PHARMACY_PROCESSING ← Sent to pharmacy
    │         │
    │         ▼
    │    DISPATCHED          ← Medication shipped
    │         │
    │         ▼
    │    DELIVERED           ← OTP confirmed
    │         │
    │         ▼
    │    TREATMENT_ACTIVE    ← Day counter starts
    │         │
    │         ▼ (timer fires)
    │    FOLLOW_UP_DUE       ← Check-in notification
    │
    ├──→ REFERRED            ← In-person specialist needed (no payment)
    │
    ├──→ DECLINED            ← Not a candidate (no payment)
    │
    └──→ COMPLETED           ← Case closed (no treatment needed)

Other terminal states:
    CANCELLED                ← Patient/admin cancellation
    ABANDONED                ← 30 days inactivity during free phase
```

---

# CROSS-CUTTING CONCERNS (ALL PARTS)

---

## Anti-Abuse Implementation

### `FreeConsultationTracker` logic (spans PART1 + PART2A):

```typescript
// When starting a new assessment (BACKEND-PART1 — consultation creation):
async createConsultation(patientId: string, condition: Condition) {
  // Check if free consultation already used for this vertical
  const tracker = await this.prisma.freeConsultationTracker.findUnique({
    where: { patientId_condition: { patientId, condition } },
  });

  if (tracker?.used) {
    // Free consultation already used — require subscription commitment
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You previously received a treatment plan for this condition. To get updated recommendations, please subscribe to a plan.',
    });
  }

  // Create consultation (free)
  return this.prisma.consultation.create({
    data: { patientId, condition, status: 'SUBMITTED' },
  });
}

// When consultation reaches AWAITING_PAYMENT (treatment plan created):
// Mark free consultation as used
async markFreeConsultationUsed(patientId: string, condition: Condition, consultationId: string) {
  await this.prisma.freeConsultationTracker.upsert({
    where: { patientId_condition: { patientId, condition } },
    create: { patientId, condition, used: true, usedAt: new Date(), consultationId },
    update: { used: true, usedAt: new Date(), consultationId },
  });
}

// Exception: REFERRED or DECLINED outcomes allow one more free attempt
async handleReferralOrDecline(patientId: string, condition: Condition) {
  await this.prisma.freeConsultationTracker.update({
    where: { patientId_condition: { patientId, condition } },
    data: { used: false },  // Reset — allow another free consultation
  });
}
```

---

## Subscription-Consultation Linking

### The Subscription model now links to the Consultation that generated it:

```
Consultation (AWAITING_PAYMENT)
  → Patient pays
  → Subscription created with consultationId = consultation.id
  → Consultation transitions to PAYMENT_COMPLETE
  → Order created from prescription
  → Pharmacy pipeline begins
```

This linking is critical for:
1. Knowing which prescription to fulfill when payment arrives
2. Preventing duplicate payments for the same consultation
3. Audit trail: which consultation led to which subscription

---

## SUMMARY TABLE

| Change ID | Part | Section | Description |
|-----------|------|---------|-------------|
| B1-1 | PART1 | §9.1 | Consultation status enum — 6 new statuses |
| B1-2 | PART1 | §9.2 | Valid transitions map — complete rewrite |
| B1-3 | PART1 | §9 | Auto-transition logic (PRESCRIBED→AWAITING_PAYMENT, PAYMENT_COMPLETE→PHARMACY) |
| B1-4 | PART1 | §10.1 | Prescription service status check fix |
| B1-5 | PART1 | §10 | Note: prescription doesn't trigger pharmacy |
| B2A-1 | PART2A | §14.1 | Architecture overview — payment flow rewrite |
| B2A-2 | PART2A | §14.3 | createPayment() — requires consultationId + AWAITING_PAYMENT validation |
| B2A-3 | PART2A | §14.3 | Payment webhook — transitions consultation + creates order |
| B2A-4 | PART2A | §14.2 | Prisma schema — consultationId on Subscription, treatmentPlanExpiresAt |
| B2A-5 | PART2A | §11 | Orders — creation trigger moved to post-payment |
| B2A-6 | PART2A | §15 | Notifications — 6 new events for treatment plan flow |
| B2A-7 | PART2A | §13 | Lab orders — free initial panel, LabPaymentStatus enum |
| B2B-1 | PART2B | §19 | BullMQ — treatment plan expiry + reminder jobs |
| B2B-2 | PART2B | §17 | Wallet/refunds — simplified scenarios |
| B2B-3 | PART2B | §18 | SLA — AWAITING_PAYMENT monitoring |
| B3A-1 | PART3A | §22 | CASL — patient can read prescription in AWAITING_PAYMENT |
| B3A-2 | PART3A | §25 | Seed data — new statuses + FreeConsultationTracker model |
| B3B-1 | PART3B | §29 | Testing — 7 new test cases |
| B3B-2 | PART3B | §30.3 | Appendix — complete status flow diagram rewrite |
