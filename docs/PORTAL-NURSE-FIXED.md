# PORTAL-NURSE.md — Nurse Portal: Complete Specification

> **Platform:** Onlyou Telehealth — Indian telehealth for stigmatized chronic conditions
> **Portal Type:** Next.js 14 (App Router) — Mobile-only PWA (Progressive Web App)
> **URL:** `nurse.onlyou.life`
> **Auth:** Phone OTP (WhatsApp primary, SMS fallback) → JWT (role: `nurse`)
> **Navigation:** Single-screen focused design (no tabs for MVP)
> **API Protocol:** tRPC (end-to-end type-safe, no codegen)
> **State Management:** Zustand + TanStack Query (tRPC integration)
> **Routing:** Next.js App Router (file-based)
> **Real-time:** SSE + Redis Pub/Sub (server → client push for new assignments, status updates)
> **Primary Device:** Mobile phone (nurses are always on the road — no desktop layout)
> **PWA:** Installable, offline-capable for viewing today's assignments
> **Local Dev Port:** `3003` (`pnpm --filter nurse-portal dev`)

---

## Table of Contents

1. [App Structure & File Layout](#1-app-structure--file-layout)
2. [Authentication & Session Management](#2-authentication--session-management)
3. [PWA Configuration & Offline Support](#3-pwa-configuration--offline-support)
4. [Role Definition & Qualifications](#4-role-definition--qualifications)
5. [Data Models](#5-data-models)
6. [Main Screen: Today's Assignments](#6-main-screen-todays-assignments)
7. [Assignment Card Design](#7-assignment-card-design)
8. [Visit Flow — Step 1: Arrive & Verify](#8-visit-flow--step-1-arrive--verify)
9. [Visit Flow — Step 2: Record Vitals](#9-visit-flow--step-2-record-vitals)
10. [Visit Flow — Step 3: Collect Sample](#10-visit-flow--step-3-collect-sample)
11. [Visit Flow — Step 4: Complete Visit](#11-visit-flow--step-4-complete-visit)
12. [Running Late Flow](#12-running-late-flow)
13. [Patient Unavailable Flow](#13-patient-unavailable-flow)
14. [Deliver to Lab Flow](#14-deliver-to-lab-flow)
15. [Past Visits & History](#15-past-visits--history)
16. [Profile & Settings](#16-profile--settings)
17. [Notification System (Nurse)](#17-notification-system-nurse)
18. [Real-Time System (Nurse Portal)](#18-real-time-system-nurse-portal)
19. [tRPC API Reference](#19-trpc-api-reference)
20. [Offline Mode & Sync Strategy](#20-offline-mode--sync-strategy)
21. [Privacy & Data Access Rules](#21-privacy--data-access-rules)
22. [Security & Session Management](#22-security--session-management)
23. [Error States & Edge Cases](#23-error-states--edge-cases)
24. [Responsive Design & Mobile UX](#24-responsive-design--mobile-ux)
25. [Analytics Events](#25-analytics-events)
26. [Phase 2 — Scaffolded but Muted Features](#26-phase-2--scaffolded-but-muted-features)
27. [Integration with Other Portals](#27-integration-with-other-portals)
28. [Build & Deployment](#28-build--deployment)
29. [Testing Checklist](#29-testing-checklist)
30. [Appendix: Complete Status Flow Diagram](#30-appendix-complete-status-flow-diagram)

---

## 1. App Structure & File Layout

### Next.js App Router Structure

```
apps/nurse-portal/
├── src/
│   ├── app/
│   │   ├── layout.tsx              → Root layout (auth provider, SSE provider, offline banner)
│   │   ├── page.tsx                → Today's assignments (default landing)
│   │   ├── login/
│   │   │   └── page.tsx            → Phone OTP login screen
│   │   ├── visit/
│   │   │   └── [id]/
│   │   │       └── page.tsx        → Visit flow (verify → vitals → collect → complete)
│   │   ├── deliver/
│   │   │   └── page.tsx            → Deliver to lab flow (batch delivery, no dynamic ID)
│   │   ├── history/
│   │   │   └── page.tsx            → Past visits (completed + failed)
│   │   └── profile/
│   │       └── page.tsx            → Nurse profile & settings
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopBar.tsx          → Top bar (nurse name, date, notification bell)
│   │   │   ├── OfflineBanner.tsx   → Offline indicator banner
│   │   │   └── BottomActions.tsx   → Persistent bottom action bar (Running Late, Help)
│   │   ├── assignments/
│   │   │   ├── AssignmentList.tsx  → Today's visit list
│   │   │   ├── AssignmentCard.tsx  → Individual assignment card
│   │   │   ├── DatePicker.tsx      → Date selector for viewing other days
│   │   │   └── EmptyState.tsx      → No assignments illustration
│   │   ├── visit/
│   │   │   ├── VisitStepper.tsx    → Step indicator (Verify → Vitals → Collect → Complete)
│   │   │   ├── VerifyStep.tsx      → Patient identity verification
│   │   │   ├── VitalsStep.tsx      → Vitals recording form
│   │   │   ├── CollectStep.tsx     → Sample collection form
│   │   │   ├── CompleteSummary.tsx → Visit summary before completion
│   │   │   └── FailedVisit.tsx     → Patient unavailable form
│   │   ├── deliver/
│   │   │   ├── LabSelector.tsx     → Select diagnostic centre
│   │   │   └── DeliveryConfirm.tsx → Confirm tube count delivery
│   │   ├── common/
│   │   │   ├── StatusBadge.tsx     → Color-coded status badges
│   │   │   ├── PhoneLink.tsx       → Tap-to-call phone link
│   │   │   ├── NavigateButton.tsx  → Open in Google Maps / Apple Maps
│   │   │   ├── VitalsDisplay.tsx   → Formatted vitals readout
│   │   │   └── LoadingSpinner.tsx  → Loading state component
│   │   └── shared/                 → Re-exported from @onlyou/ui package
│   ├── hooks/
│   │   ├── useTRPC.ts             → tRPC client hook
│   │   ├── useAuth.ts             → Auth state management
│   │   ├── useSSE.ts              → SSE connection for real-time updates
│   │   ├── useOffline.ts          → Network status detection
│   │   ├── useGeolocation.ts      → GPS capture (Phase 2 — scaffolded)
│   │   └── useSyncQueue.ts        → Offline action queue
│   ├── stores/
│   │   ├── auth.store.ts          → Zustand auth store
│   │   ├── visits.store.ts        → Zustand visits cache store
│   │   └── sync.store.ts          → Offline sync queue store
│   ├── services/
│   │   ├── trpc.ts                → tRPC client configuration
│   │   └── notifications.ts       → Push notification registration (FCM)
│   ├── lib/
│   │   ├── constants.ts           → Status enums, colors, labels
│   │   ├── validation.ts          → Vitals range validation
│   │   └── formatters.ts          → Date, time, address formatting
│   └── types/
│       └── index.ts               → Re-exported from @onlyou/types
├── public/
│   ├── manifest.json              → PWA manifest
│   ├── sw.js                      → Service worker for offline
│   ├── icons/
│   │   ├── icon-192.png           → PWA icon (192x192)
│   │   └── icon-512.png           → PWA icon (512x512)
│   └── offline.html               → Offline fallback page
├── next.config.js                  → Next.js config (PWA headers, CSP)
├── tailwind.config.ts              → Extends @onlyou/ui shared config
├── tsconfig.json
└── package.json
```

### Package Dependencies

```json
{
  "name": "@onlyou/nurse-portal",
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "@onlyou/api-client": "workspace:*",
    "@onlyou/ui": "workspace:*",
    "@onlyou/types": "workspace:*",
    "@tanstack/react-query": "^5.x",
    "@trpc/client": "^10.x",
    "@trpc/react-query": "^10.x",
    "zustand": "^4.x",
    "next-pwa": "^5.x"
  }
}
```

---

## 2. Authentication & Session Management

### Auth Flow

```
Nurse opens nurse.onlyou.life
        │
        ▼
Is JWT token in localStorage?
        │
        ├── NO → Show login screen
        │         │
        │         ▼
        │   Enter phone number (+91)
        │         │
        │         ▼
        │   Server sends OTP via WhatsApp (primary) / SMS (fallback)
        │         │
        │         ▼
        │   Nurse enters 6-digit OTP
        │         │
        │         ▼
        │   Server validates OTP → checks user role = NURSE
        │         │
        │         ├── Role ≠ NURSE → "Access denied. This portal is for nurses only."
        │         │
        │         └── Role = NURSE → Issue JWT (access + refresh tokens)
        │                             │
        │                             ▼
        │                     Store tokens in localStorage
        │                     Redirect to Today's Assignments
        │
        └── YES → Validate token (not expired, role = NURSE)
                  │
                  ├── Valid → Show Today's Assignments
                  │
                  └── Expired → Attempt silent refresh
                               │
                               ├── Refresh succeeds → Continue
                               └── Refresh fails → Show login screen
```

### Login Screen

```
┌─────────────────────────────────────┐
│                                     │
│         [Onlyou Logo]               │
│                                     │
│       Nurse Portal                  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  +91  │ Enter phone number  │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Send OTP]                         │
│                                     │
│  ─── After OTP sent ───            │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  ○ ○ ○ ○ ○ ○                │    │
│  └─────────────────────────────┘    │
│                                     │
│  Didn't receive? [Resend] (30s)     │
│  [Try SMS instead]                  │
│                                     │
│  [Verify & Login]                   │
│                                     │
└─────────────────────────────────────┘
```

### Login API

```typescript
// Step 1: Request OTP
trpc.auth.requestOTP.mutate({
  phone: '+919999900004',
  channel: 'whatsapp'  // 'whatsapp' | 'sms'
})
// Returns: { success: true, expiresInSeconds: 300 }

// Step 2: Verify OTP
trpc.auth.verifyOTP.mutate({
  phone: '+919999900004',
  otp: '123456'
})
// Returns: { accessToken, refreshToken, user: { id, name, role: 'NURSE', ... } }
```

### Token Management

| Aspect | Implementation |
|--------|---------------|
| Access token | JWT, stored in memory (Zustand store) + localStorage backup |
| Refresh token | JWT, stored in HttpOnly cookie (set by server) — **no localStorage fallback** (per ARCHITECTURE.md) |
| Access token expiry | 15 minutes |
| Refresh token expiry | 30 days (nurses are staff — same as doctor/admin per ARCHITECTURE.md) |
| Silent refresh | Auto-refresh when access token has <2 minutes remaining |
| Token rotation | Every refresh generates new token pair |
| Logout | Clear local storage + call `trpc.auth.logout.mutate()` to blacklist refresh token |

### Session Security

| Measure | Implementation |
|---------|---------------|
| HttpOnly cookies | Refresh token not accessible via JavaScript |
| SameSite=Strict | CSRF protection |
| Secure flag | Cookies only sent over HTTPS |
| Token rotation | Every refresh generates new token pair |
| Theft detection | Old refresh token reuse → all nurse's tokens revoked |
| Idle timeout | 12 hours (nurses work long shifts, intermittent use) |
| IP logging | Login IP recorded in audit log |
| Concurrent sessions | Not allowed — new login invalidates previous session (single device expected) |

---

## 3. PWA Configuration & Offline Support

### PWA Manifest (`public/manifest.json`)

```json
{
  "name": "Onlyou Nurse",
  "short_name": "Nurse",
  "description": "Onlyou Nurse Portal — Home blood collection & vitals",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FFFFFF",
  "theme_color": "#0F766E",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Service Worker Strategy

| Resource | Cache Strategy | Rationale |
|----------|---------------|-----------|
| App shell (HTML, CSS, JS) | Cache-first, background update | Fast load on repeat visits |
| Today's assignments | Network-first, cache fallback | Show stale data if offline |
| Visit flow pages | Cache-first after first load | Must work mid-visit if signal drops |
| API calls (mutations) | Queue if offline, sync on reconnect | Never lose a vitals recording |
| Images / static assets | Cache-first, long TTL | Reduce data usage |

### Install Prompt

On first visit, show a banner:

```
┌─────────────────────────────────────┐
│  📱 Add to Home Screen              │
│  Get quick access to your visits    │
│  [Install]  [Maybe Later]           │
└─────────────────────────────────────┘
```

- Banner dismisses after 3 declines (cookie-stored)
- Also accessible from browser menu (Android: "Add to Home screen")

### Next.js PWA Config

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.onlyou\.life\/trpc/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 }, // 1 hour
      },
    },
  ],
});

module.exports = withPWA({
  // Next.js config
});
```

---

## 4. Role Definition & Qualifications

### Nurse Role (Replaces Phlebotomist from v3 Specs)

**Title:** Nurse (male or female)

**Qualifications:**
- GNM (General Nursing and Midwifery), OR
- BSc Nursing, OR
- ANM (Auxiliary Nurse Midwife), OR
- Other (with documented approval)

Certification document stored in S3 (`onlyou-documents` bucket).

### Scope for MVP (Active)

| Capability | Details |
|-----------|---------|
| Home visit blood collection | Full phlebotomy — locate vein, draw blood, label tubes |
| Patient vitals recording | BP, pulse, SpO2, weight, temperature |
| Basic patient education | Medication usage guidance, when to contact doctor |
| Sample transport | Deliver labeled samples to assigned diagnostic centre |
| Patient identity verification | Name match at door |
| Navigation & communication | Call patient, navigate to address, report delays |

### Scope for Phase 2 (Scaffolded, Feature-Flagged)

| Capability | Details |
|-----------|---------|
| Injection administration | GLP-1 (semaglutide), future TRT |
| Proof of Administration | Timestamped photo, digital signature |
| Post-injection observation | 30-minute timer with vital checks |
| Three-way video bridge | Connect patient + nurse + doctor |
| Wound care / dressing | Follow-up wound care |
| Comprehensive patient assessment | Full nursing assessment form |
| GPS check-in | Automated location verification at visit |

### What Nurses Can See (Privacy Boundary)

| Data | Visible | Not Visible |
|------|---------|-------------|
| Patient name | ✅ | |
| Patient address (visit only) | ✅ | |
| Patient phone | ✅ | |
| Tests to be collected | ✅ | |
| Special instructions (fasting, etc.) | ✅ | |
| Scheduled time slot | ✅ | |
| Assigned diagnostic centre | ✅ | |
| Patient diagnosis / condition | ❌ | Not shown |
| Questionnaire responses | ❌ | Not shown |
| AI assessment | ❌ | Not shown |
| Prescription details | ❌ | Not shown |
| Doctor notes | ❌ | Not shown |
| Payment / subscription info | ❌ | Not shown |
| Other patients' data | ❌ | Not shown |

---

## 5. Data Models

### Nurse Model

```prisma
model Nurse {
  id                       String    @id @default(uuid())
  userId                   String    @unique
  user                     User      @relation(fields: [userId], references: [id])
  
  name                     String
  phone                    String    @unique
  email                    String?
  gender                   Gender    // MALE, FEMALE, OTHER
  
  // Qualifications
  qualification            NurseQualification  // GNM, BSC_NURSING, ANM, OTHER
  certificationDocUrl      String              // S3 path
  certificationNumber      String
  
  // Availability
  availableDays            DayOfWeek[]         // [MON, TUE, WED, ...]
  availableTimeStart       String              // "07:00"
  availableTimeEnd         String              // "17:00"
  maxDailyVisits           Int       @default(5)
  
  // Service Area
  currentCity              String
  serviceableAreas         String[]            // Array of pincode strings
  
  // Performance
  completedVisits          Int       @default(0)
  failedVisits             Int       @default(0)
  rating                   Float?              // Calculated average
  
  // Phase 2 (scaffolded)
  canAdministerInjections  Boolean   @default(false)
  
  // Status
  isActive                 Boolean   @default(true)
  
  // Relations
  visits                   NurseVisit[]
  
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt
}
```

### NurseVisit Model

```prisma
model NurseVisit {
  id                       String            @id @default(uuid())
  nurseId                  String
  nurse                    Nurse             @relation(fields: [nurseId], references: [id])
  patientId                String
  patient                  User              @relation(fields: [patientId], references: [id])
  labOrderId               String?
  labOrder                 LabOrder?         @relation(fields: [labOrderId], references: [id])
  
  // Visit Type
  visitType                NurseVisitType    // BLOOD_COLLECTION, INJECTION_ADMIN, VITALS_ONLY, FOLLOW_UP
  
  // Scheduling
  scheduledDate            DateTime
  scheduledTimeSlot        String            // "07:00-10:00"
  visitAddress             String
  visitCity                String
  visitPincode             String
  specialInstructions      String?           // "Gate code: 1234", "Fasting required"
  
  // Status
  status                   NurseVisitStatus  // SCHEDULED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
  
  // Vitals (recorded at every visit)
  vitals                   Json?
  // Schema: {
  //   bloodPressureSystolic: number?,
  //   bloodPressureDiastolic: number?,
  //   pulseRate: number?,
  //   spO2: number?,
  //   weight: number?,
  //   temperature: number?,
  //   notes: string?
  // }
  
  // Blood Collection (if applicable)
  tubeCount                Int?
  collectionNotes          String?
  
  // Phase 2 — Injection Admin (scaffolded, muted)
  medicationAdministered   String?
  injectionSite            String?
  proofOfAdminPhotoUrl     String?
  patientSignatureUrl      String?
  postInjectionVitals      Json?
  observationMinutes       Int?
  adverseReactionNotes     String?
  
  // Running Late (Section 12 — reportLate flow)
  lateReportedAt           DateTime?
  newEta                   String?           // "09:30" — updated ETA reported by nurse
  lateReason               String?           // Free-text reason for delay
  
  // Timestamps (status transitions)
  scheduledAt              DateTime          @default(now())
  enRouteAt                DateTime?
  arrivedAt                DateTime?
  inProgressAt             DateTime?
  completedAt              DateTime?
  failedAt                 DateTime?
  failedReason             String?
  cancelledAt              DateTime?
  cancelledReason          String?
  
  // Lab delivery tracking
  deliveredToLabAt         DateTime?
  deliveredToLabId         String?
  deliveredToLab           DiagnosticCentre? @relation(fields: [deliveredToLabId], references: [id])
  deliveryTubeCount        Int?
  
  createdAt                DateTime          @default(now())
  updatedAt                DateTime          @updatedAt
}
```

### Enums

```typescript
enum NurseQualification {
  GNM           // General Nursing and Midwifery
  BSC_NURSING   // Bachelor of Science in Nursing
  ANM           // Auxiliary Nurse Midwife
  OTHER         // Other (with documented approval)
}

enum NurseVisitType {
  BLOOD_COLLECTION    // MVP: Primary use case
  INJECTION_ADMIN     // Phase 2: GLP-1, TRT
  VITALS_ONLY         // Phase 2: Standalone vitals check
  FOLLOW_UP           // Phase 2: Post-treatment check
}

enum NurseVisitStatus {
  SCHEDULED     // Nurse assigned, visit created
  EN_ROUTE      // Nurse is heading to patient
  ARRIVED       // Nurse at patient location
  IN_PROGRESS   // Visit actively happening (vitals/collection)
  COMPLETED     // All steps done, samples collected
  FAILED        // Patient unavailable or other issue
  CANCELLED     // Cancelled before visit started
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum DayOfWeek {
  MON
  TUE
  WED
  THU
  FRI
  SAT
  SUN
}
```

---

## 6. Main Screen: Today's Assignments

**Route:** `/` (default landing page)
**Purpose:** Show all visits scheduled for today, sorted by time slot.

### Layout

```
┌─────────────────────────────────────┐
│  👤 Priya S.            🔔 [1]     │
│  Saturday, 28 Feb 2026              │
├─────────────────────────────────────┤
│                                     │
│  Today's Visits (3)           [📅]  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🔵 8:00–10:00 AM            │    │
│  │ Rahul M. — Banjara Hills    │    │
│  │ Tests: TSH, CBC, Ferritin   │    │
│  │ Special: Fasting required   │    │
│  │ [Navigate 📍] [Call 📞]      │    │
│  │ [Start Visit ▶️]             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ⚪ 10:00–12:00 PM           │    │
│  │ Priya S. — Jubilee Hills    │    │
│  │ Tests: Testosterone, LH     │    │
│  │ [Navigate 📍] [Call 📞]      │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ✅ COMPLETED 9:15 AM        │    │
│  │ Amit K. — Madhapur          │    │
│  │ 3 tubes collected            │    │
│  │ Vitals: BP 120/80, Pulse 72 │    │
│  │ [Deliver to Lab 🏥]         │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Running Late 🕐]  [Help ❓]       │
└─────────────────────────────────────┘
```

### Top Bar

| Element | Behavior |
|---------|----------|
| Nurse name | Displayed from JWT user data |
| Notification bell | Badge count for unread notifications; tap → notification list |
| Date | Current date displayed; long-press → date picker for viewing other days |

### Date Picker (`[📅]` button)

- Opens a calendar popup (current week + next 7 days)
- Select date → loads assignments for that date
- Useful for checking tomorrow's schedule
- Past dates show completed/failed visits in read-only mode

### Assignment List

| Field | Source | Display |
|-------|--------|---------|
| Time slot | `NurseVisit.scheduledTimeSlot` | "8:00–10:00 AM" |
| Patient name | `NurseVisit.patient.name` | First name + last initial ("Rahul M.") |
| Area | Derived from `NurseVisit.visitPincode` or `visitAddress` | Locality name |
| Tests | `LabOrder.tests[]` via `NurseVisit.labOrderId` | Comma-separated test names |
| Special instructions | `NurseVisit.specialInstructions` + `LabOrder.notes` | "Fasting required" |

### Assignment Sort Order

1. **Active visit** (EN_ROUTE / ARRIVED / IN_PROGRESS) → always at top
2. **Upcoming visits** (SCHEDULED) → sorted by time slot ascending
3. **Completed visits** → sorted by completion time descending
4. **Failed/Cancelled visits** → at bottom

### Empty State

When no visits are scheduled:

```
┌─────────────────────────────────────┐
│                                     │
│       [Illustration: nurse          │
│        relaxing with coffee]        │
│                                     │
│    No visits scheduled today 🎉     │
│                                     │
│    Check tomorrow's schedule:       │
│    [View Tomorrow →]                │
│                                     │
└─────────────────────────────────────┘
```

### Pull-to-Refresh

- Pull down on assignment list → triggers fresh `trpc.nurse.visits.getToday.query()`
- Shows loading spinner during refresh
- Toast on success: "Updated" / on failure: "Couldn't refresh — using cached data"

### API: Fetch Today's Assignments

```typescript
trpc.nurse.visits.getToday.query({
  date: '2026-02-28'  // ISO date string, defaults to today
})

// Returns:
{
  visits: [
    {
      id: 'uuid',
      visitType: 'BLOOD_COLLECTION',
      status: 'SCHEDULED',
      scheduledDate: '2026-02-28',
      scheduledTimeSlot: '08:00-10:00',
      patientName: 'Rahul M.',
      visitAddress: '123 MG Road, Banjara Hills',
      visitCity: 'Hyderabad',
      visitPincode: '500034',
      specialInstructions: 'Fasting required. Gate code: 4567',
      patientPhone: '+919876543210',
      tests: ['TSH', 'CBC', 'Ferritin'],
      labOrderId: 'uuid',
      // Completed visit fields (if applicable):
      vitals: { bloodPressureSystolic: 120, bloodPressureDiastolic: 80, pulseRate: 72 },
      tubeCount: 3,
      completedAt: '2026-02-28T09:15:00Z',
      // Lab delivery status (if applicable):
      deliveredToLabAt: null,
      assignedLabName: 'PathLab Plus (MG Road)',
      assignedLabId: 'uuid'
    }
  ],
  todayStats: {
    total: 3,
    completed: 1,
    remaining: 2,
    failed: 0
  }
}
```

---

## 7. Assignment Card Design

### Card States

| Status | Icon | Background | Actions Visible |
|--------|------|-----------|-----------------|
| `SCHEDULED` | ⚪ (gray circle) | White | Navigate, Call, [Start Visit] (first upcoming only) |
| `EN_ROUTE` | 🔵 (blue pulsing) | Light blue tint | Navigate, Call, [Arrived] |
| `ARRIVED` | 🔵 (blue solid) | Light blue tint | [Continue Visit] (resumes at verify step) |
| `IN_PROGRESS` | 🟡 (yellow pulsing) | Light yellow tint | [Continue Visit] |
| `COMPLETED` | ✅ (green check) | Light green tint | Deliver to Lab (if not yet delivered) |
| `FAILED` | ❌ (red cross) | Light red tint | None (read-only) |
| `CANCELLED` | 🚫 (gray strike) | Gray tint | None (read-only) |

### Card Actions

| Action | Trigger | Behavior |
|--------|---------|----------|
| **Navigate** 📍 | Tap button | Opens Google Maps / Apple Maps with patient address as destination |
| **Call** 📞 | Tap button | Opens phone dialer with patient phone number |
| **Start Visit** ▶️ | Tap button (only for first upcoming SCHEDULED visit) | Sets status → EN_ROUTE, navigates to `/visit/[id]` |
| **Continue Visit** | Tap card (for IN_PROGRESS) | Navigates to `/visit/[id]` at current step |
| **Deliver to Lab** 🏥 | Tap button (for COMPLETED, not yet delivered) | Navigates to `/deliver` (visit pre-selected) |
| **View Summary** | Tap completed card | Shows read-only visit summary |

### Navigate Button Logic

```typescript
function openNavigation(address: string) {
  const encodedAddress = encodeURIComponent(address);
  
  // Try Google Maps first (most common on Android)
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
  
  // Fallback for iOS
  const appleMapsUrl = `https://maps.apple.com/?daddr=${encodedAddress}`;
  
  // Detect platform and open appropriate URL
  if (/iPhone|iPad/.test(navigator.userAgent)) {
    window.open(appleMapsUrl, '_blank');
  } else {
    window.open(googleMapsUrl, '_blank');
  }
}
```

### Call Button Logic

```typescript
function callPatient(phone: string) {
  window.location.href = `tel:${phone}`;
}
```

---

## 8. Visit Flow — Step 1: Arrive & Verify

**Route:** `/visit/[id]`
**Purpose:** Guided step-by-step flow for completing a home visit.

### Visit Stepper (Top of Screen)

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│  Visit: Rahul M.                    │
│  8:00–10:00 AM, Banjara Hills       │
│                                     │
│  [1.Verify] → [2.Vitals] → [3.Collect] → [4.Complete]  │
│   ● active    ○ pending    ○ pending    ○ pending       │
├─────────────────────────────────────┤
```

### Step 1: Arrive & Verify

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

### Status Transitions at This Step

| Action | Status Change | Server Action |
|--------|--------------|---------------|
| Nurse taps "Start Visit" from assignment list | `SCHEDULED → EN_ROUTE` | `trpc.nurse.visits.updateStatus.mutate({ visitId, status: 'EN_ROUTE' })` → Patient notified: "Your nurse is on the way" |
| Nurse arrives at location | `EN_ROUTE → ARRIVED` | Automatic on opening visit flow page, OR manual tap "I've Arrived" → `arrivedAt` timestamp recorded |
| Nurse confirms patient identity | `ARRIVED → IN_PROGRESS` | `inProgressAt` timestamp recorded when nurse taps "Next: Record Vitals" |

### Verification Checklist

| Check | Required | Notes |
|-------|----------|-------|
| Patient identity (name match) | ✅ | Nurse confirms verbally. Must be checked to proceed. |
| Fasting confirmed | Conditional | Only shown if `specialInstructions` includes "fasting". Must be checked if shown. |

### Validation

- Both required checkboxes must be checked to enable "Next: Record Vitals" button
- If fasting was required but patient has eaten → nurse taps "Patient Not Available" with reason "Patient not fasting"

---

## 9. Visit Flow — Step 2: Record Vitals

### Vitals Recording Form

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
│  [_________________________________]│
│  (any observations, e.g., "patient  │
│   mentioned dizziness")             │
│                                     │
│  [← Back]    [Next: Collect Sample →]│
│                                     │
└─────────────────────────────────────┘
```

### Vitals Field Specifications

| Field | Type | Required | Range | Validation Message |
|-------|------|----------|-------|-------------------|
| Blood Pressure — Systolic | Number input | ✅ Yes | 60–250 mmHg | "Systolic BP must be between 60–250" |
| Blood Pressure — Diastolic | Number input | ✅ Yes | 30–150 mmHg | "Diastolic BP must be between 30–150" |
| Pulse Rate | Number input | ✅ Yes | 30–200 BPM | "Pulse must be between 30–200 BPM" |
| SpO2 | Number input | ❌ Optional | 50–100 % | "SpO2 must be between 50–100%" |
| Weight | Number input (decimal allowed) | ❌ Optional | 20–300 kg | "Weight must be between 20–300 kg" |
| Temperature | Number input (decimal allowed) | ❌ Optional | 34.0–42.0 °C | "Temperature must be between 34–42°C" |
| Notes | Text area | ❌ Optional | Max 500 chars | Character counter shown |

### Abnormal Value Warnings

When a vital is outside normal range, show an inline amber warning (does not block submission):

| Vital | Normal Range | Warning Trigger |
|-------|-------------|-----------------|
| Systolic BP | 90–140 mmHg | Outside range → "⚠️ Blood pressure appears [high/low]" |
| Diastolic BP | 60–90 mmHg | Outside range → "⚠️ Blood pressure appears [high/low]" |
| Pulse Rate | 60–100 BPM | Outside range → "⚠️ Pulse appears [high/low]" |
| SpO2 | 95–100% | Below 95% → "⚠️ Low oxygen saturation" |
| Temperature | 36.1–37.2°C | Outside range → "⚠️ Temperature appears [high/low]" |

**Critical Value Alert:**

If any vital is critically abnormal, show a RED banner:

| Vital | Critical Threshold | Alert |
|-------|-------------------|-------|
| Systolic BP | >180 or <80 | 🔴 "CRITICAL: Extremely [high/low] blood pressure. Advise patient to seek emergency care." |
| Diastolic BP | >120 or <50 | 🔴 "CRITICAL: Extremely [high/low] blood pressure." |
| Pulse Rate | >150 or <40 | 🔴 "CRITICAL: Abnormal heart rate. Ask if patient feels unwell." |
| SpO2 | <90% | 🔴 "CRITICAL: Very low oxygen. Advise patient to seek emergency care." |
| Temperature | >39.5°C | 🔴 "CRITICAL: High fever detected." |

Critical alerts do NOT block submission — nurse records the values and proceeds. The system notifies the coordinator (admin) when critical vitals are recorded.

### Vitals Validation Logic

```typescript
// lib/validation.ts
export const VITALS_RANGES = {
  systolic:    { min: 60, max: 250, normalMin: 90, normalMax: 140, critLow: 80, critHigh: 180 },
  diastolic:   { min: 30, max: 150, normalMin: 60, normalMax: 90,  critLow: 50, critHigh: 120 },
  pulse:       { min: 30, max: 200, normalMin: 60, normalMax: 100, critLow: 40, critHigh: 150 },
  spo2:        { min: 50, max: 100, normalMin: 95, normalMax: 100, critLow: 90, critHigh: null },
  weight:      { min: 20, max: 300, normalMin: null, normalMax: null, critLow: null, critHigh: null },
  temperature: { min: 34, max: 42,  normalMin: 36.1, normalMax: 37.2, critLow: null, critHigh: 39.5 },
};

export type VitalStatus = 'normal' | 'warning' | 'critical';

export function checkVital(field: keyof typeof VITALS_RANGES, value: number): VitalStatus {
  const range = VITALS_RANGES[field];
  if ((range.critLow && value < range.critLow) || (range.critHigh && value > range.critHigh)) return 'critical';
  if ((range.normalMin && value < range.normalMin) || (range.normalMax && value > range.normalMax)) return 'warning';
  return 'normal';
}
```

---

## 10. Visit Flow — Step 3: Collect Sample

### Sample Collection Form

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
│  [_________________________________]│
│  (e.g., "Difficult vein access,     │
│   used butterfly needle")           │
│                                     │
│  [← Back]       [Mark Collected ✓]  │
│                                     │
└─────────────────────────────────────┘
```

### Fields

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| Tube count | Number stepper (min: 1, max: 15) | ✅ | Must be ≥ 1 |
| Collection notes | Text area | ❌ | Max 500 chars |

### "Mark Collected" Action

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
    notes: 'Patient mentioned occasional dizziness'
  }
})
```

**Server actions:**
1. Update `NurseVisit` with vitals, tube count, collection notes
2. Update `NurseVisit.status` → `COMPLETED` + `completedAt` timestamp
3. Update `LabOrder.status` → `SAMPLE_COLLECTED`
4. Increment `Nurse.completedVisits` counter
5. Notify patient (push): "Blood sample collected successfully. Your nurse will deliver it to the lab."
6. Notify coordinator (admin) — SSE event → admin feed
7. If any critical vitals → urgent notification to coordinator
8. Audit log entry

---

## 11. Visit Flow — Step 4: Complete Visit

### Summary Screen

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

### Post-Completion Behavior

- Visit card on main screen updates to show ✅ COMPLETED status
- "Deliver to Lab" button appears on the completed card
- Nurse can continue to next scheduled visit or deliver collected samples

---

## 12. Running Late Flow

### Trigger

From main screen → "Running Late 🕐" button (persistent at bottom)

### Running Late Modal

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

### API

```typescript
trpc.nurse.visits.reportLate.mutate({
  visitId: 'uuid',
  newEta: '09:30',
  reason: 'Traffic delay'
})
```

### Server Actions

1. Record delay in `NurseVisit` (new field `lateReportedAt`, `newEta`, `lateReason`)
2. Notify patient (push + WhatsApp): "Your nurse is running a bit late. New estimated arrival: 9:30 AM."
3. Notify coordinator (admin) — SSE event: "⚠️ Nurse Priya S. running late for Rahul M. — new ETA 9:30 AM"
4. Update admin dashboard with delay flag on the lab order card
5. Audit log entry

---

## 13. Patient Unavailable Flow

### Trigger

From visit flow Step 1 → "Patient Not Available ✕" button

### Unavailable Form

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

### API

```typescript
trpc.nurse.visits.markFailed.mutate({
  visitId: 'uuid',
  reason: 'NOT_HOME',
  notes: 'Rang doorbell 3 times over 10 minutes, no response'
})
```

### Server Actions

1. Update `NurseVisit.status` → `FAILED` + `failedAt` timestamp + `failedReason`
2. Increment `Nurse.failedVisits` counter
3. Update `LabOrder.status` → `COLLECTION_FAILED`
4. Notify coordinator (admin) — **URGENT**: "❌ Visit failed — Rahul M. — Reason: Not home. Please reschedule."
5. Notify patient (push + WhatsApp): "We missed you! Our nurse visited but couldn't reach you. Your coordinator will contact you to reschedule."
6. SSE event → admin feed
7. Audit log entry

### Failure Reasons Enum

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

---

## 14. Deliver to Lab Flow

**Route:** `/deliver` (no dynamic ID — nurse selects visits to deliver via checkboxes; if navigated from a specific completed visit card, that visit is pre-selected)
**Purpose:** Track sample delivery from nurse to diagnostic centre.

### Deliver to Lab Screen

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
│  ─── OR SELECT DIFFERENT LAB ───   │
│  [Change Lab ▼]                     │
│  (Only if lab was not pre-assigned) │
│                                     │
│  ─── CONFIRM DELIVERY ───          │
│  Tubes being delivered: [  5  ]     │
│                                     │
│  [Confirm Delivery to Lab ✓]        │
│                                     │
└─────────────────────────────────────┘
```

### Lab Selection Logic

- If lab is pre-assigned (admin assigned a diagnostic centre to the lab order) → show assigned lab, no change option
- If lab is NOT pre-assigned → show dropdown of active labs in the nurse's city
- Lab list filtered by: city match + active status
- Sort: alphabetical by name

### Batch Delivery Support

- Nurse can deliver multiple completed visits' samples to the same lab in one trip
- Checkboxes allow selecting which samples to include in this delivery
- "Total tubes" auto-calculates from selected visits

### API

```typescript
trpc.nurse.visits.deliverToLab.mutate({
  visitIds: ['uuid-1', 'uuid-2'],   // Array of visit IDs being delivered
  labId: 'uuid',                     // Diagnostic centre ID
  tubeCount: 5                       // Total tubes being delivered
})
```

### Server Actions (per visit)

1. Update `NurseVisit.deliveredToLabAt` + `deliveredToLabId` + `deliveryTubeCount`
2. Update each related `LabOrder.status` → `AT_LAB`
3. Lab portal shows order in "Incoming" tab
4. Notify patient (push): "Your blood sample has been delivered to the lab."
5. Notify coordinator (admin) — SSE event: "Samples delivered to PathLab Plus — 5 tubes (2 patients)"
6. Audit log entry per lab order

### Post-Delivery

- Visit cards on main screen show "Delivered ✓" indicator
- "Deliver to Lab" button is replaced with "Delivered to PathLab Plus at 11:30 AM"
- Nurse returns to main screen to continue with remaining visits

---

## 15. Past Visits & History

**Route:** `/history`
**Purpose:** View completed and failed visits for reference.

### History Screen

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│  Visit History                      │
│                                     │
│  ─── This Week (12 visits) ───     │
│                                     │
│  Fri, 27 Feb ──────────────         │
│  ✅ Rahul M. — Banjara Hills       │
│     3 tubes, BP 120/80, Pulse 72   │
│  ✅ Priya S. — Jubilee Hills       │
│     2 tubes, BP 118/76, Pulse 68   │
│  ❌ Amit K. — Madhapur             │
│     Not home                        │
│                                     │
│  Thu, 26 Feb ──────────────         │
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

### API

```typescript
trpc.nurse.visits.getHistory.query({
  page: 1,
  pageSize: 20,
  status: 'ALL'  // 'ALL' | 'COMPLETED' | 'FAILED'
})

// Returns:
{
  visits: [...],
  pagination: { page: 1, pageSize: 20, total: 47, totalPages: 3 },
  stats: { total: 47, completed: 43, failed: 4, avgDurationMinutes: 18 }
}
```

### Tap on Historical Visit

Opens a read-only summary modal (same layout as Step 4: Complete Visit summary) with all recorded data.

---

## 16. Profile & Settings

**Route:** `/profile`
**Purpose:** View and manage nurse profile settings.

### Profile Screen

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│  [Avatar]                           │
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
│  Max daily visits: 5                │
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

### Editable vs. Read-Only Fields

| Field | Editable by Nurse | Editable by Admin |
|-------|-------------------|-------------------|
| Name | ❌ | ✅ |
| Phone | ❌ | ✅ |
| Email | ✅ (via `trpc.nurse.profile.updateEmail`) | ✅ |
| Qualification | ❌ | ✅ |
| Certification | ❌ | ✅ |
| City | ❌ | ✅ |
| Serviceable pincodes | ❌ | ✅ |
| Available days | ❌ | ✅ |
| Available hours | ❌ | ✅ |
| Max daily visits | ❌ | ✅ |
| Push notifications | ✅ | — |
| WhatsApp notifications | ✅ | — |

**Rationale:** Nurse schedules and service areas are managed centrally by the coordinator (admin). Nurses can only toggle their notification preferences. All other profile changes go through admin portal.

---

## 17. Notification System (Nurse)

### Notification Channels

| Channel | Use Case | Timing |
|---------|----------|--------|
| **Push (FCM)** | New assignments, status changes, urgent alerts | Real-time |
| **WhatsApp (Gupshup)** | New assignments (primary), schedule changes | Real-time |
| **SMS (Gupshup/MSG91)** | Fallback when WhatsApp undelivered | Fallback |
| **In-app (SSE)** | Real-time badge updates, assignment list refresh | Real-time |

### Notification Events

| Event | Push | WhatsApp | SMS | In-App |
|-------|------|----------|-----|--------|
| New assignment | ✅ | ✅ | Fallback | ✅ |
| Assignment cancelled | ✅ | ✅ | Fallback | ✅ |
| Assignment rescheduled | ✅ | ✅ | Fallback | ✅ |
| Patient confirmed slot | ✅ | — | — | ✅ |
| Visit reminder (30 min before) | ✅ | — | — | — |
| SLA warning (running late for next visit) | ✅ | — | — | ✅ |
| Daily schedule summary (evening before) | — | ✅ | — | — |

### WhatsApp Templates

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

**Daily Summary (sent at 8 PM the night before):**
```
Onlyou: Tomorrow's Schedule
📅 {{date}}
{{visitCount}} visit(s) scheduled:
{{#each visits}}
• {{time}} — {{area}} ({{tests}})
{{/each}}
Open portal: nurse.onlyou.life
```

### Push Notification Registration

```typescript
// services/notifications.ts
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

export async function registerForPush() {
  const messaging = getMessaging();
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
  });
  
  // Send token to backend
  await trpc.nurse.profile.registerPushToken.mutate({ token });
}

export function onForegroundMessage(callback: (payload: any) => void) {
  const messaging = getMessaging();
  onMessage(messaging, callback);
}
```

---

## 18. Real-Time System (Nurse Portal)

### SSE Connection

The nurse portal maintains a persistent SSE connection to receive real-time updates.

```typescript
// hooks/useSSE.ts
export function useSSE() {
  useEffect(() => {
    const eventSource = new EventSource(
      `${API_URL}/sse/nurse?token=${accessToken}`,
      { withCredentials: true }
    );
    
    eventSource.addEventListener('new_assignment', (event) => {
      const data = JSON.parse(event.data);
      // Add to assignment list, show toast
      queryClient.invalidateQueries(['nurse', 'visits', 'today']);
      showToast(`New visit: ${data.patientName} at ${data.timeSlot}`);
    });
    
    eventSource.addEventListener('assignment_cancelled', (event) => {
      const data = JSON.parse(event.data);
      // Remove from list, show toast
      queryClient.invalidateQueries(['nurse', 'visits', 'today']);
      showToast(`Visit cancelled: ${data.patientName}`);
    });
    
    eventSource.addEventListener('assignment_rescheduled', (event) => {
      const data = JSON.parse(event.data);
      queryClient.invalidateQueries(['nurse', 'visits', 'today']);
      showToast(`Visit rescheduled: ${data.patientName} → ${data.newTimeSlot}`);
    });
    
    eventSource.onerror = () => {
      // Reconnect with exponential backoff
    };
    
    return () => eventSource.close();
  }, [accessToken]);
}
```

### SSE Events

| Event | Payload | Action |
|-------|---------|--------|
| `new_assignment` | `{ visitId, patientName, timeSlot, area, tests[] }` | Add card to list, show toast |
| `assignment_cancelled` | `{ visitId, patientName, reason }` | Remove card, show toast |
| `assignment_rescheduled` | `{ visitId, patientName, newDate, newTimeSlot }` | Update card, show toast |
| `lab_order_updated` | `{ labOrderId, newStatus }` | Update related visit card |

### Server-Side SSE (Redis Pub/Sub)

```typescript
// Backend: SSE channel for nurse
// Channel: `nurse:${nurseId}`
// Published by: admin actions (assign, cancel, reschedule), system events

redis.publish(`nurse:${nurseId}`, JSON.stringify({
  event: 'new_assignment',
  data: { visitId, patientName, timeSlot, area, tests }
}));
```

---

## 19. tRPC API Reference

### Router Structure

```
trpc.nurse
├── .visits
│   ├── .getToday.query()           → Today's assignments
│   ├── .getByDate.query()          → Assignments for specific date
│   ├── .getById.query()            → Single visit detail
│   ├── .getHistory.query()         → Past visits (paginated)
│   ├── .updateStatus.mutate()      → Update visit status (EN_ROUTE, ARRIVED)
│   ├── .markCollected.mutate()     → Record vitals + mark sample collected
│   ├── .markFailed.mutate()        → Mark visit as failed
│   ├── .reportLate.mutate()        → Report running late
│   ├── .deliverToLab.mutate()      → Confirm lab delivery
│   └── .getStats.query()           → Performance stats
├── .profile
│   ├── .get.query()                → Nurse profile
│   ├── .updateEmail.mutate()       → Update email
│   ├── .updateNotificationPrefs.mutate() → Toggle push/WhatsApp
│   └── .registerPushToken.mutate() → Register FCM token
└── .labs
    └── .getByCity.query()          → Available labs in city
```

### Full API Signatures

```typescript
// ─── Visits ────────────────────────────────────────

// Get today's assignments
nurse.visits.getToday.query({ date?: string })
// Input: optional ISO date (defaults to today)
// Output: { visits: NurseVisitWithDetails[], todayStats: TodayStats }

// Get assignments for a specific date
nurse.visits.getByDate.query({ date: string })
// Input: ISO date string
// Output: { visits: NurseVisitWithDetails[] }

// Get single visit detail
nurse.visits.getById.query({ visitId: string })
// Output: NurseVisitFullDetail (includes patient info, tests, lab info)

// Get visit history (paginated)
nurse.visits.getHistory.query({ page: number, pageSize: number, status?: 'ALL' | 'COMPLETED' | 'FAILED' })
// Output: { visits: NurseVisitSummary[], pagination: Pagination, stats: NurseStats }

// Update visit status
nurse.visits.updateStatus.mutate({ visitId: string, status: 'EN_ROUTE' | 'ARRIVED' })
// Output: { success: true }

// Record vitals + mark collected
nurse.visits.markCollected.mutate({
  visitId: string,
  tubeCount: number,
  collectionNotes?: string,
  vitals: {
    bloodPressureSystolic: number,
    bloodPressureDiastolic: number,
    pulseRate: number,
    spO2?: number,
    weight?: number,
    temperature?: number,
    notes?: string
  }
})
// Output: { success: true, visitId: string }

// Mark visit as failed
nurse.visits.markFailed.mutate({
  visitId: string,
  reason: VisitFailureReason,
  notes?: string
})
// Output: { success: true }

// Report running late
nurse.visits.reportLate.mutate({
  visitId: string,
  newEta: string,    // "09:30" format
  reason?: string
})
// Output: { success: true }

// Deliver samples to lab
nurse.visits.deliverToLab.mutate({
  visitIds: string[],
  labId: string,
  tubeCount: number
})
// Output: { success: true, deliveredCount: number }

// Get performance stats
nurse.visits.getStats.query()
// Output: { total: number, completed: number, failed: number, rating: number, avgDuration: number }

// ─── Profile ───────────────────────────────────────

nurse.profile.get.query()
// Output: NurseProfile (all profile fields)

nurse.profile.updateEmail.mutate({ email: string })
// Output: { success: true }

nurse.profile.updateNotificationPrefs.mutate({ push: boolean, whatsapp: boolean })
// Output: { success: true }

nurse.profile.registerPushToken.mutate({ token: string })
// Output: { success: true }

// ─── Labs ──────────────────────────────────────────

nurse.labs.getByCity.query({ city: string })
// Output: { labs: DiagnosticCentreSummary[] }
```

### CASL.js Permission Rules (Nurse)

```typescript
// auth/casl-ability.factory.ts — Nurse rules
const ability = defineAbilityFor(nurse);

// Visits: only own assignments
can('read', 'NurseVisit', { nurseId: nurse.id });
can('update', 'NurseVisit', { nurseId: nurse.id });

// Patient data: only for assigned visits (name, address, phone)
can('read', 'Patient', { nurseVisits: { some: { nurseId: nurse.id } } });

// Lab orders: only linked to own visits
can('read', 'LabOrder', { nurseId: nurse.id });

// Labs: read-only list for delivery
can('read', 'DiagnosticCentre');

// Own profile: read + limited update
can('read', 'NurseProfile', { nurseId: nurse.id });
can('update', 'NurseProfile', { nurseId: nurse.id });

// Cannot access:
cannot('read', 'Consultation');
cannot('read', 'Prescription');
cannot('read', 'AIAssessment');
cannot('read', 'Questionnaire');
cannot('read', 'Payment');
cannot('read', 'Wallet');
cannot('read', 'AdminDashboard');
cannot('manage', 'Partner');
cannot('manage', 'SystemConfig');
```

---

## 20. Offline Mode & Sync Strategy

### Network Detection

```typescript
// hooks/useOffline.ts
export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { isOnline };
}
```

### Offline Banner

```
┌─────────────────────────────────────┐
│ ⚠️ You're offline. Changes will sync │
│    when connection is restored.      │
└─────────────────────────────────────┘
```

- Shown at the top of every screen when offline
- Yellow background, non-dismissible while offline
- Auto-hides when connection is restored

### Offline Capabilities

| Action | Offline Behavior |
|--------|-----------------|
| View today's assignments | ✅ Show cached data from last sync |
| View visit details | ✅ Show cached data |
| Navigate to address | ✅ Opens Maps app (has its own offline maps) |
| Call patient | ✅ Phone dialer works offline |
| Start visit (status → EN_ROUTE) | ✅ Queued, synced when online |
| Record vitals | ✅ Stored in IndexedDB, synced when online |
| Mark collected | ✅ Stored in IndexedDB, synced when online |
| Mark failed | ✅ Stored in IndexedDB, synced when online |
| Deliver to lab | ✅ Stored in IndexedDB, synced when online |
| Report running late | ✅ Queued, synced when online |
| Pull to refresh | ❌ Shows "No connection" error |
| Receive new assignments | ❌ SSE disconnected; syncs on reconnect |

### Sync Queue (IndexedDB)

```typescript
// stores/sync.store.ts
interface SyncAction {
  id: string;
  type: 'UPDATE_STATUS' | 'MARK_COLLECTED' | 'MARK_FAILED' | 'DELIVER_TO_LAB' | 'REPORT_LATE';
  payload: any;
  timestamp: number;
  retryCount: number;
}

// On reconnect:
async function syncPendingActions() {
  const queue = await getSyncQueue();
  
  for (const action of queue.sort((a, b) => a.timestamp - b.timestamp)) {
    try {
      await executeAction(action);
      await removeSyncAction(action.id);
    } catch (error) {
      action.retryCount++;
      if (action.retryCount >= 3) {
        // Move to dead letter queue, notify admin
        await markSyncFailed(action);
      }
    }
  }
}
```

### Cache Strategy

| Data | Cache Duration | Invalidation |
|------|---------------|--------------|
| Today's assignments | Until next API call or SSE update | On pull-to-refresh, SSE event, or mutation |
| Visit details | Until visit is completed/failed | On status mutation |
| Profile data | 24 hours | On profile update |
| Lab list | 24 hours | Manual refresh only |

---

## 21. Privacy & Data Access Rules

### API-Level Enforcement

Privacy is enforced at the tRPC router level, not just the UI. Even if someone inspects network traffic, they cannot access restricted data.

```typescript
// nurse.router.ts — Data filtering
const nurseVisitRouter = router({
  getToday: nurseProtectedProcedure
    .query(async ({ ctx }) => {
      const visits = await prisma.nurseVisit.findMany({
        where: {
          nurseId: ctx.nurse.id,      // Only own assignments
          scheduledDate: today(),
        },
        select: {
          id: true,
          status: true,
          scheduledDate: true,
          scheduledTimeSlot: true,
          visitAddress: true,
          visitCity: true,
          visitPincode: true,
          specialInstructions: true,
          vitals: true,
          tubeCount: true,
          collectionNotes: true,
          completedAt: true,
          deliveredToLabAt: true,
          patient: {
            select: {
              name: true,              // ✅ Name visible
              phone: true,             // ✅ Phone visible (for calling)
              // ❌ No: email, dateOfBirth, governmentId, diagnosis, questionnaire
            }
          },
          labOrder: {
            select: {
              id: true,
              tests: true,             // ✅ Test names visible
              notes: true,             // ✅ Collection notes (fasting, etc.)
              diagnosticCentre: {
                select: {
                  id: true,
                  name: true,          // ✅ Lab name for delivery
                  address: true,       // ✅ Lab address for navigation
                  phone: true,         // ✅ Lab phone for contact
                }
              },
              // ❌ No: diagnosis, condition, prescription, AI assessment
            }
          }
        }
      });
      return visits;
    }),
});
```

### Data the Nurse Portal NEVER Receives

| Data | Reason |
|------|--------|
| Patient condition/diagnosis | Clinical privacy — nurse doesn't need this for blood collection |
| Questionnaire responses | Clinical data irrelevant to collection |
| AI assessment | Clinical data, doctor-only |
| Prescription details | Pharmacy-only data |
| Doctor notes | Doctor-patient communication |
| Payment/subscription info | Financial data, admin-only |
| Other nurses' assignments | Privacy between team members |
| Patient email | Not needed for field work |
| Patient government ID | Admin-only for verification |

---

## 22. Security & Session Management

### Access Control Summary

| Resource | Nurse Access |
|----------|-------------|
| Own visit assignments | Full read + status updates |
| Patient name, address, phone (for assigned visits) | Read-only |
| Tests ordered (for assigned visits) | Read-only |
| Lab orders (for assigned visits) | Read-only |
| Lab list (for delivery) | Read-only |
| Own profile | Read + limited update (email, notification prefs) |
| Other nurses' data | ❌ No access |
| Clinical data (diagnosis, AI, prescriptions) | ❌ No access |
| Admin dashboard | ❌ No access |
| Financial data | ❌ No access |

### What Nurse CANNOT Do

| Restriction | Reason |
|-------------|--------|
| View patient diagnosis or condition | Clinical privacy |
| Access other nurses' assignments | Data isolation |
| Modify visit schedule (date/time) | Admin-managed |
| Change assigned lab after admin assigns one | Admin-managed |
| Access admin portal features | Role-based access |
| Create or view prescriptions | Doctor/pharmacy only |
| View payment or subscription data | Admin-only |

### Audit Logging

Every nurse action is logged:

| Action | Fields Logged |
|--------|--------------|
| Login | `{ nurseId, timestamp, ip, userAgent }` |
| View assignments | `{ nurseId, date, timestamp }` |
| Start visit (EN_ROUTE) | `{ nurseId, visitId, timestamp }` |
| Arrive at location | `{ nurseId, visitId, timestamp }` |
| Record vitals | `{ nurseId, visitId, vitals, timestamp }` |
| Mark collected | `{ nurseId, visitId, tubeCount, timestamp }` |
| Mark failed | `{ nurseId, visitId, reason, timestamp }` |
| Report late | `{ nurseId, visitId, newEta, timestamp }` |
| Deliver to lab | `{ nurseId, visitIds[], labId, tubeCount, timestamp }` |
| Logout | `{ nurseId, timestamp }` |

---

## 23. Error States & Edge Cases

### Network Errors

| Scenario | Behavior |
|----------|----------|
| API call fails (network) | Toast: "Couldn't connect. Retrying..." + auto-retry (3 attempts, exponential backoff) |
| API call fails after retries | Toast: "Connection failed. Action saved — will sync when online." + queue to sync store |
| SSE disconnects | Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s). Banner: "Reconnecting..." |
| Token expired during offline | On reconnect → silent refresh → if fails → redirect to login |

### Visit Flow Errors

| Scenario | Behavior |
|----------|----------|
| Nurse tries to start visit for wrong date | Button disabled. Toast: "This visit is scheduled for [date]. You can only start visits on the scheduled date." |
| Nurse tries to start second visit while one is IN_PROGRESS | Warning modal: "You have an active visit with [patient]. Complete or cancel it before starting a new visit." |
| Vitals save fails | Data stored in local state, retry on next step. "Vitals saved locally — will upload when connected." |
| Mark collected fails | Queue to sync. Confirmation: "Collection recorded offline. Will sync shortly." |
| Tube count mismatch (entered 3 but lab receives 2) | Lab portal flags discrepancy → coordinator notified → audit trail shows nurse's original count |
| Visit cancelled while nurse is EN_ROUTE | SSE push: "Visit cancelled by coordinator. [Patient] — [Reason]." Visit card updates immediately. |
| Nurse reassigned while en route | SSE push: "You've been reassigned. Original visit with [Patient] cancelled." New assignment appears. |

### App State Errors

| Scenario | Behavior |
|----------|----------|
| App crashes mid-visit | Vitals form data stored in Zustand persisted store. On reopen: "You have an in-progress visit. [Continue Visit]" |
| Browser clears cache/storage | JWT lost → redirect to login. Visit data lost → re-fetched from server. Sync queue lost → server has last confirmed state. |
| PWA update available | Banner: "Update available. [Refresh to update]" — does not interrupt active visit flow |
| Multiple tabs open | Only first tab establishes SSE. Second tab shows: "Portal is open in another tab." |

---

## 24. Responsive Design & Mobile UX

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Mobile-only** | No desktop layout. Max-width: 480px (centered on larger screens with gray background) |
| **Large touch targets** | All buttons minimum 48px height, 44px minimum touch area |
| **One-hand operation** | Primary actions at bottom of screen (thumb-reachable) |
| **High contrast** | Status badges, critical alerts — clearly visible in sunlight |
| **Minimal typing** | Numeric inputs for vitals (number pad), steppers for tube count, checkboxes for verification |
| **Fast loading** | PWA cached shell, skeleton loading states, optimistic UI |

### Screen Layout Rules

```
┌─────────────────────────────────────┐  ← Fixed top bar (nurse name, bell)
│  Top Bar (56px)                     │
├─────────────────────────────────────┤
│                                     │
│                                     │
│  Scrollable Content Area            │  ← Main content
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  Bottom Action Bar (64px)           │  ← Running Late, Help (persistent)
└─────────────────────────────────────┘
```

### Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page title | 20px | Bold (700) | Gray 900 |
| Section header | 14px | Semibold (600) | Gray 500 (uppercase, tracking wider) |
| Card title (patient name) | 16px | Semibold (600) | Gray 900 |
| Card body (address, tests) | 14px | Normal (400) | Gray 700 |
| Special instructions | 14px | Medium (500) | Amber 700 |
| Status badge | 12px | Semibold (600) | Color per status |
| Button text | 16px | Semibold (600) | White (primary) / Gray 700 (secondary) |

### Color Palette (Status)

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| Scheduled | Gray 50 | Gray 700 | Gray 200 |
| En Route | Blue 50 | Blue 700 | Blue 200 |
| Arrived | Blue 50 | Blue 700 | Blue 300 |
| In Progress | Yellow 50 | Yellow 800 | Yellow 200 |
| Completed | Green 50 | Green 700 | Green 200 |
| Failed | Red 50 | Red 700 | Red 200 |
| Cancelled | Gray 50 | Gray 400 | Gray 200 |

### Loading States

| Screen | Loading UI |
|--------|-----------|
| Assignment list | 3 skeleton cards (pulsing gray rectangles matching card layout) |
| Visit detail | Skeleton form fields |
| History | Skeleton list items |
| Profile | Skeleton text blocks |

### Haptic Feedback (when available)

| Action | Haptic |
|--------|--------|
| Mark Collected | Success vibration (short) |
| Mark Failed | Error vibration (double short) |
| Deliver to Lab | Success vibration (short) |

---

## 25. Analytics Events

### Tracked Events

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

## 26. Phase 2 — Scaffolded but Muted Features

### Feature Flag

```typescript
// config/feature-flags.ts
NURSE_INJECTION_ADMIN_ENABLED = false   // env variable
```

### Injection Administration Flow (Muted)

When `NURSE_INJECTION_ADMIN_ENABLED = true`, the visit flow expands:

**Step 3B: Administer Injection**
1. Medication verification (scan barcode or manual confirmation)
2. Pre-injection vitals check (BP, pulse)
3. Injection confirmation
4. **Proof of Administration:**
   - Timestamped photo (camera capture of injection site)
   - Digital signature (patient signs on screen with finger)
   - Post-injection vitals (BP, pulse — repeated)
   - 30-minute observation timer with checklist
   - Any adverse reaction notes
5. Three-way video bridge button (connects patient + nurse + doctor)

**Data Fields (already in NurseVisit schema):**
- `medicationAdministered` — medication name + dose
- `injectionSite` — anatomical location (e.g., "left abdomen")
- `proofOfAdminPhotoUrl` — S3 path to timestamped photo
- `patientSignatureUrl` — S3 path to digital signature
- `postInjectionVitals` — JSON same structure as vitals
- `observationMinutes` — duration of post-injection observation
- `adverseReactionNotes` — free text

### GPS Check-in (Phase 2)

When enabled:
- Nurse's GPS coordinates captured at visit start
- Compared against patient's address coordinates
- If >500m discrepancy → flag for admin review
- Privacy notice shown to nurse: "Location captured for visit verification"

### Three-Way Video Bridge (Phase 2)

- Nurse taps "Connect Doctor" button during visit
- System creates video room (provider TBD: Daily.co / Twilio / Agora)
- Patient + nurse + doctor join
- Doctor can observe injection, verify technique, answer questions
- Video recorded (with consent) for clinical documentation

---

## 27. Integration with Other Portals

### How Nurse Portal Connects to the System

```
Admin Portal                          Nurse Portal
─────────────                         ────────────
Admin assigns nurse to lab order      Nurse sees new assignment (SSE + push)
Admin cancels/reschedules             Nurse sees update (SSE + push)
Admin views nurse performance         Nurse sees own stats (profile)
                                      
                                      Nurse starts visit (status updates)
                                      Nurse records vitals
                                      Nurse marks collected
                                      → LabOrder.status → SAMPLE_COLLECTED
                                      → Patient notified (push)
                                      → Admin feed updated (SSE)
                                      
                                      Nurse delivers to lab
                                      → LabOrder.status → AT_LAB
                                      → Lab portal sees "Incoming" (SSE)
                                      → Patient notified (push)
                                      → Admin feed updated (SSE)

Patient App                           Lab Portal
───────────                           ──────────
Patient sees "Nurse assigned"         Lab sees "Incoming" when nurse delivers
Patient sees "Sample collected"       Lab marks "Received" → confirms tube count
Patient sees "At Lab"                 Lab processes → uploads results

Doctor Portal
─────────────
Doctor ordered the lab work
Doctor sees vitals (in lab results tab)
Doctor reviews lab results when ready
```

### Status Flow (Nurse's Part of the Lab Order Lifecycle)

```
LabOrder Status Flow:

ORDERED (doctor creates)
    │
    ▼
SLOT_BOOKED (patient selects slot)
    │
    ▼
NURSE_ASSIGNED (admin assigns nurse)  ← NurseVisit created, status: SCHEDULED
    │
    ▼
NURSE_EN_ROUTE                        ← NurseVisit status: EN_ROUTE
    │
    ▼
NURSE_ARRIVED                         ← NurseVisit status: ARRIVED
    │
    ├─── SAMPLE_COLLECTED             ← NurseVisit status: COMPLETED
    │        │
    │        ▼
    │    AT_LAB                        ← NurseVisit: deliveredToLabAt recorded
    │        │
    │        ▼
    │    PROCESSING → RESULTS_READY → DOCTOR_REVIEWED → CLOSED
    │
    └─── COLLECTION_FAILED            ← NurseVisit status: FAILED
             │
             ▼
         Admin creates recollection → new lab order
```

---

## 28. Build & Deployment

### Local Development

```bash
# From monorepo root:
pnpm --filter nurse-portal dev
# → Runs on http://localhost:3003

# Environment variables (.env.local):
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_FCM_VAPID_KEY=your_firebase_vapid_key
NEXT_PUBLIC_APP_ENV=development
```

### Production Deployment

| Aspect | Configuration |
|--------|--------------|
| Hosting | AWS ECS Fargate (same cluster as other portals) |
| Domain | `nurse.onlyou.life` |
| SSL | AWS Certificate Manager (wildcard `*.onlyou.life`) |
| CDN | CloudFront (static assets, PWA manifest, service worker) |
| Build | `pnpm --filter nurse-portal build` |
| Docker | Multi-stage Dockerfile (build → serve with Node.js) |

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter nurse-portal build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/nurse-portal/.next/standalone ./
COPY --from=builder /app/apps/nurse-portal/.next/static ./.next/static
COPY --from=builder /app/apps/nurse-portal/public ./public
EXPOSE 3003
CMD ["node", "server.js"]
```

### Health Check

```
GET /api/health → { status: 'ok', version: '1.0.0', timestamp: '...' }
```

---

## 29. Testing Checklist

### Manual Testing (Founder's Checklist)

**Authentication:**
- [ ] Nurse can log in with phone OTP (WhatsApp)
- [ ] Nurse can log in with phone OTP (SMS fallback)
- [ ] Non-nurse role gets "Access denied" message
- [ ] Token refresh works (wait 15+ minutes, still logged in)
- [ ] Logout clears session, redirects to login
- [ ] Second login from different browser logs out first session

**Assignments:**
- [ ] Today's visits show in correct order (upcoming → completed)
- [ ] Empty state shows when no visits scheduled
- [ ] Date picker shows other days' assignments
- [ ] Pull-to-refresh updates assignment list
- [ ] New assignment appears via SSE without manual refresh
- [ ] Cancelled assignment disappears via SSE

**Visit Flow:**
- [ ] Navigate button opens Google Maps with correct address
- [ ] Call button opens phone dialer with correct number
- [ ] Start Visit changes status to EN_ROUTE
- [ ] Patient receives "nurse on the way" notification
- [ ] Identity verification checkboxes must be checked to proceed
- [ ] Vitals form validates ranges (try entering BP 999)
- [ ] Critical vital shows red alert banner
- [ ] Optional vitals (SpO2, weight, temperature) can be skipped
- [ ] Tube count stepper works (min 1, max 15)
- [ ] Mark Collected saves all data + changes status
- [ ] Visit summary shows all recorded data accurately
- [ ] Patient receives "sample collected" notification
- [ ] Admin feed shows collection event

**Failure Flow:**
- [ ] Patient Not Available opens reason selector
- [ ] All failure reasons work correctly
- [ ] Failed visit shows red card in assignment list
- [ ] Coordinator receives urgent notification for failed visit
- [ ] Patient receives "missed you" notification

**Lab Delivery:**
- [ ] Deliver to Lab shows correct lab (pre-assigned)
- [ ] Multiple completed visits can be batched
- [ ] Tube count totals correctly
- [ ] Confirm Delivery updates status to AT_LAB
- [ ] Lab portal shows incoming sample
- [ ] Patient receives "delivered to lab" notification

**Running Late:**
- [ ] Running Late button opens modal
- [ ] Patient receives updated ETA notification
- [ ] Coordinator sees delay flag

**Offline:**
- [ ] Cached assignments visible when offline
- [ ] Offline banner shows at top
- [ ] Vitals recording works offline (saved locally)
- [ ] Mark collected works offline (queued)
- [ ] Queued actions sync on reconnect
- [ ] Toast shows "Synced" after successful sync

**PWA:**
- [ ] Install prompt appears on first visit
- [ ] App installs to home screen
- [ ] Opens in standalone mode (no browser chrome)
- [ ] Offline fallback page works when app shell not cached

**Profile:**
- [ ] Profile shows correct nurse data
- [ ] Email can be updated
- [ ] Notification toggles work
- [ ] Logout works from profile screen

### Seed Data Testing

Pre-populated test data (from `prisma/seed.ts`):

| Entity | Details |
|--------|---------|
| Test nurse | `nurse@test.onlyou.life` / `+919999900004` |
| Test patient 1 | Has scheduled lab order, slot booked |
| Test patient 2 | Has completed visit (for delivery testing) |
| Test diagnostic centre | PathLab Plus (Bangalore) |
| Test lab order | Extended Hair Panel, status varies by scenario |

---

## 30. Appendix: Complete Status Flow Diagram

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
│         │                                                            │
│    ┌────┴────────────────┐                                           │
│    │                     │                                           │
│    ▼                     ▼                                           │
│ ┌────────────┐    ┌──────────┐                                       │
│ │IN_PROGRESS │    │  FAILED  │ → Reason recorded                     │
│ │(vitals +   │    │          │ → Coordinator alerted                 │
│ │ collection)│    └──────────┘ → Patient notified                    │
│ └─────┬──────┘         ▲                                             │
│       │                │ Patient unavailable                         │
│       │                │ at any point during visit                   │
│       │                                                              │
│       │  Nurse taps "Mark Collected"                                 │
│       ▼                                                              │
│  ┌───────────┐                                                       │
│  │ COMPLETED │ → Vitals + tubes saved                                │
│  │           │ → Patient notified                                    │
│  │           │ → LabOrder.status → SAMPLE_COLLECTED                  │
│  └─────┬─────┘                                                       │
│        │                                                             │
│        │  Nurse delivers to diagnostic centre                        │
│        ▼                                                             │
│  ┌───────────────────┐                                               │
│  │ LAB DELIVERY      │ → LabOrder.status → AT_LAB                    │
│  │ (deliveredToLabAt) │ → Lab portal notified                        │
│  └───────────────────┘ → Patient notified                            │
│                                                                      │
│  ──── SEPARATELY ────                                                │
│                                                                      │
│  ┌───────────┐                                                       │
│  │ CANCELLED │ ← Admin cancels before visit starts                   │
│  │           │ → Nurse notified                                      │
│  └───────────┘                                                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Lab Order Status Mapping

| NurseVisit Status | LabOrder Status | Trigger |
|-------------------|----------------|---------|
| `SCHEDULED` | `NURSE_ASSIGNED` | Admin assigns nurse |
| `EN_ROUTE` | `NURSE_EN_ROUTE` | Nurse starts visit |
| `ARRIVED` | `NURSE_ARRIVED` | Nurse opens visit flow |
| `COMPLETED` | `SAMPLE_COLLECTED` | Nurse marks collected |
| Lab delivery | `AT_LAB` | Nurse delivers to lab |
| `FAILED` | `COLLECTION_FAILED` | Nurse marks failed |
| `CANCELLED` | Reverts to `SLOT_BOOKED` | Admin cancels nurse assignment |

> **⚠️ Cross-Document Status Note:**
> The `AT_LAB` status used in this portal (and PORTAL-ADMIN.md, PORTAL-DOCTOR.md) corresponds to `DELIVERED_TO_LAB` in onlyou-spec-resolved-v4.md (line 716). The v4 spec further distinguishes a subsequent `SAMPLE_RECEIVED` status (line 762) when the lab confirms receipt — used in APP-PATIENT.md (line 546) for the patient-facing "Sample received at lab" stepper label. During implementation, ensure the enum uses a single canonical name across all services. Recommended: adopt `AT_LAB` as the canonical status for nurse-delivers-to-lab, and `SAMPLE_RECEIVED` for lab-confirms-receipt.

### SLA Thresholds (Nurse-Related)

| SLA Rule | Default Threshold | Escalation |
|----------|-------------------|------------|
| Nurse assignment after patient books slot | 2 hours | Admin self-alert |
| Nurse arrival (visit start) | 30 minutes past slot start | Admin + patient notification |
| Sample delivery to lab after collection | 4 hours | Admin notification |

> **⚠️ Cross-Document SLA Note:**
> The "Sample delivery to lab: 4 hours" SLA above is NOT currently listed in PORTAL-ADMIN.md Section 30 (SLA Configuration). It must be added to the admin's Lab Order SLAs table to ensure it is configurable and enforced by the SLA engine.

---

*This is the complete Nurse Portal specification. For architecture details, see ARCHITECTURE.md. For admin's nurse management interface, see PORTAL-ADMIN.md Sections 8, 17–18. For the patient's view of blood work tracking, see APP-PATIENT.md Sections 6 and 13. For the lab portal that receives samples, see onlyou-spec-resolved-v4.md Section 4.5.*
