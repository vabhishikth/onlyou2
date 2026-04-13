# Onlyou — Unified Source of Truth

**Last Updated:** April 13, 2026
**Purpose:** This is the single canonical reference for all enums, pricing, SLAs, transitions, privacy rules, tech decisions, and business logic. When any other document conflicts with this file, **this file wins.**

**How this was produced:** Every value was cross-referenced across 40+ spec documents, companion `-CHANGES.md` files, and the `backend-errors-report.md`. Where conflicts existed, the resolution follows the document hierarchy defined in CLAUDE.md §2: ARCHITECTURE.md > docs/changes/*.md > onlyou-spec-resolved-v4.md > VERTICAL-*.md > CLAUDE.md.

---

## Table of Contents

1. [Business Model & Payment Flow](#1-business-model--payment-flow)
2. [Consultation Status Enum](#2-consultation-status-enum)
3. [Transition Maps](#3-transition-maps)
4. [Supporting Enums](#4-supporting-enums)
5. [Subscription Pricing](#5-subscription-pricing)
6. [Lab Panel Pricing](#6-lab-panel-pricing)
7. [SLA Thresholds](#7-sla-thresholds)
8. [Roles & Privacy Boundaries](#8-roles--privacy-boundaries)
9. [Tech Stack](#9-tech-stack)
10. [Monorepo & Domains](#10-monorepo--domains)
11. [BullMQ Queues & Jobs](#11-bullmq-queues--jobs)
12. [Consent Purposes (DPDPA)](#12-consent-purposes-dpdpa)
13. [Vertical-Specific Reference](#13-vertical-specific-reference)
14. [Follow-Up Schedule](#14-follow-up-schedule)
15. [ID Formats & Anonymization](#15-id-formats--anonymization)
16. [Feature Flags (MVP)](#16-feature-flags-mvp)
17. [Anti-Abuse: Free Consultation Tracker](#17-anti-abuse-free-consultation-tracker)
18. [Refund Scenarios](#18-refund-scenarios)
19. [Patient Workflow Sections 12–15 (Redesigned)](#19-patient-workflow-sections-1215-redesigned)

---

## 1. Business Model & Payment Flow

### The Core Rule

**Consultation is FREE. Payment comes AFTER the doctor, not before.**

The free consultation is a customer acquisition cost. The patient pays only after the doctor has reviewed their case and created a personalized treatment plan. This is the post-redesign flow and overrides any older document that describes payment before doctor review.

### Patient Journey (Canonical)

```
1. Patient selects condition (Hair Loss / ED / PE / Weight / PCOS)
2. Patient completes questionnaire + uploads photos (if required by vertical)
3. AI processes assessment (15-60 seconds via BullMQ)        ← FREE
4. Case enters doctor queue
5. Doctor is assigned (or self-assigns)                       ← FREE
6. Doctor reviews: questionnaire, photos, AI summary          ← FREE
7. Doctor may request more info or order lab work              ← FREE (labs included in initial consult)
8. Doctor creates treatment plan + prescription                ← FREE
9. Status auto-transitions: PRESCRIBED → AWAITING_PAYMENT
10. Patient views treatment plan and selects subscription (Monthly / Quarterly / 6-Month)
11. Patient pays via Razorpay
12. Status: PAYMENT_COMPLETE → auto-transitions to PHARMACY_PROCESSING
13. First medication order is created
14. Pharmacy prepares and coordinates delivery
15. Delivery confirmed via OTP → TREATMENT_ACTIVE
```

### What Changed from Old Flow

| Aspect | Old (WRONG) | New (CORRECT) |
|--------|-------------|---------------|
| Payment timing | Before doctor review | After doctor creates treatment plan |
| Consultation cost | Charged | Free (1 per vertical per user) |
| "Doctor refunds" | Existed (doctor refunds paid consult) | Eliminated (patient never paid, so doctor "declines") |
| Terminal without payment | Did not exist | EXPIRED_UNPAID (30 days), DECLINED, REFERRED |
| New statuses | N/A | AWAITING_PAYMENT, PAYMENT_COMPLETE, EXPIRED_UNPAID, DECLINED, ABANDONED |

---

## 2. Consultation Status Enum

**22 statuses total. Use ONLY these names. All UPPERCASE with underscores.**

**Source:** BACKEND-ALL-CHANGES.md B1-1 (canonical definition)

```typescript
enum ConsultationStatus {
  // Phase 1: Assessment (FREE)
  SUBMITTED              // Patient completed questionnaire + photos
  AI_PROCESSING          // BullMQ job: Claude API analyzing (15-60s)
  AI_FAILED              // Claude API error (retry 3x, then manual review)
  AI_COMPLETE            // AI ready, case enters doctor queue

  // Phase 2: Doctor Review (FREE)
  ASSIGNED               // Doctor opened case or admin assigned
  REVIEWING              // Doctor actively reviewing (30s on page OR first action)
  MORE_INFO_REQUESTED    // Doctor needs clarification → patient responds → back to REVIEWING
  LAB_ORDERED            // Doctor ordered blood work (labs free during initial consult)

  // Phase 3: Doctor Decision
  PRESCRIBED             // Brief transitional → auto-transitions to AWAITING_PAYMENT
  AWAITING_PAYMENT       // Treatment plan shown, waiting for subscription
  EXPIRED_UNPAID         // 30 days without payment (TERMINAL)
  REFERRED               // Doctor refers to in-person specialist (TERMINAL, no payment)
  DECLINED               // Doctor: patient not a candidate (TERMINAL, no payment)

  // Phase 4: Payment → Treatment
  PAYMENT_COMPLETE       // Patient paid → auto-transitions to PHARMACY_PROCESSING
  PHARMACY_PROCESSING    // Prescription sent to pharmacy partner
  DISPATCHED             // Medication shipped
  DELIVERED              // Delivery confirmed via OTP

  // Phase 5: Ongoing
  TREATMENT_ACTIVE       // On treatment, day counter starts
  FOLLOW_UP_DUE          // Check-in timer fires (4wk / 3mo / 6mo / 12mo)

  // Terminal
  COMPLETED              // Treatment finished normally (NOT "CLOSED")
  CANCELLED              // Patient or admin cancelled
  ABANDONED              // No activity for 30 days during free phase
}
```

### Wrong Names → Correct Names (Quick Reference)

If you see any of these in a spec doc, they are WRONG:

| Wrong | Correct | Notes |
|-------|---------|-------|
| PENDING_REVIEW | AI_COMPLETE | BACKEND-PART1 §9 uses wrong name |
| IN_REVIEW | REVIEWING | Most common error — appears in 10+ docs |
| BLOOD_WORK_ORDERED | LAB_ORDERED | BACKEND-PART1 §9 |
| INFO_REQUESTED | MORE_INFO_REQUESTED | BACKEND-PART1, PART2B, PART3B |
| FOLLOW_UP | FOLLOW_UP_DUE | BACKEND-PART1, PART3B |
| CLOSED | COMPLETED | Used in 27 files — always means COMPLETED for consultations |
| EN_ROUTE | NURSE_EN_ROUTE | BACKEND-PART3B §30.4 (nurse context) |
| DELIVERED_TO_LAB | AT_LAB | BACKEND-PART3B §30.4 (lab context) |
| RESULTS_READY | RESULTS_UPLOADED | Self-upload path in BACKEND-PART3B |
| INFO_PROVIDED | Not a status | Patient responds → goes back to REVIEWING directly |
| RUNNING_LATE | Not a status | Fields only: lateReportedAt, newEta, lateReason |
| PATIENT_UNAVAILABLE | FAILED | With failedReason field |
| PRESCRIPTION_CREATED | PRESCRIBED | Some older references |

---

## 3. Transition Maps

### 3A. Valid Transitions (User/Doctor-Facing)

Enforced by `transitionStatus()` in the consultations service.

```typescript
const validTransitions: Record<ConsultationStatus, ConsultationStatus[]> = {
  SUBMITTED:            ['AI_PROCESSING'],
  AI_PROCESSING:        ['AI_COMPLETE', 'AI_FAILED'],
  AI_FAILED:            ['AI_PROCESSING', 'AI_COMPLETE'],
  AI_COMPLETE:          ['ASSIGNED'],
  ASSIGNED:             ['REVIEWING'],
  REVIEWING:            ['MORE_INFO_REQUESTED', 'LAB_ORDERED', 'PRESCRIBED', 'REFERRED', 'DECLINED', 'COMPLETED'],
  MORE_INFO_REQUESTED:  ['REVIEWING'],
  LAB_ORDERED:          ['REVIEWING'],
  PRESCRIBED:           ['AWAITING_PAYMENT'],
  AWAITING_PAYMENT:     ['PAYMENT_COMPLETE', 'EXPIRED_UNPAID'],
  EXPIRED_UNPAID:       [],
  PAYMENT_COMPLETE:     ['PHARMACY_PROCESSING'],
  PHARMACY_PROCESSING:  ['DISPATCHED'],
  DISPATCHED:           ['DELIVERED'],
  DELIVERED:            ['TREATMENT_ACTIVE'],
  TREATMENT_ACTIVE:     ['FOLLOW_UP_DUE', 'COMPLETED', 'CANCELLED'],
  FOLLOW_UP_DUE:        ['REVIEWING'],
  REFERRED:             [],
  DECLINED:             [],
  COMPLETED:            [],
  CANCELLED:            [],
  ABANDONED:            [],
};
```

### 3B. System Transitions (Automated — BullMQ/Events Only)

These bypass `validTransitions` by design. Called by `systemTransition()` only.

```
SUBMITTED / AI_COMPLETE / AI_FAILED → ABANDONED         (30-day abandon-check BullMQ job)
AWAITING_PAYMENT                    → EXPIRED_UNPAID     (30-day expiry BullMQ job)
PRESCRIBED                          → AWAITING_PAYMENT   (after PDF generated + plan record created)
PAYMENT_COMPLETE                    → PHARMACY_PROCESSING (order.create_first event)
PHARMACY_PROCESSING                 → DISPATCHED          (order dispatched event)
DISPATCHED                          → DELIVERED           (order delivered event)
DELIVERED                           → TREATMENT_ACTIVE    (order.delivered event)
```

### 3C. Terminal States (No Outbound Transitions)

```
EXPIRED_UNPAID   — Must start new assessment
REFERRED         — Doctor sent to in-person specialist
DECLINED         — Doctor: not a candidate
COMPLETED        — Treatment finished
CANCELLED        — Patient or admin cancelled
ABANDONED        — No activity during free phase
```

---

## 4. Supporting Enums

### 4A. SubscriptionPlan

```typescript
enum SubscriptionPlan {
  MONTHLY       // Full price, Razorpay recurring subscription
  QUARTERLY     // 15-17% savings, Razorpay recurring subscription
  SIX_MONTH     // 22-25% savings, Razorpay ONE-TIME payment (not subscription)
}
```

**Use `SIX_MONTH` everywhere.** Do NOT use `BIANNUAL` (appears in VERTICAL-WEIGHT.md seed data — that is wrong).

**No annual plans.** This is a locked decision (CLAUDE.md §3 #5). The "12-month annual review" in follow-up schedules is a clinical check-in, NOT a subscription duration.

### 4B. SubscriptionStatus

```typescript
enum SubscriptionStatus {
  CREATED
  ACTIVE
  PAUSED
  HALTED       // Payment failed after retries
  CANCELLED
  EXPIRED
}
```

### 4C. PaymentStatus

```typescript
enum PaymentStatus {
  CREATED
  AUTHORIZED
  CAPTURED
  FAILED
  REFUNDED
}
```

### 4D. OrderStatus

```typescript
enum OrderStatus {
  CREATED
  SENT_TO_PHARMACY
  PREPARING
  READY
  OUT_FOR_DELIVERY
  DELIVERED
  PHARMACY_ISSUE
  DELIVERY_FAILED
  REASSIGNED
  CANCELLED
}
```

### 4E. LabOrderStatus

```typescript
enum LabOrderStatus {
  ORDERED
  SLOT_BOOKED
  NURSE_ASSIGNED
  NURSE_EN_ROUTE       // NOT "EN_ROUTE"
  NURSE_ARRIVED
  SAMPLE_COLLECTED
  AT_LAB               // NOT "DELIVERED_TO_LAB"
  SAMPLE_RECEIVED
  PROCESSING
  RESULTS_UPLOADED     // Self-upload path
  RESULTS_READY        // Lab uploads
  DOCTOR_REVIEWED
  CLOSED               // Lab order closed (this is valid for lab orders, unlike consultation status)
  COLLECTION_FAILED
  SAMPLE_ISSUE
  RECOLLECTION_NEEDED
  CANCELLED
}
```

### 4F. LabPaymentStatus

```typescript
enum LabPaymentStatus {
  PENDING            // Awaiting payment (standalone orders)
  WAIVED_INITIAL     // Free — initial consultation lab order
  INCLUDED           // Free — included in active subscription
  PAID               // Patient paid (standalone order)
}
```

### 4G. NurseVisitStatus

```typescript
enum NurseVisitStatus {
  SCHEDULED
  EN_ROUTE         // For nurse visits specifically (consultation context uses NURSE_EN_ROUTE)
  ARRIVED
  IN_PROGRESS
  COMPLETED
  FAILED           // With failedReason field
  CANCELLED
}
```

### 4H. PrescriptionStatus

```typescript
enum PrescriptionStatus {
  CREATED
  SIGNED
  SENT_TO_PHARMACY
  FULFILLED
  EXPIRED
  CANCELLED
}
```

### 4I. RefundSource, RefundDestination, RefundStatus

```typescript
enum RefundSource {
  DOCTOR_INITIATED
  PATIENT_CANCELLATION
  PLATFORM_FAULT
}

enum RefundDestination {
  WALLET
  ORIGINAL_PAYMENT
}

enum RefundStatus {
  PENDING_APPROVAL
  APPROVED
  REJECTED
  PROCESSING
  COMPLETED
}
```

### 4J. ConsentPurpose

```typescript
enum ConsentPurpose {
  TELECONSULTATION          // Core service — required for platform use
  PRESCRIPTION_PHARMACY     // Sharing prescription data with pharmacy partner
  LAB_PROCESSING            // Sharing lab order data with diagnostic centre
  HEALTH_DATA_ANALYTICS     // Anonymized analytics on treatment outcomes
  MARKETING_COMMUNICATIONS  // Promotional messages via WhatsApp/email
  PHOTO_AI_PROCESSING       // Using patient photos for AI assessment
}
```

**6 purposes, not 4.** ARCHITECTURE.md lists only 4 with different names — that is outdated. BACKEND-PART3A §21 is canonical.

### 4K. Auth Roles (6 Roles — Always UPPERCASE)

```typescript
enum Role {
  PATIENT
  DOCTOR
  ADMIN
  NURSE
  LAB_TECH
  PHARMACY_STAFF
}
```

**Delivery person has NO role, NO portal — SMS link only.**

Never use lowercase ('doctor'). Always UPPERCASE ('DOCTOR').

---

## 5. Subscription Pricing

**ALL amounts stored in PAISE (integer). NEVER rupees. NEVER floats.**

**Source:** onlyou-spec-resolved-v4.md §5 (canonical)

| Vertical | Monthly | Quarterly | 6-Month |
|----------|---------|-----------|---------|
| Hair Loss | ₹999 (99,900p) | ₹2,499 (249,900p) | ₹4,499 (449,900p) |
| ED | ₹1,299 (129,900p) | ₹3,299 (329,900p) | ₹5,999 (599,900p) |
| PE | ₹1,299 (129,900p) | ₹3,299 (329,900p) | ₹5,999 (599,900p) |
| Weight Standard | ₹2,999 (299,900p) | ₹7,999 (799,900p) | ₹14,999 (1,499,900p) |
| Weight GLP-1 Premium | ₹9,999 (999,900p) | ₹24,999 (2,499,900p) | ₹44,999 (4,499,900p) |
| PCOS | ₹1,499 (149,900p) | ₹3,799 (379,900p) | ₹6,999 (699,900p) |

### Per-Month Breakdown (for UI display)

| Vertical | Monthly | Quarterly (per mo) | 6-Month (per mo) |
|----------|---------|-------------------|-----------------|
| Hair Loss | ₹999 | ₹833 | ₹750 |
| ED | ₹1,299 | ₹1,100 | ₹1,000 |
| PE | ₹1,299 | ₹1,100 | ₹1,000 |
| Weight Standard | ₹2,999 | ₹2,666 | ₹2,500 |
| Weight GLP-1 | ₹9,999 | ₹8,333 | ₹7,500 |
| PCOS | ₹1,499 | ₹1,266 | ₹1,167 |

### Razorpay Rules

- Monthly and Quarterly → Razorpay **recurring subscription**
- 6-Month → Razorpay **one-time payment** (Razorpay subscriptions only support monthly/quarterly recurrence)
- UPI Autopay limit: ₹15,000 — GLP-1 6-month (₹44,999) exceeds this; must handle gracefully (offer card/netbanking)
- UPI subscriptions CANNOT be updated mid-cycle — must cancel + recreate
- GLP-1 Premium marked "Coming Soon" at MVP with waitlist capture

---

## 6. Lab Panel Pricing

### Standard Panels (per vertical)

| Panel | Price | Vertical | Tests Included |
|-------|-------|----------|----------------|
| Extended Hair Panel | ₹1,200 (120,000p) | Hair Loss | TSH, CBC, Ferritin, Vitamin D, DHT, Zinc |
| Basic Health Check | ₹800 (80,000p) | ED | Testosterone, Fasting Glucose, Lipid Profile |
| PCOS Screen Panel | ₹1,500 (150,000p) | PCOS | FSH, LH, Estradiol, Testosterone, DHEA-S, Prolactin, Fasting Glucose, Lipid Panel, Insulin |
| Metabolic Panel | ₹1,800 (180,000p) | Weight | HbA1c, Fasting Glucose, Lipid Profile, Liver Panel, Kidney Panel, TSH |

### PE-Specific Panels (missing from BACKEND-PART2A §12.5 — must be added)

| Panel | Price | Tests Included |
|-------|-------|----------------|
| Thyroid Check | ₹350 (35,000p) | TSH, T3, T4 |
| Hormonal | ₹800 (80,000p) | Testosterone, Prolactin, LH, FSH |
| Prostate | ₹500 (50,000p) | PSA |
| Combined | ₹1,500 (150,000p) | All of the above |

### Pricing Rules

- First panel during initial (free) consultation: **FREE** (acquisition cost, tracked via LabPaymentStatus.WAIVED_INITIAL)
- Follow-up panels during active subscription: **Included** (LabPaymentStatus.INCLUDED)
- Self-upload by patient: **FREE** (no collection, no lab cost)
- Standalone lab orders (no active subscription): Charged separately via Razorpay

---

## 7. SLA Thresholds

**Source:** PORTAL-DOCTOR.md §23.3 + WORKFLOW-ADMIN.md §30 (canonical)

**SLA engine:** BullMQ `sla-check` repeatable job, every **15 minutes**

**Visual indicators:** 🟢 On track | 🟡 Within 2 hours of breach | 🟡 → admin notified | 🔴 Breached → admin + priority flag

### Doctor SLAs

| Metric | Threshold | Measurement |
|--------|-----------|-------------|
| First review | **24 hours** | AI_COMPLETE → not yet ASSIGNED |
| Case action | **48 hours** | ASSIGNED → no action taken |
| Info response review | **72 hours** | Patient responded to MORE_INFO_REQUESTED → no re-review |
| Lab results review | **24 hours** | Results uploaded → not opened by doctor |

**BACKEND-PART2B §18.3 says 4 hours for first review and 24 hours for info response — those values are WRONG.**

### Pharmacy SLAs

| Metric | Threshold |
|--------|-----------|
| Start preparing | 2 hours after SENT_TO_PHARMACY |
| Complete preparation | 4 hours after PREPARING |
| Overall preparation | 24 hours after sent |

### Delivery SLAs

| Metric | Threshold |
|--------|-----------|
| Admin assigns pharmacy | 4 hours after prescription generated |
| Delivery arrangement | 4 hours after pharmacy READY |
| Delivery completion | **24 hours** after pickup |
| End-to-end | 48 hours (prescription → delivered) |

**PORTAL-ADMIN.md says 2 hours for delivery completion — that is WRONG. It is 24 hours.**

### Lab SLAs

| Metric | Threshold |
|--------|-----------|
| Patient books slot | 7 days after order placed |
| Nurse assigned | 2 hours after booking |
| Lab receives sample | 2 hours after nurse delivery |
| Results uploaded (routine) | 48 hours after sample received |
| Results uploaded (urgent) | 12 hours after sample received |
| Doctor reviews results | 24 hours after results uploaded |

---

## 8. Roles & Privacy Boundaries

Privacy is enforced at the **tRPC router `select` clause** — forbidden fields are NEVER fetched from the database. This is architectural, not a UI filter.

### PATIENT

- Sees: own profile, medical history, prescriptions, all consultation statuses, payment info, lab results, delivery tracking
- Never sees: doctor internal notes, nurse qualifications, pharmacy partner details, other patients' data

### DOCTOR

- Sees: assigned case queue, questionnaire responses, photos, AI summary, patient name/age/gender, lab results, SLA timers, message thread
- Never sees: payment info, other doctors' prescriptions, nurse details, pharmacy operations

### ADMIN

- Sees: everything (full visibility across all roles and data)
- Restrictions: cannot create prescriptions, cannot update AI assessments, cannot delete audit logs

### NURSE

| Sees | Never Sees |
|------|------------|
| Patient name, phone, address (for visit only) | Diagnosis / condition name |
| Tests to collect, tube count, instructions | Questionnaire responses |
| Scheduled time, diagnostic centre | AI assessment, prescription details |
| Special instructions (fasting, etc.) | Doctor notes, payment info, other nurses' data |

### LAB_TECH (Anonymized — sees sample IDs only)

| Sees | Never Sees |
|------|------------|
| Sample ID: `ONY-{YEAR}-{SEQ}` (e.g., ONY-2026-0042) | Patient name, phone, address |
| Test names, tube count | Diagnosis / condition |
| Patient age + gender (for reference ranges) | Doctor name, clinical notes |
| Nurse name (who delivered), urgency | Questionnaire, AI assessment |
| Lab-specific notes | Prescription, payments |

### PHARMACY_STAFF (Anonymized — sees order IDs only)

| Sees | Never Sees |
|------|------------|
| Order ID: `ORD-{SEQ}` (e.g., ORD-001234) | Patient name, phone, address |
| Anonymous patient ID: `ONY-P-{SEQ}` (e.g., ONY-P-0045) | Diagnosis / condition |
| Medication names, dosages, quantities, sig | Questionnaire, AI assessment |
| Prescription PDF (CloudFront signed URL, 1hr expiry) | Lab results |
| Doctor name + NMC registration number | Delivery OTP, payment info |
| Delivery person name (once assigned) | Internal prescriptionId |

### DELIVERY PERSON (No auth role, no portal — SMS link only)

| Sees | Never Sees |
|------|------------|
| Pickup address (pharmacy) | Medication names |
| Delivery address (patient) | Condition / diagnosis |
| Patient phone (for arrival call) | Prescription, lab results |
| OTP for delivery confirmation | Any clinical information |

**CASL.js source of truth:** BACKEND-PART3A §22.4 ONLY. Ignore BACKEND-PART1 §4.6 (divergent older copy).

---

## 9. Tech Stack

**Source:** ARCHITECTURE.md (wins all tech conflicts)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | NestJS 10 + Fastify adapter | NOT Express. Decision #14 |
| API (internal) | tRPC v10 | 7 TypeScript clients |
| API (external) | REST only | Razorpay webhooks, Gupshup webhooks, delivery SMS |
| Database | PostgreSQL 16 on RDS | ap-south-1 (Mumbai) |
| ORM | Prisma 5 | Query Compiler enabled |
| Cache / Queue backend | Redis 7 on ElastiCache | |
| Job processing | BullMQ | Bull Board via `@bull-board/fastify` (NOT ExpressAdapter) |
| Real-time | SSE + Redis Pub/Sub | NOT WebSockets. Decision #9 |
| Auth | Custom NestJS JWT (RS256) | NOT Clerk/Auth0/Firebase. Decision #10 |
| Patient auth | Email/Google/Apple + mandatory phone OTP | Decision #11 |
| RBAC | CASL.js + NestJS Guards | |
| Payments | Razorpay | ALL amounts in PAISE (integer) |
| File storage | S3 (SSE-KMS) + CloudFront signed URLs | Buckets: photos, prescriptions, lab-results, documents |
| AI | Claude API | Model from `process.env.ANTHROPIC_MODEL`, NEVER hardcoded |
| WhatsApp | Gupshup Business API | PRIMARY channel |
| SMS | MSG91 | FALLBACK only |
| Push notifications | Firebase FCM | |
| PDF generation | @react-pdf/renderer | Server-side |
| Email | Resend (MVP) → SES (scale) | Needs RESEND_API_KEY in env vars |
| Mobile | React Native Expo (managed + dev builds, Hermes) | |
| Portals | Separate Next.js 14 per subdomain | Decision #8 |
| UI components | Tailwind CSS + shadcn/ui | Shared via packages/ui |
| Monorepo | Turborepo + pnpm | `node-linker=hoisted` in .npmrc |
| Blog CMS | Sanity CMS (headless) | |
| Infrastructure | AWS Mumbai (ap-south-1) | ECS Fargate, RDS, ElastiCache |

---

## 10. Monorepo & Domains

### Structure

```
onlyou/
├── apps/
│   ├── api/              → NestJS + Fastify + tRPC + Prisma (port 3000)
│   ├── mobile/           → React Native Expo (port 8081)
│   ├── landing/          → Next.js SSG
│   ├── doctor-portal/    → Next.js
│   ├── admin-portal/     → Next.js
│   ├── nurse-portal/     → Next.js PWA
│   ├── lab-portal/       → Next.js PWA
│   └── pharmacy-portal/  → Next.js PWA
├── packages/
│   ├── ui/               → Shared Tailwind + shadcn
│   ├── api-client/       → tRPC client + hooks
│   ├── types/            → Zod schemas + TS types (SHARED ENUMS LIVE HERE)
│   └── config/           → ESLint, TS, Prettier
```

### Domains

```
onlyou.live              → Patient landing + mobile app
doctor.onlyou.live       → Doctor portal
admin.onlyou.live        → Admin / coordinator portal
nurse.onlyou.live        → Nurse portal (PWA)
lab.onlyou.live          → Lab / diagnostic centre portal (PWA)
pharmacy.onlyou.live     → Pharmacy partner portal (PWA)
onlyou.co.in             → 301 redirect to onlyou.live (legal/regulatory filings, email domain)
```

### NestJS Module Pattern

```
modules/{name}/
  ├── {name}.module.ts       → NestJS module definition
  ├── {name}.service.ts      → Business logic + Prisma queries
  ├── {name}.router.ts       → tRPC procedures
  └── dto/
      ├── create-{name}.schema.ts   → Zod input
      └── update-{name}.schema.ts   → Zod input
```

**Inter-module communication:** EventEmitter2 ONLY. Never direct service imports across modules. Exception: BullMQ processors (`jobs/processors/`) may inject services from other modules directly.

---

## 11. BullMQ Queues & Jobs

### Queue Definitions

**The notification queue is called `notification-dispatch`.** Not `notifications`. Use this name everywhere.

| Queue Name | Type | Priority | Notes |
|------------|------|----------|-------|
| `ai-assessment` | Event-triggered, multi-step | Medium | Claude API analysis |
| `subscription-renewal` | Cron (daily 2 AM IST) | Critical | Razorpay renewal checks |
| `sla-check` | Repeatable (every 15 min) | High | SLA breach detection |
| `notification-dispatch` | Event-triggered | Medium | WhatsApp/SMS/push/email |
| `pdf-generation` | Event-triggered | Low | Prescription PDFs |
| `scheduled-reminder` | Delayed | Medium | Follow-up reminders |
| `auto-reorder` | Cron (daily) | Medium | Medication reorders |

### Scheduled Jobs (Payment Flow Related)

| Job Name | Trigger | Action |
|----------|---------|--------|
| `treatment-plan-reminder-3d` | 3 days after AWAITING_PAYMENT | Remind patient to subscribe |
| `treatment-plan-reminder-7d` | 7 days after AWAITING_PAYMENT | Second reminder |
| `treatment-plan-reminder-14d` | 14 days after AWAITING_PAYMENT | Final reminder |
| `treatment-plan-expire` | 30 days after AWAITING_PAYMENT | Auto-transition to EXPIRED_UNPAID |
| `consultation-abandon-check` | 30 days after SUBMITTED/AI_COMPLETE/AI_FAILED | Auto-transition to ABANDONED |

### Queues NOT Defined (Remove from Monitoring or Define)

- `data-retention` — Referenced in BACKEND-PART3B §26 monitoring but never defined as a processor
- `payment-reconciliation` — Same issue

### Queues Missing from Monitoring (Add to Bull Board + Health Check)

- `subscription-renewal`
- `auto-reorder`
- `scheduled-reminder`

---

## 12. Consent Purposes (DPDPA)

**6 purposes. Source: BACKEND-PART3A §21 (canonical).**

ARCHITECTURE.md lists only 4 with different names — that is outdated.

```typescript
enum ConsentPurpose {
  TELECONSULTATION          // Core service — required for platform use
  PRESCRIPTION_PHARMACY     // Sharing prescription data with pharmacy partner (NOT "PHARMACY_SHARING")
  LAB_PROCESSING            // Sharing lab order data with diagnostic centre
  HEALTH_DATA_ANALYTICS     // Anonymized analytics (NOT "ANALYTICS")
  MARKETING_COMMUNICATIONS  // Promotional messages via WhatsApp/email (missing from ARCHITECTURE.md)
  PHOTO_AI_PROCESSING       // Using patient photos for AI assessment (missing from ARCHITECTURE.md)
}
```

Each purpose requires separate, unbundled consent. No pre-ticked boxes. Consent stored in immutable `consent_records` table with: purpose, timestamp, privacy notice version, withdrawal timestamp.

---

## 13. Vertical-Specific Reference

### Hair Loss

- **Questionnaire:** 28 questions, ~23-25 after skip logic
- **Photos:** 4 mandatory (Crown/Vertex, Hairline, Left Temple, Right Temple)
- **Scoring:** Norwood-Ludwig scale
- **Lab panel:** Extended Hair Panel (₹1,200) — included free in initial consult
- **Key medications:** Finasteride 1mg daily, Minoxidil 5% 2x daily, Biotin 10,000mcg daily, Ketoconazole 2% 3x weekly
- **Age:** No hard gate; under-25 flagged for finasteride caution
- **Pricing:** ₹999 / ₹2,499 / ₹4,499

### ED (Erectile Dysfunction)

- **Questionnaire:** 28 questions, ~24-26 after skip logic with IIEF-5 scoring (Q10-Q14, range 5-25)
- **Photos:** NONE (privacy-first design)
- **Lab panel:** Basic Health Check (₹800) — included when clinically indicated
- **Key medications:** Sildenafil 50mg on-demand, Tadalafil 10mg on-demand, Tadalafil 5mg daily, Conservative (lifestyle + L-Arginine + Zinc)
- **Critical contraindication:** Nitrate users (Q6 ANY YES = absolute contraindication to PDE5 inhibitors)
- **Age:** 18+
- **Pricing:** ₹1,299 / ₹3,299 / ₹5,999

### PE (Premature Ejaculation)

- **Questionnaire:** 26 questions, ~20-23 after skip logic with PEDT scoring (Q4-Q8, range 0-20)
- **Photos:** NONE (privacy-first)
- **Classification:** Lifelong vs Acquired vs Variable vs Situational (critical for treatment selection)
- **Lab panels:** 4 PE-specific panels (Thyroid ₹350, Hormonal ₹800, Prostate ₹500, Combined ₹1,500) — ordered only when clinically indicated
- **Age:** 18+ (acquired vs lifelong changes with age >50)
- **Pricing:** ₹1,299 / ₹3,299 / ₹5,999

### Weight Management

- **Two tiers:** Standard and GLP-1 Premium
- **BMI thresholds:** <23 normal, 23-24.9 overweight, ≥25 eligible
- **Lab panel:** Metabolic Panel (₹1,800) — included free in initial consult
- **Standard medications:** Orlistat, Metformin, Phentermine
- **GLP-1 medications:** Semaglutide, Liraglutide (marked "Coming Soon" at MVP)
- **Pricing (Standard):** ₹2,999 / ₹7,999 / ₹14,999
- **Pricing (GLP-1):** ₹9,999 / ₹24,999 / ₹44,999
- **UPI limit issue:** GLP-1 6-month (₹44,999) exceeds ₹15,000 UPI Autopay limit

### PCOS

- **Questionnaire:** 32 questions, ~10-14 minutes
- **Diagnostic criteria:** Rotterdam (2 of 3: oligo/anovulation, hyperandrogenism, polycystic ovaries)
- **Photos:** Optional (not mandatory)
- **Lab panel:** PCOS Screen Panel (₹1,500, 9 tests: FSH, LH, Estradiol, Testosterone, DHEA-S, Prolactin, Fasting Glucose, Lipid Panel, Insulin)
- **Key feature:** Fertility intent branching — "not trying to conceive" vs "trying to conceive" determines prescription template
- **Prescription templates:** 7 for Not-TTC + 5 for TTC = 12 total
- **Period tracker:** PCOS-exclusive app feature for cycle monitoring
- **Age:** 18-40 (warning for >40, not blocked)
- **Pricing:** ₹1,499 / ₹3,799 / ₹6,999

---

## 14. Follow-Up Schedule

Applies to all verticals. The 12-month entry is a **clinical follow-up**, NOT a subscription plan.

| Timing | Type | Questionnaire | Photos | Notes |
|--------|------|---------------|--------|-------|
| 4 weeks | Side effects check | 10 abbreviated questions | None (except PCOS optional) | Early tolerance assessment |
| 3 months | Progress review | 10 questions | 4 photos (vertical-dependent) | First major efficacy check |
| 6 months | Full assessment | 15 questions | 4 photos | Treatment plan reassessment |
| 12 months | Annual review | Full questionnaire | Comprehensive photo set | Long-term efficacy review |

Follow-up consultations re-enter the review cycle: `FOLLOW_UP_DUE → REVIEWING`

---

## 15. ID Formats & Anonymization

| Entity | Format | Example | Who Sees It |
|--------|--------|---------|-------------|
| Sample ID | `ONY-{YEAR}-{SEQ_4_DIGIT}` | ONY-2026-0042 | Lab tech (instead of patient name) |
| Patient ID (pharmacy) | `ONY-P-{SEQ}` | ONY-P-0045 | Pharmacy staff (instead of patient name) |
| Order ID | `ORD-{SEQ}` | ORD-001234 | Pharmacy staff, admin, delivery |

---

## 16. Feature Flags (MVP)

All disabled for MVP. Build the interfaces but gate behind flags for future activation.

| Flag | Value | Meaning |
|------|-------|---------|
| `VIDEO_CONSULTATION_ENABLED` | `false` | Async text+photos only. No video. |
| `THIRD_PARTY_LAB_APIS` | `false` | Partner diagnostic centres, portal-tracked. No API integration. |
| `SHIPROCKET_DELHIVERY` | `false` | Local delivery (Rapido/Dunzo/own), coordinator-managed. |
| `COLD_CHAIN_TRACKING` | `false` | Manual insulated bag for GLP-1 pens. |
| `FACE_MATCH_VERIFICATION` | `false` | Government ID photo only. |
| `ABHA_INTEGRATION` | `false` | Not mandated. |
| `GPS_CHECKIN_NURSES` | `false` | Phase 2. |

---

## 17. Anti-Abuse: Free Consultation Tracker

One free initial consultation per vertical per user. Tracked via the `FreeConsultationTracker` model.

```typescript
model FreeConsultationTracker {
  id              String          @id @default(uuid())
  patientId       String
  patient         Patient         @relation(fields: [patientId], references: [id])
  condition       Condition       @map("vertical")
  used            Boolean         @default(false)
  usedAt          DateTime?
  consultationId  String?
  consultation    Consultation?   @relation(fields: [consultationId], references: [id])

  @@unique([patientId, condition])
  @@index([patientId])
}
```

A patient can have 1 free Hair Loss consultation AND 1 free ED consultation AND 1 free PE consultation, etc. But not 2 free Hair Loss consultations.

---

## 18. Refund Scenarios

Since patients do not pay before doctor review, pre-consultation refund scenarios are eliminated.

| Scenario | Refund Amount | Destination |
|----------|--------------|-------------|
| After payment, before pharmacy dispatches | 100% | Wallet |
| Delivery failure | 100% | Wallet or original payment method |
| Wrong medication dispensed | 100% + replacement | Original payment method |
| Subscription cancellation mid-cycle | Prorated remaining days | Wallet |
| Doctor-initiated (post-payment contraindication found) | Full refund | Original payment method |

---

## 19. Patient Workflow Sections 12–15 (Redesigned)

This section provides the content that was meant to go into the missing `WORKFLOW-PATIENT-UPDATED-SECTIONS.md` companion file.

**Source:** WORKFLOW-PATIENT-CHANGES.md instructions + BACKEND-ALL-CHANGES.md + APP-PATIENT-CHANGES.md

**Instruction:** Delete everything from old §12 "Plan Selection" through old §15 "Doctor Review Outcomes" in WORKFLOW-PATIENT.md and replace with these 4 sections.

### §12. Post-Assessment Confirmation & Waiting (FREE)

After submitting the questionnaire and photos, the patient sees a confirmation screen:

**What the patient sees:**
- "Your assessment has been submitted" confirmation
- "A specialist doctor will review your case — this is completely free"
- Estimated review time: within 24 hours
- Animation/progress indicator showing case status

**Status flow from patient's perspective:**
```
SUBMITTED → AI_PROCESSING → AI_COMPLETE → ASSIGNED → REVIEWING
```

The patient can check back anytime. They receive a push notification when the doctor begins reviewing (status reaches REVIEWING).

If the doctor requests more information (MORE_INFO_REQUESTED), the patient receives a notification with the doctor's question and can respond in-app. The case returns to REVIEWING after the patient responds.

If the doctor orders lab work (LAB_ORDERED), the patient receives instructions to book a lab appointment. Labs during the initial free consultation are FREE.

### §13. Doctor Review Outcomes (Patient Perspective)

The doctor's review results in one of these outcomes:

**Outcome A — Treatment Plan Created (PRESCRIBED → AWAITING_PAYMENT)**
- Patient receives notification: "Your treatment plan is ready"
- Patient opens app to view the personalized treatment plan
- Plan shows: condition summary, prescribed medications with dosages, expected timeline, what's included in subscription
- Patient is NOT yet charged — they choose whether to subscribe

**Outcome B — Referred (REFERRED — terminal)**
- Patient receives notification: "Your doctor recommends an in-person consultation"
- Referral reason explained
- Suggested specialist type displayed
- No payment collected. Case is closed.

**Outcome C — Declined (DECLINED — terminal)**
- Patient receives notification: "Based on your assessment, this treatment program isn't the right fit"
- Doctor's reasoning provided (age, contraindications, severity, etc.)
- Alternative suggestions if applicable
- No payment collected. Case is closed.

### §14. Treatment Plan Ready & Plan Selection

When the patient opens the treatment plan (status: AWAITING_PAYMENT):

**Treatment Plan Screen shows:**
- Doctor's name and qualification
- Condition assessment summary
- Prescribed medications with dosages and instructions
- Expected treatment duration
- Recommended follow-up schedule
- "What's Included" breakdown

**Plan Selection:**
- Three subscription options displayed: Monthly / Quarterly / 6-Month
- Per-month price breakdown for each
- Savings percentage for longer plans
- "Most Popular" badge on Quarterly

**Weight Management specific:** Doctor's tier recommendation (Standard vs GLP-1 Premium) shown. Both tiers displayed with doctor's recommendation highlighted.

**30-day expiry:** If the patient does not subscribe within 30 days, the treatment plan expires (EXPIRED_UNPAID — terminal). The patient must start a new assessment. BullMQ reminders are sent at days 3, 7, and 14.

### §15. Payment & Subscription Activation (Razorpay Checkout)

After selecting a plan:

**Payment Flow:**
1. Patient taps "Subscribe" on chosen plan
2. Razorpay checkout opens (in-app WebView)
3. Payment methods: UPI, Credit/Debit Card, Net Banking, Wallets
4. For Monthly/Quarterly: Razorpay creates recurring subscription with autopay mandate
5. For 6-Month: Razorpay processes one-time payment
6. On success: status transitions PAYMENT_COMPLETE → PHARMACY_PROCESSING (automatic)

**Post-Payment Confirmation:**
- "Welcome to your treatment journey" screen
- First medication order created automatically
- Estimated delivery timeline shown
- Treatment day counter begins after delivery

**Payment Failure Handling:**
- Razorpay retry mechanism
- Patient can retry with different payment method
- Status remains AWAITING_PAYMENT until successful payment
- No timeout on payment attempts (only the 30-day plan expiry)

---

## Document Ends Here

**If any other spec document contradicts a value in this file, this file is correct.** Update the other document, not this one. The only exception is if the founder explicitly approves a change to the values defined here — in which case, update this file first, then propagate.
