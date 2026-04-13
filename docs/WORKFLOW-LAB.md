# WORKFLOW-LAB.md — Lab Technician Workflow: Complete Operational Guide

> **Platform:** Onlyou Telehealth — Indian telehealth for stigmatized chronic conditions
> **Role:** Lab Technician / Diagnostic Centre Staff
> **Portal:** `lab.onlyou.life` — Next.js 14 PWA (mobile-first)
> **Auth:** Phone OTP (WhatsApp primary, SMS fallback) → JWT (role: `LAB_TECH`)
> **Primary Device:** Tablet or phone at the lab counter
> **Scope:** Covers every lab workflow from sample arrival to result upload, including edge cases, cross-portal synchronization, backend service integration, SLA enforcement, and known issues from verification reports

---

## Table of Contents

1. [Lab Technician Role Overview & Context](#1-lab-technician-role-overview--context)
2. [Authentication & Session Lifecycle](#2-authentication--session-lifecycle)
3. [Lab Order Lifecycle — End-to-End Status Flow](#3-lab-order-lifecycle--end-to-end-status-flow)
4. [Workflow 1: Receiving Incoming Samples](#4-workflow-1-receiving-incoming-samples)
5. [Workflow 2: Processing Samples](#5-workflow-2-processing-samples)
6. [Workflow 3: Uploading Results](#6-workflow-3-uploading-results)
7. [Workflow 4: Critical Value Handling](#7-workflow-4-critical-value-handling)
8. [Workflow 5: Reporting Sample Issues & Recollection](#8-workflow-5-reporting-sample-issues--recollection)
9. [Workflow 6: Patient Self-Upload Bypass](#9-workflow-6-patient-self-upload-bypass)
10. [Backend Service Integration](#10-backend-service-integration)
11. [tRPC API Reference — Lab Router](#11-trpc-api-reference--lab-router)
12. [File Storage & PDF Upload Pipeline](#12-file-storage--pdf-upload-pipeline)
13. [Real-Time System (SSE + Redis Pub/Sub)](#13-real-time-system-sse--redis-pubsub)
14. [Notification System — Inbound & Outbound](#14-notification-system--inbound--outbound)
15. [SLA Thresholds & BullMQ Escalation Engine](#15-sla-thresholds--bullmq-escalation-engine)
16. [Privacy Model & RBAC — Data the Lab Cannot See](#16-privacy-model--rbac--data-the-lab-cannot-see)
17. [Cross-Portal Synchronization Matrix](#17-cross-portal-synchronization-matrix)
18. [Test Panels by Medical Vertical](#18-test-panels-by-medical-vertical)
19. [Error States & Edge Cases](#19-error-states--edge-cases)
20. [Audit Logging & DPDPA Compliance](#20-audit-logging--dpdpa-compliance)
21. [Known Issues & Fixes from Verification Reports](#21-known-issues--fixes-from-verification-reports)
22. [Cross-Reference Index](#22-cross-reference-index)

---

## 1. Lab Technician Role Overview & Context

### 1.1 Who Is the Lab Technician in Onlyou?

The lab technician is staff at a partner diagnostic centre who processes blood samples collected by nurses during home visits. In the Onlyou platform, the lab is the analytical bridge between the nurse's physical sample collection and the doctor's clinical decision-making. Without the lab, the blood-work-dependent verticals cannot progress past the sample collection phase. All five verticals have defined lab panels — Hair Loss, Weight Management, and PCOS nearly always require blood work as part of the standard clinical workup, while ED and PE have panels ordered based on clinical suspicion (e.g., PE has 4 distinct panels: Thyroid Check, Hormonal, Prostate, Combined).

**Key characteristics:**

- Works at a partner diagnostic centre (external entity, not Onlyou employee)
- Uses a PWA at `lab.onlyou.life` — installable on home screen (tablet or phone at the counter)
- Has NO access to any patient personal data (name, phone, address, diagnosis, questionnaire, AI assessment, prescriptions, doctor notes, payment info)
- Has FULL access to: anonymous sample ID, test names, nurse delivery info, tube count, urgency level, lab-specific notes (e.g., "Fasting sample"), own diagnostic centre profile
- Each lab staff account is linked to exactly one `DiagnosticCentre` record — all data access is scoped to that centre via JWT `diagnosticCentreId` claim
- Multiple lab staff can share the same portal for one centre (each with their own login phone)
- Managed by the admin/coordinator via the Admin Portal partner management section

*(Source: PORTAL-LAB-FIXED.md §4, BACKEND-PART3A.md §22.4)*

### 1.2 Interaction Touchpoints with Other Roles

| Role | How Lab Interacts | Direction |
|------|-------------------|-----------|
| **Nurse** | Nurse physically delivers blood samples to the diagnostic centre; lab staff receives and confirms tube count | Nurse → Lab (sample handoff) |
| **Admin/Coordinator** | Admin assigns diagnostic centre to lab orders, monitors lab SLAs, manages lab partner profiles, receives issue alerts | Admin ↔ Lab (operational) |
| **Doctor** | Indirectly — doctor orders blood work which eventually arrives at lab; lab results are visible to doctor in case review; critical results trigger urgent doctor notifications | Lab → Doctor (results) |
| **Patient** | No direct interaction. Patient receives status notifications as lab processes their sample. Patient only sees anonymous progress updates. | Lab → Patient (indirect via notifications) |
| **Pharmacy** | No direct interaction | — |

*(Source: PORTAL-LAB-FIXED.md §21, WORKFLOW-NURSE-PART1.md §1.1)*

### 1.3 Lab Capabilities — MVP Scope

| Capability | MVP | Phase 2+ |
|-----------|-----|----------|
| Receive sample from nurse | ✅ | — |
| Tube count confirmation + discrepancy flagging | ✅ | — |
| Start processing (manual status transition) | ✅ | Auto-detect via lab integration |
| Upload result PDF (camera capture or file picker) | ✅ | — |
| Flag each test result (Normal/Abnormal/Critical) | ✅ | Auto-parse from PDF |
| Report sample issue (6 predefined reasons) | ✅ | — |
| View own diagnostic centre profile | ✅ | — |
| Real-time notifications (SSE + push) | ✅ | — |
| Batch processing dashboard | ❌ | ✅ Phase 2 |
| Direct lab-to-doctor messaging | ❌ | ✅ Phase 2 |
| LIMS (Laboratory Information Management System) integration | ❌ | ✅ Phase 3 |

*(Source: PORTAL-LAB-FIXED.md §1, onlyou-spec-resolved-v4.md Phase 4)*

---

## 2. Authentication & Session Lifecycle

### 2.1 Login Flow

Lab staff authenticate using phone OTP, identical to all other portal roles.

**Step 1 — Phone Entry:**
- Staff enters their registered phone number (linked to their diagnostic centre by admin)
- Primary OTP channel: WhatsApp; fallback: SMS
- OTP rate limiting: max 3 requests per phone per 15 minutes

**Step 2 — OTP Verification:**
- 6-digit OTP, 5-minute expiry
- Max 5 wrong attempts → locked for 30 minutes
- On success: JWT issued with `role: LAB_TECH` and `diagnosticCentreId` claim

**Step 3 — Post-Login:**
- Redirect to `/incoming` (default tab)
- Push notification permission requested (not on login page — after first successful login)
- PWA install prompt shown on first visit

*(Source: PORTAL-LAB-FIXED.md §2, BACKEND-PART1.md §4)*

### 2.2 Token Management

| Token | Type | Duration | Storage |
|-------|------|----------|---------|
| Access token | JWT (RS256) | 15 minutes | Memory (Zustand store) |
| Refresh token | Opaque | 7 days | `httpOnly`, `Secure`, `SameSite=Strict` cookie |

**JWT payload:**
```json
{
  "sub": "user-uuid",
  "role": "LAB_TECH",
  "diagnosticCentreId": "centre-uuid",
  "iat": 1706000000,
  "exp": 1706000900
}
```

**Critical:** The `diagnosticCentreId` in the JWT auto-scopes ALL database queries to this centre. Lab staff from Centre A can never see Centre B's orders — this is enforced at the middleware level, not just the UI.

*(Source: PORTAL-LAB-FIXED.md §2, §17, BACKEND-PART3A.md §22)*

### 2.3 Session Rules

| Rule | Behavior |
|------|----------|
| Single session only | New login from different device → previous session invalidated |
| Token refresh window | Last 2 minutes of access token lifetime |
| Idle session timeout | 12 hours of no API activity → session terminated (matches pharmacy portal for partner consistency) |
| Max session duration | 7 days (refresh token expiry) |
| Logout | Clears access token from memory + calls `/auth/logout` to invalidate refresh token server-side + clears cookie |
| Token blacklisting | On logout, JWT JTI stored in Redis SET with TTL matching remaining lifetime |
| CORS | Only `lab.onlyou.life` origin allowed |

*(Source: PORTAL-LAB-FIXED.md §2, §17)*

---

## 3. Lab Order Lifecycle — End-to-End Status Flow

### 3.1 Complete Status Flow (All Actors)

This diagram shows the full lab order lifecycle from doctor's order through to case closure. The lab portal's scope is marked between the `***` indicators.

```
DOCTOR ORDERS BLOOD WORK
        │
        ▼
   ┌─────────┐
   │ ORDERED  │ ← Doctor created order via case review
   └────┬─────┘
        │ Patient books slot OR coordinator assigns
        ▼
  ┌────────────┐
  │ SLOT_BOOKED│ ← Patient selected date + time + address
  └─────┬──────┘
        │ Coordinator assigns nurse
        ▼
 ┌──────────────┐
 │NURSE_ASSIGNED│ ← Nurse appears in Nurse Portal
 └──────┬───────┘
        │ Nurse starts travel
        ▼
 ┌──────────────┐
 │NURSE_EN_ROUTE│ ← Nurse tapped "Start Visit"
 └──────┬───────┘
        │ Nurse arrives
        ▼
 ┌──────────────┐
 │NURSE_ARRIVED │ ← Nurse at patient's home
 └──────┬───────┘
        │ Nurse collects blood, records vitals + tube count
        ▼
┌─────────────────┐
│SAMPLE_COLLECTED  │ ← Nurse marked collected
└────────┬────────┘
         │ Nurse delivers to diagnostic centre
         ▼
┌──────────────────┐
│    AT_LAB        │ ← Nurse confirmed delivery to lab
└────────┬─────────┘
         │
    *** LAB PORTAL STARTS HERE ***
         │ Lab confirms receipt, verifies tube count
         ▼
┌──────────────────┐
│ SAMPLE_RECEIVED  │ ← Lab staff tapped "Mark Received"
└────────┬─────────┘
         │ Lab begins processing
         ▼
  ┌────────────┐
  │ PROCESSING │ ← Lab staff tapped "Start Processing"
  └─────┬──────┘
        │ Lab uploads results + flags each test
        ▼
 ┌──────────────┐
 │RESULTS_READY │ ← Lab staff submitted results + PDF
 └──────┬───────┘
         │
    *** LAB PORTAL ENDS HERE ***
         │ Doctor reviews results
         ▼
┌─────────────────┐
│DOCTOR_REVIEWED  │ ← Doctor reviewed + took action
└────────┬────────┘
         ▼
    ┌────────┐
    │ CLOSED │ ← Order complete
    └────────┘
```

**Special paths:**

```
Patient Self-Upload (bypasses lab entirely):
  ORDERED → RESULTS_UPLOADED → DOCTOR_REVIEWED → CLOSED

Lab Reports Issue (at any lab stage):
  SAMPLE_RECEIVED or PROCESSING → SAMPLE_ISSUE → RECOLLECTION_NEEDED
  → System auto-creates new lab order for recollection

Nurse Can't Collect:
  NURSE_ASSIGNED or NURSE_EN_ROUTE → COLLECTION_FAILED → rescheduled

Coordinator Cancels:
  Any pre-RESULTS_READY status → CANCELLED (terminal)
```

*(Source: PORTAL-LAB-FIXED.md §22, BACKEND-PART2A.md §12.1)*

### 3.2 Status Enum — Canonical Definition

> **⚠️ Known Cross-Document Issue (Resolved):** The Prisma schema in BACKEND-PART2A.md §12.2 uses `AT_LAB` as the canonical enum value for when nurse delivers to lab. PORTAL-LAB-FIXED.md uses `DELIVERED_TO_LAB`. PORTAL-NURSE-FIXED.md §14 recommends adopting `AT_LAB` as canonical. **Resolution:** Use `AT_LAB` in the Prisma enum (source of truth), and update all portal display logic to map this status correctly.

```typescript
enum LabOrderStatus {
  ORDERED               // Doctor creates lab order
  SLOT_BOOKED           // Patient selected date + time + address
  NURSE_ASSIGNED        // Coordinator assigned nurse
  NURSE_EN_ROUTE        // Nurse started travelling
  NURSE_ARRIVED         // Nurse at patient's home
  SAMPLE_COLLECTED      // Nurse collected blood (tube count recorded)
  AT_LAB                // Canonical: nurse delivered to lab (⚠️ called DELIVERED_TO_LAB in some portal docs)
  SAMPLE_RECEIVED       // Lab confirmed receipt
  PROCESSING            // Lab started processing
  RESULTS_READY         // Lab uploaded results + PDF
  RESULTS_UPLOADED      // Patient self-upload path (bypasses lab)
  DOCTOR_REVIEWED       // Doctor reviewed + took action
  CLOSED                // Terminal success state
  COLLECTION_FAILED     // Nurse couldn't collect
  SAMPLE_ISSUE          // Lab reported a problem
  RECOLLECTION_NEEDED   // System created recollection order
  CANCELLED             // Cancelled by coordinator/doctor
}
```

*(Source: BACKEND-PART2A.md §12.2, backend-errors-report.md Issue #3, FIXES-CHANGELOG.md)*

### 3.3 Lab Portal Visible Statuses

The lab portal only sees orders in these statuses:

| Status | Tab | Display |
|--------|-----|---------|
| `AT_LAB` | Incoming | "Awaiting Receipt" |
| `SAMPLE_RECEIVED` | Processing | "Awaiting Processing" |
| `PROCESSING` | Processing + Upload | "Currently Processing" / "Ready for Upload" |
| `RESULTS_READY` | Upload | "Recently Uploaded" |
| `SAMPLE_ISSUE` | Processing | "Issue Reported" badge |

All pre-lab statuses (`ORDERED` through `SAMPLE_COLLECTED`) and post-lab statuses (`DOCTOR_REVIEWED`, `CLOSED`) are invisible to the lab portal.

*(Source: PORTAL-LAB-FIXED.md §22)*

### 3.4 Valid Status Transitions — Lab Portal Scope

| Current Status | Action | New Status | Who |
|----------------|--------|------------|-----|
| `AT_LAB` | Mark Received | `SAMPLE_RECEIVED` | Lab staff |
| `SAMPLE_RECEIVED` | Start Processing | `PROCESSING` | Lab staff |
| `PROCESSING` | Submit Results | `RESULTS_READY` | Lab staff |
| `AT_LAB` / `SAMPLE_RECEIVED` / `PROCESSING` | Report Issue | `SAMPLE_ISSUE` | Lab staff |

> **⚠️ Cross-Document Inconsistency:** The portal specification (PORTAL-LAB-FIXED.md §22) lists `DELIVERED_TO_LAB` (i.e., `AT_LAB`) as a valid status for reporting issues, but the backend `reportSampleIssue` method (BACKEND-PART2A.md §12.3) only checks `['SAMPLE_RECEIVED', 'PROCESSING']` — missing `AT_LAB`. During implementation, the backend status check must be expanded to include `AT_LAB` to match the portal spec.

**Invalid transitions (server rejects with 400):**

| Attempted Transition | Why Blocked |
|---------------------|-------------|
| `AT_LAB` → `PROCESSING` | Must receive first |
| `AT_LAB` → `RESULTS_READY` | Must receive and process first |
| `RESULTS_READY` → `PROCESSING` | Cannot go backwards |
| `SAMPLE_ISSUE` → any | Issue is terminal for this order (new recollection order created) |
| `CANCELLED` → any | Cancelled is terminal |

*(Source: PORTAL-LAB-FIXED.md §22, BACKEND-PART2A.md §12.3)*

---

## 4. Workflow 1: Receiving Incoming Samples

### 4.1 Trigger

A sample appears in the lab portal's **Incoming** tab when a nurse taps "Confirm Delivery to Lab" in the Nurse Portal and selects this diagnostic centre. The nurse portal API call:

```typescript
trpc.nurse.visits.deliverToLab.mutate({
  visitIds: ['uuid-1', 'uuid-2'],   // Array of visit IDs being delivered
  labId: 'uuid',                     // This diagnostic centre's ID
  tubeCount: 5                       // Total tubes being delivered
})
```

**Server-side (per visit):**
1. Updates `NurseVisit.deliveredToLabAt` + `deliveredToLabId` + `deliveryTubeCount`
2. Updates each related `LabOrder.status` → `AT_LAB` + sets `deliveredToLabAt` timestamp
3. Publishes SSE event `lab.sample_delivered` to the lab portal's channel
4. Notifies patient (push + WhatsApp): "Your blood sample has been delivered to the lab."
5. Audit log entry: `nurse_delivered_to_lab`

*(Source: PORTAL-NURSE-FIXED.md §14, BACKEND-PART2A.md §12.3, §13.4)*

### 4.2 Incoming Tab — What the Lab Tech Sees

Each incoming sample card displays:

| Field | Source | Example |
|-------|--------|---------|
| Urgency badge | `labOrder.urgency` | 🔴 URGENT (red) or no badge (routine) |
| Sample ID | `labOrder.sampleId` | "ONY-2026-0045" (monospace, formatted for verbal communication) |
| Tests ordered | `labOrder.tests[]` | "TSH, Free T4, Ferritin, Vitamin D, DHT, Hemoglobin" |
| Delivered by | `labOrder.nurseDeliveredBy` | "Priya N." (nurse's display name) |
| Delivery time | `labOrder.deliveredAt` | "10:35 AM (25m ago)" — relative time |
| Tubes expected | `labOrder.tubeCountExpected` | "3" |
| Lab notes | `labOrder.labNotes` | "⚠️ Fasting sample" (if present) |

**Sorting:** Urgent samples pinned to top, then oldest delivery first (longest waiting = top).

**Real-time:** New deliveries appear without page refresh via SSE `lab.sample_delivered` event.

*(Source: PORTAL-LAB-FIXED.md §7)*

### 4.3 "Mark Received" Flow — Step by Step

**Step 1:** Lab staff taps the large "✅ Mark Received" button on the sample card.

**Step 2:** Confirmation modal opens with tube count verification:

| Field | Behavior |
|-------|----------|
| Sample ID | Displayed (read-only) |
| Tubes expected | Displayed from nurse's delivery report |
| Tubes received | Numeric input, pre-filled with expected count |
| Condition checkbox | "All tubes in good condition" |

**Step 3a — Tube count matches:**
- Staff confirms → API call executes
- Status transitions to `SAMPLE_RECEIVED`
- Sample card moves from Incoming tab to Processing tab
- Badge count on Incoming decreases by 1

**Step 3b — Tube count does NOT match (discrepancy):**
- Discrepancy warning appears: "⚠️ TUBE COUNT MISMATCH — Expected: 3, Received: 2"
- Mandatory text field: "Add note about discrepancy" (e.g., "One tube broken during transit")
- Staff can proceed with "Receive with Discrepancy" or cancel
- Coordinator is notified of the discrepancy via push notification

**Backend API call:**
```typescript
trpc.lab.labOrder.markReceived.mutate({
  id: 'lab-order-uuid',
  tubeCountReceived: 3,
  discrepancyNote: undefined  // or 'One tube broken during transit'
})
```

**Backend service (`markSampleReceived`):**
```typescript
// BACKEND-PART2A.md §12.3
async markSampleReceived(labOrderId: string, labStaffId: string): Promise<LabOrder> {
  const labOrder = await this.prisma.labOrder.findUniqueOrThrow({ where: { id: labOrderId } });
  this.assertStatus(labOrder, 'AT_LAB', 'markSampleReceived');

  const updated = await this.prisma.labOrder.update({
    where: { id: labOrderId },
    data: { status: 'SAMPLE_RECEIVED', sampleReceivedAt: new Date() },
  });

  // SSE to admin dashboard
  this.eventEmitter.emit('sse.broadcast', {
    channel: 'admin',
    event: 'labOrder.status_changed',
    data: { labOrderId, status: 'SAMPLE_RECEIVED' },
  });

  // Schedule SLA: results must be ready within 48 hours
  this.eventEmitter.emit('sla.schedule', {
    type: 'lab_results',
    labOrderId,
    thresholdMinutes: 48 * 60,
  });

  return updated;
}
```

**Post-receipt notifications:**

| Recipient | Channel | Message |
|-----------|---------|---------|
| Patient | Push + WhatsApp | "Lab received your sample" |
| Coordinator | SSE | Lab order status badge update |
| Doctor | SSE | Lab order status badge update (if case is open) |

**Audit log entry:** `lab_staff_received_sample`

*(Source: PORTAL-LAB-FIXED.md §7, BACKEND-PART2A.md §12.3)*

---

## 5. Workflow 2: Processing Samples

### 5.1 Processing Tab — Two Sub-States

The Processing tab shows samples in two sections:

**Section 1 — Awaiting Processing** (status: `SAMPLE_RECEIVED`):
- Shows "▶️ Start Processing" button
- Shows "⚠️ Report Issue" button
- Sorted: oldest first (longest wait time = top), urgent items pinned to top

**Section 2 — Currently Processing** (status: `PROCESSING`):
- Shows "📤 Upload Results" button
- Shows "⚠️ Report Issue" button
- Shows elapsed time since processing started
- Sorted: urgent first, then longest processing time first

### 5.2 "Start Processing" Action

This is a low-friction, single-tap action (no confirmation modal needed — busy labs need speed).

**On tap:**
- Immediate status change to `PROCESSING`
- `processingStartedAt` timestamp set
- Card moves from "Awaiting Processing" section to "Currently Processing" section
- SSE event → admin dashboard updates

**Backend service (`startProcessing`):**
```typescript
// BACKEND-PART2A.md §12.3
async startProcessing(labOrderId: string, labStaffId: string): Promise<LabOrder> {
  const labOrder = await this.prisma.labOrder.findUniqueOrThrow({ where: { id: labOrderId } });
  this.assertStatus(labOrder, 'SAMPLE_RECEIVED', 'startProcessing');

  return this.prisma.labOrder.update({
    where: { id: labOrderId },
    data: { status: 'PROCESSING', processingStartedAt: new Date() },
  });
}
```

*(Source: PORTAL-LAB-FIXED.md §8, BACKEND-PART2A.md §12.3)*

### 5.3 Time Alert Visual Cues

| Condition | Visual | Purpose |
|-----------|--------|---------|
| Received > 2 hours ago, not yet processing | Amber warning border on card | Nudge lab to start processing |
| Processing > 24 hours, no results | Red warning border + "Overdue" badge | Flag overdue results |
| Urgent sample at any stage | Red "🔴 URGENT" badge | Priority indicator |

*(Source: PORTAL-LAB-FIXED.md §8)*

---

## 6. Workflow 3: Uploading Results

### 6.1 Overview

Result upload is the most complex flow in the lab portal. It involves three steps: PDF upload, per-test result flagging, and review before submission. The Upload tab shows samples in `PROCESSING` status that are ready for result entry.

### 6.2 Step 1 — Upload Report PDF

**Two input methods:**

| Method | Behavior |
|--------|----------|
| 📷 Take Photo of Report | Opens device camera → captures photo → auto-converts to optimized image |
| 📁 Choose File from Device | Opens device file browser → select PDF or image |

**File constraints:**
- Accepted types: `application/pdf`, `image/jpeg`, `image/png`
- Max file size: 10 MB
- Upload via S3 presigned PUT URL → stored in `onlyou-lab-results` bucket
- S3 bucket has SSE-KMS encryption
- Access via CloudFront signed URLs (1-hour expiry) for doctor and patient viewing

**Upload pipeline (client-side):**
1. Lab staff captures or selects file
2. Client requests presigned PUT URL: `trpc.lab.upload.getPresignedUrl.query({ fileName, contentType })`
3. Server generates presigned URL (15-minute expiry, SSE-KMS):
   ```typescript
   // BACKEND-PART2B.md §20.7
   const key = `lab-results/${input.labOrderId}/${Date.now()}.${ext}`;
   return ctx.storageService.getUploadUrl({
     bucket: 'onlyou-lab-results',
     key,
     contentType: input.contentType,
     metadata: { 'lab-order-id': input.labOrderId },
   });
   ```
4. Client uploads directly to S3 (binary data never touches the API server)
5. Preview shown — lab staff can retake/reselect
6. "Next" button enabled only after successful upload

*(Source: PORTAL-LAB-FIXED.md §9, BACKEND-PART2B.md §20.1, §20.7, §20.8)*

### 6.3 Step 2 — Flag Each Test Result

For **each test** in the ordered panel, the lab tech enters:

| Input | Required | Description |
|-------|----------|-------------|
| Test name | Auto-populated | From `labOrder.tests[].name` — not editable |
| Result value | Optional | Free text (e.g., "2.1 mIU/L", "18 ng/mL") — for quick doctor reference |
| Status flag | **Required** | One of: ✅ Normal / ⚠️ Abnormal / 🔴 Critical |

**Status flag radio buttons (visually distinct):**
- ✅ **Normal** — green outline, check icon
- ⚠️ **Abnormal** — amber outline, warning icon
- 🔴 **Critical** — red outline, alert icon

**Validation rules:**
- All tests MUST have a status flag selected before proceeding
- Result value is optional (the PDF is the authoritative source)
- If any test is flagged 🔴 Critical → warning shown: "Critical values will trigger urgent notifications to the doctor."

*(Source: PORTAL-LAB-FIXED.md §9)*

### 6.4 Step 3 — Review & Submit

The review screen shows a complete summary: uploaded PDF indicator, all test results with values and flags, and a count of normal/abnormal/critical results.

**Submit action sequence:**
1. Lab staff reviews summary
2. Taps "Submit Results"
3. Confirmation dialog: "Submit results for ONY-2026-0042? This cannot be undone." → [Cancel] / [Submit]
4. API call executes
5. Status → `RESULTS_READY`
6. Notification cascade fires (see §7 for critical value handling)
7. Success toast: "Results submitted successfully"
8. Redirect back to Upload tab list

**Backend API call:**
```typescript
trpc.lab.labOrder.submitResults.mutate({
  id: 'lab-order-uuid',
  resultPdfUrl: 's3://onlyou-lab-results/lab-order-uuid/1709123456.pdf',
  resultFlags: [
    { testId: 'test-1', testName: 'TSH', resultValue: '2.1 mIU/L', status: 'normal' },
    { testId: 'test-2', testName: 'Free T4', resultValue: '1.2 ng/dL', status: 'normal' },
    { testId: 'test-3', testName: 'Ferritin', resultValue: '18 ng/mL', status: 'abnormal' },
  ]
})
```

**Backend service (`uploadResults`):**
```typescript
// BACKEND-PART2A.md §12.3
async uploadResults(labOrderId: string, resultPdfUrl: string, resultData: any, labStaffId: string): Promise<LabOrder> {
  const labOrder = await this.prisma.labOrder.findUniqueOrThrow({ where: { id: labOrderId } });

  if (!['SAMPLE_RECEIVED', 'PROCESSING'].includes(labOrder.status)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot upload results in current status' });
  }

  // Auto-transition: if still in SAMPLE_RECEIVED, advance to PROCESSING first
  // (PORTAL-LAB-FIXED.md §18: "Auto-transition to Processing first, then allow upload")
  if (labOrder.status === 'SAMPLE_RECEIVED') {
    await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: { status: 'PROCESSING', processingStartedAt: new Date() },
    });
  }

  const updated = await this.prisma.labOrder.update({
    where: { id: labOrderId },
    data: {
      status: 'RESULTS_READY',
      resultPdfUrl,
      resultData,
      resultsReadyAt: new Date(),
    },
  });

  // Determine if critical results present
  const hasCritical = resultData?.some?.((r: any) => r.status === 'critical');

  // Notify doctor
  this.eventEmitter.emit('notification.send', {
    userId: labOrder.doctorId,
    event: hasCritical ? 'critical_lab_results' : 'lab_results_ready',
    data: { labOrderId, hasCritical },
  });

  // Notify patient
  this.eventEmitter.emit('notification.send', {
    userId: labOrder.patientId,
    event: 'lab_results_available',
    data: { labOrderId, resultPdfUrl },
  });

  // SSE to admin
  this.eventEmitter.emit('sse.broadcast', {
    channel: 'admin',
    event: 'laborder.results_ready',
    data: { labOrderId, hasCritical },
  });

  // Schedule SLA: doctor must review within 24 hours
  this.eventEmitter.emit('sla.schedule', {
    type: 'doctor_lab_review',
    labOrderId,
    thresholdMinutes: 24 * 60,
  });

  return updated;
}
```

*(Source: PORTAL-LAB-FIXED.md §9, BACKEND-PART2A.md §12.3)*

---

## 7. Workflow 4: Critical Value Handling

### 7.1 Trigger

When **ANY** test in a result upload is flagged as 🔴 **Critical**, the system activates the urgent notification pipeline. This is determined by the `hasCritical` flag computed during result submission.

### 7.2 Notification Cascade — Critical Results

| Recipient | Channel | Message | Timing |
|-----------|---------|---------|--------|
| Doctor | SSE (dashboard) | 🔴 CRITICAL badge on case queue item (red, pulsing) | Immediate |
| Doctor | Push notification | "URGENT: Critical lab result for [AnonymousID]. Review immediately." | Immediate |
| Doctor | WhatsApp | "🔴 Critical lab result uploaded. Please review in your dashboard." | Immediate |
| Coordinator | SSE (admin dashboard) | 🔴 CRITICAL alert in activity feed | Immediate |
| Coordinator | Push notification | "URGENT: Critical lab result — Order #[ID]" | Immediate |
| Patient | Push notification | "Important results detected. Your doctor is being notified urgently." | Immediate |
| Patient | WhatsApp | "Your lab results have important findings. Your doctor will review them shortly." | Immediate |

**Critical safety note:** Patient notifications for critical values use careful, non-alarming language. The patient is NOT told the specific critical value — only that important results were found and the doctor is reviewing them.

### 7.3 Non-Critical Results — Standard Notifications

| Recipient | Channel | Message |
|-----------|---------|---------|
| Doctor | SSE (dashboard) | 🟣 "Lab results ready" badge on case |
| Patient | Push + WhatsApp + Email (with PDF link) | "Your lab results are ready. Your doctor will review them shortly." |
| Coordinator | SSE (admin) | Activity feed entry |

### 7.4 Doctor Dashboard Behavior After Critical Results

- Case queue item shows 🔴 **CRITICAL** badge (red, pulsing animation)
- Lab Results tab in case review shows critical values with red background row
- Critical values are sorted to the top of the results summary
- Doctor SLA for review tightens: 24 hours standard, but critical results override quiet hours for notifications

*(Source: PORTAL-LAB-FIXED.md §10, PORTAL-DOCTOR.md §13, BACKEND-PART2A.md §12.3)*

---

## 8. Workflow 5: Reporting Sample Issues & Recollection

### 8.1 When the "Report Issue" Button Is Available

The "⚠️ Report Issue" button appears on sample cards in:
- **Incoming tab** — for samples awaiting formal receipt (status: `AT_LAB`) — allows lab staff to immediately flag a visibly damaged or problematic sample before formally receiving it in the system
- **Processing tab** — both "Awaiting Processing" and "Currently Processing" sections (status: `SAMPLE_RECEIVED` or `PROCESSING`)

### 8.2 Issue Reasons (Enum)

```typescript
enum SampleIssueReason {
  INSUFFICIENT_SAMPLE = 'INSUFFICIENT_SAMPLE',   // Not enough blood for all tests
  HEMOLYZED = 'HEMOLYZED',                       // Red blood cells ruptured
  WRONG_TUBE = 'WRONG_TUBE',                     // Incorrect collection tube type
  MISLABELED = 'MISLABELED',                     // Label doesn't match records
  SAMPLE_LEAKED = 'SAMPLE_LEAKED',               // Physical damage during transit
  OTHER = 'OTHER'                                 // Free text required
}
```

> **⚠️ Cross-Document Note:** The backend tRPC router in BACKEND-PART2A.md §12.3 uses a slightly different enum for issue types: `['hemolyzed', 'insufficient', 'wrong_tube', 'contaminated', 'other']`. The `contaminated` value maps to `SAMPLE_LEAKED` conceptually, and `MISLABELED` is missing from the backend enum. During implementation, the Prisma enum must be the single source of truth and both must be reconciled.

*(Source: PORTAL-LAB-FIXED.md §11, BACKEND-PART2A.md §12.3, backend-errors-report.md)*

### 8.3 Report Issue Flow — Step by Step

1. Lab staff taps "⚠️ Report Issue" on sample card
2. Modal opens with radio buttons for the 6 predefined reasons
3. "Other" requires free text notes (max 500 characters)
4. Additional notes field available for all reasons (optional)
5. Staff taps "Report Issue"

**Backend service (`reportSampleIssue`):**
```typescript
// BACKEND-PART2A.md §12.3
async reportSampleIssue(labOrderId: string, issueType: string, notes: string, labStaffId: string): Promise<LabOrder> {
  const labOrder = await this.prisma.labOrder.findUniqueOrThrow({ where: { id: labOrderId } });

  if (!['AT_LAB', 'SAMPLE_RECEIVED', 'PROCESSING'].includes(labOrder.status)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot report issue in current status' });
  }
  // NOTE: BACKEND-PART2A.md §12.3 currently only checks ['SAMPLE_RECEIVED', 'PROCESSING'].
  // AT_LAB must be added during implementation per PORTAL-LAB-FIXED.md §22 transitions table.

  // Mark original order as SAMPLE_ISSUE
  const updated = await this.prisma.labOrder.update({
    where: { id: labOrderId },
    data: {
      status: 'SAMPLE_ISSUE',
      sampleIssueType: issueType,
      sampleIssueNotes: notes,
    },
  });

  // Auto-create recollection order linked to original
  const recollectionOrder = await this.create({
    consultationId: labOrder.consultationId,
    patientId: labOrder.patientId,
    condition: labOrder.condition,
    testPanel: labOrder.testPanel,
    tests: labOrder.tests,
    price: 0,  // ← No charge for recollection — platform absorbs cost
  }, labOrder.doctorId);

  await this.prisma.labOrder.update({
    where: { id: recollectionOrder.id },
    data: { parentLabOrderId: labOrderId, recollectionReason: `${issueType}: ${notes}` },
  });

  // Update original to RECOLLECTION_NEEDED
  await this.prisma.labOrder.update({
    where: { id: labOrderId },
    data: { status: 'RECOLLECTION_NEEDED' },
  });

  // Notify patient
  this.eventEmitter.emit('notification.send', {
    userId: labOrder.patientId,
    event: 'recollection_needed',
    data: { reason: issueType },
  });

  return updated;
}
```

### 8.4 Post-Report Cascade

| Step | Action |
|------|--------|
| 1 | Original order status → `SAMPLE_ISSUE` then `RECOLLECTION_NEEDED` |
| 2 | Coordinator gets URGENT push + SSE alert: "⚠️ Sample issue: [reason] — [SampleID]" |
| 3 | System auto-creates new `LabOrder` with status `ORDERED`, `parentLabOrderId` linking to original, same tests/patient/doctor, price = ₹0 |
| 4 | New order appears in Admin Dashboard's Lab Orders tab with "Recollection" badge |
| 5 | Patient notified (push + WhatsApp): "We need to collect a new sample. Our team will contact you to schedule." |
| 6 | Original order card in lab portal shows "Issue Reported" status with reason |
| 7 | Audit log: `lab_reported_sample_issue` |

*(Source: PORTAL-LAB-FIXED.md §11, BACKEND-PART2A.md §12.3, PORTAL-ADMIN.md §10)*

---

## 9. Workflow 6: Patient Self-Upload Bypass

When a patient uploads their own lab results (from an external provider), the lab portal is completely bypassed. This is included here for completeness and to clarify what the lab does NOT see.

**Self-upload flow:**
1. Doctor orders blood work → patient sees "Book Home Collection" or "I Already Have Results — Upload"
2. Patient chooses upload → selects PDF or photo → enters date tests were done (must be within 90 days)
3. File uploaded to S3 bucket `onlyou-lab-results/self-upload/{patientId}/{labOrderId}_{timestamp}.pdf`
4. Status → `RESULTS_UPLOADED` (not `RESULTS_READY` — different enum value)
5. Doctor reviews with banner: "Patient self-uploaded — verify authenticity"

**Lab portal impact:** The lab portal never sees self-uploaded results. The order never transitions through `AT_LAB` / `SAMPLE_RECEIVED` / `PROCESSING`. The entire lab workflow is skipped.

**Cost impact:** Self-upload is free — no collection cost, no lab processing cost.

*(Source: APP-PATIENT.md §13.4, PORTAL-LAB-FIXED.md §21, WORKFLOW-PATIENT.md §19, BACKEND-PART2B.md §20.7)*

---

## 10. Backend Service Integration

### 10.1 Lab Orders Module Architecture

The `LabOrdersService` in `BACKEND-PART2A.md §12.3` is the central service handling all lab order state transitions. It uses NestJS's `EventEmitter2` for decoupled side effects (notifications, SSE, SLA scheduling).

**Module location:** `src/modules/lab-orders/lab-orders.service.ts`

**Key dependencies:**
- `PrismaClient` — database access (all queries auto-scoped by `diagnosticCentreId`)
- `EventEmitter2` — decoupled event publication for notifications, SSE, SLA, audit
- `StorageService` — S3 presigned URL generation for PDF uploads

**Status assertion pattern:**
```typescript
private assertStatus(labOrder: LabOrder, expectedStatus: string, action: string): void {
  if (labOrder.status !== expectedStatus) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Cannot ${action}: order is in ${labOrder.status}, expected ${expectedStatus}`,
    });
  }
}
```

### 10.2 Prisma Schema — LabOrder Model

```prisma
model LabOrder {
  id                    String          @id @default(uuid())
  orderNumber           String          @unique  // LAB-0001 format
  consultationId        String
  patientId             String
  doctorId              String

  // Test details
  condition             Condition
  testPanel             String           // 'Extended Hair Panel', 'PCOS Screen Panel', etc.
  tests                 String[]         // Individual test names: ['TSH', 'CBC', 'Ferritin']
  price                 Int              // Price in paisa (₹1,200 = 120000)
  paymentId             String?

  // Scheduling
  scheduledDate         DateTime?
  scheduledTimeSlot     String?
  collectionAddress     String?
  collectionCity        String?
  collectionPincode     String?

  // Assignments
  nurseId               String?
  diagnosticCentreId    String?

  // Status
  status                LabOrderStatus   @default(ORDERED)
  parentLabOrderId      String?          // Links to original order if recollection
  recollectionReason    String?

  // Results
  resultPdfUrl          String?
  resultData            Json?            // Per-test result flags

  // Issues
  sampleIssueType       String?          // 'hemolyzed', 'insufficient', 'wrong_tube', etc.
  sampleIssueNotes      String?

  // Timestamps
  slotBookedAt          DateTime?
  nurseAssignedAt       DateTime?
  sampleCollectedAt     DateTime?
  deliveredToLabAt      DateTime?
  sampleReceivedAt      DateTime?
  processingStartedAt   DateTime?
  resultsReadyAt        DateTime?
  doctorReviewedAt      DateTime?
  closedAt              DateTime?
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  // Relations
  consultation          Consultation     @relation(...)
  patient               User             @relation("PatientLabOrders", ...)
  doctor                User             @relation("DoctorLabOrders", ...)
  nurse                 Nurse?           @relation(...)
  diagnosticCentre      DiagnosticCentre? @relation(...)
  nurseVisit            NurseVisit?

  @@index([patientId])
  @@index([nurseId])
  @@index([diagnosticCentreId])
  @@index([status])
}
```

*(Source: BACKEND-PART2A.md §12.2)*

### 10.3 tRPC Middleware Chain

All lab portal tRPC procedures pass through this chain:

```
authMiddleware → roleCheck('LAB_TECH') → diagnosticCentreScope → auditLog → procedure
```

1. **authMiddleware** — validates JWT, extracts user ID and claims
2. **roleCheck('LAB_TECH')** — confirms user role matches (rejects with 403 if not)
3. **diagnosticCentreScope** — auto-adds `WHERE diagnosticCentreId = ?` to all queries using the JWT claim
4. **auditLog** — logs action to AuditLog table (INSERT-only, append-only)

> **⚠️ Fix Applied (FIXES-CHANGELOG.md MEDIUM-3):** Role enum standardized to UPPERCASE throughout all backend parts. `'lab'` → `'LAB_TECH'` in JWT payload, role guards, and CASL switch cases.

*(Source: PORTAL-LAB-FIXED.md §15, BACKEND-PART3A.md §22, FIXES-CHANGELOG.md MEDIUM-3)*

---

## 11. tRPC API Reference — Lab Router

### 11.1 Router: `lab.labOrder`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `list` | Query | `{ status?: LabOrderStatus[], page?: number, limit?: number }` | `{ items: LabOrderForLab[], total: number }` | List lab orders for this diagnostic centre |
| `getById` | Query | `{ id: string }` | `LabOrderForLab` | Get single lab order detail |
| `markReceived` | Mutation | `{ id: string, tubeCountReceived: number, discrepancyNote?: string }` | `LabOrderForLab` | Mark sample as received by lab |
| `startProcessing` | Mutation | `{ id: string }` | `LabOrderForLab` | Mark sample as processing started |
| `submitResults` | Mutation | `{ id: string, resultPdfUrl: string, resultFlags: ResultFlag[] }` | `LabOrderForLab` | Upload results + flag each test |
| `reportIssue` | Mutation | `{ id: string, reason: SampleIssueReason, notes?: string }` | `LabOrderForLab` | Report a sample issue |

### 11.2 Router: `lab.upload`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `getPresignedUrl` | Query | `{ fileName: string, contentType: string }` | `{ uploadUrl: string, fileUrl: string }` | Get S3 presigned URL for PDF upload |

### 11.3 Router: `lab.profile`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `getMe` | Query | `{}` | `{ user: LabStaff, centre: DiagnosticCentre }` | Get current lab staff profile + centre info |

### 11.4 tRPC Router in BACKEND-PART3B — Full Procedure List

The complete router tree (from BACKEND-PART3B.md §30.1) includes these lab-relevant procedures:

```
labOrder
├── create              mutation  → Doctor: create lab order
├── getById             query     → Get lab order detail
├── list                query     → List lab orders (filtered by role)
├── bookSlot            mutation  → Patient: book collection time slot
├── assignNurse         mutation  → Admin: assign nurse to collection visit
├── assignLab           mutation  → Admin: assign diagnostic centre
├── updateStatus        mutation  → Update lab order status (role-specific transitions)
├── uploadResults       mutation  → Lab: upload result PDF + flags
├── selfUploadResults   mutation  → Patient: self-upload results from external lab
├── reportIssue         mutation  → Lab: report issue with sample
└── requestRecollection mutation  → Admin/Doctor: request new collection

storage
├── getLabResultUploadUrl  mutation  → Lab: presigned URL for result upload
├── getDownloadUrl         query     → Any authorized: signed download URL
└── confirmPhotoUpload     mutation  → Patient: confirm S3 upload completion
```

*(Source: PORTAL-LAB-FIXED.md §15, BACKEND-PART2A.md §12.3, BACKEND-PART3B.md §30.1)*

---

## 12. File Storage & PDF Upload Pipeline

### 12.1 S3 Bucket Architecture (Lab-Relevant)

| Bucket | Contents | Encryption | Upload Method | Download Method |
|--------|----------|------------|---------------|-----------------|
| `onlyou-lab-results` | Lab result PDFs (uploaded by lab staff or patient) | SSE-KMS | Presigned PUT (15-min expiry) | CloudFront signed URL (1-hour expiry) |

**S3 Key Patterns:**
```
lab-results/{labOrderId}/{timestamp}.pdf              ← Lab staff upload
lab-results/self-upload/{patientId}/{labOrderId}_{timestamp}.pdf  ← Patient self-upload
```

### 12.2 Upload Flow (Lab Staff → S3)

```
1. Lab staff selects file (camera capture or file picker)
2. Client → tRPC mutation: getLabResultUploadUrl({ labOrderId, contentType })
3. Server → validates LAB_TECH role → generates presigned PUT URL (15-min expiry, SSE-KMS)
4. Server → returns { uploadUrl, s3Key }
5. Client → HTTP PUT directly to S3 (binary data never touches API server)
6. Client → includes s3Key in submitResults mutation
7. Server → stores resultPdfUrl in LabOrder record
```

### 12.3 Download Flow (Doctor/Patient Viewing Results)

```
1. Client → tRPC query: getDownloadUrl({ s3Key, bucketType: 'lab-results' })
2. Server → CASL permission check (is this user allowed to view this resource?)
3. Server → generates CloudFront signed URL (1-hour expiry)
4. Client → fetches via CloudFront (edge-cached, 5-30ms latency in India)
```

### 12.4 KMS Key Management

- One KMS key for all healthcare data (`alias/onlyou-healthcare-data`)
- S3 Bucket Key enabled on all buckets (reduces KMS API calls by ~99%)
- Key rotation: automatic, AWS-managed, every year
- CloudTrail logging: enabled for all KMS operations (required for DPDPA compliance audits)

*(Source: BACKEND-PART2B.md §20.1, §20.2, §20.6, §20.7, §20.8, ARCHITECTURE.md §9)*

---

## 13. Real-Time System (SSE + Redis Pub/Sub)

### 13.1 SSE Connection

Lab portal maintains a persistent SSE connection to receive real-time updates without page refresh.

**SSE endpoint:** `GET /api/sse/lab?diagnosticCentreId={id}`

**Authentication:** JWT token passed as query parameter (SSE doesn't support custom headers in the EventSource API). Token validated server-side on connection establishment.

### 13.2 Events the Lab Portal Consumes

```typescript
type LabSSEEvent =
  | { type: 'lab.sample_delivered'; data: { labOrderId: string; sampleId: string; urgency: string } }
  | { type: 'lab.order_cancelled'; data: { labOrderId: string; sampleId: string; reason: string } }
  | { type: 'lab.recollection_created'; data: { labOrderId: string; sampleId: string; replacesOrderId: string } };
```

### 13.3 Events the Lab Portal Triggers (via API calls → Redis Pub/Sub → SSE)

```typescript
type LabPublishedEvent =
  | { type: 'laborder.status_changed'; data: { labOrderId: string; newStatus: LabOrderStatus; triggeredBy: 'lab' } }
  | { type: 'laborder.results_ready'; data: { labOrderId: string; hasCritical: boolean } }
  | { type: 'laborder.issue_reported'; data: { labOrderId: string; reason: SampleIssueReason } };
```

### 13.4 Reconnection Strategy

| Scenario | Behavior |
|----------|----------|
| SSE connection drops | Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s) |
| Reconnection succeeds | Fetch latest data from API to catch missed events |
| Offline for > 5 minutes | Banner: "Connection lost. Data may be outdated. [Refresh]" |

### 13.5 Architecture Note

SSE was chosen over WebSockets specifically for ECS Fargate deployment. No sticky sessions required — SSE connections are standard HTTP, handled by ALB without cookie-based stickiness. Redis Pub/Sub distributes events across multiple Fargate tasks trivially.

*(Source: PORTAL-LAB-FIXED.md §14, BACKEND-PART2B.md §16, Onlyou_Telehealth_Platform__A_Definitive_Architecture_Blueprint.md §8)*

---

## 14. Notification System — Inbound & Outbound

### 14.1 Inbound Notifications (Lab Receives)

| Event | Source | Channel | Message |
|-------|--------|---------|---------|
| New sample delivered | Nurse portal | SSE + Push | "New sample delivered: ONY-2026-0045 — 3 tubes — Priya N." |
| Urgent sample delivered | Nurse portal | SSE + Push | "🔴 URGENT sample delivered: ONY-2026-0046 — process immediately" |
| SLA reminder | BullMQ job | Push | "Sample ONY-2026-0044 received 20 hours ago — results expected within 48 hours" |
| Recollection assigned | System | SSE + Push | "Recollection sample incoming: ONY-2026-0050 (replaces ONY-2026-0044)" |

### 14.2 Outbound Events (Lab Triggers)

| Lab Action | Status Change | Recipients |
|------------|---------------|------------|
| Mark Received | → `SAMPLE_RECEIVED` | Patient (push + WhatsApp), Coordinator (SSE), Doctor (SSE) |
| Start Processing | → `PROCESSING` | Coordinator (SSE) |
| Submit Results (normal) | → `RESULTS_READY` | Doctor (SSE + push + WhatsApp), Patient (push + WhatsApp + email with PDF), Coordinator (SSE) |
| Submit Results (critical) | → `RESULTS_READY` + critical flag | Doctor (SSE + push + WhatsApp — URGENT), Patient (push + WhatsApp — careful language), Coordinator (SSE + push — URGENT) |
| Report Issue | → `SAMPLE_ISSUE` | Coordinator (push — URGENT), Patient (push — reschedule notice) |

### 14.3 Push Notification Configuration

- Lab portal uses standard Web Push API via service worker
- Push subscription created on first login
- Notification permission requested after first successful login (not on the login page)

*(Source: PORTAL-LAB-FIXED.md §13, BACKEND-PART2B.md §15)*

---

## 15. SLA Thresholds & BullMQ Escalation Engine

### 15.1 Lab-Specific SLA Rules

| SLA Rule | Threshold | Escalation Action |
|----------|-----------|-------------------|
| Sample not received by lab | 2 hours after `AT_LAB` | Coordinator alert: "Sample ONY-XXXX delivered 2+ hours ago, not yet received by lab" |
| Results not uploaded (routine) | 48 hours after `SAMPLE_RECEIVED` | Coordinator alert: "Lab results overdue 48hrs — Contact lab" |
| Results not uploaded (urgent) | 12 hours after `SAMPLE_RECEIVED` | Coordinator alert: "URGENT lab results overdue 12hrs" |
| Doctor hasn't reviewed results | 24 hours after `RESULTS_READY` | Coordinator alert: "Doctor hasn't reviewed results — Remind doctor" |

### 15.2 Full Lab Order SLA Chain (All Stages)

| Stage | Max Time | Monitored By |
|-------|----------|-------------|
| Patient books slot after order | 7 days | BullMQ job → Admin alert |
| Nurse assigned after booking | 2 hours | BullMQ job → Admin alert |
| Nurse collects sample | Per scheduled slot | Nurse Running Late flow |
| Sample delivered to lab | 4 hours after collection | Nurse Deliver to Lab flow |
| **Lab receives sample** | **2 hours after delivery** | **BullMQ job → Admin alert** |
| **Lab uploads results (routine)** | **48 hours after receipt** | **BullMQ job → Admin alert** |
| **Lab uploads results (urgent)** | **12 hours after receipt** | **BullMQ job → Admin alert** |
| Doctor reviews results | 24 hours after upload | BullMQ job → Admin alert |

*(Bold rows are lab-specific SLAs)*

### 15.3 BullMQ SLA Check Job

The SLA enforcement runs as a single BullMQ repeatable job that checks all order types every 15 minutes:

```typescript
// BACKEND-PART2B.md §19.4
// SLA check — every 15 minutes
await this.slaQueue.add('sla-check', {}, {
  repeat: { every: 15 * 60 * 1000 },
  jobId: 'sla-check-15min',
});
```

**SLA check processor logic (lab-relevant portion):**
```
Every 15 minutes:
  │
  ▼
Query all LabOrders where:
  - status = AT_LAB AND deliveredToLabAt > 2 hours ago
  - status = SAMPLE_RECEIVED AND sampleReceivedAt > 48 hours ago (routine)
  - status = SAMPLE_RECEIVED AND sampleReceivedAt > 12 hours ago (urgent)
  - status = RESULTS_READY AND resultsReadyAt > 24 hours ago (doctor review)
  │
  ▼
For each breached:
  1. Create SystemEvent with severity WARNING or CRITICAL
  2. Send notification to coordinator (all channels)
  3. If already notified once → escalate (higher urgency)
  4. Never double-notify for same breach
```

### 15.4 SLA Configuration (Admin-Editable)

```typescript
// BACKEND-PART2B.md §18.3 (lab-relevant subset)
export const SLA_DEFAULTS = {
  // Lab pipeline
  NURSE_ASSIGNMENT_HOURS: 2,             // Nurse assigned within 2 hours of booking
  SAMPLE_DELIVERY_HOURS: 4,              // Nurse delivers to lab within 4 hours of collection
  LAB_RECEIPT_HOURS: 2,                  // Lab must receive within 2 hours of delivery
  LAB_RESULTS_HOURS: 48,                 // Lab must upload results within 48 hours (routine)
  LAB_RESULTS_URGENT_HOURS: 12,          // Lab must upload results within 12 hours (urgent)
  DOCTOR_LAB_REVIEW_HOURS: 24,           // Doctor must review results within 24 hours
  PATIENT_SLOT_BOOKING_HOURS: 168,       // Patient should book slot within 7 days (168 hours)

  // Warning threshold
  WARNING_THRESHOLD_HOURS: 2,            // Amber warning 2 hours before breach
};
```

### 15.5 SLA Visual Indicators

| State | Indicator | Meaning |
|-------|-----------|---------|
| 🟢 Green | On track | Within SLA, > 2 hours remaining |
| 🟡 Amber | Warning | Within 2 hours of SLA breach |
| 🔴 Red | Breached | SLA threshold exceeded |

> **⚠️ Fix Applied (FIXES-CHANGELOG.md CRITICAL-1):** SLA thresholds in BACKEND-PART2B.md §18.3 were corrected — `DOCTOR_FIRST_REVIEW_HOURS` changed from 4 → 24, `DOCTOR_INFO_RESPONSE_REVIEW_HOURS` changed from 24 → 72, and `DOCTOR_CASE_ACTION_HOURS: 48` was added (was missing entirely).

*(Source: PORTAL-LAB-FIXED.md §23, BACKEND-PART2B.md §18, §19, PORTAL-ADMIN.md §33, FIXES-CHANGELOG.md CRITICAL-1)*

---

## 16. Privacy Model & RBAC — Data the Lab Cannot See

### 16.1 Core Privacy Principle

Lab partners are external entities. They process samples under a "purpose limitation" consent (lab processing only) per DPDPA 2023 principles. The lab portal enforces anonymization at the API level — hidden fields are never included in API responses, even in the network inspector.

### 16.2 Data Access Matrix

| Data | Lab Can See ✅ | Lab Cannot See ❌ |
|------|---------------|-------------------|
| Sample ID (`ONY-2026-XXXX`) | ✅ | — |
| Anonymous patient ID (`ONY-P-XXXX`) | ✅ | — |
| Tests ordered (names only) | ✅ | — |
| Tube count (expected + received) | ✅ | — |
| Nurse name (who delivered) | ✅ | — |
| Lab-specific notes ("Fasting") | ✅ | — |
| Urgency level | ✅ | — |
| Patient name | — | ❌ |
| Patient phone number | — | ❌ |
| Patient home address | — | ❌ |
| Patient diagnosis / condition | — | ❌ |
| Doctor name / clinical notes | — | ❌ |
| AI assessment data | — | ❌ |
| Questionnaire responses | — | ❌ |
| Prescription data | — | ❌ |
| Payment information | — | ❌ |

### 16.3 CASL.js Rules for Lab Role

```typescript
// BACKEND-PART3A.md §22.4 — Canonical CASL rules
const labAbilities = defineAbility((can, cannot) => {
  // Lab staff can READ lab orders assigned to their diagnostic centre
  can('read', 'LabOrder', { diagnosticCentreId: user.diagnosticCentreId });

  // Lab staff can UPDATE lab order status fields
  can('update', 'LabOrder',
    ['status', 'tubeCountReceived', 'resultPdfUrl', 'resultFlags', 'processingStartedAt', 'resultsUploadedAt'],
    { diagnosticCentreId: user.diagnosticCentreId });

  // Lab staff can read their own diagnostic centre info
  can('read', 'DiagnosticCentre', { id: user.diagnosticCentreId });

  // Lab staff CANNOT see any patient personal data
  cannot('read', 'Patient');
  cannot('read', 'User', ['name', 'email', 'phone', 'address']);
  cannot('read', 'Consultation');
  cannot('read', 'Prescription');
  cannot('read', 'Questionnaire');
  cannot('read', 'AIAssessment');
  cannot('read', 'Message');
  cannot('read', 'NurseVisit', ['patientId', 'visitAddress']);

  // Lab staff CANNOT access other diagnostic centres' data
  cannot('read', 'LabOrder', { diagnosticCentreId: { $ne: user.diagnosticCentreId } });
});
```

*(Source: PORTAL-LAB-FIXED.md §4, §16, BACKEND-PART3A.md §22.4)*

---

## 17. Cross-Portal Synchronization Matrix

### 17.1 Upstream Triggers (What Creates Work for Lab)

| Trigger | Source Portal | Lab Portal Effect |
|---------|-------------|-------------------|
| Doctor orders blood work | Doctor portal | `LabOrder` created (status: `ORDERED`) — NOT yet visible to lab |
| Coordinator assigns diagnostic centre | Admin dashboard | `diagnosticCentreId` set on `LabOrder` — still NOT visible (nurse hasn't collected yet) |
| Nurse delivers sample to this centre | Nurse portal | Status → `AT_LAB` — **NOW visible in Lab portal Incoming tab** |

### 17.2 Downstream Effects (Lab Actions Affect Others)

| Lab Action | Doctor Portal | Patient App | Admin Dashboard |
|------------|--------------|-------------|-----------------|
| Mark Received | No change | "Lab received your sample" push | Status badge update |
| Start Processing | No change | No notification | Status badge update |
| Submit Results (normal) | 🟣 "Lab results ready" badge | Push + WhatsApp + email with PDF | Activity feed entry |
| Submit Results (critical) | 🔴 CRITICAL badge (pulsing) | Push + WhatsApp (careful wording) | 🔴 URGENT activity feed entry |
| Report Issue | No direct notification | "We need a new sample" push | ⚠️ URGENT alert + auto-recollection order |

### 17.3 Integration Diagram

```
                    ┌──────────────────┐
                    │   Doctor Portal   │
                    │ doctor.onlyou.life│
                    └──────┬───────────┘
                           │ Orders blood work
                           ▼
                    ┌──────────────────┐
                    │  Admin Dashboard  │
                    │ admin.onlyou.life │
                    └──────┬───────────┘
                           │ Assigns nurse + lab
                           ▼
                    ┌──────────────────┐
                    │   Nurse Portal    │
                    │ nurse.onlyou.life │
                    └──────┬───────────┘
                           │ Collects sample → delivers to lab
                           ▼
              ┌─────────────────────────────┐
              │        LAB PORTAL            │
              │      lab.onlyou.life         │
              │                              │
              │  Receive → Process → Upload  │
              └──────────────┬──────────────┘
                             │ Results uploaded
                             ▼
                    ┌──────────────────┐
                    │   Doctor Portal   │
                    │  Reviews results  │
                    └──────┬───────────┘
                           │ Reviews & acts
                           ▼
                    ┌──────────────────┐
                    │    Patient App    │
                    │  Sees results +   │
                    │  doctor feedback   │
                    └──────────────────┘
```

*(Source: PORTAL-LAB-FIXED.md §21, PORTAL-NURSE-FIXED.md §14, PORTAL-DOCTOR.md §13, PORTAL-ADMIN.md §9)*

---

## 18. Test Panels by Medical Vertical

### 18.1 Initial Panels (Ordered by Doctor)

| Vertical | Panel Name | Tests | Price |
|----------|-----------|-------|-------|
| Hair Loss | Extended Hair Panel | TSH, Free T4, Ferritin, Vitamin D, DHT, Hemoglobin, Iron studies | ₹1,200 |
| ED | Basic Health Check | Testosterone (total + free), Fasting glucose, HbA1c, Lipid panel | ₹800 |
| PE — Thyroid | Thyroid Check | TSH, Free T3, Free T4 | ₹350 |
| PE — Hormonal | Hormonal | Testosterone, Prolactin | ₹800 |
| PE — Prostate | Prostate | PSA, Urine culture | ₹500 |
| PE — Combined | Combined | TSH, Free T3, Free T4, Testosterone, Prolactin, PSA, Urine culture | ₹1,500 |
| Weight | Metabolic Panel | HbA1c, Fasting glucose, Lipid panel, Liver function, Kidney function, Thyroid | ₹1,800 |
| PCOS | PCOS Screen Panel | FSH, LH, Estradiol, Testosterone, DHEA-S, Prolactin, Fasting glucose, Lipid panel, Insulin | ₹1,500 |

### 18.2 Follow-Up Panels

Follow-up panels are subsets of the initial panel — the doctor selects specific tests from a checklist. Price varies by test selection (₹600–₹1,200 typical range).

### 18.3 Pricing Model

- **First panel:** INCLUDED in patient's subscription (for verticals where blood work is clinically indicated)
- **Follow-up panels:** ₹800–₹4,500 depending on panel (charged separately via Razorpay)
- **Patient self-upload:** Free
- **Lab portal does NOT display pricing** — pricing is between the platform and the patient
- **Recollection:** Free to the patient — platform absorbs cost

> **⚠️ Known Issue (backend-errors-report.md Issue #20):** BACKEND-PART2A.md §12.5 defines only a single generic "Basic Health Check" panel for ED/PE, missing the 4 distinct PE-specific panels from onlyou-spec-resolved-v4.md §6.9. Fix needed: expand the backend lab pricing table to include PE-specific panels (Thyroid Check ₹350, Hormonal ₹800, Prostate ₹500, Combined ₹1,500).

*(Source: PORTAL-LAB-FIXED.md §24, PORTAL-DOCTOR.md §13.2, WORKFLOW-DOCTOR-PART2.md §19.3, VERTICAL-PE.md, backend-errors-report.md Issue #20)*

---

## 19. Error States & Edge Cases

### 19.1 Network Errors

| Scenario | Behavior |
|----------|----------|
| API call fails (network) | Toast: "Network error. Please try again." + Retry button |
| API call fails (500) | Toast: "Something went wrong. Please try again." + auto-retry once |
| API call fails (403) | Redirect to login (token expired or invalid) |
| API call fails (409 — conflict) | Toast: "This sample was already updated. Refreshing..." + refetch data |
| PDF upload fails | Toast: "Upload failed. Please try again." + file preserved for retry |
| PDF upload times out | Toast: "Upload timed out. Check your internet and try again." |

### 19.2 Business Logic Edge Cases

| Scenario | Behavior |
|----------|----------|
| Lab receives a sample but it was already cancelled | API rejects `markReceived` with 409 — "This order has been cancelled" |
| Lab marks 0 tubes received | Validation error: "Tube count must be at least 1. Use 'Report Issue' if no usable tubes." |
| Two lab staff try to receive the same sample simultaneously | First succeeds, second gets 409 — "This sample was already received" |
| Lab tries to upload results for a sample with status `AT_LAB` | API rejects — must receive + start processing first |
| Lab tries to go backwards (PROCESSING → SAMPLE_RECEIVED) | API rejects — no backward transitions allowed |
| Sample has `SAMPLE_ISSUE` and lab tries further actions | API rejects — issue is terminal for this order |
| Order cancelled by coordinator while lab is processing | SSE event removes card from lab portal; any pending mutation returns 409 |
| Lab staff from Centre A tries to access Centre B's order | API returns 404 (scoped queries mean the order doesn't exist for this user) |
| Lab uploads results but PDF upload to S3 fails | Submit blocked — PDF is required. File preserved, upload retry shown. |

### 19.3 File Upload Edge Cases

| Scenario | Behavior |
|----------|----------|
| File > 10 MB | Client-side rejection: "File too large. Maximum size: 10MB." |
| Wrong file type (e.g., .doc) | Client-side rejection: "Please upload a PDF, JPG, or PNG file." |
| Presigned URL expired (15 min) | Request new presigned URL automatically, retry upload |
| S3 upload succeeds but network drops before confirmation | Orphaned file in S3 — lab staff retries, new upload replaces old |
| Camera permission denied | System prompt; if denied: "Camera access is required. Please enable in Settings." |

*(Source: PORTAL-LAB-FIXED.md §18)*

---

## 20. Audit Logging & DPDPA Compliance

### 20.1 Audit Events Logged for Lab Actions

Every lab action is logged to the PostgreSQL `AuditLog` table (INSERT-only — no UPDATE or DELETE permissions at the database level).

| Action | Fields Logged |
|--------|--------------|
| `lab.login` | `{ userId, diagnosticCentreId, timestamp, ip, userAgent }` |
| `lab.sample_received` | `{ labOrderId, sampleId, tubeCountReceived, hasDiscrepancy, labStaffId, timestamp }` |
| `lab.processing_started` | `{ labOrderId, sampleId, waitTimeMinutes, labStaffId, timestamp }` |
| `lab.results_uploaded` | `{ labOrderId, sampleId, testCount, normalCount, abnormalCount, criticalCount, processingTimeMinutes, labStaffId, timestamp }` |
| `lab.issue_reported` | `{ labOrderId, sampleId, reason, notes, labStaffId, timestamp }` |
| `lab.pdf_upload` | `{ labOrderId, fileType, fileSize, uploadTimeMs, labStaffId, timestamp }` |

### 20.2 DPDPA Compliance

- Lab processing is covered under the patient's `LAB_PROCESSING` consent record
- Lab portal processes data under "purpose limitation" — samples are anonymized (no patient PII exposed)
- Audit trail provides full accountability chain from sample receipt through result delivery
- Retention: minimum 1 year (DPDP Rules), recommended 3 years (Telemedicine Practice Guidelines 2020)

*(Source: BACKEND-PART3A.md §21, §22, PORTAL-LAB-FIXED.md §17)*

---

## 21. Known Issues & Fixes from Verification Reports

### 21.1 Resolved Issues (from FIXES-CHANGELOG.md)

| ID | Severity | Description | Resolution |
|----|----------|-------------|------------|
| CRITICAL-1 | 🔴 | SLA thresholds in BACKEND-PART2B.md §18.3 were wrong | `DOCTOR_FIRST_REVIEW_HOURS`: 4 → 24; added `DOCTOR_CASE_ACTION_HOURS: 48`; `INFO_RESPONSE_REVIEW_HOURS`: 24 → 72 |
| CRITICAL-2 | 🔴 | Status enum names in BACKEND-PART1.md §9 used wrong names | Full rewrite: `PENDING_REVIEW` → `AI_COMPLETE`, `IN_REVIEW` → `REVIEWING`, `PRESCRIBED` → `PRESCRIPTION_CREATED`, `BLOOD_WORK_ORDERED` → `LAB_ORDERED`, etc. |
| CRITICAL-3 | 🔴 | CASL rules in BACKEND-PART1.md §4.6 diverged from BACKEND-PART3A.md §22.4 | BACKEND-PART3A.md §22.4 declared single source of truth for all CASL rules |
| MEDIUM-3 | 🟡 | Role enum case inconsistency | Standardized to UPPERCASE: `'lab'` → `'LAB_TECH'`, `'pharmacy'` → `'PHARMACY_STAFF'` |

### 21.2 Outstanding Issues (from backend-errors-report.md)

| ID | Severity | Description | Impact on Lab |
|----|----------|-------------|---------------|
| #3 | 🔴 CRITICAL | `AT_LAB` vs `DELIVERED_TO_LAB` status naming unresolved | Prisma enum uses `AT_LAB` (source of truth). All portal display logic must map accordingly. |
| #4 | 🔴 CRITICAL | BACKEND-PART3B §30.4 appendix has multiple errors vs Prisma enum | Lab-relevant: uses `DELIVERED_TO_LAB` instead of `AT_LAB`; self-upload path shows `RESULTS_READY` instead of `RESULTS_UPLOADED` |
| #7 | 🟡 HIGH | BullMQ queue names inconsistent: `notification-dispatch` vs `notifications` | Affects lab notification delivery if queue name mismatch at runtime |
| #16 | 🟡 MEDIUM | Bull Board uses `ExpressAdapter` but app uses Fastify | Admin monitoring of lab-related queues may not load. Fix: use `@bull-board/fastify` |
| #20 | 🟡 HIGH | PE-specific lab panels missing from BACKEND-PART2A.md §12.5 | PE patients can only be ordered the generic "Basic Health Check" — missing Thyroid, Prostate, Combined panels |
| NEW | 🟡 HIGH | `reportSampleIssue()` missing `AT_LAB` in status check | BACKEND-PART2A §12.3 checks `['SAMPLE_RECEIVED', 'PROCESSING']` but PORTAL-LAB-FIXED.md §22 allows issue reporting from `DELIVERED_TO_LAB` (= `AT_LAB`). Lab staff cannot report visibly damaged samples before formally receiving them. |
| NEW | 🟡 MEDIUM | `uploadResults()` missing auto-transition from `SAMPLE_RECEIVED` → `PROCESSING` | PORTAL-LAB-FIXED.md §18 edge case specifies auto-transition, but BACKEND-PART2A §12.3 code jumps directly to `RESULTS_READY`. Skips the `PROCESSING` status and `processingStartedAt` timestamp. |

### 21.3 Payment Flow Changes (from BACKEND-ALL-CHANGES.md)

The "Pay After Doctor, Not Before" redesign affects the lab workflow indirectly:
- Lab orders can now be created during the free doctor review phase (status `LAB_ORDERED` — previously `BLOOD_WORK_ORDERED`)
- The first lab panel is still included in the subscription, but payment now happens after the doctor prescribes (not before the consultation)
- The consultation status `LAB_ORDERED` is added between `REVIEWING` and `PRESCRIBED`
- No changes to the lab portal itself — the lab still receives samples the same way

*(Source: FIXES-CHANGELOG.md, backend-errors-report.md, BACKEND-ALL-CHANGES.md)*

---

## 22. Cross-Reference Index

| Topic | Primary Document | Section |
|-------|-----------------|---------|
| Lab portal UI specification | PORTAL-LAB-FIXED.md | Full document |
| Lab order Prisma schema | BACKEND-PART2A.md | §12.2 |
| Lab order service (all methods) | BACKEND-PART2A.md | §12.3 |
| Lab order tRPC router procedures | BACKEND-PART2A.md | §12.3 (router code) |
| Full tRPC router tree | BACKEND-PART3B.md | §30.1 |
| S3 bucket architecture + storage service | BACKEND-PART2B.md | §20.1–§20.8 |
| BullMQ queue definitions + SLA processor | BACKEND-PART2B.md | §19.1–§19.6 |
| SLA configuration defaults | BACKEND-PART2B.md | §18.3 |
| SLA service (`checkAllSLAs`) | BACKEND-PART2B.md | §18.4 |
| SLA engine (admin perspective) | PORTAL-ADMIN.md | §33 |
| CASL.js rules (canonical) | BACKEND-PART3A.md | §22.4 |
| Audit log schema + service | BACKEND-PART3A.md | §21.9 |
| SSE architecture + Redis Pub/Sub | BACKEND-PART2B.md | §16 |
| SSE architecture rationale | Architecture Blueprint | §8 |
| Notification channels + templates | BACKEND-PART2B.md | §15 |
| Auth (OTP + JWT + refresh) | BACKEND-PART1.md | §4 |
| Nurse deliver-to-lab flow | PORTAL-NURSE-FIXED.md | §14 |
| Nurse workflow (complete) | WORKFLOW-NURSE-PART1/2/3.md | Full documents |
| Doctor ordering blood work | PORTAL-DOCTOR.md | §13 |
| Doctor ordering blood work (workflow) | WORKFLOW-DOCTOR-PART2.md | §19 |
| Doctor reviewing lab results | PORTAL-DOCTOR.md | §9 (Lab Results tab) |
| Admin lab assignment flow | PORTAL-ADMIN.md | §9 |
| Admin recollection flow | PORTAL-ADMIN.md | §10 |
| Admin partner management | PORTAL-ADMIN.md | §17–§18 |
| Patient lab booking flow | APP-PATIENT.md | §13 |
| Patient lab booking (workflow) | WORKFLOW-PATIENT.md | §17–§18 |
| Patient self-upload | APP-PATIENT.md | §13.4 |
| Patient self-upload (workflow) | WORKFLOW-PATIENT.md | §19 |
| Patient lab tracking stepper | APP-PATIENT.md | §6.1 |
| Hair Loss blood panel | VERTICAL-HAIR-LOSS.md | Blood Work section |
| Weight blood panel | VERTICAL-WEIGHT.md | Blood Work section |
| PCOS blood panel | VERTICAL-PCOS-PART2.md | §9 |
| PE blood panels (4 types) | VERTICAL-PE.md | Lab work section |
| ED blood panel | VERTICAL-ED.md | Lab work section |
| Build phase & checkpoint | onlyou-spec-resolved-v4.md | Phase 4 (Week 11–14) |
| Health check endpoint | BACKEND-PART3B.md | §26.6 |
| Bull Board monitoring | BACKEND-PART3B.md | §26.7 |
| Sentry error tracking | BACKEND-PART3B.md | §26.8 |
| Backend errors report | backend-errors-report.md | Issues #3, #4, #7, #16, #20 |
| Fixes changelog | FIXES-CHANGELOG.md | CRITICAL-1/2/3, MEDIUM-3 |
| Payment flow changes | BACKEND-ALL-CHANGES.md | Changes B1-1 through B1-4 |
| Seed data (test lab) | PORTAL-LAB-FIXED.md | §25 |
| Testing checklist | PORTAL-LAB-FIXED.md | §26 |
| Deployment config | PORTAL-LAB-FIXED.md | §25 |

---

*End of WORKFLOW-LAB.md — Lab Technician Workflow: Complete Operational Guide*

*This document covers every lab workflow from sample arrival to result upload, including all edge cases, cross-portal synchronization, backend service code, SLA enforcement, file storage pipeline, privacy/RBAC, notification cascades, and known issues from verification reports. For the portal UI specification, see PORTAL-LAB-FIXED.md. For the backend implementation, see BACKEND-PART2A.md §12. For admin management of labs, see PORTAL-ADMIN.md §9, §10, §17–18.*

*v1.1 — Verified 2026-03-03: Cross-reference audit completed. 8 corrections applied: (1) Fixed "three verticals" claim to acknowledge all 5 verticals have lab panels; (2) Flagged AT_LAB missing from reportSampleIssue backend status check; (3) Fixed §8.1 Report Issue tab/status mapping (was SAMPLE_RECEIVED on Incoming, corrected to AT_LAB); (4) Added auto-transition logic in uploadResults for SAMPLE_RECEIVED → PROCESSING; (5) Fixed PATIENT_SLOT_BOOKING_HOURS from 24 → 168 (7 days); (6) Added missing LAB_RESULTS_URGENT_HOURS and LAB_RECEIPT_HOURS to SLA defaults; (7) Added missing edge cases: zero tube count validation, PDF upload failure blocking submit; (8) Added 2 newly discovered inconsistencies to Known Issues §21.2.*
