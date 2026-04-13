# WORKFLOW-DOCTOR-PART1.md — Doctor Complete Workflow Reference (Part 1 of 3)

## Pre-Clinical Workflows: Provisioning, Authentication, Navigation & Case Queue

> **Document type:** Detailed workflow documentation (every screen, action, decision, error, and edge case)
> **Perspective:** Doctor / Consulting Physician
> **Version:** 1.0
> **Last updated:** March 2026
> **Cross-references:** PROJECT-OVERVIEW.md, APP-PATIENT.md, PORTAL-DOCTOR.md, PORTAL-NURSE-FIXED.md, PORTAL-ADMIN.md, PORTAL-LAB-FIXED.md, PORTAL-PHARMACY.md, LANDING-PAGE.md, ARCHITECTURE.md, BACKEND-PART1.md, BACKEND-PART2A.md, BACKEND-PART2B.md, BACKEND-PART3A.md, BACKEND-PART3B.md, VERTICAL-HAIR-LOSS.md, VERTICAL-ED.md, VERTICAL-PE.md, VERTICAL-WEIGHT.md, VERTICAL-PCOS-PART1.md, VERTICAL-PCOS-PART2.md, VERTICAL-PCOS-PART3.md, WORKFLOW-PATIENT.md, onlyou-spec-resolved-v4.md

---

## Table of Contents — Part 1

1. [Doctor Role Overview & Context](#1-doctor-role-overview--context)
2. [Account Provisioning (Admin-Initiated)](#2-account-provisioning-admin-initiated)
3. [First-Time Login & Onboarding](#3-first-time-login--onboarding)
4. [Returning Doctor Sign-In](#4-returning-doctor-sign-in)
5. [Token Strategy & Session Management](#5-token-strategy--session-management)
6. [Portal Navigation & Layout](#6-portal-navigation--layout)
7. [Case Queue — The Doctor's Inbox](#7-case-queue--the-doctors-inbox)
8. [Case Assignment & Auto-Assignment](#8-case-assignment--auto-assignment)
9. [Real-Time Queue Updates (SSE)](#9-real-time-queue-updates-sse)
10. [Case Queue Edge Cases & Error States](#10-case-queue-edge-cases--error-states)

---

## 1. Doctor Role Overview & Context

### 1.1 Who Is the Doctor in Onlyou?

The doctor is a licensed consulting physician who reviews patient cases asynchronously on the Onlyou platform. Doctors do not interact with patients via video or phone in the MVP — all consultations are async (questionnaire + AI summary + messaging). The doctor reviews pre-processed AI assessments, raw questionnaire data, photos, and lab results, then takes clinical action: prescribe, order blood work, request more info, refer, or close the case.

**Key characteristics:**
- Licensed physician with valid NMC (National Medical Council) registration
- Specializes in one or more of the 5 verticals: Hair Loss (Dermatologist/Trichologist), ED (Urologist/Andrologist), PE (Urologist/Andrologist/Sexual Medicine), Weight Management (Endocrinologist/IM), PCOS (Gynecologist/Endocrinologist)
- Works primarily on desktop/laptop (case review requires large screens for the 3-panel layout)
- May use mobile for quick queue checks and messaging
- Has NO access to patient payment data, wallet balances, subscription pricing details (only plan type), government ID images, other doctors' statistics, or admin dashboards
- Has FULL access to: assigned patient clinical data (questionnaire, photos, labs, AI assessments), messaging within own consultations, prescription creation for own consultations, lab ordering for own consultations

**Interaction touchpoints with other roles:**

| Role | How Doctor Interacts | Direction |
|------|---------------------|-----------|
| Patient | Reviews questionnaire, photos, lab results; sends messages; creates prescriptions | Doctor → Patient (clinical) |
| Admin/Coordinator | Receives case assignments; submits refund requests; admin monitors SLA compliance | Admin → Doctor (operational) |
| Nurse | Indirectly — doctor orders lab work, admin assigns nurse, nurse collects sample | Doctor → (Admin) → Nurse |
| Lab | Indirectly — lab processes samples and uploads results visible to doctor | Lab → Doctor (results) |
| Pharmacy | Indirectly — prescription auto-routes to pharmacy via admin | Doctor → (Admin) → Pharmacy |
| AI Engine | Reviews AI pre-assessment; can retry failed AI assessments | AI → Doctor (decision support) |

### 1.2 Doctor Specialization by Vertical

| Vertical | Doctor Type | Case Characteristics |
|----------|------------|---------------------|
| Hair Loss | Dermatologist / Trichologist | Photos required (4), sometimes blood work, Norwood/Ludwig scale assessment |
| ED | Urologist / Andrologist | No photos, IIEF-5 scoring, cardiovascular risk assessment, nitrate contraindication check |
| PE | Urologist / Andrologist / Sexual Medicine | No photos, PEDT scoring, often comorbid with ED |
| Weight Management | Endocrinologist / Internal Medicine | Photos required (2), BMI calculation, metabolic risk, eating disorder screening |
| PCOS | Gynecologist / Endocrinologist | Photos optional, Rotterdam criteria, fertility intent branching, period tracker data |

**Cross-vertical capability:** A single doctor can be assigned multiple verticals (e.g., a urologist handling both ED and PE). The admin configures which verticals each doctor can handle during account provisioning. The case queue filters by vertical, so a multi-vertical doctor sees cases from all their assigned verticals.

### 1.3 Doctor's Typical Day

1. **Morning login** → Open `doctor.onlyou.life` on desktop → Case queue loads with pending cases
2. **Queue triage** → Scan queue, sort by highest attention or longest waiting → Identify critical cases first
3. **Case review cycle** (repeat for each case):
   - Open case → Read AI summary → Review questionnaire (flagged answers) → Check photos (if applicable) → Review lab results (if available) → Take action (prescribe / order labs / request info / refer / close)
4. **Messaging** → Check if any patients have responded to info requests → Review and respond
5. **Follow-up reviews** → Handle follow-up cases (4-week, 3-month, 6-month, annual) → Compare with baseline
6. **End of day** → Check stats → Update availability if needed → Log out or let session persist

**Average throughput:** 15–30 cases per day per doctor (depending on complexity). AI pre-assessment reduces review time to 3–8 minutes per case (vs. 15–20 minutes without AI support).

---

## 2. Account Provisioning (Admin-Initiated)

### 2.1 How a Doctor Account Is Created

Doctors do **NOT** self-register. Account creation is strictly admin-initiated to maintain platform quality control and regulatory compliance.

**Admin workflow (Source: PORTAL-ADMIN.md Section 23):**

1. Admin navigates to `admin.onlyou.life` → Settings → User Management → `[+ Add User]`
2. Admin fills in doctor registration form:

| Field | Required | Notes |
|-------|----------|-------|
| Full Name | ✅ | Display name on prescriptions and patient-facing surfaces |
| Phone Number | ✅ | Must be Indian mobile (+91 prefix). Used for OTP login. |
| NMC Registration Number | ✅ | Validated format: NMC-YYYY-NNNNN. Admin verifies against NMC registry. |
| Email | Optional | For email notifications (not used for auth) |
| City | ✅ | Affects patient assignment (regional matching) |
| Role | ✅ | Set to `DOCTOR` |
| Specializations (Verticals) | ✅ | Multi-select: Hair Loss, ED, PE, Weight, PCOS. Determines which case types they receive. |

3. Admin clicks `[Create Account]`

**Backend actions (Source: BACKEND-PART1.md, BACKEND-PART3A.md):**

```
API: trpc.admin.users.create.mutate({
  name: 'Dr. Rajesh Patel',
  phone: '+919876504567',
  nmcNumber: 'NMC-2019-12345',
  email: 'dr.patel@email.com',
  city: 'Mumbai',
  role: 'DOCTOR',
  specializations: ['HAIR_LOSS', 'ED', 'PE']
})
```

**Server-side actions (synchronous):**
1. Validate phone number uniqueness across all users
2. Validate NMC number format (no external API verification in MVP — manual admin verification)
3. Create `User` record with role `DOCTOR` and status `ACTIVE`
4. Create `DoctorProfile` record linked to the User, with:
   - `specializations`: array of condition enums
   - `availableSchedule`: default weekday schedule (Mon-Fri 09:00-18:00, Sat 10:00-14:00, Sun off)
   - `nmcNumber`: stored for prescription regulatory info
   - `city`: for regional patient matching
5. Audit log entry: `{ action: 'USER_CREATED', adminId, newUserId, role: 'DOCTOR', timestamp }`

**Server-side actions (async — BullMQ):**
1. Send WhatsApp message to doctor's phone via Gupshup: "Welcome to Onlyou! You've been registered as a consulting physician. Visit doctor.onlyou.life to access your dashboard."
2. If email provided: send welcome email with portal URL and getting-started guide

### 2.2 Provisioning Edge Cases

| Scenario | System Behavior |
|----------|----------------|
| Phone number already registered (any role) | Error: "This phone number is already associated with an account." Admin must use a different number or deactivate the existing account first. |
| Admin enters invalid NMC format | Client-side validation rejects: "NMC number must be in format NMC-YYYY-NNNNN." |
| Admin tries to create doctor with no specializations | Validation error: "At least one specialization must be selected." |
| WhatsApp welcome message fails to send | BullMQ retries 3 times. If all fail: admin notified. Doctor can still login — the welcome message is informational only. |
| Admin accidentally provisions with wrong phone number | Admin can edit the doctor profile and change the phone number before the doctor logs in. If doctor already logged in with wrong number: admin must deactivate that account and create a new one. |
| Doctor's NMC registration is suspended after provisioning | Admin must manually deactivate the doctor's account via User Management. There is no automated NMC verification check in MVP. |
| Multiple admins try to create the same doctor simultaneously | Database unique constraint on phone number prevents duplicates. Second admin gets error. |

### 2.3 Doctor Account States

| State | Meaning | Can Login? | Can Receive Cases? |
|-------|---------|-----------|-------------------|
| `ACTIVE` | Normal operating state | ✅ Yes | ✅ Yes (subject to availability schedule) |
| `DEACTIVATED` | Admin has disabled the account | ❌ No (403 error) | ❌ No |
| `SUSPENDED` | Temporary hold (e.g., investigation) | ❌ No | ❌ No |

**Transition rules:**
- `ACTIVE` → `DEACTIVATED`: Admin action. Existing in-progress cases are NOT automatically reassigned (admin must manually reassign).
- `DEACTIVATED` → `ACTIVE`: Admin reactivation. Doctor can log in again. Queue resumes.
- `ACTIVE` → `SUSPENDED`: Admin action for temporary holds. Same behavior as deactivation but signals intent to reactivate.
- Any deactivation while doctor has pending cases → Admin warning: "This doctor has [N] active cases. These cases will need to be manually reassigned."

---

## 3. First-Time Login & Onboarding

### 3.1 Pre-Login State

After admin provisioning, the doctor receives a WhatsApp message with the portal URL. The doctor navigates to `doctor.onlyou.life` on their browser.

**First visit experience:**
1. Browser loads Next.js application
2. No auth cookies exist → automatically redirected to `/login`
3. Login screen renders

### 3.2 Login Screen UI

```
┌──────────────────────────────────┐
│  Onlyou — Doctor Portal          │
│                                  │
│  [Onlyou Logo]                   │
│                                  │
│  Enter your registered phone     │
│  number to sign in               │
│                                  │
│  +91 [__________]               │
│                                  │
│  [Send OTP via WhatsApp]         │
│                                  │
│  ───── or ─────                  │
│                                  │
│  [Send OTP via SMS]              │
│                                  │
│  ─────────────────────           │
│  If you haven't been registered, │
│  contact your Onlyou coordinator.│
└──────────────────────────────────┘
```

**Design notes:**
- Clean, professional interface (not the consumer-facing colorful design)
- WhatsApp OTP is primary (cheaper: ~₹0.10-0.15 vs SMS ~₹0.15-0.50)
- No "Sign Up" button — doctors cannot self-register
- No social login (Google/Apple) — phone OTP only for portal staff
- Phone input auto-formats with +91 prefix (India only)

### 3.3 OTP Request Flow

**Step 1: Doctor enters phone number and taps "Send OTP via WhatsApp"**

```
API: trpc.auth.sendOtp.mutate({
  phone: '+919876504567',
  channel: 'whatsapp'    // or 'sms'
})
→ Returns: { success: true, expiresIn: 300 }
```

**Backend processing:**
1. Generate 6-digit numeric OTP
2. Hash OTP with SHA-256
3. Store hashed OTP in Redis with key `otp:{phone}` and TTL of 5 minutes (300 seconds)
4. Send OTP via Gupshup WhatsApp API (primary) or Gupshup SMS / MSG91 (fallback)
5. WhatsApp message format: "Your Onlyou verification code is: 482917. This code expires in 5 minutes. Do not share this code with anyone."

**Rate limiting:**
- Maximum 3 OTP requests per phone number per 15 minutes
- After 3 attempts: "Too many attempts. Please try again in 15 minutes."
- Resend cooldown: 30 seconds between requests (button disabled with countdown)

**Step 2: OTP entry screen**

```
┌──────────────────────────────────┐
│  Enter 6-digit OTP               │
│                                  │
│  Sent to +91 •••••• 4567        │
│  via WhatsApp                    │
│                                  │
│  [_ _ _ _ _ _]                  │
│                                  │
│  Didn't receive?                 │
│  [Resend] (30s countdown)        │
│  [Try SMS instead]               │
└──────────────────────────────────┘
```

**Phone masking:** `+91 •••••• 4567` — last 4 digits visible, 6 dots masking first 6 digits

**Auto-submit:** OTP input auto-submits when all 6 digits are entered (no "Verify" button needed)

**Step 3: OTP verification**

```
API: trpc.auth.verifyOtp.mutate({
  phone: '+919876504567',
  otp: '482917'
})
→ Returns: { accessToken, refreshToken, user: { id, role: 'doctor', name, nmcNumber } }
→ Server sets HttpOnly cookies with both tokens
```

**Backend processing:**
1. Retrieve hashed OTP from Redis for this phone number
2. Hash submitted OTP and compare
3. If match: delete OTP from Redis (single-use)
4. Look up User by phone number
5. Verify user exists AND has role `DOCTOR` AND status is `ACTIVE`
6. Generate JWT access token (15-minute expiry) and refresh token (30-day expiry)
7. Store refresh token hash in PostgreSQL (for rotation/revocation tracking)
8. Set HttpOnly cookies: `accessToken` and `refreshToken`
9. Audit log: `{ action: 'LOGIN', userId, timestamp, ip, userAgent }`
10. Return user profile data

### 3.4 First-Time Redirect

After first successful login, the system checks if the doctor has completed their profile review:

```
if (user.doctorProfile.onboardingComplete === false) {
  redirect('/settings');  // First-time → settings page to review profile
} else {
  redirect('/');          // Returning → case queue
}
```

**On the Settings page (first-time):**
- Doctor sees pre-filled profile information (name, NMC number, phone, city, specializations)
- Doctor reviews and confirms all details are correct
- Doctor sets their availability schedule (defaults provided: Mon-Fri 09:00-18:00)
- Doctor configures notification preferences (defaults: push + WhatsApp for new cases and SLA warnings)
- Doctor clicks `[Confirm Profile]` → `onboardingComplete` set to `true` → redirect to case queue

### 3.5 First-Time Login Edge Cases

| Scenario | System Behavior |
|----------|----------------|
| Doctor enters phone number that was never provisioned | OTP IS still sent (to prevent phone enumeration attacks). After OTP verification, server returns 403: "This phone number is not registered as a doctor account. Contact your administrator." Patient sees: "Account not found. If you believe this is an error, please contact the Onlyou team." |
| Doctor enters wrong OTP | "Invalid verification code. Please try again." OTP input clears. 3 invalid attempts → OTP invalidated, new OTP must be requested. |
| OTP expires (5 minutes) | "This code has expired. Please request a new one." `[Resend OTP]` button becomes active. |
| WhatsApp delivery fails | OTP sent but WhatsApp API returns error → fallback to SMS automatically. Doctor sees: "We couldn't reach you on WhatsApp. Sending via SMS instead." |
| Both WhatsApp and SMS fail | "Unable to send verification code. Please check your phone number and try again." Backend logs the failure for admin investigation. |
| Doctor's phone has no WhatsApp | Doctor uses "Send OTP via SMS" option directly. No fallback needed. |
| Doctor uses the wrong phone (personal vs. registered) | OTP sent to wrong phone → doctor doesn't receive it → can retry with correct number. If they verify the wrong number, they'll get the "not registered" error after OTP. |
| Doctor's account was deactivated between OTP send and verify | OTP verifies but login check fails: "Your account has been deactivated. Contact your administrator." |
| Browser blocks cookies | Auth fails silently (cookies not set) → next API call returns 401 → "Unable to complete sign-in. Please ensure cookies are enabled in your browser settings." |

---

## 4. Returning Doctor Sign-In

### 4.1 Automatic Session Restoration

When a doctor who has previously logged in visits `doctor.onlyou.life`:

1. Browser sends existing HttpOnly cookies automatically
2. Next.js middleware checks access token validity:
   - **Valid access token:** Proceed to requested page (case queue by default)
   - **Expired access token, valid refresh token:** Silent token refresh → new token pair issued → proceed
   - **Both expired:** Redirect to `/login` with toast: "Your session has expired. Please sign in again."
3. No manual action required if tokens are valid — doctor lands directly on case queue

### 4.2 Multi-Tab Behavior

- All browser tabs share the same cookies (browser-level cookie storage)
- Token refresh in one tab applies to all tabs (next request from any tab uses new token)
- If doctor logs out in one tab → cookies cleared → all tabs redirect to login on next API call

### 4.3 Multi-Device Behavior

- Each device has its own independent token pair
- Logging in on Device B does NOT invalidate Device A's tokens
- Doctor can be logged in on laptop AND mobile simultaneously
- Each device's refresh token is independently tracked in PostgreSQL

### 4.4 Explicit Logout

**Doctor clicks "Logout" in sidebar:**

```
API: trpc.auth.logout.mutate()
```

**Backend actions:**
1. Revoke the current refresh token in PostgreSQL (mark as `revoked: true`)
2. Clear both HttpOnly cookies (set empty values with `maxAge: 0`)
3. Audit log: `{ action: 'LOGOUT', userId, timestamp }`
4. Redirect to `/login`
5. Show toast: "You've been signed out."

### 4.5 Returning Login Edge Cases

| Scenario | System Behavior |
|----------|----------------|
| Doctor closes browser and reopens next day | Cookies persist (30-day refresh token). Silent token refresh on first request. Doctor resumes at case queue. |
| Doctor clears browser cookies/data | All tokens lost → redirected to login → must re-authenticate with OTP. |
| Doctor's account is deactivated while they're logged in | Next API call returns 403 → redirect to login → "Your account has been deactivated. Contact your administrator." |
| Doctor's account is suspended mid-session | Same as deactivation — 403 on next API call. |
| Old refresh token is reused after rotation (potential theft) | Theft detection triggers: ALL tokens for this doctor are revoked → all devices/sessions invalidated → "Security alert: Your session has been terminated. Please sign in again." |
| Network goes offline while doctor is working | Portal remains functional with stale data (cached by TanStack Query). When network returns, pending requests auto-retry. If token expired during offline period → re-auth required on reconnect. |

---

## 5. Token Strategy & Session Management

### 5.1 Token Architecture

| Token | Storage | Expiry | Purpose |
|-------|---------|--------|---------|
| Access Token (JWT) | HttpOnly cookie | 15 minutes | Authenticates every API request. Short-lived for security. |
| Refresh Token | HttpOnly cookie | 30 days | Used to obtain new access tokens without re-login. Longer than patient (7 days) because doctors need persistent sessions for workflow continuity. |

**Why HttpOnly cookies (not localStorage/Bearer tokens):**
- Web portals use cookies → immune to XSS token theft (JavaScript cannot read HttpOnly cookies)
- Mobile app (patient) uses Bearer tokens stored in `expo-secure-store` → different security model
- Both share the same JWT payload structure

### 5.2 Cookie Security Flags

| Flag | Value | Purpose |
|------|-------|---------|
| `HttpOnly` | true | JavaScript cannot read the token (prevents XSS theft) |
| `Secure` | true | Only sent over HTTPS (prevents network interception) |
| `SameSite` | Strict | Not sent on cross-site requests (CSRF protection) |
| `Path` | / | Available to all portal routes |

### 5.3 JWT Payload

```json
{
  "sub": "doctor_uuid_here",
  "role": "doctor",
  "name": "Dr. Rajesh Patel",
  "nmcNumber": "NMC-2019-12345",
  "iat": 1709000000,
  "exp": 1709000900,
  "jti": "unique-token-id-for-revocation"
}
```

**Fields explained:**
- `sub`: Doctor's UUID (primary key in User table)
- `role`: Always "doctor" — used by CASL.js for permission checks
- `name`: Display name (embedded in JWT so portal can show it without an API call)
- `nmcNumber`: Embedded for quick reference (used in prescription PDF generation)
- `iat`: Issued-at timestamp
- `exp`: Expiration timestamp (15 minutes from `iat`)
- `jti`: Unique token ID (for individual token revocation)

### 5.4 Token Refresh Flow (Detailed)

```
1. Doctor makes API call (e.g., loading case queue)
2. tRPC client interceptor detects 401 Unauthorized response
3. Interceptor pauses ALL pending requests (queue them)
4. Sends refresh request:
   → trpc.auth.refreshToken.mutate()
   → Refresh token sent automatically via cookie
5. Server validates refresh token:
   a. Extract token from cookie
   b. Verify JWT signature
   c. Hash token and compare against PostgreSQL stored hash
   d. Check expiry (30 days from issue)
   e. Check if token has been revoked (theft detection)
6. If valid:
   a. Generate new access token (15 min) + new refresh token (30 days)
   b. Mark OLD refresh token as used in PostgreSQL (rotation tracking)
   c. Store NEW refresh token hash in PostgreSQL
   d. Set new HttpOnly cookies (replacing old ones)
   e. Release queued requests → all retry with new access token
7. If invalid:
   a. Clear all cookies (empty values, maxAge: 0)
   b. Redirect to /login
   c. Show toast: "Your session has expired. Please sign in again."
```

**Theft detection mechanism:**
- When a refresh token is used, it's marked as "rotated" (old token ID stored)
- If the OLD (already-rotated) token is ever used again → indicates token theft
- Response: ALL refresh tokens for this doctor are revoked immediately
- All devices/sessions terminated → doctor must re-authenticate on all devices
- Audit log: `{ action: 'TOKEN_THEFT_DETECTED', userId, ip, userAgent, timestamp }`

### 5.5 Idle Timeout

| Condition | Timer | Action |
|-----------|-------|--------|
| No API activity for 4 hours | Idle timer (tracked client-side) | Next user interaction triggers re-auth prompt: "You've been idle. Please verify to continue." → Quick OTP verification. |
| Access token expires (15 min) with activity | Auto-refresh | Silent token refresh via interceptor — doctor doesn't notice. |
| Refresh token expires (30 days) | Session end | Full redirect to login. |

### 5.6 Session Security Summary

| Measure | Implementation |
|---------|---------------|
| Token storage | HttpOnly cookies (not accessible via JS) |
| CSRF protection | SameSite=Strict cookies |
| Transport security | Secure flag (HTTPS only) |
| Token rotation | Every refresh generates new token pair |
| Theft detection | Reuse of old refresh token → all tokens revoked |
| Idle timeout | 4 hours of no API activity → re-auth prompt |
| IP logging | Login IP recorded in audit log (not enforced for restriction — doctors may use VPN) |
| Rate limiting | 3 OTP requests per phone per 15 minutes |

---

## 6. Portal Navigation & Layout

### 6.1 Desktop Layout (≥1024px)

The doctor portal uses a persistent sidebar navigation with a main content area:

```
┌──────────┬───────────────────────────────────────────────┐
│          │                                               │
│  SIDEBAR │              MAIN CONTENT                     │
│  (240px) │              (remaining width)                │
│          │                                               │
│  [Logo]  │                                               │
│          │                                               │
│  📋 Cases│  ← Active page highlighted with left border   │
│  (badge) │    accent + background shade                  │
│          │                                               │
│  👥 Patients                                             │
│          │                                               │
│  📊 Stats│                                               │
│          │                                               │
│  ─────── │                                               │
│          │                                               │
│  ⚙️ Settings                                             │
│          │                                               │
│  ─────── │                                               │
│  🔔 (2)  │  ← Notification bell with unread count       │
│  Dr.Patel│  ← Doctor avatar (initials) + name           │
│  [Logout]│  ← NMC number shown on hover tooltip         │
│          │                                               │
└──────────┴───────────────────────────────────────────────┘
```

**Sidebar items:**

| Item | Icon | Route | Badge | Notes |
|------|------|-------|-------|-------|
| Cases | 📋 Clipboard | `/` | Red badge: count of `NEW + IN_REVIEW` cases | Default landing page |
| Patients | 👥 People | `/patients` | — | Doctor's patient directory |
| Stats | 📊 Chart | `/stats` | — | Personal performance metrics |
| Settings | ⚙️ Gear | `/settings` | — | Profile, availability, notifications, canned messages |

**Sidebar behavior:**
- Collapsible: toggle button shrinks sidebar to 64px (icon-only mode)
- Collapsed state persisted in `localStorage`
- Active route: left border accent + background shade
- Badge on "Cases" updates in real-time via SSE (new case → badge increments)
- Notification bell in sidebar: shows unread count, clicking opens dropdown

### 6.2 Mobile Layout (<1024px)

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

**Top bar:** Hamburger menu (☰) → slide-out drawer | Portal title | Notification bell | Doctor name dropdown (profile, logout)

**Bottom navigation:** 4 tabs: Cases | Patients | Stats | Settings. Cases tab shows badge count.

### 6.3 Tablet Layout (768–1023px)

Hybrid approach:
- Sidebar collapses to icon-only mode (64px) permanently
- Case review uses 2-panel layout (left+center combined, right panel as bottom sheet)
- Bottom navigation visible

### 6.4 Responsive Breakpoints

| Breakpoint | Layout | Primary UI Pattern |
|------------|--------|--------------------|
| ≥1440px | Wide desktop | 3-panel case review, expanded sidebar |
| 1024–1439px | Desktop | 3-panel (narrower right panel), collapsible sidebar |
| 768–1023px | Tablet | 2-panel case review (left+center, right as bottom sheet), bottom nav |
| <768px | Mobile | Single column, bottom nav, modals for all panels |

### 6.5 Notification Bell

**Visible in:** Desktop sidebar (top area) and mobile top bar.

**Bell icon states:**
- Default: outline bell icon
- Unread notifications: solid bell icon + red dot with count (e.g., "3")

**Notification dropdown (desktop) / full-screen panel (mobile):**
- List of recent notifications, newest first (max 20)
- Each entry: icon + title + body + timestamp + read/unread indicator
- "Mark all as read" link at top

**Notification types and their actions:**

| Event | Notification Text | Action on Tap |
|-------|-------------------|---------------|
| New case assigned | "New Hair Loss case assigned — Rahul M., 28M" | Opens `/case/[id]` |
| Patient responded to info request | "Patient responded — Sneha K. (PCOS)" | Opens `/case/[id]` → Messages tab |
| Lab results ready | "Lab results ready — Amit S. (ED)" | Opens `/case/[id]` → Lab Results tab |
| New message from patient | "New message from Priya R. (Weight)" | Opens `/case/[id]` → Messages tab |
| Follow-up due | "Follow-up due — Vikram N. (Hair Loss) — 3-month review" | Opens `/case/[id]` |
| SLA warning | "⚠️ Case review overdue — 22 hours — Meera J. (PCOS)" | Opens `/case/[id]` |

---

## 7. Case Queue — The Doctor's Inbox

### 7.1 Overview

**Route:** `/` (root — default landing page)
**Purpose:** The doctor's primary working screen — a prioritized list of all cases assigned to them or awaiting their review.

The case queue is analogous to an email inbox — the doctor's starting point every session. All cases that need attention appear here, sorted and filtered for efficient triage.

### 7.2 How Cases Arrive in the Queue

A case appears in a doctor's queue through this pipeline:

```
Patient Journey:
1. Patient downloads app, creates account
2. Patient starts assessment for a condition (e.g., Hair Loss)
3. Patient completes condition-specific questionnaire (25-32 questions)
4. Patient uploads photos (if required for the vertical)
5. Patient selects subscription plan and pays via Razorpay
6. System creates Consultation record with status: SUBMITTED

Backend Processing:
7. BullMQ queues AI pre-assessment job
8. Claude API processes questionnaire + photos → generates structured assessment
9. AI assessment stored → consultation status: AI_COMPLETE
10. Case appears in the case queue for eligible doctors

Assignment:
11a. Auto-assignment: system assigns to first available doctor with matching vertical
11b. Manual assignment: admin assigns to specific doctor via admin portal
12. Doctor notification sent (push + WhatsApp per preferences)
13. Case visible in doctor's queue with status badge and attention level
```

**Key timing:**
- AI assessment takes 1–3 minutes (BullMQ job with Claude API call)
- Doctor is notified within seconds of assignment
- SLA clock starts at `AI_COMPLETE` → doctor should review within 24 hours

### 7.3 Queue Layout

**Desktop (table view):**

| Column | Content | Width |
|--------|---------|-------|
| Patient | Name, age, sex, city | 20% |
| Condition | Color-coded badge (Purple=Hair Loss, Blue=ED, Teal=PE, Orange=Weight, Pink=PCOS) | 10% |
| Attention | 🟢 Low / 🟡 Medium / 🔴 High / ⛔ Critical | 8% |
| Status | Status badge (New, In Review, Awaiting Patient, etc.) | 12% |
| AI Summary | 1-line snippet (truncated) | 30% |
| Waiting | Time since submission (e.g., "2h 15m", "1d 4h") | 10% |
| Actions | Quick action icons | 10% |

**Mobile (card view):**

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

### 7.4 AI Attention Level System

The AI assessment engine assigns an attention level to each case, driving sort order and visual urgency:

| Level | Badge | Color | Meaning | Examples |
|-------|-------|-------|---------|----------|
| Low | 🟢 Low | Green | Standard case, no red flags | Typical pattern, no contraindications |
| Medium | 🟡 Medium | Amber | Some factors need attention | Mild drug interactions, moderate symptoms |
| High | 🔴 High | Red | Significant clinical concern | Multiple contraindications, severe symptoms |
| Critical | ⛔ Critical | Dark red | Immediate review required | Cardiovascular risk + ED meds, suicidal ideation, chest pain |

**Visual treatment:**
- Critical cases: queue row has subtle red left-border accent
- AI processing pending: "⏳ AI Processing" badge (gray)
- AI assessment failed: "⚠️ AI Failed" badge (amber)

### 7.5 Filter System

**Condition filters (horizontal scrollable chips):**

| Chip | Color | Filters to |
|------|-------|-----------|
| All | Gray (default active) | All conditions |
| Hair Loss | Purple | `condition = 'HAIR_LOSS'` |
| ED | Blue | `condition = 'ED'` |
| PE | Teal | `condition = 'PE'` |
| Weight | Orange | `condition = 'WEIGHT'` |
| PCOS | Pink | `condition = 'PCOS'` |

**Status filters:**

| Status | Meaning | Maps to Consultation Status |
|--------|---------|---------------------------|
| New | Not yet opened by doctor | `SUBMITTED` or `AI_COMPLETE` |
| In Review | Doctor has opened but not actioned | `ASSIGNED` or `REVIEWING` |
| Awaiting Patient | Doctor asked for more info, waiting | `INFO_REQUESTED` |
| Lab Results Ready | Lab results uploaded for this consultation | Lab order with `RESULTS_READY` or `RESULTS_UPLOADED` |
| Follow-Up Due | Follow-up check-in is due | `FOLLOW_UP_DUE` |
| Completed | Fully actioned | `PRESCRIPTION_CREATED` or `COMPLETED` |
| Referred | Doctor referred to specialist | `REFERRED` |

**Filter behavior:**
- Tap to toggle active/inactive
- Active chip: filled background with condition color
- Inactive chip: outline only
- "All" deactivates all other condition filters
- Badge count on each status chip (e.g., "New (7)")
- Multiple chips active simultaneously (AND between groups, OR within same group)
- Filter state stored in Zustand `caseQueueStore` — survives page navigation but not browser close

### 7.6 Sort Options

| Sort | Description | Default |
|------|-------------|---------|
| Newest first | By `createdAt` descending | ✅ Default |
| Oldest first | By `createdAt` ascending | |
| Highest attention | By AI attention level (Critical → High → Medium → Low) | |
| Longest waiting | By time since last status change (most stale first) | |

### 7.7 Search

**Position:** Above filter chips (desktop) / below top bar (mobile)
**Placeholder:** "Search by patient name, phone, or case ID..."

**Behavior:**
- Debounced (300ms) — doesn't fire on every keystroke
- Searches: patient `firstName`, `lastName`, phone (last 4 digits), consultation UUID
- Results filter the current queue view in real-time
- Minimum 2 characters to trigger search
- Clear button (✕) resets to full queue
- **Privacy:** Search queries are NOT logged in analytics (only query length, to prevent PII leakage)

**API call:**
```
trpc.doctor.cases.list.query({
  search: 'Rahul',
  conditions: ['HAIR_LOSS'],
  statuses: ['SUBMITTED', 'AI_COMPLETE'],
  sort: 'newest',
  cursor: null,
  limit: 20
})
```

### 7.8 Pagination

- **Cursor-based pagination** (not offset-based) — better performance with large datasets
- 20 cases per page
- Desktop: "Load more" button at bottom of list
- Mobile: infinite scroll
- When new case arrives via SSE → toast at top: "New case: [Patient Name] — [Condition]" with `[View]` button
- New case does NOT auto-insert into current view (avoids disruptive jumps) — doctor clicks "View" or refreshes

### 7.9 Empty States

| Scenario | Message |
|----------|---------|
| No cases at all (new doctor) | "No cases assigned yet. Cases will appear here as patients submit consultations." |
| No cases matching current filters | "No cases match your filters. Try adjusting your filters or clearing the search." |
| All cases completed | "All caught up! No pending cases." + subtle celebration illustration |

### 7.10 Quick Actions from Queue

**Without opening full case review:**

| Action | Desktop | Mobile |
|--------|---------|--------|
| Open case review | Click/tap row → navigates to `/case/[id]` | Tap card |
| Quick-assign to self | Right-click → "Quick-assign to me" | Swipe left → "Assign to me" button |
| Open in new tab | Right-click → "Open in new tab" | Long-press → "Open in new tab" |

---

## 8. Case Assignment & Auto-Assignment

### 8.1 Assignment Mechanisms

Cases reach a doctor through two paths:

**Path A — Auto-Assignment (Primary):**
1. AI assessment completes → consultation status: `AI_COMPLETE`
2. System runs assignment algorithm:
   - Filter doctors by: matching specialization for this vertical AND status `ACTIVE` AND currently within availability schedule
   - Sort eligible doctors by: lowest current caseload (fewest `ASSIGNED` + `REVIEWING` cases)
   - Assign to top doctor → `Consultation.doctorId` set → status: `ASSIGNED`
3. Doctor notified via push + WhatsApp (per preferences)

**Path B — Manual Assignment (Admin Override):**
1. Admin navigates to Consultation Oversight in admin portal
2. Admin selects unassigned or reassignable case
3. Admin picks a doctor from the eligible pool
4. Assigns via: `trpc.admin.consultation.assignDoctor.mutate({ consultationId, doctorId })`
5. Doctor notified

### 8.2 Auto-Assignment on Case Open

When a doctor opens a case that is in `SUBMITTED` or `AI_COMPLETE` status (unassigned or assigned to no one):

1. System checks: is this case already assigned to another doctor?
   - **If unassigned:** Auto-assign to current doctor → status → `ASSIGNED` → `assignedAt` timestamp set
   - **If assigned to this doctor:** No change
   - **If assigned to another doctor:** Warning banner:

```
┌──────────────────────────────────────────────────────────┐
│  ⚠️ This case is currently assigned to Dr. Priya Sharma.  │
│                                                          │
│  [Yes, take over]       [View only (read-only)]          │
└──────────────────────────────────────────────────────────┘
```

2. If doctor takes over: reassignment logged in audit trail, original doctor notified

### 8.3 Assignment Status Transitions

| From Status | Trigger | To Status | Timestamp Set |
|-------------|---------|-----------|---------------|
| `AI_COMPLETE` | Doctor opens case | `ASSIGNED` | `assignedAt` |
| `ASSIGNED` | 30 seconds on page OR first doctor action | `REVIEWING` | `firstReviewedAt` |
| `REVIEWING` | Doctor closes browser and returns later | Stays `REVIEWING` | No change |

**The ASSIGNED → REVIEWING transition** happens automatically after 30 seconds of the doctor being on the case review page, OR when the doctor performs their first action (switches tab, sends message, opens prescription builder). This distinguishes "doctor glanced at the case" from "doctor is actively reviewing."

### 8.4 Doctor Availability & Assignment Rules

The auto-assignment engine respects:

1. **Vertical specialization:** Doctor only receives cases for verticals they're configured to handle
2. **Availability schedule:** Doctor's configured weekly schedule (e.g., Mon-Fri 09:00-18:00)
3. **Time-off periods:** Pre-scheduled unavailability blocks assignment
4. **Current caseload:** Load balancing — doctor with fewer active cases gets priority
5. **Account status:** Only `ACTIVE` doctors receive assignments

**SLA timer pausing:** If a case is assigned on Friday evening and the doctor is marked unavailable on Saturday/Sunday, the SLA timer pauses over the weekend and resumes on Monday morning.

### 8.5 Reassignment Flow (Admin-Initiated)

Admin can reassign a case when:
- Doctor is approaching SLA breach
- Doctor is on unexpected leave
- Doctor requests workload relief

**Admin action:** `trpc.admin.consultation.assignDoctor.mutate({ consultationId, newDoctorId })`

**Backend:**
1. Update `Consultation.doctorId` to new doctor
2. Notify new doctor: "Case reassigned to you — [Patient Name] — [Condition]"
3. Notify original doctor: "Case [Patient Name] has been reassigned to Dr. [New Doctor Name]"
4. Audit log: `{ action: 'CASE_REASSIGNED', oldDoctorId, newDoctorId, consultationId, adminId, reason, timestamp }`
5. SSE events to both doctors' portals

### 8.6 Assignment Edge Cases

| Scenario | System Behavior |
|----------|----------------|
| No doctors available for a vertical (all unavailable/at capacity) | Case stays in `AI_COMPLETE` → admin receives alert: "No doctors available for [vertical]. [N] cases pending assignment." Admin must either expand doctor pool or manually assign. |
| Two doctors open the same unassigned case simultaneously | Race condition handled by database transaction: first doctor to trigger the assignment gets it. Second sees: "This case was just assigned to Dr. [Name]. [View only] / [Request reassignment]" |
| Doctor assigned a case for a vertical they're no longer authorized for (admin changed specializations mid-session) | Existing assignment persists (no automatic reassignment). Doctor can still review and act on the case. New cases won't be assigned to them for that vertical. |
| Doctor is assigned 50+ cases (excessive caseload) | No hard limit in system — but admin should monitor via dashboard metrics. Potential Phase 2 enhancement: configurable max caseload per doctor with automatic overflow routing. |
| Case is submitted but AI assessment fails | Case stays in `AI_COMPLETE` with `AI_FAILED` flag. Appears in queue with "⚠️ AI Failed" badge. Doctor can still review (manually) and admin can retry AI assessment. |

---

## 9. Real-Time Queue Updates (SSE)

### 9.1 SSE Architecture

The doctor portal maintains a persistent Server-Sent Events (SSE) connection for real-time updates:

```
Doctor Browser → GET /api/sse/doctor (with JWT auth) → Server holds connection open
Server → pushes events as they occur → Browser processes via useSSE() hook
```

**Connection details:**
- Endpoint: `GET /api/sse/doctor`
- Auth: JWT from query parameter or cookie
- Heartbeat: every 30 seconds (`:keep-alive\n\n`)
- Auto-reconnect: if connection drops, client retries with exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Server-side: Redis Pub/Sub → SSE adapter → per-doctor channel (`sse:doctor:{doctorId}`)

### 9.2 Events That Affect the Case Queue

| SSE Event | Effect on Queue | Visual Indicator |
|-----------|----------------|-----------------|
| `case.assigned` | Toast notification + badge count increment | "New case: [Patient Name] — [Condition]" with `[View]` button |
| `case.patient_responded` | Case card blinks briefly + status updates | Status badge → "In Review" |
| `case.lab_results_ready` | Case card shows "Lab Ready" indicator | Blue flask icon on card |
| `case.message_received` | Blue message dot on case card | 💬 dot indicator |
| `case.reassigned_away` | Case removed from queue (if currently visible) | Toast: "Case [Patient] reassigned to Dr. [Name]" |
| `case.status_changed` | Status badge updates on affected card | Animated badge transition |

**Important design decision:** SSE events do NOT re-sort or re-filter the visible queue. They update individual cards in-place. The doctor controls their own view — no disruptive automatic reordering.

### 9.3 SSE Connection States

| State | Visual Indicator | Behavior |
|-------|-----------------|----------|
| Connected | Green dot in sidebar (subtle) | Normal operation |
| Connecting | Amber dot + "Connecting..." | Auto-retry in progress |
| Disconnected | Amber banner: "Real-time updates paused. Checking connection..." | Stale data visible, manual refresh recommended |
| Reconnected | Banner disappears, green dot returns | Silent data refresh to catch up on missed events |
| Auth expired during SSE | SSE closes, triggers token refresh | If refresh succeeds: SSE reconnects. If fails: redirect to login. |

### 9.4 SSE Reliability Safeguards

- **Missed events:** If SSE was disconnected for >60 seconds, on reconnect the client does a full data refresh (re-fetches case queue from API) to catch any events missed during the gap
- **Stale data detection:** Client timestamps every SSE event. If no event for 60+ seconds (not even heartbeat), assumes connection is dead and triggers reconnect
- **Multiple tabs:** Each tab maintains its own SSE connection. Server handles multiple concurrent connections per doctor gracefully

---

## 10. Case Queue Edge Cases & Error States

### 10.1 Page-Level Errors

| Error | UI Behavior |
|-------|------------|
| 401 Unauthorized | Silent token refresh attempt → if fails: redirect to `/login` with toast: "Session expired. Please sign in again." |
| 403 Forbidden | "You don't have permission to view this page. Contact your administrator." + `[Go to Cases]` button |
| 500 Server Error | "Something went wrong on our end. Please try again in a moment." + `[Retry]` button |
| Network Error | "Unable to connect. Please check your internet connection." + `[Retry]` button + stale data remains visible |
| Slow API response (>3s) | Skeleton loading animation visible. After 5s: "Taking longer than usual..." text appears. |

### 10.2 Queue Data Edge Cases

| Scenario | System Behavior |
|----------|----------------|
| Doctor has 0 cases ever | Empty state illustration: "No cases assigned yet." |
| Doctor has 500+ historical cases | Only active cases loaded initially. Completed/closed cases accessible via "Completed" filter. Pagination prevents memory issues. |
| New case arrives while doctor is scrolled deep in list | Toast notification at top (doesn't disrupt scroll position). Doctor can tap "View" or continue scrolling. |
| Doctor filters to a specific condition and no cases match | "No [Hair Loss] cases match your current filters." with suggestion to clear filters. |
| Two doctors are looking at the same queue simultaneously | Each sees their own assigned cases (filtered by `doctorId`). A case assigned to Doctor A doesn't appear in Doctor B's queue (unless Doctor B has "All" view and is an admin). |
| Patient deletes their account while case is in doctor's queue | Case marked with `PATIENT_DELETED` flag. Doctor sees notice: "This patient's account has been deleted per their request. Case data retained for medical records per DPDPA retention policy." Anonymized data still visible. |
| Database is down (catastrophic failure) | Full-page error: "Service temporarily unavailable. Please try again later." with `[Retry]` button. SSE also disconnects. |
| Doctor's internet is intermittent | TanStack Query serves cached data during brief outages. If offline >30 seconds: offline banner appears. Mutations (prescribe, message) are blocked until reconnected — draft preserved in local state. |

### 10.3 Concurrent Access Edge Cases

| Scenario | Behavior |
|----------|----------|
| Doctor opens case, steps away, another doctor is assigned the case by admin | On next doctor interaction: "This case has been reassigned to Dr. [Name]. [OK]" → redirects to queue |
| Doctor is viewing case while admin changes its status externally | SSE pushes status update → case card updates. If doctor is mid-action (e.g., prescribing), the action may still succeed if the server-side status check passes. If status no longer allows the action → error: "This consultation's status has changed. Please refresh and review." |
| Doctor rapidly switches between multiple cases | Each case navigates to `/case/[id]` → fresh data load per case. Previous case's state is cached by TanStack Query (stale-while-revalidate). |

### 10.4 SLA Indicators in Queue

Cases in the queue show SLA status indicators:

| SLA State | Visual | Meaning |
|-----------|--------|---------|
| 🟢 Green | Within SLA | Plenty of time remaining |
| 🟡 Amber | Within 2 hours of SLA breach | Getting close — doctor should prioritize |
| 🔴 Red | SLA breached | Overdue — admin may be notified, case may be reassigned |

**SLA thresholds (configurable by admin):**

| SLA Rule | Default Threshold | Escalation |
|----------|-------------------|------------|
| First review (AI_COMPLETE → ASSIGNED) | 24 hours | Notification to doctor + admin |
| Case action (ASSIGNED → no action taken) | 48 hours | Notification to doctor + admin; admin may reassign |
| Info response review (patient responded) | 72 hours | Notification to doctor |
| Lab results review (results uploaded) | 24 hours | Notification to doctor + admin |

SLA checks run every 15 minutes via BullMQ `sla-check` repeatable job.

---

*End of WORKFLOW-DOCTOR-PART1.md — Continue to Part 2 for Clinical Workflows (Case Review, Prescriptions, Lab Orders, Referrals, Messaging, Follow-ups)*
