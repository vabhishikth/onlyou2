# WORKFLOW-NURSE-PART2.md — Nurse Complete Workflow Reference (Part 2 of 3)

## Visit Execution Workflows: Starting Visits, Vitals, Collection, Failures & Lab Delivery

> **Document type:** Detailed workflow documentation (every screen, action, decision, error, and edge case)
> **Perspective:** Nurse / Phlebotomist / Home Visit Specialist
> **Version:** 1.0
> **Last updated:** March 2026
> **Cross-references:** See WORKFLOW-NURSE-PART1.md header for full list

---

## 11. Starting a Visit (SCHEDULED → EN_ROUTE)

### 11.1 Trigger

Nurse taps the **[Start Visit ▶️]** button on the first upcoming SCHEDULED assignment card.

**Pre-conditions for "Start Visit" to be enabled:**
- Visit status is SCHEDULED
- It is the first SCHEDULED visit (chronologically) — nurse cannot skip ahead
- No other visit is currently active (EN_ROUTE / ARRIVED / IN_PROGRESS)
- The visit is scheduled for today (cannot start visits for future dates)
- Nurse is online (or action will be queued if offline — see Part 3, §24)

### 11.2 What Happens When Nurse Taps "Start Visit"

**Frontend:**
1. Optimistic UI: card immediately changes to EN_ROUTE state (blue pulsing)
2. Navigate to `/visit/[id]`

**API call:**
```typescript
trpc.nurse.visits.updateStatus.mutate({
  visitId: 'uuid',
  status: 'EN_ROUTE'
})
```

**Backend processing (Source: BACKEND-PART2A.md §13.2 — `startVisit`):**
1. Validate: visit exists, belongs to this nurse, status is SCHEDULED
2. Update NurseVisit: `status → 'EN_ROUTE'`, `enRouteAt → now()`
3. Update LabOrder: `status → 'NURSE_EN_ROUTE'`
4. SSE broadcast to `admin` channel: `nurseVisit.status_changed { visitId, nurseId, status: 'EN_ROUTE' }`
5. Notify patient (push + WhatsApp): "Your nurse is on the way! Expected arrival: [timeSlot]."
6. Audit log entry

### 11.3 The Visit Flow Screen

After navigation to `/visit/[id]`, the nurse sees a guided stepper:

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│  Visit: Rahul M.                    │
│  8:00–10:00 AM, Banjara Hills       │
│                                     │
│  [1.Verify] → [2.Vitals] → [3.Collect] → [4.Complete]
│   ● active    ○ pending    ○ pending    ○ pending
├─────────────────────────────────────┤
│                                     │
│  (Step content renders here)        │
│                                     │
└─────────────────────────────────────┘
```

**Stepper component:** `VisitStepper.tsx` — shows the 4-step flow with visual indicators of current position. Steps are sequential; nurse cannot skip ahead or go back to a completed step.

**"← Back" behavior:**
- If on Step 1 → returns to assignment list (visit stays EN_ROUTE)
- If on Steps 2–4 → goes back one step (data is preserved in local state)
- Confirmation dialog if nurse has unsaved data: "You have unsaved changes. Leave anyway? [Stay] [Leave]"

---

## 12. Arriving at Patient Location (EN_ROUTE → ARRIVED)

### 12.1 Status Transition

The transition from EN_ROUTE to ARRIVED happens automatically when the nurse opens the visit flow page `/visit/[id]`, OR the nurse can manually tap an "I've Arrived" button.

**Backend processing:**
```typescript
trpc.nurse.visits.updateStatus.mutate({
  visitId: 'uuid',
  status: 'ARRIVED'
})
```
- NurseVisit: `status → 'ARRIVED'`, `arrivedAt → now()`
- LabOrder: `status → 'NURSE_ARRIVED'`
- SSE to admin: status update event

### 12.2 GPS Check-In (Phase 2 — Scaffolded)

In Phase 2, when GPS check-in is enabled:
- On arrival, the app captures the nurse's GPS coordinates via `navigator.geolocation.getCurrentPosition()`
- Coordinates compared against patient's address (geocoded)
- If distance > 500m → flag sent to admin for review
- Privacy notice shown: "📍 Location captured for visit verification"
- For MVP, the `useGeolocation.ts` hook exists but returns no-op

---

## 13. Step 1: Patient Identity Verification (ARRIVED → IN_PROGRESS)

### 13.1 Verification Screen

```
┌─────────────────────────────────────┐
│                                     │
│  Step 1: Verify Patient             │
│                                     │
│  ─── PATIENT DETAILS ───           │
│  Name: Rahul Mehta                  │
│  Address: 123 MG Road, Banjara Hills│
│  Phone: +91 98765 43210 [📞]        │
│                                     │
│  ─── TESTS ORDERED ───             │
│  • TSH (Thyroid Stimulating Hormone)│
│  • CBC (Complete Blood Count)       │
│  • Ferritin                         │
│                                     │
│  ─── SPECIAL INSTRUCTIONS ───      │
│  ⚠️ Fasting required                │
│  Gate code: 4567                    │
│                                     │
│  ─── CONFIRM ───                   │
│  ☐ Patient identity confirmed       │
│    (name matches)                   │
│  ☐ Fasting confirmed               │
│    (if applicable)                  │
│                                     │
│  [Patient Not Available ✕]          │
│                                     │
│  [Next: Record Vitals →]            │
│                                     │
└─────────────────────────────────────┘
```

### 13.2 What the Nurse Sees (Privacy-Filtered)

| Visible | Not Visible |
|---------|-------------|
| Patient full name | Patient condition/diagnosis |
| Patient address (for this visit) | Questionnaire responses |
| Patient phone number (tap to call) | AI assessment |
| Test names to collect | Prescription details |
| Special instructions | Doctor notes |
| Scheduled time slot | Payment/subscription info |
| Assigned diagnostic centre | Other patients' data |

This filtering is enforced at the **API level**, not just the UI. The tRPC `getById` query uses `select` to exclude clinical fields (Source: PORTAL-NURSE-FIXED.md §21, BACKEND-PART2A.md §13.2).

### 13.3 Verification Checklist

| Check | When Shown | Required to Proceed |
|-------|-----------|-------------------|
| "Patient identity confirmed (name matches)" | Always | ✅ Yes |
| "Fasting confirmed" | Only when `specialInstructions` contains "fasting" | ✅ Yes (when shown) |

**Validation:** Both visible checkboxes must be checked for the "Next: Record Vitals →" button to become enabled.

### 13.4 What If Patient Hasn't Fasted?

If fasting was required (shown in special instructions) but the patient ate:
- Nurse should tap **[Patient Not Available ✕]** with reason "Patient not fasting"
- This routes to the Failed Visit flow (§17)
- Blood draw with unfasted blood would produce inaccurate results for certain tests (lipids, glucose)
- The coordinator will reschedule the visit

### 13.5 Status Transition

When nurse completes verification and taps "Next: Record Vitals →":
- NurseVisit: `status → 'IN_PROGRESS'`, `inProgressAt → now()`
- No LabOrder status change at this point (stays NURSE_ARRIVED)
- Stepper advances to Step 2

---

## 14. Step 2: Recording Vitals

### 14.1 Vitals Form

```
┌─────────────────────────────────────┐
│                                     │
│  Step 2: Record Vitals              │
│                                     │
│  ─── BLOOD PRESSURE ───            │
│  Systolic:  [___] mmHg              │
│  Diastolic: [___] mmHg              │
│                                     │
│  ─── PULSE ───                     │
│  Heart Rate: [___] BPM              │
│                                     │
│  ─── SpO2 ───                      │
│  Oxygen Saturation: [___] %         │
│  (if pulse oximeter available)      │
│                                     │
│  ─── WEIGHT ───                    │
│  Weight: [___] kg                   │
│  (if scale available)               │
│                                     │
│  ─── TEMPERATURE ───               │
│  Temperature: [___] °C              │
│  (if thermometer available)         │
│                                     │
│  ─── NOTES ───                     │
│  [_________________________________]│
│  (any observations, max 500 chars)  │
│                                     │
│  [← Back]    [Next: Collect Sample →]│
│                                     │
└─────────────────────────────────────┘
```

### 14.2 Field Specifications

| Field | Input Type | Required | Valid Range | Validation Message |
|-------|-----------|----------|-------------|-------------------|
| Systolic BP | Numeric | ✅ | 60–250 mmHg | "Systolic BP must be between 60–250" |
| Diastolic BP | Numeric | ✅ | 30–150 mmHg | "Diastolic BP must be between 30–150" |
| Pulse Rate | Numeric | ✅ | 30–200 BPM | "Pulse must be between 30–200 BPM" |
| SpO2 | Numeric | ❌ | 50–100% | "SpO2 must be between 50–100%" |
| Weight | Numeric (decimal) | ❌ | 20–300 kg | "Weight must be between 20–300 kg" |
| Temperature | Numeric (decimal) | ❌ | 34.0–42.0 °C | "Temperature must be between 34–42°C" |
| Notes | Textarea | ❌ | Max 500 chars | Character counter shown |

**Input behavior:**
- All numeric fields open the numeric keypad on mobile (not full keyboard)
- Decimal fields (weight, temperature) allow one decimal point
- Invalid values highlighted with red border + inline error message
- Required fields show asterisk (*) in label

### 14.3 Abnormal Value Warnings (Amber — Non-Blocking)

| Vital | Normal Range | Warning When |
|-------|-------------|-------------|
| Systolic BP | 90–140 mmHg | Outside range → "⚠️ Blood pressure appears [high/low]" |
| Diastolic BP | 60–90 mmHg | Outside range → "⚠️ Blood pressure appears [high/low]" |
| Pulse Rate | 60–100 BPM | Outside range → "⚠️ Pulse appears [high/low]" |
| SpO2 | 95–100% | Below 95% → "⚠️ Low oxygen saturation" |
| Temperature | 36.1–37.2°C | Outside range → "⚠️ Temperature appears [high/low]" |

These are **informational warnings** — they do NOT block the nurse from proceeding.

### 14.4 Critical Value Alerts (Red — Non-Blocking but Escalated)

| Vital | Critical Threshold | Alert |
|-------|-------------------|-------|
| Systolic BP | >180 or <80 | 🔴 "CRITICAL: Extremely [high/low] blood pressure. Advise patient to seek emergency care." |
| Diastolic BP | >120 or <50 | 🔴 "CRITICAL: Extremely [high/low] blood pressure." |
| Pulse Rate | >150 or <40 | 🔴 "CRITICAL: Abnormal heart rate. Ask if patient feels unwell." |
| SpO2 | <90% | 🔴 "CRITICAL: Very low oxygen. Advise patient to seek emergency care." |
| Temperature | >39.5°C | 🔴 "CRITICAL: High fever detected." |

**Critical alert behavior:**
- Red banner displayed prominently on the vitals form
- Does NOT block submission — nurse records the actual values and proceeds
- When vitals are saved (at Step 3), the backend `checkCriticalVitals()` method fires (Source: BACKEND-PART2A.md §13.2)
- Backend sends urgent notification to admin/coordinator: `{ event: 'critical_vitals', priority: 'critical', alerts: [...] }`

**Backend critical thresholds (Source: BACKEND-PART2A.md §13.2):**
Note a discrepancy between portal and backend critical thresholds:
- Portal defines pulse critical as >150 or <40
- Backend defines pulse abnormal as <50 or >120
- **Implementation should use the portal thresholds for UI alerts AND the backend thresholds for server-side escalation; both are valid for their respective contexts.**

### 14.5 Vitals Data Storage

All vitals are stored in `NurseVisit.vitals` as a JSON field:

```json
{
  "bloodPressureSystolic": 120,
  "bloodPressureDiastolic": 80,
  "pulseRate": 72,
  "spO2": 98,
  "weight": 75.5,
  "temperature": null,
  "notes": "Patient appeared well. Fasting confirmed."
}
```

Optional fields store `null` if not recorded. The vitals JSON schema is defined identically in both PORTAL-NURSE-FIXED.md §5 and BACKEND-PART2A.md §13.1.

### 14.6 Vitals Form — Local State Preservation

Vitals data is kept in React state (via Zustand persisted store) so that:
- If the nurse navigates back and forward, data is preserved
- If the app crashes mid-visit, data can be recovered on reopen
- If the nurse goes offline, data is stored locally and synced later

---

## 15. Step 3: Blood Sample Collection

### 15.1 Collection Form

```
┌─────────────────────────────────────┐
│                                     │
│  Step 3: Collect Blood Sample       │
│                                     │
│  ─── TESTS TO COLLECT ───          │
│  ☑ TSH (Thyroid Stimulating Hormone)│
│  ☑ CBC (Complete Blood Count)       │
│  ☑ Ferritin                         │
│                                     │
│  ─── TUBE COUNT ───                │
│  Tubes collected: [  3  ] [-] [+]   │
│                                     │
│  ─── COLLECTION NOTES ───          │
│  [_________________________________]│
│  (e.g., "Difficult vein access,     │
│   used butterfly needle")           │
│                                     │
│  [← Back]       [Mark Collected ✓]  │
│                                     │
└─────────────────────────────────────┘
```

### 15.2 Field Specifications

| Field | Input Type | Required | Validation |
|-------|-----------|----------|-----------|
| Tube count | Number stepper (tap [-] or [+]) | ✅ | Min: 1, Max: 15 |
| Collection notes | Textarea | ❌ | Max 500 characters |

**Tests checklist:** Read-only display of ordered tests (from `labOrder.tests[]`). The checkboxes are pre-checked and informational only — the nurse cannot deselect them. They serve as a visual reminder of what to collect.

### 15.3 "Mark Collected ✓" — The Critical Action

This is the most important action in the entire nurse workflow. When the nurse taps "Mark Collected":

**Frontend call:**
```typescript
trpc.nurse.visits.markCollected.mutate({
  visitId: 'uuid',
  tubeCount: 3,
  collectionNotes: 'Difficult vein access, used butterfly needle',
  vitals: {
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    pulseRate: 72,
    spO2: 98,
    weight: 75.5,
    temperature: null,
    notes: 'Patient appeared well. Fasting confirmed.'
  }
})
```

Note: vitals from Step 2 are submitted together with the collection data in this single API call. This ensures atomicity — either all data is saved or none is.

**Backend processing (Source: BACKEND-PART2A.md §13.2 — `markCollected`):**

The entire operation runs in a Prisma `$transaction` to ensure data consistency:

1. **Validate:** Visit exists, belongs to this nurse, status is one of EN_ROUTE / ARRIVED / IN_PROGRESS
2. **Update NurseVisit:**
   - `status → 'COMPLETED'`
   - `completedAt → now()`
   - `vitals → { ... }` (JSON)
   - `tubeCount → 3`
   - `collectionNotes → '...'`
3. **Update LabOrder:**
   - `status → 'SAMPLE_COLLECTED'`
   - `sampleCollectedAt → now()`
4. **Increment nurse stats:**
   - `Nurse.completedVisits → increment by 1`
5. **Check critical vitals:**
   - Backend `checkCriticalVitals()` method evaluates vitals
   - If any critical thresholds exceeded → urgent notification to admin
6. **Notify patient** (push): "Blood sample collected successfully. Your nurse will deliver it to the lab."
7. **SSE to admin:** `nurseVisit.completed { visitId, nurseId, labOrderId }`
8. **Audit log entry**

**Haptic feedback:** On successful completion, device vibrates briefly (success haptic) if available.

### 15.4 Confirmation Dialog

Before the API call, show a confirmation:

```
┌─────────────────────────────────────┐
│                                     │
│  Confirm Collection                 │
│                                     │
│  You're marking 3 tube(s) collected │
│  for Rahul M.                       │
│                                     │
│  This action cannot be undone.      │
│                                     │
│  [Cancel]        [Confirm ✓]        │
│                                     │
└─────────────────────────────────────┘
```

### 15.5 Edge Cases

| Scenario | Behavior |
|----------|----------|
| Network fails during markCollected | Data saved to offline sync queue (IndexedDB). Toast: "Collection recorded offline. Will sync shortly." Card shows "Pending sync" indicator. |
| Nurse enters 0 tubes | Stepper minimum is 1; cannot submit with 0 |
| Nurse accidentally marks collected | No undo. Admin can manually revert status via admin portal if needed. The audit log preserves the original action. |
| Tube count mismatch with lab (nurse says 3, lab receives 2) | Lab portal flags discrepancy when receiving → admin notified → audit trail shows nurse's original count vs lab's received count |

---

## 16. Step 4: Visit Completion Summary

### 16.1 Summary Screen

After successful "Mark Collected", the nurse sees a read-only summary:

```
┌─────────────────────────────────────┐
│                                     │
│  ✅ Visit Complete                   │
│                                     │
│  ─── PATIENT ───                   │
│  Rahul Mehta                        │
│  Banjara Hills, Hyderabad           │
│                                     │
│  ─── VITALS RECORDED ───           │
│  Blood Pressure: 120/80 mmHg       │
│  Pulse: 72 BPM                     │
│  SpO2: 98%                         │
│  Weight: 75.5 kg                   │
│                                     │
│  ─── COLLECTION ───                │
│  Tubes: 3                          │
│  Tests: TSH, CBC, Ferritin         │
│  Notes: Difficult vein access,     │
│         used butterfly needle       │
│                                     │
│  ─── TIMESTAMPS ───                │
│  Started: 8:32 AM                  │
│  Completed: 8:47 AM                │
│  Duration: 15 minutes              │
│                                     │
│  ─── NEXT STEP ───                 │
│  Deliver samples to:               │
│  PathLab Plus (MG Road)            │
│  [Navigate to Lab 📍]               │
│                                     │
│  [Back to Today's Visits]           │
│                                     │
└─────────────────────────────────────┘
```

### 16.2 Post-Completion Behavior

- Assignment card on home screen updates to ✅ COMPLETED with green tint
- "Deliver to Lab 🏥" button appears on the completed card
- Nurse can either:
  - Go to the next scheduled visit (if one exists)
  - Navigate to the lab to deliver this patient's samples
  - Continue collecting from other patients and do a batch delivery later

### 16.3 Duration Calculation

Duration = `completedAt` - `enRouteAt` (or `arrivedAt` if EN_ROUTE was skipped due to auto-arrive). Displayed in minutes. This data feeds into the nurse's performance stats and the admin's SLA monitoring.

---

## 17. Patient Unavailable / Failed Visit

### 17.1 When to Mark a Visit as Failed

The nurse can mark a visit as failed at any point during the visit flow by tapping **[Patient Not Available ✕]** on Step 1, or by navigating back to the assignment list and tapping the failed option.

Common reasons:
- Patient not at home
- No answer at door or phone
- Patient requests reschedule
- Patient didn't fast (when fasting was required)
- Wrong address
- Patient refused blood draw
- Other

### 17.2 Failed Visit Form

```
┌─────────────────────────────────────┐
│  ✕ Close                            │
│                                     │
│  Patient Unavailable                │
│                                     │
│  Reason:                            │
│  ○ Not home                         │
│  ○ No answer (door / phone)         │
│  ○ Reschedule requested             │
│  ○ Patient not fasting (required)   │
│  ○ Wrong address                    │
│  ○ Patient refused                  │
│  ○ Other                            │
│                                     │
│  Additional notes:                  │
│  [_________________________________]│
│                                     │
│  ⚠️ This will mark the visit as      │
│  failed. The coordinator will        │
│  arrange a new visit.               │
│                                     │
│  [Cancel]     [Mark Failed ✕]       │
│                                     │
└─────────────────────────────────────┘
```

### 17.3 Failure Reasons Enum

```typescript
enum VisitFailureReason {
  NOT_HOME = 'NOT_HOME',
  NO_ANSWER = 'NO_ANSWER',
  RESCHEDULE_REQUESTED = 'RESCHEDULE_REQUESTED',
  PATIENT_NOT_FASTING = 'PATIENT_NOT_FASTING',
  WRONG_ADDRESS = 'WRONG_ADDRESS',
  PATIENT_REFUSED = 'PATIENT_REFUSED',
  OTHER = 'OTHER'
}
```

### 17.4 "Mark Failed" Processing

**Frontend call:**
```typescript
trpc.nurse.visits.markFailed.mutate({
  visitId: 'uuid',
  reason: 'NOT_HOME',
  notes: 'Rang doorbell 3 times over 10 minutes, no response'
})
```

**Backend processing (Source: BACKEND-PART2A.md §13.2 — `markFailed`):**

Transaction:
1. Update NurseVisit: `status → 'FAILED'`, `failedAt → now()`, `failedReason → 'NOT_HOME'`
2. Update LabOrder: `status → 'COLLECTION_FAILED'`
3. Increment: `Nurse.failedVisits → increment by 1`

Post-transaction:
4. **Notify coordinator (URGENT — `priority: 'warning'`):** "❌ Visit failed — Rahul M. — Reason: Not home. Please reschedule."
5. **Notify patient** (push + WhatsApp): "We missed you! Our nurse visited but couldn't reach you. Your coordinator will contact you to reschedule."
6. SSE to admin: `visit_failed { visitId, nurseId, reason, patientId }`
7. Audit log entry

**Haptic feedback:** Double short vibration (error haptic) on failure submission.

### 17.5 What Happens After a Failed Visit

From the nurse's perspective:
- Visit card shows ❌ FAILED with red tint
- No further actions available for this visit
- Nurse proceeds to next scheduled visit

From the admin's perspective:
- Admin sees urgent notification about the failure
- Admin can create a new lab order / reschedule → triggers new nurse assignment cycle
- The failed NurseVisit record is preserved for audit and performance tracking

### 17.6 Edge Cases

| Scenario | Behavior |
|----------|----------|
| Nurse marks failed but patient calls back 5 minutes later | Too late — visit is failed. Admin must create a new assignment. Nurse cannot "unfail" a visit. |
| Visit marked failed while offline | Queued in sync store. On reconnect → synced. If the admin already reassigned while nurse was offline, the failure still records (audit trail). |
| Nurse fails visit without selecting a reason | Cannot submit — reason selection is required (radio buttons, one must be selected). |

---

## 18. Running Late Flow

### 18.1 Trigger

From the home screen → **[Running Late 🕐]** button in the persistent bottom action bar. Can also be triggered from within the visit flow.

### 18.2 Running Late Modal

```
┌─────────────────────────────────────┐
│  ✕ Close                            │
│                                     │
│  Running Late                       │
│                                     │
│  Which visit?                       │
│  ● Rahul M. — 8:00–10:00 AM        │
│  ○ Priya S. — 10:00–12:00 PM       │
│                                     │
│  New estimated arrival:             │
│  [  9:30  ] AM                      │
│                                     │
│  Reason (optional):                 │
│  [Traffic delay               ]     │
│                                     │
│  [Notify Patient & Coordinator]     │
│                                     │
└─────────────────────────────────────┘
```

**Fields:**
- **Which visit:** Radio buttons showing upcoming visits (SCHEDULED and EN_ROUTE only). Pre-selects the first upcoming visit.
- **New estimated arrival:** Time picker showing hours/minutes (increments of 15 minutes)
- **Reason:** Optional text input (max 200 characters)

### 18.3 API Call

```typescript
trpc.nurse.visits.reportLate.mutate({
  visitId: 'uuid',
  newEta: '09:30',
  reason: 'Traffic delay'
})
```

**Backend processing (Source: BACKEND-PART2A.md §13.2 — `reportLate`):**
1. Update NurseVisit: `lateReportedAt → now()`, `newEta → '09:30'`, `lateReason → 'Traffic delay'`
2. Notify patient (push + WhatsApp): "Your nurse is running a bit late. New estimated arrival: 9:30 AM."
3. SSE to admin: `nurseVisit.late { visitId, nurseId, newEta }`
4. Admin dashboard shows delay flag on the corresponding lab order card
5. Audit log entry

### 18.4 Running Late Edge Cases

| Scenario | Behavior |
|----------|----------|
| Nurse reports late multiple times for same visit | Each report updates `newEta` and `lateReportedAt`. Patient gets updated notification each time. |
| Running late for a COMPLETED visit | Cannot — only SCHEDULED and EN_ROUTE visits appear in the modal |
| ETA is in the past | Validation: new ETA must be in the future. Error: "ETA must be a future time." |
| Nurse is offline | Queued. Patient will be notified when nurse reconnects. (Delayed notification is better than no notification.) |
| SLA breach: nurse arrival > 30 min past slot start | Independent of reporting late. The SLA engine (BACKEND-PART2B.md §18) checks this automatically and escalates to admin. |

---

## 19. Delivering Samples to Lab

### 19.1 When Does Delivery Happen?

After completing one or more blood collections, the nurse physically transports the samples to the assigned diagnostic centre. This can happen:
- After each individual visit (drive to lab, come back, do next visit)
- As a batch delivery after completing multiple visits (more common)

### 19.2 Navigating to the Deliver Screen

Two entry points:
1. From a completed assignment card → "Deliver to Lab 🏥" button → navigates to `/deliver` with that visit pre-selected
2. From the bottom action area or assignment list → generic "Deliver to Lab" option (if available)

### 19.3 Deliver to Lab Screen

**Route:** `/deliver` (no dynamic ID — nurse selects visits via checkboxes)

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│  🏥 Deliver to Lab                   │
│                                     │
│  ─── SAMPLES TO DELIVER ───        │
│                                     │
│  ☑ Rahul M. — 3 tubes (TSH, CBC,   │
│    Ferritin) — collected 8:47 AM    │
│  ☑ Amit K. — 2 tubes (Testosterone, │
│    LH) — collected 10:22 AM        │
│                                     │
│  Total tubes: 5                     │
│                                     │
│  ─── DELIVERY DESTINATION ───      │
│                                     │
│  Assigned: PathLab Plus (MG Road)   │
│  Address: 456 MG Road, Bangalore    │
│  Phone: +91 80 1234 5678 [📞]       │
│  [Navigate 📍]                       │
│                                     │
│  ─── CONFIRM DELIVERY ───          │
│  Tubes being delivered: [  5  ]     │
│                                     │
│  [Confirm Delivery to Lab ✓]        │
│                                     │
└─────────────────────────────────────┘
```

### 19.4 Which Visits Appear in the Delivery List?

Only visits that are:
- Status: COMPLETED
- `deliveredToLabAt` is NULL (not yet delivered)
- Assigned to this nurse

### 19.5 Lab Selection Logic

| Condition | Behavior |
|-----------|----------|
| Lab pre-assigned by admin (most common) | Show assigned lab name + address. No "Change Lab" option. |
| Lab NOT pre-assigned | Show dropdown of active diagnostic centres in the nurse's city. Filtered by: `city = nurse.currentCity` and `isActive = true`. Sorted alphabetically. |

**API for lab list:**
```typescript
trpc.nurse.labs.getByCity.query({ city: 'Bangalore' })
// Returns: { labs: DiagnosticCentreSummary[] }
```

### 19.6 Batch Delivery

The key feature is that nurses can batch-deliver samples from multiple patients to the same lab in a single trip:
- Checkboxes allow selecting which completed visits to include
- "Total tubes" auto-calculates: sum of `tubeCount` for all selected visits
- Confirmation shows the total count

### 19.7 "Confirm Delivery" Processing

**Frontend call:**
```typescript
trpc.nurse.visits.deliverToLab.mutate({
  visitIds: ['uuid-1', 'uuid-2'],
  labId: 'uuid',
  tubeCount: 5
})
```

**Backend processing (Source: BACKEND-PART2A.md §13.2 — `deliverToLab`):**

Transaction (for each visit):
1. Update NurseVisit: `deliveredToLabAt → now()`, `deliveredToLabId → labId`, `deliveryTubeCount → tubeCount`
2. Update LabOrder: `status → 'AT_LAB'`, `deliveredToLabAt → now()`

Post-transaction:
3. Notify each patient (push): "Your blood sample has been delivered to the lab."
4. SSE to admin: `samples.delivered_to_lab { visitIds, labId, tubeCount, nurseId }`
5. SSE to lab portal: `samples.incoming { visitIds, tubeCount }` — lab sees new items in "Incoming" tab
6. Audit log entry per lab order

### 19.8 Post-Delivery UI

- Assignment cards update: "Deliver to Lab" button replaced with "Delivered to PathLab Plus at 11:30 AM"
- Green checkmark overlay on the card
- Nurse returns to home screen to continue with any remaining visits

### 19.9 Lab Delivery SLA

There is an implicit SLA: samples should be delivered to the lab within 4 hours of collection (Source: PORTAL-NURSE-FIXED.md §30). However, this SLA is NOT currently listed in PORTAL-ADMIN.md §30 (SLA Configuration table). It must be added to the admin's Lab Order SLA settings for enforcement.

If the 4-hour window passes without delivery, the SLA engine should flag this for admin attention.

### 19.10 Delivery Edge Cases

| Scenario | Behavior |
|----------|----------|
| Nurse delivers to wrong lab | No system-level prevention in MVP. Admin can check audit logs. Phase 2 may add lab QR code scanning. |
| Lab is closed when nurse arrives | Nurse cannot confirm delivery. Should contact admin who may reassign to another lab. |
| Tube count mismatch | Nurse enters 5 in delivery, lab receives only 4. Lab portal flags discrepancy (Source: PORTAL-LAB-FIXED.md). Admin investigates via audit trail. |
| Delivery while offline | Queued in sync store. Lab won't see "Incoming" until nurse reconnects and sync completes. |
| Nurse delivers some visits but not others | Only checked visits are submitted. Unchecked visits remain with "Deliver to Lab" button active. |

---

## 20. Visit Cancellation (Admin-Initiated)

### 20.1 How Visits Get Cancelled

Nurses cannot cancel visits. Only the admin/coordinator can cancel a NurseVisit (Source: PORTAL-ADMIN.md §8).

**Admin triggers cancellation when:**
- Patient requests cancellation
- Doctor withdraws the lab order
- Nurse reassignment needed (admin cancels current, creates new assignment)
- Scheduling conflict discovered

### 20.2 What Happens When a Visit Is Cancelled

**Backend (Source: BACKEND-PART2A.md §12):**
1. NurseVisit: `status → 'CANCELLED'`, `cancelledAt → now()`, `cancelledReason → '[reason]'`
2. LabOrder: `status` reverts to `SLOT_BOOKED` (ready for re-assignment)
3. SSE to nurse: `assignment_cancelled { visitId, patientName, reason }`
4. Push notification to nurse: "Visit with [patient] has been cancelled. Reason: [reason]."
5. Patient notified separately by admin

### 20.3 Nurse Experience of Cancellation

**If nurse is on the home screen:**
- SSE event received → card animates out of the list
- Toast: "Visit cancelled: [patient name]"

**If nurse is actively in the visit flow (`/visit/[id]`) for the cancelled visit:**
- SSE event triggers a full-screen blocking modal:
```
┌─────────────────────────────────────┐
│                                     │
│  ⚠️ Visit Cancelled                  │
│                                     │
│  This visit with Rahul M. has been  │
│  cancelled by the coordinator.      │
│                                     │
│  Reason: Patient requested          │
│  reschedule                         │
│                                     │
│  [Back to Assignments]              │
│                                     │
└─────────────────────────────────────┘
```
- Any unsaved vitals data is discarded (visit no longer exists)
- Nurse is returned to the home screen

**If nurse is offline when cancellation happens:**
- Cancellation SSE is missed
- On reconnect → full assignment list re-fetched → cancelled visit disappears
- If nurse had already started the visit offline and queued actions: sync will fail with a clear error "Visit was cancelled"
- Admin is notified of the sync conflict

### 20.4 Cancellation While EN_ROUTE

This is the trickiest scenario: the nurse is physically traveling to the patient and the visit gets cancelled.

- Nurse receives push notification immediately: "Visit cancelled. No need to proceed to [patient name]."
- In-app: if portal is open, the SSE event shows the cancellation modal
- If nurse has already arrived but hasn't started the visit flow: card changes to CANCELLED on home screen
- If nurse has already started recording vitals: all progress is lost (the visit is invalidated)

---

*End of Part 2. Continue to WORKFLOW-NURSE-PART3.md for support workflows, security, offline, Phase 2, and cross-references (§21–30).*
