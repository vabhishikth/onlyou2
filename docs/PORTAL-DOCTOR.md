# PORTAL-DOCTOR.md — Doctor Dashboard: Complete Specification

> **Platform:** Onlyou Telehealth — Indian telehealth for stigmatized chronic conditions
> **Portal Type:** Next.js 14 (App Router) — Desktop-first, mobile-responsive web application
> **URL:** `doctor.onlyou.life`
> **Auth:** Phone OTP (WhatsApp primary, SMS fallback) → JWT (role: `doctor`)
> **Navigation:** Sidebar (desktop) / Bottom navigation (mobile)
> **API Protocol:** tRPC (end-to-end type-safe, no codegen)
> **State Management:** Zustand + TanStack Query (tRPC integration)
> **Routing:** Next.js App Router (file-based)
> **Real-time:** SSE + Redis Pub/Sub (server → client push for new cases, messages, lab results)
> **Primary Device:** Desktop/laptop (doctors review cases on large screens)

---

## Table of Contents

1. [App Structure & File Layout](#1-app-structure--file-layout)
2. [Authentication & Session Management](#2-authentication--session-management)
3. [Sidebar Navigation & Layout](#3-sidebar-navigation--layout)
4. [Screen 1: Case Queue (Default Landing)](#4-screen-1-case-queue-default-landing)
5. [Screen 2: Case Review (3-Panel Layout)](#5-screen-2-case-review-3-panel-layout)
6. [AI Assessment Tab (Deep Dive)](#6-ai-assessment-tab-deep-dive)
7. [Questionnaire Tab](#7-questionnaire-tab)
8. [Photos Tab](#8-photos-tab)
9. [Lab Results Tab](#9-lab-results-tab)
10. [Messages Tab (In Case Review)](#10-messages-tab-in-case-review)
11. [Actions Panel (Right Panel)](#11-actions-panel-right-panel)
12. [Prescription Builder](#12-prescription-builder)
13. [Lab Order Flow (Doctor-Initiated)](#13-lab-order-flow-doctor-initiated)
14. [Referral Flow](#14-referral-flow)
15. [Refund Flow (Doctor-Initiated)](#15-refund-flow-doctor-initiated)
16. [Screen 3: My Patients](#16-screen-3-my-patients)
17. [Patient Detail View](#17-patient-detail-view)
18. [Screen 4: Stats](#18-screen-4-stats)
19. [Screen 5: Profile & Settings](#19-screen-5-profile--settings)
20. [Canned Message Management](#20-canned-message-management)
21. [Real-Time System (Doctor Portal)](#21-real-time-system-doctor-portal)
22. [Notification System (Doctor)](#22-notification-system-doctor)
23. [Consultation Lifecycle (Doctor View)](#23-consultation-lifecycle-doctor-view)
24. [Follow-Up Case Handling](#24-follow-up-case-handling)
25. [Keyboard Shortcuts & Efficiency](#25-keyboard-shortcuts--efficiency)
26. [Responsive Design & Mobile Layout](#26-responsive-design--mobile-layout)
27. [Error States & Edge Cases](#27-error-states--edge-cases)
28. [Security & Privacy](#28-security--privacy)
29. [Analytics Events](#29-analytics-events)

---

## 1. App Structure & File Layout

### Next.js App Router Structure

```
apps/doctor-portal/
├── src/
│   ├── app/
│   │   ├── layout.tsx              → Root layout (sidebar, auth provider, SSE provider)
│   │   ├── page.tsx                → Case queue (default landing)
│   │   ├── login/
│   │   │   └── page.tsx            → Phone OTP login screen
│   │   ├── case/
│   │   │   └── [id]/
│   │   │       └── page.tsx        → Case review (3-panel layout)
│   │   ├── patients/
│   │   │   ├── page.tsx            → My patients (directory)
│   │   │   └── [id]/
│   │   │       └── page.tsx        → Patient detail view (full history)
│   │   ├── stats/
│   │   │   └── page.tsx            → Doctor statistics dashboard
│   │   └── settings/
│   │       └── page.tsx            → Profile, availability, canned messages, notifications
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx         → Desktop sidebar navigation
│   │   │   ├── BottomNav.tsx       → Mobile bottom navigation
│   │   │   └── TopBar.tsx          → Mobile top bar (doctor name, notification bell)
│   │   ├── cases/
│   │   │   ├── CaseQueue.tsx       → Case queue table/card list
│   │   │   ├── CaseCard.tsx        → Individual case card (queue item)
│   │   │   ├── CaseFilters.tsx     → Filter chips + sort dropdown
│   │   │   ├── CaseReview.tsx      → 3-panel case review layout
│   │   │   ├── PatientSummary.tsx  → Left panel (patient info sidebar)
│   │   │   ├── ClinicalTabs.tsx    → Center panel (AI, questionnaire, photos, labs, messages)
│   │   │   └── ActionsPanel.tsx    → Right panel (prescribe, order labs, etc.)
│   │   ├── prescription/
│   │   │   ├── PrescriptionBuilder.tsx  → Full-screen prescription modal
│   │   │   ├── TemplateSelector.tsx     → Condition-specific template dropdown
│   │   │   ├── MedicationList.tsx       → Editable medication rows
│   │   │   ├── MedicationRow.tsx        → Single medication (drug, dose, freq, duration, instructions)
│   │   │   ├── CounselingNotes.tsx      → Pre-filled editable text area
│   │   │   ├── DigitalSignature.tsx     → Tap/click-to-sign component
│   │   │   └── PrescriptionPreview.tsx  → PDF preview before submit
│   │   ├── lab-order/
│   │   │   ├── LabOrderForm.tsx    → Lab order creation modal
│   │   │   └── PanelSelector.tsx   → Test panel selection by condition
│   │   ├── messaging/
│   │   │   ├── ChatThread.tsx      → Message thread with patient
│   │   │   ├── MessageBubble.tsx   → Individual message
│   │   │   ├── CannedResponses.tsx → Quick-reply selector
│   │   │   └── AttachmentUpload.tsx → Photo/PDF attachment
│   │   ├── patients/
│   │   │   ├── PatientDirectory.tsx → Searchable patient list
│   │   │   ├── PatientHistory.tsx  → Full consultation/prescription history
│   │   │   └── PhotoComparison.tsx → Side-by-side progress photos
│   │   ├── stats/
│   │   │   ├── StatsOverview.tsx   → Metric cards + charts
│   │   │   └── CaseBreakdown.tsx   → Condition/outcome breakdown
│   │   └── common/
│   │       ├── Badge.tsx           → Status/condition/attention badges
│   │       ├── Modal.tsx           → Reusable modal wrapper
│   │       ├── PDFViewer.tsx       → Inline PDF viewer (prescriptions, lab results)
│   │       ├── Lightbox.tsx        → Photo zoom/compare overlay
│   │       └── LoadingStates.tsx   → Skeleton loaders per component
│   ├── hooks/
│   │   ├── useSSE.ts              → SSE connection manager
│   │   ├── useCaseQueue.ts        → Case queue data + filters
│   │   ├── useCaseReview.ts       → Single case data + actions
│   │   ├── useMessages.ts         → Chat thread data
│   │   └── useKeyboardShortcuts.ts → Global shortcut handler
│   ├── stores/
│   │   ├── authStore.ts           → JWT tokens, doctor profile
│   │   ├── caseQueueStore.ts      → Active filters, sort order, pagination cursor
│   │   ├── notificationStore.ts   → Unread counts, badge states
│   │   └── uiStore.ts            → Sidebar collapsed state, panel sizes
│   ├── lib/
│   │   ├── trpc.ts               → tRPC client setup (with auth headers)
│   │   ├── sse.ts                → SSE client (reconnect logic, event handlers)
│   │   └── utils.ts              → Date formatting, phone masking, etc.
│   └── types/
│       ├── consultation.ts        → Consultation, AIAssessment, Prescription types
│       ├── patient.ts             → Patient profile types
│       └── enums.ts               → Status enums, condition enums
├── public/
│   └── favicon.ico
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Shared Packages (from monorepo `packages/`)

```
packages/
├── ui/               → Shared Tailwind + shadcn/ui component library (Button, Input, Badge, Modal, StatusBadge, Stepper, etc.)
├── api-client/       → tRPC client factory + shared query hooks (useCase, useLabOrder, etc.)
├── types/            → Zod schemas + TypeScript interfaces (Consultation, Patient, Prescription, enums)
└── config/           → Shared ESLint, TypeScript, and Prettier configurations
```

---

## 2. Authentication & Session Management

### 2.1 Login Flow

**Screen:** `/login`

Doctors are professional accounts provisioned by the coordinator (admin). **No self-registration.** No social login (Google/Apple). Phone OTP only.

**Flow:**

```
┌──────────────────────────────────┐
│  Onlyou — Doctor Portal          │
│                                  │
│  Enter your registered phone     │
│  number to sign in               │
│                                  │
│  +91 [__________]               │
│                                  │
│  [Send OTP via WhatsApp]         │
│                                  │
│  ───── or ─────                  │
│  [Send OTP via SMS]              │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  Enter 6-digit OTP               │
│                                  │
│  Sent to +91 •••••• 4567        │
│  via WhatsApp                    │
│                                  │
│  [_ _ _ _ _ _]                  │
│                                  │
│  Didn't receive? [Resend] (30s) │
│  [Try SMS instead]              │
└──────────────┬───────────────────┘
               │  ✅ Verified
               ▼
┌──────────────────────────────────┐
│  JWT issued:                     │
│  - Access token: 15 min          │
│  - Refresh token: 30 days        │
│  - Stored in HttpOnly cookies    │
│  - Cookie flags: Secure,         │
│    SameSite=Strict, Path=/       │
│                                  │
│  Redirect → / (case queue)        │
└──────────────────────────────────┘
```

**API calls:**

```
// Step 1: Request OTP
trpc.auth.requestOTP.mutate({
  phone: '+919876504567',
  channel: 'whatsapp'   // or 'sms'
})
→ Returns: { success: true, expiresIn: 300 }

// Step 2: Verify OTP
trpc.auth.verifyOTP.mutate({
  phone: '+919876504567',
  otp: '482917'
})
→ Returns: { accessToken, refreshToken, user: { id, role: 'doctor', name, nmcNumber } }
→ Server sets HttpOnly cookies with both tokens
```

**OTP details:**
- 6-digit numeric OTP
- Stored hashed (SHA-256) in Redis with 5-minute TTL
- WhatsApp delivery via Gupshup API (primary) — cost: ~₹0.10–0.15/message
- SMS fallback via Gupshup SMS (primary) / MSG91 (secondary fallback) — cost: ~₹0.15–0.50/message
- Rate limit: 3 OTP requests per phone per 15 minutes. After 3: "Too many attempts. Please try again in 15 minutes."
- Resend cooldown: 30 seconds between OTP requests

**Phone masking on OTP screen:**
- `+91 •••••• 4567` (last 4 digits visible, 6 dots masking first 6 digits)

### 2.2 Token Strategy (Web Portal)

| Token | Storage | Expiry | Notes |
|-------|---------|--------|-------|
| Access Token (JWT) | HttpOnly cookie | 15 minutes | Sent automatically with every request via cookie |
| Refresh Token | HttpOnly cookie | 30 days (doctor) | Longer than patient (7 days) — doctors need persistent sessions |

**Why HttpOnly cookies (not Bearer tokens):**
- Web portals use cookies → immune to XSS token theft
- Mobile app uses Bearer tokens → stored in `expo-secure-store`
- Both follow the same JWT payload structure

**Cookie flags:**
- `HttpOnly` — JavaScript cannot read the token (XSS-proof)
- `Secure` — only sent over HTTPS
- `SameSite=Strict` — not sent on cross-site requests (CSRF protection)
- `Path=/` — available to all portal routes

**JWT payload:**

```json
{
  "sub": "doctor_uuid",
  "role": "doctor",
  "name": "Dr. Rajesh Patel",
  "nmcNumber": "NMC-2019-12345",
  "iat": 1709000000,
  "exp": 1709000900,
  "jti": "unique-token-id"
}
```

### 2.3 Token Refresh Flow

```
1. tRPC client interceptor detects 401 response
2. Automatically calls trpc.auth.refresh.mutate() — refresh token sent via cookie
3. Server validates refresh token:
   a. Hash and compare against PostgreSQL stored hash
   b. Check expiry (30 days)
   c. Check if token has been revoked (theft detection)
4. If valid:
   a. Issue new access token + new refresh token (rotation)
   b. Invalidate old refresh token in PostgreSQL
   c. Set new HttpOnly cookies
   d. Retry the original failed request
5. If invalid:
   a. Clear all cookies
   b. Redirect to /login
   c. Show toast: "Your session has expired. Please sign in again."
```

**Theft detection:** If an old (already-rotated) refresh token is used, ALL tokens for that doctor are invalidated immediately. This detects token replay attacks — if the attacker uses the stolen token after the legitimate user has already refreshed, the old token triggers a full revocation.

### 2.4 Session Persistence

- Doctor opens portal → cookie-based tokens are sent automatically
- On page refresh → access token checked → if expired, silent refresh via refresh token
- Closing browser → cookies persist (30-day refresh token)
- Explicit logout → server revokes refresh token + clears cookies + redirects to `/login`
- Multiple tabs → all tabs share the same cookies (browser-level)
- Multiple devices → each device has independent token pairs

### 2.5 Account Provisioning

Doctors do **not** self-register. The flow:

1. Coordinator (admin) creates doctor record in admin dashboard:
   - Name, phone number, NMC registration number, specializations (verticals they can handle), city
2. System sends WhatsApp message to doctor's phone:
   > "Welcome to Onlyou! You've been registered as a consulting physician. Visit doctor.onlyou.life to access your dashboard."
3. Doctor navigates to `doctor.onlyou.life` → enters phone → OTP → logged in
4. First-time login: doctor lands on `/settings` to review and confirm their profile details

**Edge case — unprovisioned phone tries to log in:**
- OTP is sent (to prevent phone enumeration attacks) → after verification, server returns 403: "This phone number is not registered as a doctor account. Contact your administrator."
- The user sees: "Account not found. If you believe this is an error, please contact the Onlyou team."

---

## 3. Sidebar Navigation & Layout

### 3.1 Desktop Layout (≥1024px)

```
┌──────────┬───────────────────────────────────────────────┐
│          │                                               │
│  SIDEBAR │              MAIN CONTENT                     │
│  (240px) │              (remaining width)                │
│          │                                               │
│  Logo    │                                               │
│          │                                               │
│  Cases   │                                               │
│  (badge) │                                               │
│          │                                               │
│  Patients│                                               │
│          │                                               │
│  Stats   │                                               │
│          │                                               │
│  ─────── │                                               │
│          │                                               │
│  Settings│                                               │
│          │                                               │
│  ─────── │                                               │
│  Dr.Name │                                               │
│  Logout  │                                               │
│          │                                               │
└──────────┴───────────────────────────────────────────────┘
```

**Sidebar items:**

| Item | Icon | Route | Badge |
|------|------|-------|-------|
| Cases | 📋 (clipboard) | `/` | Red badge with count of NEW + IN_REVIEW cases |
| Patients | 👥 (people) | `/patients` | — |
| Stats | 📊 (chart) | `/stats` | — |
| Settings | ⚙️ (gear) | `/settings` | — |

**Sidebar behavior:**
- Collapsible: click collapse button (top-right of sidebar) → sidebar shrinks to 64px icon-only mode
- Collapsed state persisted in `localStorage`
- Active route highlighted with left border accent + background shade
- Badge on "Cases" updates in real-time via SSE (new case submitted → badge increments)

**Bottom of sidebar:**
- Doctor avatar (initials circle) + name: "Dr. Rajesh Patel"
- NMC number shown on hover tooltip
- `[Logout]` link

### 3.2 Mobile Layout (<1024px)

```
┌───────────────────────────────────────────────────────────┐
│  ☰ Onlyou Doctor          🔔 (2)          Dr. Patel ▼    │
├───────────────────────────────────────────────────────────┤
│                                                           │
│                    MAIN CONTENT                           │
│                    (full width)                            │
│                                                           │
├───────────────────────────────────────────────────────────┤
│  📋 Cases    👥 Patients    📊 Stats    ⚙️ Settings      │
└───────────────────────────────────────────────────────────┘
```

**Top bar (mobile):**
- Hamburger menu (☰) — opens slide-out drawer with full sidebar content
- Portal title: "Onlyou Doctor"
- Notification bell with unread count badge
- Doctor name with dropdown (profile, logout)

**Bottom navigation (mobile):**
- 4 tabs: Cases | Patients | Stats | Settings
- Cases tab shows badge count (same as desktop sidebar)
- Active tab highlighted

### 3.3 Notification Bell

Visible in both desktop sidebar (top area) and mobile top bar.

**Bell icon behavior:**
- Default: outline bell icon
- Unread notifications: solid bell icon + red dot with count (e.g., "3")
- Tapping opens notification dropdown (desktop) or full-screen panel (mobile)

**Notification dropdown content:**
- List of recent notifications, newest first (max 20 shown)
- Each notification: icon + title + body + timestamp + read/unread indicator
- "Mark all as read" link at top
- "View all" link at bottom → navigates to... (no separate notification page; doctor's primary view is the case queue, so notifications link directly to the relevant case)

**Notification types shown in dropdown:**

| Event | Notification Text | Action on Tap |
|-------|-------------------|---------------|
| New case assigned | "New Hair Loss case assigned — Rahul M., 28M" | Opens `/case/[id]` |
| Patient responded (INFO_REQUESTED) | "Patient responded — Sneha K. (PCOS)" | Opens `/case/[id]` (messages tab) |
| Lab results ready | "Lab results ready — Amit S. (ED)" | Opens `/case/[id]` (lab results tab) |
| New message from patient | "New message from Priya R. (Weight)" | Opens `/case/[id]` (messages tab) |
| Follow-up due | "Follow-up due — Vikram N. (Hair Loss) — 3-month review" | Opens `/case/[id]` |
| SLA warning | "⚠️ Case review overdue — 22 hours — Meera J. (PCOS)" | Opens `/case/[id]` |

---

## 4. Screen 1: Case Queue (Default Landing)

**Route:** `/` (root — default landing page)
**Purpose:** Primary working screen — the doctor's inbox of cases to review

### 4.1 Layout

**Desktop:** Full-width table with inline actions
**Mobile:** Scrollable card list (one card per case)

### 4.2 Filter Chips (Top Bar)

Horizontally scrollable row of filter chips. Multiple can be active simultaneously (AND logic within group, OR logic between options of same group).

**Condition filters:**
| Chip | Color Code |
|------|-----------|
| All | Gray (default active) |
| Hair Loss | Purple |
| ED | Blue |
| PE | Teal |
| Weight | Orange |
| PCOS | Pink |

**Status filters:**
| Status | Meaning |
|--------|---------|
| New | `SUBMITTED` or `AI_COMPLETE` — not yet opened by doctor |
| In Review | `ASSIGNED` or `REVIEWING` — doctor has opened but not actioned |
| Awaiting Patient | `INFO_REQUESTED` — doctor asked for more info, waiting on patient |
| Lab Results Ready | Lab results uploaded + linked to this consultation |
| Follow-Up Due | Follow-up check-in is due (4-week, 3-month, 6-month, annual) |
| Completed | `PRESCRIPTION_CREATED` or `COMPLETED` — fully actioned |
| Referred | Doctor referred patient to specialist |

**Chip behavior:**
- Tap to toggle active/inactive
- Active chip: filled background with condition color
- Inactive chip: outline only
- "All" deactivates all other condition filters
- Badge count shown on each status chip (e.g., "New (7)")
- Filter state persisted to `caseQueueStore` (Zustand) — survives page navigation but not browser close

### 4.3 Sort Dropdown

**Options:**

| Sort | Description | Default |
|------|-------------|---------|
| Newest first | By `createdAt` descending | ✅ Default |
| Oldest first | By `createdAt` ascending | |
| Highest attention | By AI attention level (Critical → High → Medium → Low) | |
| Longest waiting | By time since last status change (most stale first) | |

### 4.4 Search Bar

**Position:** Above filter chips (desktop) / below top bar (mobile)
**Placeholder:** "Search by patient name, phone, or case ID..."

**Search behavior:**
- Debounced (300ms) — doesn't fire on every keystroke
- Searches against: patient `firstName`, `lastName`, phone (last 4 digits), consultation UUID
- Results filter the current queue view in real-time
- Minimum 2 characters to trigger search
- Clear button (✕) resets to full queue

**API call:**
```
trpc.doctor.cases.list.query({
  search: 'Rahul',
  conditions: ['HAIR_LOSS'],
  statuses: ['SUBMITTED', 'AI_COMPLETE'],
  sort: 'newest',
  cursor: null,      // pagination cursor
  limit: 20
})
```

### 4.5 Case Card / Table Row

**Desktop table columns:**

| Column | Content | Width |
|--------|---------|-------|
| Patient | Name, age, sex, city | 20% |
| Condition | Color-coded badge | 10% |
| Attention | 🟢 Low / 🟡 Medium / 🔴 High / ⛔ Critical | 8% |
| Status | Status badge | 12% |
| AI Summary | 1-line snippet (truncated) | 30% |
| Waiting | Time since submission (e.g., "2h 15m", "1d 4h") | 10% |
| Actions | Quick action icons | 10% |

**Quick actions from queue (without opening full case review):**
- **Tap/click row** → Opens full case review (`/case/[id]`)
- **Desktop: Right-click row** → Context menu: "Open" / "Quick-assign to me" / "Open in new tab"
- **Mobile: Swipe left on card** → "Assign to me" action button (assigns case without opening review)

**Mobile card layout:**

```
┌─────────────────────────────────────────┐
│  Rahul M., 28M, Mumbai          2h 15m │
│  ┌──────────┐  ┌────────┐  ┌─────────┐ │
│  │Hair Loss │  │🔴 High │  │  New    │ │
│  └──────────┘  └────────┘  └─────────┘ │
│                                         │
│  "Pattern consistent with Norwood III,  │
│   elevated DHT suggests genetic AGA..." │
└─────────────────────────────────────────┘
```

### 4.6 AI Attention Level Badges

The AI assessment engine assigns an attention level to each case. This drives sort order and visual urgency.

| Level | Badge | Color | Meaning | Examples |
|-------|-------|-------|---------|----------|
| Low | 🟢 Low | Green | Standard case, no red flags | Typical pattern, no contraindications |
| Medium | 🟡 Medium | Amber | Some factors need attention | Mild drug interactions, moderate symptoms |
| High | 🔴 High | Red | Significant clinical concern | Multiple contraindications, severe symptoms |
| Critical | ⛔ Critical | Dark red | Immediate review required | Cardiovascular risk + ED meds, suicidal ideation, chest pain during activity |

**Badge behavior:**
- Shown in queue card/row
- Also shown prominently at top of Case Review screen
- Critical cases: queue row has subtle red left-border accent
- If AI assessment failed or is pending: show "⏳ AI Processing" badge instead (gray)

### 4.7 Pagination

- Cursor-based pagination (not offset-based) — better performance with large datasets
- Load 20 cases per page
- "Load more" button at bottom of list (desktop) / infinite scroll (mobile)
- When new case arrives via SSE → toast notification at top: "New case: [Patient Name] — [Condition]" with `[View]` button
- New case does NOT auto-insert into current view (avoids disruptive jumps) — doctor clicks "View" or refreshes filters

### 4.8 Empty States

| Scenario | Message |
|----------|---------|
| No cases at all (new doctor) | "No cases assigned yet. Cases will appear here as patients submit consultations." |
| No cases matching filters | "No cases match your filters. Try adjusting your filters or clearing the search." |
| All cases completed | "All caught up! No pending cases." + subtle celebration illustration |

### 4.9 Real-Time Updates (SSE)

The case queue listens for SSE events on the doctor's personal channel:

| Event | Effect on Queue |
|-------|----------------|
| `case.assigned` | Toast notification + badge count increment |
| `case.patient_responded` | Case card blinks briefly + status badge updates to "In Review" |
| `case.lab_results_ready` | Case card shows "Lab Ready" indicator |
| `case.message_received` | Blue message dot appears on case card |

Events do NOT re-sort or re-filter the visible queue — they update individual cards in-place. Doctor controls their own view.

---

## 5. Screen 2: Case Review (3-Panel Layout)

**Route:** `/case/[id]`
**Purpose:** The core clinical workspace — where the doctor reviews patient data and takes action

### 5.1 Desktop Layout (3-Panel)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Back to Queue    Rahul M. — Hair Loss    🔴 High Attention       │
├────────────────┬──────────────────────────────┬──────────────────────┤
│                │                              │                      │
│  LEFT PANEL    │     CENTER PANEL             │   RIGHT PANEL        │
│  Patient       │     Clinical Data            │   Actions            │
│  Summary       │     (tabs)                   │                      │
│  (30% width)   │     (45% width)              │   (25% width)        │
│                │                              │                      │
│  Name          │  [AI] [Questionnaire]        │   [Prescribe]        │
│  Age, Sex      │  [Photos] [Lab Results]      │   [Order Blood Work] │
│  City          │  [Messages]                  │   [Request More Info]│
│  Phone         │                              │   [Refer]            │
│  Gov ID status │  ─────────────────────       │   [Refund]           │
│  Subscriptions │  Tab content area            │   [Close Case]       │
│  History       │                              │                      │
│  Medications   │                              │                      │
│  Allergies     │                              │                      │
│                │                              │                      │
└────────────────┴──────────────────────────────┴──────────────────────┘
```

### 5.2 Mobile Layout (Single Column)

On mobile (<1024px), the 3 panels collapse into a single scrollable column:

1. **Sticky top bar:** Patient name + condition badge + attention level + back button
2. **Patient summary:** Collapsible card (starts collapsed on mobile to save space)
3. **Clinical tabs:** Horizontal scrollable tab bar → tab content below
4. **Sticky bottom bar:** Action buttons in a row — tap opens the corresponding action modal

### 5.3 Left Panel — Patient Summary

**Content (top to bottom):**

**Identity:**
- Full name: "Rahul Mehta"
- Age, Sex: "28, Male"
- City: "Mumbai, Maharashtra"
- Phone: `+91 •••••• 4567` (masked — doctor sees last 4 digits only for identity confirmation. Full phone shown only if doctor initiates a call via admin request.)
- Government ID: "Verified ✅" or "Pending ⏳" (doctor does NOT see the actual ID image — that's admin-only)

**Subscriptions:**
- List of active vertical subscriptions with plan type:
  - "💇 Hair Loss — Monthly (₹999/mo) — Active since 15 Jan 2026"
  - "🛡️ ED — Quarterly (₹3,297/qtr) — Active since 10 Feb 2026"
- If subscription paused: amber "Paused" badge
- If subscription cancelled: gray "Cancelled" badge with end date

**Consultation History:**
- List of all past consultations for this patient (across all verticals):
  - "Hair Loss — Initial Assessment — 15 Jan 2026 — Prescribed"
  - "ED — Follow-up (4-week) — 10 Mar 2026 — In Progress" (← current)
- Current consultation highlighted with blue left border
- Tapping a past consultation opens it in a new tab/window (does not navigate away from current review)

**Current Medications (from latest questionnaire):**
- Medications the patient reported they are currently taking
- Each medication shown as a pill badge: `Finasteride 1mg` `Multivitamin`
- Flagged medications highlighted in amber (those flagged by AI as potential interactions)

**Allergies:**
- From questionnaire: "No known allergies" or list: `Sulfa drugs` `Penicillin`
- If allergies exist, shown with red ⚠️ icon

### 5.4 Auto-Assignment on Open

When a doctor opens a case that is in `SUBMITTED` or `AI_COMPLETE` status:

1. System checks if case is already assigned to another doctor
   - If unassigned → auto-assign to current doctor, status → `ASSIGNED`
   - If assigned to this doctor → no change
   - If assigned to another doctor → show warning banner: "This case is currently assigned to Dr. [Name]. Do you want to reassign it to yourself?" with `[Yes, take over]` / `[View only]` buttons
2. Status transitions: `SUBMITTED` → `ASSIGNED` → (doctor starts reviewing) → `REVIEWING`
3. `REVIEWING` status is set when doctor clicks any action (prescribe, order labs, etc.) or after 30 seconds on the case review page (prevents cases sitting in `ASSIGNED` forever)

**Timestamp tracking:**
- `assignedAt` — when doctor first opens the case
- `firstReviewedAt` — when doctor first loads the case review
- `lastViewedAt` — updates on every page view (for "longest waiting" sort)

---

## 6. AI Assessment Tab (Deep Dive)

**Purpose:** The AI pre-assessment is the first thing the doctor sees. It's designed to save doctor time by highlighting what matters.

### 6.1 AI Assessment Layout

```
┌────────────────────────────────────────────────────┐
│  🤖 AI Pre-Assessment                              │
│  Generated: 15 Jan 2026, 2:34 PM                  │
│  Model: Claude 3.5 Sonnet | Confidence: 87%       │
├────────────────────────────────────────────────────┤
│                                                    │
│  CLASSIFICATION                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ Androgenetic Alopecia (Male Pattern)          │ │
│  │ Norwood Scale: Stage III Vertex               │ │
│  │ Confidence: 87%                               │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  🔴 ATTENTION LEVEL: HIGH                          │
│  Rationale: "Patient reports current finasteride   │
│  use with persistent sexual side effects.          │
│  Requires careful risk-benefit assessment          │
│  before continuing 5-alpha reductase inhibitor."   │
│                                                    │
│  ──────────────────────────────────────────────    │
│                                                    │
│  ⚠️ RED FLAGS                                      │
│  • Sexual side effects with current finasteride    │
│  • Family history of prostate cancer (father)      │
│                                                    │
│  ──────────────────────────────────────────────    │
│                                                    │
│  💊 CONTRAINDICATIONS MATRIX                       │
│  ┌──────────────┬───────┬────────┬──────────────┐ │
│  │ Medication   │ Safe  │ Caution│ Blocked      │ │
│  ├──────────────┼───────┼────────┼──────────────┤ │
│  │ Finasteride  │       │   ⚠️   │              │ │
│  │ Minoxidil 5% │  ✅   │        │              │ │
│  │ Biotin       │  ✅   │        │              │ │
│  │ Ketoconazole │  ✅   │        │              │ │
│  │ Dutasteride  │       │        │     ⛔       │ │
│  └──────────────┴───────┴────────┴──────────────┘ │
│                                                    │
│  ──────────────────────────────────────────────    │
│                                                    │
│  📋 RECOMMENDED PROTOCOL                           │
│  "Minoxidil-only regimen recommended as first      │
│  line given finasteride side effects. Consider      │
│  topical finasteride 0.1% as alternative with      │
│  reduced systemic exposure. Recommend DHT panel    │
│  before any 5-ARI initiation."                     │
│                                                    │
│  ──────────────────────────────────────────────    │
│                                                    │
│  📝 FULL SUMMARY                                   │
│  "28-year-old male presenting with progressive     │
│   frontal and vertex thinning consistent with      │
│   Norwood III-V pattern. Patient has been using    │
│   finasteride 1mg daily for 8 months with          │
│   reported decrease in libido and erectile          │
│   function. Family history significant for          │
│   prostate cancer in father (age 62). No other     │
│   medications. No allergies reported. BMI 24.2     │
│   (normal). Recommend transitioning to topical     │
│   approach and ordering DHT panel."                │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 6.2 Condition-Specific AI Extensions

Beyond the standard assessment, each condition adds specialized sections:

**Hair Loss extensions:**
- Norwood Scale assessment (with stage diagram reference)
- Finasteride safety check result: Safe / Caution / Contraindicated (with reasoning)
- Hair density zone assessment (frontal, mid-scalp, vertex, temporal — from photos if available)

**ED extensions:**
- IIEF-5 score calculation + severity classification (Severe: 5-7 / Moderate: 8-11 / Mild-Moderate: 12-16 / Mild: 17-21 / Normal: 22-25)
- Cardiovascular risk panel: assessed from questionnaire (family history, smoking, diabetes, hypertension, lipids)
- **Nitrate check — RED BANNER:** If patient reports taking any nitrate-containing medication (nitroglycerin, isosorbide, amyl nitrite, "poppers"), a full-width red banner appears at TOP of AI assessment:

```
┌──────────────────────────────────────────────────────────┐
│  ⛔ ABSOLUTE CONTRAINDICATION — NITRATE USE DETECTED     │
│                                                          │
│  Patient reports use of [medication name].               │
│  PDE5 inhibitors (Sildenafil, Tadalafil) are            │
│  ABSOLUTELY CONTRAINDICATED with nitrates.               │
│  Risk: Severe, potentially fatal hypotension.            │
│                                                          │
│  DO NOT prescribe PDE5 inhibitors.                       │
│  Consider: Alprostadil, Vacuum devices, or Referral.     │
└──────────────────────────────────────────────────────────┘
```

- Etiology assessment: Organic / Psychogenic / Mixed (with confidence)
- Current PDE5 inhibitor usage (from questionnaire)

**PE extensions:**
- PEDT (Premature Ejaculation Diagnostic Tool) score + classification:
  - Score ≥11: PE likely
  - Score 9-10: Inconclusive
  - Score ≤8: PE unlikely
- IELT (Intravaginal Ejaculation Latency Time) estimate from questionnaire
- Comorbid ED check: If patient also has ED → highlighted banner: "⚠️ Comorbid ED detected — consider combined ED+PE treatment approach. Patient may qualify for combined subscription."
- Lifelong vs. Acquired classification

**Weight Management extensions:**
- BMI calculation + WHO Asian classification:
  - <18.5: Underweight
  - 18.5–22.9: Normal
  - 23.0–24.9: Overweight (Asian cut-off, not 25.0)
  - 25.0–29.9: Obese Class I
  - ≥30.0: Obese Class II
- Metabolic risk assessment: diabetes risk, cardiovascular risk, fatty liver risk
- Eating disorder screening flag: if questionnaire answers suggest disordered eating patterns → amber banner: "⚠️ Eating disorder risk indicators detected. Consider screening before prescribing weight-loss medication."
- GLP-1 eligibility: "Eligible" (BMI ≥35 or BMI ≥30 with comorbidity) / "Not eligible" / "Borderline — doctor discretion"
- Note: GLP-1 tier is deferred (greyed out in patient app with "Coming Soon" badge). If AI marks as GLP-1 eligible, doctor sees the flag but standard weight management protocol applies for MVP.

**PCOS extensions:**
- Rotterdam criteria checklist (need 2 of 3 for PCOS diagnosis):
  - ☐/☑ Oligo/anovulation (irregular periods)
  - ☐/☑ Clinical/biochemical hyperandrogenism
  - ☐/☑ Polycystic ovaries on ultrasound (from self-reported imaging)
- PCOS phenotype classification: A (all 3) / B (hyperandrogenism + oligo) / C (hyperandrogenism + polycystic) / D (oligo + polycystic)
- **Fertility intent banner:** Prominent banner if patient answered "Yes" or "Maybe" to trying to conceive:

```
┌──────────────────────────────────────────────────────────┐
│  🤰 FERTILITY INTENT: Trying to conceive                 │
│                                                          │
│  Patient is actively trying to become pregnant.          │
│  Avoid: Spironolactone, isotretinoin, statins.           │
│  Consider: Lifestyle-first, Metformin, Ovulation         │
│  induction. Refer to fertility specialist if no          │
│  conception within 6 months of treatment.                │
└──────────────────────────────────────────────────────────┘
```

- Insulin resistance flag: based on BMI + acanthosis nigricans + fasting glucose (if labs available)

### 6.3 AI Assessment States

| State | What Doctor Sees |
|-------|-----------------|
| Processing | "⏳ AI assessment is being generated..." + animated spinner. Doctor can still view other tabs. |
| Complete | Full assessment as described above |
| Failed | "⚠️ AI assessment failed to generate. Please review the questionnaire and photos manually." + `[Retry AI Assessment]` button |
| Partial | "⚠️ AI assessment generated with warnings: [list of missing data points]" — shows what it could assess, flags what's missing |

**Retry behavior:**
- `[Retry AI Assessment]` calls: `trpc.doctor.consultation.retryAI.mutate({ consultationId })`
- Queues a new BullMQ job for AI processing
- Button disabled during processing with spinner
- Max 3 retries per consultation (after 3: "AI assessment could not be completed. Please proceed with manual review.")

### 6.4 AI Disclaimer

Fixed footer at bottom of AI Assessment tab:

> "This AI pre-assessment is a clinical decision support tool generated by Claude AI. It does not constitute medical advice. The prescribing physician retains full clinical responsibility for all treatment decisions. AI confidence levels reflect pattern matching against training data and should not be interpreted as diagnostic certainty."


---

## 7. Questionnaire Tab

**Purpose:** Show the patient's complete questionnaire responses for doctor review

### 7.1 Layout

Collapsible sections matching the questionnaire JSON schema structure. Each section corresponds to a question group (e.g., "Medical History", "Current Symptoms", "Lifestyle", "Medications").

```
┌────────────────────────────────────────────────────┐
│  📋 Questionnaire Responses                        │
│  Completed: 15 Jan 2026, 2:12 PM                  │
│  Questions answered: 25/25                         │
├────────────────────────────────────────────────────┤
│                                                    │
│  ▼ Medical History (6 questions)                   │
│  ┌──────────────────────────────────────────────┐ │
│  │ Q: Do you have any existing medical           │ │
│  │    conditions?                                 │ │
│  │ A: Hypertension (controlled with medication)  │ │
│  │    ⚠️ Flagged by AI                           │ │
│  │                                               │ │
│  │ Q: Are you currently taking any medications?  │ │
│  │ A: Amlodipine 5mg daily, Finasteride 1mg     │ │
│  │    daily                                      │ │
│  │    ⚠️ Flagged by AI                           │ │
│  │                                               │ │
│  │ Q: Any known allergies to medications?        │ │
│  │ A: No known allergies                         │ │
│  │                                               │ │
│  │ ...                                           │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ▶ Current Symptoms (7 questions)     — collapsed  │
│  ▶ Lifestyle (5 questions)            — collapsed  │
│  ▶ Sexual Health (4 questions)        — collapsed  │
│  ▶ Treatment Goals (3 questions)      — collapsed  │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 7.2 Flagged Answers

Answers that triggered AI red flags or contraindications are highlighted:

- Amber background + ⚠️ icon = caution (e.g., "Taking blood thinners" for hair transplant consideration)
- Red background + ⛔ icon = critical flag (e.g., "Taking nitroglycerin" for ED patient)
- Tooltip on hover: "Flagged: [reason from AI assessment]"

**Quick-jump:** Clicking a red flag in the AI Assessment tab scrolls the Questionnaire tab directly to the flagged answer.

### 7.3 Follow-Up Questionnaire Comparison

For follow-up consultations, the doctor sees both the initial and follow-up responses:

```
┌──────────────────────────────────────────────────────┐
│  Q: How would you rate your hair loss severity?      │
│                                                      │
│  Initial (15 Jan 2026):  "Moderate — noticeable"     │
│  Follow-up (15 Apr 2026): "Mild — slight improvement"│
│                           ↑ Changed ✅               │
└──────────────────────────────────────────────────────┘
```

- Changed answers highlighted with green "Changed ✅" badge
- Unchanged answers shown normally (no special indicator)
- Doctor can toggle "Show changes only" to filter to changed answers

---

## 8. Photos Tab

**Purpose:** View patient-uploaded clinical photos

### 8.1 Photo Display

**Hair Loss** — 4-photo grid (2×2):

| Position | Angle | Label |
|----------|-------|-------|
| Top-left | Top of head | "Crown/Vertex" |
| Top-right | Frontal hairline | "Hairline" |
| Bottom-left | Left temple | "Left Temple" |
| Bottom-right | Right temple | "Right Temple" |

**Weight Management** — 2-photo grid (2×1):

| Position | Angle | Label |
|----------|-------|-------|
| Left | Front-facing full body | "Front" |
| Right | Side profile | "Side" |

**ED / PE** — No photos required (questionnaire-only assessment)

**PCOS** — No photos required (questionnaire + labs)

### 8.2 Photo Viewer Features

- **Click to zoom:** Opens full-screen lightbox overlay
- **Lightbox controls:** Zoom in/out, pan, next/previous photo, close (Esc key)
- **Photo metadata:** Upload date, file size, resolution shown below photo in lightbox
- **Quality indicator:** If photo was flagged during upload (blurry, too dark, wrong angle) → amber badge: "⚠️ Quality: Low" — doctor decides if clinically usable

### 8.3 Follow-Up Photo Comparison

For follow-up consultations, the Photos tab switches to comparison mode:

```
┌──────────────────────────────────────────────────────┐
│  Crown/Vertex                                        │
│  ┌─────────────────┬─────────────────┐              │
│  │                 │                 │              │
│  │  BASELINE       │  FOLLOW-UP      │              │
│  │  15 Jan 2026    │  15 Apr 2026    │              │
│  │                 │                 │              │
│  │  [photo]        │  [photo]        │              │
│  │                 │                 │              │
│  └─────────────────┴─────────────────┘              │
│           ◄──── Slider Overlay ────►                 │
│                                                      │
│  Hairline                                            │
│  ┌─────────────────┬─────────────────┐              │
│  │  BASELINE       │  FOLLOW-UP      │              │
│  │  [photo]        │  [photo]        │              │
│  └─────────────────┴─────────────────┘              │
│  ...                                                 │
└──────────────────────────────────────────────────────┘
```

**Comparison features:**
- Side-by-side view (default) — baseline left, follow-up right, with date labels
- Slider overlay mode — drag a vertical divider left/right to reveal baseline vs. follow-up (like before/after slider)
- Toggle between side-by-side and slider modes
- If patient has multiple follow-ups → dropdown to select which two timepoints to compare
- All photos within a comparison pair are from the same angle/position

### 8.4 No Photos State

If no photos were uploaded (e.g., ED/PE consultation):

> "No photos uploaded for this consultation. This condition type does not require clinical photos."

If photos were expected but not uploaded (Hair Loss without photos):

> "⚠️ Expected photos not uploaded by patient. Consider requesting photos via 'Request More Info.'"

---

## 9. Lab Results Tab

**Purpose:** View blood work and diagnostic results for this patient

### 9.1 Lab Results Display

```
┌────────────────────────────────────────────────────┐
│  🔬 Lab Results                                    │
│                                                    │
│  Extended Hair Panel — 20 Jan 2026                 │
│  Lab: City Diagnostics, Mumbai                     │
│  Status: ✅ Results Uploaded                        │
│                                                    │
│  [View PDF]  [View Summary]                        │
│                                                    │
│  ──────────────────────────────────────────────    │
│                                                    │
│  SUMMARY (extracted from PDF):                     │
│  ┌──────────────────┬─────────┬──────────────────┐│
│  │ Test             │ Result  │ Reference Range  ││
│  ├──────────────────┼─────────┼──────────────────┤│
│  │ TSH              │ 2.1     │ 0.4–4.0 mIU/L ✅││
│  │ Free T4          │ 1.2     │ 0.8–1.8 ng/dL ✅││
│  │ Ferritin         │ 18 ⚠️   │ 30–300 ng/mL    ││
│  │ Vitamin D        │ 12 🔴   │ 30–100 ng/mL    ││
│  │ DHT              │ 890     │ 250–990 pg/mL ✅││
│  │ Hemoglobin       │ 14.2    │ 13.5–17.5 g/dL ✅││
│  └──────────────────┴─────────┴──────────────────┘│
│                                                    │
│  ⚠️ Abnormal: Ferritin LOW                         │
│  🔴 Critical: Vitamin D severely deficient         │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 9.2 Result Indicators

| Icon | Meaning | When |
|------|---------|------|
| ✅ | Normal | Result within reference range |
| ⚠️ | Abnormal | Result outside reference range but not critical |
| 🔴 | Critical | Result dangerously outside range — requires attention |

- Abnormal and critical values are sorted to the top of the summary table
- Critical values shown with red background row + timestamp

### 9.3 PDF Viewer

- Inline PDF viewer component (using `react-pdf` or `iframe` with CloudFront signed URL)
- PDF URL: CloudFront signed URL, 1-hour expiry — generated on tab open
- Toolbar: zoom in/out, fit page, download, print
- If PDF fails to load: "Unable to load PDF. [Download] [Retry]"

### 9.4 Historical Lab Results

If patient has multiple lab result sets (from follow-ups or different verticals):

- Dropdown to select which lab panel to view
- "Compare" mode: side-by-side tables showing trends across timepoints
- Trend arrows: ↑ (increasing), ↓ (decreasing), → (stable) next to each value

### 9.5 Self-Uploaded Results

If the patient uploaded their own lab results (instead of booking through the platform):

- Banner at top: "📤 Patient self-uploaded — not from platform partner lab. Verify authenticity."
- Same PDF viewer — doctor can view the uploaded file
- No structured summary extraction (manual review required)
- Doctor can flag the upload: `[Accept as valid]` / `[Request platform lab test]`

### 9.6 No Lab Results State

If no lab orders exist:
> "No lab results available for this consultation."

If lab ordered but results not yet ready:
> "🔬 Lab work ordered — awaiting results. Current status: [SAMPLE_COLLECTED / AT_LAB / PROCESSING]. Estimated: [date]."

---

## 10. Messages Tab (In Case Review)

**Purpose:** Chat thread with this specific patient, within the context of the case review

### 10.1 Chat Interface

```
┌────────────────────────────────────────────────────┐
│  💬 Messages — Rahul M. (Hair Loss)                │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  15 Jan 2026                                  │ │
│  │                                               │ │
│  │          Hi Doctor, I have a question ◄ Patient│ │
│  │          about side effects of                │ │
│  │          finasteride.                         │ │
│  │                         2:30 PM  ✓✓ (read)   │ │
│  │                                               │ │
│  │  Doctor ► Hi Rahul. Which side effects        │ │
│  │          are you experiencing? Please         │ │
│  │          be as specific as possible.           │ │
│  │                         3:15 PM  ✓✓ (read)   │ │
│  │                                               │ │
│  │          I've been noticing decreased ◄       │ │
│  │          libido and some difficulty            │ │
│  │          with erections.                      │ │
│  │                         3:22 PM  ✓✓ (read)   │ │
│  │                                               │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌── Canned Replies ─────────────────────────────┐│
│  │ [Results look good] [Need more photos]        ││
│  │ [Schedule follow-up] [Lab work required]      ││
│  └───────────────────────────────────────────────┘│
│                                                    │
│  ┌─────────────────────────────────┬────┬────────┐│
│  │ Type a message...               │ 📎 │  Send  ││
│  └─────────────────────────────────┴────┴────────┘│
└────────────────────────────────────────────────────┘
```

### 10.2 Message Features

**Text messages:**
- Max 2000 characters per message
- Multi-line input (Shift+Enter for newline, Enter to send)
- Messages are per-consultation thread (one thread per patient per condition)

**Attachments:**
- 📎 button opens attachment picker
- Supported: images (JPEG, PNG — max 10MB), PDFs (max 20MB)
- Upload flow: select file → upload to S3 presigned URL → send message with S3 key reference
- Doctor can attach: prescription PDFs, reference images, clinical guidelines
- Attachments shown as thumbnails (images) or file icons (PDFs) with download link

**Read receipts:**
- ✓ (single check) = sent to server
- ✓✓ (double check gray) = delivered (client received)
- ✓✓ (double check blue) = read by patient (patient opened the conversation)

**Typing indicator:**
- "Rahul is typing…" shown when patient is composing a message
- Doctor's typing state is also broadcast to patient (via SSE)

**Timestamps:**
- Shown every 15 minutes between messages, or on date change
- Date dividers: "Today", "Yesterday", "15 Jan 2026"

### 10.3 Canned Responses

Horizontally scrollable row of quick-reply chips above the input field:

**Default canned responses (system-provided):**

| Label | Message Text |
|-------|-------------|
| "Results look good" | "Your results look good. I'll be preparing your treatment plan shortly." |
| "Need more photos" | "I need a few more photos to complete my assessment. Please upload clear, well-lit photos as described in the app instructions." |
| "Schedule follow-up" | "I'd like to schedule a follow-up check-in to monitor your progress. Please complete the check-in questionnaire when it becomes available." |
| "Lab work required" | "I'm ordering some blood tests to complete your assessment. You'll receive instructions for booking a home collection." |
| "Side effects normal" | "The side effects you're describing are within the expected range for this medication. They typically improve within 2-4 weeks. If they persist or worsen, please let me know immediately." |
| "Stop medication" | "Please stop taking [medication] immediately and let me know if symptoms improve. I'll review your case and adjust your treatment plan." |

**Custom canned responses:**
- Doctors can create their own canned responses in Settings → Canned Messages
- Custom responses appear after system defaults in the chip row
- Max 20 custom canned responses per doctor

**Canned response behavior:**
- Tapping a chip populates the message input (does NOT auto-send)
- Doctor can edit the pre-filled text before sending
- Chips with `[medication]` or `[patient_name]` placeholders are auto-filled with actual values

### 10.4 Message Notifications

When doctor sends a message:
1. Message saved to database
2. Published to Redis Pub/Sub → patient's SSE channel
3. If patient is online (app in foreground): message appears in real-time
4. If patient is offline: BullMQ notification job → FCM push + WhatsApp message (if WhatsApp enabled in patient's preferences)

---

## 11. Actions Panel (Right Panel)

**Purpose:** All actions the doctor can take on a case

### 11.1 Action Buttons

Displayed vertically in the right panel (desktop) or as a sticky bottom bar (mobile):

| Action | Button Style | Condition |
|--------|-------------|-----------|
| **Prescribe** | Primary (filled, blue) | Always visible if case not completed |
| **Order Blood Work** | Secondary (outlined) | Always visible |
| **Request More Info** | Secondary (outlined) | Always visible if case not completed |
| **Refer** | Secondary (outlined) | Always visible |
| **Refund** | Danger (outlined, red) | Only if patient has an active paid subscription for this vertical |
| **Close Case** | Ghost (text only) | Always visible |

**Button states:**
- Disabled with tooltip if action isn't available (e.g., "Prescribe" disabled if AI assessment still processing — tooltip: "Wait for AI assessment to complete")
- Loading spinner replaces button text while action is in progress
- Success toast notification after action completes

### 11.2 Confirmation Modals

High-impact actions require confirmation:

| Action | Requires Confirmation? | Modal Content |
|--------|----------------------|---------------|
| Prescribe | No (prescription builder is its own modal with preview) | — |
| Order Blood Work | Yes | "Order [Panel Name] blood work for [Patient Name]? This will notify the coordinator to arrange collection." |
| Request More Info | No (opens message composer directly) | — |
| Refer | Yes | "Refer [Patient Name] to [Clinic Name]? This will close your active review of this case." |
| Refund | Yes | "Initiate [full/partial] refund of ₹[amount] for [Patient Name]? This requires admin approval." |
| Close Case | Yes | "Close this case? The patient will be notified that their consultation is complete." |

---

## 12. Prescription Builder

**Purpose:** The core clinical action — creating a treatment prescription

### 12.1 Opening the Builder

Clicking "Prescribe" opens a full-screen modal (desktop) or full-screen page (mobile) overlaying the case review.

### 12.2 Prescription Builder Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ✕ Close              PRESCRIPTION BUILDER           [Preview]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  PATIENT: Rahul Mehta, 28M, Mumbai                          │
│  CONDITION: Hair Loss (Androgenetic Alopecia)                │
│  CONSULTATION: #CONS-2026-0142                               │
│                                                              │
│  ─── TEMPLATE ─────────────────────────────────────────────  │
│                                                              │
│  Select template: [ Standard               ▼ ]              │
│                                                              │
│  Available: Standard | Minoxidil Only | Conservative |       │
│  Combination Plus | Advanced | Female AGA | Custom           │
│                                                              │
│  ─── MEDICATIONS ──────────────────────────────────────────  │
│                                                              │
│  ┌──────────────┬─────────┬────────────┬──────────┬────────┐│
│  │ Medication   │ Dosage  │ Frequency  │ Duration │ Notes  ││
│  ├──────────────┼─────────┼────────────┼──────────┼────────┤│
│  │ Minoxidil 5% │ 1ml     │ 2x daily   │ 6 months │ Topical││
│  │ (topical)    │         │ (AM + PM)  │          │ scalp  ││
│  ├──────────────┼─────────┼────────────┼──────────┼────────┤│
│  │ Biotin       │ 10,000  │ 1x daily   │ 6 months │ With   ││
│  │              │ mcg     │ (morning)  │          │ food   ││
│  ├──────────────┼─────────┼────────────┼──────────┼────────┤│
│  │ Ketoconazole │ 2%      │ 3x weekly  │ 3 months │ Leave  ││
│  │ shampoo      │         │            │          │ 5 min  ││
│  └──────────────┴─────────┴────────────┴──────────┴────────┘│
│                                                              │
│  [+ Add Medication]                                          │
│                                                              │
│  ─── COUNSELING NOTES ─────────────────────────────────────  │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ - Apply minoxidil to dry scalp, 1ml each application.   ││
│  │ - Initial shedding in first 2-4 weeks is normal and     ││
│  │   indicates the medication is working.                    ││
│  │ - Results typically visible after 3-6 months of          ││
│  │   consistent use.                                         ││
│  │ - Do not use minoxidil on broken or irritated skin.      ││
│  │ - Wash hands thoroughly after application.                ││
│  │ - Take Biotin with food to improve absorption.            ││
│  └──────────────────────────────────────────────────────────┘│
│  (Pre-filled from template — editable)                       │
│                                                              │
│  ─── REGULATORY INFORMATION (auto-populated) ─────────────  │
│                                                              │
│  Doctor: Dr. Rajesh Patel                                    │
│  NMC Registration: NMC-2019-12345                           │
│  Patient: Rahul Mehta, 28M                                  │
│  Diagnosis: Androgenetic Alopecia (Male Pattern)            │
│  Date: 15 January 2026                                      │
│                                                              │
│  ─── DIGITAL SIGNATURE ───────────────────────────────────  │
│                                                              │
│  [Click to Sign]                                             │
│                                                              │
│  ────────────────────────────────────────────────────────── │
│                                                              │
│  [Cancel]                          [Preview PDF] [Submit]    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 12.3 Template Selector

**Condition-specific templates (pre-configured):**

**Hair Loss:**
| Template | Key Medications |
|----------|----------------|
| Standard | Finasteride 1mg + Minoxidil 5% + Biotin + Ketoconazole shampoo |
| Minoxidil Only | Minoxidil 5% + Biotin + Ketoconazole shampoo (no finasteride) |
| Conservative | Biotin + Ketoconazole shampoo + PRP recommendation |
| Combination Plus | Standard + Derma roller + Saw Palmetto |
| Advanced | Dutasteride 0.5mg + Minoxidil + Biotin + Ketoconazole |
| Female AGA | Minoxidil 2% + Spironolactone 50mg + Biotin + Iron supplement |
| Custom | Empty — doctor adds all medications manually |

**ED:**
| Template | Key Medications |
|----------|----------------|
| On-Demand Sildenafil 50mg | Sildenafil 50mg PRN (30-60 min before, max 1x/day) |
| On-Demand Sildenafil 100mg | Sildenafil 100mg PRN |
| On-Demand Tadalafil 10mg | Tadalafil 10mg PRN (30 min before) |
| On-Demand Tadalafil 20mg | Tadalafil 20mg PRN |
| Daily Tadalafil 5mg | Tadalafil 5mg daily (same time each day) |
| Conservative | Lifestyle counseling + L-Arginine + Zinc |
| Custom | Empty |

**PE:**
| Template | Key Medications |
|----------|----------------|
| On-Demand Dapoxetine 30mg | Dapoxetine 30mg, 1-3 hours before activity |
| On-Demand Dapoxetine 60mg | Dapoxetine 60mg, 1-3 hours before activity |
| Daily Paroxetine | Paroxetine 10mg daily (SSRI off-label) |
| Daily + On-Demand Combo | Paroxetine 10mg daily + Dapoxetine 30mg PRN |
| Behavioral + Medication | Dapoxetine 30mg + behavioral techniques counseling |
| Custom | Empty |

**Weight Management:**
| Template | Key Medications |
|----------|----------------|
| Lifestyle Only | Diet plan + Exercise regimen + Behavioral counseling |
| Standard Orlistat | Orlistat 120mg TID with meals + Multivitamin |
| Metformin Add-On | Metformin 500mg BID + Orlistat 120mg TID |
| GLP-1 Standard | Semaglutide (dose escalation schedule) — *deferred, greyed out* |
| GLP-1 + Metformin | Semaglutide + Metformin 500mg BID — *deferred, greyed out* |
| Custom | Empty |

**PCOS (not trying to conceive):**
| Template | Key Medications |
|----------|----------------|
| Cycle Regulation | Combined OCP (Ethinyl estradiol + Drospirenone) |
| Anti-Androgen | Spironolactone 50mg + Combined OCP |
| Insulin Focused | Metformin 500mg BID + Lifestyle |
| Comprehensive | Metformin + Spironolactone + Combined OCP |
| Lean PCOS | Metformin 500mg + Combined OCP |
| Natural | Inositol 2g BID + Lifestyle + supplements |
| Progestin Only | Medroxyprogesterone 10mg cyclical (for breakthrough bleeding) |

**PCOS (trying to conceive):**
| Template | Key Medications |
|----------|----------------|
| Lifestyle First | Diet + Exercise + Inositol + Folic acid |
| Ovulation Induction | Clomiphene 50mg + Folic acid + Monitoring |
| Metformin + Lifestyle | Metformin 500mg BID + Folic acid + Lifestyle |
| Refer Fertility | Referral letter to fertility specialist + Folic acid |

### 12.4 Medication Row Editing

Each medication row is fully editable:

**Fields per medication:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Medication name | Autocomplete text input | ✅ | Searches drug database; can also type custom |
| Dosage | Text input | ✅ | e.g., "1mg", "5%", "500mg" |
| Frequency | Dropdown | ✅ | Options: Once daily / Twice daily / Three times daily / As needed (PRN) / Weekly / Custom |
| Duration | Dropdown | ✅ | Options: 1 month / 2 months / 3 months / 6 months / Ongoing / Custom |
| Instructions | Text input | Optional | e.g., "Take with food", "Apply to scalp" |

**Row actions:**
- Drag handle (⠿) on left for reordering
- Delete (🗑️) on right to remove medication
- Each field editable inline

**Add Medication:**
- `[+ Add Medication]` button adds empty row at bottom
- Drug name field auto-focuses
- Autocomplete searches a pre-loaded drug database (common medications only — this is NOT a comprehensive drug database, just the medications typically used in the 5 verticals)

### 12.5 Counseling Notes

- Pre-filled from the selected template (condition-specific default text)
- Rich text area — doctor can edit freely
- Template change: if doctor switches templates, a confirmation dialog appears: "Switching template will replace counseling notes. Keep current notes or replace?"
- Character limit: 5000 characters
- Notes appear on the final prescription PDF below the medication table

### 12.6 Digital Signature

**Click-to-sign component:**
- Doctor clicks `[Click to Sign]`
- Signature is a pre-registered text signature (doctor's name in a signature font) — NOT a drawn signature
- Format on PDF: "Digitally signed by Dr. Rajesh Patel (NMC-2019-12345) on [date] at [time]"
- Signature cannot be undone — once signed, the prescription enters preview mode
- If doctor wants to make changes after signing: `[Edit Prescription]` button → clears signature, returns to edit mode

### 12.7 PDF Preview

After signing, doctor sees a PDF preview:

- Rendered via `@react-pdf/renderer` — React components → PDF in browser
- Preview shows exactly what the patient and pharmacy will see
- **PDF layout:**
  - Header: Onlyou logo + "Prescription" + doctor details (name, NMC, specialization)
  - Patient details: Name, age, sex, phone (masked), consultation ID, date
  - Diagnosis line
  - Medication table (formatted)
  - Counseling notes (below table)
  - Digital signature + date
  - Footer: "This prescription is valid for [X] days from date of issue" + Rx number
- Buttons: `[Edit]` (go back to builder) / `[Submit Prescription]`

### 12.8 Submit Flow

When doctor clicks `[Submit Prescription]`:

1. **Client-side validation:**
   - At least 1 medication (unless "Lifestyle Only" template)
   - All required medication fields filled
   - Signature present
   - Counseling notes not empty

2. **API call:**
   ```
   trpc.doctor.prescription.create.mutate({
     consultationId: 'uuid',
     medications: [{ name, dosage, frequency, duration, instructions }],
     counselingNotes: 'text',
     templateUsed: 'standard',
     signedAt: 'ISO timestamp'
   })
   ```

3. **Server-side actions (synchronous):**
   - Validate doctor has permission (CASL: own consultation only)
   - Validate consultation status allows prescription (must be `ASSIGNED`, `REVIEWING`, or `INFO_REQUESTED`)
   - Store prescription record in PostgreSQL
   - Update consultation status → `PRESCRIPTION_CREATED`

4. **Server-side actions (async — BullMQ jobs):**
   - Generate PDF via `@react-pdf/renderer`, store in S3 (`onlyou-prescriptions` bucket, SSE-KMS encrypted)
   - Create Order record (medication order for pharmacy)
   - Notify patient (push + WhatsApp): "Your treatment plan is ready! Review your prescription in the app."
   - Notify coordinator (admin): "New prescription created — [Patient Name] — [Condition]. Order #[ID] ready for pharmacy."
   - SSE event → patient app updates in real-time
   - Audit log: `{ action: 'PRESCRIPTION_CREATED', doctorId, consultationId, medicationCount, templateUsed, timestamp }`

5. **Post-submit UI:**
   - Prescription builder closes
   - Case review shows "Prescription Created ✅" banner
   - Case status badge updates to `PRESCRIPTION_CREATED`
   - Toast: "Prescription submitted successfully. Patient and coordinator have been notified."

### 12.9 Edge Cases — Prescription Builder

| Scenario | Behavior |
|----------|----------|
| Doctor opens builder, then navigates away (browser back) | Confirmation dialog: "You have unsaved changes. Leave without saving?" |
| Doctor selects GLP-1 template (deferred) | Template shown as greyed out with "Coming Soon" label. Cannot be selected. |
| Doctor adds medication that conflicts with patient's reported meds | Warning banner: "⚠️ Potential interaction: [drug A] + [drug B]. Interaction type: [moderate/severe]. Proceed with caution." (from AI contraindications matrix). This is a warning only — does NOT block prescription. |
| Doctor tries to prescribe PDE5 inhibitor when nitrate flag exists | Hard block: "⛔ Cannot prescribe [Sildenafil/Tadalafil] — patient reports nitrate use. This is an absolute contraindication." Medication row turns red and cannot be submitted. |
| Network error during submit | Error toast: "Failed to submit prescription. Please try again." + `[Retry]` button. Draft preserved in local state. |
| Session expires during builder | On submit attempt → 401 → silent token refresh → retry submit. If refresh also fails → redirect to login, prescription draft lost (not persisted server-side). |
| Two doctors try to prescribe for same case simultaneously | Second doctor gets error: "A prescription has already been created for this consultation by Dr. [Name]." — server uses optimistic locking on consultation status. |


---

## 13. Lab Order Flow (Doctor-Initiated)

**Purpose:** Doctor orders blood work for a patient during case review

### 13.1 Lab Order Form

Clicking "Order Blood Work" in the actions panel opens a modal:

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close           ORDER BLOOD WORK                      │
│                                                          │
│  Patient: Rahul Mehta, 28M, Mumbai                      │
│  Condition: Hair Loss                                    │
│                                                          │
│  ─── SELECT TEST PANEL ─────────────────────────────── │
│                                                          │
│  ( ) Extended Hair Panel           ₹1,200               │
│      TSH, Free T4, Ferritin, Vitamin D, DHT,           │
│      Hemoglobin, Iron studies                            │
│                                                          │
│  ( ) Follow-up Panel               ₹600–₹1,200          │
│      [Select specific tests ▼]                           │
│                                                          │
│  ─── NOTES FOR LAB ─────────────────────────────────── │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │ (Optional notes for coordinator/nurse/lab)            ││
│  │ e.g., "Fasting sample required"                       ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ─── URGENCY ───────────────────────────────────────── │
│                                                          │
│  ( ) Routine (book within 5 days)                       │
│  ( ) Urgent (book within 48 hours)                      │
│                                                          │
│  [Cancel]                              [Order Blood Work]│
└──────────────────────────────────────────────────────────┘
```

### 13.2 Test Panels by Condition

| Condition | Default Panel | Tests Included | Price |
|-----------|--------------|----------------|-------|
| Hair Loss | Extended Hair Panel | TSH, Free T4, Ferritin, Vitamin D, DHT, Hemoglobin, Iron studies | ₹1,200 |
| ED | Basic Health Check | Testosterone (total + free), Fasting glucose, HbA1c, Lipid panel | ₹800 |
| PE | Basic Health Check | Same as ED — testosterone, glucose, lipids | ₹800 |
| Weight | Metabolic Panel | HbA1c, Fasting glucose, Lipid panel, Liver function, Kidney function, Thyroid | ₹1,800 |
| PCOS | PCOS Screen Panel | FSH, LH, Estradiol, Testosterone, DHEA-S, Prolactin, Fasting glucose, Lipid panel, Insulin | ₹1,500 |

**Follow-up panels** are subsets of the initial panel — doctor selects specific tests from a checklist.

### 13.3 Submit Flow

**API call:**
```
trpc.doctor.labOrder.create.mutate({
  consultationId: 'uuid',
  panelId: 'extended_hair_panel',
  customTests: [],          // for follow-up: array of specific test IDs
  notes: 'Fasting sample required',
  urgency: 'routine'
})
```

**Server actions:**
1. Create `LabOrder` record with status `ORDERED`
2. Notify coordinator (admin): "Lab order created — [Patient Name] — [Panel Name]. Please arrange collection."
3. Notify patient (push + WhatsApp): "Your doctor has ordered blood tests. Please book a home collection or upload your own results."
4. SSE event → admin dashboard updates, patient app updates
5. Audit log entry

**Post-submit:**
- Modal closes
- Case review shows "Lab Ordered" indicator
- Lab Results tab shows pending order with status stepper
- Toast: "Blood work ordered. The coordinator will arrange collection."

### 13.4 Edge Cases

| Scenario | Behavior |
|----------|----------|
| Lab order already exists for this consultation (not completed) | Warning: "An active lab order already exists for this patient. [View existing order] / [Create additional order]" |
| Patient has recent self-uploaded results | Info banner: "Patient uploaded lab results on [date]. [View uploaded results] — you may not need to order new tests." |
| Doctor selects urgent + no notes | Soft warning: "Urgent orders typically include a reason for urgency. [Add notes] / [Continue anyway]" |

---

## 14. Referral Flow

**Purpose:** Refer the patient to an in-person specialist/partner clinic

### 14.1 Referral Modal

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close              REFER PATIENT                      │
│                                                          │
│  Patient: Rahul Mehta, 28M, Mumbai                      │
│                                                          │
│  ─── REFERRAL TYPE ─────────────────────────────────── │
│                                                          │
│  ( ) Partner clinic (near patient)                       │
│  ( ) Specialist referral (specific doctor)               │
│  ( ) Emergency referral (immediate attention)            │
│                                                          │
│  ─── PARTNER CLINIC ────────────────────────────────── │
│                                                          │
│  Select clinic: [ Search clinics in Mumbai     ▼ ]      │
│                                                          │
│  ─── REASON FOR REFERRAL ───────────────────────────── │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │ (Required — describe why in-person visit is needed)   ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ─── NOTES FOR PATIENT ─────────────────────────────── │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │ (Optional — instructions shown to patient)            ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ☐ Keep consultation open (monitor after referral)      │
│  ☐ Close consultation after referral                     │
│                                                          │
│  [Cancel]                              [Submit Referral] │
└──────────────────────────────────────────────────────────┘
```

### 14.2 Submit Flow

**API call:**
```
trpc.doctor.consultation.refer.mutate({
  consultationId: 'uuid',
  referralType: 'partner_clinic',
  clinicId: 'clinic_uuid',      // null for generic specialist referral
  reason: 'Requires physical scalp examination — suspected scarring alopecia.',
  patientNotes: 'Please visit the clinic within 2 weeks for an in-person examination.',
  closeConsultation: false
})
```

**Server actions:**
1. Create `Referral` record linked to consultation
2. If `closeConsultation: true` → consultation status → `REFERRED`
3. If `closeConsultation: false` → consultation stays in current status
4. Notify patient: "Your doctor has recommended an in-person visit. [View details]"
5. Notify coordinator: "Referral created — [Patient Name] to [Clinic Name]"
6. If partner clinic: notify clinic via email/WhatsApp with anonymized referral details

---

## 15. Refund Flow (Doctor-Initiated)

**Purpose:** Doctor can initiate a refund if consultation reveals the patient shouldn't be treated (e.g., contraindication discovered during review)

### 15.1 Refund Modal

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close              INITIATE REFUND                    │
│                                                          │
│  Patient: Rahul Mehta                                    │
│  Subscription: Hair Loss — Monthly (₹999)               │
│                                                          │
│  ─── REFUND TYPE ───────────────────────────────────── │
│                                                          │
│  ( ) Full refund — ₹999                                 │
│  ( ) Partial refund — ₹[___]                            │
│                                                          │
│  ─── REASON ────────────────────────────────────────── │
│                                                          │
│  Select: [ Medical contraindication discovered    ▼ ]   │
│                                                          │
│  Options:                                                │
│  • Medical contraindication discovered                   │
│  • Patient not suitable for remote treatment             │
│  • Duplicate consultation                                │
│  • Other (specify)                                       │
│                                                          │
│  ─── NOTES ─────────────────────────────────────────── │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │ (Required — explain refund reason for admin review)   ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ⚠️ Refunds require admin approval before processing.    │
│                                                          │
│  [Cancel]                              [Submit Refund]   │
└──────────────────────────────────────────────────────────┘
```

### 15.2 Submit Flow

**Important:** Doctor-initiated refunds are **requests**, not instant refunds. They require admin approval.

**API call:**
```
trpc.doctor.consultation.requestRefund.mutate({
  consultationId: 'uuid',
  type: 'full',
  amount: 999,
  reason: 'medical_contraindication',
  notes: 'Patient on nitrate therapy — cannot prescribe PDE5 inhibitors. Not suitable for remote ED treatment.'
})
```

**Server actions:**
1. Create `RefundRequest` record with status `PENDING_APPROVAL`
2. Notify coordinator: "⚠️ Refund request — [Patient Name] — ₹[amount] — [reason]. [Approve/Reject]"
3. Admin reviews in admin dashboard → approves → Razorpay refund API triggered
4. Patient notified after admin approval: "Your refund of ₹[amount] has been processed. It will appear in your account within 5-7 business days."

**Post-submit UI:**
- Modal closes
- Case shows "Refund Requested" amber badge
- Toast: "Refund request submitted. The coordinator will review and process."

---

## 16. Screen 3: My Patients

**Route:** `/patients`
**Purpose:** Searchable directory of all patients the doctor has ever treated

### 16.1 Patient Directory Layout

```
┌────────────────────────────────────────────────────────────┐
│  👥 My Patients                                             │
│                                                            │
│  🔍 [Search by name, phone, condition...]                  │
│                                                            │
│  Filter: [All] [Hair Loss] [ED] [PE] [Weight] [PCOS]     │
│  Sort: [Last visit ▼] [Name A-Z] [Most consultations]    │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Rahul Mehta, 28M, Mumbai                              │ │
│  │ 💇 Hair Loss | 🛡️ ED                                  │ │
│  │ Last visit: 15 Jan 2026 | Consultations: 3           │ │
│  │ Status: Treatment Active                              │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ Sneha Kapoor, 25F, Delhi                              │ │
│  │ 🌸 PCOS                                               │ │
│  │ Last visit: 20 Jan 2026 | Consultations: 1           │ │
│  │ Status: Under Review                                  │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ ...                                                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Showing 1-20 of 47 patients        [Load more]           │
└────────────────────────────────────────────────────────────┘
```

### 16.2 Patient Card Content

| Field | Content |
|-------|---------|
| Name | Full name, age abbreviation, sex abbreviation, city |
| Conditions | Color-coded badges for each vertical they're being treated for |
| Last visit | Date of most recent consultation (any vertical) |
| Consultation count | Total number of consultations across all verticals |
| Status | Latest consultation status (most active/urgent shown) |

### 16.3 Search & Filter

- **Search:** Debounced (300ms), searches name + last 4 digits of phone
- **Condition filter:** Chips matching case queue condition filters
- **Status filter:** Active Treatment / Awaiting Review / Completed / Referred — filters by the patient's latest consultation status
- **Last visit date filter:** Date range picker to filter by last consultation date (useful for finding patients overdue for follow-up)
- **Sort options:** Last visit (default, descending) / Name A-Z / Most consultations
- **Pagination:** Cursor-based, 20 per page, "Load more" button

### 16.4 CASL Permission Scoping

The doctor only sees patients who have at least one consultation assigned to them. They CANNOT browse all platform patients — `CASL.js` enforces:

```typescript
can('read', 'Patient', { consultations: { some: { doctorId: user.id } } });
```

This translates to a Prisma query with a WHERE clause filtering to the doctor's assigned consultations.

---

## 17. Patient Detail View

**Route:** `/patients/[id]`
**Purpose:** Full history of a specific patient across all verticals assigned to this doctor

### 17.1 Layout

```
┌────────────────────────────────────────────────────────────┐
│  ← Back to Patients                                        │
│                                                            │
│  Rahul Mehta, 28M, Mumbai                                 │
│  Phone: +91 •••••• 4567                                   │
│  Active subscriptions: 💇 Hair Loss | 🛡️ ED               │
│  Total consultations: 3                                    │
│                                                            │
│  ─── CONSULTATION TIMELINE ──────────────────────────────  │
│                                                            │
│  ┌─ 15 Jan 2026 ─────────────────────────────────────────┐│
│  │ 💇 Hair Loss — Initial Assessment                      ││
│  │ Status: Treatment Active                               ││
│  │ AI Attention: 🔴 High                                  ││
│  │ Outcome: Prescribed — Minoxidil Only template          ││
│  │ [Open Case Review]                                     ││
│  ├────────────────────────────────────────────────────────┤│
│  │ 🛡️ ED — Initial Assessment                             ││
│  │ Status: Prescription Created                           ││
│  │ AI Attention: ⛔ Critical (nitrate flag)               ││
│  │ Outcome: Refund requested — contraindication           ││
│  │ [Open Case Review]                                     ││
│  ├────────────────────────────────────────────────────────┤│
│  │ 💇 Hair Loss — 4-Week Follow-Up                        ││
│  │ Status: Under Review                                   ││
│  │ AI Attention: 🟢 Low                                   ││
│  │ [Open Case Review]                                     ││
│  └────────────────────────────────────────────────────────┘│
│                                                            │
│  ─── PRESCRIPTIONS ──────────────────────────────────────  │
│                                                            │
│  • Rx #2026-0142 — Hair Loss — 15 Jan 2026 [View PDF]    │
│                                                            │
│  ─── LAB RESULTS ────────────────────────────────────────  │
│                                                            │
│  • Extended Hair Panel — 20 Jan 2026 [View PDF]           │
│    Abnormals: Ferritin ⚠️, Vitamin D 🔴                   │
│                                                            │
│  ─── PROGRESS PHOTOS ────────────────────────────────────  │
│                                                            │
│  Hair Loss:                                                │
│  [15 Jan 2026 — 4 photos]  [12 Feb 2026 — 4 photos]     │
│  [Tap to compare]                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 17.2 Sections

**Consultation Timeline:**
- Reverse chronological list of all consultations assigned to this doctor for this patient
- Each entry shows: condition, type (initial/follow-up), status, AI attention, outcome (if completed)
- `[Open Case Review]` opens the full case review in a new tab

**Prescriptions:**
- All prescriptions issued by this doctor for this patient
- Click to view PDF (CloudFront signed URL)

**Lab Results:**
- All lab results for this patient's consultations under this doctor
- Abnormal values highlighted inline
- Click to view full results

**Progress Photos:**
- Grouped by consultation date
- `[Tap to compare]` opens photo comparison (baseline vs. selected date) using the same comparison UI from Section 8.3

---

## 18. Screen 4: Stats

**Route:** `/stats`
**Purpose:** Doctor's personal performance metrics and case analytics

### 18.1 Metrics Cards (Top Row)

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Cases Today  │ Cases Week   │ Cases Month  │ Avg Review   │
│     4        │     23       │     87       │  18 min      │
│  +2 from     │  +5 from     │  +12 from    │  -3 min from │
│  yesterday   │  last week   │  last month  │  last month  │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

| Metric | Calculation |
|--------|-------------|
| Cases Today | Consultations where doctor took action (prescribe/refer/request info/close) today |
| Cases This Week | Same, for current week (Mon-Sun) |
| Cases This Month | Same, for current calendar month |
| Avg Review Time | Mean of `(firstActionAt - firstReviewedAt)` across completed cases this month |

**Trend indicators:**
- Green ↑ = more cases than previous period (good for productivity)
- Red ↑ = higher avg review time than previous period (needs improvement)
- Gray → = no significant change

### 18.2 Cases by Condition (Pie/Donut Chart)

| Condition | Count | Percentage |
|-----------|-------|------------|
| Hair Loss | 35 | 40% |
| ED | 22 | 25% |
| PE | 10 | 11% |
| Weight | 12 | 14% |
| PCOS | 8 | 9% |

Rendered as an interactive donut chart (using Recharts or Chart.js). Click a segment to filter the breakdown below.

### 18.3 Cases by Outcome (Bar Chart)

| Outcome | Count |
|---------|-------|
| Prescribed | 62 |
| Blood work ordered | 15 |
| Referred | 5 |
| Info requested | 12 |
| Closed (no treatment) | 3 |

### 18.4 Time Range Selector

Dropdown above all charts: Today | This Week | This Month | Last 3 Months | Last 6 Months | All Time

### 18.5 Patient Feedback Ratings

If/when patient feedback is implemented (Phase 2):

```
⭐ 4.8 / 5.0  (based on 42 ratings this month)

5⭐ ████████████████████ 35
4⭐ ████████ 5
3⭐ ██ 2
2⭐ 0
1⭐ 0
```

For MVP: "Patient feedback ratings coming soon" placeholder.

---

## 19. Screen 5: Profile & Settings

**Route:** `/settings`
**Purpose:** Doctor's personal info, availability, notification preferences, and canned messages

### 19.1 Profile Information

```
┌────────────────────────────────────────────────────────────┐
│  ⚙️ Settings                                               │
│                                                            │
│  ─── PERSONAL INFORMATION ───────────────────────────────  │
│                                                            │
│  Full Name:        Dr. Rajesh Patel                       │
│  NMC Registration: NMC-2019-12345         [Verified ✅]    │
│  Phone:            +91 98765 04567                         │
│  Email:            dr.patel@email.com                      │
│  City:             Mumbai, Maharashtra                     │
│  Specializations:  Hair Loss, ED, PE                      │
│                                                            │
│  [Edit Profile]                                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Edit limitations:**
- Name, NMC number: doctor cannot edit (admin-managed fields). Shows tooltip: "Contact administrator to update."
- Phone: can change (triggers new OTP verification)
- Email: can change (not used for auth, used for notifications)
- City: can change (affects patient assignment — admin notified)
- Specializations: doctor cannot edit (admin assigns which verticals they handle)

### 19.2 Availability Schedule

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
│  ─── TIME OFF ───────────────────────────────────────────  │
│                                                            │
│  [+ Add Time Off]                                         │
│  • 10 Feb 2026 – 12 Feb 2026 (3 days) — "Conference"     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Availability behavior:**
- Used by the coordinator (admin) when assigning cases — unavailable doctors won't receive new cases
- SLA engine considers availability: case assigned on Friday evening → SLA timer pauses over weekend if doctor is marked unavailable Saturday/Sunday
- Time-off periods: doctor can pre-schedule unavailability. During time off, no new cases are assigned. Existing in-progress cases remain (doctor should complete or hand off before time off).
- If a doctor marks themselves unavailable on a day they have pending cases → warning: "You have [N] pending cases. Cases won't be reassigned automatically — please complete or notify admin."

### 19.3 Notification Preferences

```
┌────────────────────────────────────────────────────────────┐
│  ─── NOTIFICATIONS ──────────────────────────────────────  │
│                                                            │
│  New case assigned                                        │
│    Push: ☑  WhatsApp: ☑  Email: ☐  SMS: ☐               │
│                                                            │
│  Patient responded to info request                        │
│    Push: ☑  WhatsApp: ☑  Email: ☐  SMS: ☐               │
│                                                            │
│  Lab results ready                                        │
│    Push: ☑  WhatsApp: ☐  Email: ☑  SMS: ☐               │
│                                                            │
│  New message from patient                                 │
│    Push: ☑  WhatsApp: ☐  Email: ☐  SMS: ☐               │
│                                                            │
│  SLA warning (case overdue)                               │
│    Push: ☑  WhatsApp: ☑  Email: ☑  SMS: ☐               │
│                                                            │
│  Follow-up due                                            │
│    Push: ☑  WhatsApp: ☐  Email: ☑  SMS: ☐               │
│                                                            │
│  [Save Preferences]                                       │
│                                                            │
│  ─── QUIET HOURS ────────────────────────────────────────  │
│                                                            │
│  Don't send push notifications between:                   │
│  [22:00 ▼] and [07:00 ▼]                                 │
│                                                            │
│  Exception: SLA warnings always delivered immediately.    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Notification channels for doctors:**
- **Push:** Browser push notifications (portal registers service worker for web push). Requires one-time browser permission grant.
- **WhatsApp:** Via Gupshup to doctor's registered phone. Same discreet format as patient notifications (no medical details in preview text).
- **Email:** To registered email address.
- **SMS:** Available but not recommended (cost). Only for SLA warnings as fallback.

**Quiet hours:**
- Push notifications held in queue during quiet hours, delivered at end of quiet period
- WhatsApp messages held (queued in BullMQ with delayed delivery)
- Exception: SLA warnings ignore quiet hours — always delivered immediately (configurable by admin)

---

## 20. Canned Message Management

**Route:** `/settings` (section within settings page)
**Purpose:** Manage custom quick-reply templates for patient messaging

### 20.1 Canned Messages List

```
┌────────────────────────────────────────────────────────────┐
│  ─── CANNED MESSAGES ────────────────────────────────────  │
│                                                            │
│  System defaults (cannot edit):                           │
│  • "Results look good"                                    │
│  • "Need more photos"                                     │
│  • "Schedule follow-up"                                   │
│  • "Lab work required"                                    │
│  • "Side effects normal"                                  │
│  • "Stop medication"                                      │
│                                                            │
│  Your custom messages:                                    │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 1. "Take with food"                           [✏️][🗑]│ │
│  │    "Please make sure to take your medication with    │ │
│  │    a full meal to avoid stomach discomfort."          │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ 2. "Minoxidil application tip"                [✏️][🗑]│ │
│  │    "For best results, apply minoxidil to completely  │ │
│  │    dry hair. Wet scalp reduces absorption by up      │ │
│  │    to 50%."                                          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  [+ Add Custom Message]    (14/20 remaining)              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 20.2 Add/Edit Custom Message

```
┌──────────────────────────────────────────────────────────┐
│  ─── NEW CUSTOM MESSAGE ─────────────────────────────── │
│                                                          │
│  Label (shown as chip):                                  │
│  [________________________] (max 30 chars)               │
│                                                          │
│  Full message (sent to patient):                         │
│  ┌──────────────────────────────────────────────────────┐│
│  │                                                      ││
│  │                                                      ││
│  │                                                      ││
│  └──────────────────────────────────────────────────────┘│
│  (max 500 chars)                                         │
│                                                          │
│  Placeholders: {patient_name}, {medication}              │
│  These will be auto-filled when used.                    │
│                                                          │
│  [Cancel]                                      [Save]    │
└──────────────────────────────────────────────────────────┘
```

**Constraints:**
- Max 20 custom canned messages per doctor
- Label: max 30 characters (shown as chip text)
- Full message: max 500 characters
- Supported placeholders: `{patient_name}`, `{medication}` (resolved at send time from current consultation context)
- System defaults cannot be edited or deleted — they appear first in the canned responses row


---

## 21. Real-Time System (Doctor Portal)

### 21.1 SSE Connection

The doctor portal establishes an SSE connection on login for real-time updates:

**Connection setup:**
```typescript
// On successful auth, establish SSE
const eventSource = new EventSource('/api/sse/doctor', {
  // Access token sent via HttpOnly cookie automatically
});

eventSource.addEventListener('case.assigned', (e) => {
  const data = JSON.parse(e.data);
  // Update case queue badge count
  // Show toast notification
});

eventSource.addEventListener('case.message_received', (e) => {
  const data = JSON.parse(e.data);
  // If case is currently open → append message to chat
  // If case not open → show blue dot on case card
});
```

**SSE Channel:** `doctor:{doctorId}` — doctor subscribes to their personal channel

### 21.2 SSE Events (Doctor-Relevant)

| Event | Payload | UI Effect |
|-------|---------|-----------|
| `case.assigned` | `{ consultationId, patientName, condition, attentionLevel }` | Toast notification + badge count increment on sidebar |
| `case.patient_responded` | `{ consultationId, patientName }` | Case card status update + toast |
| `case.lab_results_ready` | `{ consultationId, patientName, panelName }` | Case card "Lab Ready" indicator + toast |
| `case.message_received` | `{ consultationId, patientName, messagePreview }` | If case open: append message. If not: blue dot on case card. |
| `case.status_changed` | `{ consultationId, oldStatus, newStatus }` | Update case card badge |
| `case.reassigned` | `{ consultationId, newDoctorId }` | If reassigned away: remove from queue + toast: "Case reassigned to Dr. [Name]" |
| `sla.warning` | `{ consultationId, patientName, threshold, hoursOverdue }` | Red SLA badge on case card + persistent toast |

### 21.3 SSE Buffer & Reconnection

- Buffer: 500 events per user per channel (not global 1000)
- If SSE connection drops (network issue):
  1. Auto-reconnect with exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (max)
  2. On reconnect: fetch missed events since `Last-Event-ID` header
  3. If gap too large (>500 missed events): full refresh of case queue via API
- If browser tab is inactive for >5 minutes: SSE connection held but events buffered by browser. On tab focus: events delivered in batch.
- If browser is completely closed: SSE disconnects. On next portal open: fresh login/refresh → full data load via API.

### 21.4 Offline Fallback

Since doctors primarily use desktops, offline is unlikely but handled:

- SSE connection fails for >60 seconds → show amber banner at top: "🔌 Real-time updates paused. Checking connection..."
- Banner persists until SSE reconnects
- During offline: page shows stale data (last loaded). No auto-poll (to avoid hammering server).
- On reconnect: banner disappears + silent data refresh for currently viewed page

---

## 22. Notification System (Doctor)

### 22.1 Notification Channels

| Channel | Delivery Method | Latency | Use Case |
|---------|----------------|---------|----------|
| In-portal (SSE) | SSE push → notification dropdown | <1 second | Primary — all events |
| Browser push | Web Push API (service worker) | 1-3 seconds | When portal tab is not active |
| WhatsApp | Gupshup API | 2-10 seconds | When doctor is away from laptop |
| Email | Resend (MVP) / SES (scale) | 5-30 seconds | Non-urgent, daily digests |
| SMS | Gupshup SMS (primary) / MSG91 (fallback) | 5-15 seconds | SLA warnings fallback only |

### 22.2 Notification Events & Channels

| Event | In-Portal | Browser Push | WhatsApp | Email | SMS |
|-------|-----------|-------------|----------|-------|-----|
| New case assigned | ✅ Always | ✅ If enabled | ✅ If enabled | ❌ | ❌ |
| Patient responded | ✅ Always | ✅ If enabled | ✅ If enabled | ❌ | ❌ |
| Lab results ready | ✅ Always | ✅ If enabled | ❌ | ✅ If enabled | ❌ |
| New patient message | ✅ Always | ✅ If enabled | ❌ | ❌ | ❌ |
| SLA warning | ✅ Always | ✅ Always (overrides settings) | ✅ Always | ✅ Always | ✅ If enabled |
| Follow-up due | ✅ Always | ✅ If enabled | ❌ | ✅ If enabled | ❌ |
| Case reassigned away | ✅ Always | ✅ If enabled | ❌ | ❌ | ❌ |

**SLA warnings override all preferences** — they are always delivered via all enabled channels regardless of quiet hours or preference toggles, except SMS which is opt-in.

### 22.3 WhatsApp Message Format (Doctor)

Same discreet format as patient notifications — no medical details in message preview:

**New case:**
> "Onlyou: You have a new case to review. Open your dashboard: doctor.onlyou.life"

**Patient responded:**
> "Onlyou: A patient has responded to your request. Check your dashboard: doctor.onlyou.life"

**SLA warning:**
> "Onlyou: ⚠️ URGENT: A case requires your attention — review overdue. doctor.onlyou.life"

No patient names, conditions, or clinical details in WhatsApp messages — privacy protection.

### 22.4 Daily Digest Email (Optional)

If doctor enables email notifications, they receive a daily digest at 8:00 AM IST:

```
Subject: Onlyou — Your Daily Case Summary

Good morning Dr. Patel,

Here's your case summary for today:

📋 Pending Cases: 7
   - 3 new (awaiting first review)
   - 2 awaiting lab results
   - 2 follow-ups due

⚠️ SLA Warnings: 1
   - Case #CONS-2026-0189 — 22 hours since submission (24hr SLA)

📊 Yesterday's Activity:
   - 5 cases reviewed
   - 4 prescriptions issued
   - 1 lab order created
   - Average review time: 16 minutes

Open your dashboard: https://doctor.onlyou.life

— Onlyou Care Team
```

---

## 23. Consultation Lifecycle (Doctor View)

### 23.1 Full Status Flow

The consultation lifecycle from the doctor's perspective:

> **Cross-reference note:** ARCHITECTURE.md uses the status name `PENDING_REVIEW` for the state after AI assessment completes. APP-PATIENT.md and this document use `AI_COMPLETE` — which is the canonical name. The status represents the same thing: AI assessment is done and the case is ready for doctor review. Use `AI_COMPLETE` as the enum value in code.

```
    SUBMITTED          ← Patient submits assessment
        │
        ▼
    AI_PROCESSING      ← BullMQ job: Claude API call (1-3 min)
        │
        ▼
    AI_COMPLETE        ← AI assessment ready, appears in queue
        │
        ▼ (doctor opens case)
    ASSIGNED           ← Auto-assigned when doctor opens case
        │
        ▼ (30s or first action)
    REVIEWING          ← Doctor actively reviewing
        │
        ├──→ INFO_REQUESTED    ← Doctor sends "Request More Info"
        │         │
        │         ▼ (patient responds)
        │    REVIEWING          ← Back to reviewing after patient response
        │
        ├──→ PRESCRIPTION_CREATED  ← Doctor submits prescription
        │
        ├──→ REFERRED              ← Doctor refers to specialist
        │
        └──→ CLOSED                ← Doctor closes case (no treatment needed)
```

### 23.2 Status Transitions (Doctor Actions)

| Current Status | Doctor Action | New Status | Side Effects |
|---------------|--------------|------------|--------------|
| `AI_COMPLETE` | Opens case review | `ASSIGNED` | `assignedAt` timestamp set |
| `ASSIGNED` | 30s on page OR first action | `REVIEWING` | `firstReviewedAt` timestamp set |
| `REVIEWING` | Clicks "Request More Info" | `INFO_REQUESTED` | Message sent to patient, patient notified |
| `INFO_REQUESTED` | Patient responds | `REVIEWING` | Doctor notified, case returns to review |
| `REVIEWING` | Submits prescription | `PRESCRIPTION_CREATED` | PDF generated, order created, patient/admin notified |
| `REVIEWING` | Submits referral (close=true) | `REFERRED` | Patient notified, referral record created |
| `REVIEWING` | Clicks "Close Case" | `COMPLETED` | Patient notified |
| `PRESCRIPTION_CREATED` | (system: patient starts treatment) | `TREATMENT_ACTIVE` | Day counter starts |
| `TREATMENT_ACTIVE` | (system: follow-up timer expires) | `FOLLOW_UP_DUE` | Patient notified to complete check-in |

> **Video consultation (muted for MVP):** Each consultation has a `videoStatus` field (`NOT_REQUIRED | PENDING | SCHEDULED | IN_PROGRESS | COMPLETED | SKIPPED_TESTING`). For MVP, this is auto-set to `SKIPPED_TESTING` immediately — no video step appears in the doctor workflow. When `VIDEO_CONSULTATION_ENABLED` feature flag is turned on (Phase 2), the prescription builder will be locked behind `videoStatus = COMPLETED` for Schedule H drugs. See v4 spec §8 for full video system architecture.

### 23.3 SLA Thresholds (Doctor)

| SLA | Threshold | Escalation |
|-----|-----------|------------|
| First review | 24 hours from `AI_COMPLETE` → not yet `ASSIGNED` | Notification to doctor + admin |
| Case action | 48 hours from `ASSIGNED` → no action taken | Notification to doctor + admin; admin may reassign |
| Info response | 72 hours from patient responding → doctor hasn't re-reviewed | Notification to doctor |
| Lab results review | 24 hours from lab results uploaded → doctor hasn't opened | Notification to doctor + admin |

SLA checks run every 15 minutes via BullMQ `sla-check` repeatable job.

**SLA indicator on case cards:**
- 🟢 Green: within SLA
- 🟡 Amber: within 2 hours of SLA breach
- 🔴 Red: SLA breached

---

## 24. Follow-Up Case Handling

### 24.1 Follow-Up Types

| Time Point | Type | Questionnaire | Photos |
|------------|------|--------------|--------|
| 4 weeks | Side effects check | 10 questions (abbreviated) | No |
| 3 months | Progress review | 10 questions + 4 photos | Yes |
| 6 months | Full assessment | 15 questions + 4 photos | Yes |
| 12 months | Annual review | Full questionnaire + photos | Yes |

### 24.2 Follow-Up in Case Queue

Follow-up cases appear in the case queue like new cases, but with distinct markers:

- **Badge:** "Follow-Up" badge (blue) instead of "New" badge
- **AI Assessment:** Includes comparison with initial assessment (delta analysis)
- **Photos tab:** Automatically shows comparison mode (baseline vs. follow-up)
- **Questionnaire tab:** Shows "changes only" toggle by default

### 24.3 Follow-Up AI Delta Analysis

The AI assessment for follow-ups includes a delta section:

```
┌────────────────────────────────────────────────────┐
│  📊 PROGRESS ANALYSIS (vs. Initial Assessment)     │
│                                                    │
│  Overall trajectory: ✅ Improving                  │
│                                                    │
│  • Symptom severity: Moderate → Mild (improved)    │
│  • Self-reported satisfaction: 3/5 → 4/5           │
│  • Side effects: None reported (stable)            │
│  • Medication compliance: Good (reported)          │
│                                                    │
│  RECOMMENDATION:                                    │
│  "Patient showing positive response to current     │
│   protocol. Recommend continuing current regimen.  │
│   Consider adding oral supplement if lab results   │
│   show persistent vitamin D deficiency."           │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 24.4 Follow-Up Prescription

For follow-ups, the prescription builder pre-populates with the previous prescription's medications:

- All medications from the last prescription are pre-filled
- Doctor can adjust dosages, add new medications, or remove existing ones
- Template selector shows "Continue Current" as the default option
- If significant changes: doctor should update counseling notes to explain the change

---

## 25. Keyboard Shortcuts & Efficiency

### 25.1 Global Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `G then C` | Go to Cases (queue) | Any page |
| `G then P` | Go to Patients | Any page |
| `G then S` | Go to Stats | Any page |
| `G then T` | Go to Settings | Any page |
| `/` | Focus search bar | Case queue |
| `Esc` | Close modal/panel | Any modal open |
| `?` | Show keyboard shortcuts overlay | Any page |

### 25.2 Case Review Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `1` | Switch to AI Assessment tab | Case review |
| `2` | Switch to Questionnaire tab | Case review |
| `3` | Switch to Photos tab | Case review |
| `4` | Switch to Lab Results tab | Case review |
| `5` | Switch to Messages tab | Case review |
| `P` | Open Prescription Builder | Case review |
| `L` | Open Lab Order form | Case review |
| `M` | Focus message input | Case review |
| `←` | Previous case (in queue) | Case review |
| `→` | Next case (in queue) | Case review |
| `Backspace` | Back to queue | Case review |

### 25.3 Shortcut Overlay

Pressing `?` opens a modal listing all available shortcuts for the current page. Same modal has a toggle: "Enable keyboard shortcuts" (default: on). Stored in `localStorage`.

---

## 26. Responsive Design & Mobile Layout

### 26.1 Breakpoints

| Breakpoint | Layout | Primary UI Pattern |
|------------|--------|--------------------|
| ≥1440px | Wide desktop | 3-panel case review, expanded sidebar |
| 1024–1439px | Desktop | 3-panel (narrower right panel), collapsible sidebar |
| 768–1023px | Tablet | 2-panel case review (left+center, right as bottom sheet), bottom nav |
| <768px | Mobile | Single column, bottom nav, modals for all panels |

### 26.2 Mobile-Specific Adaptations

**Case Queue (mobile):**
- Card list instead of table
- Swipe right on card → quick action menu (assign, priority flag)
- Pull to refresh
- Filter chips horizontally scrollable

**Case Review (mobile):**
- Single column scroll: patient summary (collapsible) → clinical tabs → action buttons (sticky bottom bar)
- Patient summary: collapsed by default (expandable card)
- Clinical tabs: horizontal scrollable tab bar at top
- Actions: sticky bottom bar with icon buttons: 💊 Prescribe | 🔬 Labs | 💬 Message | ⋯ More
- "More" (⋯) opens action sheet: Refer, Refund, Close Case

**Prescription Builder (mobile):**
- Full-screen page (not modal)
- Template selector: full-width dropdown
- Medication rows: stack vertically (card format, not table row)
- Sticky bottom bar: [Preview] [Submit]

### 26.3 Touch Optimizations

- All tap targets minimum 44×44px (Apple HIG)
- Swipe gestures for case queue navigation
- Long-press on patient name → copy to clipboard
- Pinch-to-zoom on photos (Photo tab)

---

## 27. Error States & Edge Cases

### 27.1 Page-Level Errors

| Error | UI Behavior |
|-------|------------|
| 401 Unauthorized | Silent token refresh attempt → if fails: redirect to `/login` with toast: "Session expired. Please sign in again." |
| 403 Forbidden | "You don't have permission to view this page. Contact your administrator." + `[Go to Cases]` button |
| 404 Case Not Found | "This case does not exist or has been removed." + `[Back to Cases]` button |
| 500 Server Error | "Something went wrong on our end. Please try again in a moment." + `[Retry]` button |
| Network Error | "Unable to connect. Please check your internet connection." + `[Retry]` button + stale data remains visible |

### 27.2 Component-Level Errors

| Component | Error Behavior |
|-----------|---------------|
| AI Assessment fails to load | Show error state within tab: "Unable to load AI assessment. [Retry]" — other tabs still functional |
| Photos fail to load | Placeholder with broken image icon: "Photo unavailable. [Retry]" — other photos still shown |
| PDF viewer fails | "Unable to display PDF. [Download] [Retry]" — offer direct download link |
| Chat fails to load | "Unable to load messages. [Retry]" — input still visible for composing |
| SSE disconnects | Amber banner (Section 21.4) — portal remains functional with stale data |

### 27.3 Concurrent Access Edge Cases

| Scenario | Behavior |
|----------|----------|
| Two doctors open the same unassigned case simultaneously | First to load gets auto-assigned. Second sees: "This case was just assigned to Dr. [Name]. [View only] / [Request reassignment]" |
| Doctor opens case, steps away, another doctor is assigned the case by admin | On next interaction: "This case has been reassigned to Dr. [Name]. [OK]" → redirects to queue |
| Doctor is prescribing while admin closes the consultation | On submit: error: "This consultation's status has changed. Please refresh and review." |
| Doctor's account is deactivated while logged in | Next API call returns 403 → redirect to login → "Your account has been deactivated. Contact your administrator." |

### 27.4 Data Integrity Edge Cases

| Scenario | Behavior |
|----------|----------|
| Patient deletes their account while doctor is reviewing | Case marked as `PATIENT_DELETED` → doctor sees notice: "This patient's account has been deleted per their request. Case data retained for medical records per DPDPA retention policy." — anonymized data still visible |
| Prescription PDF generation fails | Prescription record saved but PDF queued for retry. Doctor sees: "Prescription saved. PDF is being generated and will be available shortly." BullMQ retries 3 times. After 3 failures: admin notified. |
| Lab results uploaded are corrupted/unreadable | Doctor sees: "Lab results file may be corrupted. [Download original] [Request re-upload from lab]" |

---

## 28. Security & Privacy

### 28.1 Access Control (CASL.js)

```typescript
// Doctor permission rules
const ability = defineAbilityFor(doctor);

// Consultations: only assigned to this doctor
can('read', 'Consultation', { doctorId: doctor.id });
can('update', 'Consultation', { doctorId: doctor.id });

// Prescriptions: only create for own consultations
can('create', 'Prescription', { doctorId: doctor.id });
can('read', 'Prescription', { doctorId: doctor.id });

// Patients: only those with consultations assigned to this doctor
can('read', 'Patient', { consultations: { some: { doctorId: doctor.id } } });

// Messages: only for own consultation threads
can('read', 'Message', { consultationDoctorId: doctor.id });
can('create', 'Message', { consultationDoctorId: doctor.id });

// Lab orders: create for own consultations, read results
can('create', 'LabOrder', { consultationDoctorId: doctor.id });
can('read', 'LabResult', { consultationDoctorId: doctor.id });

// Cannot access:
cannot('read', 'Consultation', { doctorId: { $ne: doctor.id } });
cannot('read', 'Wallet');
cannot('read', 'Payment');
cannot('manage', 'Partner');
cannot('manage', 'SystemConfig');
cannot('read', 'AdminDashboard');
```

### 28.2 Data Visibility Rules

| Data | Doctor Can See | Doctor Cannot See |
|------|----------------|-------------------|
| Patient name, age, sex, city | ✅ | |
| Patient phone (masked) | ✅ (last 4 digits) | Full phone number |
| Government ID photo | ❌ | Admin only |
| Patient email | ❌ | Admin only (if needed) |
| Questionnaire responses | ✅ (own consultations) | Other doctors' consultations |
| Photos | ✅ (own consultations) | Other doctors' consultations |
| Lab results | ✅ (own consultations) | Lab portal internal data |
| AI assessment | ✅ (own consultations) | AI prompt/system prompt |
| Prescription | ✅ (own prescriptions) | Other doctors' prescriptions |
| Payment details | ❌ | Admin only |
| Wallet balance | ❌ | Patient + admin only |
| Subscription pricing | ❌ (sees plan type, not price) | Admin only |
| Other doctors' stats | ❌ | Admin only |

### 28.3 Audit Logging

Every doctor action is logged to the audit trail (PostgreSQL `AuditLog` table, INSERT-only):

| Action | Fields Logged |
|--------|--------------|
| Login | `{ doctorId, timestamp, ip, userAgent }` |
| Case opened | `{ doctorId, consultationId, timestamp }` |
| Status changed | `{ doctorId, consultationId, oldStatus, newStatus, timestamp }` |
| Prescription created | `{ doctorId, consultationId, medicationCount, templateUsed, timestamp }` |
| Lab order created | `{ doctorId, consultationId, panelId, timestamp }` |
| Message sent | `{ doctorId, consultationId, messageId, timestamp }` |
| Referral created | `{ doctorId, consultationId, clinicId, reason, timestamp }` |
| Refund requested | `{ doctorId, consultationId, amount, reason, timestamp }` |
| Case closed | `{ doctorId, consultationId, reason, timestamp }` |
| Settings changed | `{ doctorId, field, oldValue, newValue, timestamp }` |

**Retention:** Minimum 1 year (DPDP Rules), recommended 3 years (Telemedicine Practice Guidelines 2020). Audit table has INSERT-only permissions — no UPDATE or DELETE allowed.

### 28.4 Session Security

| Measure | Implementation |
|---------|---------------|
| HttpOnly cookies | JWT tokens not accessible via JavaScript |
| SameSite=Strict | CSRF protection — cookies not sent on cross-site requests |
| Secure flag | Cookies only sent over HTTPS |
| Token rotation | Every refresh generates new token pair |
| Theft detection | Old refresh token reuse → all tokens revoked |
| Idle timeout | After 4 hours of no API activity → next request triggers re-auth prompt |
| IP logging | Login IP recorded in audit log (not enforced for IP restriction — doctors may use VPN) |

### 28.5 Content Security

- **Screenshot prevention:** Not implemented for web portal (technically infeasible for desktop browsers). Instead: audit logging + terms of service enforcement.
- **Copy protection:** Not implemented (doctors legitimately need to reference patient data). Audit log tracks all data access.
- **Download tracking:** Every PDF download (prescriptions, lab results) logged with doctor ID + timestamp + file accessed.

---

## 29. Analytics Events

### 29.1 Key Events Tracked

| Event | Properties | Purpose |
|-------|-----------|---------|
| `doctor.login` | `{ doctorId, method: 'otp', device }` | Login frequency tracking |
| `doctor.case_queue.viewed` | `{ doctorId, filters, resultCount }` | Usage patterns |
| `doctor.case_queue.filtered` | `{ doctorId, filterType, filterValue }` | Most-used filters |
| `doctor.case_queue.sorted` | `{ doctorId, sortBy }` | Sort preference |
| `doctor.case_queue.searched` | `{ doctorId, queryLength }` | Search usage (no PII in query text) |
| `doctor.case.opened` | `{ doctorId, consultationId, condition, attentionLevel, waitTime }` | Case priority behavior |
| `doctor.case.tab_switched` | `{ doctorId, consultationId, fromTab, toTab }` | Most-used clinical tabs |
| `doctor.case.time_on_tab` | `{ doctorId, consultationId, tab, durationSeconds }` | Where doctors spend time |
| `doctor.prescription.started` | `{ doctorId, consultationId, condition }` | Conversion: review → prescribe |
| `doctor.prescription.template_selected` | `{ doctorId, condition, templateName }` | Most popular templates |
| `doctor.prescription.submitted` | `{ doctorId, consultationId, medicationCount, templateUsed, reviewTimeMinutes }` | Prescription patterns |
| `doctor.prescription.edited_from_template` | `{ doctorId, fieldsEdited[] }` | Template customization patterns |
| `doctor.lab_order.created` | `{ doctorId, consultationId, panelId, urgency }` | Lab ordering patterns |
| `doctor.referral.created` | `{ doctorId, consultationId, referralType }` | Referral frequency |
| `doctor.message.sent` | `{ doctorId, consultationId, isCanned, messageLength }` | Messaging patterns |
| `doctor.message.canned_used` | `{ doctorId, cannedLabel, isCustom }` | Canned response effectiveness |
| `doctor.patient.viewed` | `{ doctorId, patientId }` | Patient lookup frequency |
| `doctor.stats.viewed` | `{ doctorId, timeRange }` | Stats engagement |
| `doctor.settings.changed` | `{ doctorId, setting, newValue }` | Settings optimization |
| `doctor.shortcut.used` | `{ doctorId, shortcut, context }` | Keyboard efficiency adoption |

### 29.2 Analytics Privacy

- **No PII in analytics events:** Patient names, phone numbers, conditions, and clinical data are NEVER included in analytics payloads. Only UUIDs and aggregate metrics.
- **Doctor IDs are pseudonymized** in analytics exports (mapped UUIDs, not real names).
- **Search queries are NOT logged** (to prevent PII leakage) — only query length is tracked.
- **Message content is NOT logged** — only metadata (isCanned, length) is tracked.

---

*End of PORTAL-DOCTOR.md — Doctor Dashboard Complete Specification*

