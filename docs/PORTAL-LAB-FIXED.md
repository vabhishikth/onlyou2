# PORTAL-LAB.md — Lab Portal: Complete Specification

> **Platform:** Onlyou Telehealth — Indian telehealth for stigmatized chronic conditions
> **Portal Type:** Next.js 14 (App Router) — Mobile-first PWA (Progressive Web App)
> **URL:** `lab.onlyou.life`
> **Auth:** Phone OTP (WhatsApp primary, SMS fallback) → JWT (role: `lab`)
> **Navigation:** Bottom navigation with 3 tabs
> **API Protocol:** tRPC (end-to-end type-safe, no codegen)
> **State Management:** Zustand + TanStack Query (tRPC integration)
> **Routing:** Next.js App Router (file-based)
> **Real-time:** SSE + Redis Pub/Sub (server → client push for new sample arrivals, status updates)
> **Primary Device:** Tablet or phone at the lab counter (mobile-first, not mobile-only)
> **PWA:** Installable
> **Local Dev Port:** `3004` (`pnpm --filter lab-portal dev`)

---

## Table of Contents

1. [App Structure & File Layout](#1-app-structure--file-layout)
2. [Authentication & Session Management](#2-authentication--session-management)
3. [PWA Configuration](#3-pwa-configuration)
4. [Role Definition & Privacy Model](#4-role-definition--privacy-model)
5. [Data Models](#5-data-models)
6. [Bottom Navigation & Tab Architecture](#6-bottom-navigation--tab-architecture)
7. [Tab 1: Incoming — Receive Samples](#7-tab-1-incoming--receive-samples)
8. [Tab 2: Processing — Track Active Samples](#8-tab-2-processing--track-active-samples)
9. [Tab 3: Upload Results — Submit Completed Reports](#9-tab-3-upload-results--submit-completed-reports)
10. [Critical Value Handling](#10-critical-value-handling)
11. [Report Issue Flow](#11-report-issue-flow)
12. [Sample ID Format & Display](#12-sample-id-format--display)
13. [Notification System (Lab)](#13-notification-system-lab)
14. [Real-Time System (Lab Portal)](#14-real-time-system-lab-portal)
15. [tRPC API Reference](#15-trpc-api-reference)
16. [Privacy & Data Access Rules (RBAC)](#16-privacy--data-access-rules-rbac)
17. [Security & Session Management](#17-security--session-management)
18. [Error States & Edge Cases](#18-error-states--edge-cases)
19. [Responsive Design & Layout](#19-responsive-design--layout)
20. [Analytics Events](#20-analytics-events)
21. [Integration with Other Portals](#21-integration-with-other-portals)
22. [Lab Order Lifecycle — Complete Status Flow](#22-lab-order-lifecycle--complete-status-flow)
23. [SLA Thresholds & Escalation Rules](#23-sla-thresholds--escalation-rules)
24. [Test Panels by Condition](#24-test-panels-by-condition)
25. [Build & Deployment](#25-build--deployment)
26. [Testing Checklist](#26-testing-checklist)
27. [Appendix: Complete Status Flow Diagram](#27-appendix-complete-status-flow-diagram)

---

## 1. App Structure & File Layout

### Next.js App Router Structure

```
apps/lab-portal/
├── src/
│   ├── app/
│   │   ├── layout.tsx              → Root layout (auth provider, SSE provider, bottom nav)
│   │   ├── page.tsx                → Redirects to /incoming (default tab)
│   │   ├── login/
│   │   │   └── page.tsx            → Phone OTP login screen
│   │   ├── incoming/
│   │   │   └── page.tsx            → Tab 1: Incoming samples list
│   │   ├── processing/
│   │   │   └── page.tsx            → Tab 2: Processing samples list
│   │   ├── upload/
│   │   │   └── page.tsx            → Tab 3: Upload results list
│   │   │   └── [sampleId]/
│   │   │       └── page.tsx        → Upload results for specific sample
│   │   ├── sample/
│   │   │   └── [id]/
│   │   │       └── page.tsx        → Sample detail view (any status)
│   │   └── settings/
│   │       └── page.tsx            → Lab staff profile & diagnostic centre info
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx       → 3-tab bottom navigation bar
│   │   │   ├── TopBar.tsx          → Lab name, notification bell, date display
│   │   │   └── TabBadge.tsx        → Unread count badge on tabs
│   │   ├── incoming/
│   │   │   ├── IncomingList.tsx    → List of samples awaiting receipt
│   │   │   ├── IncomingSampleCard.tsx → Card with sample info + receive button
│   │   │   └── ReceiveModal.tsx    → Tube count confirmation modal
│   │   ├── processing/
│   │   │   ├── ProcessingList.tsx  → List of samples being processed
│   │   │   ├── ProcessingSampleCard.tsx → Card with sample info + status actions
│   │   │   └── EmptyState.tsx      → No samples in processing illustration
│   │   ├── upload/
│   │   │   ├── UploadList.tsx      → List of samples ready for result upload
│   │   │   ├── UploadSampleCard.tsx → Card linking to upload flow
│   │   │   ├── ResultUploadForm.tsx → PDF upload + per-test result entry form
│   │   │   ├── TestResultRow.tsx   → Individual test result input (value + status flag)
│   │   │   ├── PDFCapture.tsx      → Camera capture or file picker for PDF
│   │   │   └── SubmitConfirm.tsx   → Review before submit modal
│   │   ├── sample/
│   │   │   ├── SampleDetail.tsx    → Full sample detail view
│   │   │   ├── SampleTimeline.tsx  → Status history timeline
│   │   │   └── SampleTests.tsx     → Tests list with results (if uploaded)
│   │   ├── issue/
│   │   │   ├── ReportIssueModal.tsx → Issue reporting form
│   │   │   └── IssueReasonPicker.tsx → Predefined issue reasons selector
│   │   ├── common/
│   │   │   ├── StatusBadge.tsx     → Color-coded status badges
│   │   │   ├── SampleIdDisplay.tsx → Formatted sample ID display (e.g., "ONY-2026-0045")
│   │   │   ├── TestStatusIcon.tsx  → ✅ Normal / ⚠️ Abnormal / 🔴 Critical
│   │   │   ├── LoadingSpinner.tsx  → Loading state component
│   │   │   ├── EmptyState.tsx      → Generic empty state with illustration
│   │   │   └── ErrorBoundary.tsx   → Error boundary with retry
│   │   └── shared/                 → Re-exported from @onlyou/ui package
│   ├── hooks/
│   │   ├── useLabOrders.ts         → TanStack Query hook for fetching lab orders
│   │   ├── useUpdateLabStatus.ts   → Mutation hook for status transitions
│   │   ├── useUploadResults.ts     → Mutation hook for result upload + PDF upload
│   │   ├── useReportIssue.ts       → Mutation hook for reporting sample issues
│   │   ├── useSSE.ts               → SSE connection hook for real-time updates
│   │   └── useAuth.ts              → Auth state + token refresh
│   ├── lib/
│   │   ├── trpc.ts                 → tRPC client configuration
│   │   ├── auth.ts                 → JWT handling + phone OTP helpers
│   │   ├── sse.ts                  → SSE client for lab portal events
│   │   ├── upload.ts               → S3 presigned URL upload utility
│   │   └── constants.ts            → Status enums, issue reasons, test panels
│   ├── styles/
│   │   └── globals.css             → Tailwind CSS imports + custom styles
│   └── types/
│       ├── lab-order.ts            → LabOrder types (shared with backend)
│       └── sample.ts               → Sample-specific frontend types
├── public/
│   ├── manifest.json               → PWA manifest
│   ├── sw.js                       → Service worker (basic caching)
│   ├── icons/                      → PWA icons (192x192, 512x512)
│   └── favicon.ico
├── next.config.js                  → Next.js config (PWA headers, env)
├── tailwind.config.ts              → Tailwind configuration
├── tsconfig.json
└── package.json
```

### Shared Packages Used

```
packages/
├── api-client/       → tRPC client factory + shared query hooks (useLabOrder, etc.)
├── shared-types/     → TypeScript types shared between all portals + backend
├── ui/               → Shared UI components (StatusBadge, LoadingSpinner, etc.)
└── utils/            → Date formatting, ID formatting, error handling
```

---

## 2. Authentication & Session Management

### Login Flow

Lab staff authenticate using **phone OTP**, exactly like other portal roles.

```
┌───────────────────────────────────┐
│                                   │
│      🔬 Onlyou Lab Portal         │
│                                   │
│   Enter your phone number         │
│   ┌───────────────────────────┐   │
│   │ +91  │ 98765 43210       │   │
│   └───────────────────────────┘   │
│                                   │
│   [Send OTP via WhatsApp]         │
│   [Send OTP via SMS instead]      │
│                                   │
└───────────────────────────────────┘
         │
         ▼ (OTP sent)
┌───────────────────────────────────┐
│                                   │
│   Enter 6-digit OTP               │
│   Sent to WhatsApp +91 98765...   │
│                                   │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐│
│   │  │ │  │ │  │ │  │ │  │ │  ││
│   └──┘ └──┘ └──┘ └──┘ └──┘ └──┘│
│                                   │
│   Resend OTP (45s cooldown)       │
│                                   │
│   [Verify & Login]                │
│                                   │
└───────────────────────────────────┘
```

### Token Management

| Token | Type | Duration | Storage |
|-------|------|----------|---------|
| Access token | JWT | 15 minutes | Memory (Zustand store) |
| Refresh token | Opaque | 7 days | `httpOnly` secure cookie |

**JWT payload:**
```json
{
  "sub": "user-uuid",
  "role": "lab",
  "diagnosticCentreId": "centre-uuid",
  "iat": 1706000000,
  "exp": 1706000900
}
```

**Key behaviors:**
- JWT includes `diagnosticCentreId` — all API queries are automatically scoped to this centre
- Access token refresh happens silently via interceptor (TanStack Query's `onError` handler)
- On refresh failure → redirect to `/login`
- Cookie path: `Path=/` — available to all portal routes
- `SameSite=Strict`, `Secure=true`, `httpOnly=true` for refresh token

### Session Rules

| Rule | Behavior |
|------|----------|
| Single session only | New login from different device → previous session invalidated |
| Token refresh window | Last 2 minutes of access token lifetime |
| Idle session timeout | 12 hours of no API activity → session terminated, redirect to login. Rationale: lab technicians typically work 8–12 hour shifts; matches pharmacy portal timeout for consistency across external partner portals |
| Max session duration | 7 days (refresh token expiry) — then must re-login |
| Logout | Clears access token from memory + calls `/auth/logout` to invalidate refresh token + clears cookie |

---

## 3. PWA Configuration

### Manifest (`public/manifest.json`)

```json
{
  "name": "Onlyou Lab Portal",
  "short_name": "Lab Portal",
  "description": "Diagnostic centre sample management for Onlyou Telehealth",
  "start_url": "/incoming",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#7C3AED",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker Strategy

The lab portal uses a **basic caching** strategy (not full offline like the nurse portal):

- **App shell** (HTML, CSS, JS) — Cache First
- **API data** — Network First with no offline fallback (lab actions require real-time connectivity)
- **Static assets** (icons, fonts) — Cache First
- **PDF uploads** — Network Only (cannot be cached — must reach server)

**Why not full offline?** Unlike nurses on the road, lab staff operate at a fixed location (diagnostic centre) with reliable internet. All lab actions (receive sample, mark processing, upload results) require server confirmation. Offline mode would create dangerous data conflicts for medical results.

### Install Prompt

On first visit, show a dismissible banner: "Add Lab Portal to your home screen for quick access" with [Install] button.

---

## 4. Role Definition & Privacy Model

### Lab Staff Role

**Who uses this portal:** Technicians, phlebotomists, and front-desk staff at partner diagnostic centres.

**Linked entity:** Each lab staff account is linked to exactly one `DiagnosticCentre` record. All data access is scoped to that centre.

### Privacy Model — CRITICAL

> **Lab staff see ANONYMIZED patient IDs only. They do NOT see patient names, phone numbers, addresses, or diagnoses.**

This is a core privacy architecture decision. Lab partners are external entities — they need to know:
- ✅ What tests to run
- ✅ Sample ID for tracking
- ✅ Which nurse delivered the sample
- ✅ Number of tubes expected

They do **NOT** need to know:
- ❌ Patient name
- ❌ Patient phone number
- ❌ Patient address
- ❌ Patient diagnosis or condition
- ❌ Questionnaire responses
- ❌ AI assessment data
- ❌ Doctor notes (except lab-specific notes like "Fasting sample")

**Anonymous ID format:** `ONY-2026-0045` (prefix-year-sequential number)

This anonymization protects patient privacy per DPDPA (Digital Personal Data Protection Act, 2023) principles — lab partners process samples under a "purpose limitation" consent (lab processing only).

---

## 5. Data Models

### LabOrder (Backend — fields visible to lab portal)

```typescript
// Fields the lab portal CAN see (scoped by RBAC)
interface LabOrderForLab {
  id: string;                           // UUID
  sampleId: string;                     // "ONY-2026-0045" — displayed to lab staff
  patientAnonymousId: string;           // "ONY-P-0045" — anonymous patient reference
  tests: TestItem[];                    // Array of tests to perform
  diagnosticCentreId: string;           // Must match staff's linked centre
  nurseDeliveredBy?: string;            // Nurse name who delivered sample
  deliveredAt?: DateTime;               // When nurse delivered to lab
  tubeCountExpected: number;            // Tubes the nurse says they're delivering
  tubeCountReceived?: number;           // Tubes the lab confirms receiving
  labNotes?: string;                    // Doctor/coordinator notes for lab (e.g., "Fasting")
  selfUploaded: boolean;                // If true, patient uploaded their own results
  urgency: 'routine' | 'urgent';       // Routine or urgent processing

  // Status (lab-relevant subset)
  status: LabOrderStatus;

  // Results (lab uploads these)
  resultPdfUrl?: string;                // S3 URL of uploaded PDF
  resultFlags?: ResultFlag[];           // Per-test result flags

  // Timestamps
  orderedAt: DateTime;
  receivedAt?: DateTime;
  processingStartedAt?: DateTime;
  resultsUploadedAt?: DateTime;

  createdAt: DateTime;
  updatedAt: DateTime;
}

interface TestItem {
  id: string;
  name: string;                         // e.g., "TSH", "Ferritin", "Vitamin D"
  panelName: string;                    // e.g., "Extended Hair Panel"
}

interface ResultFlag {
  testId: string;
  testName: string;
  resultValue?: string;                 // Optional text input (e.g., "2.1 mIU/L")
  status: 'normal' | 'abnormal' | 'critical';
}
```

### LabOrder Fields the lab portal CANNOT see

```typescript
// These fields exist on LabOrder but are EXCLUDED from lab portal API responses
interface LabOrderHiddenFromLab {
  patientId: string;                    // Real patient ID — hidden
  patientName: string;                  // Patient's actual name — hidden
  patientPhone: string;                 // Patient's phone — hidden
  consultationId: string;               // Links to clinical data — hidden
  doctorId: string;                     // Doctor reference — hidden
  condition: string;                    // The patient's condition — hidden
  doctorNotes: string;                  // Clinical notes — hidden
  nurseVisitId: string;                 // Links to nurse visit record — hidden
}
```

### LabOrderStatus Enum (Complete)

> **⚠️ Cross-Document Status Note:**
> The `DELIVERED_TO_LAB` status used in this portal and in onlyou-spec-resolved-v4.md (Section 4.4, 4.5) is referred to as `AT_LAB` in PORTAL-NURSE-FIXED.md (Section 14) and PORTAL-ADMIN.md (Sections 6.3, 7). During implementation, the team must choose ONE canonical name and use it across all services. PORTAL-NURSE-FIXED.md recommends adopting `AT_LAB` as canonical. Whichever name is chosen, update all documents and the Prisma enum accordingly.

```typescript
enum LabOrderStatus {
  // Pre-lab stages (lab portal does NOT see these)
  ORDERED = 'ORDERED',                   // Doctor created the order
  SLOT_BOOKED = 'SLOT_BOOKED',           // Patient booked home collection slot
  NURSE_ASSIGNED = 'NURSE_ASSIGNED',     // Coordinator assigned a nurse
  NURSE_EN_ROUTE = 'NURSE_EN_ROUTE',     // Nurse started travelling to patient
  NURSE_ARRIVED = 'NURSE_ARRIVED',       // Nurse arrived at patient's home
  SAMPLE_COLLECTED = 'SAMPLE_COLLECTED', // Nurse collected the blood sample

  // Lab-relevant stages (lab portal DOES see these)
  DELIVERED_TO_LAB = 'DELIVERED_TO_LAB', // Nurse delivered sample to this lab (⚠️ called `AT_LAB` in nurse + admin portals — see note above)
  SAMPLE_RECEIVED = 'SAMPLE_RECEIVED',   // Lab confirmed receipt
  PROCESSING = 'PROCESSING',             // Lab started processing
  RESULTS_READY = 'RESULTS_READY',       // Lab uploaded results

  // Post-lab stages (lab portal does NOT see these)
  DOCTOR_REVIEWED = 'DOCTOR_REVIEWED',   // Doctor reviewed the results
  CLOSED = 'CLOSED',                     // Order fully completed

  // Special statuses
  SAMPLE_ISSUE = 'SAMPLE_ISSUE',         // Lab reported a problem with the sample
  RESULTS_UPLOADED = 'RESULTS_UPLOADED',  // Patient self-uploaded (bypasses lab)
  COLLECTION_FAILED = 'COLLECTION_FAILED', // Nurse couldn't collect (patient unavailable)
  CANCELLED = 'CANCELLED'                // Order cancelled by coordinator/doctor
}
```

**Lab portal only sees orders in statuses:** `DELIVERED_TO_LAB`, `SAMPLE_RECEIVED`, `PROCESSING`, `RESULTS_READY`, `SAMPLE_ISSUE`

### DiagnosticCentre (Partner Entity)

```typescript
interface DiagnosticCentre {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  contactPerson: string;
  portalLoginPhone: string;             // Phone number for OTP login
  testsOffered: string[];               // List of test names this lab can perform
  panelPricing: PanelPrice[];           // Pricing per panel
  avgTurnaround: number;                // Average hours to complete results
  rating: number;                       // Internal quality rating
  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface PanelPrice {
  panelId: string;
  panelName: string;
  price: number;                        // In INR
}
```

---

## 6. Bottom Navigation & Tab Architecture

### Layout

```
┌─────────────────────────────────────┐
│  🔬 PathLab Plus          🔔(2)     │  ← Top bar: lab name + notifications
│─────────────────────────────────────│
│                                     │
│                                     │
│         [TAB CONTENT AREA]          │
│                                     │
│                                     │
│─────────────────────────────────────│
│  📥 Incoming(3) │ ⚙️ Processing(5) │ 📤 Upload(2) │  ← Bottom nav with badges
└─────────────────────────────────────┘
```

### Tab Configuration

| Tab | Icon | Label | Badge | Shows |
|-----|------|-------|-------|-------|
| 1 | 📥 | Incoming | Count of `DELIVERED_TO_LAB` samples | Samples awaiting receipt from nurses |
| 2 | ⚙️ | Processing | Count of `SAMPLE_RECEIVED` + `PROCESSING` samples | Samples being processed |
| 3 | 📤 | Upload | Count of samples in `PROCESSING` with no results | Samples ready for result upload |

**Badge behavior:**
- Badge shows count when > 0
- Badge color: red (urgent), blue (normal)
- Urgent items: any sample where `urgency === 'urgent'` or received > 24 hours ago without result
- Badges update in real-time via SSE

### Top Bar

- **Left:** Diagnostic centre name (from `DiagnosticCentre.name`)
- **Right:** Notification bell with unread count badge
- Tapping bell → dropdown showing recent notifications (new sample delivered, SLA reminder)
- Date display below centre name (e.g., "Saturday, 28 Feb 2026")

---

## 7. Tab 1: Incoming — Receive Samples

### Purpose

Samples arriving from nurses. When a nurse taps "Deliver to Lab" in the nurse portal and selects this diagnostic centre, the sample appears here.

### Screen Layout

```
┌─────────────────────────────────────┐
│  📥 INCOMING SAMPLES                │
│  3 samples awaiting receipt         │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 🔴 URGENT                       ││
│  │ ONY-2026-0045                   ││
│  │ Tests: TSH, Free T4, Ferritin, ││
│  │        Vitamin D, DHT, Hgb     ││
│  │ Delivered by: Priya N.          ││
│  │ Delivered: 10:35 AM (25m ago)   ││
│  │ Tubes expected: 3               ││
│  │ Note: ⚠️ Fasting sample         ││
│  │                                  ││
│  │ [  ✅ MARK RECEIVED  ]          ││
│  │                                  ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ ONY-2026-0047                   ││
│  │ Tests: Testosterone, Fasting    ││
│  │        glucose, HbA1c, Lipids   ││
│  │ Delivered by: Ravi K.           ││
│  │ Delivered: 11:15 AM (5m ago)    ││
│  │ Tubes expected: 2               ││
│  │                                  ││
│  │ [  ✅ MARK RECEIVED  ]          ││
│  │                                  ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

### Sample Card — Incoming

Each card displays:

| Field | Source | Example |
|-------|--------|---------|
| Urgency badge | `labOrder.urgency` | 🔴 URGENT (red) or no badge (routine) |
| Sample ID | `labOrder.sampleId` | "ONY-2026-0045" |
| Tests ordered | `labOrder.tests[]` | "TSH, Free T4, Ferritin, Vitamin D, DHT, Hemoglobin" |
| Delivered by | `labOrder.nurseDeliveredBy` | "Priya N." |
| Delivery time | `labOrder.deliveredAt` | "10:35 AM (25m ago)" — relative time |
| Tubes expected | `labOrder.tubeCountExpected` | "3" |
| Lab notes | `labOrder.labNotes` | "⚠️ Fasting sample" (if present) |

### "Mark Received" Flow

1. Lab staff taps the large **"✅ Mark Received"** button
2. **Confirmation modal** opens:

```
┌──────────────────────────────────────┐
│  CONFIRM RECEIPT                      │
│                                       │
│  Sample: ONY-2026-0045               │
│  Tubes expected: 3                    │
│                                       │
│  How many tubes received?             │
│  ┌─────────────────────────────────┐ │
│  │  [ 3 ]  (pre-filled with expected)│ │
│  └─────────────────────────────────┘ │
│                                       │
│  ☐ All tubes in good condition        │
│                                       │
│  [Cancel]         [Confirm Receipt]   │
│                                       │
└──────────────────────────────────────┘
```

3. If tube count matches expected → Status transitions to `SAMPLE_RECEIVED`
4. If tube count does NOT match → **Discrepancy flag** appears:

```
┌──────────────────────────────────────┐
│  ⚠️ TUBE COUNT MISMATCH              │
│                                       │
│  Expected: 3 tubes                    │
│  Received: 2 tubes                    │
│                                       │
│  Add note about discrepancy:          │
│  ┌─────────────────────────────────┐ │
│  │ One tube broken during transit   │ │
│  └─────────────────────────────────┘ │
│                                       │
│  [Cancel]    [Receive with Discrepancy]│
│                                       │
└──────────────────────────────────────┘
```

5. Coordinator is notified of the discrepancy

### Post-Receipt

- Sample card moves from **Incoming** tab to **Processing** tab
- Badge count on Incoming decreases by 1
- Notifications sent:
  - Patient (push + WhatsApp): "Lab received your sample"
  - Coordinator (SSE): Lab order status updated
- Audit log entry: `lab_staff_received_sample`

### Empty State

When no incoming samples:
```
┌─────────────────────────────────────┐
│                                     │
│          📥                          │
│    No incoming samples              │
│                                     │
│    Samples will appear here when    │
│    nurses deliver them to your lab  │
│                                     │
└─────────────────────────────────────┘
```

---

## 8. Tab 2: Processing — Track Active Samples

### Purpose

Track samples that have been received and are being processed in the lab. Shows two sub-states: "Received" (waiting to start processing) and "Processing" (actively being worked on).

### Screen Layout

```
┌─────────────────────────────────────┐
│  ⚙️ PROCESSING                      │
│  5 samples in lab                   │
│                                     │
│  ── Awaiting Processing (2) ──      │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ ONY-2026-0044                   ││
│  │ Tests: FSH, LH, Estradiol,     ││
│  │        Testosterone, DHEA-S,    ││
│  │        Prolactin, Glucose, Lipid││
│  │ Received: 9:20 AM (1h 40m ago) ││
│  │ Tubes: 3                        ││
│  │                                  ││
│  │ [  ▶️ START PROCESSING  ]        ││
│  │ [  ⚠️ Report Issue  ]           ││
│  └─────────────────────────────────┘│
│                                     │
│  ── Currently Processing (3) ──     │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 🔴 URGENT                       ││
│  │ ONY-2026-0042                   ││
│  │ Tests: TSH, Free T4, Ferritin  ││
│  │ Processing since: 8:45 AM      ││
│  │ Duration: 2h 15m                ││
│  │                                  ││
│  │ [  📤 Upload Results  ]         ││
│  │ [  ⚠️ Report Issue  ]           ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

### Sample Card — Processing

Each card displays:

| Field | Source | Example |
|-------|--------|---------|
| Urgency badge | `labOrder.urgency` | 🔴 URGENT or none |
| Sample ID | `labOrder.sampleId` | "ONY-2026-0042" |
| Tests | `labOrder.tests[]` | Comma-separated test names |
| Received time | `labOrder.receivedAt` | "9:20 AM (1h 40m ago)" |
| Tube count | `labOrder.tubeCountReceived` | "3" |
| Processing since | `labOrder.processingStartedAt` | "8:45 AM" (only if processing started) |
| Duration | Computed | "2h 15m" (time since processing started) |

### "Start Processing" Action

- Tap → immediate status change to `PROCESSING` (no confirmation needed — low-friction for busy labs)
- `processingStartedAt` timestamp set
- Card moves from "Awaiting Processing" section to "Currently Processing" section
- SSE event → admin dashboard updates

### "Upload Results" Button

- Navigates to Tab 3's upload flow for this specific sample (deep link to `/upload/[sampleId]`)
- See Section 9 for the complete upload flow

### "Report Issue" Button

- Opens issue reporting modal — see Section 11

### Sorting

- **Awaiting Processing:** Oldest first (longest waiting = top) with urgent items pinned to top
- **Currently Processing:** Urgent first, then longest processing time first

### Time Alerts

- If a sample has been in "Received" status for > 2 hours: amber warning border on card
- If a sample has been in "Processing" status for > 24 hours: red warning border + "Overdue" badge
- These visual cues help lab staff prioritize

---

## 9. Tab 3: Upload Results — Submit Completed Reports

### Purpose

Upload completed test results for processed samples. This is the most complex flow in the lab portal.

### Screen Layout — Results List

```
┌─────────────────────────────────────┐
│  📤 UPLOAD RESULTS                   │
│  2 samples awaiting results         │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 🔴 URGENT                       ││
│  │ ONY-2026-0042                   ││
│  │ Tests: TSH, Free T4, Ferritin  ││
│  │ Processing since: 8:45 AM      ││
│  │ Duration: 4h 15m                ││
│  │                                  ││
│  │ [  📤 Upload Results  ]         ││
│  └─────────────────────────────────┘│
│                                     │
│  ── Recently Uploaded ──            │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ ✅ ONY-2026-0041                ││
│  │ Uploaded: 11:30 AM today        ││
│  │ Results: 4 Normal, 1 Abnormal   ││
│  │ [View Details]                   ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

### Upload Flow — Step by Step

**Step 1: Upload PDF**

```
┌─────────────────────────────────────┐
│  ← Back        UPLOAD RESULTS       │
│                                     │
│  Sample: ONY-2026-0042              │
│  Tests: TSH, Free T4, Ferritin     │
│                                     │
│  ── STEP 1: Upload Report PDF ──    │
│                                     │
│  ┌─────────────────────────────────┐│
│  │                                  ││
│  │    📷 Take Photo of Report       ││
│  │                                  ││
│  │    ─── or ───                    ││
│  │                                  ││
│  │    📁 Choose File from Device    ││
│  │                                  ││
│  └─────────────────────────────────┘│
│                                     │
│  Accepted: PDF, JPG, PNG            │
│  Max size: 10 MB                    │
│                                     │
│  [Next →]                           │
│                                     │
└─────────────────────────────────────┘
```

- **Camera capture:** Opens device camera → captures photo → auto-converts to optimized image
- **File picker:** Opens device file browser → select PDF or image
- Upload goes to S3 via presigned URL → stored in `onlyou-lab-results` bucket
- S3 bucket has SSE-KMS encryption; access via CloudFront signed URLs (1-hour expiry) for doctor and patient viewing
- Preview shown after selection — lab staff can retake/reselect
- **"Next"** button enabled only after successful upload

**Step 2: Flag Each Test Result**

```
┌─────────────────────────────────────┐
│  ← Back        UPLOAD RESULTS       │
│                                     │
│  Sample: ONY-2026-0042              │
│                                     │
│  ── STEP 2: Flag Test Results ──    │
│                                     │
│  For each test, enter the result    │
│  value and select the status.       │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ TSH                              ││
│  │ Value: [  2.1 mIU/L          ]  ││
│  │ Status: (✅ Normal) (⚠️) (🔴)   ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Free T4                          ││
│  │ Value: [  1.2 ng/dL           ] ││
│  │ Status: (✅ Normal) (⚠️) (🔴)   ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Ferritin                         ││
│  │ Value: [  18 ng/mL            ] ││
│  │ Status: (✅) (⚠️ Abnormal) (🔴) ││
│  └─────────────────────────────────┘│
│                                     │
│  [← Back]             [Review →]    │
│                                     │
└─────────────────────────────────────┘
```

For **each test** in the ordered panel:

| Input | Required | Description |
|-------|----------|-------------|
| Test name | Auto-populated | From `labOrder.tests[].name` — not editable |
| Result value | Optional | Free text input (e.g., "2.1 mIU/L", "18 ng/mL") |
| Status flag | **Required** | One of: ✅ Normal / ⚠️ Abnormal / 🔴 Critical |

**Status flag selector:** Three radio buttons per test, visually distinct:
- ✅ **Normal** — green outline, check icon
- ⚠️ **Abnormal** — amber outline, warning icon
- 🔴 **Critical** — red outline, alert icon

**Validation:**
- All tests must have a status flag selected before proceeding
- Result value is optional (the PDF is the authoritative source — values here are for quick doctor reference)
- If any test is flagged 🔴 Critical → show warning: "Critical values will trigger urgent notifications to the doctor."

**Step 3: Review & Submit**

```
┌─────────────────────────────────────┐
│  ← Back        REVIEW & SUBMIT      │
│                                     │
│  Sample: ONY-2026-0042              │
│                                     │
│  📄 Report PDF: lab_report.pdf ✅   │
│                                     │
│  ── Test Results ──                 │
│                                     │
│  TSH ................ 2.1 mIU/L  ✅ │
│  Free T4 ........... 1.2 ng/dL  ✅ │
│  Ferritin .......... 18 ng/mL   ⚠️ │
│                                     │
│  ⚠️ 1 abnormal result              │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  [← Back to Edit]                   │
│                                     │
│  [ ✅ SUBMIT RESULTS ]              │
│                                     │
└─────────────────────────────────────┘
```

**Submit action:**
1. Lab staff reviews summary
2. Taps **"Submit Results"**
3. Confirmation dialog: "Submit results for ONY-2026-0042? This cannot be undone." → [Cancel] / [Submit]
4. API call: `trpc.lab.labOrder.submitResults.mutate({ ... })`
5. Status → `RESULTS_READY`
6. Notifications sent (see Section 10 for critical value handling)
7. Success toast: "Results submitted successfully"
8. Redirect back to Upload tab list

---

## 10. Critical Value Handling

### What Triggers Critical Handling

When **ANY** test in a result upload is flagged as 🔴 **Critical**, the system activates the urgent notification pipeline.

### Notification Cascade — Critical Results

| Recipient | Channel | Message | Timing |
|-----------|---------|---------|--------|
| Doctor | SSE (dashboard) | 🔴 CRITICAL badge on case queue item | Immediate |
| Doctor | Push notification | "URGENT: Critical lab result for [AnonymousID]. Review immediately." | Immediate |
| Doctor | WhatsApp | "🔴 Critical lab result uploaded. Please review in your dashboard." | Immediate |
| Coordinator | SSE (admin dashboard) | 🔴 CRITICAL alert in activity feed | Immediate |
| Coordinator | Push notification | "URGENT: Critical lab result — Order #[ID]" | Immediate |
| Patient | Push notification | "Important results detected. Your doctor is being notified urgently." | Immediate |
| Patient | WhatsApp | "Your lab results have important findings. Your doctor will review them shortly." | Immediate |

**Note:** Patient notifications for critical values use careful, non-alarming language. The patient is NOT told the specific critical value — only that important results were found and the doctor is reviewing them.

### Doctor Dashboard Behavior

- Case queue item shows 🔴 **CRITICAL** badge (red, pulsing)
- Lab Results tab in case review shows critical values with red background row
- Critical values are sorted to the top of the results summary

### Non-Critical Results — Standard Notifications

| Recipient | Channel | Message |
|-----------|---------|---------|
| Doctor | SSE (dashboard) | 🟣 "Lab results ready" badge on case |
| Patient | Push + WhatsApp + Email (with PDF) | "Your lab results are ready. Your doctor will review them shortly." |
| Coordinator | SSE (admin) | Activity feed entry |

---

## 11. Report Issue Flow

### When Available

The **"Report Issue"** button is available on any sample card in the **Processing** tab (both "Awaiting Processing" and "Currently Processing" sections). It can also appear on cards in the **Incoming** tab after a sample is received.

### Issue Reporting Modal

```
┌──────────────────────────────────────┐
│  ⚠️ REPORT ISSUE                     │
│                                       │
│  Sample: ONY-2026-0044               │
│                                       │
│  Select reason:                       │
│                                       │
│  ( ) Insufficient sample              │
│  ( ) Hemolyzed sample                 │
│  ( ) Wrong tube type                  │
│  ( ) Mislabeled sample                │
│  ( ) Sample leaked/damaged            │
│  ( ) Other                            │
│                                       │
│  Additional notes:                    │
│  ┌────────────────────────────────┐  │
│  │ (Optional — describe the issue)│  │
│  └────────────────────────────────┘  │
│                                       │
│  [Cancel]            [Report Issue]   │
│                                       │
└──────────────────────────────────────┘
```

### Issue Reasons (Enum)

```typescript
enum SampleIssueReason {
  INSUFFICIENT_SAMPLE = 'INSUFFICIENT_SAMPLE',
  HEMOLYZED = 'HEMOLYZED',
  WRONG_TUBE = 'WRONG_TUBE',
  MISLABELED = 'MISLABELED',
  SAMPLE_LEAKED = 'SAMPLE_LEAKED',
  OTHER = 'OTHER'
}
```

### Post-Report Flow

1. Status → `SAMPLE_ISSUE`
2. **Coordinator gets URGENT alert** (push + SSE): "⚠️ Sample issue: [reason] — [SampleID]"
3. System **auto-creates a new lab order** for recollection:
   - New `LabOrder` record with status `ORDERED`
   - `parentLabOrderId` links to the original failed order
   - Same tests, same patient, same doctor
   - **No charge to patient** — recollection at platform's cost
4. Original order card shows "Issue Reported" status with reason
5. New order appears in admin dashboard's Lab Orders tab with "Recollection" badge
6. Patient is notified: "We need to collect a new sample. Our team will contact you to schedule."
7. Audit log entry: `lab_reported_sample_issue`

---

## 12. Sample ID Format & Display

### Format

```
ONY-{YEAR}-{SEQUENTIAL_4_DIGIT}
```

> **⚠️ Cross-Document Format Note:**
> All examples across PORTAL-LAB.md, onlyou-spec-resolved-v4.md, and other portal docs consistently use 4-digit sequences (e.g., `ONY-2026-0045`). The implementation should use 4-digit zero-padded sequential IDs, giving a capacity of 9,999 samples per year — sufficient for MVP scale. If volume exceeds this, the format can be extended.

**Examples:**
- `ONY-2026-0001`
- `ONY-2026-0045`
- `ONY-2026-1234`

### Display Component

The `SampleIdDisplay` component renders the ID in a monospace font with clear spacing for easy verbal communication (e.g., when a nurse calls the lab to confirm delivery):

```tsx
// SampleIdDisplay.tsx
<span className="font-mono text-lg tracking-wider font-semibold">
  ONY-2026-0045
</span>
```

### Where Sample IDs Appear

| Portal | Where | Notes |
|--------|-------|-------|
| Lab portal | Every sample card, detail view, upload form | Primary identifier |
| Nurse portal | Deliver to Lab confirmation | Nurse reads ID to lab staff |
| Admin dashboard | Lab Orders tab | Admin can search by sample ID |
| Patient app | Activity tab (lab tracking stepper) | Patient sees sample ID for reference |
| Doctor dashboard | Lab Results tab | Doctor references when reviewing |

---

## 13. Notification System (Lab)

### Inbound Notifications (Lab Receives)

| Event | Source | Channel | Message |
|-------|--------|---------|---------|
| New sample delivered | Nurse portal | SSE + Push | "New sample delivered: ONY-2026-0045 — 3 tubes — Priya N." |
| Urgent sample delivered | Nurse portal | SSE + Push | "🔴 URGENT sample delivered: ONY-2026-0046 — process immediately" |
| SLA reminder | BullMQ job | Push | "Sample ONY-2026-0044 received 20 hours ago — results expected within 48 hours" |
| Recollection assigned | System | SSE + Push | "Recollection sample incoming: ONY-2026-0050 (replaces ONY-2026-0044)" |

### Outbound Events (Lab Triggers)

| Lab Action | Triggers | Recipients |
|------------|----------|------------|
| Mark Received | Status → `SAMPLE_RECEIVED` | Patient (push + WhatsApp), Coordinator (SSE), Doctor (SSE) |
| Start Processing | Status → `PROCESSING` | Coordinator (SSE) |
| Submit Results | Status → `RESULTS_READY` | Doctor (SSE + push + WhatsApp), Patient (push + WhatsApp + email with PDF), Coordinator (SSE) |
| Submit Results (Critical) | Status → `RESULTS_READY` + critical flag | Doctor (SSE + push + WhatsApp — URGENT), Patient (push + WhatsApp — careful language), Coordinator (SSE + push — URGENT) |
| Report Issue | Status → `SAMPLE_ISSUE` | Coordinator (push — URGENT), Patient (push — reschedule notice) |

### Push Notification Configuration

- Lab portal uses standard Web Push API via service worker
- Push subscription created on first login
- Notification permission requested after first successful login (not on the login page)

---

## 14. Real-Time System (Lab Portal)

### SSE Connection

Lab portal maintains a persistent SSE connection to receive real-time updates.

**SSE endpoint:** `GET /api/sse/lab?diagnosticCentreId={id}`

**Authentication:** JWT token passed as query parameter (SSE doesn't support custom headers in EventSource API). Token validated server-side on connection establishment.

### Events Consumed

```typescript
// SSE event types the lab portal subscribes to
type LabSSEEvent =
  | { type: 'lab.sample_delivered'; data: { labOrderId: string; sampleId: string; urgency: string } }
  | { type: 'lab.order_cancelled'; data: { labOrderId: string; sampleId: string; reason: string } }
  | { type: 'lab.recollection_created'; data: { labOrderId: string; sampleId: string; replacesOrderId: string } };
```

### Events Published

```typescript
// SSE events the lab portal triggers (via API calls → Redis Pub/Sub → SSE)
type LabPublishedEvent =
  | { type: 'laborder.status_changed'; data: { labOrderId: string; newStatus: LabOrderStatus; triggeredBy: 'lab' } }
  | { type: 'laborder.results_ready'; data: { labOrderId: string; hasCritical: boolean } }
  | { type: 'laborder.issue_reported'; data: { labOrderId: string; reason: SampleIssueReason } };
```

### Reconnection Strategy

| Scenario | Behavior |
|----------|----------|
| SSE connection drops | Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s) |
| Reconnection succeeds | Fetch latest data from API to catch missed events |
| Offline for > 5 minutes | Show banner: "Connection lost. Data may be outdated. [Refresh]" |

---

## 15. tRPC API Reference

### Router: `lab.labOrder`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `list` | Query | `{ status?: LabOrderStatus[], page?: number, limit?: number }` | `{ items: LabOrderForLab[], total: number }` | List lab orders for this diagnostic centre |
| `getById` | Query | `{ id: string }` | `LabOrderForLab` | Get single lab order detail |
| `markReceived` | Mutation | `{ id: string, tubeCountReceived: number, discrepancyNote?: string }` | `LabOrderForLab` | Mark sample as received by lab |
| `startProcessing` | Mutation | `{ id: string }` | `LabOrderForLab` | Mark sample as processing started |
| `submitResults` | Mutation | `{ id: string, resultPdfUrl: string, resultFlags: ResultFlag[] }` | `LabOrderForLab` | Upload results + flag each test |
| `reportIssue` | Mutation | `{ id: string, reason: SampleIssueReason, notes?: string }` | `LabOrderForLab` | Report a sample issue |

### Router: `lab.upload`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `getPresignedUrl` | Query | `{ fileName: string, contentType: string }` | `{ uploadUrl: string, fileUrl: string }` | Get S3 presigned URL for PDF upload |

### Router: `lab.profile`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `getMe` | Query | `{}` | `{ user: LabStaff, centre: DiagnosticCentre }` | Get current lab staff profile + centre info |

### Middleware Chain

All lab portal tRPC procedures pass through:

```
authMiddleware → roleCheck('lab') → diagnosticCentreScope → auditLog → procedure
```

1. **authMiddleware** — validates JWT, extracts user
2. **roleCheck('lab')** — confirms user role is `lab`
3. **diagnosticCentreScope** — auto-adds `WHERE diagnosticCentreId = ?` to all queries
4. **auditLog** — logs action to AuditLog table (append-only)

---

## 16. Privacy & Data Access Rules (RBAC)

### CASL.js Rules for Lab Role

```typescript
// Lab staff RBAC rules
const labAbilities = defineAbility((can, cannot) => {
  // Lab staff can read lab orders assigned to their diagnostic centre
  can('read', 'LabOrder', { diagnosticCentreId: user.diagnosticCentreId });

  // Lab staff can update lab order status (receive, process, upload, report issue)
  can('update', 'LabOrder', ['status', 'tubeCountReceived', 'resultPdfUrl', 'resultFlags', 'processingStartedAt', 'resultsUploadedAt'],
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

### Data Scoping Summary

| Data | Lab Can See | Lab Cannot See |
|------|-------------|----------------|
| Sample ID | ✅ | — |
| Anonymous patient ID | ✅ | — |
| Tests ordered | ✅ | — |
| Tube count | ✅ | — |
| Nurse name (who delivered) | ✅ | — |
| Lab-specific notes (e.g., "Fasting") | ✅ | — |
| Urgency level | ✅ | — |
| Patient name | — | ❌ |
| Patient phone | — | ❌ |
| Patient address | — | ❌ |
| Patient diagnosis / condition | — | ❌ |
| Doctor name / notes | — | ❌ |
| AI assessment | — | ❌ |
| Questionnaire data | — | ❌ |
| Prescription data | — | ❌ |

---

## 17. Security & Session Management

### Authentication Security

| Measure | Implementation |
|---------|---------------|
| OTP rate limiting | Max 3 OTP requests per phone per 15 minutes |
| OTP expiry | 5 minutes |
| OTP attempts | Max 5 wrong attempts → locked for 30 minutes |
| JWT signing | RS256 with rotated keys |
| Refresh token | `httpOnly`, `Secure`, `SameSite=Strict` cookie |
| Token blacklisting | On logout — JWT JTI stored in Redis SET with TTL matching remaining lifetime |
| CORS | Only `lab.onlyou.life` origin allowed |
| CSP | Strict Content Security Policy headers |
| Idle session timeout | 12 hours of no API activity → session terminated, redirect to login |

### Data Security

| Measure | Implementation |
|---------|---------------|
| Lab results storage | S3 bucket `onlyou-lab-results` with SSE-KMS encryption |
| PDF access | CloudFront signed URLs, 1-hour expiry |
| API scoping | All queries auto-filtered by `diagnosticCentreId` from JWT |
| Audit logging | Every action logged (append-only, no UPDATE/DELETE) |
| DPDPA consent | Lab processing covered under patient's `LAB_PROCESSING` consent record |

---

## 18. Error States & Edge Cases

### Network Errors

| Scenario | Behavior |
|----------|----------|
| API call fails (network) | Toast: "Network error. Please try again." + Retry button |
| API call fails (500) | Toast: "Something went wrong. Please try again." + auto-retry once |
| API call fails (403) | Redirect to login (token expired or invalid) |
| API call fails (409 — conflict) | Toast: "This sample was already updated. Refreshing..." + refetch data |
| PDF upload fails | Toast: "Upload failed. Please try again." + file preserved for retry |
| PDF upload times out | Toast: "Upload timed out. Check your internet and try again." |

### Business Logic Edge Cases

| Scenario | Behavior |
|----------|----------|
| Sample cancelled while lab is viewing it | SSE event → Toast: "Order cancelled by coordinator" → card removed from list |
| Same sample received by two lab staff simultaneously | Server-side optimistic locking — second request gets 409 Conflict |
| Lab tries to upload results for sample still in "Received" (not processing) | Auto-transition to "Processing" first, then allow upload |
| Lab uploads results but PDF upload to S3 fails | Block submit — PDF is required. Show upload retry. |
| Lab marks 0 tubes received | Validation error: "Tube count must be at least 1. Use 'Report Issue' if no usable tubes." |
| Lab tries to process sample from another diagnostic centre | 403 Forbidden (RBAC blocks it before reaching business logic) |
| Very long test list (>10 tests) | Scrollable form with sticky "Next/Submit" button at bottom |
| Lab staff's account deactivated while logged in | Next API call returns 403 → redirect to login → login fails with "Account deactivated" |

### Validation Rules

| Field | Rule |
|-------|------|
| Tube count received | Integer, ≥ 1 |
| Result value | Free text, max 100 characters |
| Result status | Required for every test in the panel |
| PDF file | Max 10 MB, accepted types: `application/pdf`, `image/jpeg`, `image/png` |
| Issue notes | Optional free text, max 500 characters |
| Issue reason | Required — must select from predefined list |

---

## 19. Responsive Design & Layout

### Design Philosophy

**Mobile-first** (not mobile-only). Lab technicians primarily use tablets and phones at the counter, but some labs have desktop workstations.

### Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, bottom nav, full-width cards |
| Tablet | 640px – 1024px | Single column with wider cards, larger touch targets |
| Desktop | > 1024px | Two-column layout (list + detail panel side by side) |

### Mobile Design Rules

- **Touch targets:** Minimum 48x48px for all interactive elements
- **Bottom nav:** Fixed at bottom, always visible (no scroll-away)
- **Cards:** Full-width with generous padding (16px)
- **"Mark Received" / "Submit Results" buttons:** Full-width, minimum 56px height, bold text
- **Font sizes:** Minimum 16px for body text (prevents iOS zoom on input focus)
- **Input fields:** 48px minimum height for comfortable typing
- **Scrolling:** Native momentum scroll, no custom scroll behaviors

### Desktop Additions

- Two-column split view: sample list on left (40%), detail panel on right (60%)
- Clicking a sample card in the list opens its detail in the right panel
- Keyboard shortcuts for power users: `R` = Mark Received, `P` = Start Processing

### Color System

| Element | Color | Usage |
|---------|-------|-------|
| Primary | `#7C3AED` (Violet-600) | Buttons, active tab, primary actions |
| Success | `#10B981` (Emerald-500) | ✅ Normal results, completed states |
| Warning | `#F59E0B` (Amber-500) | ⚠️ Abnormal results, time warnings |
| Critical | `#EF4444` (Red-500) | 🔴 Critical results, urgent badges, issues |
| Background | `#F9FAFB` (Gray-50) | Page background |
| Card | `#FFFFFF` | Card backgrounds |
| Text primary | `#111827` (Gray-900) | Headings, primary text |
| Text secondary | `#6B7280` (Gray-500) | Timestamps, secondary info |

---

## 20. Analytics Events

### Events Tracked

| Event | Trigger | Properties |
|-------|---------|------------|
| `lab.login` | Successful login | `centreId`, `userId` |
| `lab.sample_received` | Mark Received tapped | `labOrderId`, `sampleId`, `tubeCount`, `hasDiscrepancy` |
| `lab.processing_started` | Start Processing tapped | `labOrderId`, `sampleId`, `waitTimeMinutes` (time since received) |
| `lab.results_uploaded` | Submit Results confirmed | `labOrderId`, `sampleId`, `testCount`, `normalCount`, `abnormalCount`, `criticalCount`, `processingTimeMinutes` |
| `lab.issue_reported` | Report Issue submitted | `labOrderId`, `sampleId`, `reason` |
| `lab.tab_changed` | Bottom nav tab tapped | `fromTab`, `toTab` |
| `lab.pdf_upload_started` | PDF upload initiated | `labOrderId`, `fileType`, `fileSize` |
| `lab.pdf_upload_completed` | PDF successfully uploaded to S3 | `labOrderId`, `uploadTimeMs` |
| `lab.pdf_upload_failed` | PDF upload failed | `labOrderId`, `error` |

### Key Metrics (for Admin Dashboard)

| Metric | Calculation | Purpose |
|--------|-------------|---------|
| Average receive time | Time from `DELIVERED_TO_LAB` to `SAMPLE_RECEIVED` | How quickly lab acknowledges samples |
| Average processing time | Time from `SAMPLE_RECEIVED` to `RESULTS_READY` | Lab turnaround |
| Issue rate | Issues reported / total samples received | Lab quality indicator |
| Critical result rate | Critical results / total results uploaded | Clinical significance tracking |

---

## 21. Integration with Other Portals

### How Lab Portal Connects to the Ecosystem

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

### Upstream Triggers (What Creates Work for Lab)

| Trigger | Source | Lab Portal Effect |
|---------|--------|-------------------|
| Doctor orders blood work | Doctor portal | `LabOrder` created (status: `ORDERED`) — not yet visible to lab |
| Coordinator assigns lab | Admin dashboard | `diagnosticCentreId` set on `LabOrder` — still not visible (nurse hasn't collected yet) |
| Nurse delivers sample | Nurse portal | Status → `DELIVERED_TO_LAB` — **NOW visible in Lab portal Incoming tab** |

### Downstream Effects (Lab Actions Affect Others)

| Lab Action | Doctor Portal | Patient App | Admin Dashboard |
|------------|--------------|-------------|-----------------|
| Mark Received | No change | "Lab received your sample" push | Status badge update |
| Start Processing | No change | No notification | Status badge update |
| Submit Results (normal) | 🟣 "Lab results ready" badge | Push + WhatsApp + email with PDF | Activity feed entry |
| Submit Results (critical) | 🔴 CRITICAL badge (pulsing) | Push + WhatsApp (careful wording) | 🔴 URGENT activity feed entry |
| Report Issue | No direct notification | "We need a new sample" push | ⚠️ URGENT alert + auto-recollection order |

### Self-Upload Bypass

When a patient uploads their own lab results (instead of using the platform's lab collection service), the lab portal is completely bypassed:

```
Doctor orders blood work → Patient chooses "I already have results"
→ Patient uploads PDF → Status → RESULTS_UPLOADED (bypasses lab entirely)
→ Doctor reviews (banner: "Patient self-uploaded — verify authenticity")
```

The lab portal never sees self-uploaded results.

---

## 22. Lab Order Lifecycle — Complete Status Flow

### Full Status Flow (All Actors)

```
DOCTOR ORDERS BLOOD WORK
        │
        ▼
   ┌─────────┐
   │ ORDERED  │ ← Doctor created order
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
        │ Nurse visits home, collects blood
        ▼
┌─────────────────┐
│SAMPLE_COLLECTED  │ ← Nurse marked collected (tube count recorded)
└────────┬────────┘
         │ Nurse delivers to diagnostic centre
         ▼
┌──────────────────┐
│DELIVERED_TO_LAB  │ ← Nurse selected lab + confirmed delivery
└────────┬─────────┘     *** LAB PORTAL STARTS HERE ***
         │ Lab confirms receipt
         ▼
┌──────────────────┐
│ SAMPLE_RECEIVED  │ ← Lab staff tapped "Mark Received"
└────────┬─────────┘
         │ Lab begins processing
         ▼
  ┌────────────┐
  │ PROCESSING │ ← Lab staff tapped "Start Processing"
  └─────┬──────┘
        │ Lab uploads results
        ▼
 ┌──────────────┐
 │RESULTS_READY │ ← Lab staff submitted results + PDF
 └──────┬───────┘     *** LAB PORTAL ENDS HERE ***
        │ Doctor reviews
        ▼
┌─────────────────┐
│DOCTOR_REVIEWED  │ ← Doctor reviewed + took action (prescribe/follow-up)
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │ CLOSED │ ← Order complete
    └────────┘


SPECIAL PATHS:

         ┌────────────────────────┐
         │ Patient Self-Upload     │
         │ (bypasses lab entirely) │
         └───────────┬────────────┘
                     ▼
          ┌────────────────────┐
          │ RESULTS_UPLOADED   │ → Doctor reviews
          └────────────────────┘

         ┌────────────────────────┐
         │ Lab Reports Issue       │
         │ (at any lab stage)      │
         └───────────┬────────────┘
                     ▼
          ┌────────────────────┐
          │  SAMPLE_ISSUE      │ → Auto-recollection order created
          └────────────────────┘

         ┌────────────────────────┐
         │ Nurse Can't Collect     │
         └───────────┬────────────┘
                     ▼
          ┌────────────────────┐
          │ COLLECTION_FAILED  │ → Coordinator reschedules
          └────────────────────┘

         ┌────────────────────────┐
         │ Coordinator Cancels     │
         └───────────┬────────────┘
                     ▼
          ┌────────────────────┐
          │    CANCELLED       │ → Order closed, no further action
          └────────────────────┘
```

### Status Transitions — Lab Portal Scope

| Current Status | Action | New Status | Who |
|---------------|--------|------------|-----|
| `DELIVERED_TO_LAB` | Mark Received | `SAMPLE_RECEIVED` | Lab staff |
| `SAMPLE_RECEIVED` | Start Processing | `PROCESSING` | Lab staff |
| `PROCESSING` | Submit Results | `RESULTS_READY` | Lab staff |
| `DELIVERED_TO_LAB` / `SAMPLE_RECEIVED` / `PROCESSING` | Report Issue | `SAMPLE_ISSUE` | Lab staff |

### Invalid Transitions (Server Rejects)

| Attempted Transition | Why Blocked |
|---------------------|-------------|
| `DELIVERED_TO_LAB` → `PROCESSING` | Must receive first |
| `DELIVERED_TO_LAB` → `RESULTS_READY` | Must receive and process first |
| `RESULTS_READY` → `PROCESSING` | Cannot go backwards |
| `SAMPLE_ISSUE` → any | Issue is terminal for this order |
| `CANCELLED` → any | Cancelled is terminal |

---

## 23. SLA Thresholds & Escalation Rules

### Lab-Specific SLAs

| SLA Rule | Threshold | Escalation |
|----------|-----------|------------|
| Sample not received by lab | 2 hours after `DELIVERED_TO_LAB` | Coordinator alert: "Sample ONY-XXXX delivered 2+ hours ago, not yet received by lab" |
| Results not uploaded | 48 hours after `SAMPLE_RECEIVED` | Coordinator alert: "Lab results overdue 48hrs — Contact lab" |
| Urgent results not uploaded | 12 hours after `SAMPLE_RECEIVED` (for urgent orders) | Coordinator alert: "URGENT lab results overdue 12hrs" |
| Doctor hasn't reviewed results | 24 hours after `RESULTS_READY` | Coordinator alert: "Doctor hasn't reviewed results — Remind doctor" |

### Full Lab Order SLA Chain

> **⚠️ Cross-Document SLA Note:**
> The "Sample delivered to lab: 4 hours" SLA below aligns with PORTAL-NURSE-FIXED.md's SLA Thresholds. Ensure this SLA is also added to PORTAL-ADMIN.md's SLA Configuration (Section 30) so it is configurable and enforced by the admin SLA engine.

| Stage | Max Time | Monitored By |
|-------|----------|-------------|
| Patient books slot after order | 7 days | BullMQ job → Admin alert |
| Nurse assigned after booking | 2 hours | BullMQ job → Admin alert |
| Nurse collects sample | Per scheduled slot | Nurse Running Late flow |
| Sample delivered to lab | 4 hours after collection | Nurse Deliver to Lab flow |
| Lab receives sample | 2 hours after delivery | BullMQ job → Admin alert |
| Lab uploads results | 48 hours (routine) / 12 hours (urgent) | BullMQ job → Admin alert |
| Doctor reviews results | 24 hours after upload | BullMQ job → Admin alert |

### BullMQ SLA Check Job

```
Job: sla-check
Schedule: Every 15 minutes (repeatable)
Priority: High
Actions:
  1. Query all LabOrders with status in [DELIVERED_TO_LAB, SAMPLE_RECEIVED, PROCESSING, RESULTS_READY]
  2. For each, check if time since last status change exceeds threshold
  3. If breached → create notification for coordinator
  4. If already notified once → escalate (higher urgency notification)
  5. Dashboard shows SLA indicator: 🟢 green (on track) / 🟡 yellow (approaching) / 🔴 red (breached)
```

---

## 24. Test Panels by Condition

### Standard Panels

| Condition | Panel Name | Tests Included | Price |
|-----------|-----------|----------------|-------|
| Hair Loss | Extended Hair Panel | TSH, Free T4, Ferritin, Vitamin D, DHT, Hemoglobin, Iron studies | ₹1,200 |
| ED | Basic Health Check | Testosterone (total + free), Fasting glucose, HbA1c, Lipid panel | ₹800 |
| PE | Basic Health Check | Same as ED — Testosterone, glucose, lipids | ₹800 |
| PE | Thyroid Check | TSH, Free T3, Free T4 | ₹350 |
| PE | Hormonal | Testosterone, Prolactin | ₹800 |
| PE | Prostate | PSA, urine culture | ₹500 |
| PE | Combined | TSH, Free T3, Free T4, Testosterone, Prolactin, PSA, urine culture | ₹1,500 |
| Weight | Metabolic Panel | HbA1c, Fasting glucose, Lipid panel, Liver function, Kidney function, Thyroid | ₹1,800 |
| PCOS | PCOS Screen Panel | FSH, LH, Estradiol, Testosterone, DHEA-S, Prolactin, Fasting glucose, Lipid panel, Insulin | ₹1,500 |

### Follow-Up Panels

Follow-up panels are subsets of the initial panel — the doctor selects specific tests from a checklist. Price varies by test selection (₹600–₹1,200 typical range).

### Pricing Model

- **First panel:** INCLUDED in patient's subscription (for verticals where blood work is clinically indicated)
- **Follow-up panels:** ₹800–₹4,500 depending on panel (charged separately via Razorpay)
- **Patient self-upload:** Free (no collection cost, no lab cost)
- Lab portal does NOT display pricing — pricing is between the platform and the patient

---

## 25. Build & Deployment

### Local Development

```bash
# From monorepo root
pnpm --filter lab-portal dev

# Runs on http://localhost:3004
# Hot reload enabled
# Connects to local API server (http://localhost:3000)
```

### Environment Variables

```env
# .env.local (lab-portal)
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SSE_URL=http://localhost:3000/api/sse/lab
NEXT_PUBLIC_SENTRY_DSN=...              # Error tracking
NEXT_PUBLIC_APP_ENV=development          # development | staging | production
```

### Production Deployment

| Aspect | Configuration |
|--------|---------------|
| Hosting | AWS ECS Fargate (same cluster as other portals) |
| Domain | `lab.onlyou.life` |
| CDN | CloudFront (static assets + PDF signed URLs) |
| SSL | ACM certificate, auto-renewed |
| Container | Next.js standalone output in Docker |
| Health check | `/api/health` endpoint |
| Scaling | Min 1, Max 3 tasks (lab traffic is low volume) |

### Test Seed Data

The seed script creates:
- 1 test diagnostic centre: "PathLab Plus, Bangalore"
- 1 test lab staff user: `lab@test.onlyou.life` / `+919999900005`
- Sample lab orders at various statuses (DELIVERED_TO_LAB, SAMPLE_RECEIVED, PROCESSING, RESULTS_READY)
- Sample result PDFs in test S3 bucket

---

## 26. Testing Checklist

### Authentication

- [ ] Can enter phone number and receive OTP via WhatsApp
- [ ] Can fall back to SMS OTP
- [ ] Can enter OTP and login successfully
- [ ] JWT stored in memory, refresh token in httpOnly cookie
- [ ] Session persists across page reload (refresh token works)
- [ ] Logging out clears all tokens and redirects to login
- [ ] Cannot access any page without valid JWT
- [ ] Lab staff from Centre A cannot see Centre B's orders

### Tab 1: Incoming

- [ ] Incoming samples appear when nurse delivers to this lab
- [ ] Sample card shows: sample ID, tests, nurse name, delivery time, tube count, notes
- [ ] Urgent samples show red badge
- [ ] "Mark Received" opens confirmation modal
- [ ] Tube count confirmation works (pre-filled with expected count)
- [ ] Tube count mismatch shows discrepancy warning
- [ ] Receiving sample → status changes to SAMPLE_RECEIVED
- [ ] Patient receives "Lab received your sample" notification
- [ ] Sample card moves from Incoming to Processing tab
- [ ] Empty state shown when no incoming samples

### Tab 2: Processing

- [ ] Received samples show "Start Processing" button
- [ ] Tapping "Start Processing" transitions to PROCESSING status
- [ ] Processing samples show "Upload Results" button
- [ ] Processing samples show elapsed time since processing started
- [ ] Time warnings appear (amber at 2+ hours, red at 24+ hours)
- [ ] "Report Issue" opens issue modal
- [ ] Samples sorted: urgent first, then by wait time

### Tab 3: Upload Results

- [ ] Can capture PDF via camera
- [ ] Can select PDF via file picker
- [ ] File size validation (max 10 MB)
- [ ] File type validation (PDF, JPG, PNG only)
- [ ] Each test shows name, value input, status flag radio buttons
- [ ] All tests must have status flag before submit
- [ ] Critical flag shows warning about urgent notifications
- [ ] Review screen shows summary of all results
- [ ] Submit confirmation dialog works
- [ ] After submit: status → RESULTS_READY
- [ ] Doctor receives notification (normal = 🟣, critical = 🔴)
- [ ] Patient receives notification with PDF link
- [ ] Recently uploaded section shows completed results

### Report Issue

- [ ] Issue reason picker shows all 6 options
- [ ] "Other" allows free text notes
- [ ] Reporting issue → status changes to SAMPLE_ISSUE
- [ ] Coordinator receives URGENT notification
- [ ] System auto-creates recollection order
- [ ] Patient receives "need new sample" notification

### Real-Time

- [ ] New sample delivery appears without page refresh (SSE)
- [ ] Tab badges update in real-time
- [ ] Order cancellation removes card from list (SSE)
- [ ] SSE reconnects automatically after disconnect

### PWA

- [ ] Install prompt appears on first visit
- [ ] Portal can be installed to home screen
- [ ] App opens in standalone mode (no browser chrome)
- [ ] Static assets cached for fast loading

### Privacy

- [ ] No patient names visible anywhere in the portal
- [ ] No patient phone numbers visible
- [ ] No patient addresses visible
- [ ] No diagnosis or condition names visible
- [ ] Only anonymous ID (ONY-P-XXXX) shown for patient references
- [ ] API responses do not include hidden fields (even in network inspector)

---

## 27. Appendix: Complete Status Flow Diagram

### Patient-Visible Tracking Stepper

The patient sees this stepper in the Activity tab of their app:

```
Ordered                    ✅ Done     "Your doctor ordered blood tests"
    │
Slot Booked               ✅ Done     "Home collection scheduled for 28 Feb, 8-10 AM"
    │
Nurse Assigned            ✅ Done     "Priya N. will visit you"
    │
Sample Collected          ✅ Done     "Sample collected successfully"
    │
At Lab                    🔵 Current  "Lab received your sample"
    │
Results Ready             ⚪ Upcoming "Your results will be uploaded here"
    │
Doctor Reviewed           ⚪ Upcoming "Your doctor will review the results"
```

### Lab-Internal Status Mapping

| Lab Order Status | Incoming Tab | Processing Tab | Upload Tab |
|-----------------|-------------|---------------|------------|
| `DELIVERED_TO_LAB` | ✅ Shown | — | — |
| `SAMPLE_RECEIVED` | — | ✅ Shown (Awaiting Processing) | — |
| `PROCESSING` | — | ✅ Shown (Currently Processing) | ✅ Shown (Ready for Upload) |
| `RESULTS_READY` | — | — | ✅ Shown (Recently Uploaded) |
| `SAMPLE_ISSUE` | — | ✅ Shown (Issue badge) | — |

---

*This document is the complete build specification for the Lab Portal. It cross-references and is consistent with: PROJECT-OVERVIEW.md, ARCHITECTURE.md, PORTAL-DOCTOR.md (Section 9: Lab Results Tab, Section 13: Lab Order Flow), PORTAL-NURSE-FIXED.md (Section 14: Deliver to Lab Flow), PORTAL-ADMIN.md (Tab: Lab Orders, Tab: Partners → Diagnostic Centres), APP-PATIENT.md (Activity Tab, Lab Booking Flow), and onlyou-spec-resolved-v4.md (Section 4.5, Section 7, Section 9 Phase 4).*
