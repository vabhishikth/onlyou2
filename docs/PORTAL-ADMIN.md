# PORTAL-ADMIN.md — Admin/Coordinator Dashboard: Complete Specification

> **Platform:** Onlyou Telehealth — Indian telehealth for stigmatized chronic conditions
> **Portal Type:** Next.js 14 (App Router) — Mobile-first, desktop-responsive web application
> **URL:** `admin.onlyou.life`
> **Auth:** Phone OTP (WhatsApp primary, SMS fallback) → JWT (role: `admin`)
> **Navigation:** Bottom navigation (mobile) / Sidebar (desktop)
> **API Protocol:** tRPC (end-to-end type-safe, no codegen)
> **State Management:** Zustand + TanStack Query (tRPC integration)
> **Routing:** Next.js App Router (file-based)
> **Real-time:** SSE + Redis Pub/Sub (server → client push for all system events)
> **Primary Device:** Mobile phone (founder/coordinator manages operations on the go)

---

## Table of Contents

1. [App Structure & File Layout](#1-app-structure--file-layout)
2. [Authentication & Session Management](#2-authentication--session-management)
3. [Navigation & Layout](#3-navigation--layout)
4. [Screen 1: Overview (Default Landing)](#4-screen-1-overview-default-landing)
5. [Activity Feed (Deep Dive)](#5-activity-feed-deep-dive)
6. [Screen 2: Lab Orders](#6-screen-2-lab-orders)
7. [Lab Order Detail View](#7-lab-order-detail-view)
8. [Nurse Assignment Flow](#8-nurse-assignment-flow)
9. [Lab Assignment Flow](#9-lab-assignment-flow)
10. [Recollection Flow](#10-recollection-flow)
11. [Screen 3: Deliveries](#11-screen-3-deliveries)
12. [Delivery Detail View](#12-delivery-detail-view)
13. [Send to Pharmacy Flow](#13-send-to-pharmacy-flow)
14. [Arrange Delivery Flow](#14-arrange-delivery-flow)
15. [Delivery Manual Override](#15-delivery-manual-override)
16. [Auto-Reorder Management](#16-auto-reorder-management)
17. [Screen 4: Partners](#17-screen-4-partners)
18. [Partner: Nurses Management](#18-partner-nurses-management)
19. [Partner: Diagnostic Centres Management](#19-partner-diagnostic-centres-management)
20. [Partner: Pharmacies Management](#20-partner-pharmacies-management)
21. [Partner: Referral Clinics Management](#21-partner-referral-clinics-management)
22. [Screen 5: Settings](#22-screen-5-settings)
23. [Settings: User Management](#23-settings-user-management)
24. [Settings: Subscription Plans](#24-settings-subscription-plans)
25. [Settings: Notification Templates](#25-settings-notification-templates)
26. [Settings: Questionnaire Management](#26-settings-questionnaire-management)
27. [Settings: Feature Flags](#27-settings-feature-flags)
28. [Settings: Financial Dashboard](#28-settings-financial-dashboard)
29. [Settings: Audit Log](#29-settings-audit-log)
30. [Settings: SLA Configuration](#30-settings-sla-configuration)
31. [Refund Approval Flow](#31-refund-approval-flow)
32. [Consultation Oversight](#32-consultation-oversight)
33. [SLA Engine & Escalation System](#33-sla-engine--escalation-system)
34. [Real-Time System (Admin Portal)](#34-real-time-system-admin-portal)
35. [Notification System (Admin)](#35-notification-system-admin)
36. [Responsive Design & Desktop Enhancements](#36-responsive-design--desktop-enhancements)
37. [Error States & Edge Cases](#37-error-states--edge-cases)
38. [Security & Privacy](#38-security--privacy)
39. [Analytics Events](#39-analytics-events)

---

## 1. App Structure & File Layout

### Next.js App Router Structure

```
apps/admin-portal/
├── src/
│   ├── app/
│   │   ├── layout.tsx              → Root layout (nav, auth provider, SSE provider)
│   │   ├── page.tsx                → Overview dashboard (default landing)
│   │   ├── login/
│   │   │   └── page.tsx            → Phone OTP login screen
│   │   ├── lab-orders/
│   │   │   ├── page.tsx            → Lab orders pipeline
│   │   │   └── [id]/
│   │   │       └── page.tsx        → Lab order detail view
│   │   ├── deliveries/
│   │   │   ├── page.tsx            → Delivery pipeline
│   │   │   └── [id]/
│   │   │       └── page.tsx        → Delivery detail view
│   │   ├── partners/
│   │   │   ├── page.tsx            → Partner management (tabbed: nurses, labs, pharmacies, clinics)
│   │   │   ├── nurses/
│   │   │   │   ├── page.tsx        → Nurse list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx    → Add new nurse
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx    → Nurse detail/edit
│   │   │   ├── labs/
│   │   │   │   ├── page.tsx        → Diagnostic centre list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx    → Add new lab
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx    → Lab detail/edit
│   │   │   ├── pharmacies/
│   │   │   │   ├── page.tsx        → Pharmacy list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx    → Add new pharmacy
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx    → Pharmacy detail/edit
│   │   │   └── clinics/
│   │   │       ├── page.tsx        → Referral clinic list
│   │   │       ├── new/
│   │   │       │   └── page.tsx    → Add new clinic
│   │   │       └── [id]/
│   │   │           └── page.tsx    → Clinic detail/edit
│   │   └── settings/
│   │       ├── page.tsx            → Settings hub
│   │       ├── users/
│   │       │   └── page.tsx        → User management
│   │       ├── plans/
│   │       │   └── page.tsx        → Subscription plans
│   │       ├── notifications/
│   │       │   └── page.tsx        → Notification templates
│   │       ├── questionnaires/
│   │       │   └── page.tsx        → Questionnaire schema viewer (read-only)
│   │       ├── feature-flags/
│   │       │   └── page.tsx        → Feature flag toggles
│   │       ├── financial/
│   │       │   └── page.tsx        → Revenue, payments, refunds, wallet
│   │       ├── audit-log/
│   │       │   └── page.tsx        → Searchable audit log
│   │       └── sla/
│   │           └── page.tsx        → SLA threshold configuration
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx       → Mobile bottom navigation (5 tabs)
│   │   │   ├── Sidebar.tsx         → Desktop sidebar navigation
│   │   │   └── TopBar.tsx          → Mobile top bar (logo, notification bell, SLA badge)
│   │   ├── overview/
│   │   │   ├── MetricsCards.tsx    → KPI metric cards grid
│   │   │   ├── ActivityFeed.tsx    → Real-time system event feed
│   │   │   └── ActivityFeedItem.tsx → Individual feed event
│   │   ├── lab-orders/
│   │   │   ├── LabOrderList.tsx    → Filterable lab order list
│   │   │   ├── LabOrderCard.tsx    → Individual lab order card
│   │   │   ├── LabOrderDetail.tsx  → Full lab order detail with timeline
│   │   │   ├── NurseAssignModal.tsx → Nurse assignment dropdown modal
│   │   │   ├── LabAssignModal.tsx  → Lab assignment dropdown modal
│   │   │   └── SLABanner.tsx       → Sticky SLA breach banner
│   │   ├── deliveries/
│   │   │   ├── DeliveryList.tsx    → Filterable delivery list
│   │   │   ├── DeliveryCard.tsx    → Individual delivery card
│   │   │   ├── DeliveryDetail.tsx  → Full delivery detail with timeline
│   │   │   ├── SendToPharmacyModal.tsx → Pharmacy assignment modal
│   │   │   ├── ArrangeDeliveryModal.tsx → Delivery person + SMS link modal
│   │   │   ├── ManualOverrideModal.tsx → Manual delivery confirmation
│   │   │   └── AutoReorderSection.tsx → Upcoming auto-reorder list
│   │   ├── partners/
│   │   │   ├── PartnerTabs.tsx     → Tab switcher (Nurses | Labs | Pharmacies | Clinics)
│   │   │   ├── NurseList.tsx       → Nurse partner list
│   │   │   ├── NurseForm.tsx       → Add/edit nurse form
│   │   │   ├── LabList.tsx         → Diagnostic centre list
│   │   │   ├── LabForm.tsx         → Add/edit lab form
│   │   │   ├── PharmacyList.tsx    → Pharmacy list
│   │   │   ├── PharmacyForm.tsx    → Add/edit pharmacy form
│   │   │   ├── ClinicList.tsx      → Referral clinic list
│   │   │   └── ClinicForm.tsx      → Add/edit clinic form
│   │   ├── settings/
│   │   │   ├── UserManagement.tsx  → User role list with activate/deactivate
│   │   │   ├── PlanEditor.tsx      → Subscription plan pricing editor
│   │   │   ├── NotificationTemplateEditor.tsx → SMS/WhatsApp/email/push template editor
│   │   │   ├── QuestionnaireViewer.tsx → Read-only questionnaire schema viewer
│   │   │   ├── FeatureFlagToggles.tsx → Feature flag switch list
│   │   │   ├── FinancialDashboard.tsx → Revenue, payments, refunds
│   │   │   ├── AuditLogViewer.tsx  → Searchable, filterable audit log
│   │   │   └── SLAConfigEditor.tsx → SLA threshold editor
│   │   ├── shared/
│   │   │   ├── StatusBadge.tsx     → Color-coded status badges
│   │   │   ├── SLAIndicator.tsx    → Green/amber/red SLA traffic light
│   │   │   ├── Timeline.tsx        → Vertical status history timeline
│   │   │   ├── ConfirmModal.tsx    → Destructive action confirmation
│   │   │   ├── SearchBar.tsx       → Universal search with filters
│   │   │   ├── EmptyState.tsx      → Empty list states
│   │   │   └── RefundApprovalModal.tsx → Refund approve/reject modal
│   │   └── charts/
│   │       ├── RevenueChart.tsx    → Revenue trend line chart (desktop)
│   │       ├── OrderVolumeChart.tsx → Daily order volume bar chart (desktop)
│   │       └── SLAComplianceChart.tsx → SLA compliance percentage (desktop)
│   ├── hooks/
│   │   ├── useSSE.ts              → SSE connection with reconnect logic
│   │   ├── useLabOrders.ts        → Lab order data + mutations
│   │   ├── useDeliveries.ts       → Delivery data + mutations
│   │   ├── usePartners.ts         → Partner CRUD operations
│   │   ├── useActivityFeed.ts     → Real-time activity feed
│   │   ├── useMetrics.ts          → Overview KPI data
│   │   ├── useSLAAlerts.ts        → SLA breach tracking
│   │   └── useRefundApprovals.ts  → Pending refund requests
│   ├── stores/
│   │   ├── auth.store.ts          → Admin auth state (JWT, session)
│   │   ├── navigation.store.ts    → Active tab, sidebar collapsed state
│   │   ├── notifications.store.ts → Unread notification count
│   │   └── filters.store.ts       → Persisted filter/sort preferences per screen
│   ├── lib/
│   │   ├── trpc.ts                → tRPC client config (admin router)
│   │   ├── sse.ts                 → SSE client with reconnect + Last-Event-ID
│   │   └── utils.ts               → Formatting (dates, currency, phone)
│   └── types/
│       └── index.ts               → Shared TypeScript types (inferred from tRPC, plus UI types)
├── public/
│   ├── manifest.json              → PWA manifest (for mobile home-screen install)
│   └── sw.js                      → Service worker (offline banner, push notifications)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 14.x | App Router, SSR/SSG |
| `react` | 18.x | UI framework |
| `@trpc/client` | 11.x | Type-safe API client |
| `@trpc/react-query` | 11.x | tRPC + TanStack Query integration |
| `@tanstack/react-query` | 5.x | Server state management, caching |
| `zustand` | 4.x | Client state management |
| `tailwindcss` | 3.x | Utility-first CSS |
| `recharts` | 2.x | Dashboard charts (desktop) |
| `date-fns` | 3.x | Date formatting, relative times |
| `sonner` | 1.x | Toast notifications |
| `lucide-react` | 0.x | Icon library |

---

## 2. Authentication & Session Management

### 2.1 Admin Provisioning

**Admins are NOT self-registered.** Admin accounts are provisioned directly in the database by the system (for MVP, the founder is the sole admin — seeded during initial deployment).

**Provisioning:**
1. Admin phone number is added to the `User` table with `role: ADMIN`
2. Admin navigates to `admin.onlyou.life` → enters phone → OTP → logged in
3. First-time login: admin lands on `/` (overview dashboard)

**Edge case — unprovisioned phone tries to log in:**
- OTP is sent (to prevent phone enumeration attacks) → after verification, server returns 403: "This phone number is not registered as an administrator account."
- The user sees: "Account not found. This portal is for authorized administrators only."

### 2.2 Login Flow

**Screen:** `login/page.tsx`

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

**OTP verification:** Same pattern as doctor portal — 6-digit code, WhatsApp primary / SMS fallback, 5-minute TTL, 3 requests per 15 minutes rate limit.

### 2.3 Session Management

| Parameter | Value |
|-----------|-------|
| Access token | JWT, 15-minute expiry, HttpOnly cookie |
| Refresh token | Opaque, 30-day expiry, HttpOnly cookie |
| Token rotation | Every refresh generates new token pair |
| Idle timeout | 8 hours (longer than doctor — admin may check intermittently) |
| Concurrent sessions | Allowed (phone + laptop simultaneously) |
| Theft detection | Old refresh token reuse → all tokens revoked |

**Why 8-hour idle timeout:** The coordinator checks the dashboard sporadically throughout the day from their phone. A shorter timeout would cause excessive re-authentication friction.

### 2.4 Role Guard

All admin portal routes are protected by `AdminGuard` middleware:
- Checks JWT role claim is `ADMIN`
- Returns 403 if role mismatch
- Redirect to `/login` if no valid session

---

## 3. Navigation & Layout

### 3.1 Mobile Layout (< 1024px) — Primary

```
┌──────────────────────────────────────┐
│  🏥 Onlyou Admin    🔔 (3)   ⚠️ (2) │
├──────────────────────────────────────┤
│                                      │
│                                      │
│           MAIN CONTENT               │
│           (full width)               │
│                                      │
│                                      │
│                                      │
│                                      │
├──────────────────────────────────────┤
│ Overview │ Lab    │ Deliver │Partners│ ⚙️  │
│    📊    │ Orders │  ies    │  🤝   │    │
│          │  🔬   │  📦    │       │    │
└──────────────────────────────────────┘
```

**Top bar:**
- Onlyou Admin logo (left)
- Notification bell with unread count badge (right)
- SLA breach count badge — red, always visible when breaches > 0 (right of bell)

**Bottom navigation — 5 tabs:**

| Tab | Icon | Route | Badge |
|-----|------|-------|-------|
| Overview | 📊 (chart bar) | `/` | — |
| Lab Orders | 🔬 (microscope) | `/lab-orders` | Red count of `NEEDS_ASSIGNMENT` + `OVERDUE` |
| Deliveries | 📦 (package) | `/deliveries` | Red count of `NEW` + `ISSUES` |
| Partners | 🤝 (handshake) | `/partners` | — |
| Settings | ⚙️ (gear) | `/settings` | Red dot if pending refund approvals |

**Active tab:** Filled icon + label highlighted with brand accent color.

### 3.2 Desktop Layout (≥ 1024px)

```
┌──────────┬───────────────────────────────────────────────┐
│          │                                               │
│  SIDEBAR │              MAIN CONTENT                     │
│  (240px) │              (remaining width)                │
│          │                                               │
│  Logo    │                                               │
│          │                                               │
│  Overview│                                               │
│          │                                               │
│  Lab     │                                               │
│  Orders  │                                               │
│  (badge) │                                               │
│          │                                               │
│  Deliver-│                                               │
│  ies     │                                               │
│  (badge) │                                               │
│          │                                               │
│  Partners│                                               │
│          │                                               │
│  ─────── │                                               │
│          │                                               │
│  Settings│                                               │
│  (dot)   │                                               │
│          │                                               │
│  ─────── │                                               │
│  Admin   │                                               │
│  Logout  │                                               │
│          │                                               │
└──────────┴───────────────────────────────────────────────┘
```

**Desktop sidebar behavior:**
- Collapsible: click collapse button → shrinks to 64px icon-only mode
- Collapsed state persisted in `localStorage`
- Active route highlighted with left border accent + background shade
- Badges update in real-time via SSE

**Desktop enhancements (applied globally):**
- Split-pane view on Lab Orders and Deliveries: list on left, detail on right
- Dashboard charts on Overview (revenue trend, daily orders, SLA compliance %)
- Bulk action buttons (assign nurse to multiple orders, send multiple prescriptions to same pharmacy)

---

## 4. Screen 1: Overview (Default Landing)

**Route:** `/`
**Purpose:** Real-time operational snapshot — the nerve center of the entire platform.

### 4.1 Metrics Cards (Top Section)

Six KPI cards displayed in a 2×3 grid (mobile) or single row (desktop):

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ 👤 142   │  │ 📋 8     │  │ 🔬 12    │                  │
│  │ Active   │  │ Pending  │  │ Lab      │                  │
│  │ Patients │  │ Review   │  │ Orders   │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ 📦 5     │  │ ⚠️ 3     │  │ ₹12,450  │                  │
│  │ Deliveries│  │ SLA      │  │ Today's  │                  │
│  │ Active   │  │ Breaches │  │ Revenue  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

| Metric | Data Source | Tap Action | Refresh |
|--------|-------------|------------|---------|
| Active Patients | Count of users with ≥1 active subscription | — (informational) | Every 5 min |
| Consultations Pending Review | Count where status = `AI_COMPLETE` or `ASSIGNED` but doctor hasn't actioned | Navigate to filtered consultation list | Real-time (SSE) |
| Lab Orders in Progress | Count where status ∈ [`ORDERED`, `SLOT_BOOKED`, `NURSE_ASSIGNED`, `SAMPLE_COLLECTED`, `AT_LAB`, `PROCESSING`] | Navigate to `/lab-orders` | Real-time (SSE) |
| Deliveries in Progress | Count where status ∈ [`CREATED`, `SENT_TO_PHARMACY`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`] | Navigate to `/deliveries` | Real-time (SSE) |
| SLA Breaches | Count of active SLA violations across all pipelines | Navigate to SLA breach summary view | Real-time (SSE) |
| Today's Revenue | Sum of Razorpay payments received today (IST timezone) | Navigate to `/settings/financial` | Every 15 min |

**SLA Breaches card:** Always red background when count > 0. Pulses gently to draw attention.

### 4.2 Activity Feed (Below Metrics)

Real-time feed of all system events. This is the coordinator's primary way to stay on top of operations.

Full deep dive in [Section 5](#5-activity-feed-deep-dive).

### 4.3 Desktop Additions: Charts Panel

On desktop (≥ 1024px), below the metrics cards and beside the activity feed:

```
┌──────────────────────────────┬────────────────────────────┐
│                              │                            │
│  📈 Daily Orders (7 days)    │  💰 Revenue Trend (30 days)│
│  [Bar chart]                 │  [Line chart]              │
│                              │                            │
├──────────────────────────────┴────────────────────────────┤
│                                                           │
│  📊 SLA Compliance (30 days)                              │
│  [Percentage gauge: 94% on-time | 4% amber | 2% breach]  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Chart data:** Fetched via `trpc.admin.analytics.getOverviewCharts.useQuery()` — server computes aggregates.

---

## 5. Activity Feed (Deep Dive)

### 5.1 Feed Architecture

The activity feed is a reverse-chronological stream of system events, delivered via SSE. Each event is stored in the `SystemEvent` table and pushed to connected admin clients in real-time.

**Data model:**
```
SystemEvent
  ├── id (UUID)
  ├── type (enum — see below)
  ├── severity (enum: INFO | WARNING | CRITICAL)
  ├── title (text — human-readable summary)
  ├── resourceType (enum: CONSULTATION | LAB_ORDER | ORDER | PARTNER | REFUND | SYSTEM)
  ├── resourceId (UUID — links to the relevant record)
  ├── metadata (JSONB — event-specific details)
  ├── readAt (timestamp | null)
  └── createdAt (timestamp)
```

### 5.2 Event Types

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

### 5.3 Feed UI

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
│  ─────────────────────────────────────────────── │
│                                                  │
│  [Load more]                                     │
└──────────────────────────────────────────────────┘
```

**Feed behavior:**
- New events slide in at the top with a subtle animation
- CRITICAL events have red left border + bold text
- WARNING events have amber left border
- INFO events have no left border (standard)
- Unread events have a blue dot indicator (left of timestamp)
- Tap any event → navigates to the relevant detail view
- "Mark all read" button clears all blue dots
- Paginated: initial load = 30 events, then "Load more" in batches of 30
- Events older than 30 days auto-archive (not shown in feed, available in audit log)

### 5.4 Feed Filters (Desktop Only)

On desktop, a filter bar appears above the feed:

| Filter | Options |
|--------|---------|
| Severity | All / Critical only / Warning + Critical |
| Type | All / Consultations / Lab Orders / Deliveries / Payments / SLA |
| Time | Today / Last 24h / Last 7 days |

---

## 6. Screen 2: Lab Orders

**Route:** `/lab-orders`
**Purpose:** Manage the entire blood work pipeline — from doctor ordering to results uploaded.

### 6.1 Filter Tabs

Horizontal scrollable filter chips (mobile) or tab bar (desktop):

| Filter | Criteria | Badge |
|--------|----------|-------|
| All | All lab orders | Total count |
| Needs Assignment | Status = `ORDERED` or `SLOT_BOOKED` with no nurse/lab assigned | Red count |
| In Progress | Status ∈ [`NURSE_ASSIGNED`, `SAMPLE_COLLECTED`, `AT_LAB`, `PROCESSING`] | Count |
| Results Pending | Status = `PROCESSING` for > 24 hours | Amber count |
| Overdue | Any SLA breached | Red count |
| Completed | Status ∈ [`RESULTS_READY`, `DOCTOR_REVIEWED`, `CLOSED`] | — |

### 6.2 Lab Order Card

Each lab order in the list is rendered as a card:

```
┌──────────────────────────────────────────────────────────┐
│  🔬 Extended Hair Panel                    🟡 AT_LAB    │
│                                                          │
│  Patient: Rahul Mehta — Hair Loss                        │
│  Ordered by: Dr. Rajesh Patel — 2 days ago               │
│                                                          │
│  Nurse: Priya S. ✅          Lab: PathLab Plus ✅         │
│                                                          │
│  ⏱️ Last update: 18 hours ago          🟡 SLA: 6hrs left │
│                                                          │
│  [Assign Nurse] [Assign Lab] [View] [Escalate] [...]    │
└──────────────────────────────────────────────────────────┘
```

**Card elements:**
- Panel name (or individual test names if custom order)
- Status badge (color-coded — see Section 6.3)
- Patient name + condition
- Ordering doctor + time since order
- Assigned nurse (name + ✅, or "Unassigned" in red)
- Assigned lab (name + ✅, or "Unassigned" in red)
- Time since last status change
- SLA indicator (green/amber/red with time remaining or time overdue)
- Quick action buttons (expand on tap for mobile)

### 6.3 Lab Order Status Colors

| Status | Color | Badge Text |
|--------|-------|------------|
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
| `CLOSED` | Gray | Closed |
| `CANCELLED` | Red | Cancelled |
| `RECOLLECTION_NEEDED` | Red | Recollection Needed |

### 6.4 SLA Alerts Banner

When SLA breaches exist, a sticky red banner appears at the top of the lab orders screen:

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

### 6.5 Sort Options

| Sort | Default | Direction |
|------|---------|-----------|
| Last status change | ✅ | Oldest first (most stale at top) |
| Date ordered | | Newest first |
| SLA urgency | | Most urgent first |
| Patient name | | Alphabetical |

### 6.6 Search

- Free-text search across: patient name, order ID, nurse name, lab name
- Debounced (300ms) client-side filtering for small lists, server-side for > 100 results

---

## 7. Lab Order Detail View

**Route:** `/lab-orders/[id]`
**Purpose:** Full information and actions for a single lab order.

### 7.1 Layout

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Lab Orders                                    │
│                                                          │
│  🔬 Extended Hair Panel              Status: 🟡 AT_LAB   │
│                                                          │
│  ─── PATIENT ──────────────────────────────────────────  │
│  Name: Rahul Mehta                                       │
│  Condition: Hair Loss                                    │
│  Phone: +91 98765 43210 [📞]                              │
│  Address: 123 MG Road, Bangalore 560001                  │
│                                                          │
│  ─── ORDER DETAILS ────────────────────────────────────  │
│  Ordered by: Dr. Rajesh Patel                            │
│  Date: 25 Feb 2026, 10:30 AM                             │
│  Tests: CBC, TSH, Ferritin, Vitamin D, DHT, Zinc        │
│  Notes: "Fasting sample required"                        │
│  Urgency: Routine                                        │
│                                                          │
│  ─── ASSIGNMENTS ──────────────────────────────────────  │
│  Nurse: Priya S. (+91 87654 32109) [📞] [Change]         │
│  Lab: PathLab Plus (MG Road Branch) [Change]             │
│  Slot: 26 Feb 2026, 7:00 AM — 10:00 AM                  │
│                                                          │
│  ─── TIMELINE ─────────────────────────────────────────  │
│  ✅ Ordered — 25 Feb, 10:30 AM                            │
│  ✅ Slot booked by patient — 25 Feb, 11:15 AM             │
│  ✅ Nurse assigned (Priya S.) — 25 Feb, 11:30 AM          │
│  ✅ Sample collected — 26 Feb, 8:45 AM                     │
│  ✅ Delivered to lab — 26 Feb, 10:00 AM                    │
│  🔵 Processing at lab — 26 Feb, 10:15 AM (current)        │
│  ⚪ Results ready                                          │
│  ⚪ Doctor review                                          │
│                                                          │
│  ─── ACTIONS ──────────────────────────────────────────  │
│  [Escalate]  [Cancel Order]  [Create Recollection]       │
└──────────────────────────────────────────────────────────┘
```

### 7.2 Actions Available by Status

| Status | Available Actions |
|--------|-------------------|
| `ORDERED` | Assign Nurse, Assign Lab, Cancel Order, Escalate (remind patient to book slot) |
| `SLOT_BOOKED` | Assign Nurse, Assign Lab, Cancel Order |
| `NURSE_ASSIGNED` | Change Nurse, Change Lab, Cancel Order, Escalate (remind nurse) |
| `SAMPLE_COLLECTED` | View Collection Notes, View Vitals, Change Lab (if not yet delivered) |
| `AT_LAB` / `PROCESSING` | Escalate (contact lab), Cancel Order (with reason) |
| `RESULTS_READY` | View Results, Escalate (remind doctor to review) |
| `DOCTOR_REVIEWED` | View Results, Close Order |
| `CLOSED` | View-only (no actions) |
| `CANCELLED` | View-only, Create New Order |
| Any status | View Timeline |

---

## 8. Nurse Assignment Flow

### 8.1 Assignment Modal

Triggered from lab order card or detail view → "Assign Nurse" button:

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close            ASSIGN NURSE                         │
│                                                          │
│  Order: Extended Hair Panel — Rahul Mehta                 │
│  Location: Bangalore 560001                              │
│  Slot: 26 Feb, 7:00 AM — 10:00 AM                       │
│                                                          │
│  ─── AVAILABLE NURSES ─────────────────────────────────  │
│  (Filtered by: serviceable area + available on date)     │
│                                                          │
│  ○ Priya S.                                              │
│    Areas: Koramangala, MG Road, Indiranagar              │
│    Today: 2/5 collections scheduled                      │
│    Rating: ⭐ 4.8 (23 visits)                            │
│                                                          │
│  ○ Deepa R.                                              │
│    Areas: MG Road, Whitefield, Marathahalli              │
│    Today: 4/5 collections scheduled                      │
│    Rating: ⭐ 4.5 (18 visits)                            │
│                                                          │
│  ○ Kavitha M.                                            │
│    Areas: Jayanagar, JP Nagar, Banashankari              │
│    Today: 1/4 collections scheduled                      │
│    Rating: ⭐ 4.9 (31 visits)                            │
│    ⚠️ Not in patient's area — 8km away                   │
│                                                          │
│  [Cancel]                              [Assign]          │
└──────────────────────────────────────────────────────────┘
```

### 8.2 Nurse Filtering Logic

Nurses are filtered and ranked by:
1. **Serviceable pincodes:** Nurse's registered serviceable pincodes include the patient's pincode (exact match)
2. **Availability:** Nurse is active + available on the booked date + has capacity (scheduled < max daily collections)
3. **Proximity fallback:** If no exact pincode match, show nearby nurses with amber warning

**Sort order:** Exact area match first → lowest scheduled count first → highest rating first

### 8.3 Assignment API

```
trpc.admin.labOrder.assignNurse.mutate({
  labOrderId: 'uuid',
  nurseId: 'uuid'
})
```

**Server actions:**
1. Update `LabOrder.nurseId` and status → `NURSE_ASSIGNED`
2. Create `NurseVisit` record with status `SCHEDULED`
3. Notify nurse (push + WhatsApp): "New blood collection assignment — [Date] [Time] — [Area]. Open your portal for details."
4. Notify patient (push): "A nurse has been assigned for your blood test collection."
5. SSE event → admin feed, nurse portal
6. Audit log entry

---

## 9. Lab Assignment Flow

### 9.1 Assignment Modal

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close            ASSIGN LAB                           │
│                                                          │
│  Order: Extended Hair Panel — Rahul Mehta                 │
│  Tests required: CBC, TSH, Ferritin, Vitamin D, DHT, Zinc│
│                                                          │
│  ─── AVAILABLE LABS ───────────────────────────────────  │
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

### 9.2 Lab Filtering Logic

Labs are filtered by:
1. **Tests offered:** Lab must offer ALL tests in the order (or show partial match with warning)
2. **City:** Same city as patient
3. **Active status:** Lab is not deactivated

**Sort order:** Full test coverage first → shortest turnaround → highest rating

### 9.3 Assignment API

```
trpc.admin.labOrder.assignLab.mutate({
  labOrderId: 'uuid',
  labId: 'uuid'
})
```

**Server actions:**
1. Update `LabOrder.diagnosticCentreId`
2. Lab portal shows the order in "Incoming" (once nurse delivers sample)
3. Audit log entry

---

## 10. Recollection Flow

**When needed:** Sample rejected by lab (hemolyzed, insufficient volume, wrong tube, contaminated) or patient missed the nurse visit.

### 10.1 Trigger

From lab order detail → "Create Recollection" button (available when current order has an issue).

### 10.2 Recollection Modal

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

### 10.3 Recollection API

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
6. SSE event → admin feed
7. Audit log entry

---

## 11. Screen 3: Deliveries

**Route:** `/deliveries`
**Purpose:** Manage the medication delivery pipeline — from prescription to doorstep.

### 11.1 Filter Tabs

| Filter | Criteria | Badge |
|--------|----------|-------|
| All | All orders | Total count |
| New (needs pharmacy) | Status = `CREATED`, no pharmacy assigned | Red count |
| At Pharmacy | Status = `SENT_TO_PHARMACY` or `PREPARING` | Count |
| Ready for Pickup | Status = `READY` | Amber count |
| In Transit | Status = `OUT_FOR_DELIVERY` | Count |
| Completed | Status = `DELIVERED` | — |
| Issues | Delivery failed, stock issues, patient complaints | Red count |

### 11.2 Delivery Card

```
┌──────────────────────────────────────────────────────────┐
│  📦 Hair Loss Monthly Kit                  🟢 READY      │
│                                                          │
│  Patient: Rahul Mehta — Bangalore                        │
│  Rx by: Dr. Rajesh Patel — 1 day ago                     │
│                                                          │
│  Meds: Finasteride 1mg (30), Minoxidil 5% (1 bottle)    │
│                                                          │
│  Pharmacy: MedPlus (MG Road) ✅                           │
│  Delivery: Unassigned 🔴                                 │
│                                                          │
│  ⏱️ Ready since: 3 hours ago                              │
│                                                          │
│  [Send to Pharmacy] [Arrange Delivery] [View] [...]      │
└──────────────────────────────────────────────────────────┘
```

**Card "[...]" expanded actions:** Handle Issue, Delivery Failed, Create Replacement (for wrong/damaged medication), Mark Delivered (manual override), Cancel Order.

### 11.3 Delivery Status Colors

| Status | Color | Badge Text |
|--------|-------|------------|
| `CREATED` | Blue | New Order |
| `SENT_TO_PHARMACY` | Indigo | At Pharmacy |
| `PREPARING` | Yellow | Preparing |
| `READY` | Amber | Ready for Pickup |
| `OUT_FOR_DELIVERY` | Purple | In Transit |
| `DELIVERED` | Green | Delivered |
| `PHARMACY_ISSUE` | Orange | Stock Issue |
| `DELIVERY_FAILED` | Red | Failed |
| `REASSIGNED` | Gray (striped) | Reassigned |
| `CANCELLED` | Gray | Cancelled |

---

## 12. Delivery Detail View

**Route:** `/deliveries/[id]`

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Deliveries                                    │
│                                                          │
│  📦 Order #ORD-5678                  Status: 🟢 READY    │
│                                                          │
│  ─── PATIENT ──────────────────────────────────────────  │
│  Name: Rahul Mehta                                       │
│  Phone: +91 98765 43210 [📞]                              │
│  Delivery Address: 123 MG Road, Bangalore 560001         │
│                                                          │
│  ─── PRESCRIPTION ─────────────────────────────────────  │
│  Doctor: Dr. Rajesh Patel                                │
│  Condition: Hair Loss                                    │
│  Medications:                                            │
│    • Finasteride 1mg — 30 tablets — 1 daily              │
│    • Minoxidil 5% topical — 1 bottle — apply 2x daily   │
│  Rx PDF: [View] [Download]                               │
│                                                          │
│  ─── PHARMACY ─────────────────────────────────────────  │
│  Assigned: MedPlus (MG Road Branch)                      │
│  Phone: +91 80 4567 8901 [📞]                             │
│  Contact: Suresh (pharmacist)                            │
│  Sent: 26 Feb, 11:00 AM                                 │
│  Prepared: 26 Feb, 2:30 PM                               │
│  Marked ready: 26 Feb, 3:00 PM                           │
│                                                          │
│  ─── DELIVERY ─────────────────────────────────────────  │
│  Person: (not yet assigned)                              │
│  Method: —                                               │
│  OTP: (generated when delivery arranged)                 │
│                                                          │
│  ─── TIMELINE ─────────────────────────────────────────  │
│  ✅ Order created — 25 Feb, 3:00 PM                       │
│  ✅ Sent to pharmacy (MedPlus MG Road) — 26 Feb, 11:00 AM │
│  ✅ Pharmacy preparing — 26 Feb, 12:00 PM                  │
│  🔵 Pharmacy ready — 26 Feb, 3:00 PM (current)            │
│  ⚪ Out for delivery                                       │
│  ⚪ Delivered                                               │
│                                                          │
│  ─── ACTIONS ──────────────────────────────────────────  │
│  [Arrange Delivery] [Handle Issue] [Create Replacement]  │
│  [Cancel Order]                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 13. Send to Pharmacy Flow

### 13.1 Pharmacy Selection Modal

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close          SEND TO PHARMACY                       │
│                                                          │
│  Order: #ORD-5678 — Rahul Mehta                          │
│  Medications: Finasteride 1mg, Minoxidil 5%              │
│                                                          │
│  ─── SELECT PHARMACY ──────────────────────────────────  │
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

### 13.2 Send API

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
4. SSE event → admin feed, pharmacy portal
5. Audit log entry

**Privacy note:** Pharmacy sees Order ID (ORD-XXXX format), anonymous patient ID (ONY-P-XXXX), medications, dosages, quantities, prescription PDF, and prescribing doctor name + NMC number. They do NOT see patient name, diagnosis, questionnaire data, patient address, or the internal prescriptionId.

---

## 14. Arrange Delivery Flow

### 14.1 Delivery Setup Modal

Triggered when pharmacy has marked order as `READY`:

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close         ARRANGE DELIVERY                        │
│                                                          │
│  Order: #ORD-5678 — Ready at MedPlus (MG Road)          │
│  Deliver to: 123 MG Road, Bangalore 560001               │
│                                                          │
│  ─── DELIVERY PERSON ──────────────────────────────────  │
│                                                          │
│  Name: [_________________________]                       │
│  Phone: +91 [__________________]                         │
│                                                          │
│  ─── METHOD ───────────────────────────────────────────  │
│                                                          │
│  ( ) Rapido                                              │
│  ( ) Dunzo                                               │
│  (•) Own delivery person                                 │
│  ( ) Other                                               │
│                                                          │
│  ─── ESTIMATED DELIVERY ───────────────────────────────  │
│                                                          │
│  ETA: [__] minutes from now                              │
│                                                          │
│  ─── WHAT HAPPENS NEXT ───────────────────────────────  │
│  1. Delivery person receives SMS with pickup/drop info   │
│  2. They pick up from pharmacy → deliver to patient      │
│  3. Patient shares 4-digit OTP to confirm delivery       │
│                                                          │
│  [Cancel]                         [Send Delivery Link]   │
└──────────────────────────────────────────────────────────┘
```

### 14.2 Delivery Link Generation API

```
trpc.admin.delivery.arrangeDelivery.mutate({
  orderId: 'uuid',
  deliveryPersonName: 'Ravi Kumar',
  deliveryPersonPhone: '+919876543210',
  deliveryMethod: 'OWN',
  estimatedMinutes: 45
})
```

**Server actions:**
1. Generate unique delivery link token (hashed, stored in `DeliveryLink` table)
2. Generate 4-digit delivery OTP (hashed, stored in `Order.deliveryOtp`)
3. Update order status → `OUT_FOR_DELIVERY`
4. Update `Order.deliveryPersonName`, `deliveryPersonPhone`, `deliveryMethod`
5. Send SMS to delivery person with single-use link:
   > "Onlyou Delivery: Pick up package from MedPlus (MG Road) and deliver to 123 MG Road, Bangalore. Open link for details: https://admin.onlyou.life/d/{token}"
6. Notify patient (push + WhatsApp): "Your medication is on its way! Delivery ETA: ~45 minutes."
7. Display delivery OTP prominently on patient's app tracking screen
8. SSE event → admin feed, patient app
9. Audit log entry

**Delivery link expires:** After OTP-confirmed delivery or 24 hours, whichever comes first.

### 14.3 Delivery Person SMS Link Page

**NOT part of the admin portal.** This is a separate single-use mobile-optimized web page:

```
┌──────────────────────────────────────┐
│                                      │
│  🏥 Onlyou Delivery                  │
│                                      │
│  ─── PACKAGE ─────────────────────  │
│  Package ID: PKG-5678                │
│                                      │
│  ─── PICKUP ───────────────────────  │
│  MedPlus Pharmacy (MG Road)          │
│  45 MG Road, Bangalore 560001       │
│  [📍 Navigate]  [📞 Call]             │
│                                      │
│  [✅ Confirm Pickup]                  │
│                                      │
│  ─── DELIVER TO ───────────────────  │
│  123 MG Road, Bangalore 560001      │
│  [📍 Navigate]  [📞 Call Patient]     │
│                                      │
│  ─── CONFIRM DELIVERY ────────────  │
│  Enter the 4-digit code from         │
│  the customer:                       │
│                                      │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐           │
│  │   │ │   │ │   │ │   │           │
│  └───┘ └───┘ └───┘ └───┘           │
│                                      │
│  [Confirm Delivery]                  │
│                                      │
│  ─────────────────────────────────  │
│  [❌ Delivery Failed]                │
│                                      │
└──────────────────────────────────────┘
```

**Delivery person interactions:**
- "Navigate" → opens Google Maps with address
- "Call" → opens dialer with pharmacy/patient phone
- "Confirm Pickup" → marks order as picked up (status update visible to admin + patient)
- OTP entry → 3 attempts allowed → valid = delivery confirmed → invalid = "Incorrect code, ask customer to re-read"
- After 3 failed OTP attempts: "Having trouble? Contact coordinator" (shows admin phone number)
- "Delivery Failed" → reason selector (Not home / Wrong address / Unreachable / Other) → admin notified for rescheduling

---

## 15. Delivery Manual Override

**Purpose:** For cases where OTP system fails (phone dead, patient elderly, etc.), admin can manually confirm delivery.

### 15.1 Override Modal

```
┌──────────────────────────────────────────────────────────┐
│  ✕ Close       MANUAL DELIVERY CONFIRMATION              │
│                                                          │
│  ⚠️ Use only when OTP delivery confirmation is not        │
│     possible. This action is logged in the audit trail.  │
│                                                          │
│  Order: #ORD-5678 — Rahul Mehta                          │
│  Delivery person: Ravi Kumar                             │
│                                                          │
│  Reason for manual override:                             │
│  Select: [ Patient confirmed via phone call     ▼ ]      │
│                                                          │
│  Options:                                                │
│  • Patient confirmed via phone call                      │
│  • Delivery person OTP entry not working                 │
│  • Patient unable to access app                          │
│  • Other (specify below)                                 │
│                                                          │
│  Additional notes: [________________________]            │
│                                                          │
│  [Cancel]                         [Confirm Delivery]     │
└──────────────────────────────────────────────────────────┘
```

### 15.2 Override API

```
trpc.admin.delivery.manualConfirmDelivery.mutate({
  orderId: 'uuid',
  reason: 'patient_confirmed_phone',
  notes: 'Called patient, confirmed receipt of package'
})
```

**Server actions:**
1. Update order status → `DELIVERED`
2. Set `Order.manualOverride = true`, `overrideReason`, `overrideNotes`
3. Audit log entry with override flag
4. Notify patient: "Your medication has been marked as delivered."

---

## 16. Auto-Reorder Management

### 16.1 Section Location

Displayed at the bottom of the Deliveries screen or as a separate sub-tab "Upcoming Reorders":

```
┌──────────────────────────────────────────────────────────┐
│  📅 UPCOMING AUTO-REORDERS                                │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Rahul Mehta — Hair Loss Monthly                    │  │
│  │ Renewal: 5 Mar 2026 — ₹999                        │  │
│  │ Medications: Finasteride 1mg, Minoxidil 5%         │  │
│  │ [Pause Reorder] [Process Now]                      │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Sneha K. — PCOS Quarterly                          │  │
│  │ Renewal: 8 Mar 2026 — ₹3,799                      │  │
│  │ ⚠️ Doctor paused treatment (awaiting lab results)   │  │
│  │ [Resume] (disabled until doctor clears)             │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Amit S. — ED Monthly                               │  │
│  │ Renewal: 12 Mar 2026 — ₹1,299                     │  │
│  │ ⚠️ Follow-up check-in overdue                       │  │
│  │ [Pause Reorder] [Process Now]                      │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 16.2 Auto-Reorder Rules

Auto-reorder is **paused** when:
- Subscription is paused by patient
- Doctor has paused treatment (awaiting lab results, dosage change pending)
- Follow-up check-in is overdue and doctor flagged "must check-in before next reorder"
- Payment failed and subscription is `HALTED`

**Admin actions:**
- "Pause Reorder" → manually pause for a specific patient (with reason)
- "Process Now" → manually trigger reorder ahead of schedule (creates new order immediately)
- "Resume" → resume paused auto-reorder (only if not blocked by doctor or system)

---

## 17. Screen 4: Partners

**Route:** `/partners`
**Purpose:** Manage all external partners who participate in the care delivery chain.

### 17.1 Partner Sub-Tabs

Horizontal tabs at top of screen:

| Tab | Contents |
|-----|----------|
| Nurses | Field nurses for blood collection |
| Diagnostic Centres | Partner labs for processing samples |
| Pharmacies | Partner pharmacies for medication dispensing |
| Clinics (Referral) | In-person referral clinics |

Each tab has:
- Search bar (name, city, phone)
- "Add New" button (top right)
- List of partners with key info + active/inactive toggle
- Tap partner → detail/edit view

---

## 18. Partner: Nurses Management

### 18.1 Nurse List View

```
┌──────────────────────────────────────────────────────────┐
│  NURSES                                    [+ Add Nurse] │
│  [Search by name, phone, city...]                        │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Priya S.                              🟢 Active    │  │
│  │ 📞 +91 87654 32109                                 │  │
│  │ 📍 Bangalore — Koramangala, MG Road, Indiranagar    │  │
│  │ 📊 23 collections (21 ✅, 2 ❌) — ⭐ 4.8             │  │
│  │ Today: 2/5 capacity                                │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Deepa R.                              🟢 Active    │  │
│  │ 📞 +91 76543 21098                                 │  │
│  │ 📍 Bangalore — MG Road, Whitefield, Marathahalli    │  │
│  │ 📊 18 collections (17 ✅, 1 ❌) — ⭐ 4.5             │  │
│  │ Today: 4/5 capacity                                │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 18.2 Add/Edit Nurse Form

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | ✅ | Full name |
| Phone | Phone (+91) | ✅ | This becomes their portal login |
| Email | Email | ❌ | Optional contact email |
| Gender | Dropdown | ✅ | Male / Female / Other |
| City | Dropdown | ✅ | Currently: Bangalore only (MVP) |
| Serviceable Pincodes | Multi-select / tag input | ✅ | Pincodes where they can operate |
| Certification Type | Dropdown | ✅ | GNM / BSc Nursing / ANM / Other |
| Certification Number | Text | ✅ | Nursing certification/registration number |
| Certification Document | File upload | ✅ | PDF or image → S3 `onlyou-documents` |
| Available Days | Multi-select checkboxes | ✅ | Mon–Sun |
| Available Hours | Time range picker | ✅ | e.g., 7:00 AM — 5:00 PM |
| Max Daily Collections | Number | ✅ | Default: 5 |
| Notes | Text (optional) | ❌ | Internal notes |

**On save:**
- Creates `User` record with `role: NURSE` (enables portal login via OTP)
- Nurse can immediately log into `nurse.onlyou.life`

### 18.3 Deactivation

Toggle "Active/Inactive" → confirmation modal:
- "Deactivating Priya S. will remove her from future nurse assignments. Existing assigned visits will NOT be affected. Continue?"
- Deactivated nurses do not appear in assignment dropdowns
- Their historical data (completed visits) remains intact

---

## 19. Partner: Diagnostic Centres Management

### 19.1 Lab List View

Same pattern as nurse list with lab-specific fields.

### 19.2 Add/Edit Lab Form

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | ✅ | Lab/centre name |
| Address | Text | ✅ | Full address |
| City | Dropdown | ✅ | |
| Phone | Phone | ✅ | Main contact |
| Contact Person | Text | ✅ | Staff member name |
| Portal Login Phone | Phone (+91) | ✅ | Becomes their portal login |
| Tests Offered | Multi-select | ✅ | From master test list |
| Panel Pricing | Price per panel | ✅ | e.g., Basic Hair Panel: ₹800, Extended: ₹1,500 |
| Avg Turnaround (hours) | Number | ✅ | Used for SLA calculations |
| Notes | Text | ❌ | Internal notes |

**On save:**
- Creates `DiagnosticCentre` record
- Creates `User` with `role: LAB_TECH` for portal login phone → enables `lab.onlyou.life` access

### 19.3 Privacy Enforcement

Lab partners see: anonymous patient ID (not name), test type, sample details only. They do NOT see patient name, phone, address, or diagnosis. This is enforced at the API layer — the lab portal tRPC router only returns anonymized data.

---

## 20. Partner: Pharmacies Management

### 20.1 Pharmacy List View

Same pattern as other partner lists.

### 20.2 Add/Edit Pharmacy Form

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
- Creates `Pharmacy` record
- Creates `User` with `role: PHARMACY` for portal login → enables `pharmacy.onlyou.life` access

### 20.3 Privacy Enforcement

Pharmacy partners see: prescription ID, medications, dosages, doctor name. They do NOT see patient name, diagnosis, questionnaire data, or patient address. Enforced at API layer.

---

## 21. Partner: Referral Clinics Management

### 21.1 Clinic List View

Same pattern as other partner lists.

### 21.2 Add/Edit Clinic Form

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | ✅ | Clinic name |
| Address | Text | ✅ | Full address |
| City | Dropdown | ✅ | |
| Phone | Phone | ✅ | Main contact |
| Specializations | Multi-select | ✅ | Dermatology, Urology, Endocrinology, Gynecology, etc. |
| Capabilities | Text | ✅ | What procedures they can perform (trichoscopy, scalp biopsy, etc.) |
| Negotiated Rate | Currency | ❌ | If Onlyou has negotiated special pricing |
| Max Daily Capacity | Number | ❌ | How many referrals they can accept per day |
| Notes | Text | ❌ | Internal notes |

**No portal login for referral clinics.** They receive referral notifications via email/WhatsApp with anonymized patient details.

---

## 22. Screen 5: Settings

**Route:** `/settings`
**Purpose:** System configuration hub — all platform-level settings managed here.

### 22.1 Settings Hub Layout

```
┌──────────────────────────────────────────────────────────┐
│  ← Settings                                              │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 👥 User Management                            →    │  │
│  │    View all users, activate/deactivate accounts    │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 💰 Subscription Plans                          →    │  │
│  │    View/edit pricing for all verticals             │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 📱 Notification Templates                      →    │  │
│  │    SMS, WhatsApp, email, push templates            │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 📋 Questionnaire Management                    →    │  │
│  │    View active questionnaire schemas (read-only)   │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🚩 Feature Flags                               →    │  │
│  │    Toggle platform features on/off                 │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 💳 Financial                                   →    │  │
│  │    Revenue, payments, refunds, wallet              │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 📜 Audit Log                                   →    │  │
│  │    Searchable log of all system actions             │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ⏱️ SLA Configuration                           →    │  │
│  │    Edit thresholds for all SLA rules               │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 23. Settings: User Management

**Route:** `/settings/users`

### 23.1 User List

Filterable by role:

| Role Filter | Shows |
|-------------|-------|
| All | Every user in the system |
| Patients | Patient accounts |
| Doctors | Doctor accounts |
| Nurses | Nurse accounts |
| Lab Technicians | Lab portal users |
| Pharmacy Staff | Pharmacy portal users |
| Admins | Admin accounts |

**Each user row shows:**
- Name, phone, email (if available)
- Role badge
- Account status (Active / Inactive / Suspended)
- Last login timestamp
- Date created

**Actions:**
- Activate / Deactivate toggle
- View profile details
- (No delete — accounts are soft-deactivated only, per DPDPA data retention)

### 23.2 Deactivation Flow

Deactivating a user:
- Patients: cannot log in, subscriptions paused, no notifications sent
- Doctors: removed from case assignment rotation, existing cases reassigned
- Nurses: removed from assignment dropdowns, existing assignments persist
- Lab/Pharmacy: portal login blocked, existing orders persist

All deactivations logged in audit trail.

---

## 24. Settings: Subscription Plans

**Route:** `/settings/plans`

### 24.1 Plan Editor

View and edit pricing for all verticals and durations:

```
┌──────────────────────────────────────────────────────────┐
│  SUBSCRIPTION PLANS                                      │
│                                                          │
│  ─── HAIR LOSS ────────────────────────────────────────  │
│  Monthly:    ₹ [999]    per month                        │
│  Quarterly:  ₹ [2,499]  per 3 months (save 17%)         │
│  6-Month:    ₹ [4,499]  per 6 months (save 25%)         │
│                                                          │
│  ─── ERECTILE DYSFUNCTION ─────────────────────────────  │
│  Monthly:    ₹ [1,299]  per month                        │
│  Quarterly:  ₹ [3,299]  per 3 months                     │
│  6-Month:    ₹ [5,999]  per 6 months                     │
│                                                          │
│  ─── PREMATURE EJACULATION ────────────────────────────  │
│  Monthly:    ₹ [1,299]  per month                        │
│  Quarterly:  ₹ [3,299]  per 3 months                     │
│  6-Month:    ₹ [5,999]  per 6 months                     │
│                                                          │
│  ─── WEIGHT MANAGEMENT ───────────────────────────────  │
│  Standard Monthly:   ₹ [2,999]                           │
│  Standard Quarterly: ₹ [7,999]                           │
│  Standard 6-Month:   ₹ [14,999]                          │
│  GLP-1 Monthly:      ₹ [9,999]                           │
│  GLP-1 Quarterly:    ₹ [24,999]                          │
│  GLP-1 6-Month:      ₹ [44,999]                          │
│                                                          │
│  ─── PCOS ─────────────────────────────────────────────  │
│  Monthly:    ₹ [1,499]                                   │
│  Quarterly:  ₹ [3,799]                                   │
│  6-Month:    ₹ [6,999]                                   │
│                                                          │
│  [Save Changes]                                          │
│                                                          │
│  ⚠️ Price changes apply to new subscriptions only.        │
│     Existing subscriptions keep their current pricing.   │
└──────────────────────────────────────────────────────────┘
```

**Save:** Updates `SubscriptionPlan` table. Audit log records old → new price.

---

## 25. Settings: Notification Templates

**Route:** `/settings/notifications`

### 25.1 Template Editor

View and edit notification templates across all channels:

**Channels:** SMS / WhatsApp / Email / Push

**Template categories:**
- Authentication (OTP delivery)
- Consultation lifecycle (submitted, assigned, prescribed, etc.)
- Lab order lifecycle (ordered, nurse assigned, results ready, etc.)
- Delivery lifecycle (dispatched, in transit, delivered, etc.)
- Payment (received, failed, renewal reminder)
- SLA escalation (internal only)
- Marketing (opt-in only)

**Each template shows:**
- Channel icon
- Event trigger
- Template text with `{{variables}}` highlighted
- Character count (SMS: 160 limit, WhatsApp: 1024)
- Preview mode (renders with sample data)

**Example template:**
```
Channel: WhatsApp
Event: nurse_arriving
Template: "Onlyou: Your nurse {{nurseName}} is on the way for blood collection. 
Expected arrival: {{eta}}. Please have your ID ready."
Variables: nurseName, eta
```

**For MVP:** Template editing is text-only (no drag-and-drop). Templates stored in `NotificationTemplate` table.

---

## 26. Settings: Questionnaire Management

**Route:** `/settings/questionnaires`

### 26.1 Read-Only Schema Viewer

Displays the active questionnaire schemas for all verticals. For MVP, questionnaire schemas are defined in code and deployed — this screen provides admin visibility into what's currently active without editing capability.

**Each vertical shows:**
- Vertical name (Hair Loss, ED, PE, Weight Management, PCOS)
- Number of questions in the schema
- Question types used (multiple choice, text, photo upload, scale, etc.)
- Last updated timestamp (from code deploy)
- Status: Active / Inactive (matches feature flag for the vertical)

**Why read-only for MVP:** Questionnaire schemas are tightly coupled to AI assessment logic. Changing a question requires updating the AI prompt chain, validation rules, and potentially the assessment output format. This requires a code deploy rather than a runtime edit. The admin viewer exists so the coordinator can reference what patients are being asked without needing to check the codebase.

**Future enhancement:** Phase 2+ may introduce a questionnaire builder with versioning, but this requires significant AI pipeline changes.

---

## 27. Settings: Feature Flags

**Route:** `/settings/feature-flags`

### 28.1 Flag List

| Flag | Current State | Description |
|------|---------------|-------------|
| `VIDEO_CONSULTATION_ENABLED` | 🔴 Off | Enable video step in consultation lifecycle |
| `GLP1_COLD_CHAIN_TRACKING` | 🔴 Off | Enable cold chain verification for GLP-1 deliveries |
| `NURSE_INJECTION_ADMIN` | 🔴 Off | Enable nurse injection administration visits |
| `ED_VERTICAL_ENABLED` | 🟢 On | Enable ED questionnaire and treatment |
| `PE_VERTICAL_ENABLED` | 🟢 On | Enable PE questionnaire and treatment |
| `WEIGHT_VERTICAL_ENABLED` | 🟢 On | Enable Weight Management vertical |
| `PCOS_VERTICAL_ENABLED` | 🟢 On | Enable PCOS vertical |
| `SELF_UPLOAD_LAB_RESULTS` | 🟢 On | Allow patients to upload own lab results |
| `PROMO_CODES_ENABLED` | 🟢 On | Enable promotional code entry at checkout |
| `REFERRAL_PROGRAM_ENABLED` | 🔴 Off | Enable patient referral rewards |

**Each flag:** Toggle switch + confirmation modal ("Are you sure? This affects all users immediately.") + audit log entry.

**Implementation:** Flags stored in database (`FeatureFlag` table), cached in Redis (5-minute TTL), checked server-side before returning data. Client-side flags fetched on app init via `trpc.system.getFeatureFlags.useQuery()`.

---

## 28. Settings: Financial Dashboard

**Route:** `/settings/financial`

### 28.1 Financial Overview

```
┌──────────────────────────────────────────────────────────┐
│  FINANCIAL OVERVIEW                  Period: [This Month ▼]│
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │ ₹1,23,450  │  │ ₹8,997     │  │ ₹1,14,453  │         │
│  │ Revenue    │  │ Refunds    │  │ Net        │         │
│  └────────────┘  └────────────┘  └────────────┘         │
│                                                          │
│  ─── RECENT PAYMENTS ──────────────────────────────────  │
│  (Searchable by patient name, amount, date)              │
│                                                          │
│  26 Feb — Rahul M. — ₹999 — Hair Loss Monthly — ✅ Paid  │
│  26 Feb — Sneha K. — ₹3,799 — PCOS Quarterly — ✅ Paid   │
│  25 Feb — Amit S. — ₹1,299 — ED Monthly — ❌ Failed      │
│  25 Feb — Vikram R. — ₹999 — Hair Loss Monthly — ✅ Paid  │
│                                                          │
│  ─── PENDING REFUNDS ──────────────────────────────────  │
│  (Doctor-initiated refund requests awaiting approval)    │
│                                                          │
│  🟡 Rahul M. — ₹999 — Medical contraindication          │
│     Requested by: Dr. Rajesh Patel — 2 hrs ago           │
│     [Approve] [Reject]                                   │
│                                                          │
│  ─── REFUND HISTORY ───────────────────────────────────  │
│  26 Feb — Priya T. — ₹999 — Wallet credit — ✅ Approved  │
│  24 Feb — Neha S. — ₹749 — Original payment — ✅ Approved │
│                                                          │
│  ─── WALLET TRANSACTIONS ──────────────────────────────  │
│  (Searchable by patient name)                            │
│  26 Feb — Priya T. — +₹999 (refund credit)              │
│  25 Feb — Rahul M. — -₹200 (applied to order)           │
│  24 Feb — Sneha K. — +₹500 (promo credit)               │
└──────────────────────────────────────────────────────────┘
```

### 28.2 Financial Data Sources

| Data | Source |
|------|--------|
| Revenue | `RazorpayPayment` table — sum of successful captures |
| Refunds | `RefundRequest` table — sum of approved refunds |
| Payments list | `RazorpayPayment` table with patient join |
| Pending refunds | `RefundRequest` where status = `PENDING_APPROVAL` |
| Wallet transactions | `WalletTransaction` table |

---

## 29. Settings: Audit Log

**Route:** `/settings/audit-log`

### 29.1 Audit Log Viewer

```
┌──────────────────────────────────────────────────────────┐
│  AUDIT LOG                                               │
│                                                          │
│  [Search: action, user, resource...]                     │
│  Filters: [Role ▼] [Action ▼] [Date range ▼]            │
│                                                          │
│  26 Feb, 15:32 — Dr. Rajesh Patel (doctor)               │
│    Action: prescription.created                          │
│    Resource: Consultation #C-1234                         │
│    Details: 2 medications, template "Hair Loss Standard"  │
│                                                          │
│  26 Feb, 15:30 — Admin (admin)                           │
│    Action: delivery.sent_to_pharmacy                     │
│    Resource: Order #ORD-5678                              │
│    Details: Assigned to MedPlus (MG Road)                │
│                                                          │
│  26 Feb, 15:15 — System (system)                         │
│    Action: sla.breach_triggered                          │
│    Resource: LabOrder #LO-1234                            │
│    Details: Lab results overdue — 48hr threshold          │
│                                                          │
│  26 Feb, 14:50 — Nurse Priya S. (nurse)                  │
│    Action: sample.collected                              │
│    Resource: NurseVisit #NV-5678                          │
│    Details: 3 tubes, vitals recorded                     │
│                                                          │
│  [Load more]                                             │
└──────────────────────────────────────────────────────────┘
```

### 29.2 Audit Log Filters

| Filter | Options |
|--------|---------|
| Role | All / Admin / Doctor / Nurse / Lab Tech / Pharmacy / Patient / System |
| Action category | Auth / Consultation / Prescription / Lab Order / Delivery / Partner / Payment / Refund / Settings / SLA |
| Date range | Today / Last 7 days / Last 30 days / Custom range |
| Search | Free-text across action type, user name, resource ID |

### 29.3 Data Integrity

- Audit log table is **INSERT-only** — no UPDATE or DELETE permissions at the database level
- Retention: minimum 1 year (DPDP Rules), recommended 3 years (Telemedicine Practice Guidelines 2020)
- Structure: `{ timestamp, userId, role, action, resourceType, resourceId, ipAddress, userAgent, changesJson }`
- `changesJson` stores before/after values for data modifications

---

## 30. Settings: SLA Configuration

**Route:** `/settings/sla`

### 30.1 SLA Threshold Editor

All SLA thresholds are editable by admin. Changes take effect on the next SLA check cycle (every 15 minutes via BullMQ).

**Lab Order SLAs:**

| SLA Rule | Default Threshold | Escalation Action |
|----------|-------------------|-------------------|
| Patient slot booking | 7 days after order | Reminder notification to patient |
| Nurse assignment after booking | 2 hours | Admin notification (self-alert) |
| Nurse arrival (visit start) | 30 minutes past slot start | Admin notification + patient notification |
| Lab results after sample received | 48 hours | Admin contacts lab |
| Doctor review after results uploaded | 24 hours | Admin reminds doctor |

**Delivery SLAs:**

| SLA Rule | Default Threshold | Escalation Action |
|----------|-------------------|-------------------|
| Pharmacy assignment after prescription | 4 hours | Admin notification (self-alert) |
| Pharmacy preparation | 24 hours after sent | Admin contacts pharmacy |
| Delivery arrangement after ready | 2 hours | Admin notification (self-alert) |
| Delivery completion after pickup | 2 hours | Admin contacts delivery person |

**Doctor SLAs:**

| SLA Rule | Default Threshold | Escalation Action |
|----------|-------------------|-------------------|
| First review (AI complete → assigned) | 24 hours | Notification to doctor + admin |
| Case action (assigned → no action) | 48 hours | Notification to doctor + admin; admin may reassign |
| Info response review | 72 hours after patient responds | Notification to doctor |
| Lab results review | 24 hours after results uploaded | Notification to doctor + admin |

**Edit interface:** Each threshold has an editable number field (hours or days) + save button. Changes logged in audit trail.

---

## 31. Refund Approval Flow

### 31.1 Refund Sources

Refunds can be triggered by:
1. **Doctor-initiated:** Doctor discovers contraindication → requests refund via case review (status: `PENDING_APPROVAL`)
2. **Patient cancellation:** Patient cancels before/after doctor review → system calculates refund per policy → admin approves
3. **Platform fault:** Wrong medication, delivery failure → admin initiates directly

### 31.2 Pending Refund Notification

When a refund request is created:
- Admin receives push + WhatsApp: "⚠️ Refund request — [Patient Name] — ₹[amount] — [reason]. [Approve/Reject]"
- Red dot appears on Settings tab (bottom nav)
- Pending refunds card appears in Financial dashboard

### 31.3 Approval Modal

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
│  ─── REFUND DESTINATION ───────────────────────────────  │
│                                                          │
│  ( ) Wallet credit (instant)                             │
│  (•) Original payment method (5-7 business days)         │
│                                                          │
│  Admin notes: [________________________]                 │
│                                                          │
│  [Reject with reason]                    [Approve]       │
└──────────────────────────────────────────────────────────┘
```

### 31.4 Approve API

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
7. SSE event → admin feed

### 31.5 Reject API

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

---

## 32. Consultation Oversight

### 32.1 Purpose

While the admin doesn't perform clinical work, they have oversight of all consultations for operational coordination — primarily for SLA monitoring, doctor assignment issues, and escalation.

### 32.2 Consultation List (Accessible from Overview Metrics)

Tapping "Consultations Pending Review" on the overview → filtered consultation list:

```
┌──────────────────────────────────────────────────────────┐
│  CONSULTATIONS                   Filter: [Pending Review ▼]│
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 📋 Hair Loss — Rahul Mehta            🟡 AI_COMPLETE│  │
│  │ Submitted: 2 hours ago                              │  │
│  │ Doctor: Not yet assigned                            │  │
│  │ SLA: 🟢 22 hrs remaining                            │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 📋 PCOS — Sneha K.                    🔵 ASSIGNED  │  │
│  │ Submitted: 1 day ago                                │  │
│  │ Doctor: Dr. Priya Sharma                            │  │
│  │ SLA: 🟡 4 hrs remaining                             │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 31.3 Admin Actions on Consultations

| Action | When | Effect |
|--------|------|--------|
| View case details | Any time | Read-only view of questionnaire, AI assessment, photos (no clinical actions) |
| Reassign doctor | When SLA breached or doctor unavailable | Changes `Consultation.doctorId` → notifies new doctor |
| Remind doctor | When approaching SLA | Sends WhatsApp/push reminder to assigned doctor |
| Escalate to patient | When patient hasn't responded to doctor's info request | Sends WhatsApp reminder to patient |

**Important:** Admin CANNOT create prescriptions, modify AI assessments, or perform any clinical actions. These are strictly doctor-only.

---

## 33. SLA Engine & Escalation System

### 33.1 Architecture

SLA enforcement runs as a BullMQ repeatable job (`sla-check`) every 15 minutes:

```
BullMQ sla-check job (every 15 min)
  → Query all active orders/consultations/deliveries
  → For each, check against SLA thresholds
  → If breached: create SystemEvent + trigger notifications
  → If approaching (within 2 hours): set warning state
```

### 33.2 SLA States

| State | Indicator | Meaning |
|-------|-----------|---------|
| 🟢 Green | On track | Within SLA, > 2 hours remaining |
| 🟡 Amber | Warning | Within 2 hours of SLA breach |
| 🔴 Red | Breached | SLA threshold exceeded |

### 33.3 Escalation Actions

When SLA breaches:

| Breach Type | Notification Target | Channel |
|-------------|---------------------|---------|
| Lab results overdue | Admin (self) + lab contact person | Push + WhatsApp |
| Doctor review overdue | Admin + doctor | Push + WhatsApp + SMS (doctor) |
| Nurse assignment overdue | Admin (self) | Push only |
| Delivery arrangement overdue | Admin (self) | Push only |
| Pharmacy preparation overdue | Admin + pharmacy contact | Push + WhatsApp |
| Patient slot booking overdue | Patient + admin | Push + WhatsApp (patient) |

**Admin receives ALL breach notifications** — they are the escalation endpoint for everything.

### 32.4 SLA Dashboard (Desktop Widget)

On desktop overview, a SLA compliance widget shows:
- Current breach count (with breakdown by type)
- 30-day compliance rate (% of actions completed within SLA)
- Trend arrow (improving/declining)

---

## 34. Real-Time System (Admin Portal)

### 34.1 SSE Architecture

The admin portal subscribes to an SSE channel that receives ALL system events:

**SSE Endpoint:** `GET /api/sse/admin`

**Events received:**

| Event | Source | Purpose |
|-------|--------|---------|
| `consultation.submitted` | Patient app | New case for awareness |
| `consultation.status_changed` | Doctor portal | Track case progress |
| `lab_order.status_changed` | Nurse/lab portal | Lab pipeline updates |
| `delivery.status_changed` | Pharmacy/delivery person | Delivery pipeline updates |
| `sla.breach` | BullMQ job | SLA breach alerts |
| `sla.warning` | BullMQ job | Approaching SLA warnings |
| `refund.requested` | Doctor portal | Refund approval needed |
| `payment.received` | Razorpay webhook | Revenue tracking |
| `payment.failed` | Razorpay webhook | Payment issue awareness |
| `partner.status_changed` | Any partner portal | Partner availability changes |

### 34.2 SSE Connection Management

Same pattern as doctor portal:
- Auto-reconnect with exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (max)
- On reconnect: fetch missed events since `Last-Event-ID`
- Gap too large (>500 missed): full data refresh via API
- Tab inactive > 5 minutes: events buffered, delivered on tab focus
- Connection lost > 60 seconds: amber banner "🔌 Real-time updates paused. Checking connection..."

### 34.3 Push Notifications (Mobile)

Since the admin primarily uses mobile, browser push and device push are critical:
- Service worker registered for Web Push API
- Critical events (SLA breach, refund request) delivered via push even when app is backgrounded
- WhatsApp as redundant channel for all critical events

---

## 35. Notification System (Admin)

### 35.1 Notification Channels

| Channel | Delivery Method | Use Case |
|---------|----------------|----------|
| In-portal (SSE) | SSE push → activity feed + notification dropdown | Primary — all events |
| Browser push | Web Push API (service worker) | When portal tab is inactive |
| WhatsApp | Gupshup API | When admin is away from portal |
| SMS | Gupshup SMS | SLA breach fallback only |
| Email | Resend (MVP) / SES (scale) | Daily digest, financial reports |

### 35.2 Notification Events & Channels

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

### 35.3 WhatsApp Message Format (Admin)

Discreet format — no patient medical details:

**SLA breach:**
> "Onlyou Admin: ⚠️ SLA BREACH — Lab results overdue (48hrs) — Order #1234. Open dashboard: admin.onlyou.life"

**Refund request:**
> "Onlyou Admin: Refund request — ₹999 — requires your approval. Open dashboard: admin.onlyou.life"

**Pharmacy ready:**
> "Onlyou Admin: Pharmacy order ready for pickup — Order #5678. Arrange delivery: admin.onlyou.life"

### 34.4 Daily Digest Email

Sent every day at 9:00 AM IST:

```
Subject: Onlyou Daily Summary — 26 Feb 2026

Good morning,

YESTERDAY'S SUMMARY:
• 12 new consultations submitted
• 8 prescriptions created
• 5 lab orders completed
• 7 deliveries confirmed
• Revenue: ₹18,450

REQUIRING ATTENTION:
• 2 SLA breaches (lab results overdue)
• 1 pending refund approval
• 3 deliveries ready but not dispatched

UPCOMING TODAY:
• 4 auto-reorders scheduled
• 6 nurse visits scheduled
• 2 subscription renewals

Open dashboard: admin.onlyou.life
```

---

## 36. Responsive Design & Desktop Enhancements

### 36.1 Breakpoints

| Breakpoint | Layout | Navigation |
|------------|--------|------------|
| < 640px (mobile) | Single column, cards stack | Bottom nav (5 tabs) |
| 640px–1023px (tablet) | Wider cards, 2-column grids | Bottom nav |
| ≥ 1024px (desktop) | Sidebar + main content, split panes | Sidebar |

### 36.2 Desktop-Specific Features

**Split-pane view (Lab Orders & Deliveries):**
```
┌─────────────────────────┬───────────────────────────────┐
│                         │                               │
│  Lab Order List         │  Lab Order Detail             │
│  (scrollable)           │  (selected item)              │
│                         │                               │
│  ┌──────────────┐       │  Timeline, assignments,       │
│  │ Order #1234  │◄──────│  actions, patient info        │
│  └──────────────┘       │                               │
│  ┌──────────────┐       │                               │
│  │ Order #1235  │       │                               │
│  └──────────────┘       │                               │
│  ┌──────────────┐       │                               │
│  │ Order #1236  │       │                               │
│  └──────────────┘       │                               │
│                         │                               │
└─────────────────────────┴───────────────────────────────┘
```

**Bulk actions (desktop toolbar):**
- Select multiple lab orders → "Assign Nurse to All" (same nurse for a batch in same area)
- Select multiple deliveries → "Send All to Same Pharmacy" (batch dispatch)
- Checkbox selection on each card, toolbar appears when ≥ 1 selected

**Charts panel:** Overview shows interactive charts (revenue trend, daily orders, SLA compliance) — hidden on mobile for performance.

### 36.3 Mobile Optimizations

- Touch targets: minimum 44×44px for all tappable elements
- Swipe gestures: swipe left on lab order card → quick actions (Assign Nurse / Escalate)
- Pull-to-refresh on all list screens
- Bottom sheet modals (slide up from bottom) instead of centered modals for all action flows
- Sticky filter tabs (stay visible during scroll)
- FAB (floating action button) on Partners screen for "Add New" quick action

---

## 37. Error States & Edge Cases

### 37.1 Network & Connection Errors

| Scenario | UI Behavior |
|----------|-------------|
| SSE disconnected | Amber banner: "Real-time updates paused. Checking connection..." |
| SSE reconnected | Banner disappears, silent data refresh |
| API call fails (network) | Toast: "Connection error. Please check your internet." + retry button |
| API call fails (server 500) | Toast: "Something went wrong. Please try again." + retry button |
| API call fails (403) | Redirect to login (session expired) |
| Slow network (> 5s response) | Loading skeleton + "Taking longer than usual..." text |

### 37.2 Data Edge Cases

| Scenario | UI Behavior |
|----------|-------------|
| No lab orders exist | Empty state: illustration + "No lab orders yet. Orders appear when doctors request blood work." |
| No deliveries exist | Empty state: illustration + "No delivery orders yet. Orders appear when doctors create prescriptions." |
| No partners added | Empty state: illustration + "No [nurses/labs/pharmacies] added yet. [+ Add your first one]" |
| Nurse has no available capacity | Shown in assignment modal with ⚠️ "At capacity (5/5 today)" — still selectable with warning |
| Lab doesn't offer all required tests | Shown with partial match indicator: "5/6 tests — Missing: DHT" |
| Pharmacy stock issue mid-preparation | Pharmacy marks as "Stock Issue" → admin sees in Issues tab → options: find alternative pharmacy, contact doctor for substitute |
| Delivery person unresponsive | Delivery link expires after 24h → admin reschedules with new delivery person |
| Duplicate assignment attempt | Warning: "This nurse is already assigned to this order." |
| Concurrent admin sessions | Last-write-wins for edits, SSE keeps both sessions in sync for reads |

### 37.3 Destructive Action Confirmations

All destructive actions require confirmation:

| Action | Confirmation Text |
|--------|-------------------|
| Cancel lab order | "Cancel this lab order? The patient and doctor will be notified. Reason: [required field]" |
| Cancel delivery | "Cancel this delivery? Reason: [required field]" |
| Deactivate partner | "Deactivate [Name]? They won't receive new assignments but existing work continues." |
| Deactivate user account | "Deactivate this account? The user will be unable to log in." |
| Approve refund | "Process refund of ₹[amount] to [patient]? This triggers a Razorpay refund." |
| Change SLA threshold | "Changing this threshold affects all future SLA checks. Current breaches won't be recalculated." |

---

## 38. Security & Privacy

### 38.1 Access Control

| Resource | Admin Access Level |
|----------|-------------------|
| Patient personal data | Full read (name, phone, address) — needed for coordination |
| Patient clinical data | Read-only (questionnaire, photos, AI assessment) — no modifications |
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

### 38.2 What Admin CANNOT Do

| Restriction | Reason |
|-------------|--------|
| Create or modify prescriptions | Clinical action — doctor-only |
| Modify AI assessments | Clinical data integrity |
| Change questionnaire responses | Patient data integrity |
| Delete any records | DPDPA compliance — soft delete only |
| Access audit log modification | Insert-only table — no UPDATE/DELETE permissions |
| Impersonate other users | No impersonation feature built |

### 38.3 Audit Logging

Every admin action is logged:

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

### 38.4 Session Security

| Measure | Implementation |
|---------|---------------|
| HttpOnly cookies | JWT tokens not accessible via JavaScript |
| SameSite=Strict | CSRF protection |
| Secure flag | Cookies only sent over HTTPS |
| Token rotation | Every refresh generates new token pair |
| Theft detection | Old refresh token reuse → all tokens revoked |
| Idle timeout | 8 hours (longer than doctor — intermittent use pattern) |
| IP logging | Login IP recorded in audit log |
| Concurrent sessions | Allowed (mobile + desktop simultaneously) |

### 38.5 Data Privacy at the Admin Layer

- Admin sees patient names and phone numbers (necessary for coordination — e.g., calling patients about delivery)
- Admin does NOT see questionnaire responses or AI assessments unless explicitly opening a consultation detail (audit-logged)
- All partner portals receive anonymized patient data — admin is the only human role with full patient data access
- Prescription PDFs downloaded by admin are logged (file access audit)

---

## 39. Analytics Events

### 39.1 Key Events Tracked

| Event | Properties | Purpose |
|-------|-----------|---------|
| `admin.login` | `{ adminId, device, timestamp }` | Login frequency, device usage |
| `admin.overview.viewed` | `{ adminId }` | Dashboard engagement |
| `admin.lab_order.viewed` | `{ adminId, labOrderId }` | Operations monitoring patterns |
| `admin.lab_order.nurse_assigned` | `{ adminId, labOrderId, nurseId }` | Assignment patterns |
| `admin.lab_order.lab_assigned` | `{ adminId, labOrderId, labId }` | Lab preference patterns |
| `admin.lab_order.escalated` | `{ adminId, labOrderId, escalationType }` | Escalation frequency |
| `admin.lab_order.cancelled` | `{ adminId, labOrderId, reason }` | Cancellation patterns |
| `admin.lab_order.recollection_created` | `{ adminId, labOrderId, reason }` | Sample failure rate |
| `admin.delivery.sent_to_pharmacy` | `{ adminId, orderId, pharmacyId }` | Pharmacy preference |
| `admin.delivery.arranged` | `{ adminId, orderId, method }` | Delivery method preference |
| `admin.delivery.manual_override` | `{ adminId, orderId, reason }` | Override frequency (quality signal) |
| `admin.refund.approved` | `{ adminId, refundRequestId, amount }` | Refund patterns |
| `admin.refund.rejected` | `{ adminId, refundRequestId }` | Rejection rate |
| `admin.partner.created` | `{ adminId, partnerType }` | Network growth |
| `admin.partner.deactivated` | `{ adminId, partnerType, partnerId }` | Partner churn |
| `admin.settings.changed` | `{ adminId, settingType, field }` | Configuration changes |
| `admin.sla_breach.viewed` | `{ adminId, breachType }` | SLA attention patterns |
| `admin.activity_feed.scrolled` | `{ adminId, depth }` | Feed engagement depth |
| `admin.bulk_action.used` | `{ adminId, actionType, count }` | Bulk action adoption (desktop) |

### 39.2 Analytics Privacy

- **No PII in analytics events:** Patient names, phone numbers, and clinical data are NEVER included in analytics payloads. Only UUIDs and aggregate metrics.
- **Admin IDs are pseudonymized** in analytics exports.
- **Financial amounts are included** in analytics (₹ values for refund tracking) but not tied to patient PII.

---

*End of PORTAL-ADMIN.md — Admin/Coordinator Dashboard Complete Specification*
