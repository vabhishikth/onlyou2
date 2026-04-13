# WORKFLOW-DOCTOR-PART3.md — Doctor Complete Workflow Reference (Part 3 of 3)

## Operational Workflows: Patient Management, Stats, Settings, Notifications, Real-Time, SLA, Security, Edge Cases & Analytics

> **Document type:** Detailed workflow documentation (every screen, action, decision, error, and edge case)
> **Perspective:** Doctor / Consulting Physician
> **Version:** 1.0
> **Last updated:** March 2026
> **Cross-references:** See WORKFLOW-DOCTOR-PART1.md for full cross-reference list.

---

## Table of Contents — Part 3

26. [My Patients — Directory Workflow](#26-my-patients--directory-workflow)
27. [Patient Detail View — Full History](#27-patient-detail-view--full-history)
28. [Stats Dashboard — Performance Metrics](#28-stats-dashboard--performance-metrics)
29. [Profile & Settings — Personal Information](#29-profile--settings--personal-information)
30. [Availability Management — Schedule & Time Off](#30-availability-management--schedule--time-off)
31. [Notification Preferences & Quiet Hours](#31-notification-preferences--quiet-hours)
32. [Canned Message Management](#32-canned-message-management)
33. [Real-Time System — SSE Architecture & Behavior](#33-real-time-system--sse-architecture--behavior)
34. [Notification System — Multi-Channel Delivery](#34-notification-system--multi-channel-delivery)
35. [Consultation Lifecycle — Complete Status Flow (Doctor View)](#35-consultation-lifecycle--complete-status-flow-doctor-view)
36. [Follow-Up Case Handling](#36-follow-up-case-handling)
37. [SLA Engine — Doctor Perspective](#37-sla-engine--doctor-perspective)
38. [Keyboard Shortcuts & Efficiency Features](#38-keyboard-shortcuts--efficiency-features)
39. [Responsive Design & Mobile Layout](#39-responsive-design--mobile-layout)
40. [Error States & Edge Cases](#40-error-states--edge-cases)
41. [Security, Privacy & Audit Logging](#41-security-privacy--audit-logging)
42. [Analytics Events — Doctor Portal](#42-analytics-events--doctor-portal)
43. [Cross-Reference Map & Document Dependencies](#43-cross-reference-map--document-dependencies)

---

## 26. My Patients — Directory Workflow

### 26.1 Accessing the Patient Directory

**Route:** `/patients`
**Sidebar:** 👥 Patients (no badge — no count shown)

**When the doctor navigates to `/patients`:**

1. Page loads with empty search bar + filter chips + sort dropdown
2. API call fires immediately:

```
trpc.doctor.patient.list.query({
  cursor: null,          // first page
  limit: 20,
  sortBy: 'lastVisit',  // default: most recent first
  sortOrder: 'desc',
  conditionFilter: null, // all conditions
  statusFilter: null     // all statuses
})
```

3. Response returns paginated patient list + `nextCursor` for infinite scroll
4. Cards render in list layout (no table — cards work better for varied content density)

### 26.2 Patient Card — What the Doctor Sees

Each card in the directory shows:

```
┌──────────────────────────────────────────────────────┐
│ Rahul Mehta, 28M, Mumbai                              │
│ 💇 Hair Loss | 🛡️ ED                                  │
│ Last visit: 15 Jan 2026 | Consultations: 3           │
│ Status: Treatment Active                              │
└──────────────────────────────────────────────────────┘
```

**Field breakdown:**

| Field | Source | Notes |
|-------|--------|-------|
| Name | `patient.firstName + patient.lastName` | Full name from profile |
| Age abbreviation | Calculated from `patient.dateOfBirth` | e.g., "28M" = 28 years, Male |
| City | `patient.city` | From patient profile |
| Condition badges | All verticals where this patient has consultations with this doctor | Color-coded: 💇 Hair = teal, 🛡️ ED = blue, ⚡ PE = purple, ⚖️ Weight = green, 🌸 PCOS = pink |
| Last visit | `MAX(consultation.createdAt)` across all this doctor's consultations for this patient | Date only, not time |
| Consultation count | `COUNT(consultations)` where `doctorId = currentDoctor` | Total across all verticals for this doctor |
| Status | Latest consultation's `status` (most active/urgent prioritized) | Shows the most actionable status, not just most recent |

**Status priority for display (highest → lowest):**
1. `REVIEWING` → "Under Review" (amber)
2. `ASSIGNED` → "Awaiting Review" (yellow)
3. `INFO_REQUESTED` → "Info Requested" (blue)
4. `FOLLOW_UP_DUE` → "Follow-Up Due" (orange)
5. `TREATMENT_ACTIVE` → "Treatment Active" (green)
6. `PRESCRIPTION_CREATED` → "Prescribed" (green)
7. `REFERRED` → "Referred" (gray)
8. `COMPLETED` → "Completed" (gray)
9. `CLOSED` → "Closed" (gray)

### 26.3 Search Workflow

**Step-by-step:**

1. Doctor clicks the search bar (or presses `/` if on page)
2. Types search query — debounced at 300ms (no API call until 300ms after last keystroke)
3. Search targets: `patient.firstName`, `patient.lastName`, last 4 digits of `patient.phone`
4. Results update in-place — existing filter/sort preserved alongside search
5. Clear search (X button or Esc) → returns to full list with previous filters

**Search API call:**
```
trpc.doctor.patient.list.query({
  search: 'Rahul',     // search term
  cursor: null,
  limit: 20,
  sortBy: 'lastVisit',
  conditionFilter: null,
  statusFilter: null
})
```

**Edge cases:**
- Empty search string → returns all patients (no filtering)
- Search with <2 characters → no API call (wait for at least 2 chars)
- No results → "No patients found matching '[query]'. Try a different search."
- Search by phone → only last 4 digits work (full phone number not searchable by doctor — privacy)

### 26.4 Filter & Sort Workflow

**Condition filter chips:**

```
[All] [💇 Hair Loss] [🛡️ ED] [⚡ PE] [⚖️ Weight] [🌸 PCOS]
```

- Single-select: clicking a condition chip filters to patients with consultations in that vertical
- "All" is default and selected on page load
- Chips are horizontally scrollable on mobile
- Clicking an already-selected chip deselects it → returns to "All"

**Status filter:**

Dropdown with options:
- All (default)
- Active Treatment (TREATMENT_ACTIVE)
- Awaiting Review (ASSIGNED + AI_COMPLETE)
- Under Review (REVIEWING)
- Completed (COMPLETED + CLOSED)
- Referred (REFERRED)

**Sort options:**

Dropdown with options:
- Last visit (default, descending — most recently seen first)
- Name A-Z
- Name Z-A
- Most consultations (patients with more consultations first)

**Filter + Sort combination:**
All filters and sorts combine — e.g., doctor can see "Hair Loss patients, Active Treatment, sorted by Most consultations." API call includes all parameters simultaneously.

### 26.5 Pagination — Infinite Scroll

- Initial load: 20 patients
- Scroll to bottom → "Load more" button appears (not auto-load — intentional to avoid accidental data loads on slow connections)
- Each "Load more" fetches next 20 using cursor-based pagination
- `nextCursor` = `null` when no more patients → "Load more" button hidden
- Total count shown: "Showing 1-20 of 47 patients"

### 26.6 Clicking a Patient Card

Doctor clicks a patient card → navigates to `/patients/[patientId]` → Patient Detail View (Section 27).

### 26.7 CASL Permission Enforcement

**Critical:** The doctor only sees patients who have at least one consultation assigned to them. This is enforced at both API and database query level:

```typescript
// CASL rule
can('read', 'Patient', { consultations: { some: { doctorId: user.id } } });

// Prisma translation
prisma.patient.findMany({
  where: {
    consultations: {
      some: { doctorId: currentDoctorId }
    }
  }
});
```

- Doctor CANNOT browse all platform patients
- Doctor CANNOT search for patients they haven't treated
- If a patient has consultations with multiple doctors, each doctor only sees their own consultations in that patient's detail view

### 26.8 Empty State

If the doctor has no patients yet (new doctor, no cases assigned):

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│         👥                                                  │
│                                                            │
│     No patients yet                                        │
│                                                            │
│     Your patient directory will populate as you            │
│     review cases. Head to your case queue to get           │
│     started.                                               │
│                                                            │
│     [Go to Cases →]                                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 27. Patient Detail View — Full History

### 27.1 Navigating to Patient Detail

**Route:** `/patients/[patientId]`
**Trigger:** Doctor clicks a patient card in the directory

**API call on navigation:**
```
trpc.doctor.patient.getDetail.query({
  patientId: 'uuid'
})
```

**Response includes:**
- Patient demographics (name, age, sex, city, phone — masked)
- Active subscriptions (vertical names only — NOT pricing)
- All consultations assigned to this doctor for this patient (reverse chronological)
- All prescriptions issued by this doctor for this patient
- All lab results for this doctor's consultations
- Progress photos grouped by consultation date

### 27.2 Page Layout

```
┌────────────────────────────────────────────────────────────┐
│  ← Back to Patients                                        │
│                                                            │
│  ─── PATIENT HEADER ────────────────────────────────────── │
│                                                            │
│  Rahul Mehta, 28M, Mumbai                                 │
│  Phone: +91 •••••• 4567                                   │
│  Active subscriptions: 💇 Hair Loss | 🛡️ ED               │
│  Total consultations: 3                                    │
│                                                            │
│  ─── CONSULTATION TIMELINE ──────────────────────────────  │
│  ─── PRESCRIPTIONS ──────────────────────────────────────  │
│  ─── LAB RESULTS ────────────────────────────────────────  │
│  ─── PROGRESS PHOTOS ────────────────────────────────────  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 27.3 Patient Header — Data Visibility

| Field | Value | Notes |
|-------|-------|-------|
| Full name | `Rahul Mehta` | From patient profile |
| Age + sex | `28M` | Calculated from DOB + sex field |
| City | `Mumbai` | From patient profile |
| Phone | `+91 •••••• 4567` | Masked — only last 4 digits visible to doctor |
| Active subscriptions | `💇 Hair Loss | 🛡️ ED` | Vertical names only — doctor does NOT see subscription tier (Monthly/Quarterly/6-Month) or pricing |
| Total consultations | `3` | Count of consultations with this doctor only |

**What the doctor CANNOT see on this page:**
- Full phone number
- Patient email
- Government ID photo
- Subscription pricing or plan tier
- Payment history or wallet balance
- Other doctors' consultations with this patient
- Consultations from verticals not assigned to this doctor

### 27.4 Consultation Timeline Section

Reverse chronological list of all consultations between this doctor and this patient:

```
┌─ 15 Apr 2026 ─────────────────────────────────────────┐
│ 💇 Hair Loss — 4-Week Follow-Up                        │
│ Status: Under Review                                    │
│ AI Attention: 🟢 Low                                    │
│ [Open Case Review]                                      │
├────────────────────────────────────────────────────────┤
│ 💇 Hair Loss — Initial Assessment                       │
│ Status: Treatment Active                                │
│ AI Attention: 🔴 High                                   │
│ Outcome: Prescribed — Minoxidil Only template           │
│ [Open Case Review]                                      │
├────────────────────────────────────────────────────────┤
│ 🛡️ ED — Initial Assessment                              │
│ Status: Closed                                          │
│ AI Attention: ⛔ Critical (nitrate flag)                │
│ Outcome: Refund requested — contraindication            │
│ [Open Case Review]                                      │
└────────────────────────────────────────────────────────┘
```

**Each consultation entry shows:**
- Condition icon + name
- Consultation type (Initial Assessment / 4-Week Follow-Up / 3-Month Follow-Up / 6-Month Follow-Up / Annual Review)
- Current status (color-coded badge)
- AI attention level (🟢 Low / 🟡 Medium / 🔴 High / ⛔ Critical)
- Outcome (only for completed consultations: Prescribed — template name, Referred, Closed, Refund)
- `[Open Case Review]` button → opens `/case/[consultationId]` in a new browser tab

### 27.5 Prescriptions Section

```
─── PRESCRIPTIONS ──────────────────────────────────────

• Rx #2026-0142 — 💇 Hair Loss — 15 Jan 2026    [View PDF]
• Rx #2026-0089 — 🛡️ ED — 10 Jan 2026           [View PDF] (Voided — refund processed)
```

- Lists all prescriptions issued by this doctor for this patient
- Sorted by date (most recent first)
- `[View PDF]` opens prescription PDF in a new tab (CloudFront signed URL, 15-minute expiry)
- Voided prescriptions shown with strikethrough or "(Voided)" label
- If no prescriptions: "No prescriptions issued yet."

### 27.6 Lab Results Section

```
─── LAB RESULTS ────────────────────────────────────────

• Extended Hair Panel — 20 Jan 2026                [View PDF]
  Abnormals: Ferritin ⚠️ (12 ng/mL, low), Vitamin D 🔴 (8 ng/mL, severely low)

• Basic Metabolic Panel — 15 Jan 2026              [View PDF]
  All values normal ✅
```

- Lists all lab results for consultations assigned to this doctor
- Abnormal values shown inline with severity indicators:
  - ⚠️ Amber: borderline/mildly abnormal
  - 🔴 Red: significantly abnormal
  - ✅ Green: all normal
- `[View PDF]` opens full lab results PDF
- If no lab results: "No lab results available."

### 27.7 Progress Photos Section

```
─── PROGRESS PHOTOS ────────────────────────────────────

💇 Hair Loss:
[15 Jan 2026 — 4 photos]  [12 Feb 2026 — 4 photos]  [15 Apr 2026 — 4 photos]
[Tap to compare]
```

- Photos grouped by consultation date and condition
- Thumbnail grid (4 photos per consultation for Hair Loss, 2 for Weight Management)
- Clicking a thumbnail → lightbox zoom (same as case review Photos tab)
- `[Tap to compare]` → opens side-by-side comparison mode:
  - Left: baseline photos (first consultation)
  - Right: dropdown selector for comparison date
  - Slider overlay for before/after comparison (same component used in case review Section 8.3 of PORTAL-DOCTOR.md)

### 27.8 Cross-Consultation Intelligence

The patient detail view is the only place where the doctor can see patterns across multiple consultations:

- **Trend detection:** Are symptoms improving across follow-ups?
- **Medication history:** What was prescribed before, what changed?
- **Lab trends:** Are lab values improving or worsening over time?
- **Photo comparison:** Visual progress across months of treatment

This view is essential for follow-up consultations — the doctor should open the patient detail view before reviewing a follow-up case to get the full longitudinal picture.

---

## 28. Stats Dashboard — Performance Metrics

### 28.1 Navigating to Stats

**Route:** `/stats`
**Sidebar:** 📊 Stats (no badge)

**API call on page load:**
```
trpc.doctor.stats.getDashboard.query({
  timeRange: 'this_month'   // default
})
```

### 28.2 Metrics Cards (Top Row)

Four summary cards displayed in a horizontal row:

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Cases Today  │ Cases Week   │ Cases Month  │ Avg Review   │
│     4        │     23       │     87       │  18 min      │
│  +2 from     │  +5 from     │  +12 from    │  -3 min from │
│  yesterday   │  last week   │  last month  │  last month  │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Metric calculations:**

| Metric | Formula | Notes |
|--------|---------|-------|
| Cases Today | `COUNT(consultations WHERE doctorId = me AND actionTakenAt >= today_start)` | Action = prescribe, refer, request info, close |
| Cases This Week | Same formula, `actionTakenAt >= week_start (Monday)` | Mon-Sun week |
| Cases This Month | Same formula, `actionTakenAt >= month_start` | Calendar month |
| Avg Review Time | `AVG(firstActionAt - firstReviewedAt)` for completed cases this month | Time from first viewing the case to taking first clinical action |

**Trend indicators:**
- Green ↑ = more cases than previous period (good for productivity)
- Red ↑ = higher avg review time than previous period (needs improvement)
- Green ↓ = lower avg review time (improvement)
- Gray → = no significant change (within 5% variance)

### 28.3 Cases by Condition (Donut Chart)

Interactive donut chart (Recharts or Chart.js) showing case distribution:

| Condition | Count | Percentage | Color |
|-----------|-------|------------|-------|
| Hair Loss | 35 | 40% | Teal |
| ED | 22 | 25% | Blue |
| PE | 10 | 11% | Purple |
| Weight | 12 | 14% | Green |
| PCOS | 8 | 9% | Pink |

**Interaction:**
- Hover on segment → tooltip with count + percentage
- Click a segment → filters the "Cases by Outcome" bar chart below to show only that condition
- Click again (or click center) → clears filter

### 28.4 Cases by Outcome (Bar Chart)

Horizontal bar chart showing action taken:

| Outcome | Count |
|---------|-------|
| Prescribed | 62 |
| Blood work ordered | 15 |
| Info requested | 12 |
| Referred | 5 |
| Closed (no treatment) | 3 |

- Interactive: clicking a bar filters to show condition breakdown within that outcome
- Cross-filters with the donut chart above (clicking Hair Loss in donut → bar chart shows only Hair Loss outcomes)

### 28.5 Time Range Selector

Dropdown above all charts, affecting all metrics and visualizations:

| Option | Range |
|--------|-------|
| Today | Current day (00:00 IST → now) |
| This Week | Mon 00:00 → now |
| This Month | 1st of month 00:00 → now |
| Last 3 Months | 3 calendar months back → now |
| Last 6 Months | 6 calendar months back → now |
| All Time | From first consultation to now |

Changing time range triggers a new API call with the selected range.

### 28.6 Review Time Distribution (Histogram)

Distribution of review times across cases:

```
Cases
  │
25│     ██
20│     ██  ██
15│  ██ ██  ██
10│  ██ ██  ██  ██
 5│  ██ ██  ██  ██  ██
  └──────────────────────
   0-5  5-10 10-15 15-20 20-30 30+ (minutes)
```

- Shows the doctor where most of their time goes
- Helps identify if they're spending too long on certain case types
- Not cross-filterable (standalone chart)

### 28.7 Patient Feedback Ratings (Phase 2)

For MVP, this section shows a placeholder:

```
┌────────────────────────────────────────────────────────────┐
│  ⭐ Patient Feedback                                       │
│                                                            │
│  Patient feedback ratings coming soon.                     │
│  You'll be able to see how patients rate their             │
│  consultation experience.                                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

When Phase 2 launches, this will show:
- Star rating (1-5) with bar distribution
- Optional text feedback (anonymized)
- Rating trends over time

### 28.8 Stats Page — What the Doctor CANNOT See

- Other doctors' statistics (never visible — admin-only)
- Platform-wide metrics
- Revenue or financial data
- Patient satisfaction comparisons across doctors

---

## 29. Profile & Settings — Personal Information

### 29.1 Navigating to Settings

**Route:** `/settings`
**Sidebar:** ⚙️ Settings (no badge)

The Settings page is a single scrollable page with multiple sections:
1. Personal Information
2. Availability Schedule
3. Notification Preferences
4. Canned Messages
5. Account Actions

### 29.2 Personal Information Display

```
┌────────────────────────────────────────────────────────────┐
│  ─── PERSONAL INFORMATION ───────────────────────────────  │
│                                                            │
│  Full Name:        Dr. Rajesh Patel         🔒            │
│  NMC Registration: NMC-2019-12345    [Verified ✅] 🔒     │
│  Phone:            +91 98765 04567   [Change]             │
│  Email:            dr.patel@email.com [Change]            │
│  City:             Mumbai, Maharashtra [Change]           │
│  Specializations:  Hair Loss, ED, PE         🔒           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 29.3 Edit Permissions — What the Doctor Can and Cannot Change

| Field | Editable? | How | Side Effects |
|-------|-----------|-----|-------------|
| Full Name | ❌ No | Admin-managed. 🔒 icon + tooltip: "Contact administrator to update." | — |
| NMC Registration | ❌ No | Admin-managed + verified. 🔒 icon. | — |
| Phone | ✅ Yes | [Change] → enters new phone → OTP verification flow → old phone replaced | New OTP sent to new number. Must verify before save. Auth uses new phone going forward. |
| Email | ✅ Yes | [Change] → inline text field → [Save] | Email not used for auth, only for notification delivery. No verification required. |
| City | ✅ Yes | [Change] → dropdown/autocomplete → [Save] | Admin notified: "Dr. Patel updated their city from Mumbai to Pune." City change may affect patient assignment routing. |
| Specializations | ❌ No | Admin assigns which verticals this doctor handles. 🔒 icon. | — |

### 29.4 Phone Change Workflow

1. Doctor clicks [Change] next to phone number
2. Modal appears: "Enter your new phone number"
3. Doctor enters new +91 number → clicks [Send OTP]
4. OTP sent via WhatsApp (primary) then SMS (fallback) to the **new** number
5. Doctor enters 6-digit OTP → clicks [Verify]
6. On success: phone number updated in database → toast: "Phone number updated successfully"
7. On failure (wrong OTP, expired): "Invalid or expired OTP. [Resend]"
8. After 3 failed attempts: "Too many attempts. Please try again in 15 minutes."

**Security consideration:** Old phone number is logged in audit trail. Admin is NOT notified for phone changes (doctor manages own contact info). However, if the doctor is locked out because they no longer have access to the old number, admin can manually update via admin portal.

---

## 30. Availability Management — Schedule & Time Off

### 30.1 Weekly Availability Schedule

```
┌────────────────────────────────────────────────────────────┐
│  ─── AVAILABILITY ───────────────────────────────────────  │
│                                                            │
│  When are you available to review cases?                   │
│                                                            │
│  Monday    [09:00 ▼] to [18:00 ▼]  ☑ Available           │
│  Tuesday   [09:00 ▼] to [18:00 ▼]  ☑ Available           │
│  Wednesday [09:00 ▼] to [18:00 ▼]  ☑ Available           │
│  Thursday  [09:00 ▼] to [18:00 ▼]  ☑ Available           │
│  Friday    [09:00 ▼] to [18:00 ▼]  ☑ Available           │
│  Saturday  [10:00 ▼] to [14:00 ▼]  ☑ Available           │
│  Sunday    ─────────────────────── ☐ Unavailable          │
│                                                            │
│  [Save Availability]                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Workflow:**

1. Each day has a checkbox (Available/Unavailable) and start/end time dropdowns
2. Time dropdowns offer 30-minute increments (06:00 → 23:30 IST)
3. Unchecking "Available" disables the time dropdowns for that day
4. Doctor clicks [Save Availability] → API call:

```
trpc.doctor.settings.updateAvailability.mutate({
  schedule: [
    { day: 'monday', available: true, startTime: '09:00', endTime: '18:00' },
    { day: 'tuesday', available: true, startTime: '09:00', endTime: '18:00' },
    // ... etc
    { day: 'sunday', available: false, startTime: null, endTime: null }
  ]
})
```

5. Toast: "Availability saved"

### 30.2 How Availability Affects the System

| System Component | Behavior |
|-----------------|----------|
| Case Assignment (Admin) | Unavailable doctors won't appear in the assignment dropdown for new cases during their off-hours |
| Auto-Assignment Engine | Skips unavailable doctors entirely — distributes to available doctors only |
| SLA Timer | SLA timer **pauses** during doctor's marked unavailable periods. Example: case assigned Friday 5pm, doctor unavailable Sat-Sun → SLA resumes Monday 9am. The 24-hour SLA clock doesn't tick during off-hours. |
| Case Queue | Doctor can still log in and view queue during off-hours — availability only affects **incoming** assignments |
| Existing Cases | Cases already assigned remain assigned — availability change does NOT trigger automatic reassignment |

### 30.3 Time Off Management

```
┌────────────────────────────────────────────────────────────┐
│  ─── TIME OFF ───────────────────────────────────────────  │
│                                                            │
│  [+ Add Time Off]                                         │
│  • 10 Feb 2026 – 12 Feb 2026 (3 days) — "Conference" [✕] │
│  • 24 Mar 2026 (1 day) — "Personal" [✕]                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Add Time Off workflow:**

1. Doctor clicks [+ Add Time Off]
2. Modal:
   - Start date: date picker (cannot select past dates)
   - End date: date picker (must be ≥ start date)
   - Reason (optional): free text, max 100 characters (shown only to admin, not to patients)
3. Doctor clicks [Save]
4. API call: `trpc.doctor.settings.addTimeOff.mutate({ startDate, endDate, reason })`
5. Time off entry appears in the list

**Warning on save if pending cases exist:**

```
┌──────────────────────────────────────────────────────────┐
│  ⚠️ You have 4 pending cases                              │
│                                                          │
│  Cases won't be reassigned automatically during your     │
│  time off. Please complete or notify your administrator  │
│  to reassign them.                                       │
│                                                          │
│  [Cancel]                    [Save Time Off Anyway]      │
└──────────────────────────────────────────────────────────┘
```

**Delete time off:** Doctor clicks [✕] next to an entry → confirmation prompt → `trpc.doctor.settings.deleteTimeOff.mutate({ timeOffId })` → entry removed

**During time off:**
- No new cases assigned (auto-assignment engine checks time off periods)
- Admin sees doctor marked as "On Time Off" in the doctor management panel
- Existing in-progress cases remain — doctor is expected to complete them before time off starts

---

## 31. Notification Preferences & Quiet Hours

### 31.1 Notification Settings Grid

```
┌────────────────────────────────────────────────────────────┐
│  ─── NOTIFICATIONS ──────────────────────────────────────  │
│                                                            │
│                           Push  WhatsApp  Email  SMS      │
│  New case assigned         ☑      ☑        ☐      ☐      │
│  Patient responded         ☑      ☑        ☐      ☐      │
│  Lab results ready         ☑      ☐        ☑      ☐      │
│  New message from patient  ☑      ☐        ☐      ☐      │
│  SLA warning (overdue)     ☑      ☑        ☑      ☐      │
│  Follow-up due             ☑      ☐        ☑      ☐      │
│                                                            │
│  [Save Preferences]                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 31.2 Channel Details

| Channel | Implementation | Doctor Action Required | Cost |
|---------|---------------|----------------------|------|
| Push (browser) | Web Push API via service worker | One-time browser permission grant on first enable | Free |
| WhatsApp | Gupshup API → doctor's registered phone | None (uses phone from profile) | Platform cost (~₹0.50/msg) |
| Email | Resend (MVP) / SES (scale) → doctor's registered email | None (uses email from profile) | Platform cost (~₹0.01/msg) |
| SMS | Gupshup SMS (primary) / MSG91 (fallback) | None (uses phone from profile) | Platform cost (~₹0.20/msg) |

### 31.3 SLA Warnings — Override Behavior

**SLA warnings are special:** They ALWAYS deliver via all enabled channels, regardless of quiet hours or other preferences. The doctor CANNOT disable SLA warnings for Push or WhatsApp — those checkboxes are locked to "on" with a tooltip: "SLA warnings cannot be disabled for this channel."

Only SMS for SLA is optional (opt-in) because of cost.

### 31.4 Quiet Hours

```
┌────────────────────────────────────────────────────────────┐
│  ─── QUIET HOURS ────────────────────────────────────────  │
│                                                            │
│  Don't send notifications between:                        │
│  [22:00 ▼] and [07:00 ▼]                                 │
│                                                            │
│  Exception: SLA warnings always delivered immediately.    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Quiet hours behavior:**

1. Push notifications: queued during quiet hours → delivered in batch at end of quiet period (e.g., 7:00 AM)
2. WhatsApp messages: queued in BullMQ with `delay` set to quiet hours end → delivered at start of next available period
3. Email: queued similarly → delivered at quiet hours end
4. SMS (SLA only): NOT affected by quiet hours — delivered immediately
5. In-portal (SSE): NOT affected by quiet hours — events still delivered (doctor may not be viewing the portal, but if they open it, events are there)

**Exception:** SLA warnings ALWAYS ignore quiet hours — delivered immediately on all enabled channels.

### 31.5 Browser Push Permission Flow

When a doctor enables Push notifications for the first time:

1. Doctor toggles Push "on" for any event
2. Browser permission prompt appears: "doctor.onlyou.life wants to send notifications"
3. **If allowed:** Service worker registered → push subscription saved to server → future events delivered via Web Push
4. **If denied:** Toggle reverts to off → toast: "Push notifications require browser permission. You can enable this in your browser settings."
5. **If dismissed:** Same as denied

The doctor portal registers a service worker (`/sw.js`) that handles push events even when the portal tab is not active. Push notifications show:
- Title: "Onlyou"
- Body: Event-specific text (e.g., "New case assigned")
- Icon: Onlyou logo
- Click action: Opens the portal in a new tab / focuses existing tab

---

## 32. Canned Message Management

### 32.1 Overview

Canned messages are pre-written quick-reply templates that doctors use when messaging patients (in the Messages tab of case review). They save time on frequently repeated communications.

There are two types:
1. **System defaults** — created by admin, shared across all doctors, cannot be edited/deleted by doctors
2. **Custom messages** — created by individual doctors, private to that doctor

### 32.2 System Default Canned Messages

| Label | Full Message |
|-------|-------------|
| "Results look good" | "Your results are looking good. Let's continue with the current treatment plan. I'll check in again at your next follow-up." |
| "Need more photos" | "I need a few more photos to properly assess your condition. Please upload clear, well-lit photos as described in the photo guide." |
| "Schedule follow-up" | "I'd like to schedule a follow-up to check on your progress. You'll receive a notification when it's time for your next check-in." |
| "Lab work required" | "I've ordered some blood work that will help me tailor your treatment. You'll receive instructions on how to complete the lab visit." |
| "Side effects normal" | "The side effects you're experiencing are within the expected range for your medication. They typically subside within 2-4 weeks. If they persist or worsen, please message me." |
| "Stop medication" | "Please stop taking {medication} immediately and message me to confirm. I'll review your case and recommend an alternative approach." |

System defaults cannot be edited or deleted by the doctor. They always appear first in the canned message selector within the chat interface.

### 32.3 Custom Message Management Workflow

**Viewing custom messages (in Settings):**

```
┌────────────────────────────────────────────────────────────┐
│  ─── CANNED MESSAGES ────────────────────────────────────  │
│                                                            │
│  System defaults (cannot edit):                           │
│  "Results look good" | "Need more photos" | "Schedule     │
│  follow-up" | "Lab work required" | "Side effects normal" │
│  | "Stop medication"                                      │
│                                                            │
│  Your custom messages:                                    │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 1. "Take with food"                           [✏️][🗑]│ │
│  │    "Please make sure to take your medication with    │ │
│  │    a full meal to avoid stomach discomfort."          │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ 2. "Minoxidil application tip"                [✏️][🗑]│ │
│  │    "For best results, apply minoxidil to completely  │ │
│  │    dry hair. Wet scalp reduces absorption."           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  [+ Add Custom Message]    (18/20 remaining)              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Adding a new custom message:**

1. Doctor clicks [+ Add Custom Message]
2. Modal opens with:
   - Label (max 30 characters) — shown as the chip/button text in the chat interface
   - Full message (max 500 characters) — the actual text sent to patient
   - Placeholder reference: `{patient_name}`, `{medication}` — auto-resolved at send time
3. Doctor fills in both fields → clicks [Save]
4. API call: `trpc.doctor.settings.createCannedMessage.mutate({ label, fullMessage })`
5. New message appears at bottom of custom list
6. Toast: "Custom message saved"

**Editing a custom message:**

1. Doctor clicks [✏️] edit icon on a message
2. Same modal as "Add" but pre-filled with existing values
3. Doctor modifies → clicks [Save]
4. API call: `trpc.doctor.settings.updateCannedMessage.mutate({ messageId, label, fullMessage })`

**Deleting a custom message:**

1. Doctor clicks [🗑] delete icon
2. Confirmation prompt: "Delete this custom message? This can't be undone."
3. Doctor confirms → API call: `trpc.doctor.settings.deleteCannedMessage.mutate({ messageId })`
4. Message removed from list

### 32.4 Constraints

- Maximum 20 custom canned messages per doctor (system defaults don't count against this limit)
- Label: max 30 characters
- Full message: max 500 characters
- Supported placeholders: `{patient_name}`, `{medication}` (resolved from current consultation context at send time)
- If placeholder can't be resolved (e.g., no medication for this consultation): placeholder text is removed (replaced with empty string)

### 32.5 Using Canned Messages in Chat

When the doctor is in the Messages tab of case review (Section 16 of WORKFLOW-DOCTOR-PART2.md):

1. Message input area shows a row of canned message chips above the text input
2. Chips displayed: system defaults first (gray), then custom messages (blue)
3. Doctor clicks a chip → full message text populates the input field
4. Doctor can edit the pre-filled text before sending
5. Send → message is delivered with the final text (no tracking that it started from canned)
6. Analytics event: `doctor.message.canned_used` records which canned label was used and whether the text was modified before sending

---

## 33. Real-Time System — SSE Architecture & Behavior

### 33.1 SSE Connection Lifecycle

**Connection established on login:**

```
Login success → JWT cookie set → SSE connection initiated
                                        │
                                        ▼
                              EventSource('/api/sse/doctor')
                                        │
                                        ▼
                              Server authenticates via HttpOnly cookie
                                        │
                                        ▼
                              Subscribes to Redis channel: doctor:{doctorId}
                                        │
                                        ▼
                              Connection held open (long-lived HTTP stream)
                                        │
                                  ┌─────┴─────┐
                                  ▼           ▼
                           Events flow    Heartbeat every 30s
                           when available  (keeps connection alive)
```

### 33.2 SSE Events the Doctor Receives

| Event Type | Payload | What Triggers It | UI Response |
|-----------|---------|-----------------|-------------|
| `case.assigned` | `{ consultationId, patientName, condition, attentionLevel }` | Admin assigns case to this doctor, or doctor self-assigns by opening an unassigned case | Toast: "New case: [condition] — [patientName]" + sidebar badge count +1 |
| `case.patient_responded` | `{ consultationId, patientName }` | Patient replies to an info request | Toast: "[patientName] responded to your request" + case card update |
| `case.lab_results_ready` | `{ consultationId, patientName, panelName }` | Lab uploads results for a consultation assigned to this doctor | Toast: "Lab results ready: [panelName]" + "Lab Ready" indicator on case card |
| `case.message_received` | `{ consultationId, patientName, messagePreview }` | Patient sends a message in a consultation assigned to this doctor | If case open: append message to chat. If not: blue dot on case card + toast. |
| `case.status_changed` | `{ consultationId, oldStatus, newStatus }` | System or admin changes a case's status | Update case card badge to new status |
| `case.reassigned` | `{ consultationId, newDoctorId }` | Admin reassigns the case to another doctor | Toast: "Case reassigned to Dr. [Name]" + case removed from queue |
| `sla.warning` | `{ consultationId, patientName, threshold, hoursOverdue }` | SLA check job detects overdue case | Red SLA badge on case card + persistent toast (doesn't auto-dismiss) |

### 33.3 SSE Buffer & Reconnection Strategy

**Buffer size:** 500 events per user per channel (Redis Pub/Sub buffer)

**Reconnection behavior when SSE drops:**

```
SSE connection drops
        │
        ▼
Auto-reconnect attempt (exponential backoff)
1s → 2s → 4s → 8s → 16s → 30s (max interval)
        │
        ├── Success → fetch missed events via Last-Event-ID header
        │                │
        │                ├── Gap ≤ 500 events → replay from buffer
        │                └── Gap > 500 events → full API refresh of case queue
        │
        └── Failure after 60s total → show amber banner
                     │
                     ▼
            "🔌 Real-time updates paused. Checking connection..."
            Banner persists until SSE reconnects
```

### 33.4 Browser Tab Behavior

| Scenario | SSE Behavior | Data Freshness |
|----------|-------------|----------------|
| Tab active | Events delivered immediately, UI updates in real-time | Always fresh |
| Tab backgrounded (<5 min) | SSE connection maintained, events buffered by browser | Delivered on tab focus |
| Tab backgrounded (>5 min) | SSE connection maintained but browser may throttle | Events batch-delivered on focus |
| Tab closed completely | SSE disconnects | Next session: fresh login → full data load via API |
| Browser/laptop sleep | SSE disconnects (OS kills connection) | On wake: auto-reconnect → missed events via buffer → if gap too large: full refresh |

### 33.5 Offline Banner

When SSE fails for >60 seconds:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🔌 Real-time updates paused. Checking connection...                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Amber background, fixed to top of main content area (below header)
- Does NOT block interaction — doctor can still browse stale data, review cases, etc.
- No auto-poll (to avoid hammering server during outage)
- On reconnect: banner disappears + silent data refresh for the currently viewed page

---

## 34. Notification System — Multi-Channel Delivery

### 34.1 Delivery Architecture

```
                    Event occurs (e.g., new case assigned)
                              │
                              ▼
                    NotificationService.send({
                      recipientId: doctorId,
                      event: 'case.assigned',
                      data: { ... }
                    })
                              │
                              ▼
                    Check doctor's notification preferences
                              │
                    ┌─────────┼─────────┬──────────┬──────────┐
                    ▼         ▼         ▼          ▼          ▼
              In-Portal    Push    WhatsApp     Email        SMS
              (SSE)     (Web Push) (Gupshup)  (Resend/SES) (Gupshup)
                │         │         │           │           │
                │    Check:    Check:      Check:      Check:
                │    enabled?  enabled?    enabled?    enabled?
                │    quiet hr? quiet hr?   quiet hr?   quiet hr?
                │         │         │           │           │
                ▼         ▼         ▼           ▼           ▼
            Always    If pass:   If pass:   If pass:   If pass:
            deliver   deliver    queue in   queue in   deliver
                      now        BullMQ     BullMQ     now (SLA only)
```

### 34.2 Channel-Event Matrix (Expanded)

| Event | In-Portal (SSE) | Browser Push | WhatsApp | Email | SMS |
|-------|-----------------|-------------|----------|-------|-----|
| New case assigned | ✅ Always | ✅ If enabled | ✅ If enabled | ❌ Never | ❌ Never |
| Patient responded to info request | ✅ Always | ✅ If enabled | ✅ If enabled | ❌ Never | ❌ Never |
| Lab results ready | ✅ Always | ✅ If enabled | ❌ Never | ✅ If enabled | ❌ Never |
| New patient message | ✅ Always | ✅ If enabled | ❌ Never | ❌ Never | ❌ Never |
| SLA warning (case overdue) | ✅ Always | ✅ **Always** (override) | ✅ **Always** (override) | ✅ **Always** (override) | ✅ If enabled |
| Follow-up due | ✅ Always | ✅ If enabled | ❌ Never | ✅ If enabled | ❌ Never |
| Case reassigned away | ✅ Always | ✅ If enabled | ❌ Never | ❌ Never | ❌ Never |

### 34.3 WhatsApp Message Templates (Doctor)

All doctor WhatsApp notifications follow the privacy-first format — **no patient names, conditions, or clinical details** in the message body:

| Event | WhatsApp Message |
|-------|-----------------|
| New case assigned | "Onlyou: You have a new case to review. Open your dashboard: doctor.onlyou.life" |
| Patient responded | "Onlyou: A patient has responded to your request. Check your dashboard: doctor.onlyou.life" |
| SLA warning | "Onlyou: ⚠️ URGENT: A case requires your attention — review overdue. doctor.onlyou.life" |

### 34.4 Daily Digest Email

If the doctor has email notifications enabled, they receive a daily digest at 8:00 AM IST:

**Subject:** "Onlyou — Your Daily Case Summary"

**Content:**
- Pending case count (new + awaiting review + info requested + lab results ready + follow-ups due)
- SLA warnings (count + specific case IDs if any)
- Yesterday's activity summary (cases reviewed, prescriptions issued, avg review time)
- Link to dashboard

**Delivery:** BullMQ cron job (`0 8 * * *` IST) → queries pending cases for each doctor → generates personalized email → sends via Resend/SES

**Opt-out:** Doctor can disable email notifications entirely in Settings → no digest sent

### 34.5 In-Portal Notification Dropdown

The notification bell (🔔) in the sidebar shows:

```
🔔 (3)    ← unread count badge (red circle)

┌──────────────────────────────────────────────────────────┐
│  Notifications                              [Mark all read]│
│                                                          │
│  🔴 NEW CASE — Hair Loss — 5 min ago                     │
│     A new case has been assigned to you.                 │
│                                                          │
│  🔵 PATIENT RESPONDED — 12 min ago                       │
│     Rahul Mehta responded to your info request.          │
│                                                          │
│  🟢 LAB RESULTS — 1 hour ago                             │
│     Extended Hair Panel results are ready for review.    │
│                                                          │
│  ── Earlier ──────────────────────────────────────────── │
│                                                          │
│  ⚪ SLA WARNING — resolved — Yesterday                    │
│     Case #CONS-2026-0189 was reviewed on time.           │
│                                                          │
│  [View all notifications]                                │
└──────────────────────────────────────────────────────────┘
```

**Behavior:**
- Dropdown shows last 20 notifications
- Unread notifications have colored dots (🔴 new case, 🔵 patient action, 🟢 lab, 🟡 follow-up, 🔴 SLA)
- Clicking a notification → navigates to the relevant case review page
- [Mark all read] → clears unread count
- [View all notifications] → navigates to `/notifications` (full-page list, paginated, searchable — stretch goal for MVP)

---

## 35. Consultation Lifecycle — Complete Status Flow (Doctor View)

### 35.1 Visual Status Flow

```
    SUBMITTED          ← Patient submits assessment (doctor does NOT see this status)
        │
        ▼
    AI_PROCESSING      ← BullMQ job: Claude API call (1-3 min) (doctor does NOT see this)
        │
        ▼
    AI_COMPLETE        ← AI assessment ready → case appears in doctor's queue ⭐
        │
        ▼ (doctor opens case or admin assigns)
    ASSIGNED           ← Doctor's name attached to case → assignedAt timestamp set
        │
        ▼ (30 seconds on page OR first clinical action)
    REVIEWING          ← Doctor actively reviewing → firstReviewedAt timestamp set
        │
        ├──→ INFO_REQUESTED    ← Doctor clicks "Request More Info" → patient notified
        │         │
        │         ▼ (patient responds with additional data)
        │    REVIEWING          ← Case returns to reviewing → doctor re-notified
        │
        ├──→ PRESCRIPTION_CREATED  ← Doctor submits prescription → PDF generated
        │         │
        │         ▼ (medication shipped and delivered)
        │    TREATMENT_ACTIVE      ← Day counter starts for follow-up scheduling
        │         │
        │         ▼ (follow-up timer fires: 4 weeks / 3 months / 6 months / 12 months)
        │    FOLLOW_UP_DUE         ← Patient notified to complete follow-up questionnaire
        │
        ├──→ REFERRED              ← Doctor refers to specialist / partner clinic
        │
        └──→ COMPLETED / CLOSED    ← Doctor closes case (no treatment needed or case resolved)
```

### 35.2 Status Transitions Table

| Current Status | Trigger | New Status | Who Triggers | Side Effects |
|---------------|---------|------------|-------------|--------------|
| `SUBMITTED` | System queues AI job | `AI_PROCESSING` | System (auto) | BullMQ job created |
| `AI_PROCESSING` | AI assessment completes | `AI_COMPLETE` | System (auto) | Case enters doctor queue, eligible for assignment |
| `AI_PROCESSING` | AI assessment fails | `AI_FAILED` | System (auto) | Admin notified, retry available |
| `AI_COMPLETE` | Doctor opens case review page | `ASSIGNED` | Doctor (auto on page load) | `assignedAt` timestamp set, doctor notified |
| `AI_COMPLETE` | Admin manually assigns to a doctor | `ASSIGNED` | Admin (manual) | Doctor notified via SSE + preferences |
| `ASSIGNED` | 30 seconds on page OR first action | `REVIEWING` | System (auto) | `firstReviewedAt` timestamp set |
| `REVIEWING` | Doctor clicks "Request More Info" | `INFO_REQUESTED` | Doctor (manual) | Message sent to patient, patient notified via all channels |
| `INFO_REQUESTED` | Patient responds with data | `REVIEWING` | System (auto on patient response) | Doctor notified, case returns to review state |
| `REVIEWING` | Doctor submits prescription | `PRESCRIPTION_CREATED` | Doctor (manual) | PDF generated, order record created, patient + admin + pharmacy notified |
| `REVIEWING` | Doctor submits referral (close=true) | `REFERRED` | Doctor (manual) | Patient notified, referral record created, admin notified |
| `REVIEWING` | Doctor submits referral (close=false) | `REVIEWING` (unchanged) | Doctor (manual) | Referral record created but case stays open |
| `REVIEWING` | Doctor clicks "Close Case" | `COMPLETED` | Doctor (manual) | Patient notified, case marked complete |
| `PRESCRIPTION_CREATED` | Medication delivered + patient starts treatment | `TREATMENT_ACTIVE` | System (auto on delivery confirmation) | Day counter starts for follow-up scheduling |
| `TREATMENT_ACTIVE` | Follow-up timer fires | `FOLLOW_UP_DUE` | System (BullMQ scheduled job) | Patient notified to complete follow-up check-in |

### 35.3 Status Enum Cross-Reference (Canonical Values)

> **⚠️ CRITICAL for implementation:** Different documents use slightly different status names. These are the **canonical enum values** to use in code:

| Canonical (use this) | Also referred to as | Found in |
|---------------------|---------------------|----------|
| `AI_COMPLETE` | `PENDING_REVIEW` | ARCHITECTURE.md, BACKEND-PART1.md |
| `REVIEWING` | `IN_REVIEW` | ARCHITECTURE.md, BACKEND-PART1.md |
| `PRESCRIPTION_CREATED` | `PRESCRIBED` | BACKEND-PART1.md |
| `INFO_REQUESTED` | `MORE_INFO_REQUESTED` | BACKEND-PART1.md |
| `COMPLETED` | `CLOSED` | Various (use `COMPLETED` for normal close, reserve `CLOSED` for admin-forced close if needed) |

**Video consultation status (parallel track, muted for MVP):**
Each consultation has a `videoStatus` field: `NOT_REQUIRED | PENDING | SCHEDULED | IN_PROGRESS | COMPLETED | SKIPPED_TESTING`. For MVP, this is auto-set to `SKIPPED_TESTING` immediately. No video step appears in the doctor workflow. When `VIDEO_CONSULTATION_ENABLED` feature flag is turned on (Phase 2), the prescription builder will be locked behind `videoStatus = COMPLETED` for Schedule H drugs.

---

## 36. Follow-Up Case Handling

### 36.1 Follow-Up Schedule

Follow-ups are system-generated consultations that appear in the doctor's queue at predetermined intervals after treatment starts:

| Time Point | Type | Questionnaire | Photos | Purpose |
|-----------|------|--------------|--------|---------|
| 4 weeks | Side Effects Check | 10 questions (abbreviated) | No | Assess side effects, medication compliance, early response |
| 3 months | Progress Review | 10 questions + 4 photos | Yes (if applicable) | Assess treatment progress, photo comparison |
| 6 months | Full Assessment | 15 questions + 4 photos | Yes (if applicable) | Comprehensive reassessment, lab re-order if needed |
| 12 months | Annual Review | Full questionnaire + photos | Yes (if applicable) | Annual review, treatment plan reassessment |

### 36.2 How Follow-Ups Appear in the Queue

Follow-up cases enter the queue identically to new cases, but with distinguishing markers:

| Feature | New Case | Follow-Up Case |
|---------|----------|---------------|
| Badge | "New" (green) | "Follow-Up" (blue) + "4-Week" / "3-Month" / "6-Month" / "Annual" |
| AI Assessment | Standard assessment | Includes **delta analysis** — comparison with initial/previous assessment |
| Photos tab | Standard photo grid | **Comparison mode** — baseline vs. follow-up side-by-side (auto-enabled) |
| Questionnaire tab | Standard display | **"Show changes only" toggle** enabled by default — highlights changed answers |
| Prescription builder | Empty (start fresh) | **Pre-populated** with previous prescription's medications |

### 36.3 Follow-Up AI Delta Analysis

The AI assessment for follow-ups includes a special "Progress Analysis" section:

```
┌────────────────────────────────────────────────────┐
│  📊 PROGRESS ANALYSIS (vs. Initial Assessment)     │
│                                                    │
│  Overall trajectory: ✅ Improving                  │
│                                                    │
│  Changes detected:                                 │
│  • Symptom severity: Moderate → Mild (improved)    │
│  • Self-reported satisfaction: 3/5 → 4/5 (improved)│
│  • Side effects: None reported (stable)            │
│  • Medication compliance: Good (reported)          │
│  • BMI: 28.3 → 27.1 (improved) [Weight vertical]  │
│                                                    │
│  RECOMMENDATION:                                   │
│  "Patient showing positive response to current     │
│   protocol. Recommend continuing current regimen.  │
│   Consider adding oral supplement if lab results   │
│   show persistent vitamin D deficiency."           │
│                                                    │
│  TRAJECTORY CLASSIFICATION:                        │
│  ✅ Improving | ➡️ Stable | ⚠️ Not improving |     │
│  🔴 Worsening | ⛔ Adverse reaction detected        │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 36.4 Follow-Up Prescription Workflow

When the doctor opens the Prescription Builder for a follow-up case:

1. Template selector shows "Continue Current" as the default option (pre-selected)
2. All medications from the previous prescription are auto-populated:
   - Same medications, same dosages, same durations
   - Each medication row shows: "(continued from previous)" label
3. Doctor can:
   - Keep everything as-is → submit (quick re-prescription)
   - Adjust dosages (e.g., increase minoxidil from 2% to 5%)
   - Add new medications (e.g., add biotin supplement)
   - Remove medications (e.g., stop finasteride due to side effects)
   - Change template entirely (e.g., switch from "Minoxidil Only" to "Combination Therapy")
4. If any changes from previous prescription: counseling notes should explain the change
5. Submit → new prescription PDF generated → supersedes previous prescription

### 36.5 Follow-Up Photo Comparison Workflow

For follow-up consultations with photos (3-month, 6-month, annual):

1. Photos tab automatically opens in comparison mode
2. Left panel: baseline photos (from initial consultation)
3. Right panel: current follow-up photos
4. Doctor can switch the comparison target via dropdown (e.g., compare 6-month vs 3-month instead of vs initial)
5. Slider overlay: drag left/right to compare before/after at the same angle
6. Photo positions labeled: Crown/Vertex, Hairline, Left Temple, Right Temple (for Hair Loss)

### 36.6 Follow-Up Timer Mechanism

Follow-up timers are BullMQ delayed jobs created when treatment starts:

```
// When prescription is created and treatment status becomes TREATMENT_ACTIVE:
await bullMQ.addJob('schedule-follow-up', {
  consultationId: 'uuid',
  patientId: 'uuid',
  doctorId: 'uuid',
  condition: 'HAIR_LOSS',
  followUpType: '4_WEEK',
  scheduledDate: addWeeks(treatmentStartDate, 4)
}, {
  delay: differenceInMilliseconds(addWeeks(treatmentStartDate, 4), new Date())
});
```

When the timer fires:
1. System creates a new follow-up consultation linked to the parent consultation
2. Patient receives notification: "Time for your [4-week] check-in! Complete your follow-up questionnaire."
3. Patient completes follow-up questionnaire → AI processes it (with delta analysis) → case appears in doctor's queue
4. Doctor reviews → takes action → cycle continues

---

## 37. SLA Engine — Doctor Perspective

### 37.1 SLA Thresholds

| SLA | Measured From | Threshold | What Happens at Breach |
|-----|-------------|-----------|----------------------|
| First Review | `AI_COMPLETE` timestamp → case not yet `ASSIGNED` | 24 hours | Notification to doctor + admin |
| Case Action | `ASSIGNED` timestamp → no action taken (no status change beyond REVIEWING) | 48 hours | Notification to doctor + admin; admin may reassign |
| Info Response Review | Patient responds to INFO_REQUESTED → doctor hasn't re-reviewed | 72 hours | Notification to doctor |
| Lab Results Review | Lab results uploaded → doctor hasn't opened the case | 24 hours | Notification to doctor + admin |

### 37.2 SLA Timer Behavior

**SLA check runs every 15 minutes** via BullMQ repeatable job: `sla-check`

```
Every 15 minutes:
    │
    ▼
Query all consultations where:
  - status IN (AI_COMPLETE, ASSIGNED, REVIEWING, INFO_REQUESTED)
  - time elapsed > SLA threshold
  - NOT already flagged as SLA-breached for this threshold
    │
    ▼
For each breached case:
  1. Update consultation: slaBreachedAt = now()
  2. Send notifications to doctor (all channels, overrides quiet hours)
  3. Send notifications to admin
  4. Mark as "SLA breach" so it's not re-flagged next run
```

### 37.3 SLA Timer & Availability Interaction

**SLA timer pauses during doctor's marked unavailable periods:**

Example:
- Case assigned Friday 5:00 PM
- Doctor marked unavailable Saturday-Sunday
- SLA: 24 hours for first review

**Calculation:**
- Friday 5pm → Friday 6pm = 1 hour elapsed
- Saturday 12:00am → Sunday 11:59pm = paused (not counted)
- Monday 9:00am → Monday 5:00pm = 8 hours elapsed
- Total: 9 hours elapsed → well within 24-hour SLA

The SLA engine queries the doctor's availability schedule when calculating elapsed time, subtracting unavailable periods.

### 37.4 SLA Visual Indicators on Case Cards

| Indicator | Meaning | Appearance |
|-----------|---------|------------|
| 🟢 No indicator | Well within SLA | No badge |
| 🟡 Amber clock | Within 2 hours of SLA breach | Small amber clock icon on case card |
| 🔴 Red clock | SLA breached | Red clock icon + red border on case card |

**Sorting:** Cases with SLA warnings are auto-sorted to the top of the queue when "Highest attention" sort is active.

---

## 38. Keyboard Shortcuts & Efficiency Features

### 38.1 Global Shortcuts (Available on All Pages)

| Shortcut | Action | Notes |
|----------|--------|-------|
| `G then C` | Navigate to Cases (queue) | Two-key sequence: press G, then C |
| `G then P` | Navigate to Patients | |
| `G then S` | Navigate to Stats | |
| `G then T` | Navigate to Settings | |
| `/` | Focus search bar | Works on Case Queue and Patients pages |
| `Esc` | Close current modal or panel | Closes modals, prescription builder, lightbox, etc. |
| `?` | Show keyboard shortcuts overlay | Lists all available shortcuts for current page |

### 38.2 Case Review Shortcuts (Only on `/case/[id]`)

| Shortcut | Action | Notes |
|----------|--------|-------|
| `1` | Switch to AI Assessment tab | Number keys for tab switching |
| `2` | Switch to Questionnaire tab | |
| `3` | Switch to Photos tab | |
| `4` | Switch to Lab Results tab | |
| `5` | Switch to Messages tab | |
| `P` | Open Prescription Builder | Launches the prescription modal |
| `L` | Open Lab Order form | Launches the lab order modal |
| `M` | Focus message input | Switches to Messages tab and focuses the text input |
| `←` (Left arrow) | Previous case in queue | Navigates to the previous case without returning to queue |
| `→` (Right arrow) | Next case in queue | Navigates to the next case without returning to queue |
| `Backspace` | Return to case queue | Navigate back to `/` |

### 38.3 Shortcut Overlay

Pressing `?` opens a centered modal listing all available shortcuts for the current page context. The modal also includes:

- Toggle: "Enable keyboard shortcuts" (default: on)
- Stored in `localStorage` — persists across sessions
- When disabled, all shortcuts except `?` are deactivated

### 38.4 Other Efficiency Features

- **Quick-case navigation:** `←` / `→` arrow keys in case review to move between queue items without returning to the queue
- **Canned message chips:** One-click message composition (Section 32.5)
- **Template prescription:** Pre-built prescription templates reduce 90% of prescription time
- **Auto-save drafts:** If doctor starts a prescription but navigates away, draft is saved in session storage. On return, prompt: "You have an unsaved prescription draft. [Resume] [Discard]"
- **Keyboard-first workflow:** A doctor can review a case entirely via keyboard: `1` (AI tab) → `2` (questionnaire) → `3` (photos) → `P` (prescribe) → Tab through fields → Enter (submit)

---

## 39. Responsive Design & Mobile Layout

### 39.1 Breakpoints

| Breakpoint | Layout Name | Key Adaptations |
|-----------|-------------|-----------------|
| ≥1440px | Wide Desktop | Full 3-panel case review, expanded sidebar (240px), all features visible |
| 1024–1439px | Desktop | 3-panel case review (narrower right panel), collapsible sidebar |
| 768–1023px | Tablet | 2-panel case review (left+center), right panel becomes bottom sheet. Bottom nav replaces sidebar. |
| <768px | Mobile | Single-column layout, bottom nav, all panels as modals/sheets |

### 39.2 Desktop vs. Mobile Navigation

**Desktop (≥1024px):**
```
┌──────────┬───────────────────────────────────────────────┐
│ SIDEBAR  │              MAIN CONTENT                     │
│ (240px)  │                                               │
│          │                                               │
│ 📋 Cases │                                               │
│ 👥 Patients│                                              │
│ 📊 Stats │                                               │
│ ⚙️ Settings│                                              │
│ 🔔 (2)   │                                               │
│ Dr.Patel │                                               │
└──────────┴───────────────────────────────────────────────┘
```

**Mobile (<768px):**
```
┌──────────────────────────────────────────────────────────┐
│  Dr. Patel                                    🔔 (2)     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                    MAIN CONTENT                          │
│                                                          │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│ 📋 Cases │ 👥 Patients│ 📊 Stats │ ⚙️ Settings│              │
└──────────┴──────────┴──────────┴──────────┴──────────────┘
```

### 39.3 Case Queue (Mobile Adaptation)

- **Layout:** Card list (not table) — each card shows case summary in stacked format
- **Swipe:** Right swipe on card → quick action menu (flag priority, etc.)
- **Pull to refresh:** Pull down to reload case queue
- **Filters:** Horizontally scrollable chip row
- **Search:** Full-width search bar at top, collapses to icon when scrolled down

### 39.4 Case Review (Mobile Adaptation)

- **Layout:** Single-column scroll instead of 3-panel grid
- **Patient summary:** Collapsed card at top (tap to expand)
- **Clinical tabs:** Horizontal scrollable tab bar pinned at top
- **Actions:** Sticky bottom bar:
  ```
  ┌────────┬────────┬────────┬────────┐
  │ 💊 Rx  │ 🔬 Labs│ 💬 Msg │ ⋯ More │
  └────────┴────────┴────────┴────────┘
  ```
- **"More" menu:** Opens action sheet with: Refer, Request Refund, Close Case

### 39.5 Prescription Builder (Mobile Adaptation)

- Full-screen page (not modal overlay)
- Template selector: full-width dropdown (not inline pills)
- Medication rows: vertical card format (each medication as a card with stacked fields)
- Sticky bottom bar: `[Preview]` `[Submit]`

### 39.6 Touch Optimizations

- All interactive targets: minimum 44×44px (Apple HIG guideline)
- Swipe gestures: case queue card navigation
- Long-press: patient name → copy to clipboard
- Pinch-to-zoom: photos in lightbox
- Double-tap: photos to zoom 2x

---

## 40. Error States & Edge Cases

### 40.1 Page-Level Errors

| HTTP Error | UI Response | Doctor Action |
|-----------|------------|---------------|
| 401 Unauthorized | Silent token refresh attempt → if fails: redirect to `/login` + toast: "Session expired. Please sign in again." | Doctor re-enters OTP |
| 403 Forbidden | Full-page error: "You don't have permission to view this page. Contact your administrator." + `[Go to Cases]` button | Contact admin |
| 404 Not Found | Full-page error: "This case does not exist or has been removed." + `[Back to Cases]` button | Return to queue |
| 500 Server Error | Full-page error: "Something went wrong on our end. Please try again in a moment." + `[Retry]` button | Click retry |
| Network Error (offline) | "Unable to connect. Please check your internet connection." + `[Retry]` button. Stale data remains visible. | Check internet + retry |

### 40.2 Component-Level Errors

| Component | Error Behavior | Impact on Other Components |
|-----------|---------------|---------------------------|
| AI Assessment fails to load | "Unable to load AI assessment. [Retry]" within the tab | Other tabs still functional |
| Photos fail to load | Placeholder with broken image icon per photo: "Photo unavailable. [Retry]" | Other photos still shown |
| PDF viewer fails | "Unable to display PDF. [Download] [Retry]" — direct download link as fallback | No impact |
| Chat (Messages tab) fails | "Unable to load messages. [Retry]" — message input still visible for composing | Input usable but messages hidden |
| SSE disconnects | Amber banner (Section 33.5) — portal remains fully functional with stale data | All features work, just not real-time |
| Stats charts fail to render | "Unable to load chart. [Retry]" — metrics cards still shown if their data loaded | Other charts still display |

### 40.3 Concurrent Access Edge Cases

| Scenario | System Behavior | Doctor Experience |
|----------|----------------|-------------------|
| Two doctors open the same unassigned case simultaneously | First to load gets auto-assigned (`ASSIGNED` status + `doctorId` set). Second doctor's page load finds case already assigned. | Second doctor sees: "This case was just assigned to Dr. [Name]. [View only] / [Request reassignment]" |
| Doctor opens case, steps away; admin reassigns the case to another doctor | SSE event `case.reassigned` sent to original doctor | On next interaction: modal: "This case has been reassigned to Dr. [Name]. [OK]" → redirects to queue |
| Doctor is in the middle of writing a prescription; admin closes the consultation | Prescription submit API call returns error (status mismatch) | Error modal: "This consultation's status has changed. Please refresh and review." → [Refresh] button reloads case |
| Doctor's account is deactivated by admin while logged in | Next API call returns 403 (role check fails) | Redirect to login → "Your account has been deactivated. Contact your administrator." |
| Doctor opens a patient detail; patient deletes their account | Patient deletion triggers anonymization job (DPDPA compliance) | Case marked as `PATIENT_DELETED`. Doctor sees: "This patient's account has been deleted per their request. Case data retained for medical records per DPDPA retention policy." Anonymized data (no name/phone) still visible for clinical reference. |

### 40.4 Data Integrity Edge Cases

| Scenario | System Behavior | Recovery |
|----------|----------------|----------|
| Prescription PDF generation fails | Prescription record saved in database, PDF queued for BullMQ retry (3 attempts) | Doctor sees: "Prescription saved. PDF is being generated and will be available shortly." After 3 failures: admin notified manually. |
| Lab results file is corrupted/unreadable | File stored but flagged as potentially corrupt | Doctor sees: "Lab results file may be corrupted. [Download original] [Request re-upload from lab]" |
| S3 (AWS) file upload fails | Upload retried 3 times with exponential backoff | If all retries fail: error toast. Doctor asked to try again. File not lost if browser hasn't closed (in-memory until uploaded). |
| Database transaction fails during prescription save | Transaction rolled back — no partial data | Error toast: "Failed to save prescription. Please try again." All-or-nothing: either full prescription saved or nothing. |

### 40.5 Network Degradation Scenarios

| Scenario | Behavior |
|----------|----------|
| Slow connection (>5s API response) | Loading spinner on all API calls. No timeout for 30 seconds. After 30s: "This is taking longer than expected. [Continue waiting] [Cancel]" |
| Intermittent connectivity | SSE reconnects automatically. API calls retry once on network error before showing error state. |
| Complete offline | Amber SSE banner. API calls fail immediately with "Unable to connect" error. Stale data remains visible but no new actions possible. |
| Hospital/clinic Wi-Fi blocks SSE | SSE connection fails → amber banner. Polling fallback (every 60 seconds) activates for critical updates (case assignments, SLA warnings). All other features work normally via standard HTTPS API calls. |

---

## 41. Security, Privacy & Audit Logging

### 41.1 Access Control — CASL.js Rules

The doctor portal enforces strict permission boundaries using CASL.js:

```typescript
// Doctor permission rules (defined at login, checked on every API call)
const ability = defineAbilityFor(doctor);

// Consultations: ONLY assigned to this doctor
can('read', 'Consultation', { doctorId: doctor.id });
can('update', 'Consultation', { doctorId: doctor.id });

// Prescriptions: ONLY create for own consultations
can('create', 'Prescription', { doctorId: doctor.id });
can('read', 'Prescription', { doctorId: doctor.id });

// Patients: ONLY those with at least one consultation assigned to this doctor
can('read', 'Patient', { consultations: { some: { doctorId: doctor.id } } });

// Messages: ONLY within own consultation threads
can('read', 'Message', { consultationDoctorId: doctor.id });
can('create', 'Message', { consultationDoctorId: doctor.id });

// Lab orders: create for own consultations, read results
can('create', 'LabOrder', { consultationDoctorId: doctor.id });
can('read', 'LabResult', { consultationDoctorId: doctor.id });

// EXPLICITLY DENIED:
cannot('read', 'Consultation', { doctorId: { $ne: doctor.id } });
cannot('read', 'Wallet');
cannot('read', 'Payment');
cannot('manage', 'Partner');
cannot('manage', 'SystemConfig');
cannot('read', 'AdminDashboard');
```

### 41.2 Data Visibility Summary

| Data Category | Doctor CAN See | Doctor CANNOT See |
|--------------|----------------|-------------------|
| Patient name, age, sex, city | ✅ For assigned patients | Other doctors' patients |
| Patient phone | Last 4 digits only (`+91 •••••• 4567`) | Full phone number |
| Patient email | ❌ Never | Admin only |
| Government ID photo | ❌ Never | Admin only |
| Questionnaire responses | ✅ For own consultations | Other doctors' consultations |
| Photos | ✅ For own consultations | Other doctors' consultations |
| Lab results | ✅ For own consultations | Lab portal internal workflow data |
| AI assessment | ✅ For own consultations | AI prompt/system prompt text |
| Prescriptions | ✅ For own prescriptions | Other doctors' prescriptions |
| Payment details | ❌ Never | Admin only |
| Wallet balance | ❌ Never | Patient + admin only |
| Subscription pricing/tier | ❌ Never (sees plan name only: "Hair Loss") | Admin only |
| Other doctors' statistics | ❌ Never | Admin only |
| Platform-wide analytics | ❌ Never | Admin only |

### 41.3 Audit Logging

Every doctor action is logged to the `AuditLog` table (PostgreSQL, INSERT-only — no UPDATE or DELETE allowed):

| Action | Fields Logged |
|--------|--------------|
| Login | `{ actorId, actorRole: 'doctor', action: 'LOGIN', ip, userAgent, timestamp }` |
| Case opened | `{ actorId, action: 'CASE_OPENED', resourceId: consultationId, timestamp }` |
| Status changed | `{ actorId, action: 'STATUS_CHANGED', resourceId: consultationId, metadata: { oldStatus, newStatus }, timestamp }` |
| Prescription created | `{ actorId, action: 'PRESCRIPTION_CREATED', resourceId: consultationId, metadata: { medicationCount, templateUsed }, timestamp }` |
| Lab order created | `{ actorId, action: 'LAB_ORDER_CREATED', resourceId: consultationId, metadata: { panelId }, timestamp }` |
| Message sent | `{ actorId, action: 'MESSAGE_SENT', resourceId: consultationId, metadata: { messageId }, timestamp }` |
| Referral created | `{ actorId, action: 'REFERRAL_CREATED', resourceId: consultationId, metadata: { clinicId, reason }, timestamp }` |
| Refund requested | `{ actorId, action: 'REFUND_REQUESTED', resourceId: consultationId, metadata: { amount, reason }, timestamp }` |
| Case closed | `{ actorId, action: 'CASE_CLOSED', resourceId: consultationId, metadata: { reason }, timestamp }` |
| Settings changed | `{ actorId, action: 'SETTINGS_CHANGED', metadata: { field, oldValue, newValue }, timestamp }` |
| PDF downloaded | `{ actorId, action: 'PDF_DOWNLOADED', metadata: { fileType, fileId }, timestamp }` |
| Patient record viewed | `{ actorId, action: 'PATIENT_VIEWED', resourceId: patientId, timestamp }` |

**Retention:** Minimum 1 year (DPDP Rules), recommended 3 years (Telemedicine Practice Guidelines 2020).

**Access:** Doctors cannot view their own audit trail. Only admin can query audit logs.

### 41.4 Session Security

| Security Measure | Implementation | Purpose |
|-----------------|---------------|---------|
| HttpOnly cookies | JWT stored in HttpOnly cookie — not accessible via JavaScript | Prevents XSS token theft |
| SameSite=Strict | Cookie not sent on cross-site requests | CSRF protection |
| Secure flag | Cookie only sent over HTTPS | Prevents sniffing on insecure connections |
| Token rotation | Every refresh generates a new access + refresh token pair | Limits exposure window |
| Theft detection | If a refresh token is reused (already rotated), ALL tokens for that user are revoked | Detects token compromise |
| Idle timeout | 4 hours of no API activity → next request triggers re-auth prompt | Limits unattended session risk |
| IP logging | Login IP recorded in audit log (not enforced for IP restriction — doctors may use VPN/mobile hotspot) | Forensic purposes |
| Rate limiting | Login: 5 attempts per phone per 15 minutes. API: 100 requests per minute per user. | Brute force + abuse prevention |

### 41.5 Content Security

| Concern | Approach | Reasoning |
|---------|----------|-----------|
| Screenshot prevention | NOT implemented for web portal | Technically infeasible for desktop browsers. Mitigation: audit logging + terms of service enforcement. |
| Copy protection | NOT implemented | Doctors legitimately need to reference patient data for clinical decisions. Audit log tracks all access. |
| Download tracking | Every PDF download logged | Prescriptions, lab results — all downloads recorded with doctor ID + timestamp + file accessed |
| Photo download | Photos viewed via CloudFront signed URLs (15-minute expiry) | URLs expire quickly. Direct download not blocked (same TOS enforcement reasoning). |

### 41.6 DPDPA 2023 Compliance (Doctor-Relevant)

| Requirement | Implementation |
|------------|---------------|
| Purpose limitation | Doctor only accesses patient data for clinical treatment purposes. CASL.js prevents access to non-clinical data. |
| Data minimization | Phone masked (last 4 digits), no email shown, no government ID, no payment data. Only clinically necessary data exposed. |
| Patient data deletion request | When patient exercises right to deletion, their clinical records are anonymized (name/phone replaced with pseudonyms), not fully deleted — medical record retention rules require keeping clinical data for minimum periods. Doctor sees anonymized version. |
| Consent | Patient consents to data processing during account creation and consultation submission. Consent records stored in database. |
| Cross-border transfer | All data stored on AWS Mumbai (ap-south-1). No cross-border data transfer. Doctor portal served from same region. |

---

## 42. Analytics Events — Doctor Portal

### 42.1 Event Catalog

| Event | Properties | Purpose |
|-------|-----------|---------|
| `doctor.login` | `{ doctorId, method: 'otp', device, browser }` | Login frequency, device distribution |
| `doctor.case_queue.viewed` | `{ doctorId, filters, resultCount }` | Queue engagement patterns |
| `doctor.case_queue.filtered` | `{ doctorId, filterType, filterValue }` | Most-used filter combinations |
| `doctor.case_queue.sorted` | `{ doctorId, sortBy }` | Sort preference trends |
| `doctor.case_queue.searched` | `{ doctorId, queryLength }` | Search usage frequency (no PII in query text) |
| `doctor.case.opened` | `{ doctorId, consultationId, condition, attentionLevel, waitTime }` | Case priority behavior analysis |
| `doctor.case.tab_switched` | `{ doctorId, consultationId, fromTab, toTab }` | Clinical workflow pattern detection |
| `doctor.case.time_on_tab` | `{ doctorId, consultationId, tab, durationSeconds }` | Where doctors spend review time |
| `doctor.prescription.started` | `{ doctorId, consultationId, condition }` | Conversion: review → prescribe |
| `doctor.prescription.template_selected` | `{ doctorId, condition, templateName }` | Most popular templates per vertical |
| `doctor.prescription.submitted` | `{ doctorId, consultationId, medicationCount, templateUsed, reviewTimeMinutes }` | Prescription complexity + efficiency |
| `doctor.prescription.edited_from_template` | `{ doctorId, fieldsEdited[] }` | Template customization patterns (are templates good enough?) |
| `doctor.lab_order.created` | `{ doctorId, consultationId, panelId, urgency }` | Lab ordering frequency + patterns |
| `doctor.referral.created` | `{ doctorId, consultationId, referralType }` | Referral frequency + reasons |
| `doctor.message.sent` | `{ doctorId, consultationId, isCanned, messageLength }` | Messaging patterns |
| `doctor.message.canned_used` | `{ doctorId, cannedLabel, isCustom }` | Canned message effectiveness |
| `doctor.patient.viewed` | `{ doctorId, patientId }` | Patient lookup frequency |
| `doctor.stats.viewed` | `{ doctorId, timeRange }` | Stats dashboard engagement |
| `doctor.settings.changed` | `{ doctorId, setting, newValue }` | Settings optimization opportunities |
| `doctor.shortcut.used` | `{ doctorId, shortcut, context }` | Keyboard shortcut adoption rate |

### 42.2 Analytics Privacy Rules

1. **No PII in analytics events:** Patient names, phone numbers, conditions, and clinical data are NEVER included in analytics payloads. Only UUIDs and aggregate counts.
2. **Doctor IDs are pseudonymized** in analytics exports (mapped UUIDs, not real names).
3. **Search queries are NOT logged** — only `queryLength` (integer) is tracked, preventing PII leakage.
4. **Message content is NOT logged** — only metadata: `isCanned` (boolean), `messageLength` (integer).
5. **Prescription content is NOT logged** — only metadata: `medicationCount`, `templateUsed`, `reviewTimeMinutes`.
6. **No individual doctor performance leaderboards** — admin sees aggregate metrics, not individual doctor rankings (to avoid unhealthy competition).

### 42.3 Analytics Implementation

Events are collected client-side and batched:

```typescript
// Analytics service (singleton, initialized on login)
const analytics = new AnalyticsService({
  batchSize: 10,        // send every 10 events
  flushInterval: 30000, // or every 30 seconds (whichever first)
  endpoint: '/api/analytics/batch',
  doctorId: currentDoctor.id
});

// Usage throughout the portal
analytics.track('doctor.case.opened', {
  consultationId: 'uuid',
  condition: 'HAIR_LOSS',
  attentionLevel: 'HIGH',
  waitTime: 14400  // seconds since AI_COMPLETE
});
```

Events are stored in a separate analytics database (not the main PostgreSQL) — either ClickHouse (if scale demands) or a dedicated analytics schema in PostgreSQL for MVP.

---

## 43. Cross-Reference Map & Document Dependencies

### 43.1 Documents Referenced by This Workflow

| Document | Sections Referenced | Why |
|----------|--------------------|----|
| PORTAL-DOCTOR.md | §16–29 (Patients, Stats, Settings, Canned Messages, Real-Time, Notifications, Lifecycle, Follow-Ups, Shortcuts, Responsive, Errors, Security, Analytics) | Primary source for all operational workflow details |
| WORKFLOW-DOCTOR-PART1.md | §1–10 (Role overview, Provisioning, Auth, Navigation, Queue) | Foundation — prerequisite reading |
| WORKFLOW-DOCTOR-PART2.md | §11–25 (Case Review, Clinical Workflows, Lifecycle) | Clinical workflows — prerequisite reading |
| ARCHITECTURE.md | SSE system, Redis Pub/Sub, BullMQ job queue, CASL.js | Technical architecture underpinning all real-time and security features |
| BACKEND-PART1.md | API endpoints for doctor module, notification service, SLA engine | Backend implementation details for every API call in this document |
| BACKEND-PART3A.md / BACKEND-PART3B.md | Notification module, analytics module, audit logging | Backend services supporting notifications and analytics |
| APP-PATIENT.md | Patient-side notification format, follow-up flow, data deletion | Cross-portal workflow understanding |
| PORTAL-ADMIN.md | Admin case assignment, doctor management, SLA monitoring, refund approval | Admin-doctor interaction workflows |
| VERTICAL-HAIR-LOSS.md / VERTICAL-ED.md / VERTICAL-PE.md / VERTICAL-WEIGHT.md / VERTICAL-PCOS-PART1-3.md | Condition-specific follow-up schedules, questionnaire content, photo requirements | Vertical-specific workflow details |
| onlyou-spec-resolved-v4.md | Original platform specification (canonical source for pricing, feature flags, video consultation) | Authoritative reference for disputed details |

### 43.2 Status Enum Master Reference

**Use these canonical values in code (resolves all cross-document discrepancies):**

| Canonical Enum Value | Also Called | Use Context |
|---------------------|------------|-------------|
| `SUBMITTED` | — | Patient submits assessment |
| `AI_PROCESSING` | — | AI job running |
| `AI_COMPLETE` | `PENDING_REVIEW` (ARCHITECTURE.md) | AI done, ready for doctor |
| `AI_FAILED` | — | AI job failed |
| `ASSIGNED` | — | Doctor assigned to case |
| `REVIEWING` | `IN_REVIEW` (ARCHITECTURE.md) | Doctor actively reviewing |
| `INFO_REQUESTED` | `MORE_INFO_REQUESTED` (BACKEND-PART1.md) | Doctor asked for more info |
| `PRESCRIPTION_CREATED` | `PRESCRIBED` (BACKEND-PART1.md) | Doctor submitted prescription |
| `TREATMENT_ACTIVE` | — | Patient started treatment |
| `FOLLOW_UP_DUE` | — | Follow-up timer fired |
| `REFERRED` | — | Doctor referred patient |
| `COMPLETED` | `CLOSED` (sometimes) | Case completed normally |
| `PATIENT_DELETED` | — | Patient deleted account |

### 43.3 API Endpoint Summary (Doctor Operational)

| Endpoint | Method | Section | Purpose |
|----------|--------|---------|---------|
| `trpc.doctor.patient.list` | query | §26 | Get paginated patient directory |
| `trpc.doctor.patient.getDetail` | query | §27 | Get full patient history |
| `trpc.doctor.stats.getDashboard` | query | §28 | Get stats dashboard data |
| `trpc.doctor.settings.updateProfile` | mutation | §29 | Update profile fields |
| `trpc.doctor.settings.updateAvailability` | mutation | §30 | Set weekly schedule |
| `trpc.doctor.settings.addTimeOff` | mutation | §30 | Add time-off period |
| `trpc.doctor.settings.deleteTimeOff` | mutation | §30 | Remove time-off period |
| `trpc.doctor.settings.updateNotificationPrefs` | mutation | §31 | Set notification channel preferences |
| `trpc.doctor.settings.updateQuietHours` | mutation | §31 | Set quiet hours |
| `trpc.doctor.settings.createCannedMessage` | mutation | §32 | Add custom canned message |
| `trpc.doctor.settings.updateCannedMessage` | mutation | §32 | Edit custom canned message |
| `trpc.doctor.settings.deleteCannedMessage` | mutation | §32 | Remove custom canned message |
| `GET /api/sse/doctor` | SSE stream | §33 | Real-time event stream |
| `POST /api/analytics/batch` | HTTP | §42 | Submit analytics events |

---

*End of WORKFLOW-DOCTOR-PART3.md — Doctor Complete Workflow Reference (Part 3 of 3)*

*Full Doctor Workflow Documentation:*
- *Part 1: Pre-Clinical Workflows (Provisioning, Auth, Navigation, Queue) — Sections 1-10*
- *Part 2: Clinical Workflows (Case Review, Prescriptions, Labs, Referrals, Messaging) — Sections 11-25*
- *Part 3: Operational Workflows (Patient Management, Stats, Settings, Notifications, Security, Edge Cases) — Sections 26-43*
