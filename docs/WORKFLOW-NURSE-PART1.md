# WORKFLOW-NURSE-PART1.md — Nurse Complete Workflow Reference (Part 1 of 3)

## Pre-Visit Workflows: Provisioning, Authentication, Portal Navigation & Assignment Management

> **Document type:** Detailed workflow documentation (every screen, action, decision, error, and edge case)
> **Perspective:** Nurse / Phlebotomist / Home Visit Specialist
> **Version:** 1.0
> **Last updated:** March 2026
> **Cross-references:** PROJECT-OVERVIEW.md, APP-PATIENT.md, PORTAL-NURSE-FIXED.md, PORTAL-DOCTOR.md, PORTAL-ADMIN.md, PORTAL-LAB-FIXED.md, PORTAL-PHARMACY.md, ARCHITECTURE.md, BACKEND-PART1.md, BACKEND-PART2A.md, BACKEND-PART2B.md, BACKEND-PART3A.md, BACKEND-PART3B.md, VERTICAL-HAIR-LOSS.md, VERTICAL-ED.md, VERTICAL-PE.md, VERTICAL-WEIGHT.md, VERTICAL-PCOS-PART1.md, VERTICAL-PCOS-PART2.md, VERTICAL-PCOS-PART3.md, WORKFLOW-PATIENT.md, WORKFLOW-DOCTOR-PART1.md, WORKFLOW-DOCTOR-PART2.md, WORKFLOW-DOCTOR-PART3.md, onlyou-spec-resolved-v4.md

---

## Table of Contents — Full Document (Parts 1–3)

### Part 1: Pre-Visit Workflows
1. [Nurse Role Overview & Context](#1-nurse-role-overview--context)
2. [Account Provisioning (Admin-Initiated)](#2-account-provisioning-admin-initiated)
3. [First-Time Login & Onboarding](#3-first-time-login--onboarding)
4. [Returning Nurse Sign-In](#4-returning-nurse-sign-in)
5. [Token Strategy & Session Management](#5-token-strategy--session-management)
6. [PWA Installation & Setup](#6-pwa-installation--setup)
7. [Portal Layout & Navigation](#7-portal-layout--navigation)
8. [Today's Assignments — The Nurse's Home Screen](#8-todays-assignments--the-nurses-home-screen)
9. [Assignment Lifecycle (How Assignments Arrive)](#9-assignment-lifecycle-how-assignments-arrive)
10. [Real-Time Assignment Updates (SSE)](#10-real-time-assignment-updates-sse)

### Part 2: Visit Execution Workflows
11. [Starting a Visit (SCHEDULED → EN_ROUTE)](#11-starting-a-visit)
12. [Arriving at Patient Location (EN_ROUTE → ARRIVED)](#12-arriving-at-patient-location)
13. [Step 1: Patient Identity Verification (ARRIVED → IN_PROGRESS)](#13-step-1-patient-identity-verification)
14. [Step 2: Recording Vitals](#14-step-2-recording-vitals)
15. [Step 3: Blood Sample Collection](#15-step-3-blood-sample-collection)
16. [Step 4: Visit Completion Summary](#16-step-4-visit-completion-summary)
17. [Patient Unavailable / Failed Visit](#17-patient-unavailable--failed-visit)
18. [Running Late Flow](#18-running-late-flow)
19. [Delivering Samples to Lab](#19-delivering-samples-to-lab)
20. [Visit Cancellation (Admin-Initiated)](#20-visit-cancellation-admin-initiated)

### Part 3: Support Workflows & System Integration
21. [Past Visits & History](#21-past-visits--history)
22. [Profile & Settings](#22-profile--settings)
23. [Notification System (Nurse Experience)](#23-notification-system-nurse-experience)
24. [Offline Mode & Sync Strategy](#24-offline-mode--sync-strategy)
25. [Privacy & Data Access Boundaries](#25-privacy--data-access-boundaries)
26. [Security, Audit & CASL Permissions](#26-security-audit--casl-permissions)
27. [Error States & Master Edge Case Registry](#27-error-states--master-edge-case-registry)
28. [Phase 2 — Scaffolded Workflows (Muted)](#28-phase-2--scaffolded-workflows-muted)
29. [Cross-Portal Integration Map](#29-cross-portal-integration-map)
30. [Complete Status Flow Diagrams & Mappings](#30-complete-status-flow-diagrams--mappings)

---

## 1. Nurse Role Overview & Context

### 1.1 Who Is the Nurse in Onlyou?

The nurse is a qualified healthcare professional who performs home visits for blood collection and vitals recording. In the Onlyou platform, the nurse's role is operationally critical — they are the physical bridge between the digital platform and the patient's body. Without the nurse, lab-dependent verticals (Hair Loss, Weight, PCOS) cannot proceed past the doctor's blood work order.

**Key characteristics:**
- Qualified with GNM (General Nursing and Midwifery), BSc Nursing, ANM (Auxiliary Nurse Midwife), or equivalent with documented approval
- Works exclusively on mobile (always on the road — no desktop layout exists)
- Uses a PWA (Progressive Web App) at `nurse.onlyou.life` — installable on home screen
- Has NO access to patient clinical data (diagnosis, questionnaire responses, AI assessment, prescriptions, doctor notes, payment info)
- Has FULL access to: patient name + phone + address (for assigned visits only), tests ordered (test names only), special instructions (fasting, gate codes), assigned diagnostic centre details, own visit history and performance stats
- Works within a strictly defined geographic service area (by city + pincodes)
- Managed centrally by the admin/coordinator — nurses cannot self-schedule or self-assign

**Interaction touchpoints with other roles:**

| Role | How Nurse Interacts | Direction |
|------|---------------------|-----------| 
| Patient | Visits at home, verifies identity, records vitals, draws blood, answers basic care questions | Nurse → Patient (physical) |
| Admin/Coordinator | Receives assignments from admin, reports delays/failures to admin, admin manages nurse profile/schedule | Admin ↔ Nurse (operational) |
| Doctor | Indirectly — doctor orders lab work which eventually creates a nurse assignment; nurse-recorded vitals are visible to doctor in lab results | Doctor → (Admin) → Nurse |
| Lab | Nurse physically delivers blood samples to diagnostic centre; lab receives and confirms | Nurse → Lab (sample handoff) |
| Pharmacy | No direct interaction | — |

### 1.2 Nurse Capabilities — MVP vs. Phase 2

**MVP (Active — Phase 1):**

| Capability | Details |
|-----------|---------|
| Home visit blood collection | Full phlebotomy — locate vein, draw blood, label tubes |
| Patient vitals recording | BP (systolic + diastolic), pulse rate, SpO2, weight, temperature |
| Patient identity verification | Name match at door (verbal confirmation) |
| Basic patient education | Medication usage guidance, when to contact doctor |
| Sample transport | Physically deliver labeled samples to assigned diagnostic centre |
| Navigation & communication | Call patient, navigate to address via Google Maps/Apple Maps, report delays |
| Batch lab delivery | Deliver multiple patients' samples to the same lab in one trip |

**Phase 2 (Scaffolded in schema, feature-flagged off):**

| Capability | Details | Feature Flag |
|-----------|---------|-------------|
| Injection administration | GLP-1 (semaglutide), future TRT | `NURSE_INJECTION_ADMIN_ENABLED` |
| Proof of administration | Timestamped photo + digital signature | Same flag |
| Post-injection observation | 30-minute timer with vital checks | Same flag |
| Three-way video bridge | Connect patient + nurse + doctor | Separate flag TBD |
| GPS check-in | Automated location verification at visit start | Separate flag TBD |
| Comprehensive assessment | Full nursing assessment form | Separate flag TBD |

### 1.3 Which Verticals Involve the Nurse?

Not every patient sees a nurse. Only patients whose doctor orders blood work will have a nurse visit. The verticals and their lab work patterns:

| Vertical | Blood Work Required? | When Ordered | Common Panels |
|----------|---------------------|-------------|---------------|
| Hair Loss | Yes (common) | After doctor reviews questionnaire + photos | Extended Hair Panel (TSH, Ferritin, CBC, Iron, Vitamin D, Zinc) |
| ED | Occasionally | If doctor suspects hormonal cause | Testosterone, LH, Prolactin, Lipid Profile, HbA1c |
| PE | Rarely | Only if comorbid conditions suspected | Testosterone, Thyroid Panel |
| Weight Management | Yes (common) | Standard for metabolic assessment | Metabolic Panel (Lipid, HbA1c, Thyroid, Liver, Kidney) |
| PCOS | Yes (usually) | Standard for hormonal assessment | PCOS Panel (FSH, LH, Testosterone, DHEA-S, Prolactin, Thyroid, HbA1c, Insulin) |

**The nurse never knows which vertical the patient belongs to.** The nurse only sees: patient name, address, phone, test names, special instructions, and the assigned diagnostic centre. The condition/diagnosis is deliberately hidden for privacy.

---

## 2. Account Provisioning (Admin-Initiated)

### 2.1 How a Nurse Account Is Created

Nurses do NOT self-register. The admin/coordinator creates nurse accounts via the admin portal (PORTAL-ADMIN.md §17–18).

**Admin workflow (Source: PORTAL-ADMIN.md §18):**

1. Admin navigates to Partners → Nurses → Add Nurse
2. Admin fills the nurse registration form:

| Field | Required | Details |
|-------|----------|---------|
| Full Name | ✅ | Legal name as on certification |
| Phone Number | ✅ | +91 format, must be unique across all users |
| Email | ❌ | Optional — not used for auth |
| Gender | ✅ | MALE, FEMALE, OTHER |
| Qualification | ✅ | Dropdown: GNM, BSC_NURSING, ANM, OTHER |
| Certification Number | ✅ | Nursing council registration number |
| Certification Document | ✅ | PDF/image upload → stored in S3 `onlyou-documents` bucket at path `documents/nurse/{nurseId}/certification_{timestamp}.pdf` (Source: BACKEND-PART3B.md §20, BACKEND-PART2B.md) |
| City | ✅ | Current operating city |
| Serviceable Pincodes | ✅ | Array of pincodes the nurse can cover |
| Available Days | ✅ | Multi-select: MON, TUE, WED, THU, FRI, SAT, SUN |
| Available Time Start | ✅ | e.g., "07:00" |
| Available Time End | ✅ | e.g., "17:00" |
| Max Daily Visits | ✅ | Default: 8 (Source: BACKEND-PART2A.md §13.1 — note: PORTAL-NURSE-FIXED.md §4 says default 5, BACKEND uses 8; **implementation should use 8 as the backend is authoritative**) |
| Can Administer Injections | ❌ | Phase 2 — defaults to `false` |

3. Admin clicks "Create Nurse" → backend creates:
   - A `User` record with `role: 'NURSE'`
   - A linked `Nurse` profile record with all operational fields
   - Audit log entry: `{ action: 'nurse_created', adminId, nurseId }`

4. The nurse receives a WhatsApp message (primary) / SMS (fallback):
   ```
   Welcome to Onlyou! You've been added as a nurse.
   Portal: nurse.onlyou.life
   Login with your phone: +91 XXXXX XXXXX
   ```

**Backend implementation (Source: BACKEND-PART3A.md §25 — seed data):**
- Test nurse phone: `+919999900004`
- Test nurse email: `nurse@test.onlyou.life`
- Qualification: GNM, certification number `KA-NURSE-TEST-001`

### 2.2 Admin Edits to Nurse Profile

After creation, the admin can modify any nurse profile field via Partners → Nurses → [Nurse Name] → Edit. Changes the nurse CANNOT make themselves include: name, phone, qualification, certification, city, serviceable pincodes, available days/hours, and max daily visits. The nurse can only change their email and notification preferences (Source: PORTAL-NURSE-FIXED.md §16).

**Edge case — Phone number change:**
If the admin changes a nurse's phone number, the nurse's existing JWT becomes invalid on next refresh (the phone lookup fails). The nurse must log in again with the new number. No notification is sent for phone changes — the admin must inform the nurse directly.

**Edge case — Deactivation:**
Admin toggles `isActive: false` on the nurse profile → all future assignments are blocked, existing scheduled visits remain but admin should reassign them. The nurse portal shows "Your account has been deactivated. Contact your coordinator." on next login attempt (JWT validation checks `isActive`).

---

## 3. First-Time Login & Onboarding

### 3.1 Opening the Portal

The nurse opens `nurse.onlyou.life` on their mobile browser (Chrome on Android, Safari on iOS).

**What happens:**
1. Browser loads the Next.js PWA shell
2. Service worker registers (caches app shell for future offline access)
3. No JWT in localStorage → redirect to `/login`

### 3.2 Login Screen

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
└─────────────────────────────────────┘
```

### 3.3 OTP Request Flow

**Step 1: Nurse enters phone number and taps "Send OTP"**

Frontend calls:
```typescript
trpc.auth.requestOTP.mutate({
  phone: '+919999900004',
  channel: 'whatsapp'  // WhatsApp primary
})
// Returns: { success: true, expiresInSeconds: 300 }
```

**Server-side processing (Source: BACKEND-PART1.md §4):**
1. Server looks up phone in `User` table
2. If no user with this phone → return generic error "Unable to process request" (do NOT reveal whether phone exists — security)
3. If user exists but `role ≠ NURSE` → same generic error (never reveal role info)
4. If user exists with `role = NURSE` and `isActive = true`:
   - Generate 6-digit OTP
   - Store in Redis: `otp:{phone}` → `{ otp, attempts: 0, createdAt }` with TTL 300s (5 minutes)
   - Send via WhatsApp (Gupshup Business API) as primary channel
   - Rate limit: 5 OTP requests per phone per hour (Source: BACKEND-PART1.md §4)

**OTP entry screen:**
```
┌─────────────────────────────────────┐
│                                     │
│  Enter OTP sent to                  │
│  +91 99999 00004 via WhatsApp       │
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

**Resend logic:**
- Resend button disabled for 30 seconds after each send
- After 30 seconds, nurse can tap [Resend] → sends new OTP via WhatsApp
- [Try SMS instead] → sends OTP via SMS (Gupshup/MSG91 fallback)
- Rate limit: 5 OTP requests per phone per hour

**Step 2: Nurse enters 6-digit OTP and taps "Verify & Login"**

Frontend calls:
```typescript
trpc.auth.verifyOTP.mutate({
  phone: '+919999900004',
  otp: '123456'
})
// Returns: { accessToken, refreshToken, user: { id, name, role: 'NURSE', ... } }
```

**Server-side verification (Source: BACKEND-PART1.md §4):**
1. Retrieve stored OTP from Redis key `otp:{phone}`
2. Check attempt count: max 3 verification attempts per OTP (Source: BACKEND-PART1.md — **not 5 as some docs state; 3 is the backend authoritative value**)
3. Compare OTP → if mismatch, increment attempts, return error
4. If attempts exhausted → delete OTP from Redis, return "Too many attempts. Request a new OTP."
5. If OTP matches:
   - Delete OTP from Redis
   - Verify user role is NURSE and isActive = true
   - Generate JWT access token (15-minute expiry)
   - Generate refresh token (30-day expiry for staff roles) → set as HttpOnly cookie
   - Store refresh token hash in Redis (not PostgreSQL — Source: BACKEND-PART1.md, **authoritative over any doc claiming PostgreSQL**)
   - Record audit log: `{ action: 'nurse_login', userId, ip, userAgent, timestamp }`
   - Return tokens + user data

**Edge cases at login:**

| Scenario | Behavior |
|----------|----------|
| Phone not registered | Generic error: "Unable to process request" (no phone existence leak) |
| User exists but not NURSE role | Same generic error |
| Nurse account deactivated (`isActive: false`) | After OTP verification: "Your account has been deactivated. Contact your coordinator." |
| OTP expired (>5 minutes) | "OTP expired. Please request a new one." |
| Wrong OTP 3 times | "Too many attempts. Request a new OTP." (OTP deleted from Redis) |
| Rate limit hit (5 OTPs/hour) | "Too many OTP requests. Please try again later." |
| WhatsApp delivery fails | System auto-falls back to SMS. Nurse can also tap "Try SMS instead" |
| Network error during OTP send | Toast: "Couldn't send OTP. Check your connection and try again." |

### 3.4 First Login — What the Nurse Sees

After successful first login, the nurse lands on the **Today's Assignments** screen (the home screen). On first visit, there may be no assignments yet:

```
┌─────────────────────────────────────┐
│  👤 Priya S.            🔔 [0]     │
│  Saturday, 01 Mar 2026              │
├─────────────────────────────────────┤
│                                     │
│       [Illustration: nurse          │
│        relaxing with coffee]        │
│                                     │
│    No visits scheduled today 🎉     │
│                                     │
│    Check tomorrow's schedule:       │
│    [View Tomorrow →]                │
│                                     │
├─────────────────────────────────────┤
│  [Running Late 🕐]  [Help ❓]       │
└─────────────────────────────────────┘
```

Additionally, the PWA install banner appears:

```
┌─────────────────────────────────────┐
│  📱 Add to Home Screen              │
│  Get quick access to your visits    │
│  [Install]  [Maybe Later]           │
└─────────────────────────────────────┘
```

---

## 4. Returning Nurse Sign-In

### 4.1 Auto-Login (Token in Storage)

When a nurse reopens the portal (or the installed PWA):

1. App checks for JWT access token in memory (Zustand store) / localStorage backup
2. **Token valid and not expired** → directly show Today's Assignments, no login screen
3. **Token expired but refresh token exists (HttpOnly cookie):**
   - Silent refresh: frontend calls refresh endpoint
   - Server validates refresh token hash in Redis
   - If valid → new access token (15 min) + new refresh token (30 days) via token rotation
   - Nurse never sees login screen
4. **Refresh token also expired or invalid:**
   - Redirect to login screen
   - Nurse must re-enter phone + OTP

### 4.2 Concurrent Session Policy

**Single device expected** (Source: PORTAL-NURSE-FIXED.md §2):
- New login from a different browser/device → previous session's refresh token is revoked
- Previous device: on next API call → 401 → redirect to login
- No warning on previous device (it simply becomes invalid)
- Rationale: nurses use a single phone; multiple active sessions indicate potential account sharing or theft

### 4.3 Token Theft Detection

**Refresh token reuse detection (Source: ARCHITECTURE.md):**
- When a refresh token is used, the server issues a new pair and invalidates the old refresh token
- If someone uses an already-invalidated refresh token (replay attack), the server detects this as theft
- Response: **ALL** of the nurse's tokens are revoked globally
- Nurse must log in fresh from all devices
- Admin is alerted via SSE: "⚠️ Potential token theft detected for Nurse [name]"

### 4.4 Idle Timeout

- After 12 hours of no API activity, the session is considered stale (Source: PORTAL-NURSE-FIXED.md §2)
- Rationale: nurses work long shifts with intermittent portal use — 12 hours gives ample buffer
- The idle timeout does NOT forcibly log out — the refresh token (30-day) still works
- It's an additional signal: if the nurse hasn't touched the app in 12 hours AND the access token expired, the next silent refresh is granted but logged as a "session revival" in audit

---

## 5. Token Strategy & Session Management

### 5.1 Token Storage

| Token | Storage Location | Expiry | Notes |
|-------|-----------------|--------|-------|
| Access token | Memory (Zustand store) + localStorage backup | 15 minutes | Short-lived, contains role + nurseId claims |
| Refresh token | HttpOnly cookie (set by server) | 30 days | **No localStorage fallback** for refresh tokens (Source: ARCHITECTURE.md) — security measure |

**Why HttpOnly cookie for refresh token:**
- Not accessible via JavaScript → XSS attacks cannot steal it
- SameSite=Strict → CSRF protection
- Secure flag → only sent over HTTPS
- This is critical for a healthcare platform handling patient PII

### 5.2 Silent Refresh Mechanism

```
Access token has < 2 minutes remaining
    │
    ▼
Frontend interceptor detects expiry
    │
    ▼
POST /api/auth/refresh (refresh token sent via cookie automatically)
    │
    ├── Success → New access token (15 min) + new refresh token cookie
    │             → Continue with queued API call
    │
    └── Failure (401) → All tokens invalid → redirect to /login
```

**Implementation detail:** The tRPC client wraps all procedures in an error-handling link that catches 401 errors, attempts a single refresh, and retries the failed call. If the refresh itself fails, the user is redirected to login.

### 5.3 JWT Claims (Access Token)

```json
{
  "sub": "user-uuid",
  "role": "NURSE",
  "nurseId": "nurse-uuid",
  "iat": 1709280000,
  "exp": 1709280900
}
```

The `nurseId` claim is critical — it's used by the nurse tRPC router to scope all queries to only this nurse's assignments (Source: BACKEND-PART2A.md §13.3).

---

## 6. PWA Installation & Setup

### 6.1 PWA Manifest

The nurse portal is a full PWA (Source: PORTAL-NURSE-FIXED.md §3):

| Property | Value |
|----------|-------|
| App name | "Onlyou Nurse" |
| Short name | "Nurse" |
| Display | standalone (no browser chrome) |
| Orientation | portrait (mobile-only) |
| Theme color | `#0F766E` (teal) |
| Background color | `#FFFFFF` |
| Icons | 192x192 and 512x512 PNG |

### 6.2 Install Flow

**First visit:**
1. Browser registers service worker
2. Service worker caches app shell (HTML, CSS, JS, icons)
3. Install banner appears at top: "📱 Add to Home Screen — Get quick access to your visits — [Install] [Maybe Later]"
4. If nurse taps [Install] → browser's native "Add to Home Screen" dialog appears
5. After install → app opens in standalone mode (no URL bar, no browser chrome)
6. Analytics event: `nurse_pwa_install`

**Decline handling:**
- [Maybe Later] dismisses the banner
- Banner reappears on next visit
- After 3 declines → banner permanently hidden (tracked via cookie)
- Nurse can still install manually via browser menu ("Add to Home Screen")

### 6.3 Service Worker Caching Strategy

| Resource | Strategy | Rationale |
|----------|----------|-----------|
| App shell (HTML, CSS, JS) | Cache-first, background update | Fast load on repeat visits |
| Today's assignments | Network-first, cache fallback | Show stale data if offline |
| Visit flow pages | Cache-first after first load | Must work mid-visit if signal drops |
| API mutations | Queue if offline, sync on reconnect | Never lose a vitals recording |
| Static assets (images, icons) | Cache-first, long TTL | Reduce mobile data usage |

### 6.4 Offline Fallback Page

If the app is opened offline without a cached shell:
```
┌─────────────────────────────────────┐
│                                     │
│         [Onlyou Logo]               │
│                                     │
│   You're offline                    │
│   Connect to the internet to        │
│   access the Nurse Portal.          │
│                                     │
│   [Try Again]                       │
│                                     │
└─────────────────────────────────────┘
```

This fallback page (`public/offline.html`) is pre-cached during service worker installation.

---

## 7. Portal Layout & Navigation

### 7.1 Design Philosophy

The nurse portal is **mobile-only** — no desktop layout exists. On screens wider than 480px, the app renders centered with a gray background on either side (Source: PORTAL-NURSE-FIXED.md §24).

**Key design principles:**
- Single-screen focused design (no tab navigation for MVP)
- Large touch targets (minimum 48px height, 44px touch area)
- One-hand operation (primary actions at bottom of screen, thumb-reachable)
- High contrast (status badges and critical alerts visible in sunlight)
- Minimal typing (numeric inputs for vitals, steppers for counts, checkboxes for verification)

### 7.2 Screen Layout

```
┌─────────────────────────────────────┐  ← Fixed top bar (56px)
│  👤 Nurse Name     🔔 [badge]       │     Nurse name from JWT, notification bell
├─────────────────────────────────────┤
│                                     │
│                                     │
│  Scrollable Content Area            │  ← Main content (varies by route)
│                                     │
│                                     │
├─────────────────────────────────────┤
│  [Running Late 🕐]  [Help ❓]       │  ← Fixed bottom action bar (64px)
└─────────────────────────────────────┘
```

### 7.3 Route Map

| Route | Screen | Purpose |
|-------|--------|---------|
| `/` | Today's Assignments | Default home — all visits for today |
| `/login` | Login | Phone OTP authentication |
| `/visit/[id]` | Visit Flow | Guided step-by-step visit execution |
| `/deliver` | Deliver to Lab | Batch sample delivery confirmation |
| `/history` | Past Visits | Completed and failed visit history |
| `/profile` | Profile & Settings | Nurse profile, notification preferences |

### 7.4 Top Bar

| Element | Behavior |
|---------|----------|
| Nurse name | Displayed from JWT user data (first name + last initial) |
| Current date | Shown below name; long-press opens date picker |
| Notification bell | Badge count for unread notifications; tap opens notification list overlay |

### 7.5 Bottom Action Bar (Persistent)

The bottom bar appears on the home screen and contains two persistent actions:
- **Running Late 🕐** → Opens the running late modal (see Part 2, §18)
- **Help ❓** → Opens help/support contact information

---

## 8. Today's Assignments — The Nurse's Home Screen

### 8.1 What This Screen Shows

Route: `/` — this is the default landing after login.

The screen displays all visits assigned to this nurse for the selected date (defaults to today), sorted in a specific priority order.

**API call on load:**
```typescript
trpc.nurse.visits.getToday.query({ date: '2026-03-01' })
// Returns: {
//   visits: NurseVisitWithDetails[],
//   todayStats: { total: 3, completed: 1, remaining: 2, failed: 0 }
// }
```

### 8.2 Assignment Sort Order

The assignment list is always sorted in this priority:

1. **Active visit** (status: EN_ROUTE, ARRIVED, IN_PROGRESS) → always pinned at top
2. **Upcoming visits** (status: SCHEDULED) → sorted by `scheduledTimeSlot` ascending
3. **Completed visits** (status: COMPLETED) → sorted by `completedAt` descending
4. **Failed visits** (status: FAILED) → at bottom
5. **Cancelled visits** (status: CANCELLED) → at very bottom, grayed out

### 8.3 Assignment Card Information

Each assignment card displays:

| Field | Source | Display Format |
|-------|--------|---------------|
| Time slot | `NurseVisit.scheduledTimeSlot` | "8:00–10:00 AM" |
| Patient name | `patient.name` (via join) | First name + last initial ("Rahul M.") |
| Area | Derived from `visitPincode` or `visitAddress` | Locality name (e.g., "Banjara Hills") |
| Tests ordered | `labOrder.tests[]` (via join) | Comma-separated test names |
| Special instructions | `specialInstructions` + `labOrder.notes` | "Fasting required", "Gate code: 1234" |
| Status | `NurseVisit.status` | Color-coded badge |

**What is NOT shown on the card:**
- Patient condition/diagnosis
- Patient age, DOB, gender
- Doctor name
- Prescription details
- Payment information

### 8.4 Card Visual States

| Status | Icon | Background | Available Actions |
|--------|------|-----------|-------------------|
| SCHEDULED | ⚪ (gray circle) | White | Navigate 📍, Call 📞, Start Visit ▶️ (first upcoming only) |
| EN_ROUTE | 🔵 (blue, pulsing) | Light blue tint | Navigate 📍, Call 📞, Arrived |
| ARRIVED | 🔵 (blue, solid) | Light blue tint | Continue Visit (resumes at current step) |
| IN_PROGRESS | 🟡 (yellow, pulsing) | Light yellow tint | Continue Visit |
| COMPLETED | ✅ (green check) | Light green tint | Deliver to Lab 🏥 (if not yet delivered) |
| FAILED | ❌ (red cross) | Light red tint | None (read-only) |
| CANCELLED | 🚫 (gray strike) | Gray tint | None (read-only) |

### 8.5 Card Action Buttons

| Action | Button | Trigger | What Happens |
|--------|--------|---------|--------------|
| **Navigate** | 📍 | Tap | Opens Google Maps (Android) or Apple Maps (iOS) with patient address as destination |
| **Call** | 📞 | Tap | Opens phone dialer with patient phone number (tel: link) |
| **Start Visit** | ▶️ | Tap (only on first upcoming SCHEDULED visit) | Status → EN_ROUTE, navigates to `/visit/[id]` |
| **Continue Visit** | Tap card | For ARRIVED/IN_PROGRESS cards | Navigates to `/visit/[id]` at current step |
| **Deliver to Lab** | 🏥 | Tap (for COMPLETED, not yet delivered) | Navigates to `/deliver` with visit pre-selected |
| **View Summary** | Tap card | For COMPLETED cards | Shows read-only visit summary modal |

**"Start Visit" button logic:**
- Only appears on the FIRST upcoming SCHEDULED visit (chronologically)
- Rationale: nurse should complete visits in order, not skip ahead
- If nurse has an active visit (EN_ROUTE/ARRIVED/IN_PROGRESS), the "Start Visit" button is hidden on all other cards — nurse must complete or fail the active visit first

### 8.6 Date Picker

Tapping the 📅 icon (top right of assignment list) opens a calendar popup:
- Shows current week + next 7 days
- Selecting a date → loads assignments for that date via `trpc.nurse.visits.getByDate.query({ date })`
- Past dates show completed/failed visits in read-only mode
- Use case: checking tomorrow's schedule the evening before

### 8.7 Pull-to-Refresh

- Pull down on the assignment list → triggers fresh `trpc.nurse.visits.getToday.query()`
- Shows loading spinner during refresh
- Success: toast "Updated"
- Failure: toast "Couldn't refresh — using cached data"
- If offline: toast "No connection" + shows cached assignments

### 8.8 Empty State

When no visits are scheduled for the selected date:

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

### 8.9 Today Stats Bar

Below the date header, a stats summary bar shows:
- "Today's Visits (3)" — total count
- A progress indicator: "1 completed, 2 remaining"

---

## 9. Assignment Lifecycle (How Assignments Arrive)

### 9.1 The Full Chain — From Doctor to Nurse

Understanding how an assignment reaches the nurse is critical for understanding the nurse's context:

```
Step 1: Doctor reviews patient case
    │
    ▼
Step 2: Doctor clicks "Order Blood Work" on consultation
    │   Creates LabOrder with status: ORDERED
    │   Patient receives push: "Your doctor has ordered blood tests"
    │   (Source: BACKEND-PART1.md §9, BACKEND-PART2A.md §12)
    ▼
Step 3: Patient opens app → Blood Work tab → Books a slot
    │   LabOrder status: ORDERED → SLOT_BOOKED
    │   Stores: scheduledDate, scheduledTimeSlot, address
    │   SLA starts: nurse must be assigned within 2 hours
    │   (Source: BACKEND-PART2B.md §18 — NURSE_ASSIGNMENT_HOURS: 2)
    ▼
Step 4: Admin sees "Needs Assignment" on Lab Orders page
    │   Admin clicks "Assign Nurse" on the lab order card
    │   Admin selects nurse from filtered list (Source: PORTAL-ADMIN.md §8)
    │   (Source: PORTAL-ADMIN.md §6–8)
    ▼
Step 5: Backend processes assignment
    │   LabOrder status: SLOT_BOOKED → NURSE_ASSIGNED
    │   NurseVisit record created (status: SCHEDULED)
    │   (Source: BACKEND-PART2A.md §12.3 — labOrders.assignNurse)
    ▼
Step 6: Nurse receives notification
    │   Push (FCM) + WhatsApp + SSE in-app
    │   NurseVisit appears on Today's Assignments
    │   (Source: PORTAL-NURSE-FIXED.md §17)
    ▼
Step 7: Nurse executes the visit (Part 2 of this document)
```

### 9.2 NurseVisit Creation — What the Backend Does

When admin calls `trpc.admin.labOrders.assignNurse.mutate({ labOrderId, nurseId })` (Source: BACKEND-PART2A.md §12.3):

1. **Validates nurse:**
   - Nurse exists and `isActive: true`
   - Nurse's `serviceableAreas` includes the patient's visit pincode
   - Nurse's `availableDays` includes the scheduled day
   - Nurse's scheduled time falls within `availableTimeStart`–`availableTimeEnd`
   - Nurse hasn't exceeded `maxDailyVisits` for that date

2. **Creates NurseVisit record:**
```typescript
await tx.nurseVisit.create({
  data: {
    nurseId,
    patientId: labOrder.patientId,
    labOrderId,
    visitType: 'BLOOD_COLLECTION',
    scheduledDate: labOrder.scheduledDate,
    scheduledTimeSlot: labOrder.scheduledTimeSlot,
    visitAddress: labOrder.patientAddress,
    visitCity: labOrder.patientCity,
    visitPincode: labOrder.patientPincode,
    specialInstructions: labOrder.notes, // "Fasting required", etc.
    status: 'SCHEDULED',
  },
});
```

3. **Updates LabOrder:**
   - `status: 'NURSE_ASSIGNED'`
   - `nurseId: nurseId`
   - `nurseAssignedAt: new Date()`

4. **Notifies nurse:**
   - Push (FCM): "New blood collection assignment — [date], [timeSlot], [area]"
   - WhatsApp template: "Onlyou: New blood collection assignment 📅 Date: [date] 🕐 Time: [timeSlot] 📍 Area: [area] 🔬 Tests: [tests] Open your portal: nurse.onlyou.life"
   - SSE to `nurse:{nurseId}` channel: event `new_assignment`

5. **Notifies admin dashboard:**
   - SSE to `admin` channel: event `nurse_assigned`

6. **Notifies patient:**
   - Push: "A nurse has been assigned for your blood test on [date] at [timeSlot]"

### 9.3 Daily Schedule Summary (WhatsApp)

Every evening at 8 PM, the system sends each nurse a WhatsApp summary of tomorrow's schedule (Source: PORTAL-NURSE-FIXED.md §17):

```
Onlyou: Tomorrow's Schedule
📅 March 02, 2026
3 visit(s) scheduled:
• 8:00–10:00 AM — Banjara Hills (TSH, CBC, Ferritin)
• 10:00–12:00 PM — Jubilee Hills (Testosterone, LH)
• 2:00–4:00 PM — Madhapur (Metabolic Panel)
Open portal: nurse.onlyou.life
```

This is a scheduled job (cron/bull queue) that runs at 8 PM IST daily, queries all nurses with visits tomorrow, and sends the WhatsApp template message.

---

## 10. Real-Time Assignment Updates (SSE)

### 10.1 SSE Connection Architecture

The nurse portal maintains a persistent SSE (Server-Sent Events) connection for real-time updates:

**Connection setup (Source: PORTAL-NURSE-FIXED.md §18, BACKEND-PART2B.md §16):**
```typescript
// hooks/useSSE.ts
const eventSource = new EventSource(
  `${API_URL}/sse/nurse?token=${accessToken}`,
  { withCredentials: true }
);
```

**Server-side (Source: BACKEND-PART2B.md §16):**
- Redis Pub/Sub channel: `nurse:{nurseId}`
- SSE endpoint: `GET /sse/nurse` (authenticated, scoped to nurse's userId)
- Channel key in Redis: `sse:nurse:{nurseId}` (Source: BACKEND-PART3A.md)

### 10.2 SSE Events the Nurse Receives

| Event | Payload | UI Action |
|-------|---------|-----------|
| `new_assignment` | `{ visitId, patientName, timeSlot, area, tests[] }` | Add card to assignment list, show toast notification |
| `assignment_cancelled` | `{ visitId, patientName, reason }` | Remove card from list, show toast "Visit cancelled: [patient]" |
| `assignment_rescheduled` | `{ visitId, patientName, newDate, newTimeSlot }` | Update card with new time, show toast "Visit rescheduled" |
| `lab_order_updated` | `{ labOrderId, newStatus }` | Update related visit card status |
| `patient.confirmed_slot` | `{ visitId, patientName }` | No UI change (informational) |
| `visit.reminder` | `{ visitId, minutesBefore: 30 }` | Push notification: "Reminder: visit with [patient] in 30 minutes" |
| `sla.warning` | `{ type, message }` | Push notification with warning |

### 10.3 SSE Reconnection Strategy

If the SSE connection drops (network change, server restart, phone sleep):
- Auto-reconnect with exponential backoff: 1s → 2s → 4s → 8s → max 30s
- During disconnection: banner "Reconnecting..." at top of screen
- On reconnect: full assignment list re-fetched via API to catch any missed events
- If reconnect fails after 5 minutes: banner changes to "⚠️ Connection lost. Pull to refresh."

### 10.4 Multiple Tab / Session Handling

Only the first browser tab establishes an SSE connection. If nurse opens a second tab:
- Second tab shows: "Portal is open in another tab."
- This prevents duplicate notifications and SSE connections
- Detection via BroadcastChannel API or localStorage lock

### 10.5 Assignment Updates While Nurse Is in Visit Flow

If the nurse is actively in a visit (`/visit/[id]`) and an SSE event arrives:
- **New assignment**: Toast notification at top of screen, does NOT interrupt visit flow
- **Current visit cancelled**: Full-screen alert: "⚠️ This visit has been cancelled by the coordinator. Reason: [reason]." → [Back to Assignments] button
- **Current visit rescheduled**: Full-screen alert: "This visit has been rescheduled to [new date/time]." → [Back to Assignments]

---

*End of Part 1. Continue to WORKFLOW-NURSE-PART2.md for visit execution workflows (§11–20).*
