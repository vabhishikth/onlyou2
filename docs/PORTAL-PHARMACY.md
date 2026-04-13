# PORTAL-PHARMACY.md — Pharmacy Portal: Complete Specification

> **Platform:** Onlyou Telehealth — Indian telehealth for stigmatized chronic conditions
> **Portal Type:** Next.js 14 (App Router) — Mobile-first PWA (Progressive Web App)
> **URL:** `pharmacy.onlyou.life`
> **Auth:** Phone OTP (WhatsApp primary, SMS fallback) → JWT (role: `pharmacy`)
> **Navigation:** Bottom navigation with 3 tabs
> **API Protocol:** tRPC (end-to-end type-safe, no codegen)
> **State Management:** Zustand + TanStack Query (tRPC integration)
> **Routing:** Next.js App Router (file-based)
> **Real-time:** SSE + Redis Pub/Sub (server → client push for new prescriptions, status updates, cancellations)
> **Primary Device:** Phone at the pharmacy counter (mobile-first, not mobile-only)
> **PWA:** Installable
> **Local Dev Port:** `3005` (`pnpm --filter pharmacy-portal dev`)

---

## Table of Contents

1. [App Structure & File Layout](#1-app-structure--file-layout)
2. [Authentication & Session Management](#2-authentication--session-management)
3. [PWA Configuration](#3-pwa-configuration)
4. [Role Definition & Privacy Model](#4-role-definition--privacy-model)
5. [Data Models](#5-data-models)
6. [Bottom Navigation & Tab Architecture](#6-bottom-navigation--tab-architecture)
7. [Tab 1: New Orders — Incoming Prescriptions](#7-tab-1-new-orders--incoming-prescriptions)
8. [Tab 2: Preparing — Orders Being Packed](#8-tab-2-preparing--orders-being-packed)
9. [Tab 3: Ready / Picked Up — Completed Orders](#9-tab-3-ready--picked-up--completed-orders)
10. [Stock Issue Reporting Flow](#10-stock-issue-reporting-flow)
11. [Order ID & Prescription Display](#11-order-id--prescription-display)
12. [Notification System (Pharmacy)](#12-notification-system-pharmacy)
13. [Real-Time System (Pharmacy Portal)](#13-real-time-system-pharmacy-portal)
14. [tRPC API Reference](#14-trpc-api-reference)
15. [Privacy & Data Access Rules (RBAC)](#15-privacy--data-access-rules-rbac)
16. [Security & Session Management](#16-security--session-management)
17. [Error States & Edge Cases](#17-error-states--edge-cases)
18. [Responsive Design & Layout](#18-responsive-design--layout)
19. [Analytics Events](#19-analytics-events)
20. [Integration with Other Portals](#20-integration-with-other-portals)
21. [Medication Order Lifecycle — Complete Status Flow](#21-medication-order-lifecycle--complete-status-flow)
22. [SLA Thresholds & Escalation Rules](#22-sla-thresholds--escalation-rules)
23. [Medications by Vertical](#23-medications-by-vertical)
24. [Build & Deployment](#24-build--deployment)
25. [Testing Checklist](#25-testing-checklist)
26. [Appendix: Complete Status Flow Diagram](#26-appendix-complete-status-flow-diagram)

---

## 1. App Structure & File Layout

### Next.js App Router Structure

```
apps/pharmacy-portal/
├── src/
│   ├── app/
│   │   ├── layout.tsx              → Root layout (auth provider, SSE provider, bottom nav)
│   │   ├── page.tsx                → Redirects to /new (default tab)
│   │   ├── login/
│   │   │   └── page.tsx            → Phone OTP login screen
│   │   ├── new/
│   │   │   └── page.tsx            → Tab 1: New incoming prescriptions
│   │   ├── preparing/
│   │   │   └── page.tsx            → Tab 2: Orders being packed
│   │   ├── ready/
│   │   │   └── page.tsx            → Tab 3: Ready for pickup / picked up
│   │   ├── order/
│   │   │   └── [id]/
│   │   │       └── page.tsx        → Order detail view (any status)
│   │   ├── prescription/
│   │   │   └── [id]/
│   │   │       └── page.tsx        → Full-screen prescription PDF viewer
│   │   └── settings/
│   │       └── page.tsx            → Pharmacy staff profile & pharmacy info
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx       → 3-tab bottom navigation bar
│   │   │   ├── TopBar.tsx          → Pharmacy name, notification bell, date display
│   │   │   └── TabBadge.tsx        → Unread count badge on tabs
│   │   ├── new-orders/
│   │   │   ├── NewOrderCard.tsx    → Incoming prescription card
│   │   │   ├── NewOrderList.tsx    → Scrollable list of new orders
│   │   │   └── StartPreparingModal.tsx → Confirmation modal
│   │   ├── preparing/
│   │   │   ├── PreparingCard.tsx   → Order being packed card
│   │   │   ├── PreparingList.tsx   → Scrollable list of orders being packed
│   │   │   └── ReadyForPickupModal.tsx → Confirmation modal
│   │   ├── ready/
│   │   │   ├── ReadyCard.tsx       → Order awaiting/completed pickup card
│   │   │   ├── ReadyList.tsx       → Scrollable list with sub-sections
│   │   │   └── PickupStatusBadge.tsx → Awaiting / Picked Up indicator
│   │   ├── shared/
│   │   │   ├── OrderCard.tsx       → Base order card (shared layout + fields)
│   │   │   ├── MedicationList.tsx  → Medication display with quantities
│   │   │   ├── PrescriptionViewer.tsx → Embedded PDF viewer (tap to full-screen)
│   │   │   ├── StockIssueModal.tsx → Stock issue reporting modal
│   │   │   ├── StatusBadge.tsx     → Order status color badge
│   │   │   ├── TimeElapsed.tsx     → "3 hours ago" / SLA indicator
│   │   │   ├── EmptyState.tsx      → "No orders" state per tab
│   │   │   ├── IssueBanner.tsx     → Yellow warning banner for orders with stock issues
│   │   │   └── PullToRefresh.tsx   → Pull-to-refresh gesture handler
│   │   └── auth/
│   │       ├── LoginForm.tsx       → Phone number input + "Send OTP"
│   │       └── OTPVerify.tsx       → 6-digit OTP entry + timer
│   ├── hooks/
│   │   ├── useAuth.ts             → JWT management, refresh, logout
│   │   ├── useSSE.ts              → SSE connection + event handlers
│   │   ├── useOrders.ts           → tRPC queries for orders
│   │   └── usePharmacy.ts         → Pharmacy profile data
│   ├── stores/
│   │   ├── authStore.ts           → Zustand: auth state (token, user, pharmacy)
│   │   ├── orderStore.ts          → Zustand: order counts, active tab
│   │   └── notificationStore.ts   → Zustand: unread notification count
│   ├── lib/
│   │   ├── trpc.ts                → tRPC client configuration
│   │   ├── sse.ts                 → SSE client setup
│   │   └── utils.ts               → Date formatting, medication display helpers
│   └── types/
│       └── index.ts               → Local type augmentations
├── public/
│   ├── manifest.json              → PWA manifest
│   ├── sw.js                      → Service worker for offline + caching
│   ├── icons/
│   │   ├── icon-192x192.png       → PWA icon (192px)
│   │   └── icon-512x512.png       → PWA icon (512px)
│   └── favicon.ico
├── next.config.js
├── tailwind.config.ts             → Extends @onlyou/ui shared config
├── tsconfig.json
└── package.json
```

### Package Dependencies

```json
{
  "name": "@onlyou/pharmacy-portal",
  "dependencies": {
    "@onlyou/ui": "workspace:*",
    "@onlyou/api-client": "workspace:*",
    "@onlyou/types": "workspace:*",
    "next": "14.x",
    "react": "18.x",
    "zustand": "4.x",
    "@tanstack/react-query": "5.x",
    "@trpc/client": "10.x",
    "@trpc/react-query": "10.x"
  }
}
```

---

## 2. Authentication & Session Management

### Login Flow

```
┌─────────────────────────────────────┐
│        💊 Onlyou Pharmacy            │
│                                     │
│  Enter your phone number to login   │
│                                     │
│  +91 [__________________]          │
│                                     │
│  [ Send OTP via WhatsApp ]          │
│                                     │
│  ───── or ─────                     │
│                                     │
│  [ Send OTP via SMS ]               │
│                                     │
│  ─────────────────────────────────  │
│  Contact admin if you don't have    │
│  portal access.                     │
└─────────────────────────────────────┘
```

### Login Sequence

1. Pharmacy staff enters their phone number (same number configured in Admin Portal → Partners → Pharmacies → Portal Login Phone)
2. System checks: does a `User` with this phone and `role: PHARMACY` exist?
   - Yes → send OTP via WhatsApp (primary) → SMS (fallback)
   - No → show error: "This phone number is not registered as a pharmacy partner. Please contact the Onlyou admin."
3. Staff enters 6-digit OTP
4. Server validates OTP → issues JWT (access token) + refresh token
5. JWT payload includes: `{ userId, role: 'pharmacy', pharmacyId: 'uuid' }`
6. Redirect to `/new` (default tab)

### Token Management

| Token | Storage | Lifetime | Refresh |
|-------|---------|----------|---------|
| Access token (JWT) | In-memory (Zustand store) | 15 minutes | Via refresh token (auto-refresh when <2 min remaining) |
| Refresh token | `httpOnly`, `Secure`, `SameSite=Strict` cookie | 7 days | On access token expiry (rotation: new pair issued each refresh) |

> **⚠️ Cross-Document Token Notes:**
> - **Access token lifetime (15 min):** Matches all other portals (PORTAL-ADMIN.md §4, PORTAL-DOCTOR.md §3, PORTAL-NURSE-FIXED.md §3, PORTAL-LAB-FIXED.md §3) and ARCHITECTURE.md §7. Platform-wide standard.
> - **Refresh token lifetime (7 days):** Pharmacy and lab portals (external partners) use 7 days. Doctor, admin, and nurse portals (internal staff) use 30 days. ARCHITECTURE.md §7 defines "7 days (patient), 30 days (doctor/admin)" but does not explicitly list pharmacy/nurse/lab — pharmacy follows the external partner tier (7 days), matching PORTAL-LAB-FIXED.md.
> - **Access token storage (in-memory vs HttpOnly cookie):** ARCHITECTURE.md §7 says "Web: HttpOnly cookie" for access tokens. However, this portal stores the access token in-memory (Zustand) because the SSE endpoint requires the JWT as a query parameter (the `EventSource` API does not support custom headers, and HttpOnly cookies cannot be read by JavaScript). The admin and doctor portals use HttpOnly cookies for access tokens because their SSE endpoints can rely on same-origin cookie auto-inclusion. This design difference is intentional for PWA portals that need explicit SSE token passing.

### Session Behavior

| Scenario | Behavior |
|----------|----------|
| Tab closed + reopened | Refresh token in cookie → new access token → seamless |
| Access token expires (every 15 min) | Silent auto-refresh via refresh token when <2 min remaining |
| Idle for < 12 hours | Refresh token still valid → auto-refresh on next API call |
| Idle for > 12 hours | Idle timeout: refresh token invalidated → redirect to login screen |
| Idle for > 7 days (no activity at all) | Refresh token expired → redirect to login screen |
| Explicit logout | Clear access token from memory + clear refresh token cookie + blacklist JWT JTI in Redis |
| Account deactivated by admin | Next API call returns 403 → redirect to login → login shows "Account deactivated" |

---

## 3. PWA Configuration

### Manifest (`public/manifest.json`)

```json
{
  "name": "Onlyou Pharmacy",
  "short_name": "Pharmacy",
  "description": "Pharmacy order management portal",
  "start_url": "/new",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#16a34a",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker (`public/sw.js`)

- **Cache strategy:** Network-first for API calls, cache-first for static assets
- **Offline behavior:** Show cached data with "You are offline" banner. Mutations queued locally and replayed when connection restored.
- **Push notifications:** Registered on first successful login (not on login page)
- **Update:** Prompt "New version available. Tap to update." when new service worker detected

### Install Prompt

- On first visit after login: banner at top "Add Pharmacy Portal to your home screen for quick access"
- Tap → triggers browser's native install prompt
- Dismiss → don't show again for 7 days

---

## 4. Role Definition & Privacy Model

### Pharmacy Staff Role

| Attribute | Value |
|-----------|-------|
| Role enum | `PHARMACY` |
| JWT claim | `role: 'pharmacy'` |
| Scope claim | `pharmacyId: 'uuid'` |
| Portal URL | `pharmacy.onlyou.life` |
| Can access | Orders assigned to their pharmacy only |
| Created by | Admin Portal → Partners → Pharmacies → Add/Edit form |

### Privacy Model — What Pharmacy Staff See

The pharmacy portal implements **strict data anonymization**. Pharmacy staff are external partners — they prepare and dispense medication but must not have access to patient personal information or clinical data beyond what's needed to fulfill the prescription.

| Data | Pharmacy Can See | Pharmacy Cannot See |
|------|-----------------|---------------------|
| Order ID | ✅ `ORD-XXXX` format | — |
| Patient anonymous ID | ✅ `ONY-P-XXXX` | — |
| Medication names | ✅ | — |
| Medication dosages | ✅ | — |
| Medication quantities | ✅ | — |
| Medication instructions (dosage/frequency) | ✅ | — |
| Prescription PDF | ✅ (tap to view) | — |
| Prescribing doctor name | ✅ | — |
| Doctor NMC registration number | ✅ (for verification) | — |
| Order timestamps | ✅ | — |
| Delivery person name (once assigned) | ✅ | — |
| Patient name | — | ❌ |
| Patient phone | — | ❌ |
| Patient address | — | ❌ |
| Patient condition/diagnosis | — | ❌ |
| Questionnaire responses | — | ❌ |
| AI assessment | — | ❌ |
| Lab results | — | ❌ |
| Doctor-patient messages | — | ❌ |
| Payment information | — | ❌ |

**How anonymization is enforced:**

1. **API layer:** The pharmacy tRPC router only returns anonymized order data. The response type `OrderForPharmacy` excludes patient personal fields — this is not a frontend filter, it's a server-side projection.
2. **Database query:** The Prisma query uses `select` to explicitly include only permitted fields. Patient name, phone, address, and diagnosis are never fetched from the database for pharmacy queries.
3. **CASL.js RBAC:** The pharmacy role's ability definition blocks access to `Patient`, `Consultation`, `Questionnaire`, `AIAssessment`, and `Message` entities entirely.

> **⚠️ Cross-Document Privacy Note:**
> This anonymization model is the **authoritative specification** for pharmacy data access. Note the following cross-document discrepancies where other documents use imprecise shorthand:
> - PROJECT-OVERVIEW.md §7 says "anonymous patient ID, prescription (medications + dosages), doctor name" — **correct**, though pharmacy sees **Order ID** (ORD-XXXX), not Prescription ID.
> - PORTAL-ADMIN.md §20.3 says "prescription ID, medications, dosages, doctor name" — **imprecise**: pharmacy sees **Order ID** (ORD-XXXX), not Prescription ID. `prescriptionId` is explicitly excluded from `OrderForPharmacy`.
> - APP-PATIENT.md §25.4 says "Prescription ID, medications, dosage, prescribing doctor ID" — **imprecise**: pharmacy sees **Order ID** (not Prescription ID) and **doctor name + NMC number** (not "doctor ID").
> - Architecture Blueprint §15 says "prescription ID, medications, dosage, and prescribing doctor ID" — same discrepancy as above.
> - **This document (PORTAL-PHARMACY.md) is the source of truth** for what the pharmacy portal actually returns via the `OrderForPharmacy` type. Other documents should be updated to match.
> - PORTAL-ADMIN.md §13 refers to the pharmacy portal's "Incoming" tab — the correct name is **"New Orders"** / **"New"** tab (see §7 of this document).

---

## 5. Data Models

### Order (Medication Delivery) — Pharmacy-Relevant Fields

```typescript
// Full Order model — pharmacy portal sees a subset of these fields
interface Order {
  id: string;                           // UUID
  orderId: string;                      // Human-readable: "ORD-{SEQUENTIAL_4_DIGIT}"
  prescriptionId: string;
  patientId: string;                    // NOT exposed to pharmacy
  pharmacyId: string | null;            // Set when admin sends to pharmacy

  // Medication details (pharmacy sees these)
  medications: MedicationItem[];        // JSONB array
  prescriptionPdfUrl: string;           // S3 object key (e.g., "prescriptions/{uuid}.pdf") — CloudFront signed URL generated at query time

  // Status lifecycle
  status: OrderStatus;

  // Delivery (pharmacy sees partial)
  deliveryPersonName: string | null;    // Set by admin when arranging delivery
  deliveryPersonPhone: string | null;   // NOT exposed to pharmacy
  deliveryOtp: string | null;           // NOT exposed to pharmacy (hashed)
  deliveryOtpExpiresAt: DateTime | null;
  deliveryMethod: DeliveryMethod | null;

  // Issue tracking
  issueType: PharmacyIssueType | null;
  issueMedications: string[] | null;    // Which medications are unavailable
  issueNotes: string | null;
  issueReportedAt: DateTime | null;
  issueReportedFromStatus: OrderStatus | null; // Tracks whether issue was reported from SENT_TO_PHARMACY or PREPARING (used to determine which tab displays the order during PHARMACY_ISSUE status)

  // Timestamps
  createdAt: DateTime;
  sentToPharmacyAt: DateTime | null;
  preparingAt: DateTime | null;
  readyAt: DateTime | null;
  pickedUpAt: DateTime | null;
  deliveredAt: DateTime | null;
  cancelledAt: DateTime | null;

  // Manual override (admin only)
  manualOverride: boolean;
  overrideReason: string | null;
}

interface MedicationItem {
  name: string;                         // e.g., "Finasteride"
  dosage: string;                       // e.g., "1mg"
  quantity: number;                     // e.g., 30
  form: string;                         // e.g., "tablet", "topical solution", "injection pen"
  instructions: string;                 // e.g., "1 tablet daily, with or without food"
}
```

### OrderForPharmacy — What the API Returns

```typescript
// Projection used by pharmacy tRPC router
interface OrderForPharmacy {
  id: string;
  orderId: string;                      // "ORD-0042"
  anonymousPatientId: string;           // "ONY-P-0045" — computed, not stored
  medications: MedicationItem[];
  prescriptionPdfUrl: string;           // CloudFront signed URL (1-hour expiry)
  doctorName: string;                   // Prescribing doctor's display name
  doctorNmcNumber: string;             // NMC registration for verification
  status: OrderStatus;
  deliveryPersonName: string | null;    // Only shown in Ready tab after delivery arranged

  // Issue tracking
  issueType: PharmacyIssueType | null;
  issueMedications: string[] | null;
  issueNotes: string | null;
  issueReportedAt: DateTime | null;
  issueReportedFromStatus: OrderStatus | null; // Which tab to display PHARMACY_ISSUE orders in (SENT_TO_PHARMACY → New tab, PREPARING → Preparing tab)

  // Timestamps
  sentToPharmacyAt: DateTime;
  preparingAt: DateTime | null;
  readyAt: DateTime | null;
  pickedUpAt: DateTime | null;
  deliveredAt: DateTime | null;              // Shown in Ready tab (Picked Up section) for completed deliveries
}

// Fields explicitly EXCLUDED from OrderForPharmacy:
// - patientId, patient.name, patient.phone, patient.address
// - patient.condition, patient.diagnosisCode
// - deliveryPersonPhone, deliveryOtp, deliveryOtpExpiresAt
// - prescriptionId (internal reference)
// - manualOverride, overrideReason
// - payment information
```

### Order Status Enum

```typescript
enum OrderStatus {
  // Pre-pharmacy stages (pharmacy portal does NOT see these)
  CREATED = 'CREATED',                   // Doctor created prescription → order auto-created

  // Pharmacy-relevant stages (pharmacy portal DOES see these)
  SENT_TO_PHARMACY = 'SENT_TO_PHARMACY', // Admin sent prescription to this pharmacy
  PREPARING = 'PREPARING',               // Pharmacy staff tapped "Start Preparing"
  READY = 'READY',                       // Pharmacy staff tapped "Ready for Pickup"

  // Post-pharmacy stages (pharmacy portal sees for context, but no actions)
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY', // Admin arranged delivery, person picked up from pharmacy
  DELIVERED = 'DELIVERED',               // Delivery confirmed via OTP

  // Special statuses
  PHARMACY_ISSUE = 'PHARMACY_ISSUE',     // Pharmacy reported a stock issue
  DELIVERY_FAILED = 'DELIVERY_FAILED',   // Delivery person couldn't deliver (admin manages)
  CANCELLED = 'CANCELLED',               // Coordinator or system cancelled the order
  REASSIGNED = 'REASSIGNED'              // Admin reassigned to a different pharmacy
}
```

> **⚠️ Cross-Document Status Note:**
> - **Canonical enum (this document + ARCHITECTURE.md):** `PREPARING`, `READY`, `PHARMACY_ISSUE`. These are the actual database enum values used in the Prisma schema and all backend logic.
> - **Spec document mismatch:** onlyou-spec-resolved-v4.md §4.6 uses prefixed names: `PHARMACY_PREPARING`, `PHARMACY_READY`, `PHARMACY_ISSUE`. The first two are incorrect — they should be `PREPARING` and `READY` to match the implementation.
> - **Patient app mismatch:** APP-PATIENT.md §6.1 lists delivery statuses as `PHARMACY_PREPARING`, `PHARMACY_READY`, `PHARMACY_STOCK_ISSUE`. These appear in a "Status" column that resembles enum values, but they should be understood as **patient-facing display status codes** that the frontend maps from the canonical `OrderStatus` enum. Notably, `PHARMACY_STOCK_ISSUE` differs from the canonical `PHARMACY_ISSUE` — APP-PATIENT.md should be corrected. The patient app maps: `PREPARING` → display as "Pharmacy is preparing", `READY` → display as "Ready for pickup by delivery", `PHARMACY_ISSUE` → display as "Medication temporarily unavailable".
> - **Admin portal (PORTAL-ADMIN.md §11.3):** Uses the same `OrderStatus` enum. However, its Delivery Status Colors table does not include `PHARMACY_ISSUE` or `REASSIGNED` — these should be added.
> - **Enum completeness:** ARCHITECTURE.md §5 only shows the happy-path status flow (`CREATED → SENT_TO_PHARMACY → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED`). This document defines the **complete** enum including special statuses: `PHARMACY_ISSUE`, `DELIVERY_FAILED`, `CANCELLED`, and `REASSIGNED`.
> - **Timestamp naming:** ARCHITECTURE.md §5 uses the shorthand `sentAt` for the sent-to-pharmacy timestamp. This document uses the more descriptive `sentToPharmacyAt`. The Prisma schema should use `sentToPharmacyAt` as the canonical field name.

### Pharmacy (Partner Entity)

```typescript
interface Pharmacy {
  id: string;
  name: string;
  city: string;
  address: string;                      // Also serves as pickup address for delivery
  phone: string;                        // Main contact number
  contactPerson: string;                // Pharmacist name
  portalLoginPhone: string;             // Phone number for OTP login
  medicationsStocked: string[];         // List of medication names this pharmacy stocks
  operatingHours: string;               // e.g., "9:00 AM — 9:00 PM"
  rating: number | null;                // Internal quality rating
  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

> **⚠️ Cross-Document Model Note:**
> ARCHITECTURE.md §5 defines a minimal Pharmacy model: `(id, name, city, address, phone, medicationsStocked[], operatingHours, isActive)`. This document extends it with additional fields required for portal functionality: `contactPerson`, `portalLoginPhone`, `rating`, `createdAt`, `updatedAt`. These additional fields should be reflected in the Prisma schema.

### Pharmacy Issue Types

```typescript
enum PharmacyIssueType {
  OUT_OF_STOCK = 'OUT_OF_STOCK',             // One or more medications completely unavailable
  PARTIAL_STOCK = 'PARTIAL_STOCK',           // Some medications available, others not
  INCORRECT_PRESCRIPTION = 'INCORRECT_PRESCRIPTION', // Prescription details seem incorrect
  QUANTITY_CONCERN = 'QUANTITY_CONCERN',      // Unusual quantity or dosage concern
  REGULATORY_CONCERN = 'REGULATORY_CONCERN', // Controlled substance or schedule issue
  OTHER = 'OTHER'
}

enum DeliveryMethod {
  RAPIDO = 'RAPIDO',
  DUNZO = 'DUNZO',
  OWN = 'OWN',                               // Platform's own delivery person
  OTHER = 'OTHER'
}
```

---

## 6. Bottom Navigation & Tab Architecture

### Navigation Layout

```
┌─────────────────────────────────────┐
│  💊 MedPlus Pharmacy    🔔(3)      │  ← Top bar: pharmacy name + notifications
├─────────────────────────────────────┤
│                                     │
│                                     │
│         [Tab Content Area]          │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  📥 New (2)  │  ⚙️ Preparing (1)  │  ✅ Ready  │  ← Bottom nav (3 tabs)
└─────────────────────────────────────┘
```

### Tab Definitions

| Tab | Icon | Label | Route | Badge | Content |
|-----|------|-------|-------|-------|---------|
| 1 | 📥 | New | `/new` | Red count of incoming orders | Incoming prescriptions to start preparing |
| 2 | ⚙️ | Preparing | `/preparing` | Yellow count of orders being packed | Orders currently being prepared |
| 3 | ✅ | Ready | `/ready` | — | Ready for pickup + picked up (historical) |

### Badge Count Logic

- **New tab badge:** Count of orders with `status = SENT_TO_PHARMACY` for this pharmacy
- **Preparing tab badge:** Count of orders with `status = PREPARING` for this pharmacy
- **Ready tab badge:** No badge (completed/historical items)

Badges update in real-time via SSE events. When a new prescription arrives (SSE: `pharmacy.new_order`), the New tab badge increments without page refresh.

### Top Bar

```
┌─────────────────────────────────────┐
│  💊 MedPlus Pharmacy    🔔(3)      │
│  📅 28 Feb 2026                     │
└─────────────────────────────────────┘
```

- **Pharmacy name:** Fetched from `Pharmacy.name` via `trpc.pharmacy.profile.getMe`
- **Notification bell:** Shows unread count; tapping opens notification history (push notifications received)
- **Date:** Current date display (useful for daily order tracking)

---

## 7. Tab 1: New Orders — Incoming Prescriptions

### Purpose

Display all prescriptions that have been sent to this pharmacy by the Onlyou coordinator. Pharmacy staff review the medication list and start preparing.

### Screen Layout

```
┌─────────────────────────────────────┐
│  💊 MedPlus Pharmacy    🔔(2)      │
│  📅 28 Feb 2026                     │
├─────────────────────────────────────┤
│                                     │
│  📥 NEW ORDERS (2)                  │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 📦 ORD-0042             NEW     ││
│  │                                  ││
│  │ Patient: ONY-P-0045              ││
│  │ Rx by: Dr. Rajesh Patel          ││
│  │ NMC: 12345                       ││
│  │                                  ││
│  │ Medications:                     ││
│  │  • Finasteride 1mg × 30 tablets  ││
│  │  • Minoxidil 5% × 1 bottle      ││
│  │                                  ││
│  │ Rx PDF: [📄 View Prescription]   ││
│  │                                  ││
│  │ Received: 28 Feb, 11:00 AM       ││
│  │ (2 hours ago)                    ││
│  │                                  ││
│  │ [  🟢 START PREPARING  ]        ││
│  │                                  ││
│  │ [⚠️ Stock Issue]                 ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 📦 ORD-0043             NEW     ││
│  │                                  ││
│  │ Patient: ONY-P-0048              ││
│  │ Rx by: Dr. Priya Sharma          ││
│  │ NMC: 67890                       ││
│  │                                  ││
│  │ Medications:                     ││
│  │  • Tadalafil 5mg × 30 tablets   ││
│  │                                  ││
│  │ Rx PDF: [📄 View Prescription]   ││
│  │                                  ││
│  │ Received: 28 Feb, 11:30 AM       ││
│  │ (1.5 hours ago)                  ││
│  │                                  ││
│  │ [  🟢 START PREPARING  ]        ││
│  │                                  ││
│  │ [⚠️ Stock Issue]                 ││
│  └─────────────────────────────────┘│
│                                     │
├─────────────────────────────────────┤
│  📥 New (2)  │ ⚙️ Preparing (1) │ ✅ Ready │
└─────────────────────────────────────┘
```

### Order Card Fields — New Orders

| Field | Source | Display |
|-------|--------|---------|
| Order ID | `order.orderId` | "ORD-0042" |
| Status badge | `order.status` | "NEW" (indigo badge) |
| Patient anonymous ID | Computed from `patientId` | "ONY-P-0045" |
| Doctor name | `prescription.doctor.name` | "Dr. Rajesh Patel" |
| Doctor NMC number | `prescription.doctor.nmcNumber` | "NMC: 12345" |
| Medications | `order.medications[]` | List with name, dosage, quantity, form |
| Prescription PDF | `order.prescriptionPdfUrl` | Tap → opens full-screen PDF viewer |
| Received time | `order.sentToPharmacyAt` | Absolute time + relative ("2 hours ago") |

### Issue Banner

If the order has `status = PHARMACY_ISSUE`, the card shows a yellow warning banner:

```
┌──────────────────────────────────────┐
│  ⚠️ Stock Issue Reported              │
│  Reported: 28 Feb, 12:00 PM          │
│  Waiting for coordinator resolution   │
│                                       │
│  Issue: Minoxidil 5% out of stock     │
│  Notes: "Expected restock in 2 days"  │
└──────────────────────────────────────┘
```

When a `PHARMACY_ISSUE` order is shown in the New tab, the "Start Preparing" button is **disabled** and grayed out. The pharmacy must wait for the coordinator to resolve the issue (reassign to another pharmacy, or confirm to proceed if partial stock is acceptable).

### "Start Preparing" Action

1. Pharmacy staff taps **"Start Preparing"**
2. Confirmation modal appears:

```
┌──────────────────────────────────────┐
│  START PREPARING ORDER?               │
│                                       │
│  Order: ORD-0042                      │
│  Medications:                         │
│  • Finasteride 1mg × 30 tablets      │
│  • Minoxidil 5% × 1 bottle          │
│                                       │
│  Confirm that all medications are     │
│  available and you're ready to start. │
│                                       │
│  [Cancel]        [Start Preparing]    │
└──────────────────────────────────────┘
```

3. On confirm → API call: `trpc.pharmacy.order.startPreparing.mutate({ orderId })`
4. Server actions:
   - Validate order belongs to this pharmacy
   - Validate current status is `SENT_TO_PHARMACY`
   - Update `Order.status` → `PREPARING`
   - Set `Order.preparingAt` = now
   - SSE event → coordinator (admin portal)
   - Notification → coordinator: "Pharmacy started preparing ORD-0042"
   - Audit log entry: `pharmacy_started_preparing`
5. Success toast: "Order moved to Preparing"
6. Card animates out of New tab → appears in Preparing tab
7. Tab badges update

### Sorting

Orders sorted by:
1. Orders with issues first (yellow banner, so staff is aware)
2. Then by `sentToPharmacyAt` ascending (oldest first — FIFO)

### Empty State

```
┌─────────────────────────────────────┐
│                                     │
│           📭                        │
│   No new orders right now           │
│                                     │
│   New prescriptions will appear     │
│   here automatically when sent      │
│   by the coordinator.               │
│                                     │
└─────────────────────────────────────┘
```

### Pull to Refresh

Pull down gesture → refetches `trpc.pharmacy.order.list({ status: ['SENT_TO_PHARMACY'] })` → shows loading spinner → updates list.

---

## 8. Tab 2: Preparing — Orders Being Packed

### Purpose

Display all orders that the pharmacy has started preparing. Pharmacy staff pack the medications and mark them as ready for pickup when done.

### Screen Layout

```
┌─────────────────────────────────────┐
│  💊 MedPlus Pharmacy    🔔         │
│  📅 28 Feb 2026                     │
├─────────────────────────────────────┤
│                                     │
│  ⚙️ PREPARING (1)                   │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 📦 ORD-0041        PREPARING    ││
│  │                                  ││
│  │ Patient: ONY-P-0039              ││
│  │ Rx by: Dr. Rajesh Patel          ││
│  │                                  ││
│  │ Medications:                     ││
│  │  • Finasteride 1mg × 30 tablets  ││
│  │  • Minoxidil 5% × 1 bottle      ││
│  │  • Biotin 10000mcg × 30 tablets  ││
│  │                                  ││
│  │ Rx PDF: [📄 View Prescription]   ││
│  │                                  ││
│  │ Started preparing: 28 Feb, 10 AM ││
│  │ ⏱️ 3 hours in preparation        ││
│  │                                  ││
│  │ [ ✅ READY FOR PICKUP ]          ││
│  │                                  ││
│  │ [⚠️ Stock Issue]                 ││
│  └─────────────────────────────────┘│
│                                     │
├─────────────────────────────────────┤
│  📥 New (2)  │ ⚙️ Preparing (1) │ ✅ Ready │
└─────────────────────────────────────┘
```

### Additional Fields (vs New tab)

| Field | Source | Display |
|-------|--------|---------|
| Started preparing time | `order.preparingAt` | "28 Feb, 10:00 AM" |
| Time in preparation | Computed: `now - preparingAt` | "3 hours in preparation" |

### Time Indicators

| Duration in Preparation | Indicator | Meaning |
|------------------------|-----------|---------|
| < 2 hours | 🟢 Green clock | On track |
| 2–4 hours | 🟡 Amber clock | Taking a while — coordinator may check in |
| > 4 hours | 🔴 Red clock | SLA approaching breach |

> **⚠️ Cross-Document SLA Note:**
> The "4 hours for pharmacy preparation" SLA is checked by the BullMQ `sla-check` repeatable job every 15 minutes (ARCHITECTURE.md §8). If breached, the coordinator receives an alert. The pharmacy portal shows the visual indicator but does NOT show SLA language to the pharmacy staff — it's purely for their own awareness.

### "Ready for Pickup" Action

1. Pharmacy staff finishes packing → taps **"Ready for Pickup"**
2. Confirmation modal:

```
┌──────────────────────────────────────┐
│  MARK ORDER AS READY?                 │
│                                       │
│  Order: ORD-0041                      │
│                                       │
│  Confirm that all medications are     │
│  packed and ready for the delivery    │
│  person to collect.                   │
│                                       │
│  [Cancel]          [Mark as Ready]    │
└──────────────────────────────────────┘
```

3. On confirm → API call: `trpc.pharmacy.order.markReady.mutate({ orderId })`
4. Server actions:
   - Validate order belongs to this pharmacy
   - Validate current status is `PREPARING`
   - Update `Order.status` → `READY`
   - Set `Order.readyAt` = now
   - SSE event → coordinator (admin portal)
   - Notification → coordinator: "Order ORD-0041 ready at MedPlus (MG Road). Arrange delivery."
   - SSE event → patient (if patient app is open)
   - Notification → patient (push + WhatsApp): "Your medication is ready and will be delivered soon."
   - Audit log entry: `pharmacy_marked_ready`
5. Success toast: "Order marked as ready for pickup"
6. Card animates out of Preparing tab → appears in Ready tab ("Awaiting Pickup" section)
7. Tab badges update

### Sorting

Orders sorted by:
1. Orders with issues first (yellow banner)
2. Then by `preparingAt` ascending (oldest being prepared first)

### Empty State

```
┌─────────────────────────────────────┐
│                                     │
│           📦                        │
│   No orders being prepared          │
│                                     │
│   Start preparing an order from     │
│   the New tab to see it here.       │
│                                     │
└─────────────────────────────────────┘
```

---

## 9. Tab 3: Ready / Picked Up — Completed Orders

### Purpose

Display orders that have been marked as ready, split into two sections: those still awaiting pickup by a delivery person, and those that have been picked up (historical context).

### Screen Layout

```
┌─────────────────────────────────────┐
│  💊 MedPlus Pharmacy    🔔         │
│  📅 28 Feb 2026                     │
├─────────────────────────────────────┤
│                                     │
│  ── AWAITING PICKUP (1) ──          │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 📦 ORD-0040           READY     ││
│  │                                  ││
│  │ Patient: ONY-P-0037              ││
│  │ Rx by: Dr. Priya Sharma          ││
│  │                                  ││
│  │ Medications:                     ││
│  │  • Tadalafil 5mg × 30 tablets   ││
│  │                                  ││
│  │ Ready since: 28 Feb, 9:30 AM    ││
│  │ ⏱️ Waiting 4.5 hours for pickup  ││
│  │                                  ││
│  │ Delivery: Not yet assigned 🔴   ││
│  └─────────────────────────────────┘│
│                                     │
│  ── PICKED UP (3) ──               │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 📦 ORD-0038        PICKED UP    ││
│  │                                  ││
│  │ Patient: ONY-P-0032              ││
│  │ Medications:                     ││
│  │  • Finasteride 1mg × 30         ││
│  │  • Minoxidil 5% × 1 bottle     ││
│  │                                  ││
│  │ Ready: 27 Feb, 2 PM              ││
│  │ Picked up: 27 Feb, 4 PM          ││
│  │ By: Ravi K.                      ││
│  │                                  ││
│  │ Status: 🟣 Out for Delivery      ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 📦 ORD-0035        DELIVERED ✅  ││
│  │                                  ││
│  │ Patient: ONY-P-0028              ││
│  │ Medications:                     ││
│  │  • Semaglutide 0.5mg × 4 pens  ││
│  │                                  ││
│  │ Ready: 26 Feb, 11 AM             ││
│  │ Picked up: 26 Feb, 1 PM          ││
│  │ Delivered: 26 Feb, 2:30 PM       ││
│  │ By: Amit S.                      ││
│  └─────────────────────────────────┘│
│                                     │
│  [Load More...]                     │
│                                     │
├─────────────────────────────────────┤
│  📥 New (2)  │ ⚙️ Preparing (1) │ ✅ Ready │
└─────────────────────────────────────┘
```

### Two Sections

**Section 1: Awaiting Pickup**
- Orders with `status = READY`
- Shows "Ready since" time + waiting duration
- Shows delivery assignment status:
  - "Not yet assigned 🔴" if `deliveryPersonName` is null
  - "Delivery: Ravi K. 🟢" if delivery person assigned by coordinator

**Section 2: Picked Up**
- Orders with `status = OUT_FOR_DELIVERY` or `status = DELIVERED`
- Shows: ready time, pickup time, delivery person name
- Post-delivery status:
  - 🟣 "Out for Delivery" — delivery in progress
  - ✅ "Delivered" — confirmed via OTP
- Limited to last 7 days of history (pagination via "Load More" button)

### Time Indicators — Awaiting Pickup

| Duration Waiting | Indicator | Meaning |
|-----------------|-----------|---------|
| < 2 hours | 🟢 Normal | Coordinator is arranging delivery |
| 2–4 hours | 🟡 Amber | May want to call coordinator |
| > 4 hours | 🔴 Red | Something may be delayed |

### No Actions in Ready Tab

The pharmacy has completed its work once the order is marked READY. This tab is read-only for context. The coordinator manages delivery arrangement from the admin portal.

### Sorting

- **Awaiting Pickup:** By `readyAt` ascending (oldest waiting first)
- **Picked Up:** By `pickedUpAt` descending (most recently picked up first)

### Empty State

```
┌─────────────────────────────────────┐
│                                     │
│           ✅                        │
│   No orders ready yet               │
│                                     │
│   Orders you've prepared will       │
│   appear here once marked ready.    │
│                                     │
└─────────────────────────────────────┘
```

---

## 10. Stock Issue Reporting Flow

### When Available

The **"Stock Issue"** button appears on order cards in both the **New Orders** tab and the **Preparing** tab. It is NOT available in the Ready tab (if it was ready, stock wasn't an issue).

### Stock Issue Modal

```
┌──────────────────────────────────────┐
│  ⚠️ REPORT STOCK ISSUE               │
│                                       │
│  Order: ORD-0042                      │
│                                       │
│  Select issue type:                   │
│                                       │
│  ( ) Out of stock                     │
│  ( ) Partial stock available          │
│  ( ) Incorrect prescription           │
│  ( ) Quantity/dosage concern          │
│  ( ) Regulatory concern               │
│  ( ) Other                            │
│                                       │
│  ── WHICH MEDICATIONS? ────────────  │
│  (Select all that apply)              │
│                                       │
│  [✓] Finasteride 1mg                  │
│  [ ] Minoxidil 5%                     │
│                                       │
│  Additional notes:                    │
│  ┌────────────────────────────────┐  │
│  │ Expected restock in 2 days.    │  │
│  │ Have generic alternative.      │  │
│  └────────────────────────────────┘  │
│                                       │
│  [Cancel]           [Report Issue]    │
└──────────────────────────────────────┘
```

### Modal Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Issue type | Radio buttons (6 options) | ✅ | From `PharmacyIssueType` enum |
| Affected medications | Checkboxes (from order's medication list) | ✅ (for OUT_OF_STOCK, PARTIAL_STOCK) | Multi-select; shows all meds in the order |
| Additional notes | Text area | ❌ | Max 500 characters. Useful for restock dates, alternative suggestions |

### Post-Report Flow

1. Pharmacy staff fills in issue details → taps **"Report Issue"**
2. API call: `trpc.pharmacy.order.reportIssue.mutate({ orderId, issueType, issueMedications, notes })`
3. Server actions:
   - Validate order belongs to this pharmacy
   - Validate current status is `SENT_TO_PHARMACY` or `PREPARING`
   - Update `Order.status` → `PHARMACY_ISSUE`
   - Set `Order.issueType`, `Order.issueMedications`, `Order.issueNotes`, `Order.issueReportedAt`
   - Set `Order.issueReportedFromStatus` = previous status (either `SENT_TO_PHARMACY` or `PREPARING`) — used to determine which tab displays the order during the issue
   - SSE event → coordinator (admin portal): urgent alert
   - Notification → coordinator (push + WhatsApp): "⚠️ Pharmacy stock issue for ORD-0042: [Minoxidil 5%] out of stock at MedPlus (MG Road)"
   - Notification → patient (push): "There's a slight delay preparing your medication. Our team is working on it."
   - Audit log entry: `pharmacy_reported_issue`
4. Success toast: "Issue reported. The coordinator has been notified."
5. Order card now shows yellow issue banner (see Section 7)
6. "Start Preparing" / "Ready for Pickup" buttons are **disabled** until coordinator resolves

### Coordinator Resolution Options (Admin Portal Side)

The coordinator in the admin portal sees the issue and can:
1. **Reassign to another pharmacy** → order removed from this pharmacy's portal (SSE event + toast: "Order reassigned to another pharmacy")
2. **Proceed anyway** → coordinator confirms partial fulfillment is OK → issue banner removed, actions re-enabled (SSE event)
3. **Cancel order** → order removed from pharmacy portal (SSE event + toast: "Order cancelled")
4. **Contact doctor** → ask for medication substitution → updated prescription sent back

---

## 11. Order ID & Prescription Display

### Order ID Format

```
ORD-{SEQUENTIAL_4_DIGIT}
```

Examples: `ORD-0001`, `ORD-0042`, `ORD-1234`

### Anonymous Patient ID Format

```
ONY-P-{SEQUENTIAL_4_DIGIT}
```

Examples: `ONY-P-0001`, `ONY-P-0045`, `ONY-P-1234`

> **⚠️ Cross-Document Format Note:**
> The "ONY-P-XXXX" format matches the anonymous ID format used in the spec (onlyou-spec-resolved-v4.md §4.6: "ONY-P-0045"). The lab portal uses a different format for sample IDs: "ONY-{YEAR}-{SEQUENTIAL_4_DIGIT}" (e.g., "ONY-2026-0042") — see PORTAL-LAB-FIXED.md §12. These are different entities with different ID formats.

### Prescription PDF Viewer

Tapping **"View Prescription"** on any order card opens a full-screen PDF viewer:

```
┌─────────────────────────────────────┐
│  ← Close     PRESCRIPTION           │
│                                     │
│  ┌─────────────────────────────────┐│
│  │                                  ││
│  │     [Prescription PDF rendered   ││
│  │      in embedded viewer]         ││
│  │                                  ││
│  │  Rx: Dr. Rajesh Patel           ││
│  │  NMC: 12345                      ││
│  │  Date: 27 Feb 2026               ││
│  │                                  ││
│  │  Patient: ONY-P-0045             ││
│  │                                  ││
│  │  1. Finasteride 1mg              ││
│  │     Qty: 30 tablets              ││
│  │     Sig: 1 tablet daily          ││
│  │                                  ││
│  │  2. Minoxidil 5% topical         ││
│  │     Qty: 1 bottle (60ml)         ││
│  │     Sig: Apply 1ml 2x daily      ││
│  │                                  ││
│  └─────────────────────────────────┘│
│                                     │
│  Pinch to zoom | Swipe to scroll    │
│                                     │
└─────────────────────────────────────┘
```

- **Route:** `/prescription/[id]`
- **PDF loading:** CloudFront signed URL (1-hour expiry). If expired, auto-refreshes URL via API.
- **Viewer:** Uses `react-pdf` library for in-browser rendering (no download)
- **Gestures:** Pinch to zoom, swipe to scroll
- **Close:** "← Close" returns to previous tab

### Medication List Display

When the medication list is long (>3 items), the card shows the first 3 with a "+ X more" expandable:

```
Medications:
  • Finasteride 1mg × 30 tablets
  • Minoxidil 5% × 1 bottle
  • Biotin 10000mcg × 30 tablets
  + 2 more [tap to expand]
```

---

## 12. Notification System (Pharmacy)

### Inbound Events (Pharmacy Receives)

| Event | Source | Channel | Message |
|-------|--------|---------|---------|
| New prescription sent | Admin portal | SSE + Push + WhatsApp | "New prescription received — Finasteride, Minoxidil. Please prepare." |
| Order cancelled | Admin portal | SSE + Push | "Order ORD-0042 has been cancelled." |
| Order reassigned away | Admin portal | SSE + Push | "Order ORD-0042 has been reassigned to another pharmacy." |
| Issue resolved: proceed | Admin portal | SSE + Push | "Stock issue for ORD-0042 resolved. You may proceed with preparation." |
| Issue resolved: reassigned | Admin portal | SSE | Order removed from portal (toast notification) |
| Delivery person assigned | Admin portal | SSE | Ready tab card shows delivery person name |
| Order picked up by delivery | Delivery flow | SSE | Ready tab card moves to "Picked Up" section |
| SLA reminder | BullMQ job | Push | "Order ORD-0041 has been preparing for 4+ hours. Please update status." |

### Outbound Events (Pharmacy Triggers)

| Pharmacy Action | Status Change | Recipients |
|----------------|---------------|------------|
| Start Preparing | `SENT_TO_PHARMACY` → `PREPARING` | Coordinator (SSE), Patient (push + WhatsApp: "Pharmacy is preparing your medication") |
| Mark Ready | `PREPARING` → `READY` | Coordinator (SSE + push: "Order ready, arrange delivery"), Patient (push + WhatsApp: "Your medication is ready and will be delivered soon") |
| Report Stock Issue | → `PHARMACY_ISSUE` | Coordinator (push + WhatsApp — URGENT), Patient (push: "Slight delay") |

### Push Notification Configuration

- Pharmacy portal uses standard Web Push API via service worker
- Push subscription created on first login
- Notification permission requested after first successful login (not on the login page)
- WhatsApp notifications sent to the pharmacy's **main contact number** (`Pharmacy.phone` — the contact person's phone). This is distinct from `Pharmacy.portalLoginPhone` which is used exclusively for portal OTP login. In most cases both are the same person (the pharmacist), but they can differ if the pharmacy designates separate numbers for operations vs. portal access.

---

## 13. Real-Time System (Pharmacy Portal)

### SSE Connection

Pharmacy portal maintains a persistent SSE connection to receive real-time updates.

**SSE endpoint:** `GET /api/sse/pharmacy?pharmacyId={id}`

**Authentication:** JWT token passed as query parameter (SSE doesn't support custom headers in EventSource API). Token validated server-side on connection establishment.

### Events Consumed

```typescript
// SSE event types the pharmacy portal subscribes to
type PharmacySSEEvent =
  | { type: 'pharmacy.new_order'; data: { orderId: string; medications: string[] } }
  | { type: 'pharmacy.order_cancelled'; data: { orderId: string; reason: string } }
  | { type: 'pharmacy.order_reassigned'; data: { orderId: string } }
  | { type: 'pharmacy.issue_resolved'; data: { orderId: string; resolution: 'proceed' | 'reassigned' | 'cancelled' } }
  | { type: 'pharmacy.delivery_assigned'; data: { orderId: string; deliveryPersonName: string } }
  | { type: 'pharmacy.order_picked_up'; data: { orderId: string; pickedUpAt: string } }
  | { type: 'pharmacy.order_delivered'; data: { orderId: string; deliveredAt: string } };
```

### Events Published

```typescript
// SSE events the pharmacy portal triggers (via API calls → Redis Pub/Sub → SSE)
type PharmacyPublishedEvent =
  | { type: 'order.status_changed'; data: { orderId: string; newStatus: OrderStatus; triggeredBy: 'pharmacy' } }
  | { type: 'order.issue_reported'; data: { orderId: string; issueType: PharmacyIssueType } };
```

### Reconnection Strategy

| Scenario | Behavior |
|----------|----------|
| SSE connection drops | Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s) |
| Reconnection succeeds | Fetch latest data from API to catch missed events |
| Offline for > 5 minutes | Show banner: "Connection lost. Data may be outdated. [Refresh]" |

---

## 14. tRPC API Reference

### Router: `pharmacy.order`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `list` | Query | `{ status?: OrderStatus[], page?: number, limit?: number }` | `{ items: OrderForPharmacy[], total: number }` | List orders for this pharmacy |
| `getById` | Query | `{ id: string }` | `OrderForPharmacy` | Get single order detail |
| `startPreparing` | Mutation | `{ orderId: string }` | `OrderForPharmacy` | Move order from SENT_TO_PHARMACY → PREPARING |
| `markReady` | Mutation | `{ orderId: string }` | `OrderForPharmacy` | Move order from PREPARING → READY |
| `reportIssue` | Mutation | `{ orderId: string, issueType: PharmacyIssueType, issueMedications?: string[], notes?: string }` | `OrderForPharmacy` | Report a stock/prescription issue |
| `getCounts` | Query | `{}` | `{ new: number, preparing: number, ready: number }` | Get badge counts for all 3 tabs |

### Router: `pharmacy.prescription`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `getPdfUrl` | Query | `{ orderId: string }` | `{ url: string, expiresAt: DateTime }` | Get CloudFront signed URL for prescription PDF |

### Router: `pharmacy.profile`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `getMe` | Query | `{}` | `{ user: PharmacyStaff, pharmacy: Pharmacy }` | Get current pharmacy staff profile + pharmacy info |

### Middleware Chain

All pharmacy portal tRPC procedures pass through:

```
authMiddleware → roleCheck('pharmacy') → pharmacyScope → auditLog → procedure
```

1. **authMiddleware** — validates JWT, extracts user
2. **roleCheck('pharmacy')** — confirms user role is `PHARMACY`
3. **pharmacyScope** — auto-adds `WHERE pharmacyId = ?` to all queries (from JWT `pharmacyId` claim)
4. **auditLog** — logs action to AuditLog table (append-only)

---

## 15. Privacy & Data Access Rules (RBAC)

### CASL.js Rules for Pharmacy Role

```typescript
// Pharmacy staff RBAC rules
const pharmacyAbilities = defineAbility((can, cannot) => {
  // Pharmacy staff can read orders assigned to their pharmacy
  can('read', 'Order', { pharmacyId: user.pharmacyId });

  // Pharmacy staff can update order status (start preparing, mark ready, report issue)
  can('update', 'Order', ['status', 'preparingAt', 'readyAt', 'issueType', 'issueMedications', 'issueNotes', 'issueReportedAt'],
    { pharmacyId: user.pharmacyId });

  // Pharmacy staff can read prescription PDF URL (for orders assigned to them)
  can('read', 'Prescription', ['pdfUrl', 'doctorName', 'doctorNmcNumber'],
    { 'order.pharmacyId': user.pharmacyId });

  // Pharmacy staff can read their own pharmacy info
  can('read', 'Pharmacy', { id: user.pharmacyId });

  // Pharmacy staff CANNOT see any patient personal data
  cannot('read', 'Patient');
  cannot('read', 'User', ['name', 'email', 'phone', 'address']);
  cannot('read', 'Consultation');
  cannot('read', 'Questionnaire');
  cannot('read', 'AIAssessment');
  cannot('read', 'LabOrder');
  cannot('read', 'Message');
  cannot('read', 'NurseVisit');
  cannot('read', 'Wallet');

  // Pharmacy staff CANNOT access other pharmacies' orders
  cannot('read', 'Order', { pharmacyId: { $ne: user.pharmacyId } });

  // Pharmacy staff CANNOT modify delivery details
  cannot('update', 'Order', ['deliveryPersonName', 'deliveryPersonPhone', 'deliveryOtp', 'deliveryMethod']);

  // Pharmacy staff CANNOT cancel or reassign orders
  cannot('update', 'Order', ['cancelledAt']);
  cannot('delete', 'Order');
});
```

### Data Scoping Summary

| Data | Pharmacy Can See | Pharmacy Cannot See |
|------|-----------------|---------------------|
| Order ID (ORD-XXXX) | ✅ | — |
| Anonymous patient ID (ONY-P-XXXX) | ✅ | — |
| Medication names, dosages, quantities | ✅ | — |
| Prescription PDF | ✅ | — |
| Doctor name | ✅ | — |
| Doctor NMC registration number | ✅ | — |
| Order timestamps (sent, preparing, ready) | ✅ | — |
| Delivery person name (once assigned) | ✅ | — |
| Stock issue details (self-reported) | ✅ | — |
| Patient name | — | ❌ |
| Patient phone | — | ❌ |
| Patient address | — | ❌ |
| Patient diagnosis / condition | — | ❌ |
| Questionnaire data | — | ❌ |
| AI assessment | — | ❌ |
| Lab results | — | ❌ |
| Doctor-patient messages | — | ❌ |
| Delivery OTP | — | ❌ |
| Delivery person phone | — | ❌ |
| Payment / subscription data | — | ❌ |

---

## 16. Security & Session Management

### Authentication Security

| Measure | Implementation |
|---------|---------------|
| OTP rate limiting | Max 3 OTP requests per phone per 15 minutes |
| OTP expiry | 5 minutes |
| OTP attempts | Max 5 wrong attempts → locked for 30 minutes |
| JWT signing | RS256 with rotated keys |
| Refresh token | `httpOnly`, `Secure`, `SameSite=Strict` cookie |
| Token blacklisting | On logout — JWT JTI stored in Redis SET with TTL matching remaining access token lifetime (max 15 minutes of storage) |
| CORS | Only `pharmacy.onlyou.life` origin allowed |
| CSP | Strict Content Security Policy headers |
| Idle session timeout | 12 hours of inactivity → refresh token invalidated → redirect to login on next API call |

> **⚠️ Idle Timeout Rationale:**
> PORTAL-ADMIN.md uses an 8-hour idle timeout (coordinator checks intermittently throughout the day). The pharmacy portal uses a longer **12-hour idle timeout** because pharmacy staff use the portal at the counter during their shift (typically 10-12 hours). A shorter timeout would cause frequent re-authentication friction during busy periods. The lab portal (PORTAL-LAB-FIXED.md) does not define an explicit idle timeout, relying only on the 7-day refresh token expiry — this should be aligned.

### Data Security

| Measure | Implementation |
|---------|---------------|
| Prescription PDF access | CloudFront signed URLs, 1-hour expiry |
| API scoping | All queries auto-filtered by `pharmacyId` from JWT |
| Audit logging | Every action logged (append-only, no UPDATE/DELETE) |
| DPDPA consent | Pharmacy sharing covered under patient's `PHARMACY_SHARING` consent record |
| Discreet packaging | Pharmacy sees medication names but has no access to patient condition — packaging is plain Onlyou branding per platform policy |

---

## 17. Error States & Edge Cases

### Network Errors

| Scenario | Behavior |
|----------|----------|
| API call fails (network) | Toast: "Network error. Please try again." + Retry button |
| API call fails (500) | Toast: "Something went wrong. Please try again." + auto-retry once |
| API call fails (403) | Redirect to login (token expired or invalid) |
| API call fails (409 — conflict) | Toast: "This order was already updated. Refreshing..." + refetch data |

### Business Logic Edge Cases

| Scenario | Behavior |
|----------|----------|
| Order cancelled while pharmacy is viewing it | SSE event → Toast: "Order ORD-0042 cancelled by coordinator" → card removed from list |
| Order reassigned while pharmacy is preparing it | SSE event → Toast: "Order ORD-0042 reassigned to another pharmacy" → card removed from list |
| Same order acted on by two pharmacy staff simultaneously | Server-side optimistic locking — second request gets 409 Conflict |
| Pharmacy tries to mark ready an order still in SENT_TO_PHARMACY | Server rejects: "Must start preparing first" → 422 Unprocessable Entity |
| Pharmacy reports stock issue on order already in READY | Server rejects: "Cannot report issue on ready order" → 422 |
| Pharmacy tries to act on order from another pharmacy | 403 Forbidden (RBAC blocks it before reaching business logic) |
| Prescription PDF link expired | Auto-refresh signed URL via `trpc.pharmacy.prescription.getPdfUrl` |
| Very long medication list (>5 items) | Scrollable card with expandable "+ X more" |
| Pharmacy staff's account deactivated while logged in | Next API call returns 403 → redirect to login → login fails with "Account deactivated" |
| Order arrives outside operating hours | Order still appears in New tab — no operating hours enforcement in portal (handled by admin's pharmacy selection) |
| Issue resolved while pharmacy has issue modal open | SSE event → toast notification, modal remains open (staff can dismiss) |

### Validation Rules

| Field | Validation |
|-------|-----------|
| Issue type | Required (one of enum values) |
| Issue medications | Required if issue type is OUT_OF_STOCK or PARTIAL_STOCK |
| Issue notes | Optional, max 500 characters |
| Order ID for mutations | Must match existing order with `pharmacyId = currentPharmacy.id` |

---

## 18. Responsive Design & Layout

### Breakpoints

| Device | Width | Layout |
|--------|-------|--------|
| Phone (primary) | < 640px | Single column, bottom nav, cards full-width |
| Tablet | 640px — 1024px | Single column, wider cards with more horizontal detail |
| Desktop | > 1024px | Two-column layout (order list + detail sidebar), bottom nav moves to sidebar |

### Mobile-First Design Principles

- **Touch targets:** All buttons minimum 44×44px (Apple HIG / Material Design)
- **Bottom nav:** Fixed at bottom, always visible (not scrollable out of view)
- **Cards:** Full-width with 16px horizontal padding
- **Prescription PDF:** Full-screen overlay with pinch-to-zoom
- **Pull to refresh:** Standard gesture on all tab lists
- **Modals:** Bottom sheet style on mobile (slide up from bottom)
- **Font sizes:** Body 16px (no zoom issues on iOS), headings 18-20px
- **Status badges:** Color-coded with icon + text (accessible for colorblind users)

### Offline Behavior

- **Read:** Cached order list available offline (service worker cache)
- **Write:** Mutations queued locally when offline → replayed on reconnect → toast: "Syncing [X] pending actions..."
- **Banner:** "You are offline. Changes will be synced when connection is restored."

---

## 19. Analytics Events

### Events Tracked

| Event | Trigger | Payload |
|-------|---------|---------|
| `pharmacy.login` | Successful login | `{ pharmacyId }` |
| `pharmacy.view_new_orders` | Tab 1 opened | `{ count }` |
| `pharmacy.view_preparing` | Tab 2 opened | `{ count }` |
| `pharmacy.view_ready` | Tab 3 opened | `{ awaitingCount, pickedUpCount }` |
| `pharmacy.start_preparing` | "Start Preparing" confirmed | `{ orderId, timeInNewQueue }` |
| `pharmacy.mark_ready` | "Ready for Pickup" confirmed | `{ orderId, preparationDuration }` |
| `pharmacy.report_issue` | Issue reported | `{ orderId, issueType, medicationCount }` |
| `pharmacy.view_prescription` | Prescription PDF opened | `{ orderId }` |
| `pharmacy.pwa_installed` | PWA installed to home screen | `{ pharmacyId }` |
| `pharmacy.sse_disconnected` | SSE connection lost | `{ duration }` |
| `pharmacy.sse_reconnected` | SSE connection restored | `{ downtime }` |

### Key Metrics (Derived)

| Metric | Calculation | Purpose |
|--------|-------------|---------|
| Avg preparation time | Mean of (`readyAt` - `preparingAt`) | Pharmacy performance |
| Avg time in new queue | Mean of (`preparingAt` - `sentToPharmacyAt`) | Response speed |
| Issue rate | Issues reported / total orders | Stock reliability |
| Time to pickup | Mean of (`pickedUpAt` - `readyAt`) | Delivery coordination speed |

---

## 20. Integration with Other Portals

### Upstream (What feeds into the Pharmacy Portal)

| Source | Action | Effect on Pharmacy Portal |
|--------|--------|--------------------------|
| **Doctor Portal** | Creates prescription | Order record created in backend (status: `CREATED`) — pharmacy does NOT see this yet |
| **Admin Portal** | "Send to Pharmacy" | Order status → `SENT_TO_PHARMACY` with `pharmacyId` set → order appears in pharmacy's New tab (SSE push) |
| **Admin Portal** | Cancels order | Order removed from pharmacy portal (SSE push + toast) |
| **Admin Portal** | Reassigns to different pharmacy | Order removed from current pharmacy's portal (SSE push + toast: "Reassigned") |
| **Admin Portal** | Resolves stock issue (proceed) | Issue banner removed, actions re-enabled (SSE push) |
| **Admin Portal** | Resolves stock issue (reassign) | Order removed from pharmacy portal (SSE push + toast) |
| **Auto-Reorder System** | Subscription renewal creates new order | Admin reviews → sends to pharmacy → appears in New tab (same flow) |

### Downstream (What the Pharmacy Portal feeds)

| Pharmacy Action | Effect on Other Portals |
|----------------|------------------------|
| Start Preparing | Admin portal: delivery card status updates to "PREPARING" (SSE). Patient app: stepper updates to "Pharmacy Preparing". |
| Mark Ready | Admin portal: delivery card shows "READY" → "Arrange Delivery" button enabled (SSE). Patient app: stepper updates to "Ready for Pickup". Coordinator receives push notification. |
| Report Issue | Admin portal: delivery card shows issue banner with details (SSE). Coordinator receives URGENT push + WhatsApp. Patient app: "Slight delay" push notification. |

### Delivery Person (No Portal — SMS Link)

The pharmacy portal does NOT interact directly with the delivery person. The flow is:

1. Pharmacy marks order as READY
2. Coordinator sees "Ready" in admin portal → clicks "Arrange Delivery"
3. Admin enters delivery person details → system generates SMS link
4. Delivery person receives SMS with pickup address (pharmacy) + delivery address (patient)
5. Delivery person picks up from pharmacy → pharmacy portal shows "Picked Up" (SSE event from delivery flow)
6. Delivery person delivers to patient → confirms via OTP → pharmacy portal shows "Delivered" (SSE event)

---

## 21. Medication Order Lifecycle — Complete Status Flow

### Full Lifecycle Diagram

```
         ┌─────────────────────────────┐
         │ Doctor Creates Prescription  │
         └────────────┬────────────────┘
                      ▼
              ┌──────────────┐
              │   CREATED    │ ← Order exists but no pharmacy assigned
              └──────┬───────┘     Admin portal sees this in "New (needs pharmacy)" filter
                     │ Admin sends to pharmacy
                     ▼
         ┌──────────────────────┐
         │  SENT_TO_PHARMACY    │ ← Pharmacy portal New tab shows this
         └──────────┬───────────┘     *** PHARMACY PORTAL STARTS HERE ***
                    │ Pharmacy taps "Start Preparing"
                    ▼
            ┌──────────────┐
            │  PREPARING   │ ← Pharmacy portal Preparing tab shows this
            └──────┬───────┘
                   │ Pharmacy taps "Ready for Pickup"
                   ▼
              ┌──────────┐
              │  READY   │ ← Pharmacy portal Ready tab (Awaiting Pickup)
              └─────┬────┘     *** PHARMACY ACTIVE ROLE ENDS HERE ***
                    │ Admin arranges delivery → person picks up
                    ▼
         ┌──────────────────────┐
         │  OUT_FOR_DELIVERY    │ ← Pharmacy portal Ready tab (Picked Up)
         └──────────┬───────────┘
                    │ Delivery confirmed via OTP
                    ▼
            ┌──────────────┐
            │  DELIVERED   │ ← Pharmacy portal Ready tab (historical)
            └──────────────┘


SPECIAL PATHS:

         ┌────────────────────────┐
         │ Pharmacy Reports Issue  │
         │ (at New or Preparing)   │
         └───────────┬────────────┘
                     ▼
          ┌────────────────────┐
          │  PHARMACY_ISSUE    │ → Coordinator resolves (reassign/proceed/cancel)
          └────────────────────┘

         ┌────────────────────────┐
         │ Admin Cancels Order     │
         │ (at any pre-delivery)   │
         └───────────┬────────────┘
                     ▼
          ┌────────────────────┐
          │    CANCELLED       │ → Order removed from pharmacy portal
          └────────────────────┘

         ┌────────────────────────┐
         │ Admin Reassigns Order   │
         │ (to different pharmacy)  │
         └───────────┬────────────┘
                     ▼
          ┌────────────────────┐
          │   REASSIGNED       │ → Order removed from current pharmacy portal
          └────────────────────┘

         ┌────────────────────────┐
         │ Delivery Failed         │
         │ (delivery person issue)  │
         └───────────┬────────────┘
                     ▼
          ┌────────────────────┐
          │ DELIVERY_FAILED    │ → Admin reschedules (pharmacy unaffected)
          └────────────────────┘
```

### Status Transitions — Pharmacy Portal Scope

| Current Status | Action | New Status | Who |
|---------------|--------|------------|-----|
| `SENT_TO_PHARMACY` | Start Preparing | `PREPARING` | Pharmacy staff |
| `PREPARING` | Mark Ready | `READY` | Pharmacy staff |
| `SENT_TO_PHARMACY` or `PREPARING` | Report Issue | `PHARMACY_ISSUE` | Pharmacy staff |

### Invalid Transitions (Server Rejects)

| Attempted Transition | Why Blocked |
|---------------------|-------------|
| `SENT_TO_PHARMACY` → `READY` | Must prepare first |
| `READY` → `PREPARING` | Cannot go backwards |
| `PHARMACY_ISSUE` → `PREPARING` | Issue must be resolved by coordinator first |
| `CANCELLED` → any | Cancelled is terminal |
| `DELIVERED` → any | Delivered is terminal |
| `OUT_FOR_DELIVERY` → `PREPARING` | Cannot go backwards after pickup |

---

## 22. SLA Thresholds & Escalation Rules

### Pharmacy-Specific SLAs

| SLA Rule | Threshold | Escalation |
|----------|-----------|------------|
| Order not started after sent to pharmacy | 2 hours after `SENT_TO_PHARMACY` | Coordinator alert: "Pharmacy hasn't started preparing ORD-XXXX — sent 2+ hours ago" |
| Order preparation taking too long | 4 hours after `PREPARING` | Coordinator alert: "ORD-XXXX has been preparing for 4+ hours at [pharmacy name]" |
| Order ready but not picked up | 4 hours after `READY` | Coordinator alert: "ORD-XXXX ready for 4+ hours — arrange delivery" |

### Full Delivery Order SLA Chain

| Stage | Max Time | Monitored By |
|-------|----------|-------------|
| Admin sends to pharmacy after prescription | 24 hours | BullMQ job → Admin reminder |
| Pharmacy starts preparing | 2 hours after sent | BullMQ job → Admin alert |
| Pharmacy completes preparation | 4 hours after started | BullMQ job → Admin alert |
| Delivery arranged after ready | 4 hours after ready | BullMQ job → Admin alert |
| Delivery completed after pickup | 2 hours after pickup | BullMQ job → Admin alert |
| End-to-end (prescription to delivery) | 48 hours | Admin dashboard — red indicator |

### BullMQ SLA Check Job

```
Job: sla-check (same job as lab order SLAs — checks both)
Schedule: Every 15 minutes (repeatable)
Priority: High
Actions:
  1. Query all Orders with status in [SENT_TO_PHARMACY, PREPARING, READY, OUT_FOR_DELIVERY]
  2. For each, check if time since last status change exceeds threshold
  3. If breached → create notification for coordinator
  4. If already notified once → escalate (higher urgency notification)
  5. Admin dashboard shows SLA indicator: 🟢 green (on track) / 🟡 yellow (approaching) / 🔴 red (breached)
```

> **⚠️ Cross-Document SLA Note:**
> These SLA thresholds should be configurable in PORTAL-ADMIN.md §30 (SLA Configuration). Ensure that pharmacy SLAs are included in the admin's SLA settings alongside lab order SLAs.

---

## 23. Medications by Vertical

### Standard Prescription Medications

| Vertical | Common Medications | Forms |
|----------|-------------------|-------|
| **Hair Loss** | Finasteride 1mg, Minoxidil 5% topical, Biotin 10000mcg, Ketoconazole 2% shampoo | Tablets, topical solution, capsules, shampoo |
| **ED** | Tadalafil 5mg/10mg/20mg, Sildenafil 50mg/100mg | Tablets |
| **PE** | Dapoxetine 30mg/60mg, SSRIs (Paroxetine 10mg, Fluoxetine 20mg), Lidocaine spray | Tablets, spray |
| **Weight (Standard)** | Orlistat 120mg, Phentermine 15mg (Schedule H1), Metformin XR 500mg | Capsules, tablets |
| **Weight (GLP-1 Premium)** | Semaglutide 0.25mg/0.5mg/1mg/2.4mg, Liraglutide 0.6mg/1.2mg/1.8mg | Injection pens |
| **PCOS** | Metformin 500mg/1000mg, Spironolactone 25mg/50mg, Combined OCP, Letrozole 2.5mg | Tablets |

### Cold Chain Requirements

| Medication | Storage | Pharmacy Handling |
|-----------|---------|-------------------|
| Semaglutide (Ozempic/Wegovy) | 2–8°C refrigerated | Must be stored in pharmacy fridge. Hand to delivery person in insulated bag. |
| Liraglutide (Saxenda) | 2–8°C refrigerated | Same as above |
| All other medications | Room temperature | Standard shelf storage |

> **Note:** Cold chain tracking is **manual** for MVP (ARCHITECTURE.md, PROJECT-OVERVIEW.md §8 MVP Constraints). The pharmacy is expected to store GLP-1 pens in a fridge and hand them over in an insulated bag. No system-level cold chain monitoring is built.

### Controlled Substances Note

Some medications (e.g., Phentermine — Schedule H1) require special handling:
- Prescription must include specific Schedule H1 endorsement from the doctor
- Pharmacy staff should verify the prescription PDF includes required endorsements
- If concerned about regulatory compliance, use the "Regulatory Concern" stock issue type

---

## 24. Build & Deployment

### Local Development

```bash
# From monorepo root
pnpm --filter pharmacy-portal dev

# Runs on http://localhost:3005
# Hot reload enabled
# Connects to local API server (http://localhost:3000)
```

### Environment Variables

```env
# .env.local (pharmacy-portal)
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SSE_URL=http://localhost:3000/api/sse/pharmacy
NEXT_PUBLIC_SENTRY_DSN=...              # Error tracking
NEXT_PUBLIC_APP_ENV=development          # development | staging | production
```

### Production Deployment

| Aspect | Configuration |
|--------|---------------|
| Hosting | AWS ECS Fargate (same cluster as other portals) |
| Domain | `pharmacy.onlyou.life` |
| CDN | CloudFront (static assets + prescription PDF signed URLs) |
| SSL | ACM certificate, auto-renewed |
| Container | Next.js standalone output in Docker |
| Health check | `/api/health` endpoint |
| Scaling | Min 1, Max 3 tasks (pharmacy traffic is low volume) |

### Test Seed Data

The seed script creates:
- 1 test pharmacy: "MedPlus Pharmacy, MG Road, Bangalore"
- 1 test pharmacy staff user: `pharmacy@test.onlyou.life` / `+919999900006`
- Sample medication orders at various statuses (SENT_TO_PHARMACY, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED)
- Sample prescription PDFs in test S3 bucket
- Sample stock issue order (PHARMACY_ISSUE)

---

## 25. Testing Checklist

### Authentication

- [ ] Can enter phone number and receive OTP via WhatsApp
- [ ] Can fall back to SMS OTP
- [ ] Can enter OTP and login successfully
- [ ] JWT stored in memory, refresh token in httpOnly cookie
- [ ] Session persists across page reload (refresh token works)
- [ ] Logging out clears all tokens and redirects to login
- [ ] Cannot access any page without valid JWT
- [ ] Pharmacy staff from Pharmacy A cannot see Pharmacy B's orders

### Tab 1: New Orders

- [ ] Incoming orders appear when admin sends prescription to this pharmacy
- [ ] Order card shows: order ID, anonymous patient ID, medications, doctor name, NMC number, received time
- [ ] "View Prescription" opens full-screen PDF viewer
- [ ] PDF viewer supports pinch-to-zoom and scrolling
- [ ] "Start Preparing" opens confirmation modal
- [ ] Confirming "Start Preparing" → status changes to PREPARING
- [ ] Patient receives "Pharmacy is preparing" notification
- [ ] Order card moves from New tab to Preparing tab
- [ ] Tab badges update correctly
- [ ] Issue banner shows for PHARMACY_ISSUE orders
- [ ] "Start Preparing" disabled for orders with active issues
- [ ] Empty state shown when no new orders

### Tab 2: Preparing

- [ ] Orders in PREPARING status show with "preparing since" timestamp
- [ ] Time indicator shows green (<2h), amber (2-4h), red (>4h)
- [ ] "Ready for Pickup" opens confirmation modal
- [ ] Confirming "Ready for Pickup" → status changes to READY
- [ ] Coordinator receives notification: "Order ready, arrange delivery"
- [ ] Patient receives "Your medication is ready" notification
- [ ] Order moves from Preparing tab to Ready tab (Awaiting Pickup section)
- [ ] "Stock Issue" button opens issue reporting modal
- [ ] Orders sorted: issues first, then by preparation start time

### Tab 3: Ready / Picked Up

- [ ] Awaiting Pickup section shows READY orders
- [ ] Picked Up section shows OUT_FOR_DELIVERY and DELIVERED orders
- [ ] Delivery person name appears once assigned
- [ ] "Out for Delivery" and "Delivered" statuses display correctly
- [ ] No action buttons in this tab (read-only)
- [ ] "Load More" pagination works for historical orders
- [ ] Waiting time indicator shows green/amber/red

### Stock Issue Reporting

- [ ] Issue type picker shows all 6 options
- [ ] Affected medication checkboxes show all medications from the order
- [ ] "Other" type allows notes without medication selection
- [ ] Notes field accepts up to 500 characters
- [ ] Reporting issue → status changes to PHARMACY_ISSUE
- [ ] Coordinator receives URGENT notification
- [ ] Patient receives "slight delay" notification
- [ ] Issue banner appears on the order card
- [ ] Action buttons disabled until coordinator resolves

### Real-Time

- [ ] New order appears without page refresh (SSE)
- [ ] Tab badges update in real-time
- [ ] Order cancellation removes card from list (SSE)
- [ ] Order reassignment removes card from list (SSE)
- [ ] Issue resolution re-enables actions (SSE)
- [ ] Delivery assignment shows person name on Ready card (SSE)
- [ ] SSE reconnects automatically after disconnect

### PWA

- [ ] Install prompt appears on first visit
- [ ] Portal can be installed to home screen
- [ ] App opens in standalone mode (no browser chrome)
- [ ] Static assets cached for fast loading
- [ ] Offline banner shows when connection lost

### Privacy

- [ ] No patient names visible anywhere in the portal
- [ ] No patient phone numbers visible
- [ ] No patient addresses visible
- [ ] No diagnosis or condition names visible
- [ ] No lab results visible
- [ ] No questionnaire data visible
- [ ] Only anonymous ID (ONY-P-XXXX) shown for patient references
- [ ] Only medication names and dosages visible (no condition context)
- [ ] API responses do not include hidden fields (even in network inspector)
- [ ] Delivery OTP is NOT visible to pharmacy staff

---

## 26. Appendix: Complete Status Flow Diagram

### Patient-Visible Tracking Stepper

The patient sees this stepper in the Activity tab of their app:

```
Prescription Created        ✅ Done     "Your treatment plan is ready"
    │
Sent to Pharmacy           ✅ Done     "Sent to pharmacy for preparation"
    │
Pharmacy Preparing         🔵 Current  "Pharmacy is preparing your medication"
    │
Ready for Pickup           ⚪ Upcoming "Ready for delivery pickup"
    │
Out for Delivery           ⚪ Upcoming "Your medication is on its way"
    │
Delivered                  ⚪ Upcoming "Delivered (confirm with OTP)"
```

### Pharmacy-Internal Status Mapping

| Order Status | New Orders Tab | Preparing Tab | Ready Tab |
|-------------|---------------|---------------|-----------|
| `SENT_TO_PHARMACY` | ✅ Shown | — | — |
| `PREPARING` | — | ✅ Shown | — |
| `READY` | — | — | ✅ Shown (Awaiting Pickup) |
| `OUT_FOR_DELIVERY` | — | — | ✅ Shown (Picked Up section) |
| `DELIVERED` | — | — | ✅ Shown (Picked Up section — historical) |
| `PHARMACY_ISSUE` | ✅ Shown (Issue banner) if `issueReportedFromStatus = SENT_TO_PHARMACY` | ✅ Shown (Issue banner) if `issueReportedFromStatus = PREPARING` | — |
| `CANCELLED` | Removed (SSE + toast) | Removed (SSE + toast) | Removed (SSE + toast) |
| `REASSIGNED` | Removed (SSE + toast) | Removed (SSE + toast) | — |
| `DELIVERY_FAILED` | — | — | ✅ Shown in Picked Up section (admin manages re-delivery; pharmacy may see status temporarily before admin resolves back to `READY` or `OUT_FOR_DELIVERY`) |

### Admin Portal ↔ Pharmacy Portal Status Sync

| Admin Portal Action | Pharmacy Portal Effect |
|-------------------|----------------------|
| "Send to Pharmacy" | Order appears in New Orders tab (SSE push) |
| "Cancel Order" | Order removed from current tab (SSE push + toast) |
| "Reassign to different pharmacy" | Order removed from current tab (SSE push + toast: "Reassigned") |
| "Arrange Delivery" | Ready tab card shows delivery person name |
| Issue resolution: "Reassign" | Order removed, toast: "Order reassigned to another pharmacy" |
| Issue resolution: "Proceed" | Issue banner removed, actions re-enabled |
| Issue resolution: "Cancel" | Order removed, toast: "Order cancelled" |

### Doctor Portal → Admin → Pharmacy Flow (End-to-End)

```
Doctor Portal                    Admin Portal                     Pharmacy Portal
─────────────                    ────────────                     ───────────────
Creates Prescription ──────────→ Order appears in                     
                                 Deliveries tab (CREATED)
                                        │
                                 "Send to Pharmacy"  ──────────→ New Orders tab
                                 (selects pharmacy)               (SENT_TO_PHARMACY)
                                        │                              │
                                 Status: PREPARING ←──────────── "Start Preparing"
                                        │                              │
                                 Status: READY     ←──────────── "Ready for Pickup"
                                 "Arrange Delivery"                    │
                                 (enters delivery person)              │
                                        │                              │
                                 Status: OUT_FOR_DELIVERY         Ready tab: Picked Up
                                        │
                                 Delivery OTP confirmed
                                        │
                                 Status: DELIVERED                Ready tab: ✅ Delivered
```

---

*This document is the complete build specification for the Pharmacy Portal. It cross-references and is consistent with: PROJECT-OVERVIEW.md (§7: System Actors, Privacy Architecture), ARCHITECTURE.md (§2: System Diagram, §4: Monorepo Structure — pharmacy-portal, §5: Prisma Schema — Order model, Pharmacy model), PORTAL-DOCTOR.md (§12: Prescription Builder, §12.8: Submit Flow), PORTAL-ADMIN.md (§11: Deliveries, §13: Send to Pharmacy Flow, §14: Arrange Delivery Flow, §15: Manual Override, §16: Auto-Reorder, §20: Partner Pharmacies Management), APP-PATIENT.md (§6.1: Activity Tab — Medication Delivery Card, §14: Medication Delivery & Tracking, §14.3: Delivery OTP, §25.4: Partner Data Anonymization), PORTAL-LAB-FIXED.md (parallel partner portal pattern), and onlyou-spec-resolved-v4.md (§4.6: Pharmacy Portal, §1.5: Pharmacy Complexity).*

