# WORKFLOW-NURSE-PART3.md — Nurse Complete Workflow Reference (Part 3 of 3)

## Support Workflows: History, Profile, Notifications, Offline, Security, Phase 2 & Cross-Portal Integration

> **Document type:** Detailed workflow documentation (every screen, action, decision, error, and edge case)
> **Perspective:** Nurse / Phlebotomist / Home Visit Specialist
> **Version:** 1.0
> **Last updated:** March 2026
> **Cross-references:** See WORKFLOW-NURSE-PART1.md header for full list

---

## 21. Past Visits & History

### 21.1 Accessing History

**Route:** `/history` — accessed from the top-level navigation or from "View History" link on home screen.

### 21.2 History Screen Layout

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│  Visit History                      │
│                                     │
│  [All] [Completed] [Failed]  ← Filter tabs
│                                     │
│  ─── This Week (12 visits) ───     │
│                                     │
│  Fri, 28 Feb ──────────────         │
│  ✅ Rahul M. — Banjara Hills       │
│     3 tubes, BP 120/80, Pulse 72   │
│  ✅ Priya S. — Jubilee Hills       │
│     2 tubes, BP 118/76, Pulse 68   │
│  ❌ Amit K. — Madhapur             │
│     Not home                        │
│                                     │
│  Thu, 27 Feb ──────────────         │
│  ✅ Sneha K. — Koramangala          │
│     4 tubes, BP 110/70, Pulse 80   │
│  ...                                │
│                                     │
│  [Load More]                        │
│                                     │
│  ─── STATS ───                     │
│  Total visits: 47                   │
│  Completed: 43 (91.5%)             │
│  Failed: 4 (8.5%)                  │
│  Average duration: 18 min           │
│                                     │
└─────────────────────────────────────┘
```

### 21.3 API

```typescript
trpc.nurse.visits.getHistory.query({
  page: 1,
  pageSize: 20,
  status: 'ALL'  // 'ALL' | 'COMPLETED' | 'FAILED'
})
// Returns: {
//   visits: NurseVisitSummary[],
//   pagination: { page: 1, pageSize: 20, total: 47, totalPages: 3 },
//   stats: { total: 47, completed: 43, failed: 4, avgDurationMinutes: 18 }
// }
```

### 21.4 Viewing a Historical Visit

Tapping on a historical visit opens a read-only summary modal — same layout as the Step 4 completion summary (§16), but with no action buttons. Shows: patient name, area, vitals recorded, tube count, test names, timestamps, notes, and whether it was delivered to lab (and when/where).

### 21.5 History Filters

| Tab | Shows |
|-----|-------|
| All | All past visits (COMPLETED + FAILED), grouped by date, newest first |
| Completed | Only COMPLETED visits — shows vitals, tube count, delivery status |
| Failed | Only FAILED visits — shows failure reason and notes |

### 21.6 Pagination

- Default page size: 20 visits
- "Load More" button at bottom fetches next page
- Scroll position preserved when loading more
- Total count shown in stats bar

---

## 22. Profile & Settings

### 22.1 Profile Screen

**Route:** `/profile`

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│  [Avatar placeholder]               │
│  Priya Sharma                       │
│  +91 87654 32109                    │
│  priya@email.com                    │
│                                     │
│  ─── QUALIFICATION ───             │
│  GNM — Certificate #NUR/2020/4567  │
│  ✅ Verified                         │
│                                     │
│  ─── SERVICE AREA ───              │
│  City: Bangalore                    │
│  Pincodes: 560001, 560034, 560038, │
│            560068, 560095           │
│                                     │
│  ─── AVAILABILITY ───              │
│  Days: Mon, Tue, Wed, Thu, Fri, Sat│
│  Hours: 7:00 AM — 5:00 PM          │
│  Max daily visits: 8                │
│                                     │
│  ─── PERFORMANCE ───               │
│  Completed: 43 visits               │
│  Failed: 4 visits                   │
│  Rating: ⭐ 4.8                     │
│                                     │
│  ─── SETTINGS ───                  │
│  Push Notifications: [ON]           │
│  WhatsApp Notifications: [ON]       │
│                                     │
│  [Log Out]                          │
│                                     │
│  ─── ABOUT ───                     │
│  App Version: 1.0.0                 │
│  Onlyou Nurse Portal                │
│  [Contact Support]                  │
│                                     │
└─────────────────────────────────────┘
```

### 22.2 Editable vs. Read-Only Fields

| Field | Nurse Can Edit | Admin Can Edit | Notes |
|-------|---------------|----------------|-------|
| Name | ❌ | ✅ | Legal name on certification |
| Phone | ❌ | ✅ | Changing invalidates current JWT |
| Email | ✅ | ✅ | `trpc.nurse.profile.updateEmail.mutate({ email })` |
| Qualification | ❌ | ✅ | Requires re-verification |
| Certification | ❌ | ✅ | Document in S3 |
| City | ❌ | ✅ | Changes service area availability |
| Serviceable pincodes | ❌ | ✅ | Determines which patients nurse can be assigned |
| Available days | ❌ | ✅ | Determines assignment eligibility |
| Available hours | ❌ | ✅ | Determines assignment eligibility |
| Max daily visits | ❌ | ✅ | Caps assignments per day |
| Push notifications | ✅ | — | Toggle via `trpc.nurse.profile.updateNotificationPrefs.mutate({ push: true/false })` |
| WhatsApp notifications | ✅ | — | Toggle via same endpoint |

**Rationale:** Nurse schedules and service areas are managed centrally by the coordinator. This prevents nurses from shrinking their availability without admin approval, which could disrupt scheduling.

### 22.3 Logout Flow

When nurse taps [Log Out]:
1. Confirmation dialog: "Are you sure you want to log out? [Cancel] [Log Out]"
2. Call `trpc.auth.logout.mutate()` → server blacklists the refresh token
3. Clear localStorage (access token backup)
4. Clear Zustand stores (auth, visits, sync queue)
5. Redirect to `/login`
6. Audit log: `{ action: 'nurse_logout', nurseId, timestamp }`

**Edge case — Pending sync items at logout:**
If the sync queue has unsubmitted offline actions:
- Warning: "You have unsaved changes that haven't synced. Log out anyway? Data may be lost. [Stay] [Log Out Anyway]"
- If nurse logs out anyway → sync queue is cleared → data is lost
- Best practice: always sync before logging out

### 22.4 Contact Support

"Contact Support" opens a WhatsApp chat with the admin/coordinator (pre-filled message: "Hi, I need help with the Onlyou Nurse Portal. My phone: +91XXXXXXXXXX").

---

## 23. Notification System (Nurse Experience)

### 23.1 Notification Channels

| Channel | Technology | Use Cases | Timing |
|---------|-----------|-----------|--------|
| Push (FCM) | Firebase Cloud Messaging | New assignments, status changes, urgent alerts, visit reminders | Real-time |
| WhatsApp | Gupshup Business API | New assignments (primary), schedule changes, daily summary | Real-time / Scheduled |
| SMS | Gupshup/MSG91 | Fallback when WhatsApp delivery fails | Fallback |
| In-app (SSE) | Server-Sent Events via Redis Pub/Sub | Badge updates, assignment list refresh, toasts | Real-time |

### 23.2 Push Notification Registration

On first login, the app requests push notification permission and registers the FCM token:

```typescript
const token = await getToken(messaging, {
  vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
});
await trpc.nurse.profile.registerPushToken.mutate({ token });
```

**Chinese OEM Android devices (Xiaomi, Oppo, Vivo, Realme):**
These devices aggressively kill background processes and block push notifications. The nurse may need to:
- Disable battery optimization for the browser/PWA
- Enable "Auto-start" permission in device settings
- Lock the app in recent apps (prevent swipe-kill)

This is a known limitation documented in ARCHITECTURE.md and is partially mitigated by WhatsApp notifications as the primary channel (WhatsApp has its own push infrastructure that works better on Chinese OEM devices).

### 23.3 Notification Events — Complete Matrix

| Event | Push | WhatsApp | SMS | In-App SSE |
|-------|------|----------|-----|-----------|
| New assignment | ✅ | ✅ | Fallback | ✅ |
| Assignment cancelled | ✅ | ✅ | Fallback | ✅ |
| Assignment rescheduled | ✅ | ✅ | Fallback | ✅ |
| Patient confirmed slot | ✅ | — | — | ✅ |
| Visit reminder (30 min before) | ✅ | — | — | — |
| SLA warning (late for next visit) | ✅ | — | — | ✅ |
| Daily schedule summary (8 PM) | — | ✅ | — | — |
| Account deactivation | — | ✅ | ✅ | — |

### 23.4 WhatsApp Message Templates

**New Assignment:**
```
Onlyou: New blood collection assignment
📅 Date: {{date}}
🕐 Time: {{timeSlot}}
📍 Area: {{area}}
🔬 Tests: {{tests}}
Open your portal: nurse.onlyou.life
```

**Schedule Change:**
```
Onlyou: Your {{date}} visit with {{patientFirstName}} has been {{action}}.
{{#if rescheduled}}New time: {{newTimeSlot}}{{/if}}
Check your portal for details.
```

**Daily Summary (8 PM the night before):**
```
Onlyou: Tomorrow's Schedule
📅 {{date}}
{{visitCount}} visit(s) scheduled:
{{#each visits}}
• {{time}} — {{area}} ({{tests}})
{{/each}}
Open portal: nurse.onlyou.life
```

### 23.5 Notification Bell (In-App)

The notification bell icon in the top bar shows:
- Badge count: number of unread notifications
- Tapping opens a notification list overlay showing the last 20 notifications
- Each notification: icon + text + timestamp + read/unread indicator
- Tapping a notification marks it as read and navigates to the relevant screen (e.g., tapping an assignment notification navigates to today's assignments)

---

## 24. Offline Mode & Sync Strategy

### 24.1 Network Detection

```typescript
// hooks/useOffline.ts
const [isOnline, setIsOnline] = useState(navigator.onLine);
// Listens to 'online' and 'offline' window events
```

### 24.2 Offline Banner

When offline, a persistent non-dismissible banner appears at the top of every screen:
```
⚠️ You're offline. Changes will sync when connection is restored.
```
Auto-hides when connection is restored.

### 24.3 Offline Capability Matrix

| Action | Offline Behavior |
|--------|-----------------|
| View today's assignments | ✅ Cached data from last sync |
| View visit details | ✅ Cached data |
| Navigate to address | ✅ Opens Maps app (has own offline) |
| Call patient | ✅ Phone dialer works |
| Start visit (→ EN_ROUTE) | ✅ Queued in sync store |
| Record vitals | ✅ Stored in IndexedDB |
| Mark collected | ✅ Stored in IndexedDB |
| Mark failed | ✅ Stored in IndexedDB |
| Deliver to lab | ✅ Stored in IndexedDB |
| Report running late | ✅ Queued |
| Pull to refresh | ❌ "No connection" error |
| Receive new assignments (SSE) | ❌ SSE disconnected |
| Receive push notifications | ❌ Depends on FCM background state |

### 24.4 Sync Queue Architecture

```typescript
// stores/sync.store.ts (Zustand + IndexedDB persistence)
interface SyncAction {
  id: string;                          // Unique action ID
  type: 'UPDATE_STATUS' | 'MARK_COLLECTED' | 'MARK_FAILED' | 'DELIVER_TO_LAB' | 'REPORT_LATE';
  payload: any;                        // Full API call payload
  timestamp: number;                   // When action was performed offline
  retryCount: number;                  // Failed sync attempts
}
```

### 24.5 Sync on Reconnect

When the browser fires the `online` event:

```
Online detected
    │
    ▼
Retrieve sync queue (sorted by timestamp, oldest first)
    │
    ▼
For each queued action:
    │
    ├── Execute API call
    │     │
    │     ├── Success → Remove from queue, show ✅ toast
    │     │
    │     └── Failure → Increment retryCount
    │           │
    │           ├── retryCount < 3 → Keep in queue, try next
    │           │
    │           └── retryCount ≥ 3 → Move to dead letter queue
    │                                 Notify admin of sync failure
    │
    ▼
After all actions processed:
    │
    ▼
Full assignment list re-fetch (catch any missed SSE events)
    │
    ▼
Analytics: nurse_come_online { offlineDurationMin, pendingSyncCount }
```

### 24.6 Dead Letter Queue

If an action fails 3 times:
- Moved to dead letter store (separate IndexedDB collection)
- Admin notified: "Nurse [name] has a failed sync action: [type] for visit [id]"
- Common causes: visit was cancelled while nurse was offline, data conflict, server error
- Resolution: admin manually reconciles in admin portal

### 24.7 App Crash Recovery

If the app crashes mid-visit:
- Zustand persisted store has the current visit state (including vitals form data)
- On app reopen: "You have an in-progress visit with [patient]. [Continue Visit]"
- Data is preserved and the nurse can resume from where they left off
- If the crash happened after "Mark Collected" was triggered offline → the sync queue will complete it on reconnect

---

## 25. Privacy & Data Access Boundaries

### 25.1 What the Nurse Can See

| Data | Visible | Source |
|------|---------|--------|
| Patient name | ✅ | NurseVisit → Patient (name only) |
| Patient address (visit only) | ✅ | NurseVisit.visitAddress |
| Patient phone | ✅ | Patient.phone (for assigned visits) |
| Tests to be collected | ✅ | LabOrder.tests (test names only) |
| Special instructions | ✅ | NurseVisit.specialInstructions + LabOrder.notes |
| Scheduled time slot | ✅ | NurseVisit.scheduledTimeSlot |
| Assigned diagnostic centre | ✅ | DiagnosticCentre (name, address, phone) |
| Own visit history & stats | ✅ | NurseVisit records (own only) |
| Own profile data | ✅ | Nurse record |

### 25.2 What the Nurse CANNOT See (Enforced at API Level)

| Data | Reason |
|------|--------|
| Patient condition/diagnosis | Clinical privacy — nurse doesn't need this for blood collection |
| Questionnaire responses | Clinical data irrelevant to collection |
| AI assessment | Clinical data, doctor-only |
| Prescription details | Pharmacy-only data |
| Doctor notes | Doctor-patient communication |
| Payment / subscription info | Financial data, admin-only |
| Other nurses' assignments | Privacy between team members |
| Patient email | Not needed for field work |
| Patient government ID | Admin-only for verification |
| Patient date of birth | Not needed (age-sensitive clinical data) |
| Patient photos (uploaded for verticals) | Clinical, doctor-only |

### 25.3 API-Level Enforcement

Privacy is NOT just a UI concern. The tRPC router's `select` clause explicitly excludes restricted fields (Source: PORTAL-NURSE-FIXED.md §21):

```typescript
// nurse.router.ts — Patient select for nurse
patient: {
  select: {
    name: true,        // ✅
    phone: true,       // ✅
    // Everything else is excluded by not being selected
  }
}
```

Even if someone inspects network traffic, the restricted data is never sent from the server.

### 25.4 The Nurse Never Knows the Condition

This is a critical privacy design principle. A nurse collecting blood for a hair loss patient and a nurse collecting blood for an ED patient see exactly the same information format: patient name, address, test names, and instructions. The test names themselves may hint at the condition (e.g., "Testosterone, LH" suggests a hormonal issue), but the platform never explicitly labels the condition.

---

## 26. Security, Audit & CASL Permissions

### 26.1 CASL Permission Rules (Nurse Role)

From BACKEND-PART3A.md §22.4:

```typescript
case 'NURSE':
  can('read', 'NurseVisit', { nurseId: user.id });   // Only own visits
  can('update', 'NurseVisit', { nurseId: user.id });  // Only own visits
  can('read', 'LabOrder');                             // Filtered at query level by assignment
  // Nurse sees limited patient data (first name, phone, address)
  cannot('read', 'Consultation');    // No clinical data
  cannot('read', 'Prescription');    // No prescription access
```

**Key enforcement points:**
- Every nurse API call validates `nurseId` matches the authenticated user
- NurseVisit queries include `WHERE nurseId = ctx.nurse.id`
- LabOrder access is restricted to orders linked to the nurse's visits
- Consultation, Prescription, AIAssessment, Questionnaire, Payment — all blocked

### 26.2 Audit Logging

Every nurse action generates an audit log entry (Source: BACKEND-PART3A.md §22, PORTAL-NURSE-FIXED.md §22):

| Action | Fields Logged |
|--------|--------------|
| Login | `{ nurseId, timestamp, ip, userAgent }` |
| View assignments | `{ nurseId, date, timestamp }` |
| Start visit (EN_ROUTE) | `{ nurseId, visitId, timestamp }` |
| Arrive at location | `{ nurseId, visitId, timestamp, gps? }` |
| Record vitals | `{ nurseId, visitId, vitals (full JSON), timestamp }` |
| Mark collected | `{ nurseId, visitId, tubeCount, timestamp }` |
| Mark failed | `{ nurseId, visitId, reason, notes, timestamp }` |
| Report late | `{ nurseId, visitId, newEta, reason, timestamp }` |
| Deliver to lab | `{ nurseId, visitIds[], labId, tubeCount, timestamp }` |
| Update email | `{ nurseId, oldEmail, newEmail, timestamp }` |
| Toggle notifications | `{ nurseId, push, whatsapp, timestamp }` |
| Logout | `{ nurseId, timestamp }` |

Audit logs are immutable — even admins cannot delete them (CASL rule: `cannot('delete', 'AuditLog')`).

### 26.3 Session Security Summary

| Measure | Implementation |
|---------|---------------|
| HttpOnly cookies | Refresh token not accessible via JS |
| SameSite=Strict | CSRF protection |
| Secure flag | Cookies only over HTTPS |
| Token rotation | Every refresh generates new token pair |
| Theft detection | Old refresh token reuse → all tokens revoked |
| Idle timeout | 12 hours (nurses work long shifts) |
| IP logging | Login IP recorded in audit log |
| Concurrent sessions | Not allowed — new login invalidates previous |
| Content Security Policy | CSP headers configured in Next.js config |
| CORS | Only `nurse.onlyou.life` origin accepted |

### 26.4 DPDPA Compliance (Nurse Context)

Under India's DPDPA 2023:
- Nurse handles personal data (patient name, address, phone) only for the purpose of the assigned visit
- Data is not retained locally after sync — PWA cache contains assignment data only during active period
- Nurse cannot export, screenshot, or copy patient data (no technical enforcement in MVP, but contractual/policy obligation)
- Right to erasure: if a patient requests data deletion, admin removes the data → nurse's cached assignments auto-update on next sync
- Data residency: all data stored in AWS Mumbai (ap-south-1) — nurse portal API calls route to the same region

---

## 27. Error States & Master Edge Case Registry

### 27.1 Network Errors

| Scenario | Behavior |
|----------|----------|
| API call fails (network) | Toast: "Couldn't connect. Retrying..." + auto-retry (3 attempts, exponential backoff: 1s, 2s, 4s) |
| API call fails after retries | Toast: "Connection failed. Action saved — will sync when online." + queue to sync store |
| SSE disconnects | Auto-reconnect (1s → 2s → 4s → 8s → max 30s). Banner: "Reconnecting..." |
| Token expired during offline | On reconnect → silent refresh → if fails → redirect to login |
| Server returns 500 | Toast: "Something went wrong. Please try again." + error logged to analytics |
| Server returns 429 (rate limit) | Toast: "Too many requests. Please wait a moment." |

### 27.2 Visit Flow Errors

| Scenario | Behavior |
|----------|----------|
| Start visit for wrong date | Button disabled. Toast: "This visit is scheduled for [date]." |
| Start second visit while one is active | Warning modal: "You have an active visit with [patient]. Complete or cancel it first." |
| Vitals save fails | Data stored locally, retry on next step. "Vitals saved locally — will upload when connected." |
| Mark collected fails (network) | Queue to sync. "Collection recorded offline. Will sync shortly." |
| Tube count 0 | Stepper minimum is 1; button disabled |
| Visit cancelled while in flow | Full-screen alert with reason. "Back to Assignments" button. |
| Nurse reassigned while en route | SSE push: "You've been reassigned. Visit with [patient] cancelled." New assignment appears. |

### 27.3 App State Errors

| Scenario | Behavior |
|----------|----------|
| App crash mid-visit | Zustand persisted store retains form data. On reopen: "You have an in-progress visit. [Continue Visit]" |
| Browser cache cleared | JWT lost → login required. Visit data → re-fetched from server. Sync queue lost → server has last confirmed state. |
| PWA update available | Top banner: "Update available. [Refresh to update]" — does NOT interrupt active visit flow |
| Multiple tabs open | Only first tab uses SSE. Second tab: "Portal is open in another tab." |
| Low storage on device | PWA cache may fail. Non-critical — app still works online. Offline features degraded. |
| JavaScript disabled | App won't function. "Please enable JavaScript to use Onlyou Nurse Portal." |

### 27.4 Data Consistency Edge Cases

| Scenario | Behavior |
|----------|----------|
| Tube count mismatch (nurse vs lab) | Lab flags discrepancy → admin notified → audit trail shows both counts |
| Double-tap on "Mark Collected" | Frontend disables button immediately (loading state). Backend: idempotent — second call returns same result. |
| Concurrent admin edit + nurse action | Last-write-wins at database level. Example: admin cancels while nurse marks collected → the first transaction to commit wins. Losing transaction gets a conflict error → retry or escalate. |
| Clock skew (nurse phone time wrong) | Timestamps from the server (`new Date()` on backend), not from the client. Client time only used for display. |
| Visit with no lab order (edge) | `labOrderId` is nullable on NurseVisit. If `labOrderId` is null → skip lab order status updates. This can happen for Phase 2 standalone vitals visits. |

---

## 28. Phase 2 — Scaffolded Workflows (Muted)

### 28.1 Feature Flag

```typescript
NURSE_INJECTION_ADMIN_ENABLED = false  // Environment variable
```

When `false` (MVP): injection-related UI is completely hidden. When `true` (Phase 2): additional steps appear in the visit flow.

### 28.2 Injection Administration Workflow (Phase 2)

When enabled, the visit flow expands to 6 steps:
1. Verify Patient (same as MVP)
2. Record Vitals — Pre-Injection (same as MVP)
3. Collect Blood Sample (same as MVP, if applicable)
4. **Administer Injection** (NEW)
5. **Post-Injection Observation** (NEW)
6. Complete Visit

**Step 4 — Administer Injection:**
- Medication verification (scan barcode or manual confirmation of medication name + dose)
- Injection site selection (dropdown: left abdomen, right abdomen, left thigh, right thigh, upper arm)
- Nurse administers injection
- **Proof of Administration:**
  - Timestamped photo capture (camera opens, nurse photographs injection site)
  - Digital signature (patient draws signature on screen with finger)
- Data stored in NurseVisit fields: `medicationAdministered`, `injectionSite`, `proofOfAdminPhotoUrl` (S3), `patientSignatureUrl` (S3)

**Step 5 — Post-Injection Observation (30 minutes):**
- Timer starts: 30-minute countdown displayed on screen
- Checklist every 10 minutes: "How is the patient feeling?" — nurse records observations
- Post-injection vitals check: repeat BP, pulse, SpO2
- If adverse reaction observed: free-text notes in `adverseReactionNotes`
- "Connect Doctor" button: opens three-way video bridge (patient + nurse + doctor)
- Timer completion → proceed to Step 6

**Schema fields (already in NurseVisit — Source: PORTAL-NURSE-FIXED.md §5):**
```
medicationAdministered   String?
injectionSite            String?
proofOfAdminPhotoUrl     String?
patientSignatureUrl      String?
postInjectionVitals      Json?
observationMinutes       Int?
adverseReactionNotes     String?
```

### 28.3 GPS Check-In (Phase 2)

When enabled:
- `useGeolocation.ts` hook activates
- On visit start: `navigator.geolocation.getCurrentPosition()` called
- Coordinates stored with the visit
- Backend compares nurse GPS vs patient address (geocoded)
- If >500m → flag for admin review
- Privacy notice: "📍 Location captured for visit verification"

### 28.4 Three-Way Video Bridge (Phase 2)

- Provider TBD: Daily.co / Twilio / Agora
- Nurse taps "Connect Doctor" during injection observation
- System creates a video room with 3 seats (patient + nurse + doctor)
- Doctor receives notification to join
- Video recorded with consent for clinical documentation
- Use case: doctor observes nurse administering GLP-1 injection, verifies technique, answers patient questions

### 28.5 Visit Types Beyond Blood Collection (Phase 2)

```typescript
enum NurseVisitType {
  BLOOD_COLLECTION    // MVP: Primary
  INJECTION_ADMIN     // Phase 2: GLP-1, TRT
  VITALS_ONLY         // Phase 2: Standalone vitals check
  FOLLOW_UP           // Phase 2: Post-treatment check
}
```

For MVP, all visits are `BLOOD_COLLECTION`. The `visitType` field exists in the schema and is set by the backend when creating the NurseVisit, but the nurse portal's UI only handles the blood collection flow.

---

## 29. Cross-Portal Integration Map

### 29.1 How Nurse Actions Affect Other Portals

```
NURSE PORTAL ACTION                  EFFECT ON OTHER PORTALS
─────────────────────                ───────────────────────

Start Visit (EN_ROUTE)  ──────────→  Admin: lab order card shows "Nurse En Route"
                        ──────────→  Patient App: tracker step activates "Nurse on the way"
                        ──────────→  Push to patient: "Your nurse is on the way"

Record Vitals + Mark    ──────────→  Admin: lab order card shows "Sample Collected" + vitals summary
Collected (COMPLETED)   ──────────→  Patient App: tracker step "Sample collected ✓"
                        ──────────→  Push to patient: "Blood sample collected successfully"
                        ──────────→  Doctor Portal: vitals appear in patient's lab results tab
                        ──────────→  (if critical vitals) Admin: urgent notification

Mark Failed             ──────────→  Admin: URGENT notification "Visit failed — [reason]"
                        ──────────→  Patient App: "We missed you" notification
                        ──────────→  Push to patient: "Coordinator will reschedule"

Report Late             ──────────→  Admin: delay flag on lab order card
                        ──────────→  Patient App: updated ETA notification
                        ──────────→  Push to patient: "Nurse running late, new ETA: [time]"

Deliver to Lab          ──────────→  Admin: "Samples delivered" event in activity feed
(AT_LAB)                ──────────→  Patient App: tracker step "Delivered to lab ✓"
                        ──────────→  Push to patient: "Sample delivered to lab"
                        ──────────→  Lab Portal: new items in "Incoming" tab
                        ──────────→  SSE to lab: samples.incoming event
```

### 29.2 How Other Portal Actions Affect the Nurse

```
OTHER PORTAL ACTION                  EFFECT ON NURSE PORTAL
──────────────────                   ──────────────────────

Admin assigns nurse     ──────────→  New assignment card appears (SSE + push + WhatsApp)
Admin cancels visit     ──────────→  Card removed from list (SSE + push). If in visit flow: blocking modal.
Admin reschedules       ──────────→  Card updated (SSE + push). If in visit flow: blocking modal.
Admin changes nurse     ──────────→  Original nurse: visit cancelled. New nurse: new assignment.
Admin deactivates       ──────────→  Next login attempt: "Account deactivated" message.
 nurse account

Doctor orders blood     ──────────→  (No direct effect. Goes: doctor → admin → admin assigns nurse.)
 work

Patient books slot      ──────────→  (No direct effect. Goes: patient → admin → admin assigns nurse.)
Patient cancels slot    ──────────→  Admin may cancel nurse visit → visit cancelled notification.

Lab receives sample     ──────────→  (No direct effect on nurse. Lab → Processing → Results → Doctor.)
```

### 29.3 Status Flow — Nurse's Part of the Lab Order Lifecycle

```
LabOrder Status Flow (Nurse involvement highlighted with ★):

ORDERED (doctor creates)
    │
    ▼
SLOT_BOOKED (patient selects slot)
    │
    ▼
★ NURSE_ASSIGNED (admin assigns nurse)  ← NurseVisit.status: SCHEDULED
    │
    ▼
★ NURSE_EN_ROUTE                        ← NurseVisit.status: EN_ROUTE
    │
    ▼
★ NURSE_ARRIVED                         ← NurseVisit.status: ARRIVED
    │
    ├──→ ★ SAMPLE_COLLECTED             ← NurseVisit.status: COMPLETED
    │        │
    │        ▼
    │     ★ AT_LAB                      ← NurseVisit.deliveredToLabAt set
    │        │
    │        ▼
    │     PROCESSING (lab starts)
    │        │
    │        ▼
    │     RESULTS_READY (lab uploads)
    │        │
    │        ▼
    │     DOCTOR_REVIEWED (doctor reviews)
    │        │
    │        ▼
    │     CLOSED
    │
    └──→ ★ COLLECTION_FAILED            ← NurseVisit.status: FAILED
             │
             ▼
         Admin creates recollection → new cycle
```

### 29.4 NurseVisit ↔ LabOrder Status Mapping

| NurseVisit Status | LabOrder Status | Trigger |
|-------------------|----------------|---------|
| `SCHEDULED` | `NURSE_ASSIGNED` | Admin assigns nurse |
| `EN_ROUTE` | `NURSE_EN_ROUTE` | Nurse taps "Start Visit" |
| `ARRIVED` | `NURSE_ARRIVED` | Nurse opens visit flow |
| `IN_PROGRESS` | (no change) | Nurse taps "Next: Record Vitals" |
| `COMPLETED` | `SAMPLE_COLLECTED` | Nurse taps "Mark Collected" |
| (lab delivery) | `AT_LAB` | Nurse taps "Confirm Delivery" |
| `FAILED` | `COLLECTION_FAILED` | Nurse taps "Mark Failed" |
| `CANCELLED` | Reverts to `SLOT_BOOKED` | Admin cancels nurse assignment |

> **⚠️ Cross-Document Status Note:** The `AT_LAB` status used in this document (and PORTAL-ADMIN.md, PORTAL-DOCTOR.md) corresponds to `DELIVERED_TO_LAB` in onlyou-spec-resolved-v4.md (line 716). The v4 spec further distinguishes a subsequent `SAMPLE_RECEIVED` status (line 762) when the lab confirms receipt — used in APP-PATIENT.md (line 546) for the patient-facing "Sample received at lab" stepper label. During implementation, ensure the enum uses a single canonical name across all services. **Recommended:** adopt `AT_LAB` as the canonical status for nurse-delivers-to-lab, and `SAMPLE_RECEIVED` for lab-confirms-receipt.

---

## 30. Complete Status Flow Diagrams & Mappings

### 30.1 NurseVisit Status Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                    NURSE VISIT STATUS FLOW                            │
│                                                                      │
│  Admin assigns nurse                                                 │
│         │                                                            │
│         ▼                                                            │
│    ┌──────────┐                                                      │
│    │SCHEDULED │ ← NurseVisit created                                 │
│    └────┬─────┘                                                      │
│         │  Nurse taps "Start Visit"                                  │
│         ▼                                                            │
│    ┌──────────┐                                                      │
│    │ EN_ROUTE │ → Patient notified: "Nurse on the way"               │
│    └────┬─────┘                                                      │
│         │  Nurse opens visit flow                                    │
│         ▼                                                            │
│    ┌──────────┐                                                      │
│    │ ARRIVED  │ → arrivedAt timestamp recorded                       │
│    └────┬─────┘                                                      │
│         │  Nurse verifies patient identity                           │
│         ▼                                                            │
│    ┌────────────┐                                                    │
│    │IN_PROGRESS │ → Recording vitals, collecting sample              │
│    └─────┬──────┘                                                    │
│          │                                                           │
│     ┌────┴────────────────┐                                          │
│     │                     │                                          │
│     ▼                     ▼                                          │
│ ┌───────────┐      ┌──────────┐                                      │
│ │ COMPLETED │      │  FAILED  │ → Reason recorded                    │
│ │           │      │          │ → Coordinator alerted                │
│ │ Vitals +  │      └──────────┘ → Patient notified                   │
│ │ tubes     │           ▲                                            │
│ │ saved     │           │ Patient unavailable                        │
│ └─────┬─────┘           │ at any point                               │
│       │                                                              │
│       │  Nurse delivers to diagnostic centre                         │
│       ▼                                                              │
│ ┌───────────────────┐                                                │
│ │  LAB DELIVERY     │ → LabOrder.status → AT_LAB                     │
│ │ (deliveredToLabAt) │ → Lab portal notified                         │
│ └───────────────────┘ → Patient notified                             │
│                                                                      │
│  ──── SEPARATELY ────                                                │
│                                                                      │
│ ┌───────────┐                                                        │
│ │ CANCELLED │ ← Admin cancels before collection starts               │
│ │           │ → Nurse notified (SSE + push)                          │
│ │           │ → LabOrder reverts to SLOT_BOOKED                      │
│ └───────────┘                                                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 30.2 SLA Thresholds (Nurse-Related)

| SLA Rule | Default Threshold | Escalation | Source |
|----------|-------------------|------------|--------|
| Nurse assignment after patient books slot | 2 hours | Admin self-alert | BACKEND-PART2B.md §18 (`NURSE_ASSIGNMENT_HOURS: 2`) |
| Nurse arrival (visit start) | 30 minutes past slot start | Admin + patient notification | PORTAL-NURSE-FIXED.md §30 |
| Sample delivery to lab after collection | 4 hours | Admin notification | PORTAL-NURSE-FIXED.md §30 |

> **⚠️ Cross-Document SLA Note:** The "Sample delivery to lab: 4 hours" SLA is listed in PORTAL-NURSE-FIXED.md §30 but is NOT in PORTAL-ADMIN.md §30 (SLA Configuration table). It must be added to the admin SLA settings for enforcement by the SLA engine.

### 30.3 Analytics Events (Complete)

| Event | Properties | Purpose |
|-------|-----------|---------|
| `nurse_login` | `{ nurseId, method: 'whatsapp'|'sms' }` | Auth tracking |
| `nurse_view_assignments` | `{ nurseId, date, visitCount }` | Usage patterns |
| `nurse_start_visit` | `{ nurseId, visitId, visitType }` | Visit funnel |
| `nurse_record_vitals` | `{ nurseId, visitId, hasCritical: boolean }` | Clinical data |
| `nurse_mark_collected` | `{ nurseId, visitId, tubeCount, durationMin }` | Completion tracking |
| `nurse_mark_failed` | `{ nurseId, visitId, reason }` | Failure analysis |
| `nurse_report_late` | `{ nurseId, visitId, delayMinutes }` | SLA tracking |
| `nurse_deliver_to_lab` | `{ nurseId, labId, visitCount, tubeCount }` | Delivery tracking |
| `nurse_go_offline` | `{ nurseId, timestamp }` | Offline analysis |
| `nurse_come_online` | `{ nurseId, offlineDurationMin, pendingSyncCount }` | Sync analysis |
| `nurse_pwa_install` | `{ nurseId }` | Adoption tracking |

---

## Appendix A: Seed Data Reference

From BACKEND-PART3A.md §25:

| Entity | Test Data |
|--------|-----------|
| Test nurse phone | `+919999900004` |
| Test nurse email | `nurse@test.onlyou.life` |
| Qualification | GNM |
| Certification number | `KA-NURSE-TEST-001` |
| User role | `NURSE` |

## Appendix B: Known Cross-Document Discrepancies

| # | Discrepancy | Documents | Resolution |
|---|------------|-----------|------------|
| 1 | `maxDailyVisits` default: PORTAL-NURSE-FIXED.md §4 says 5, BACKEND-PART2A.md §13.1 says 8 | PORTAL-NURSE-FIXED.md vs BACKEND-PART2A.md | **Use 8** (backend authoritative) |
| 2 | Critical vitals thresholds differ: portal pulse >150/<40, backend pulse <50/>120 | PORTAL-NURSE-FIXED.md §9 vs BACKEND-PART2A.md §13.2 | Both are valid for their context (UI vs server escalation) |
| 3 | `AT_LAB` vs `DELIVERED_TO_LAB` status name | PORTAL-*.md vs onlyou-spec-resolved-v4.md | Use `AT_LAB` as canonical |
| 4 | Lab delivery 4-hour SLA missing from admin SLA config | PORTAL-NURSE-FIXED.md §30 vs PORTAL-ADMIN.md §30 | Must be added to admin SLA table |
| 5 | OTP verification attempts: some docs say 5, backend says 3 | Various vs BACKEND-PART1.md §4 | **Use 3** (backend authoritative) |
| 6 | OTP rate limit: 5 requests per hour | BACKEND-PART1.md §4 | Authoritative value |

## Appendix C: Cross-Document Reference Index

| Topic | Primary Document | Supporting Documents |
|-------|-----------------|---------------------|
| Nurse portal UI/UX | PORTAL-NURSE-FIXED.md | — |
| Nurse data model | BACKEND-PART2A.md §13.1 | PORTAL-NURSE-FIXED.md §5 |
| Nurse backend service | BACKEND-PART2A.md §13.2 | — |
| Nurse tRPC router | BACKEND-PART2A.md §13.3 | PORTAL-NURSE-FIXED.md §19 |
| Nurse CASL permissions | BACKEND-PART3A.md §22.4 | PORTAL-NURSE-FIXED.md §19, §21 |
| Lab order lifecycle | BACKEND-PART2A.md §12 | PORTAL-ADMIN.md §6–7 |
| Lab order assignNurse | BACKEND-PART2A.md §12.3 | PORTAL-ADMIN.md §8 |
| Admin nurse management | PORTAL-ADMIN.md §17–18 | — |
| Lab portal sample receipt | PORTAL-LAB-FIXED.md §6–7 | — |
| Patient lab order tracking | APP-PATIENT.md §17–18 | WORKFLOW-PATIENT.md §17–18 |
| Notification channels | BACKEND-PART2B.md §15 | PORTAL-NURSE-FIXED.md §17 |
| SSE real-time events | BACKEND-PART2B.md §16 | PORTAL-NURSE-FIXED.md §18 |
| SSE Redis channels | BACKEND-PART3A.md (Redis key patterns) | — |
| SLA configuration | PORTAL-ADMIN.md §30 | BACKEND-PART2B.md §18 |
| Auth & OTP | BACKEND-PART1.md §4 | PORTAL-NURSE-FIXED.md §2 |
| Offline & PWA | PORTAL-NURSE-FIXED.md §3, §20 | — |
| Audit logging | BACKEND-PART3A.md §22 | PORTAL-ADMIN.md §29 |
| Security & session mgmt | BACKEND-PART3A.md §22 | PORTAL-NURSE-FIXED.md §22 |
| File storage (certs) | BACKEND-PART3B.md §20 | BACKEND-PART2B.md |
| Deployment | BACKEND-PART3B.md §28 | PORTAL-NURSE-FIXED.md §28 |
| Seed data | BACKEND-PART3A.md §25 | PORTAL-NURSE-FIXED.md §29 |
| Status flow diagrams | BACKEND-PART3B.md §30.6 | PORTAL-NURSE-FIXED.md §30 |
| Vertical lab panels | VERTICAL-HAIR-LOSS.md, VERTICAL-WEIGHT.md, VERTICAL-PCOS-PART2.md | onlyou-spec-resolved-v4.md |

---

*End of WORKFLOW-NURSE.md — Nurse Workflow: Complete Operational Guide (Parts 1–3)*

*This document covers every nurse workflow from account creation to sample delivery, including all edge cases, cross-portal synchronization, offline behavior, and Phase 2 scaffolding. For the portal UI specification, see PORTAL-NURSE-FIXED.md. For the backend implementation, see BACKEND-PART2A.md §12–13. For admin management of nurses, see PORTAL-ADMIN.md §8, §17–18.*
