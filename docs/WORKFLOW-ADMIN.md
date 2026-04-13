# WORKFLOW-ADMIN.md — Admin/Coordinator Complete Workflow Reference

## The Operational Nerve Centre: Account Setup, Daily Operations, Pipeline Management, Partner Coordination, SLA Enforcement & System Configuration

> **Document type:** Detailed workflow documentation (every screen, action, decision, error, and edge case)
> **Perspective:** Admin / Coordinator / Operations Manager
> **Version:** 1.0
> **Last updated:** March 2026
> **Cross-references:** PROJECT-OVERVIEW.md, APP-PATIENT.md, PORTAL-ADMIN.md, PORTAL-DOCTOR.md, PORTAL-NURSE-FIXED.md, PORTAL-LAB-FIXED.md, PORTAL-PHARMACY.md, LANDING-PAGE.md, ARCHITECTURE.md, BACKEND-PART1.md, BACKEND-PART2A.md, BACKEND-PART2B.md, BACKEND-PART3A.md, BACKEND-PART3B.md, VERTICAL-HAIR-LOSS.md, VERTICAL-ED.md, VERTICAL-PE.md, VERTICAL-WEIGHT.md, VERTICAL-PCOS-PART1.md, VERTICAL-PCOS-PART2.md, VERTICAL-PCOS-PART3.md, WORKFLOW-PATIENT.md, WORKFLOW-DOCTOR-PART1.md, WORKFLOW-DOCTOR-PART2.md, WORKFLOW-DOCTOR-PART3.md, WORKFLOW-NURSE-PART1.md, WORKFLOW-NURSE-PART2.md, WORKFLOW-NURSE-PART3.md, WORKFLOW-LAB.md, WORKFLOW-PHARMACY.md, WORKFLOW-DELIVERY.md, onlyou-spec-resolved-v4.md, REMAINING-DOCS-CHANGES.md, BACKEND-ALL-CHANGES.md

---

## Table of Contents

### Part 1: Foundation — Role, Authentication & Navigation
1. [Admin Role Overview & Context](#1-admin-role-overview--context)
2. [Account Provisioning (System-Seeded)](#2-account-provisioning-system-seeded)
3. [Login & OTP Authentication](#3-login--otp-authentication)
4. [Token Strategy & Session Management](#4-token-strategy--session-management)
5. [Portal Navigation & Layout](#5-portal-navigation--layout)
6. [Overview Dashboard — The Nerve Centre](#6-overview-dashboard--the-nerve-centre)
7. [Activity Feed — Real-Time Operations Pulse](#7-activity-feed--real-time-operations-pulse)

### Part 2: Core Operational Workflows — Lab Orders & Deliveries
8. [Lab Orders Pipeline — End-to-End Management](#8-lab-orders-pipeline--end-to-end-management)
9. [Nurse Assignment Workflow](#9-nurse-assignment-workflow)
10. [Lab (Diagnostic Centre) Assignment Workflow](#10-lab-diagnostic-centre-assignment-workflow)
11. [Recollection Order Workflow](#11-recollection-order-workflow)
12. [Deliveries Pipeline — End-to-End Management](#12-deliveries-pipeline--end-to-end-management)
13. [Send to Pharmacy Workflow](#13-send-to-pharmacy-workflow)
14. [Arrange Delivery Workflow](#14-arrange-delivery-workflow)
15. [Delivery Manual Override](#15-delivery-manual-override)
16. [Auto-Reorder Management](#16-auto-reorder-management)

### Part 3: Oversight & Financial Workflows
17. [Consultation Oversight (Non-Clinical)](#17-consultation-oversight-non-clinical)
18. [Awaiting Payment Management (Pay-After-Doctor)](#18-awaiting-payment-management-pay-after-doctor)
19. [Refund Approval Workflow](#19-refund-approval-workflow)
20. [Financial Dashboard Workflow](#20-financial-dashboard-workflow)

### Part 4: Onboarding, Partner & User Management
20A. [Onboarding Overview — Who the Admin Onboards](#20a-onboarding-overview--who-the-admin-onboards)
20B. [Doctor Account Onboarding](#20b-doctor-account-onboarding)
21. [Partner Management — Nurses](#21-partner-management--nurses)
22. [Partner Management — Diagnostic Centres](#22-partner-management--diagnostic-centres)
23. [Partner Management — Pharmacies](#23-partner-management--pharmacies)
24. [Partner Management — Referral Clinics](#24-partner-management--referral-clinics)
25. [User Management & Account Lifecycle](#25-user-management--account-lifecycle)

### Part 5: System Configuration
26. [Subscription Plan Pricing Management](#26-subscription-plan-pricing-management)
27. [Notification Template Management](#27-notification-template-management)
28. [Questionnaire Schema Viewer](#28-questionnaire-schema-viewer)
29. [Feature Flag Management](#29-feature-flag-management)
30. [SLA Configuration & Threshold Management](#30-sla-configuration--threshold-management)
31. [Audit Log Workflow](#31-audit-log-workflow)

### Part 6: System Integration & Cross-Portal
32. [SLA Engine & Escalation System](#32-sla-engine--escalation-system)
33. [Real-Time System — SSE Architecture (Admin)](#33-real-time-system--sse-architecture-admin)
34. [Notification System — Admin Experience](#34-notification-system--admin-experience)
35. [Daily Digest & Reporting](#35-daily-digest--reporting)

### Part 7: Privacy, Security & Edge Cases
36. [Privacy & Data Access Boundaries](#36-privacy--data-access-boundaries)
37. [Security, Audit & CASL Permissions](#37-security-audit--casl-permissions)
38. [Error States & Edge Cases](#38-error-states--edge-cases)
39. [Desktop vs Mobile Workflow Differences](#39-desktop-vs-mobile-workflow-differences)

### Part 8: Reference
40. [Cross-Portal Integration Map](#40-cross-portal-integration-map)
41. [Phase 2 — Scaffolded Workflows (Muted)](#41-phase-2--scaffolded-workflows-muted)
42. [Known Issues & Fixes from Verification Reports](#42-known-issues--fixes-from-verification-reports)
43. [Cross-Reference Index](#43-cross-reference-index)

---

## 1. Admin Role Overview & Context

### 1.1 Who Is the Admin in Onlyou?

The admin (also called the "coordinator") is the operational hub of the Onlyou platform. For MVP, the admin is the founder — a single person managing the entire care delivery chain from their phone and occasionally from a desktop. The admin does NOT perform any clinical work; their role is purely operational: triaging, assigning, coordinating, monitoring, configuring, and escalating.

The admin is the only human role with visibility across ALL system components simultaneously. Doctors see their own cases; nurses see their own visits; labs see their own samples; pharmacies see their own orders. The admin sees everything.

**Key characteristics:**

- Single person for MVP (founder), expandable to a small ops team in Phase 2
- Primary device is mobile phone (manages operations on the go throughout the day)
- Secondary device is desktop/laptop (for deep-dive analysis, charts, bulk actions, and system configuration)
- Uses a Next.js 14 PWA at `admin.onlyou.life` — installable on home screen
- Has FULL read access to patient personal data (name, phone, address) — necessary for coordination tasks like calling patients about delivery
- Has READ-ONLY access to clinical data (questionnaire, AI assessment, photos) — only when explicitly opening a consultation detail (audit-logged)
- CANNOT create/modify prescriptions, AI assessments, or questionnaire responses
- CANNOT delete any records (DPDPA compliance — soft delete only)
- CAN manage all partner accounts (nurses, labs, pharmacies, clinics)
- CAN configure system settings (pricing, SLAs, feature flags, notification templates)
- CAN approve/reject refunds
- Is the escalation endpoint for ALL SLA breaches across all pipelines

*(Source: PORTAL-ADMIN.md §1, §38; ARCHITECTURE.md; BACKEND-PART3A.md §22.4)*

### 1.2 Interaction Touchpoints with Other Roles

| Role | How Admin Interacts | Direction |
|------|---------------------|-----------|
| Patient | Monitors consultations, manages deliveries, sends reminders, handles refunds, calls patient for delivery coordination. **Does NOT onboard patients** — they self-register via mobile app. | Admin → Patient (operational) |
| Doctor | **Onboards doctor accounts** (creates User + DoctorProfile via Settings → User Management → [+ Add User]), assigns cases (or oversees auto-assign), monitors SLA compliance, sends reminders, reassigns stale cases, approves doctor-initiated refunds | Admin ↔ Doctor (operational) |
| Nurse | **Onboards nurse accounts** (creates User + Nurse profile via Partners → Nurses → [+ Add Nurse]), assigns to lab orders, monitors visit progress, handles failed visits, manages nurse profiles and capacity | Admin → Nurse (operational) |
| Lab | **Onboards lab accounts** (creates DiagnosticCentre + User via Partners → Labs → [+ Add Lab]), assigns lab orders to centres, monitors result turnaround, handles recollections, manages lab profiles | Admin → Lab (operational) |
| Pharmacy | **Onboards pharmacy accounts** (creates Pharmacy + User via Partners → Pharmacies → [+ Add Pharmacy]), sends prescriptions to pharmacy, monitors preparation, handles stock issues, manages pharmacy profiles | Admin → Pharmacy (operational) |
| Referral Clinic | **Onboards clinic records** (Partners → Clinics → [+ Add Clinic]), no portal login — receives referral notifications via email/WhatsApp | Admin → Clinic (referral) |
| Delivery Person | **No onboarding — ad-hoc per delivery.** Arranges delivery by entering name/phone, sends SMS link, monitors delivery status, handles failed deliveries, performs manual overrides. No account created. | Admin → Delivery Person (coordination) |
| System (BullMQ/SLA) | Receives all SLA breach alerts, configures thresholds, monitors compliance metrics | System → Admin (alerts) |
| Razorpay | Monitors payments, processes refunds, tracks revenue, handles payment failures | Admin ↔ Payment System (financial) |

### 1.3 Admin Capabilities — MVP vs. Phase 2

**MVP (Active — Phase 1):**

- **Account onboarding:** Doctor account creation (User + DoctorProfile with NMC verification, specialisation assignment)
- **Partner onboarding:** Nurses, diagnostic centres, pharmacies, referral clinics (creates portal login accounts)
- Full lab order pipeline management (assign nurse, assign lab, handle recollections)
- Full delivery pipeline management (send to pharmacy, arrange delivery, manual override)
- User management (view all roles, activate/deactivate, edit doctor profiles)
- Consultation oversight (view-only, reassign doctor, send reminders)
- Refund approval/rejection
- Awaiting payment monitoring (pay-after-doctor flow)
- System configuration (pricing, SLAs, feature flags, notification templates)
- Financial dashboard (revenue, payments, refunds)
- Audit log viewing
- Real-time activity feed via SSE
- Daily digest email
- SLA breach alerting across all channels

**Phase 2 (Scaffolded — Muted in UI):**

- Multi-admin team with sub-roles (ops manager, finance, partner manager)
- Automated nurse assignment via proximity + availability algorithm
- Pharmacy auto-assignment based on stock + proximity
- Video consultation management
- Questionnaire builder (runtime editing with AI pipeline updates)
- Advanced analytics dashboards
- Partner performance scoring and automated deactivation
- Bulk import/export for partners
- Delivery tracking integration (Rapido/Dunzo API)

### 1.4 A Typical Day for the Admin/Coordinator

Understanding the admin's daily rhythm is critical for prioritising the workflow design:

**Morning (8:00–9:00 AM):**
1. Opens portal on phone → checks Overview dashboard
2. Reviews overnight activity feed: new consultations, completed deliveries, any SLA breaches
3. Reads daily digest email (sent at 9 AM IST)
4. Checks "Needs Assignment" count on Lab Orders tab badge
5. Assigns nurses to any new lab orders that came in overnight
6. Checks "New" count on Deliveries tab badge
7. Sends any new prescriptions to appropriate pharmacies

**Mid-morning (10:00 AM–12:00 PM):**
8. Monitors nurse visits in progress (SSE real-time updates)
9. Handles any failed visits (patient unavailable, nurse running late)
10. Checks pharmacy preparation status for orders sent earlier
11. Arranges deliveries for orders marked "Ready" by pharmacies
12. Reviews and approves any pending refund requests

**Afternoon (1:00–4:00 PM):**
13. Monitors delivery confirmations (OTP verified)
14. Handles any delivery failures or pharmacy stock issues
15. Checks SLA compliance — addresses amber/red warnings
16. Reviews awaiting payment cases — sends reminders to patients approaching expiry
17. Handles any recollection needs flagged by labs

**Evening (5:00–7:00 PM):**
18. Final check of all pipeline statuses
19. Ensures no SLA breaches are unaddressed
20. Reviews next day's auto-reorders — pauses any that need attention
21. Quick financial dashboard check (today's revenue)

**Intermittent (throughout the day):**
- SSE push notifications for critical events (SLA breaches, delivery failures, stock issues)
- WhatsApp alerts for items requiring immediate attention
- Quick phone calls to patients, delivery persons, pharmacies as needed

*(Source: PORTAL-ADMIN.md §4–5, §33–35)*

---

## 2. Account Provisioning (System-Seeded)

### 2.1 How the Admin Account Is Created

Admin accounts are NOT self-registered. For MVP, the sole admin account (the founder) is seeded directly into the database during initial deployment.

**Provisioning steps:**

1. During deployment, a seed script creates a `User` record with `role: ADMIN` and the founder's phone number
2. The `User` record includes: `id` (UUID), `phone` (verified format +91XXXXXXXXXX), `role: ADMIN`, `isActive: true`, `createdAt`, `updatedAt`
3. No password is set — authentication is entirely OTP-based
4. No email is required at provisioning time (can be added later in profile)

**Seed data structure:**
```
User {
  id: 'uuid-admin-001',
  phone: '+91XXXXXXXXXX',
  role: 'ADMIN',
  name: 'Founder Name',
  isActive: true,
  createdAt: deployment_timestamp
}
```

**Phase 2 expansion:** When multiple admins are needed, existing admins create new admin accounts through Settings → User Management → "Add Admin" (not available in MVP — only one admin exists).

*(Source: PORTAL-ADMIN.md §2.1; BACKEND-PART1.md §5; BACKEND-PART3A.md §25)*

### 2.2 Pre-Provisioned State

Before the admin first logs in:
- The portal at `admin.onlyou.life` shows the login screen
- No data exists in the system (empty overview, no partners, no patients)
- The admin's first task after logging in is to set up the partner network: add nurses, labs, pharmacies

---

## 3. Login & OTP Authentication

### 3.1 Login Screen

**Route:** `/login`

The admin navigates to `admin.onlyou.life` and encounters:

```
┌──────────────────────────────────────┐
│                                      │
│         🏥 Onlyou Admin              │
│                                      │
│   Enter your phone number            │
│                                      │
│   +91 ┌─────────────────────┐        │
│       │                     │        │
│       └─────────────────────┘        │
│                                      │
│   [Send OTP]                         │
│                                      │
└──────────────────────────────────────┘
```

### 3.2 OTP Flow — Step by Step

**Step 1: Enter phone number**
- Admin enters their registered phone number (Indian +91 format)
- Client-side validation: 10 digits after +91, numeric only
- Tap "Send OTP"

**Step 2: Backend OTP generation**
- API call: `POST /api/auth/request-otp` with `{ phone: '+91XXXXXXXXXX' }`
- Server generates 6-digit OTP, stores hashed in Redis with 5-minute TTL
- Rate limit: 3 OTP requests per phone per 15-minute window
- **Security:** OTP is sent even if the phone is NOT registered (prevents phone enumeration attacks)

**Step 3: OTP delivery**
- **Primary channel:** WhatsApp (via Gupshup API)
- **Fallback:** SMS (if WhatsApp delivery fails or user taps "Send via SMS" link)
- Message format: "Your Onlyou verification code is: XXXXXX. Valid for 5 minutes."

**Step 4: OTP entry screen**
```
┌──────────────────────────────────────┐
│                                      │
│         🏥 Onlyou Admin              │
│                                      │
│   Enter the 6-digit code sent to     │
│   +91 98765 XXXXX                    │
│                                      │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐   │
│   │  │ │  │ │  │ │  │ │  │ │  │   │
│   └──┘ └──┘ └──┘ └──┘ └──┘ └──┘   │
│                                      │
│   [Resend OTP] — available after 60s │
│   [Send via SMS] — if WhatsApp used  │
│                                      │
└──────────────────────────────────────┘
```

- Auto-advance: cursor moves to next box on digit entry
- Auto-submit: triggers verification when all 6 digits entered

**Step 5: Verification**
- API call: `POST /api/auth/verify-otp` with `{ phone, otp }`
- Server compares hashed OTP, checks TTL, checks attempts (max 5 wrong attempts before OTP invalidated)
- On success: server checks `User` table for matching phone with `role: ADMIN`
  - **Found + active:** Issue JWT tokens, redirect to `/` (overview dashboard)
  - **Found + inactive:** Error: "Your account has been deactivated. Please contact support."
  - **Not found:** Error: "Account not found. This portal is for authorized administrators only."
- On failure (wrong OTP): "Invalid code. Please try again." + remaining attempts shown

**Step 6: Token issuance**
- Access token (JWT, HttpOnly cookie, 15-minute expiry)
- Refresh token (opaque, HttpOnly cookie, 30-day expiry)
- Redirect to overview dashboard

### 3.3 Edge Cases — Login

| Scenario | Behavior |
|----------|----------|
| OTP expired (> 5 min) | "Code expired. Please request a new one." + auto-show "Resend OTP" |
| Max OTP attempts exceeded (5 wrong) | OTP invalidated. "Too many incorrect attempts. Please request a new code." |
| Rate limit hit (3 requests/15min) | "Too many requests. Please wait X minutes before requesting a new code." |
| Network failure during OTP request | Toast: "Connection error. Please check your internet and try again." |
| Network failure during verification | Toast: "Connection error. Your code is still valid — try again." |
| WhatsApp delivery fails | Auto-fallback to SMS after 30 seconds. User can also tap "Send via SMS" manually. |
| Browser back button during OTP entry | Returns to phone entry. OTP remains valid for its 5-minute TTL. |
| Multiple tabs open | Only one active session at a time per browser. Second tab will redirect to dashboard if already authenticated. |

*(Source: PORTAL-ADMIN.md §2.2; BACKEND-PART1.md §4; BACKEND-PART3A.md §22)*

---

## 4. Token Strategy & Session Management

### 4.1 Token Architecture

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Access token type | JWT (signed with RS256) | Stateless verification, contains role claim |
| Access token expiry | 15 minutes | Short-lived for security |
| Access token storage | HttpOnly cookie (Secure, SameSite=Strict) | Not accessible via JavaScript — XSS protection |
| Refresh token type | Opaque (random string) | Stored in database, enables revocation |
| Refresh token expiry | 30 days | Long-lived for mobile convenience |
| Refresh token storage | HttpOnly cookie (Secure, SameSite=Strict) | Not accessible via JavaScript |
| Token rotation | Every refresh generates new token pair | Prevents replay attacks |
| Theft detection | Old refresh token reuse → ALL tokens revoked | Detects token theft |

### 4.2 JWT Claims (Access Token)

```json
{
  "sub": "uuid-admin-001",
  "role": "ADMIN",
  "iat": 1709000000,
  "exp": 1709000900
}
```

The `role: ADMIN` claim is checked by the AdminGuard middleware on every tRPC procedure and API route.

### 4.3 Session Lifecycle

**Idle timeout:** 8 hours (longer than doctor's 4-hour timeout — admin checks dashboard sporadically throughout the day, and a shorter timeout would cause excessive re-authentication friction).

**Session flow:**
1. Login → tokens issued → session active
2. Every API call checks access token expiry
3. If access token expired but refresh token valid → automatic silent refresh → new token pair issued
4. If refresh token expired → redirect to `/login`
5. If idle > 8 hours → session terminated, redirect to `/login`
6. If old refresh token reused (theft detection) → ALL sessions revoked → redirect to `/login` with warning

**Concurrent sessions:** Allowed. Admin can be logged in on mobile and desktop simultaneously. Both sessions receive SSE events. Both sessions refresh independently.

### 4.4 Logout

**Trigger:** Admin taps "Logout" in sidebar (desktop) or settings menu (mobile).

**Actions:**
1. Client clears JWT cookies
2. API call: `POST /api/auth/logout` → server invalidates refresh token
3. SSE connection closed
4. Redirect to `/login`
5. Audit log entry: `{ action: 'admin.logout', adminId, timestamp }`

*(Source: PORTAL-ADMIN.md §2.3–2.4; BACKEND-PART1.md §4.4; BACKEND-PART3A.md §22.2; ARCHITECTURE.md)*

---

## 5. Portal Navigation & Layout

### 5.1 Mobile Layout (< 1024px) — Primary

The admin primarily operates on mobile. The mobile layout prioritises speed of navigation and real-time awareness.

```
┌──────────────────────────────────────┐
│  🏥 Onlyou Admin    🔔 (3)   ⚠️ (2) │
├──────────────────────────────────────┤
│                                      │
│           MAIN CONTENT               │
│           (full width)               │
│                                      │
├──────────────────────────────────────┤
│ Overview │ Lab    │ Deliver │Partners│ ⚙️  │
│    📊    │ Orders │  ies    │  🤝   │    │
│          │  🔬   │  📦    │       │    │
└──────────────────────────────────────┘
```

**Top bar elements:**
- Left: Onlyou Admin logo
- Right: Notification bell with unread count badge (red circle with number)
- Right (far): SLA breach count badge — always red, always visible when breaches > 0

**Bottom navigation — 5 tabs:**

| Tab | Icon | Route | Badge Logic |
|-----|------|-------|-------------|
| Overview | 📊 (chart bar) | `/` | None |
| Lab Orders | 🔬 (microscope) | `/lab-orders` | Red count: `NEEDS_ASSIGNMENT` + `OVERDUE` statuses |
| Deliveries | 📦 (package) | `/deliveries` | Red count: `NEW` (no pharmacy) + `ISSUES` statuses |
| Partners | 🤝 (handshake) | `/partners` | None |
| Settings | ⚙️ (gear) | `/settings` | Red dot if pending refund approvals exist |

**Active tab styling:** Filled icon + label highlighted with brand accent colour. Badges update in real-time via SSE.

### 5.2 Desktop Layout (≥ 1024px)

```
┌──────────┬───────────────────────────────────────────────┐
│          │                                               │
│  SIDEBAR │              MAIN CONTENT                     │
│  (240px) │              (remaining width)                │
│          │                                               │
│  Logo    │                                               │
│  Overview│                                               │
│  Lab     │                                               │
│  Orders  │                                               │
│  (badge) │                                               │
│  Deliver-│                                               │
│  ies     │                                               │
│  (badge) │                                               │
│  Partners│                                               │
│  ─────── │                                               │
│  Settings│                                               │
│  (dot)   │                                               │
│  ─────── │                                               │
│  Logout  │                                               │
└──────────┴───────────────────────────────────────────────┘
```

**Sidebar behavior:**
- Collapsible: click collapse button → shrinks to 64px icon-only mode
- Collapsed state persisted in `localStorage`
- Active route highlighted with left border accent + background shade
- Badges update in real-time via SSE

**Desktop-exclusive features:**
- Split-pane view on Lab Orders and Deliveries (list on left, detail on right)
- Dashboard charts on Overview (revenue trend, daily orders, SLA compliance %)
- Bulk action buttons (assign nurse to multiple orders, send batch to same pharmacy)

### 5.3 Navigation Decision Flow — How the Admin Decides Where to Go

The admin's entry point is always the Overview dashboard. From there, the decision flow is:

```
Overview Dashboard
  │
  ├─ SLA breaches > 0?
  │   └─ YES → Tap SLA breach card → opens breached item (lab order or delivery)
  │
  ├─ Lab Orders badge > 0?
  │   └─ YES → Tap Lab Orders tab → "Needs Assignment" filter → assign nurse/lab
  │
  ├─ Deliveries badge > 0?
  │   └─ YES → Tap Deliveries tab → "New" filter → send to pharmacy
  │                                → "Ready" filter → arrange delivery
  │
  ├─ Settings red dot?
  │   └─ YES → Tap Settings → refund approval needed
  │
  └─ Nothing urgent?
      └─ Scroll activity feed for awareness, check financial dashboard, manage partners
```

*(Source: PORTAL-ADMIN.md §3; ARCHITECTURE.md)*

---

## 6. Overview Dashboard — The Nerve Centre

### 6.1 What the Admin Sees on Landing

**Route:** `/` (default landing after login)

The overview dashboard is the admin's real-time operational snapshot. It answers the question: "What needs my attention right now?"

### 6.2 Metrics Cards

Six KPI cards in a 2×3 grid (mobile) or single row (desktop):

| Metric | Data Source | Tap Action | Refresh Method |
|--------|-------------|------------|----------------|
| Active Patients | Count of users with ≥1 active subscription | Informational only | Every 5 minutes |
| Consultations Pending Review | Count where status = `AI_COMPLETE` or `ASSIGNED` but doctor hasn't actioned | Navigate to filtered consultation list | Real-time (SSE) |
| Lab Orders in Progress | Count where status ∈ [`ORDERED`, `SLOT_BOOKED`, `NURSE_ASSIGNED`, `SAMPLE_COLLECTED`, `AT_LAB`, `PROCESSING`] | Navigate to `/lab-orders` | Real-time (SSE) |
| Deliveries in Progress | Count where status ∈ [`CREATED`, `SENT_TO_PHARMACY`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`] | Navigate to `/deliveries` | Real-time (SSE) |
| SLA Breaches | Count of active SLA violations across all pipelines | Navigate to SLA breach summary | Real-time (SSE) |
| Today's Revenue | Sum of Razorpay payments received today (IST timezone) | Navigate to `/settings/financial` | Every 15 minutes |

**Additional metrics (pay-after-doctor model — CHANGE PA-1):**

| Metric | Data Source | Tap Action |
|--------|-------------|------------|
| Awaiting Payment | Count of consultations in `AWAITING_PAYMENT` status | Navigate to Awaiting Payment management |
| Expiring Soon | Count of `AWAITING_PAYMENT` with ≤ 7 days remaining | Navigate to filtered Awaiting Payment list |
| Expired This Week | Count moved to `EXPIRED_UNPAID` this week | Informational |
| Free-to-Paid Conversion | `PAYMENT_COMPLETE / (PAYMENT_COMPLETE + EXPIRED_UNPAID) × 100` | Informational |

**SLA Breaches card:** Always red background when count > 0. Pulses gently to draw attention.

**API:** `trpc.admin.analytics.getOverview.useQuery()` — returns all metric values in a single call. SSE events trigger cache invalidation and refetch.

### 6.3 Desktop Charts Panel (≥ 1024px only)

Below the metrics and beside the activity feed, desktop users see interactive charts:

- **Daily Orders (7 days):** Bar chart — orders created per day
- **Revenue Trend (30 days):** Line chart — daily revenue in ₹
- **SLA Compliance (30 days):** Percentage gauge — 94% on-time | 4% amber | 2% breach

**Chart API:** `trpc.admin.analytics.getOverviewCharts.useQuery()` — server computes aggregates to avoid client-side heavy lifting.

### 6.4 Overview Workflow — What to Do Here

The admin's workflow on this screen is triage and routing:

1. **Scan metrics cards** — identify which pipelines need attention
2. **Check SLA breaches first** — these are the most urgent items
3. **Scan activity feed** — see recent system events for context
4. **Navigate to the appropriate pipeline** — lab orders, deliveries, or settings

The admin should never spend more than 30 seconds on the overview before drilling into a specific pipeline.

*(Source: PORTAL-ADMIN.md §4; REMAINING-DOCS-CHANGES.md PA-1)*

---

## 7. Activity Feed — Real-Time Operations Pulse

### 7.1 What the Activity Feed Is

The activity feed is a reverse-chronological stream of ALL system events, delivered via SSE. It is the admin's primary way to stay on top of operations without switching between tabs.

### 7.2 Feed Data Model

Each event is stored in the `SystemEvent` table:

```
SystemEvent
  ├── id (UUID)
  ├── type (enum — see event types below)
  ├── severity (enum: INFO | WARNING | CRITICAL)
  ├── title (text — human-readable summary)
  ├── resourceType (enum: CONSULTATION | LAB_ORDER | ORDER | PARTNER | REFUND | SYSTEM)
  ├── resourceId (UUID — links to the relevant record)
  ├── metadata (JSONB — event-specific details)
  ├── readAt (timestamp | null)
  └── createdAt (timestamp)
```

### 7.3 Event Types and Severity

| Event Type | Severity | Example Title | Tap Action |
|------------|----------|---------------|------------|
| `consultation.submitted` | INFO | "New consultation submitted — Hair Loss — Rahul M." | Open consultation detail |
| `consultation.assigned` | INFO | "Case assigned to Dr. Rajesh Patel — Rahul M." | Open consultation detail |
| `consultation.prescribed` | INFO | "Prescription created — Hair Loss — Rahul M." | Open delivery for this order |
| `lab_order.created` | INFO | "Lab order created — Extended Hair Panel — Sneha K." | Open lab order detail |
| `lab_order.results_uploaded` | INFO | "Lab results uploaded — PCOS — Sneha K." | Open lab order detail |
| `lab_order.results_self_uploaded` | INFO | "Patient uploaded own lab results — Rahul M." | Open lab order detail |
| `delivery.confirmed` | INFO | "Delivery confirmed (OTP verified) — ED — Amit S." | Open delivery detail |
| `sla.breach` | CRITICAL | "⚠️ SLA BREACH: Lab results overdue 48hrs — Order #1234" | Open breached lab order |
| `sla.warning` | WARNING | "⚡ SLA WARNING: Doctor review approaching deadline — Case #5678" | Open relevant case |
| `pharmacy.stock_issue` | CRITICAL | "⚠️ PHARMACY ISSUE: Stock unavailable — Order #5678" | Open delivery detail |
| `delivery.failed` | WARNING | "Delivery failed — patient not home — Order #9012" | Open delivery detail |
| `nurse.visit_failed` | WARNING | "Nurse visit failed — patient unavailable — Visit #3456" | Open lab order detail |
| `refund.requested` | WARNING | "Refund request — Rahul M. — ₹999 — Medical contraindication" | Open refund approval modal |
| `payment.received` | INFO | "Payment received — ₹1,499 — Sneha K. (PCOS Monthly)" | Open financial detail |
| `payment.failed` | WARNING | "Payment failed — subscription renewal — Amit S." | Open patient detail |
| `subscription.renewed` | INFO | "Auto-renewal processed — Hair Loss Monthly — Rahul M." | Open delivery (auto-reorder) |
| `partner.nurse_unavailable` | WARNING | "Nurse Priya is unavailable today (marked off)" | Open nurse detail |

### 7.4 Feed UI

```
┌──────────────────────────────────────────────────┐
│  ACTIVITY                        [Mark all read] │
│                                                  │
│  ⚠️ 2 min ago                                    │
│  SLA BREACH: Lab results overdue 48hrs           │
│  Order #1234 — Sneha K.                          │
│  ─────────────────────────────────────────────── │
│  📋 15 min ago                                    │
│  New consultation submitted — Hair Loss          │
│  Rahul M. — Awaiting doctor review               │
│  ─────────────────────────────────────────────── │
│  ✅ 1 hr ago                                      │
│  Delivery confirmed (OTP verified)               │
│  Amit S. — ED Monthly                            │
│  ─────────────────────────────────────────────── │
│  💰 2 hrs ago                                     │
│  Payment received — ₹1,499                       │
│  Sneha K. — PCOS Monthly                         │
│                                                  │
│  [Load more]                                     │
└──────────────────────────────────────────────────┘
```

### 7.5 Feed Behavior

- New events slide in at the top with subtle animation
- CRITICAL events: red left border + bold text
- WARNING events: amber left border
- INFO events: no left border (standard)
- Unread events: blue dot indicator (left of timestamp)
- Tap any event → navigates to the relevant detail view
- "Mark all read" button clears all blue dots
- Pagination: initial load = 30 events, then "Load more" in batches of 30
- Events older than 30 days auto-archive (not shown in feed, available in audit log)

### 7.6 Feed Filters (Desktop Only)

On desktop, a filter bar appears above the feed:

| Filter | Options |
|--------|---------|
| Severity | All / Critical only / Warning + Critical |
| Type | All / Consultations / Lab Orders / Deliveries / Payments / SLA |
| Time | Today / Last 24h / Last 7 days |

### 7.7 Feed Workflow — How the Admin Uses It

The activity feed serves two purposes:

1. **Triage (morning):** Scroll through overnight events to understand what happened while offline. CRITICAL events first, then WARNING, then INFO.
2. **Real-time monitoring (throughout the day):** Glance at new events as they arrive via SSE. If a critical event appears, take immediate action.

**Decision flow for each feed event:**

```
New event arrives via SSE
  │
  ├─ CRITICAL?
  │   └─ YES → Take immediate action (open detail, escalate, call someone)
  │
  ├─ WARNING?
  │   └─ YES → Note it, handle within 30 minutes
  │
  └─ INFO?
      └─ Acknowledge, no action needed (system running normally)
```

*(Source: PORTAL-ADMIN.md §5)*

---

## 8. Lab Orders Pipeline — End-to-End Management

### 8.1 What This Screen Does

**Route:** `/lab-orders`

The lab orders screen is the admin's primary workspace for managing the entire blood work pipeline — from the moment a doctor orders lab work to the moment results are uploaded and reviewed.

### 8.2 Lab Order Lifecycle (Admin Perspective)

The admin's involvement in the lab order lifecycle:

```
Doctor orders blood work
  │
  ▼
ORDERED ← Patient needs to book a collection slot
  │        (Admin can see this, but no action needed yet — patient-driven)
  ▼
SLOT_BOOKED ← Patient has booked a date/time
  │
  ▼ ★ ADMIN ACTION: Assign nurse
NURSE_ASSIGNED
  │
  ▼ (nurse travels to patient)
NURSE_EN_ROUTE → NURSE_ARRIVED → IN_PROGRESS
  │
  ▼ (nurse collects sample)
SAMPLE_COLLECTED
  │
  ▼ ★ ADMIN ACTION: Assign lab (if not already assigned)
  │   (nurse delivers sample to assigned lab)
AT_LAB
  │
  ▼ (lab processes sample)
PROCESSING
  │
  ▼ (lab uploads results)
RESULTS_READY
  │
  ▼ (doctor reviews)
DOCTOR_REVIEWED → CLOSED

  Exits:
  ├─ CANCELLED (admin or doctor cancels)
  └─ RECOLLECTION_NEEDED (sample issue → new order created)
```

The admin's two critical actions are: **assign nurse** (Section 9) and **assign lab** (Section 10). Everything else is monitoring and escalation.

### 8.3 Filter Tabs

Horizontal scrollable filter chips (mobile) or tab bar (desktop):

| Filter | Criteria | Badge |
|--------|----------|-------|
| All | All lab orders | Total count |
| Needs Assignment | Status = `ORDERED` or `SLOT_BOOKED` with no nurse/lab assigned | Red count |
| In Progress | Status ∈ [`NURSE_ASSIGNED`, `SAMPLE_COLLECTED`, `AT_LAB`, `PROCESSING`] | Count |
| Results Pending | Status = `PROCESSING` for > 24 hours | Amber count |
| Overdue | Any SLA breached | Red count |
| Completed | Status ∈ [`RESULTS_READY`, `DOCTOR_REVIEWED`, `CLOSED`] | None |

### 8.4 Lab Order Card Display

Each lab order in the list renders as a card showing:

- Panel name (e.g., "Extended Hair Panel") or individual test names
- Status badge (colour-coded — see below)
- Patient name + condition
- Ordering doctor + time since order
- Assigned nurse (name + ✅, or "Unassigned" in red)
- Assigned lab (name + ✅, or "Unassigned" in red)
- Time since last status change
- SLA indicator (green/amber/red with time remaining or time overdue)
- Quick action buttons

### 8.5 Lab Order Status Colours

| Status | Colour | Badge Text |
|--------|--------|------------|
| `ORDERED` | Blue | Ordered |
| `SLOT_BOOKED` | Blue | Slot Booked |
| `NURSE_ASSIGNED` | Indigo | Nurse Assigned |
| `NURSE_EN_ROUTE` | Indigo | Nurse En Route |
| `NURSE_ARRIVED` | Indigo | Nurse Arrived |
| `SAMPLE_COLLECTED` | Purple | Sample Collected |
| `AT_LAB` | Yellow | At Lab |
| `PROCESSING` | Yellow | Processing |
| `RESULTS_READY` | Green | Results Ready |
| `RESULTS_UPLOADED` | Green | Results Uploaded (self-upload) |
| `DOCTOR_REVIEWED` | Green | Doctor Reviewed |
| `CLOSED` | Grey | Closed |
| `CANCELLED` | Red | Cancelled |
| `RECOLLECTION_NEEDED` | Red | Recollection Needed |

### 8.6 SLA Alerts Banner

When SLA breaches exist, a sticky red banner appears at the top:

```
┌──────────────────────────────────────────────────────────┐
│ ⚠️ 3 SLA breaches requiring attention                    │
│                                                          │
│  • Patient didn't book slot (7+ days): Rahul M. [→]     │
│  • Lab results overdue (48+ hrs): Sneha K. [→]          │
│  • Doctor hasn't reviewed (24+ hrs): Amit S. [→]        │
│                                                          │
│  [Dismiss] (re-appears if new breaches occur)            │
└──────────────────────────────────────────────────────────┘
```

Each breach item is tappable → opens the relevant order.

### 8.7 Sort and Search

**Sort options:** Last status change (default, oldest first), Date ordered (newest first), SLA urgency (most urgent first), Patient name (alphabetical).

**Search:** Free-text across patient name, order ID, nurse name, lab name. Debounced 300ms client-side for small lists, server-side for > 100 results.

### 8.8 Lab Order Detail View

**Route:** `/lab-orders/[id]`

The detail view shows everything about a single lab order:

- **Header:** Order ID, status badge, SLA indicator
- **Patient section:** Name, phone (tappable to call), condition, delivery address
- **Tests section:** Panel name, individual test list, fasting requirements, special instructions
- **Assignments section:** Nurse (name, phone, status), Lab (name, phone, address)
- **Timeline section:** Vertical history of all status changes with timestamps and actors
- **Actions section:** Context-dependent buttons (see below)

**Available actions (context-dependent):**

| Current Status | Available Actions |
|----------------|-------------------|
| `ORDERED` / `SLOT_BOOKED` | [Assign Nurse] [Assign Lab] [Cancel Order] |
| `NURSE_ASSIGNED` | [Change Nurse] [Assign Lab] [Cancel Order] |
| `SAMPLE_COLLECTED` | [Assign Lab] (if not already assigned) |
| `AT_LAB` / `PROCESSING` | [Contact Lab] [Escalate] |
| `RESULTS_READY` | [Remind Doctor] |
| `RECOLLECTION_NEEDED` | [Create Recollection Order] |
| Any | [View Patient] [View Doctor Notes] |

*(Source: PORTAL-ADMIN.md §6–7)*

---

## 9. Nurse Assignment Workflow

### 9.1 When to Assign a Nurse

The admin assigns a nurse when:
- A lab order status is `ORDERED` or `SLOT_BOOKED` and no nurse is assigned
- The "Needs Assignment" badge on the Lab Orders tab is > 0

### 9.2 Assignment Modal

From the lab order detail or card → tap "Assign Nurse":

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close            ASSIGN NURSE                         │
│                                                          │
│  Order: Extended Hair Panel — Rahul Mehta                 │
│  Patient area: Koramangala, Bangalore — 560034            │
│  Preferred slot: 28 Feb, 9:00–11:00 AM                   │
│                                                          │
│  ─── AVAILABLE NURSES ────────────────────────────────── │
│  (Filtered by: area match + availability + capacity)     │
│                                                          │
│  ● Priya S. ⭐ RECOMMENDED                               │
│    Areas: Koramangala, Indiranagar, MG Road               │
│    Today: 2/5 collections scheduled                       │
│    Rating: ⭐ 4.8 (23 visits)                             │
│                                                          │
│  ○ Deepa R.                                              │
│    Areas: MG Road, Whitefield, Marathahalli               │
│    Today: 4/5 collections scheduled                       │
│    Rating: ⭐ 4.5 (18 visits)                             │
│                                                          │
│  ○ Kavitha M.                                            │
│    Areas: Jayanagar, JP Nagar, Banashankari               │
│    Today: 1/4 collections scheduled                       │
│    Rating: ⭐ 4.9 (31 visits)                             │
│    ⚠️ Not in patient's area — 8km away                   │
│                                                          │
│  [Cancel]                              [Assign]          │
└──────────────────────────────────────────────────────────┘
```

### 9.3 Nurse Filtering & Ranking Logic

Nurses are filtered and ranked by:

1. **Serviceable pincodes:** Nurse's registered serviceable pincodes include the patient's pincode (exact match)
2. **Availability:** Nurse is active + available on the booked date + has capacity (scheduled < max daily collections)
3. **Proximity fallback:** If no exact pincode match, show nearby nurses with amber warning "Not in patient's area — Xkm away"

**Sort order:** Exact area match first → lowest scheduled count first → highest rating first.

**Edge cases:**
- If no nurses available in area → all active nurses shown with proximity warnings
- If nurse at max capacity → shown with warning "At capacity (5/5 today)" — still selectable, but admin sees the warning
- If no nurses exist → empty state with "Add your first nurse in Partners → Nurses"

### 9.4 Assignment API & Server Actions

```
trpc.admin.labOrder.assignNurse.mutate({
  labOrderId: 'uuid',
  nurseId: 'uuid'
})
```

**Server actions (in order):**
1. Update `LabOrder.nurseId` and status → `NURSE_ASSIGNED`
2. Create `NurseVisit` record with status `SCHEDULED`, linking labOrderId and nurseId
3. Notify nurse (push + WhatsApp): "New blood collection assignment — [Date] [Time] — [Area]. Open your portal for details."
4. Notify patient (push): "A nurse has been assigned for your blood test collection."
5. SSE event → admin activity feed, nurse portal
6. Audit log entry: `{ action: 'admin.lab_order.nurse_assigned', adminId, labOrderId, nurseId, timestamp }`

### 9.5 Post-Assignment Monitoring

After assigning a nurse, the admin monitors progress via:
- SSE events as nurse transitions through `EN_ROUTE` → `ARRIVED` → `IN_PROGRESS` → `SAMPLE_COLLECTED`
- Activity feed updates
- SLA indicators (nurse arrival within 30 minutes of slot start time)

If the nurse is running late or the visit fails, the admin receives a notification and may need to reassign.

*(Source: PORTAL-ADMIN.md §8; WORKFLOW-NURSE-PART1.md §9; BACKEND-PART2A.md §12)*

---

## 10. Lab (Diagnostic Centre) Assignment Workflow

### 10.1 When to Assign a Lab

The admin assigns a diagnostic centre when:
- A lab order has been created and no lab is assigned yet
- The order is best assigned before the nurse collects the sample (so the nurse knows where to deliver)

### 10.2 Assignment Modal

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close            ASSIGN LAB                           │
│                                                          │
│  Order: Extended Hair Panel — Rahul Mehta                 │
│  Tests required: CBC, TSH, Ferritin, Vitamin D, DHT, Zinc│
│                                                          │
│  ─── AVAILABLE LABS ─────────────────────────────────── │
│  (Filtered by: tests offered + city)                     │
│                                                          │
│  ○ PathLab Plus (MG Road)                                │
│    Tests offered: ✅ All 6 tests available                │
│    Avg turnaround: 24 hrs                                │
│    Rating: ⭐ 4.7                                        │
│                                                          │
│  ○ CityLab Diagnostics (Koramangala)                     │
│    Tests offered: ✅ 5/6 — ⚠️ Missing: DHT              │
│    Avg turnaround: 36 hrs                                │
│    Rating: ⭐ 4.3                                        │
│                                                          │
│  [Cancel]                              [Assign]          │
└──────────────────────────────────────────────────────────┘
```

### 10.3 Lab Filtering Logic

Labs are filtered by:
1. **Tests offered:** Lab must offer ALL tests in the order (or show partial match with warning)
2. **City:** Same city as patient
3. **Active status:** Lab is not deactivated

**Sort order:** Full test coverage first → shortest avg turnaround → highest rating.

### 10.4 Assignment API & Server Actions

```
trpc.admin.labOrder.assignLab.mutate({
  labOrderId: 'uuid',
  labId: 'uuid'
})
```

**Server actions:**
1. Update `LabOrder.diagnosticCentreId`
2. Lab portal shows the order in "Incoming" queue (visible once nurse delivers sample)
3. Audit log entry: `{ action: 'admin.lab_order.lab_assigned', adminId, labOrderId, labId, timestamp }`

**Note:** The lab does NOT receive a notification at assignment time — they see the order when the nurse physically arrives with the sample and the nurse taps "Delivered to Lab" in their portal.

*(Source: PORTAL-ADMIN.md §9; WORKFLOW-LAB.md §4; BACKEND-PART2A.md §12)*

---

## 11. Recollection Order Workflow

### 11.1 When Recollection Is Needed

Recollection is triggered when:
- Sample rejected by lab (hemolyzed, insufficient volume, wrong tube, contaminated)
- Patient missed the nurse visit
- Lab requested a repeat for quality reasons

### 11.2 Trigger

From lab order detail → "Create Recollection" button (available when current order has a sample issue or `RECOLLECTION_NEEDED` status).

### 11.3 Recollection Modal

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close         CREATE RECOLLECTION ORDER               │
│                                                          │
│  Original Order: #ORD-1234 — Extended Hair Panel         │
│  Reason for recollection:                                │
│                                                          │
│  Select: [ Sample hemolyzed                    ▼ ]       │
│                                                          │
│  Options:                                                │
│  • Sample hemolyzed                                      │
│  • Insufficient sample volume                            │
│  • Wrong tube used                                       │
│  • Sample contaminated                                   │
│  • Patient missed visit                                  │
│  • Nurse visit failed (other reason)                     │
│  • Lab requested repeat                                  │
│                                                          │
│  Additional notes: [________________________]            │
│                                                          │
│  ⚠️ This creates a new lab order linked to the original.  │
│     Patient will be notified to rebook.                  │
│                                                          │
│  [Cancel]                              [Create]          │
└──────────────────────────────────────────────────────────┘
```

### 11.4 Recollection API & Server Actions

```
trpc.admin.labOrder.createRecollection.mutate({
  originalLabOrderId: 'uuid',
  reason: 'sample_hemolyzed',
  notes: 'Lab reported hemolysis — needs fresh fasting sample'
})
```

**Server actions:**
1. Mark original order status → `RECOLLECTION_NEEDED`
2. Create new `LabOrder` linked to original (`parentLabOrderId`)
3. New order status = `ORDERED` (patient needs to book new slot)
4. Notify patient (push + WhatsApp): "We need to collect a new blood sample. Please book a new collection slot."
5. Notify ordering doctor: "Recollection needed for [Patient] — [Reason]"
6. SSE event → admin activity feed
7. Audit log entry

**Post-recollection:** The admin then needs to assign a nurse and lab to the new order — the same workflow as any new lab order.

*(Source: PORTAL-ADMIN.md §10; WORKFLOW-LAB.md §8)*

---

## 12. Deliveries Pipeline — End-to-End Management

### 12.1 What This Screen Does

**Route:** `/deliveries`

The deliveries screen manages the medication delivery pipeline — from the moment a doctor creates a prescription to the moment the patient confirms receipt via OTP.

### 12.2 Delivery Lifecycle (Admin Perspective)

```
Doctor creates prescription → System creates Order
  │
  ▼
PRESCRIPTION_CREATED → AWAITING_PAYMENT (pay-after-doctor)
  │
  ▼ (patient pays)
PAYMENT_COMPLETE → CREATED
  │
  ▼ ★ ADMIN ACTION: Send to pharmacy
SENT_TO_PHARMACY
  │
  ▼ (pharmacy prepares)
PREPARING → READY
  │
  ▼ ★ ADMIN ACTION: Arrange delivery
OUT_FOR_DELIVERY
  │
  ▼ (patient confirms with OTP)
DELIVERED

  Exits:
  ├─ PHARMACY_ISSUE (stock problem — admin must find alternative)
  ├─ DELIVERY_FAILED (patient not home — admin reschedules)
  ├─ REASSIGNED (pharmacy reassignment)
  └─ CANCELLED (admin cancels)
```

### 12.3 Filter Tabs

| Filter | Criteria | Badge |
|--------|----------|-------|
| All | All orders | Total count |
| New (needs pharmacy) | Status = `CREATED`, no pharmacy assigned | Red count |
| At Pharmacy | Status = `SENT_TO_PHARMACY` or `PREPARING` | Count |
| Ready for Pickup | Status = `READY` | Amber count |
| In Transit | Status = `OUT_FOR_DELIVERY` | Count |
| Completed | Status = `DELIVERED` | None |
| Issues | Delivery failed, stock issues, patient complaints | Red count |

### 12.4 Delivery Status Colours

| Status | Colour | Badge Text |
|--------|--------|------------|
| `CREATED` | Blue | New Order |
| `SENT_TO_PHARMACY` | Indigo | At Pharmacy |
| `PREPARING` | Yellow | Preparing |
| `READY` | Amber | Ready for Pickup |
| `OUT_FOR_DELIVERY` | Purple | In Transit |
| `DELIVERED` | Green | Delivered |
| `PHARMACY_ISSUE` | Orange | Stock Issue |
| `DELIVERY_FAILED` | Red | Failed |
| `REASSIGNED` | Grey (striped) | Reassigned |
| `CANCELLED` | Grey | Cancelled |

### 12.5 Delivery Detail View

**Route:** `/deliveries/[id]`

Shows: patient info, prescription details (medications, dosages, quantities, Rx PDF), pharmacy info (assigned, contact, timestamps), delivery person info (if assigned), timeline, and context-dependent action buttons.

*(Source: PORTAL-ADMIN.md §11–12)*

---

## 13. Send to Pharmacy Workflow

### 13.1 When to Send

The admin sends an order to a pharmacy when:
- Order status = `CREATED` (after payment is complete in pay-after-doctor flow)
- No pharmacy is assigned yet
- The "New" badge on the Deliveries tab is > 0

### 13.2 Pharmacy Selection Modal

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close          SEND TO PHARMACY                       │
│                                                          │
│  Order: #ORD-5678 — Rahul Mehta                          │
│  Medications: Finasteride 1mg, Minoxidil 5%              │
│                                                          │
│  ─── SELECT PHARMACY ────────────────────────────────── │
│  (Filtered by: city + medications stocked)               │
│                                                          │
│  ○ MedPlus (MG Road)                                     │
│    Stocks: ✅ Finasteride ✅ Minoxidil                    │
│    Hours: 9 AM — 9 PM                                    │
│    Rating: ⭐ 4.6                                        │
│                                                          │
│  ○ Apollo Pharmacy (Koramangala)                         │
│    Stocks: ✅ Finasteride ⚠️ Minoxidil (check)          │
│    Hours: 8 AM — 10 PM                                   │
│    Rating: ⭐ 4.4                                        │
│                                                          │
│  [Cancel]                         [Send Prescription]    │
└──────────────────────────────────────────────────────────┘
```

### 13.3 Pharmacy Filtering Logic

Pharmacies are filtered by:
1. **Medications stocked:** Pharmacy must stock ALL medications in the prescription (or show partial match with warning)
2. **City:** Same city as patient
3. **Active status:** Pharmacy is not deactivated
4. **Operating hours:** Currently open or opening soon

**Sort order:** Full stock coverage first → currently open → highest rating.

### 13.4 Send API & Server Actions

```
trpc.admin.delivery.sendToPharmacy.mutate({
  orderId: 'uuid',
  pharmacyId: 'uuid'
})
```

**Server actions:**
1. Update `Order.pharmacyId` and status → `SENT_TO_PHARMACY`
2. Prescription appears in pharmacy portal ("New Orders" tab)
3. Notify pharmacy (push via portal + WhatsApp to contact person): "New prescription received — [Medication list]. Please prepare."
4. SSE event → admin activity feed, pharmacy portal
5. Audit log entry

**Privacy enforcement:** Pharmacy sees Order ID (ORD-XXXX format), anonymous patient ID (ONY-P-XXXX), medications, dosages, quantities, prescription PDF, and prescribing doctor name + NMC number. They do NOT see patient name, diagnosis, questionnaire data, patient address, or the internal prescriptionId.

### 13.5 Post-Send Monitoring

After sending to pharmacy, the admin monitors:
- Pharmacy moves order to `PREPARING` (visible via SSE)
- Pharmacy marks `READY` (admin receives push + WhatsApp notification)
- SLA: pharmacy preparation within 24 hours of receiving order

*(Source: PORTAL-ADMIN.md §13; WORKFLOW-PHARMACY.md §4–5)*

---

## 14. Arrange Delivery Workflow

### 14.1 When to Arrange Delivery

The admin arranges delivery when:
- Pharmacy has marked order as `READY`
- "Ready for Pickup" count in Deliveries tab > 0
- Admin receives "Pharmacy order ready" notification

### 14.2 Delivery Setup Modal

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close         ARRANGE DELIVERY                        │
│                                                          │
│  Order: #ORD-5678 — Ready at MedPlus (MG Road)          │
│  Deliver to: 123 MG Road, Bangalore 560001               │
│                                                          │
│  ─── DELIVERY PERSON ────────────────────────────────── │
│                                                          │
│  Name: [_________________________]                       │
│  Phone: +91 [__________________]                         │
│                                                          │
│  ─── METHOD ─────────────────────────────────────────── │
│                                                          │
│  ( ) Rapido                                              │
│  ( ) Dunzo                                               │
│  (•) Own delivery person                                 │
│  ( ) Other                                               │
│                                                          │
│  ─── ESTIMATED DELIVERY ─────────────────────────────── │
│                                                          │
│  ETA: [__] minutes from now                              │
│                                                          │
│  ─── WHAT HAPPENS NEXT ─────────────────────────────── │
│  1. Delivery person receives SMS with pickup/drop info   │
│  2. They pick up from pharmacy → deliver to patient      │
│  3. Patient shares 4-digit OTP to confirm delivery       │
│                                                          │
│  [Cancel]                         [Send Delivery Link]   │
└──────────────────────────────────────────────────────────┘
```

### 14.3 Delivery Link Generation API

```
trpc.admin.delivery.arrangeDelivery.mutate({
  orderId: 'uuid',
  deliveryPersonName: 'Ravi Kumar',
  deliveryPersonPhone: '+919876543210',
  deliveryMethod: 'OWN',
  estimatedMinutes: 45
})
```

**Server actions (in order):**
1. Generate unique delivery link token (hashed, stored in `DeliveryLink` table)
2. Generate 4-digit delivery OTP (hashed, stored in `Order.deliveryOtp`)
3. Update order status → `OUT_FOR_DELIVERY`
4. Update `Order.deliveryPersonName`, `deliveryPersonPhone`, `deliveryMethod`
5. Send SMS to delivery person with single-use link containing pickup address, drop address, and package details
6. Notify patient (push + WhatsApp): "Your medication is on its way! Delivery ETA: ~45 minutes."
7. Display delivery OTP prominently on patient's app tracking screen
8. SSE event → admin activity feed, patient app
9. Audit log entry

**Delivery link expires:** After OTP-confirmed delivery or 24 hours, whichever comes first.

### 14.4 Post-Arrangement Monitoring

The admin monitors:
- Delivery person picks up from pharmacy (pharmacy confirms pickup in their portal)
- Delivery person delivers to patient
- Patient confirms with 4-digit OTP → status → `DELIVERED`
- If no confirmation within estimated time + 1 hour → admin may call delivery person or patient

*(Source: PORTAL-ADMIN.md §14; WORKFLOW-PHARMACY.md §8–9)*

---

## 15. Delivery Manual Override

### 15.1 When Manual Override Is Needed

Sometimes the normal delivery confirmation flow fails:
- Delivery person didn't have the link working (phone issue)
- Patient confirmed verbally but OTP flow had a technical error
- Admin arranged delivery outside the platform (direct pharmacy-to-patient)

### 15.2 Manual Override Modal

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close         MANUAL DELIVERY CONFIRMATION            │
│                                                          │
│  Order: #ORD-5678 — Rahul Mehta                          │
│                                                          │
│  ⚠️ Manual override bypasses OTP verification.            │
│     Only use when the standard flow has failed.          │
│                                                          │
│  Reason for manual override:                             │
│  Select: [ Technical issue with delivery link  ▼ ]       │
│                                                          │
│  Options:                                                │
│  • Technical issue with delivery link                    │
│  • Patient confirmed verbally                            │
│  • Delivery arranged outside platform                    │
│  • OTP flow error                                        │
│  • Other (specify)                                       │
│                                                          │
│  Notes: [________________________]                       │
│                                                          │
│  [Cancel]                    [Confirm Delivery Manually] │
└──────────────────────────────────────────────────────────┘
```

### 15.3 Override API & Server Actions

```
trpc.admin.delivery.manualOverride.mutate({
  orderId: 'uuid',
  reason: 'technical_issue',
  notes: 'Delivery person phone had no internet — patient confirmed receipt by phone call'
})
```

**Server actions:**
1. Update order status → `DELIVERED`
2. Mark as `manuallyOverridden: true` in the order record
3. Notify patient (push): "Your delivery has been confirmed."
4. SSE event → admin activity feed
5. Audit log entry with override reason and notes
6. Analytics event: `admin.delivery.manual_override` (tracked for quality monitoring)

**Important:** Manual overrides are flagged in analytics and audit logs. A high override rate signals that the standard delivery flow needs improvement.

*(Source: PORTAL-ADMIN.md §15)*

---

## 16. Auto-Reorder Management

### 16.1 What Auto-Reorder Is

When a patient has an active subscription, the system automatically creates a new order (reorder) before their current medication supply runs out. This appears in the admin's delivery pipeline as a new order.

### 16.2 Upcoming Auto-Reorders View

Within the Deliveries screen, a section shows upcoming auto-reorders:

```
┌──────────────────────────────────────────────────────────┐
│  UPCOMING AUTO-REORDERS (next 7 days)                    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 📦 Hair Loss Monthly — Rahul M.       Due: Mar 3   │  │
│  │ Meds: Finasteride 1mg (30), Minoxidil 5% (1)      │  │
│  │ Status: ✅ On track                                │  │
│  │ [Pause Reorder] [Process Now]                      │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 📦 PCOS Monthly — Sneha K.            Due: Mar 5   │  │
│  │ Meds: Metformin 500mg (60), Spironolactone (30)   │  │
│  │ ⚠️ Follow-up check-in overdue                      │  │
│  │ [Pause Reorder] [Process Now]                      │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 16.3 Auto-Reorder Pause Rules

Auto-reorder is automatically **paused** when:
- Subscription is paused by patient
- Doctor has paused treatment (awaiting lab results, dosage change pending)
- Follow-up check-in is overdue and doctor flagged "must check-in before next reorder"
- Payment failed and subscription is `HALTED`

### 16.4 Admin Actions on Auto-Reorders

| Action | Effect |
|--------|--------|
| Pause Reorder | Manually pause for a specific patient (with reason). No order will be created until resumed. |
| Process Now | Manually trigger reorder ahead of schedule. Creates a new order immediately in `CREATED` status. |
| Resume | Resume a previously paused auto-reorder (only if not blocked by doctor or system). |

*(Source: PORTAL-ADMIN.md §16)*

---

## 17. Consultation Oversight (Non-Clinical)

### 17.1 Purpose

The admin does NOT perform clinical work. However, they need visibility into consultations for operational coordination: SLA monitoring, doctor assignment, and escalation.

### 17.2 Consultation List

Accessible from the Overview metrics card "Consultations Pending Review":

The admin sees a filtered list of consultations with: patient name, condition, current status, assigned doctor (or "Unassigned"), time since submission, and SLA indicator.

### 17.3 Admin Actions on Consultations

| Action | When | Effect |
|--------|------|--------|
| View case details | Any time | Read-only view of questionnaire, AI assessment, photos (no clinical actions) — audit-logged |
| Reassign doctor | When SLA breached or doctor unavailable | Changes `Consultation.doctorId`, notifies new doctor, audit-logged |
| Remind doctor | When approaching SLA deadline | Sends WhatsApp/push reminder to assigned doctor |
| Escalate to patient | When patient hasn't responded to doctor's info request | Sends WhatsApp reminder to patient |

**Critical restriction:** Admin CANNOT create prescriptions, modify AI assessments, or perform any clinical actions. These are strictly doctor-only. This is enforced at the tRPC router level — admin procedures do not include clinical mutation endpoints.

*(Source: PORTAL-ADMIN.md §32)*

---

## 18. Awaiting Payment Management (Pay-After-Doctor)

### 18.1 Context

With the pay-after-doctor flow, patients see their treatment plan before paying. Between `PRESCRIPTION_CREATED` and `PAYMENT_COMPLETE`, the consultation sits in `AWAITING_PAYMENT` status. The admin monitors this pipeline to track conversion and send reminders.

### 18.2 Awaiting Payment Management Table

**Columns:**
- Patient (name or anonymous ID)
- Condition
- Doctor who created treatment plan
- Treatment plan created date
- Days remaining (of 30-day payment window)
- Status indicator: Green (0–7 days elapsed), Amber (8–20 days), Red (21–30 days)
- Actions: [Send Reminder] [Extend Expiry] [View Plan]

**Filters:** All | Expiring Soon (< 7 days remaining) | Expired

### 18.3 Admin Actions

| Action | Effect |
|--------|--------|
| Send Reminder | Triggers push + WhatsApp notification to patient: "Your personalized treatment plan is waiting. Subscribe to start treatment." |
| Extend Expiry | Extends the 30-day payment window by 7/14/30 additional days (requires reason) |
| View Plan | Opens read-only view of the treatment plan the patient sees |

**Bulk actions (desktop):** Send reminder to all amber/red cases. Export list (CSV).

### 18.4 Expiry Flow

If 30 days pass without payment:
- BullMQ job fires → status → `EXPIRED_UNPAID`
- Patient receives notification: "Your treatment plan has expired. Start a new assessment to get a fresh recommendation."
- Admin sees the case move to "Expired" filter
- No charge to patient (they never paid)
- Doctor is notified: "Patient [Name]'s treatment plan expired unpaid."

### 18.5 Free Consultation Tracking

Admin can view free consultation usage per patient per vertical:
- `FreeConsultationTracker` table: patient ID, condition, used (boolean), consultation ID
- Admin can manually reset a patient's free consultation flag (e.g., if first consultation was a system error)
- Conversion funnel visible: Assessments Submitted → Treatment Plans Created → Subscriptions Activated

*(Source: REMAINING-DOCS-CHANGES.md PA-1 through PA-4; BACKEND-ALL-CHANGES.md)*

---

## 19. Refund Approval Workflow

### 19.1 Refund Sources (Post Pay-After-Doctor)

With the pay-after-doctor model, the most common refund scenarios are eliminated (patients haven't paid before doctor review). Remaining refund scenarios:

1. **After payment, before pharmacy dispatches** → 100% to wallet
2. **Delivery failure** → 100% to wallet or original payment
3. **Wrong medication** → 100% + replacement
4. **Subscription cancellation mid-cycle** → prorated to wallet
5. **Doctor-initiated** (rare — e.g., discovers post-payment contraindication) → full refund

### 19.2 How Refund Requests Arrive

When a refund request is created (by system, doctor, or admin):
- Admin receives push + WhatsApp: "⚠️ Refund request — [Patient Name] — ₹[amount] — [reason]. [Approve/Reject]"
- Red dot appears on Settings tab (bottom nav)
- Pending refunds card appears in Financial dashboard
- Activity feed shows WARNING event

### 19.3 Approval Modal

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close          REFUND APPROVAL                        │
│                                                          │
│  Patient: Rahul Mehta                                    │
│  Amount: ₹999                                            │
│  Type: Full refund                                       │
│  Reason: Medical contraindication discovered             │
│  Requested by: Dr. Rajesh Patel                          │
│  Date: 26 Feb 2026, 2:15 PM                              │
│                                                          │
│  Doctor's notes:                                         │
│  "Patient on nitrate therapy — cannot prescribe PDE5     │
│   inhibitors. Not suitable for remote ED treatment."     │
│                                                          │
│  ─── REFUND DESTINATION ─────────────────────────────── │
│                                                          │
│  ( ) Wallet credit (instant)                             │
│  (•) Original payment method (5-7 business days)         │
│                                                          │
│  Admin notes: [________________________]                 │
│                                                          │
│  [Reject with reason]                    [Approve]       │
└──────────────────────────────────────────────────────────┘
```

### 19.4 Approve API & Server Actions

```
trpc.admin.refund.approve.mutate({
  refundRequestId: 'uuid',
  destination: 'original_payment',
  adminNotes: 'Verified — legitimate contraindication'
})
```

**Server actions:**
1. Update `RefundRequest.status` → `APPROVED`
2. If destination = `original_payment`: trigger Razorpay Refund API → `refund.id` stored
3. If destination = `wallet`: create `WalletTransaction` (type: `CREDIT`, reason: `REFUND`)
4. Notify patient (push + WhatsApp): "Your refund of ₹999 has been processed. It will appear in your account within 5-7 business days." (or "credited to your Onlyou wallet" for wallet refunds)
5. Notify requesting doctor: "Refund approved for [Patient Name]."
6. Audit log entry
7. SSE event → admin activity feed

### 19.5 Reject API & Server Actions

```
trpc.admin.refund.reject.mutate({
  refundRequestId: 'uuid',
  rejectionReason: 'Patient already received medication — no refund eligible per policy'
})
```

**Server actions:**
1. Update `RefundRequest.status` → `REJECTED`
2. Notify requesting doctor: "Refund request rejected — [reason]"
3. Audit log entry

*(Source: PORTAL-ADMIN.md §31; REMAINING-DOCS-CHANGES.md PA-3)*

---

## 20. Financial Dashboard Workflow

### 20.1 Purpose

**Route:** `/settings/financial`

The financial dashboard gives the admin visibility into the platform's financial health: revenue, payments, refunds, and wallet balances.

### 20.2 Dashboard Sections

**Revenue summary:** Today's revenue, this week, this month, total. Breakdown by vertical.

**Payment list:** Recent payments with status (successful, failed, refunded). Filterable by date range, vertical, payment status.

**Refund summary:** Pending refunds (with count), approved this month, total refunded. Direct link to refund approval queue.

**Subscription metrics:** Active subscriptions by vertical, churn rate, renewal success rate.

### 20.3 Admin Actions

- View payment details (Razorpay transaction ID, amount, date, patient, plan)
- Initiate manual refund (for platform-fault cases)
- Export financial data (CSV)
- Track failed payment retries

*(Source: PORTAL-ADMIN.md §28)*

---

## 20A. Onboarding Overview — Who the Admin Onboards

The admin/coordinator is the sole gatekeeper for adding ALL non-patient users to the platform. No one can self-register except patients (via the mobile app). Here is the complete onboarding matrix:

| Role | Onboarded By Admin? | Where In Admin Portal | Creates User Record? | Creates Profile Record? | Portal Access After Onboarding |
|------|---------------------|----------------------|---------------------|------------------------|-------------------------------|
| **Doctor** | ✅ Yes | Settings → User Management → [+ Add User] | `User` with role `DOCTOR` | `DoctorProfile` with specializations, NMC number, schedule | `doctor.onlyou.life` via phone OTP |
| **Nurse** | ✅ Yes | Partners → Nurses → [+ Add Nurse] | `User` with role `NURSE` | `Nurse` profile with pincodes, certification, schedule | `nurse.onlyou.life` via phone OTP |
| **Lab Technician** | ✅ Yes | Partners → Labs → [+ Add Lab] | `User` with role `LAB_TECH` | `DiagnosticCentre` record linked to user | `lab.onlyou.life` via phone OTP |
| **Pharmacy Staff** | ✅ Yes | Partners → Pharmacies → [+ Add Pharmacy] | `User` with role `PHARMACY` | `Pharmacy` record linked to user | `pharmacy.onlyou.life` via phone OTP |
| **Referral Clinic** | ✅ Yes | Partners → Clinics → [+ Add Clinic] | ❌ No portal login | `ReferralClinic` record only | No portal — receives referrals via WhatsApp/email |
| **Patient** | ❌ Self-registers | N/A — via patient mobile app | `User` with role `PATIENT` | `PatientProfile` | Mobile app (iOS/Android) |
| **Delivery Person** | ❌ No onboarding | N/A — ad-hoc per delivery | ❌ No account created | ❌ No record | No portal — receives single-use SMS link per delivery |
| **Admin** | ❌ System-seeded (MVP) | N/A — database seed | `User` with role `ADMIN` | N/A | `admin.onlyou.life` via phone OTP |

**Key architectural decisions:**

**Why doctors are separate from partners:** Doctors are created via Settings → User Management (not Partners), because doctors are internal clinical staff with unique requirements (NMC verification, specialization assignment, case queue access) that differ fundamentally from external operational partners. The Partners screen manages external entities with business relationships (nurses, labs, pharmacies, clinics).

**Why delivery persons have no accounts:** Delivery is currently handled via ad-hoc arrangements (Rapido, Dunzo, own runners). The delivery person receives a single-use SMS link with pickup/dropoff details and OTP entry. No account, no portal, no onboarding. This is intentional for MVP — Phase 2 may add delivery partner integration with Rapido/Dunzo APIs for automated dispatch.

**Why patients can't be admin-created:** Patients self-register because the platform handles stigmatized conditions. Requiring admin-mediated registration would undermine the privacy-first design.

*(Source: PORTAL-ADMIN.md §17–§23, §38.1; WORKFLOW-DOCTOR-PART1.md §2; WORKFLOW-NURSE-PART1.md §2; WORKFLOW-DELIVERY.md §1.3; onlyou-spec-resolved-v4.md §1.7)*

---

## 20B. Doctor Account Onboarding

### 20B.1 Why Doctor Onboarding Is Admin-Controlled

Doctors do NOT self-register. Account creation is strictly admin-initiated to maintain:
- **Platform quality control:** Only verified, licensed physicians are onboarded
- **Regulatory compliance:** NMC registration must be manually verified before granting prescription authority
- **Specialisation control:** Admin configures which verticals each doctor can handle, directly controlling the case assignment pipeline

### 20B.2 Admin Workflow — Creating a Doctor Account

**Route:** Settings → User Management → [+ Add User]

The admin fills in the doctor registration form:

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| Full Name | ✅ | Text | Display name on prescriptions and patient-facing surfaces |
| Phone Number | ✅ | Phone (+91) | Must be Indian mobile. Used for OTP login at `doctor.onlyou.life`. |
| NMC Registration Number | ✅ | Text | Validated format: `NMC-YYYY-NNNNN`. Admin manually verifies against NMC registry (no automated API check in MVP). |
| Email | ❌ | Email | For email notifications only (not used for auth) |
| City | ✅ | Dropdown | Affects patient assignment (regional matching) |
| Role | ✅ | Fixed | Set to `DOCTOR` |
| Specialisations (Verticals) | ✅ | Multi-select | Hair Loss, ED, PE, Weight, PCOS. Determines which case types they receive in the queue. |

The admin clicks [Create Account].

### 20B.3 Backend Processing

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

**Synchronous actions (within Prisma transaction):**
1. Validate phone number uniqueness across all users
2. Validate NMC number format (regex: `NMC-YYYY-NNNNN`)
3. Encrypt phone and email (DPDPA compliance — field-level encryption via `EncryptionService`)
4. Create `User` record with role `DOCTOR` and status `ACTIVE`
5. Create `DoctorProfile` record linked to User with:
   - `specializations`: array of condition enums (determines case queue filtering)
   - `availableSchedule`: default weekday schedule (Mon-Fri 09:00-18:00, Sat 10:00-14:00, Sun off)
   - `nmcNumber`: stored for prescription regulatory display
   - `city`: for regional patient matching
   - `onboardingComplete`: `false` (triggers first-time setup flow on doctor's first login)
6. Audit log entry: `{ action: 'USER_CREATED', adminId, newUserId, role: 'DOCTOR', timestamp }`

**Async actions (BullMQ):**
1. Send WhatsApp message to doctor's phone via Gupshup: "Welcome to Onlyou! You've been registered as a consulting physician. Visit doctor.onlyou.life to access your dashboard."
2. If email provided: send welcome email with portal URL and getting-started guide

### 20B.4 What Happens Next — Doctor's First Login

After admin creates the account, the doctor:
1. Receives WhatsApp welcome message with portal URL
2. Navigates to `doctor.onlyou.life` → enters registered phone → receives OTP → logs in
3. First login redirects to `/settings` (because `onboardingComplete === false`)
4. Doctor reviews pre-filled profile, confirms details, sets availability schedule, configures notification preferences
5. Doctor clicks [Confirm Profile] → `onboardingComplete = true` → redirected to case queue
6. Doctor is now active and will receive cases matching their specialisations

### 20B.5 Doctor Account States

| State | Meaning | Can Login? | Can Receive Cases? |
|-------|---------|-----------|-------------------|
| `ACTIVE` | Normal operating state | ✅ Yes | ✅ Yes (subject to availability schedule) |
| `DEACTIVATED` | Admin has disabled the account | ❌ No (403 error) | ❌ No |
| `SUSPENDED` | Temporary hold (e.g., investigation) | ❌ No | ❌ No |

**Transition rules:**
- `ACTIVE` → `DEACTIVATED`: Admin action. Existing in-progress cases are NOT automatically reassigned — admin receives warning: "This doctor has [N] active cases. These cases will need to be manually reassigned." Admin must manually reassign before or after deactivation.
- `DEACTIVATED` → `ACTIVE`: Admin reactivation. Doctor can log in again. Case queue resumes.
- `ACTIVE` → `SUSPENDED`: Admin action for temporary holds. Same behaviour as deactivation but signals intent to reactivate.

### 20B.6 Doctor Provisioning Edge Cases

| Scenario | System Behaviour |
|----------|-----------------|
| Phone number already registered (any role) | Error: "This phone number is already associated with an account." Admin must use a different number or deactivate existing account first. |
| Admin enters invalid NMC format | Client-side validation rejects: "NMC number must be in format NMC-YYYY-NNNNN." |
| Admin tries to create doctor with no specialisations | Validation error: "At least one specialisation must be selected." |
| WhatsApp welcome message fails to send | BullMQ retries 3 times. If all fail: admin notified. Doctor can still login — the welcome message is informational only. |
| Admin provisions with wrong phone number | Admin can edit the doctor profile and change the phone number before the doctor logs in. If doctor already logged in: admin must deactivate that account and create a new one. |
| Doctor's NMC registration is suspended after provisioning | Admin must manually deactivate the doctor's account. No automated NMC verification check in MVP. |
| Multiple admins try to create same doctor simultaneously | Database unique constraint on phone number hash prevents duplicates. Second admin gets error. |
| Unprovisioned phone tries to log in at doctor portal | OTP is still sent (prevents phone enumeration). After OTP verification, server returns 403: "This phone number is not registered as a doctor account. Contact your administrator." |

### 20B.7 Admin Editing Doctor Profiles

After creation, the admin can edit doctor profiles via Settings → User Management → [Doctor Name]:

| Field | Admin Can Edit? | Doctor Can Edit? |
|-------|----------------|-----------------|
| Full Name | ✅ Yes | ❌ No (admin-managed) |
| Phone Number | ✅ Yes | ✅ Yes (with OTP re-verification) |
| NMC Registration | ✅ Yes | ❌ No (admin-verified) |
| Email | ✅ Yes | ✅ Yes |
| City | ✅ Yes | ✅ Yes (admin notified of change) |
| Specialisations | ✅ Yes | ❌ No (admin-controlled, affects case routing) |
| Availability Schedule | ❌ No | ✅ Yes (doctor self-manages) |
| Notification Preferences | ❌ No | ✅ Yes |

**Phone number change by admin:** If admin changes a doctor's phone number, the doctor's existing JWT becomes invalid on next refresh. Doctor must log in with the new number.

*(Source: WORKFLOW-DOCTOR-PART1.md §2; PORTAL-ADMIN.md §23, §38.1; BACKEND-PART1.md §5; BACKEND-PART3A.md §25.4; BACKEND-PART3B.md §30.1)*

> **⚠️ Backend API Gap (DISCREPANCY-ADMIN-1):** BACKEND-PART3B.md §30.1 admin router lists `createPartner`, `getUsers`, `activateUser`, `deactivateUser` but does NOT list a `createUser` or `createDoctor` mutation. However, WORKFLOW-DOCTOR-PART1.md §2.1 references `trpc.admin.users.create.mutate()`. The backend route map needs to be updated to include this endpoint. The admin router should have: `createUser mutation → Admin: create doctor/admin account (with role + profile)`.

---

## 21. Partner Management — Nurses

### 21.1 Overview

**Route:** `/partners/nurses`

The admin manages the nurse network — adding new nurses, editing profiles, monitoring capacity, and deactivating as needed.

### 21.2 Nurse List View

Shows all nurses with: name, phone, city, serviceable areas, collection stats (total, successful, failed), rating, today's capacity (scheduled/max), active/inactive status.

### 21.3 Add New Nurse

Required fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | ✅ | Full name |
| Phone | Phone (+91) | ✅ | Becomes their portal login |
| Email | Email | ❌ | Optional |
| Gender | Dropdown | ✅ | Male / Female / Other |
| City | Dropdown | ✅ | Currently: Bangalore only (MVP) |
| Serviceable Pincodes | Multi-select / tag input | ✅ | Pincodes where they can operate |
| Certification Type | Dropdown | ✅ | GNM / BSc Nursing / ANM / Other |
| Certification Number | Text | ✅ | Nursing certification/registration number |
| Certification Document | File upload | ✅ | PDF or image → S3 `onlyou-documents` |
| Available Days | Multi-select checkboxes | ✅ | Mon–Sun |
| Available Hours | Time range picker | ✅ | e.g., 7:00 AM — 5:00 PM |
| Max Daily Collections | Number | ✅ | Default: 5 |
| Notes | Text | ❌ | Internal notes |

**On save:**
1. Creates `User` record with `role: NURSE` (enables portal login via OTP at `nurse.onlyou.life`)
2. Nurse can immediately log in
3. Audit log entry

### 21.4 Deactivation

Toggle "Active/Inactive" → confirmation modal:
- "Deactivating Priya S. will remove her from future nurse assignments. Existing assigned visits will NOT be affected. Continue?"
- Deactivated nurses do not appear in assignment dropdowns
- Historical data (completed visits) remains intact
- Audit log entry

*(Source: PORTAL-ADMIN.md §18)*

---

## 22. Partner Management — Diagnostic Centres

### 22.1 Overview

**Route:** `/partners/labs`

### 22.2 Add New Lab

Required fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | ✅ | Lab/centre name |
| Address | Text | ✅ | Full address |
| City | Dropdown | ✅ | |
| Phone | Phone | ✅ | Main contact |
| Contact Person | Text | ✅ | Staff member name |
| Portal Login Phone | Phone (+91) | ✅ | Becomes their portal login |
| Tests Offered | Multi-select | ✅ | From master test list |
| Panel Pricing | Price per panel | ✅ | e.g., Basic Hair Panel: ₹800 |
| Avg Turnaround (hours) | Number | ✅ | Used for SLA calculations |
| Notes | Text | ❌ | Internal notes |

**On save:**
1. Creates `DiagnosticCentre` record
2. Creates `User` with `role: LAB_TECH` for portal login phone → enables `lab.onlyou.life` access
3. Audit log entry

**Privacy enforcement:** Lab partners see anonymous patient ID only — no patient name, phone, address, or diagnosis. Enforced at API layer.

*(Source: PORTAL-ADMIN.md §19)*

---

## 23. Partner Management — Pharmacies

### 23.1 Overview

**Route:** `/partners/pharmacies`

### 23.2 Add New Pharmacy

Required fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | ✅ | Pharmacy name |
| Address | Text | ✅ | Full address (also pickup address for delivery) |
| City | Dropdown | ✅ | |
| Phone | Phone | ✅ | Main contact |
| Contact Person | Text | ✅ | Pharmacist name |
| Portal Login Phone | Phone (+91) | ✅ | Becomes their portal login |
| Medications Stocked | Multi-select | ✅ | From master medication list |
| Operating Hours | Time range | ✅ | e.g., 9:00 AM — 9:00 PM |
| Notes | Text | ❌ | Internal notes |

**On save:**
1. Creates `Pharmacy` record
2. Creates `User` with `role: PHARMACY` for portal login → enables `pharmacy.onlyou.life` access
3. Audit log entry

**Privacy enforcement:** Pharmacy sees prescription ID, medications, dosages, doctor name. NO patient name, diagnosis, questionnaire data, or patient address.

*(Source: PORTAL-ADMIN.md §20)*

---

## 24. Partner Management — Referral Clinics

### 24.1 Overview

**Route:** `/partners/clinics`

Referral clinics are physical clinics where doctors can refer patients for in-person procedures (trichoscopy, scalp biopsy, etc.).

### 24.2 Add New Clinic

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | ✅ | Clinic name |
| Address | Text | ✅ | Full address |
| City | Dropdown | ✅ | |
| Phone | Phone | ✅ | Main contact |
| Specialisations | Multi-select | ✅ | Dermatology, Urology, Endocrinology, Gynecology, etc. |
| Capabilities | Text | ✅ | Procedures they can perform |
| Negotiated Rate | Currency | ❌ | If Onlyou has negotiated special pricing |
| Max Daily Capacity | Number | ❌ | Referrals they can accept per day |
| Notes | Text | ❌ | Internal notes |

**No portal login for referral clinics.** They receive referral notifications via email/WhatsApp with anonymised patient details.

*(Source: PORTAL-ADMIN.md §21)*

---

## 25. User Management & Account Lifecycle

### 25.1 User List

**Route:** `/settings/users`

Filterable by role: All, Patients, Doctors, Nurses, Lab Technicians, Pharmacy Staff, Admins.

Each user row shows: name, phone, email (if available), role badge, account status (Active/Inactive/Suspended), last login timestamp, date created.

### 25.2 Creating Users — [+ Add User]

The User Management screen includes a [+ Add User] button (top right) that opens a role-specific creation form.

**Roles that can be created here:**
- **Doctor** — full creation flow with NMC number, specialisations, city. See §20B for complete workflow, form fields, backend processing, and edge cases.
- **Admin** — Phase 2 only. In MVP, only one admin exists (system-seeded). When multi-admin is needed, this button enables creation of additional admin accounts with name + phone.

**Roles NOT created through User Management:**
- **Nurses, Labs, Pharmacies, Clinics** — created via the Partners screen (§21–§24). These are external operational partners with distinct entity models (Nurse, DiagnosticCentre, Pharmacy records), not just User records.
- **Patients** — self-register via the mobile app. Cannot be admin-created (privacy-first design for stigmatised conditions).
- **Delivery Persons** — no accounts at all. Ad-hoc via single-use SMS delivery links (§14).

### 25.3 Viewing & Editing Users

Admin can tap any user in the list to view their profile details:
- For doctors: name, phone, NMC number, specialisations, city, availability schedule, case statistics
- For nurses/lab/pharmacy: redirects to the relevant Partners detail page
- For patients: name, phone, email, subscription status, last consultation, account creation date

Admin can edit certain fields directly (see §20B.7 for doctor edit permissions).

### 25.4 Activate/Deactivate Toggle

Soft-disables the account. No delete capability — DPDPA compliance requires soft deactivation only.

### 25.5 Deactivation Effects by Role

| Role | Deactivation Effect |
|------|---------------------|
| Patient | Cannot log in, subscriptions paused, no notifications sent |
| Doctor | Removed from case assignment rotation, existing cases must be manually reassigned (admin warning shown if active cases exist) |
| Nurse | Removed from assignment dropdowns, existing assignments persist to completion |
| Lab/Pharmacy | Portal login blocked, existing in-progress orders persist to completion |

All deactivations are:
1. Confirmation modal with role-specific warning text
2. Logged in audit trail with adminId, userId, timestamp
3. Reversible (admin can re-activate at any time)

### 25.6 Delivery Persons — Why No Onboarding

Delivery is currently handled via ad-hoc arrangements. The admin enters a delivery person's name and phone when arranging each delivery (§14), and the system sends them a single-use SMS link. There is no persistent account, no portal access, and no onboarding workflow. Each delivery is independent.

This is intentional for MVP. Phase 2 plans include integration with Rapido/Dunzo APIs for automated delivery dispatch, which would eliminate manual delivery person management entirely. See §42.2 for Phase 2 scaffolding.

*(Source: PORTAL-ADMIN.md §23, §38.1; WORKFLOW-DOCTOR-PART1.md §2; WORKFLOW-DELIVERY.md §1.3)*

---

## 26. Subscription Plan Pricing Management

### 26.1 Plan Editor

**Route:** `/settings/plans`

The admin can view and edit pricing for all verticals and durations. Current pricing structure:

| Vertical | Monthly | Quarterly | 6-Month |
|----------|---------|-----------|---------|
| Hair Loss | ₹999 | ₹2,499 | ₹4,499 |
| Erectile Dysfunction | ₹1,299 | ₹3,299 | ₹5,999 |
| Premature Ejaculation | ₹1,299 | ₹3,299 | ₹5,999 |
| Weight (Standard) | ₹2,999 | ₹7,999 | ₹14,999 |
| Weight (GLP-1) | ₹9,999 | ₹24,999 | ₹44,999 |
| PCOS | ₹1,499 | ₹3,799 | ₹6,999 |

**Save behaviour:** Updates `SubscriptionPlan` table. Price changes apply to NEW subscriptions only — existing subscriptions keep their current pricing. Audit log records old → new price.

*(Source: PORTAL-ADMIN.md §24)*

---

## 27. Notification Template Management

### 27.1 Template Editor

**Route:** `/settings/notifications`

View and edit notification templates across all channels (SMS, WhatsApp, Email, Push) for all event categories:
- Authentication (OTP delivery)
- Consultation lifecycle
- Lab order lifecycle
- Delivery lifecycle
- Payment events
- SLA escalation (internal only)
- Marketing (opt-in only)

Each template shows: channel icon, event trigger, template text with `{{variables}}` highlighted, character count (SMS: 160, WhatsApp: 1024), preview mode.

**MVP:** Template editing is text-only (no drag-and-drop). Templates stored in `NotificationTemplate` table.

*(Source: PORTAL-ADMIN.md §25)*

---

## 28. Questionnaire Schema Viewer

### 28.1 Read-Only View

**Route:** `/settings/questionnaires`

Displays active questionnaire schemas for all 5 verticals. For MVP, schemas are defined in code and deployed — this screen provides admin visibility without editing capability.

Each vertical shows: name, question count, question types used, last updated timestamp, active/inactive status.

**Why read-only for MVP:** Questionnaire schemas are tightly coupled to AI assessment logic. Changing a question requires updating the AI prompt chain, validation rules, and assessment output format — this requires a code deploy rather than a runtime edit.

*(Source: PORTAL-ADMIN.md §26)*

---

## 29. Feature Flag Management

### 29.1 Feature Flag Toggles

**Route:** `/settings/feature-flags`

Admin can toggle platform features on/off. Example flags:

| Flag | Purpose | Default |
|------|---------|---------|
| `vertical.hair_loss.enabled` | Enable/disable Hair Loss vertical | ✅ ON |
| `vertical.ed.enabled` | Enable/disable ED vertical | ✅ ON |
| `vertical.pe.enabled` | Enable/disable PE vertical | ✅ ON |
| `vertical.weight.enabled` | Enable/disable Weight vertical | ✅ ON |
| `vertical.pcos.enabled` | Enable/disable PCOS vertical | ✅ ON |
| `feature.self_upload.enabled` | Allow patients to self-upload lab results | ✅ ON |
| `feature.discreet_mode.enabled` | Enable discreet mode option | ✅ ON |
| `feature.period_tracker.enabled` | PCOS period tracker | ✅ ON |

Changes take effect immediately. Audit-logged with old → new value.

*(Source: PORTAL-ADMIN.md §27)*

---

## 30. SLA Configuration & Threshold Management

### 30.1 SLA Threshold Editor

**Route:** `/settings/sla`

All SLA thresholds are editable. Changes take effect on the next SLA check cycle (every 15 minutes via BullMQ).

**Lab Order SLAs:**

| SLA Rule | Default Threshold | Escalation Action |
|----------|-------------------|-------------------|
| Patient slot booking | 7 days after order | Reminder notification to patient |
| Nurse assignment after booking | 2 hours | Admin notification (self-alert) |
| Nurse arrival (visit start) | 30 minutes past slot start | Admin + patient notification |
| Lab results after sample received | 48 hours | Admin contacts lab |
| Doctor review after results uploaded | 24 hours | Admin reminds doctor |

**Delivery SLAs:**

| SLA Rule | Default Threshold | Escalation Action |
|----------|-------------------|-------------------|
| Pharmacy assignment after prescription | 4 hours | Admin notification (self-alert) |
| Pharmacy preparation | 24 hours after sent | Admin contacts pharmacy |
| Delivery arrangement after ready | 2 hours | Admin notification (self-alert) |
| Delivery completion after pickup | 24 hours | Admin contacts delivery person |

**Doctor SLAs:**

| SLA Rule | Default Threshold | Escalation Action |
|----------|-------------------|-------------------|
| First review (AI complete → assigned) | 24 hours | Notification to doctor + admin |
| Case action (assigned → no action) | 48 hours | Notification to doctor + admin; admin may reassign |
| Info response review | 72 hours after patient responds | Notification to doctor |
| Lab results review | 24 hours after results uploaded | Notification to doctor + admin |

Each threshold has an editable number field (hours or days) + save button. Changes logged in audit trail with old → new threshold.

**Note:** The delivery completion SLA is 24 hours per BACKEND-PART2B.md §18.3 (corrected from earlier documentation that stated 2 hours).

*(Source: PORTAL-ADMIN.md §30; BACKEND-PART2B.md §18.3; WORKFLOW-PHARMACY.md §21.3)*

---

## 31. Audit Log Workflow

### 31.1 Audit Log Viewer

**Route:** `/settings/audit-log`

Searchable, filterable log of every action taken in the system.

### 31.2 Filters

| Filter | Options |
|--------|---------|
| Role | All / Admin / Doctor / Nurse / Lab Tech / Pharmacy / Patient / System |
| Action category | Auth / Consultation / Prescription / Lab Order / Delivery / Partner / Payment / Refund / Settings / SLA |
| Date range | Today / Last 7 days / Last 30 days / Custom range |
| Search | Free-text across action type, user name, resource ID |

### 31.3 Data Integrity

- Audit log table is **INSERT-only** — no UPDATE or DELETE permissions at the database level
- Retention: minimum 1 year (DPDP Rules), recommended 3 years (Telemedicine Practice Guidelines 2020)
- Structure: `{ timestamp, userId, role, action, resourceType, resourceId, ipAddress, userAgent, changesJson }`
- `changesJson` stores before/after values for data modifications

*(Source: PORTAL-ADMIN.md §29; BACKEND-PART3A.md §21.9)*

---

## 32. SLA Engine & Escalation System

### 32.1 Architecture

SLA enforcement runs as a BullMQ repeatable job (`sla-check`) every 15 minutes:

```
BullMQ sla-check job (every 15 min)
  → Query all active orders/consultations/deliveries
  → For each, check against SLA thresholds (editable in §30)
  → If breached: create SystemEvent (CRITICAL) + trigger notifications
  → If approaching (within 2 hours): set warning state (WARNING)
```

### 32.2 SLA States

| State | Indicator | Meaning |
|-------|-----------|---------|
| 🟢 Green | On track | Within SLA, > 2 hours remaining |
| 🟡 Amber | Warning | Within 2 hours of SLA breach |
| 🔴 Red | Breached | SLA threshold exceeded |

### 32.3 Escalation Notification Matrix

When SLA breaches:

| Breach Type | Notification Target | Channel |
|-------------|---------------------|---------|
| Lab results overdue | Admin (self) + lab contact person | Push + WhatsApp |
| Doctor review overdue | Admin + doctor | Push + WhatsApp + SMS (doctor) |
| Nurse assignment overdue | Admin (self) | Push only |
| Delivery arrangement overdue | Admin (self) | Push only |
| Pharmacy preparation overdue | Admin + pharmacy contact | Push + WhatsApp |
| Patient slot booking overdue | Patient + admin | Push + WhatsApp (patient) |

**Admin receives ALL breach notifications** — the admin is the escalation endpoint for everything.

### 32.4 SLA Dashboard Widget (Desktop)

On desktop overview, shows:
- Current breach count (breakdown by type)
- 30-day compliance rate (% of actions completed within SLA)
- Trend arrow (improving/declining)

### 32.5 Admin Response to SLA Breaches

**Decision flow:**

```
SLA Breach notification arrives
  │
  ├─ Lab results overdue?
  │   └─ Call lab contact person, check processing status, escalate if needed
  │
  ├─ Doctor review overdue?
  │   └─ Send reminder first. If 72+ hrs, consider reassigning to another doctor.
  │
  ├─ Nurse assignment overdue?
  │   └─ Go to lab order → assign nurse immediately
  │
  ├─ Pharmacy preparation overdue?
  │   └─ Call pharmacy, check stock. Consider reassigning to alternative pharmacy.
  │
  └─ Delivery arrangement overdue?
      └─ Go to delivery → arrange delivery immediately
```

*(Source: PORTAL-ADMIN.md §33; BACKEND-PART2B.md §18–19)*

---

## 33. Real-Time System — SSE Architecture (Admin)

### 33.1 SSE Endpoint

**Endpoint:** `GET /api/sse/admin`

The admin portal subscribes to an SSE channel that receives ALL system events across all pipelines and all roles.

### 33.2 Events Received

| Event | Source | Purpose |
|-------|--------|---------|
| `consultation.submitted` | Patient app | New case awareness |
| `consultation.status_changed` | Doctor portal | Track case progress |
| `lab_order.status_changed` | Nurse/lab portal | Lab pipeline updates |
| `delivery.status_changed` | Pharmacy/delivery | Delivery pipeline updates |
| `sla.breach` | BullMQ job | SLA breach alerts |
| `sla.warning` | BullMQ job | Approaching SLA warnings |
| `refund.requested` | Doctor portal | Refund approval needed |
| `payment.received` | Razorpay webhook | Revenue tracking |
| `payment.failed` | Razorpay webhook | Payment issue awareness |
| `partner.status_changed` | Any partner portal | Partner availability |

### 33.3 Connection Management

- Auto-reconnect with exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (max)
- On reconnect: fetch missed events since `Last-Event-ID`
- Gap too large (> 500 missed): full data refresh via API
- Tab inactive > 5 minutes: events buffered, delivered on tab focus
- Connection lost > 60 seconds: amber banner "🔌 Real-time updates paused. Checking connection..."

### 33.4 Push Notifications (Mobile)

Since the admin primarily uses mobile:
- Service worker registered for Web Push API
- Critical events (SLA breach, refund request) delivered via push even when app is backgrounded
- WhatsApp as redundant channel for all critical events

*(Source: PORTAL-ADMIN.md §34; ARCHITECTURE.md; BACKEND-PART2B.md §16)*

---

## 34. Notification System — Admin Experience

### 34.1 Notification Channels

| Channel | Delivery Method | Use Case |
|---------|----------------|----------|
| In-portal (SSE) | SSE push → activity feed + notification dropdown | Primary — all events |
| Browser push | Web Push API (service worker) | When portal tab is inactive |
| WhatsApp | Gupshup API | When admin is away from portal |
| SMS | Gupshup SMS | SLA breach fallback only |
| Email | Resend (MVP) / SES (scale) | Daily digest, financial reports |

### 34.2 Notification Event Matrix

| Event | In-Portal | Browser Push | WhatsApp | Email | SMS |
|-------|-----------|-------------|----------|-------|-----|
| New consultation submitted | ✅ | ❌ | ❌ | ❌ | ❌ |
| Doctor prescribed (order created) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lab order created | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lab results uploaded | ✅ | ✅ | ❌ | ❌ | ❌ |
| Pharmacy marked ready | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delivery confirmed | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delivery failed | ✅ | ✅ | ✅ | ❌ | ❌ |
| SLA breach | ✅ | ✅ (always) | ✅ (always) | ✅ | ✅ |
| Refund request | ✅ | ✅ | ✅ | ❌ | ❌ |
| Payment received (> ₹2,000) | ✅ | ❌ | ❌ | ✅ | ❌ |
| Payment failed | ✅ | ✅ | ❌ | ❌ | ❌ |
| Pharmacy stock issue | ✅ | ✅ | ✅ | ❌ | ❌ |
| Nurse visit failed | ✅ | ✅ | ✅ | ❌ | ❌ |
| Daily digest | ❌ | ❌ | ❌ | ✅ | ❌ |

**SLA breaches override all preferences** — always delivered via all available channels.

### 34.3 WhatsApp Message Format (Admin)

Discreet format — no patient medical details:

- **SLA breach:** "Onlyou Admin: ⚠️ SLA BREACH — Lab results overdue (48hrs) — Order #1234. Open dashboard: admin.onlyou.life"
- **Refund request:** "Onlyou Admin: Refund request — ₹999 — requires your approval. Open dashboard: admin.onlyou.life"
- **Pharmacy ready:** "Onlyou Admin: Pharmacy order ready for pickup — Order #5678. Arrange delivery: admin.onlyou.life"

*(Source: PORTAL-ADMIN.md §35)*

---

## 35. Daily Digest & Reporting

### 35.1 Daily Digest Email

Sent every day at 9:00 AM IST:

```
Subject: Onlyou Daily Summary — [Date]

Good morning,

YESTERDAY'S SUMMARY:
• [X] new consultations submitted
• [X] prescriptions created
• [X] lab orders completed
• [X] deliveries confirmed
• Revenue: ₹[amount]

REQUIRING ATTENTION:
• [X] SLA breaches
• [X] pending refund approvals
• [X] deliveries ready but not dispatched
• [X] awaiting payment (expiring soon)

UPCOMING TODAY:
• [X] auto-reorders scheduled
• [X] nurse visits scheduled
• [X] subscription renewals

Open dashboard: admin.onlyou.life
```

### 35.2 Digest Generation

The daily digest is generated by a BullMQ scheduled job at 8:55 AM IST, querying aggregate data from the previous 24 hours. Sent via email (Resend for MVP, SES at scale).

*(Source: PORTAL-ADMIN.md §35.4)*

---

## 36. Privacy & Data Access Boundaries

### 36.1 What the Admin CAN See

| Resource | Access Level |
|----------|-------------|
| Patient personal data | Full read (name, phone, address) — needed for coordination |
| Patient clinical data | Read-only (questionnaire, photos, AI assessment) — only when opening consultation detail (audit-logged) |
| Prescriptions | Read + PDF download — needed for pharmacy coordination |
| Lab results | Read + PDF download — needed for lab coordination |
| Doctor accounts | Create, read, activate/deactivate |
| Nurse/Lab/Pharmacy accounts | Full CRUD |
| Financial data | Full read + refund approval |
| Audit log | Full read (no modifications — insert-only table) |
| Feature flags | Full read/write |
| SLA configuration | Full read/write |
| Notification templates | Full read/write |
| Subscription plans | Full read/write |

### 36.2 What the Admin CANNOT Do

| Restriction | Reason |
|-------------|--------|
| Create or modify prescriptions | Clinical action — doctor-only |
| Modify AI assessments | Clinical data integrity |
| Change questionnaire responses | Patient data integrity |
| Delete any records | DPDPA compliance — soft delete only |
| Modify audit log entries | Insert-only table — no UPDATE/DELETE permissions |
| Impersonate other users | No impersonation feature built |

### 36.3 Privacy at the Partner Layer

- Admin is the ONLY human role with full patient data access
- All partner portals receive anonymised patient data:
  - Labs: anonymous patient ID only
  - Pharmacies: prescription ID + anonymous patient ID only
  - Delivery persons: address only (via single-use link)
- Prescription PDFs downloaded by admin are logged (file access audit)
- Clinical data access (opening consultation detail) is audit-logged

*(Source: PORTAL-ADMIN.md §38)*

---

## 37. Security, Audit & CASL Permissions

### 37.1 Session Security

| Measure | Implementation |
|---------|---------------|
| HttpOnly cookies | JWT tokens not accessible via JavaScript |
| SameSite=Strict | CSRF protection |
| Secure flag | Cookies only sent over HTTPS |
| Token rotation | Every refresh generates new token pair |
| Theft detection | Old refresh token reuse → all tokens revoked |
| Idle timeout | 8 hours |
| IP logging | Login IP recorded in audit log |
| Concurrent sessions | Allowed (mobile + desktop simultaneously) |

### 37.2 CASL.js Permission Rules

The admin's CASL abilities are defined in BACKEND-PART3A.md §22.4. Key rules:

- `can('manage', 'LabOrder')` — full CRUD on lab orders
- `can('manage', 'Order')` — full CRUD on delivery orders
- `can('read', 'Consultation')` — read-only on consultations
- `cannot('create', 'Prescription')` — explicitly denied prescription creation
- `cannot('update', 'AIAssessment')` — explicitly denied AI assessment modification
- `can('manage', 'Partner')` — full CRUD on all partner types
- `can('manage', 'User')` — activate/deactivate users
- `can('manage', 'RefundRequest')` — approve/reject refunds
- `can('manage', 'SystemConfig')` — SLAs, feature flags, pricing, templates

### 37.3 Comprehensive Audit Logging

Every admin action is logged. Full audit action list:

| Action | Fields Logged |
|--------|--------------|
| Login | `{ adminId, timestamp, ip, userAgent }` |
| Lab order: assign nurse | `{ adminId, labOrderId, nurseId, timestamp }` |
| Lab order: assign lab | `{ adminId, labOrderId, labId, timestamp }` |
| Lab order: cancel | `{ adminId, labOrderId, reason, timestamp }` |
| Lab order: create recollection | `{ adminId, originalOrderId, newOrderId, reason, timestamp }` |
| Delivery: send to pharmacy | `{ adminId, orderId, pharmacyId, timestamp }` |
| Delivery: arrange delivery | `{ adminId, orderId, deliveryPersonName, deliveryPersonPhone, method, timestamp }` |
| Delivery: manual override | `{ adminId, orderId, reason, notes, timestamp }` |
| Refund: approved | `{ adminId, refundRequestId, amount, destination, timestamp }` |
| Refund: rejected | `{ adminId, refundRequestId, rejectionReason, timestamp }` |
| Partner: created | `{ adminId, partnerType, partnerId, timestamp }` |
| Partner: updated | `{ adminId, partnerId, changesJson, timestamp }` |
| Partner: deactivated | `{ adminId, partnerId, timestamp }` |
| User: activated/deactivated | `{ adminId, userId, action, timestamp }` |
| Settings: plan pricing changed | `{ adminId, vertical, duration, oldPrice, newPrice, timestamp }` |
| Settings: feature flag toggled | `{ adminId, flag, oldValue, newValue, timestamp }` |
| Settings: SLA threshold changed | `{ adminId, slaRule, oldThreshold, newThreshold, timestamp }` |
| Settings: notification template edited | `{ adminId, templateId, channel, timestamp }` |

*(Source: PORTAL-ADMIN.md §38; BACKEND-PART3A.md §21.9, §22.4)*

---

## 38. Error States & Edge Cases

### 38.1 Network & Connection Errors

| Scenario | UI Behaviour |
|----------|-------------|
| SSE disconnected | Amber banner: "Real-time updates paused. Checking connection..." |
| SSE reconnected | Banner disappears, silent data refresh |
| API call fails (network) | Toast: "Connection error. Please check your internet." + retry button |
| API call fails (server 500) | Toast: "Something went wrong. Please try again." + retry button |
| API call fails (403) | Redirect to login (session expired) |
| Slow network (> 5s response) | Loading skeleton + "Taking longer than usual..." text |

### 38.2 Data Edge Cases

| Scenario | UI Behaviour |
|----------|-------------|
| No lab orders exist | Empty state: illustration + "No lab orders yet. Orders appear when doctors request blood work." |
| No deliveries exist | Empty state: illustration + "No delivery orders yet. Orders appear when doctors create prescriptions." |
| No partners added | Empty state: illustration + "No [nurses/labs/pharmacies] added yet. [+ Add your first one]" |
| Nurse at max capacity | Shown in assignment modal with ⚠️ "At capacity (5/5 today)" — still selectable with warning |
| Lab doesn't offer all required tests | Shown with partial match: "5/6 tests — Missing: DHT" |
| Pharmacy stock issue mid-preparation | Pharmacy marks as "Stock Issue" → admin sees in Issues tab → options: find alternative pharmacy, contact doctor for substitute |
| Delivery person unresponsive | Delivery link expires after 24h → admin reschedules with new delivery person |
| Duplicate assignment attempt | Warning: "This nurse is already assigned to this order." |
| Concurrent admin sessions | Last-write-wins for edits, SSE keeps both sessions in sync for reads |

### 38.3 Destructive Action Confirmations

All destructive actions require confirmation modal:

| Action | Confirmation Text |
|--------|-------------------|
| Cancel lab order | "Cancel this lab order? The patient and doctor will be notified. Reason: [required field]" |
| Cancel delivery | "Cancel this delivery? Reason: [required field]" |
| Deactivate partner | "Deactivate [Name]? They won't receive new assignments but existing work continues." |
| Deactivate user account | "Deactivate this account? The user will be unable to log in." |
| Approve refund | "Process refund of ₹[amount] to [patient]? This triggers a Razorpay refund." |
| Change SLA threshold | "Changing this threshold affects all future SLA checks. Current breaches won't be recalculated." |

*(Source: PORTAL-ADMIN.md §37)*

---

## 39. Desktop vs Mobile Workflow Differences

### 39.1 Breakpoints

| Breakpoint | Layout | Navigation |
|------------|--------|------------|
| < 640px (mobile) | Single column, cards stack | Bottom nav (5 tabs) |
| 640px–1023px (tablet) | Wider cards, 2-column grids | Bottom nav |
| ≥ 1024px (desktop) | Sidebar + main content, split panes | Sidebar |

### 39.2 Desktop-Only Features

**Split-pane view (Lab Orders & Deliveries):** List on left, detail on right — no need to navigate to a separate page.

**Bulk actions (toolbar):**
- Select multiple lab orders → "Assign Nurse to All" (same nurse for batch in same area)
- Select multiple deliveries → "Send All to Same Pharmacy" (batch dispatch)
- Checkbox selection on each card, toolbar appears when ≥ 1 selected

**Charts panel:** Overview shows interactive charts (revenue trend, daily orders, SLA compliance) — hidden on mobile for performance.

**Activity feed filters:** Desktop shows filter bar above the feed (severity, type, time range).

### 39.3 Mobile-Only Optimisations

- Touch targets: minimum 44×44px for all tappable elements
- Swipe gestures: swipe left on lab order card → quick actions (Assign Nurse / Escalate)
- Pull-to-refresh on all list screens
- Bottom sheet modals (slide up from bottom) instead of centred modals
- Sticky filter tabs (stay visible during scroll)
- FAB (floating action button) on Partners screen for "Add New" quick action

*(Source: PORTAL-ADMIN.md §36)*

---

## 40. Cross-Portal Integration Map

### 40.1 How Admin Actions Cascade Across Portals

**Onboarding actions:**

| Admin Action | Affected Portal | Effect |
|-------------|----------------|--------|
| Create doctor account | Doctor portal (`doctor.onlyou.life`) | Doctor can log in via OTP, sees case queue, receives WhatsApp welcome message |
| Create nurse account | Nurse portal (`nurse.onlyou.life`) | Nurse can log in via OTP, sees Today's Assignments, receives WhatsApp welcome message |
| Create lab account | Lab portal (`lab.onlyou.life`) | Lab tech can log in via OTP, sees Sample Tracking, receives WhatsApp welcome message |
| Create pharmacy account | Pharmacy portal (`pharmacy.onlyou.life`) | Pharmacy staff can log in via OTP, sees New Orders tab, receives WhatsApp welcome message |
| Create referral clinic | No portal | Clinic receives referral notifications via email/WhatsApp |

**Operational actions:**

| Admin Action | Affected Portals | Effect |
|-------------|-----------------|--------|
| Assign nurse to lab order | Nurse portal | New assignment appears in Today's Assignments |
| Assign lab to lab order | Lab portal | Order visible in Incoming queue (after nurse delivers) |
| Send order to pharmacy | Pharmacy portal | New order appears in New Orders tab |
| Arrange delivery | Patient app | Delivery tracking + OTP display activated |
| Approve refund | Patient app | Refund notification + wallet credit (if wallet) |
| Reassign doctor | Doctor portal | New case appears in reassigned doctor's queue |
| Remind doctor | Doctor portal | Push + WhatsApp notification |
| Deactivate nurse | Nurse portal | Login blocked for future sessions |
| Deactivate lab | Lab portal | Login blocked for future sessions |
| Deactivate doctor | Doctor portal | Login blocked (403 error), must be manually reassigned for active cases |
| Change SLA thresholds | All portals (indirectly) | SLA indicators update on next check cycle |
| Toggle feature flag | Patient app + landing page | Feature enabled/disabled in real-time |
| Change subscription pricing | Patient app | New pricing shown for new subscriptions |
| Edit notification template | All portals | Future notifications use new template text |

### 40.2 Notification Cascade — Who Gets Notified for Each Admin Action

| Admin Action | Patient Notified? | Doctor Notified? | Nurse Notified? | Lab Notified? | Pharmacy Notified? |
|-------------|-------------------|------------------|-----------------|---------------|-------------------|
| Create doctor account | ❌ | ✅ WhatsApp welcome + email (optional) | ❌ | ❌ | ❌ |
| Create nurse account | ❌ | ❌ | ✅ WhatsApp welcome | ❌ | ❌ |
| Create lab account | ❌ | ❌ | ❌ | ✅ WhatsApp welcome | ❌ |
| Create pharmacy account | ❌ | ❌ | ❌ | ❌ | ✅ WhatsApp welcome |
| Assign nurse | ✅ Push | ❌ | ✅ Push + WhatsApp | ❌ | ❌ |
| Assign lab | ❌ | ❌ | ❌ | ❌ (sees order on sample delivery) | ❌ |
| Send to pharmacy | ❌ | ❌ | ❌ | ❌ | ✅ Push + WhatsApp |
| Arrange delivery | ✅ Push + WhatsApp | ❌ | ❌ | ❌ | ❌ |
| Create recollection | ✅ Push + WhatsApp | ✅ Portal notification | ❌ | ❌ | ❌ |
| Approve refund | ✅ Push + WhatsApp | ✅ Portal notification | ❌ | ❌ | ❌ |
| Cancel lab order | ✅ Push + WhatsApp | ✅ Portal notification | ✅ (if assigned) | ❌ | ❌ |
| Cancel delivery | ✅ Push + WhatsApp | ❌ | ❌ | ❌ | ✅ (if assigned) |

*(Source: All portal and workflow documents cross-referenced)*

---

## 41. Phase 2 — Scaffolded Workflows (Muted)

The following workflows are scaffolded in the codebase (routes exist, UI shells present) but greyed out or hidden behind feature flags:

### 41.1 Multi-Admin Team

- Sub-roles: Ops Manager, Finance Admin, Partner Manager
- Permission matrix per sub-role
- Activity feed filtered by sub-role scope
- Handoff workflows between admin team members

### 41.2 Automated Assignment

- Nurse auto-assignment based on proximity, availability, and workload balancing
- Pharmacy auto-assignment based on stock availability, proximity, and turnaround
- Doctor auto-assignment already exists (round-robin with specialisation matching) — Phase 2 adds smarter load balancing

### 41.3 Video Consultation Management

- Schedule video calls
- Monitor active video sessions
- Handle technical issues during video calls

### 41.4 Advanced Analytics

- Cohort analysis (retention by vertical, acquisition channel)
- Doctor performance scoring
- Partner performance scorecards
- Predictive SLA risk scoring

### 41.5 Delivery Tracking Integration

- Rapido/Dunzo API integration for real-time delivery tracking
- Automated delivery arrangement (no manual step)
- Delivery person performance tracking

*(Source: PORTAL-ADMIN.md §41 implied; PROJECT-OVERVIEW.md Phase 2 scope)*

---

## 42. Known Issues & Fixes from Verification Reports

### 42.1 Issues Identified in Cross-Document Verification

| Issue ID | Description | Status | Fix Reference |
|----------|-------------|--------|---------------|
| CRITICAL-1 | SLA thresholds in PORTAL-ADMIN.md §30 may not match BACKEND-PART2B.md §18.3 for some values | Fixed | FIXES-CHANGELOG.md |
| DISCREPANCY-ADMIN-1 | BACKEND-PART3B.md §30.1 admin router missing `createUser`/`createDoctor` mutation. WORKFLOW-DOCTOR-PART1.md §2 references `trpc.admin.users.create.mutate()` but the route map only lists `createPartner`, `getUsers`, `activateUser`, `deactivateUser`. Backend route map needs updating. | Identified | BACKEND-PART3B.md §30.1, WORKFLOW-DOCTOR-PART1.md §2 |
| DISCREPANCY-ADMIN-2 | PORTAL-ADMIN.md §23 (User Management) documents list/activate/deactivate only, but §38.1 confirms admin can "Create" doctor accounts. The User Management UI spec needs a `[+ Add User]` button and doctor creation form added. | Identified | PORTAL-ADMIN.md §23, §38.1 |
| WORKFLOW-PHARM-1 | `preparingAt` vs `preparingStartedAt` field naming inconsistency between documents | Identified | WORKFLOW-PHARMACY.md §21.3 |
| WORKFLOW-PHARM-2 | JWT role claim pre/post-fix inconsistency across documents | Identified | WORKFLOW-PHARMACY.md §21.3 |
| WORKFLOW-PHARM-3 | Delivery completion SLA corrected from 2h to 24h | Fixed | BACKEND-PART2B.md §18.3 |
| WORKFLOW-PHARM-4 | Consultation status `PRESCRIBED` vs `PRESCRIPTION_CREATED` naming | Fixed | BACKEND-ALL-CHANGES.md |
| PA-STATUS-1 | Admin portal needs 6 new consultation statuses for pay-after-doctor flow | Documented | REMAINING-DOCS-CHANGES.md PA-1 through PA-4 |
| ARCH-1 | ARCHITECTURE.md Consultation status enum needs pay-after-doctor updates | Documented | REMAINING-DOCS-CHANGES.md ARCH-1 |

### 42.2 Discrepancies to Watch During Development

- Field naming conventions: always use the canonical name from BACKEND-PART2A.md for database fields
- Status enum values: always use the canonical enum from BACKEND-ALL-CHANGES.md (Change B1-1)
- SLA threshold values: always use BACKEND-PART2B.md §18.3 as the source of truth
- Notification module location: BACKEND-PART2A.md §15 (not BACKEND-PART2B as some docs stated — corrected)

*(Source: WORKFLOW-PHARMACY.md §21.3; FIXES-CHANGELOG.md; REMAINING-DOCS-CHANGES.md; backend-errors-report.md)*

---

## 43. Cross-Reference Index

### 43.1 Documents Referenced by This Workflow

| Document | Sections Referenced | Why |
|----------|--------------------|----|
| PORTAL-ADMIN.md | §1–39 (full document) | Primary source — admin portal UI specification |
| ARCHITECTURE.md | SSE system, Redis Pub/Sub, BullMQ, CASL.js | Technical architecture underpinning all real-time and security features |
| BACKEND-PART1.md | Auth (§4), Doctor module (§9) | Authentication and API endpoints |
| BACKEND-PART2A.md | Lab orders (§12), Orders (§11), Notifications (§15) | Backend services for lab and delivery pipelines |
| BACKEND-PART2B.md | SSE (§16), SLA engine (§18), BullMQ queues (§19), File storage (§20) | Real-time, SLA, background jobs, file handling |
| BACKEND-PART3A.md | CASL.js rules (§22.4), Audit logging (§21.9), Seed data (§25) | Permissions, audit, initial setup |
| BACKEND-PART3B.md | Full tRPC router tree (§30.1), Status flows (§30.6) | API structure and status state machines |
| APP-PATIENT.md | Delivery tracking (§14), Lab booking (§13), Payment (§13) | Patient-side workflows that admin monitors |
| PORTAL-DOCTOR.md | Prescription builder (§12), Case review (§5–11) | Doctor workflows that admin oversees |
| PORTAL-NURSE-FIXED.md | Today's assignments (§8), Visit execution (§9–14) | Nurse workflows that admin assigns and monitors |
| PORTAL-LAB-FIXED.md | Sample receipt (§6–7), Results upload (§8) | Lab workflows that admin monitors |
| PORTAL-PHARMACY.md | New orders (§6), Preparation (§7), Ready (§8) | Pharmacy workflows that admin sends to and monitors |
| WORKFLOW-PATIENT.md | Full patient journey (§1–42) | End-to-end patient experience that admin supports |
| WORKFLOW-DOCTOR-PART1/2/3.md | Doctor workflows (§1–43) | Doctor workflows that admin oversees and escalates |
| WORKFLOW-NURSE-PART1/2/3.md | Nurse workflows (§1–30) | Nurse workflows that admin assigns and monitors |
| WORKFLOW-LAB.md | Lab workflows (§1–22) | Lab workflows that admin monitors |
| WORKFLOW-PHARMACY.md | Pharmacy workflows (§1–22) | Pharmacy workflows that admin sends to and monitors |
| WORKFLOW-DELIVERY.md | Delivery workflows (§1–28) | Delivery pipeline that admin orchestrates, delivery person SMS link flow, OTP confirmation |
| REMAINING-DOCS-CHANGES.md | PA-1 through PA-4 | Pay-after-doctor changes to admin portal |
| BACKEND-ALL-CHANGES.md | B1-1 (canonical status enum) | Definitive consultation status enumeration |
| FIXES-CHANGELOG.md | All fixes | Resolved discrepancies affecting admin workflows |
| VERTICAL-HAIR-LOSS.md | Blood panels, prescription templates | Vertical-specific content admin sees in orders |
| VERTICAL-ED.md | Prescription templates | Vertical-specific content admin sees in orders |
| VERTICAL-PE.md | Blood panels, prescription templates | Vertical-specific content admin sees in orders |
| VERTICAL-WEIGHT.md | Blood panels, prescription templates | Vertical-specific content admin sees in orders |
| VERTICAL-PCOS-PART1/2/3.md | Blood panels (§9), prescription templates | Vertical-specific content admin sees in orders |
| onlyou-spec-resolved-v4.md | Build phases (Phase 4: Week 11–14) | Admin portal development timeline |

### 43.2 Canonical Status Enums (Admin Must Know)

**Consultation statuses (full canonical enum — BACKEND-ALL-CHANGES.md B1-1):**
```
SUBMITTED → AI_PROCESSING → AI_COMPLETE → ASSIGNED → REVIEWING →
  PRESCRIBED / PRESCRIPTION_CREATED → AWAITING_PAYMENT → PAYMENT_COMPLETE →
  PHARMACY_PROCESSING → DISPATCHED → DELIVERED → TREATMENT_ACTIVE →
  FOLLOW_UP_DUE → COMPLETED

Terminal exits: REFERRED, DECLINED, EXPIRED_UNPAID, CANCELLED, AI_FAILED, ABANDONED
```

**Lab order statuses:**
```
ORDERED → SLOT_BOOKED → NURSE_ASSIGNED → NURSE_EN_ROUTE → NURSE_ARRIVED →
  SAMPLE_COLLECTED → AT_LAB → PROCESSING → RESULTS_READY → DOCTOR_REVIEWED → CLOSED

Exits: CANCELLED, RECOLLECTION_NEEDED, RESULTS_UPLOADED (self-upload path)
```

**Delivery/Order statuses:**
```
CREATED → SENT_TO_PHARMACY → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED

Exits: PHARMACY_ISSUE, DELIVERY_FAILED, REASSIGNED, CANCELLED
```

---

*End of WORKFLOW-ADMIN.md — Admin/Coordinator Complete Workflow Reference*

*This document covers every admin workflow from account provisioning to daily operations, including lab order pipeline management, delivery pipeline management, partner coordination, refund approval, SLA enforcement, system configuration, real-time monitoring, and all edge cases. For the portal UI specification, see PORTAL-ADMIN.md. For the backend implementation, see BACKEND-PART1.md (auth), BACKEND-PART2A.md (lab orders, orders), BACKEND-PART2B.md (SSE, SLA, BullMQ), BACKEND-PART3A.md (CASL, audit), BACKEND-PART3B.md (tRPC router tree). For cross-portal workflow context, see WORKFLOW-PATIENT.md, WORKFLOW-DOCTOR-PART1/2/3.md, WORKFLOW-NURSE-PART1/2/3.md, WORKFLOW-LAB.md, and WORKFLOW-PHARMACY.md.*

*v1.1 — Updated 2026-03-03. Added comprehensive onboarding coverage: §20A (Onboarding Overview matrix), §20B (Doctor Account Onboarding with full workflow, edge cases, API, and profile management). Expanded §25 (User Management) to include user creation, delivery person clarification. Added §40 onboarding cascade actions. Flagged DISCREPANCY-ADMIN-1 (backend route map missing createUser) and DISCREPANCY-ADMIN-2 (PORTAL-ADMIN.md §23 missing doctor creation form). Incorporates all pay-after-doctor changes from REMAINING-DOCS-CHANGES.md (PA-1 through PA-4), all fixes from FIXES-CHANGELOG.md, and all known discrepancies from WORKFLOW-PHARMACY.md §21.3.*
