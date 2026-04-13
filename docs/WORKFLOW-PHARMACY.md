# WORKFLOW-PHARMACY.md — Pharmacy Staff Workflow: Complete Operational Guide

> **Platform:** Onlyou Telehealth — Indian telehealth for stigmatized chronic conditions
> **Role:** Pharmacy Staff / Pharmacist at Partner Pharmacy
> **Portal:** `pharmacy.onlyou.life` — Next.js 14 PWA (mobile-first)
> **Auth:** Phone OTP (WhatsApp primary, SMS fallback) → JWT (role: `PHARMACY_STAFF`)
> **Primary Device:** Phone at the pharmacy counter (mobile-first, not mobile-only)
> **Scope:** Covers every pharmacy workflow from prescription receipt to delivery handoff, including edge cases, cross-portal synchronization, backend service integration, SLA enforcement, stock issue handling, and known issues from verification reports

---

## Table of Contents

1. [Pharmacy Staff Role Overview & Context](#1-pharmacy-staff-role-overview--context)
2. [Authentication & Session Lifecycle](#2-authentication--session-lifecycle)
3. [Medication Order Lifecycle — End-to-End Status Flow](#3-medication-order-lifecycle--end-to-end-status-flow)
4. [Workflow 1: Receiving New Prescriptions](#4-workflow-1-receiving-new-prescriptions)
5. [Workflow 2: Preparing Medication Orders](#5-workflow-2-preparing-medication-orders)
6. [Workflow 3: Marking Orders Ready for Pickup](#6-workflow-3-marking-orders-ready-for-pickup)
7. [Workflow 4: Monitoring Delivery & Completion](#7-workflow-4-monitoring-delivery--completion)
8. [Workflow 5: Reporting Stock Issues](#8-workflow-5-reporting-stock-issues)
9. [Workflow 6: Viewing Prescription PDFs](#9-workflow-6-viewing-prescription-pdfs)
10. [Backend Service Integration](#10-backend-service-integration)
11. [tRPC API Reference — Pharmacy Router](#11-trpc-api-reference--pharmacy-router)
12. [Real-Time System (SSE + Redis Pub/Sub)](#12-real-time-system-sse--redis-pubsub)
13. [Notification System — Inbound & Outbound](#13-notification-system--inbound--outbound)
14. [SLA Thresholds & BullMQ Escalation Engine](#14-sla-thresholds--bullmq-escalation-engine)
15. [Privacy Model & RBAC — Data the Pharmacy Cannot See](#15-privacy-model--rbac--data-the-pharmacy-cannot-see)
16. [Cross-Portal Synchronization Matrix](#16-cross-portal-synchronization-matrix)
17. [Medications by Medical Vertical](#17-medications-by-medical-vertical)
18. [Cold Chain & Controlled Substance Handling](#18-cold-chain--controlled-substance-handling)
19. [Error States & Edge Cases](#19-error-states--edge-cases)
20. [Audit Logging & DPDPA Compliance](#20-audit-logging--dpdpa-compliance)
21. [Known Issues & Fixes from Verification Reports](#21-known-issues--fixes-from-verification-reports)
22. [Cross-Reference Index](#22-cross-reference-index)

---

## 1. Pharmacy Staff Role Overview & Context

### 1.1 Who Is the Pharmacy Staff in Onlyou?

The pharmacy staff is a pharmacist or technician at a partner pharmacy who receives prescriptions from the Onlyou platform, prepares medication orders, and hands them off for delivery. In the Onlyou platform, the pharmacy is the final fulfillment link between the doctor's clinical decision and the patient receiving their medication. Without the pharmacy, no treatment plan can be physically delivered to the patient — every active subscription depends on reliable pharmacy dispensing.

All five verticals use the pharmacy workflow: Hair Loss, ED, PE, Weight Management (both Standard and GLP-1 Premium tiers), and PCOS. Every subscription renewal also triggers a new medication order through the same pharmacy pipeline.

**Key characteristics:**

- Works at a partner pharmacy (external entity, not an Onlyou employee)
- Uses a PWA at `pharmacy.onlyou.life` — installable on home screen (phone at the pharmacy counter is the primary device)
- Has NO access to any patient personal data (name, phone, address, diagnosis, questionnaire, AI assessment, lab results, doctor-patient messages, payment info)
- Has FULL access to: Order ID (ORD-XXXX), anonymous patient ID (ONY-P-XXXX), medication names/dosages/quantities/instructions, prescription PDF, prescribing doctor name + NMC number, delivery person name (once assigned), order timestamps, self-reported stock issue details
- Each pharmacy staff account is linked to exactly one `Pharmacy` record — all data access is scoped to that pharmacy via JWT `pharmacyId` claim
- Multiple staff can share the same portal for one pharmacy (each with their own login phone)
- Managed by the admin/coordinator via the Admin Portal partner management section

*(Source: PORTAL-PHARMACY.md §4, BACKEND-PART3A.md §22.4)*

### 1.2 Interaction Touchpoints with Other Roles

| Role | How Pharmacy Interacts | Direction |
|------|------------------------|-----------|
| **Admin/Coordinator** | Admin assigns orders to pharmacy, arranges delivery pickup, resolves stock issues, manages pharmacy partner profiles | Admin → Pharmacy (orders) / Pharmacy → Admin (status updates, issues) |
| **Doctor** | Indirectly — doctor creates the prescription which eventually reaches the pharmacy as a medication order; pharmacy never communicates with doctors directly | Doctor → [Admin] → Pharmacy (prescription flow) |
| **Patient** | No direct interaction. Patient receives status notifications as pharmacy prepares their medication. Patient only sees anonymous progress updates in their app stepper. | Pharmacy → Patient (indirect via notifications) |
| **Delivery Person** | No direct interaction via the portal. Admin arranges delivery; delivery person picks up from pharmacy and delivers to patient. Pharmacy sees "Picked Up" and "Delivered" status updates via SSE. | Admin → Delivery Person → Pharmacy (status via SSE) |
| **Nurse** | No direct interaction | — |
| **Lab** | No direct interaction | — |

*(Source: PORTAL-PHARMACY.md §20, PORTAL-ADMIN.md §13–§14)*

### 1.3 Pharmacy Capabilities — MVP Scope

| Capability | MVP | Phase 2+ |
|-----------|-----|----------|
| Receive incoming prescription orders | ✅ | — |
| View medication list and prescription PDF | ✅ | — |
| Start preparing an order (status transition) | ✅ | — |
| Mark order as ready for pickup (status transition) | ✅ | — |
| Report stock issues (6 predefined types) | ✅ | — |
| View delivery status (picked up, delivered) | ✅ | — |
| Real-time notifications (SSE + push) | ✅ | — |
| PWA installable | ✅ | — |
| Medication substitution suggestions | ❌ | ✅ Phase 2 |
| Direct pharmacy-to-coordinator messaging | ❌ | ✅ Phase 2 |
| Cold chain digital temperature logging | ❌ | ✅ Phase 2 (GLP-1 scale) |
| Inventory management integration | ❌ | ✅ Phase 3 |

*(Source: PORTAL-PHARMACY.md §1, onlyou-spec-resolved-v4.md §1.5)*

### 1.4 How Orders Reach the Pharmacy (Pay-After-Doctor Model)

Orders do NOT arrive at the pharmacy the moment a doctor creates a prescription. The pay-after-doctor model means:

1. Doctor creates treatment plan → consultation status: `PRESCRIPTION_CREATED` → auto → `AWAITING_PAYMENT`
2. Patient views treatment plan in app (free) and decides whether to subscribe
3. Patient pays (selects monthly/quarterly/6-month plan) → `PAYMENT_COMPLETE`
4. System creates first medication order (status: `CREATED`) → consultation: `PHARMACY_PROCESSING`
5. Admin/coordinator reviews the order → "Send to Pharmacy" → selects partner pharmacy
6. Order status: `CREATED` → `SENT_TO_PHARMACY` → **pharmacy portal shows the order in New Orders tab**

For subscription renewals (auto-reorder), the same flow applies: Razorpay webhook triggers new order creation → admin sends to pharmacy → pharmacy prepares.

The pharmacy does not see orders until the admin explicitly sends them. The pharmacy never sees unpaid or pending orders.

*(Source: BACKEND-ALL-CHANGES.md §B2A-1, §B2A-5, PORTAL-ADMIN.md §13)*

---

## 2. Authentication & Session Lifecycle

### 2.1 Login Flow

Pharmacy staff authenticate using phone OTP, identical to all other portal roles.

**Step 1 — Phone Entry:**
- Staff enters their registered phone number (same number configured in Admin Portal → Partners → Pharmacies → Portal Login Phone)
- Primary OTP channel: WhatsApp; fallback: SMS
- OTP rate limiting: max 3 requests per phone per 15 minutes

**Step 2 — OTP Verification:**
- 6-digit OTP, 5-minute expiry
- Max 5 wrong attempts → locked for 30 minutes
- On success: JWT issued with `role: PHARMACY_STAFF` and `pharmacyId` claim

**Step 3 — Post-Login:**
- Redirect to `/new` (default tab — New Orders)
- Push notification permission requested (not on login page — after first successful login)
- PWA install prompt shown on first visit after login

*(Source: PORTAL-PHARMACY.md §2, BACKEND-PART1.md §4)*

### 2.2 Token Management

| Token | Type | Duration | Storage |
|-------|------|----------|---------|
| Access token | JWT (RS256) | 15 minutes | Memory (Zustand store) |
| Refresh token | Opaque | 7 days | `httpOnly`, `Secure`, `SameSite=Strict` cookie |

**JWT payload:**
```json
{
  "sub": "user-uuid",
  "role": "PHARMACY_STAFF",
  "pharmacyId": "pharmacy-uuid",
  "iat": 1706000000,
  "exp": 1706000900
}
```

**Critical:** The `pharmacyId` in the JWT auto-scopes ALL database queries to this pharmacy. Staff from Pharmacy A can never see Pharmacy B's orders — this is enforced at the middleware level, not just the UI.

**Access token storage note:** The pharmacy portal stores the access token in-memory (Zustand) rather than an HttpOnly cookie because the SSE endpoint requires the JWT as a query parameter. The `EventSource` API does not support custom headers, and HttpOnly cookies cannot be read by JavaScript. This design difference from internal portals (admin, doctor) is intentional for PWA portals that need explicit SSE token passing.

*(Source: PORTAL-PHARMACY.md §2, §16, BACKEND-PART3A.md §22)*

### 2.3 Session Rules

| Rule | Behavior |
|------|----------|
| Single session only | New login from different device → previous session invalidated |
| Token refresh window | Last 2 minutes of access token lifetime |
| Idle session timeout | 12 hours of no API activity → session terminated |
| Max session duration | 7 days (refresh token expiry) |
| Logout | Clears access token from memory + calls `/auth/logout` to invalidate refresh token server-side + clears cookie |
| Token blacklisting | On logout, JWT JTI stored in Redis SET with TTL matching remaining lifetime |
| CORS | Only `pharmacy.onlyou.life` origin allowed |

**Idle timeout rationale:** The pharmacy portal uses a 12-hour idle timeout (longer than admin's 8-hour timeout) because pharmacy staff use the portal at the counter during their shift, which is typically 10–12 hours. A shorter timeout would cause frequent re-authentication friction during busy periods.

*(Source: PORTAL-PHARMACY.md §2, §16)*

---

## 3. Medication Order Lifecycle — End-to-End Status Flow

### 3.1 Complete Status Flow (All Actors)

This diagram shows the full medication order lifecycle from prescription creation through delivery confirmation. The pharmacy portal's scope is marked between the `***` indicators.

```
PAYMENT CONFIRMED (Patient subscribes)
        │
        ▼
   ┌─────────┐
   │ CREATED  │ ← Order exists but no pharmacy assigned
   └────┬─────┘     Admin portal sees in "New (needs pharmacy)" filter
        │ Admin sends to pharmacy
        ▼
┌──────────────────────┐
│  SENT_TO_PHARMACY    │ ← Pharmacy portal New Orders tab shows this
└──────────┬───────────┘     *** PHARMACY PORTAL STARTS HERE ***
           │ Pharmacy taps "Start Preparing"
           ▼
     ┌──────────────┐
     │  PREPARING   │ ← Pharmacy portal Preparing tab shows this
     └──────┬───────┘
            │ Pharmacy taps "Ready for Pickup"
            ▼
       ┌──────────┐
       │  READY   │ ← Pharmacy portal Ready tab (Awaiting Pickup section)
       └─────┬────┘     *** PHARMACY ACTIVE ROLE ENDS HERE ***
             │ Admin arranges delivery → person picks up
             ▼
  ┌──────────────────────┐
  │  OUT_FOR_DELIVERY    │ ← Pharmacy portal Ready tab (Picked Up section)
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
   │ DELIVERY_FAILED    │ → Admin reschedules (pharmacy unaffected unless needs re-pickup)
   └────────────────────┘
```

*(Source: PORTAL-PHARMACY.md §21, §26)*

### 3.2 Pharmacy-Actionable Status Transitions

| Current Status | Action | New Status | Who |
|---------------|--------|------------|-----|
| `SENT_TO_PHARMACY` | Start Preparing | `PREPARING` | Pharmacy staff |
| `PREPARING` | Mark Ready for Pickup | `READY` | Pharmacy staff |
| `SENT_TO_PHARMACY` or `PREPARING` | Report Stock Issue | `PHARMACY_ISSUE` | Pharmacy staff |

These are the **only three status transitions** the pharmacy can trigger. All other transitions are made by the admin/coordinator, system, or delivery flow.

### 3.3 Invalid Transitions (Server Rejects)

| Attempted Transition | Why Blocked |
|---------------------|-------------|
| `SENT_TO_PHARMACY` → `READY` | Must prepare first |
| `READY` → `PREPARING` | Cannot go backwards |
| `PHARMACY_ISSUE` → `PREPARING` | Issue must be resolved by coordinator first |
| `CANCELLED` → any | Cancelled is terminal |
| `DELIVERED` → any | Delivered is terminal |
| `OUT_FOR_DELIVERY` → `PREPARING` | Cannot go backwards after pickup |

*(Source: PORTAL-PHARMACY.md §21)*

### 3.4 Tab-to-Status Mapping

| Order Status | New Orders Tab | Preparing Tab | Ready Tab |
|-------------|---------------|---------------|-----------|
| `SENT_TO_PHARMACY` | ✅ Shown | — | — |
| `PREPARING` | — | ✅ Shown | — |
| `READY` | — | — | ✅ Shown (Awaiting Pickup section) |
| `OUT_FOR_DELIVERY` | — | — | ✅ Shown (Picked Up section) |
| `DELIVERED` | — | — | ✅ Shown (Picked Up section — historical) |
| `PHARMACY_ISSUE` | ✅ Shown (issue banner) if reported from `SENT_TO_PHARMACY` | ✅ Shown (issue banner) if reported from `PREPARING` | — |
| `CANCELLED` | Removed (SSE + toast) | Removed (SSE + toast) | Removed (SSE + toast) |
| `REASSIGNED` | Removed (SSE + toast) | Removed (SSE + toast) | — |
| `DELIVERY_FAILED` | — | — | ✅ Shown in Picked Up section (admin manages) |

*(Source: PORTAL-PHARMACY.md §26)*

---

## 4. Workflow 1: Receiving New Prescriptions

### 4.1 Trigger

An order appears in the pharmacy's New Orders tab when:
- Admin/coordinator clicks "Send to Pharmacy" in the Admin Portal (PORTAL-ADMIN.md §13)
- This sets `Order.pharmacyId` and transitions status to `SENT_TO_PHARMACY`
- SSE event `pharmacy.new_order` fires → order appears without page refresh
- Push + WhatsApp notification sent to pharmacy contact: "New prescription received — [Medication list]. Please prepare."

### 4.2 What the Pharmacy Staff Sees (New Order Card)

Each order card in the New Orders tab shows:

| Field | Source | Display Example |
|-------|--------|---------|
| Order ID | `order.orderId` | "ORD-0042" |
| Status badge | `order.status` | "NEW" (indigo badge) |
| Patient anonymous ID | Computed from `patientId` | "ONY-P-0045" |
| Doctor name | `prescription.doctor.name` | "Dr. Rajesh Patel" |
| Doctor NMC number | `prescription.doctor.nmcNumber` | "NMC: 12345" |
| Medications | `order.medications[]` | List with name, dosage, quantity, form |
| Prescription PDF link | `order.prescriptionPdfUrl` | Tap → full-screen PDF viewer |
| Received time | `order.sentToPharmacyAt` | "28 Feb, 11:00 AM (2 hours ago)" |

If the order has `status = PHARMACY_ISSUE` and `issueReportedFromStatus = SENT_TO_PHARMACY`, the card shows a yellow issue banner with the issue details and the "Start Preparing" button is **disabled**.

### 4.3 Staff Actions on New Order

**Primary action: "Start Preparing"**
1. Staff reviews the medication list and prescription PDF
2. Staff verifies all medications are in stock
3. Staff taps **"Start Preparing"**
4. Confirmation modal appears: "Confirm that all medications are available and you're ready to start."
5. On confirm → API call: `trpc.pharmacy.order.startPreparing.mutate({ orderId })`

**Secondary action: "Stock Issue"**
- If any medication is unavailable or there's a concern, staff taps "Stock Issue" (see Workflow 5)

### 4.4 Backend Processing — Start Preparing

When the pharmacy confirms "Start Preparing", the server:

1. Validates order belongs to this pharmacy (via JWT `pharmacyId` claim)
2. Validates current status is `SENT_TO_PHARMACY`
3. Updates `Order.status` → `PREPARING`
4. Sets `Order.preparingAt` = now
5. Publishes SSE event → coordinator (admin portal): status update
6. Sends notification → coordinator: "Pharmacy started preparing ORD-0042"
7. Sends notification → patient (push + WhatsApp): "Pharmacy is preparing your medication"
8. Creates audit log entry: `pharmacy_started_preparing`

**UI result:**
- Success toast: "Order moved to Preparing"
- Card animates out of New tab → appears in Preparing tab
- Tab badge counts update in real-time

### 4.5 Sorting

Orders in the New Orders tab are sorted by:
1. Orders with active issues first (yellow banner — so staff is aware)
2. Then by `sentToPharmacyAt` ascending (oldest first — FIFO processing)

### 4.6 Empty State

When there are no new orders, the tab shows: "No new orders right now. New prescriptions will appear here automatically when sent by the coordinator."

*(Source: PORTAL-PHARMACY.md §7)*

---

## 5. Workflow 2: Preparing Medication Orders

### 5.1 Trigger

An order appears in the Preparing tab when pharmacy staff taps "Start Preparing" in the New Orders tab, transitioning status from `SENT_TO_PHARMACY` → `PREPARING`.

### 5.2 What the Pharmacy Staff Sees (Preparing Card)

The Preparing tab card shows all the same fields as the New Order card, plus:

| Additional Field | Source | Display Example |
|-----------------|--------|---------|
| Started preparing time | `order.preparingAt` | "28 Feb, 10:00 AM" |
| Time in preparation | Computed: `now - preparingAt` | "3 hours in preparation" |

### 5.3 Time Indicators (SLA Visual Cues)

| Duration in Preparation | Indicator | Meaning |
|------------------------|-----------|---------|
| < 2 hours | 🟢 Green clock | On track |
| 2–4 hours | 🟡 Amber clock | Taking a while — coordinator may check in |
| > 4 hours | 🔴 Red clock | SLA approaching breach — coordinator will be alerted |

The pharmacy staff sees the visual indicator as a time awareness cue, but the portal does NOT show SLA language — "SLA breach" is only visible in the admin portal. The BullMQ `sla-check` job running every 15 minutes handles coordinator alerts.

### 5.4 Physical Preparation Process

While the system tracks status, the actual physical work involves:

1. **Gather medications** from shelf or fridge (GLP-1 pens require cold storage)
2. **Verify against prescription PDF:** Confirm medication names, dosages, quantities, and forms match the printed prescription
3. **Check expiry dates:** Ensure all medications have sufficient shelf life (ideally >3 months from delivery date)
4. **Pack medications:** Standard packaging for room-temperature medications; insulated bag for cold-chain items (Semaglutide, Liraglutide)
5. **Label the package:** Include Order ID (ORD-XXXX) on the exterior for delivery identification

### 5.5 Staff Actions on Preparing Order

**Primary action: "Ready for Pickup"** — when packing is complete (see Workflow 3)

**Secondary action: "Stock Issue"** — if a problem arises during preparation (see Workflow 5)

### 5.6 Sorting

Orders in the Preparing tab are sorted by:
1. Orders with active issues first (yellow banner)
2. Then by `preparingAt` ascending (oldest being prepared first)

### 5.7 Empty State

When there are no orders being prepared: "No orders being prepared. Start preparing an order from the New tab to see it here."

*(Source: PORTAL-PHARMACY.md §8)*

---

## 6. Workflow 3: Marking Orders Ready for Pickup

### 6.1 Trigger

Pharmacy staff finishes packing all medications for an order and taps **"Ready for Pickup"** in the Preparing tab.

### 6.2 Step-by-Step Flow

1. Staff taps **"Ready for Pickup"** on the Preparing tab card
2. Confirmation modal appears: "Confirm that all medications are packed and ready for the delivery person to collect."
3. On confirm → API call: `trpc.pharmacy.order.markReady.mutate({ orderId })`

### 6.3 Backend Processing — Mark Ready

When the pharmacy confirms "Ready for Pickup", the server:

1. Validates order belongs to this pharmacy
2. Validates current status is `PREPARING`
3. Updates `Order.status` → `READY`
4. Sets `Order.readyAt` = now
5. Publishes SSE event → coordinator (admin portal): status update
6. Sends notification → coordinator (SSE + push): "Order ORD-0041 ready at MedPlus (MG Road). Arrange delivery."
7. Sends notification → patient (push + WhatsApp): "Your medication is ready and will be delivered soon."
8. Creates audit log entry: `pharmacy_marked_ready`

**UI result:**
- Success toast: "Order marked as ready for pickup"
- Card animates out of Preparing tab → appears in Ready tab ("Awaiting Pickup" section)
- Tab badge counts update

### 6.4 What Happens Next (Outside Pharmacy Control)

After the pharmacy marks an order as ready:

1. **Coordinator sees "READY" in Admin Portal** → "Arrange Delivery" button becomes enabled
2. **Coordinator enters delivery details** in Admin Portal: delivery person name, phone, method (Rapido/Dunzo/Own/Other), ETA
3. **System generates delivery SMS link** with pickup address (pharmacy) + delivery address (patient)
4. **Delivery person picks up** → pharmacy portal shows delivery person name on the Ready tab card
5. **Delivery person delivers to patient** → OTP confirmation → pharmacy portal shows "Delivered"

The pharmacy's active role ends at `READY`. Everything after is monitoring only.

*(Source: PORTAL-PHARMACY.md §9, PORTAL-ADMIN.md §14)*

---

## 7. Workflow 4: Monitoring Delivery & Completion

### 7.1 Ready Tab — Two Sections

The Ready tab is divided into two sections:

**Section 1: Awaiting Pickup** — orders with `status = READY`
- Shows: "Ready since" time + waiting duration
- Delivery assignment status:
  - "Not yet assigned 🔴" if `deliveryPersonName` is null
  - "Delivery: Ravi K. 🟢" if delivery person assigned by coordinator

**Section 2: Picked Up** — orders with `status = OUT_FOR_DELIVERY` or `DELIVERED`
- Shows: ready time, pickup time, delivery person name
- Post-delivery status:
  - 🟣 "Out for Delivery" — delivery in progress
  - ✅ "Delivered" — confirmed via OTP
- Limited to last 7 days of history (pagination via "Load More" button)

### 7.2 Time Indicators — Awaiting Pickup

| Duration Waiting | Indicator | Meaning |
|-----------------|-----------|---------|
| < 2 hours | 🟢 Normal | Coordinator is arranging delivery |
| 2–4 hours | 🟡 Amber | May want to follow up with coordinator |
| > 4 hours | 🔴 Red | Something may be delayed |

### 7.3 No Actions in Ready Tab

The pharmacy cannot take any action on orders in the Ready tab. This is a **read-only monitoring view**. All further actions (arrange delivery, confirm delivery OTP, handle delivery failure) are performed by the admin/coordinator or delivery person.

### 7.4 SSE Events That Update the Ready Tab

| Event | Source | Effect |
|-------|--------|--------|
| `pharmacy.delivery_assigned` | Admin portal | Card shows delivery person name |
| `pharmacy.order_picked_up` | Delivery flow | Card moves from "Awaiting Pickup" to "Picked Up" section |
| `pharmacy.order_delivered` | Delivery OTP confirmed | Card shows ✅ Delivered status |

### 7.5 Empty State

"No orders ready yet. Orders you've prepared will appear here once marked ready."

*(Source: PORTAL-PHARMACY.md §9)*

---

## 8. Workflow 5: Reporting Stock Issues

### 8.1 When Available

The "Stock Issue" button appears on order cards in both the **New Orders** tab and the **Preparing** tab. It is NOT available in the Ready tab — if the order was marked ready, stock was not an issue.

### 8.2 Issue Types

```typescript
enum PharmacyIssueType {
  OUT_OF_STOCK = 'OUT_OF_STOCK',             // One or more medications completely unavailable
  PARTIAL_STOCK = 'PARTIAL_STOCK',           // Some medications available, others not
  INCORRECT_PRESCRIPTION = 'INCORRECT_PRESCRIPTION', // Prescription details seem incorrect
  QUANTITY_CONCERN = 'QUANTITY_CONCERN',      // Unusual quantity or dosage concern
  REGULATORY_CONCERN = 'REGULATORY_CONCERN', // Controlled substance or schedule issue
  OTHER = 'OTHER'                            // Anything else
}
```

### 8.3 Step-by-Step Reporting Flow

1. Staff taps **"Stock Issue"** on an order card (New or Preparing tab)
2. Stock Issue Modal opens with:
   - **Issue type** (radio buttons — 6 options from `PharmacyIssueType`)
   - **Affected medications** (checkboxes — populated from this order's medication list; required for OUT_OF_STOCK and PARTIAL_STOCK)
   - **Additional notes** (text area, optional, max 500 characters — useful for restock dates, generic alternatives)
3. Staff fills in details → taps **"Report Issue"**
4. API call: `trpc.pharmacy.order.reportIssue.mutate({ orderId, issueType, issueMedications, notes })`

### 8.4 Backend Processing — Report Issue

When the pharmacy reports a stock issue, the server:

1. Validates order belongs to this pharmacy
2. Validates current status is `SENT_TO_PHARMACY` or `PREPARING`
3. Updates `Order.status` → `PHARMACY_ISSUE`
4. Sets `Order.issueType`, `Order.issueMedications`, `Order.issueNotes`, `Order.issueReportedAt`
5. Sets `Order.issueReportedFromStatus` = previous status (either `SENT_TO_PHARMACY` or `PREPARING`) — this determines which tab displays the order during the issue
6. Publishes SSE event → coordinator (admin portal): urgent alert
7. Sends notification → coordinator (push + WhatsApp): "⚠️ Pharmacy stock issue for ORD-0042: [Minoxidil 5%] out of stock at MedPlus (MG Road)"
8. Sends notification → patient (push): "There's a slight delay preparing your medication. Our team is working on it."
9. Creates audit log entry: `pharmacy_reported_issue`

**UI result:**
- Success toast: "Issue reported. The coordinator has been notified."
- Order card now shows yellow issue banner with details
- "Start Preparing" / "Ready for Pickup" buttons are **disabled** until coordinator resolves

### 8.5 Issue Banner Display

Orders in `PHARMACY_ISSUE` status show a yellow warning banner on the card:

```
⚠️ Stock Issue Reported
Reported: 28 Feb, 12:00 PM
Waiting for coordinator resolution

Issue: Minoxidil 5% out of stock
Notes: "Expected restock in 2 days"
```

### 8.6 Coordinator Resolution Options (Admin Portal Side)

The coordinator sees the issue in the admin portal and can:

| Resolution | Effect on Pharmacy Portal |
|-----------|--------------------------|
| **Reassign to another pharmacy** | Order removed from this pharmacy's portal (SSE event + toast: "Order reassigned to another pharmacy") |
| **Proceed anyway** | Coordinator confirms partial fulfillment is OK → issue banner removed, action buttons re-enabled (SSE event) |
| **Cancel order** | Order removed from pharmacy portal (SSE event + toast: "Order cancelled") |
| **Contact doctor** | Ask doctor for medication substitution → updated prescription sent back (pharmacy may receive updated order) |

### 8.7 Issue Tab Placement Logic

When `issueReportedFromStatus = SENT_TO_PHARMACY`, the issue order stays in the **New Orders** tab.
When `issueReportedFromStatus = PREPARING`, the issue order stays in the **Preparing** tab.

This preserves context — the pharmacist sees the issue in the tab where they reported it.

*(Source: PORTAL-PHARMACY.md §10)*

---

## 9. Workflow 6: Viewing Prescription PDFs

### 9.1 Access Point

Every order card has a "View Prescription" link that opens a full-screen PDF viewer.

### 9.2 Technical Implementation

- **Route:** `/prescription/[id]`
- **PDF source:** CloudFront signed URL (1-hour expiry). If expired, auto-refreshes URL via API call to `trpc.pharmacy.prescription.getPdfUrl`
- **Viewer:** `react-pdf` library for in-browser rendering (no download option)
- **Gestures:** Pinch to zoom, swipe to scroll
- **Close:** "← Close" returns to previous tab

### 9.3 Prescription PDF Contents

The pharmacy-visible prescription PDF includes:
- Prescribing doctor name and NMC registration number
- Date of prescription
- Patient anonymous ID (ONY-P-XXXX)
- Each medication: name, dosage, quantity, form, instructions (sig)
- Doctor's digital signature

The prescription PDF does NOT include patient name, phone, address, condition name, or diagnosis code.

### 9.4 Medication List Display (Card View)

When the medication list is long (>3 items), the order card shows the first 3 with an expandable:

```
Medications:
  • Finasteride 1mg × 30 tablets
  • Minoxidil 5% × 1 bottle
  • Biotin 10000mcg × 30 tablets
  + 2 more [tap to expand]
```

*(Source: PORTAL-PHARMACY.md §11)*

---

## 10. Backend Service Integration

### 10.1 Order Service — Pharmacy-Relevant Methods

The pharmacy portal interacts with the Order Service (NestJS module) through the pharmacy tRPC router. The service code that handles pharmacy actions:

**`startPreparing(orderId, pharmacyId)`**
```
1. Fetch order WHERE id = orderId AND pharmacyId = pharmacyId
2. Validate status === 'SENT_TO_PHARMACY'
3. Update: status → 'PREPARING', preparingAt → now
4. Emit event: 'order.status_changed' → { orderId, newStatus: 'PREPARING', triggeredBy: 'pharmacy' }
5. Notification dispatch: coordinator (SSE), patient (push + WhatsApp)
6. Audit log: INSERT { action: 'pharmacy_started_preparing', resourceType: 'Order', resourceId: orderId }
```

**`markReady(orderId, pharmacyId)`**
```
1. Fetch order WHERE id = orderId AND pharmacyId = pharmacyId
2. Validate status === 'PREPARING'
3. Update: status → 'READY', readyAt → now
4. Emit event: 'order.status_changed' → { orderId, newStatus: 'READY', triggeredBy: 'pharmacy' }
5. Notification dispatch: coordinator (SSE + push), patient (push + WhatsApp)
6. Audit log: INSERT { action: 'pharmacy_marked_ready', resourceType: 'Order', resourceId: orderId }
```

**`reportIssue(orderId, pharmacyId, issueType, issueMedications?, notes?)`**
```
1. Fetch order WHERE id = orderId AND pharmacyId = pharmacyId
2. Validate status IN ['SENT_TO_PHARMACY', 'PREPARING']
3. Store previous status as issueReportedFromStatus
4. Update: status → 'PHARMACY_ISSUE', issueType, issueMedications, issueNotes, issueReportedAt → now
5. Emit event: 'order.issue_reported' → { orderId, issueType }
6. Notification dispatch: coordinator (URGENT push + WhatsApp), patient (push: "Slight delay")
7. Audit log: INSERT { action: 'pharmacy_reported_issue', resourceType: 'Order', resourceId: orderId }
```

### 10.2 Order Creation Trigger (Pay-After-Doctor)

The first medication order is created when the patient completes payment (`PAYMENT_COMPLETE` status), NOT when the doctor creates the prescription. This is handled in the Razorpay webhook handler:

```
Payment confirmed → activateSubscriptionAndCreateOrder():
  1. Activate subscription record
  2. Transition consultation: AWAITING_PAYMENT → PAYMENT_COMPLETE
  3. Create first Order record (status: CREATED)
  4. Emit 'order.created' event → coordinator notification
  5. Consultation auto-transitions: PAYMENT_COMPLETE → PHARMACY_PROCESSING
```

Subsequent orders (auto-reorders on subscription renewal) follow the same path: Razorpay renewal webhook → order creation → admin review → send to pharmacy.

*(Source: PORTAL-PHARMACY.md §14, BACKEND-ALL-CHANGES.md §B2A-3, §B2A-5)*

---

## 11. tRPC API Reference — Pharmacy Router

### 11.1 Router: `pharmacy.order`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `list` | Query | `{ status?: OrderStatus[], page?: number, limit?: number }` | `{ items: OrderForPharmacy[], total: number }` | List orders for this pharmacy |
| `getById` | Query | `{ id: string }` | `OrderForPharmacy` | Get single order detail |
| `startPreparing` | Mutation | `{ orderId: string }` | `OrderForPharmacy` | `SENT_TO_PHARMACY` → `PREPARING` |
| `markReady` | Mutation | `{ orderId: string }` | `OrderForPharmacy` | `PREPARING` → `READY` |
| `reportIssue` | Mutation | `{ orderId: string, issueType: PharmacyIssueType, issueMedications?: string[], notes?: string }` | `OrderForPharmacy` | Report stock/prescription issue |
| `getCounts` | Query | `{}` | `{ new: number, preparing: number, ready: number }` | Badge counts for all 3 tabs |

### 11.2 Router: `pharmacy.prescription`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `getPdfUrl` | Query | `{ orderId: string }` | `{ url: string, expiresAt: DateTime }` | CloudFront signed URL for prescription PDF |

### 11.3 Router: `pharmacy.profile`

| Procedure | Type | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `getMe` | Query | `{}` | `{ user: PharmacyStaff, pharmacy: Pharmacy }` | Current staff profile + pharmacy info |

### 11.4 Middleware Chain

All pharmacy portal tRPC procedures pass through:

```
authMiddleware → roleCheck('PHARMACY_STAFF') → pharmacyScope → auditLog → procedure
```

1. **authMiddleware** — validates JWT, extracts user
2. **roleCheck('PHARMACY_STAFF')** — confirms user role
3. **pharmacyScope** — auto-adds `WHERE pharmacyId = ?` to all queries (from JWT `pharmacyId` claim)
4. **auditLog** — logs action to AuditLog table (append-only)

### 11.5 Response Type — OrderForPharmacy

```typescript
interface OrderForPharmacy {
  id: string;
  orderId: string;                      // "ORD-0042"
  anonymousPatientId: string;           // "ONY-P-0045" — computed, not stored
  medications: MedicationItem[];
  prescriptionPdfUrl: string;           // CloudFront signed URL (1-hour expiry)
  doctorName: string;
  doctorNmcNumber: string;
  status: OrderStatus;
  deliveryPersonName: string | null;
  issueType: PharmacyIssueType | null;
  issueMedications: string[] | null;
  issueNotes: string | null;
  issueReportedAt: DateTime | null;
  issueReportedFromStatus: OrderStatus | null;
  sentToPharmacyAt: DateTime;
  preparingAt: DateTime | null;
  readyAt: DateTime | null;
  pickedUpAt: DateTime | null;
  deliveredAt: DateTime | null;
}

// Fields explicitly EXCLUDED from OrderForPharmacy:
// - patientId, patient.name, patient.phone, patient.address
// - patient.condition, patient.diagnosisCode
// - deliveryPersonPhone, deliveryOtp, deliveryOtpExpiresAt
// - prescriptionId (internal reference)
// - manualOverride, overrideReason
// - payment information
```

*(Source: PORTAL-PHARMACY.md §5, §14)*

---

## 12. Real-Time System (SSE + Redis Pub/Sub)

### 12.1 SSE Connection

Pharmacy portal maintains a persistent SSE connection for real-time updates.

**SSE endpoint:** `GET /api/sse/pharmacy?pharmacyId={id}`

**Authentication:** JWT passed as query parameter (EventSource API does not support custom headers). Token validated server-side on connection establishment.

### 12.2 Events Consumed by Pharmacy Portal

```typescript
type PharmacySSEEvent =
  | { type: 'pharmacy.new_order'; data: { orderId: string; medications: string[] } }
  | { type: 'pharmacy.order_cancelled'; data: { orderId: string; reason: string } }
  | { type: 'pharmacy.order_reassigned'; data: { orderId: string } }
  | { type: 'pharmacy.issue_resolved'; data: { orderId: string; resolution: 'proceed' | 'reassigned' | 'cancelled' } }
  | { type: 'pharmacy.delivery_assigned'; data: { orderId: string; deliveryPersonName: string } }
  | { type: 'pharmacy.order_picked_up'; data: { orderId: string; pickedUpAt: string } }
  | { type: 'pharmacy.order_delivered'; data: { orderId: string; deliveredAt: string } };
```

### 12.3 Events Published by Pharmacy Actions

```typescript
type PharmacyPublishedEvent =
  | { type: 'order.status_changed'; data: { orderId: string; newStatus: OrderStatus; triggeredBy: 'pharmacy' } }
  | { type: 'order.issue_reported'; data: { orderId: string; issueType: PharmacyIssueType } };
```

### 12.4 SSE Event → UI Effect Mapping

| SSE Event | UI Effect |
|-----------|-----------|
| `pharmacy.new_order` | New card appears in New Orders tab; New tab badge increments |
| `pharmacy.order_cancelled` | Card removed from current tab; toast: "Order ORD-XXXX cancelled" |
| `pharmacy.order_reassigned` | Card removed from current tab; toast: "Order reassigned to another pharmacy" |
| `pharmacy.issue_resolved` (proceed) | Issue banner removed; action buttons re-enabled |
| `pharmacy.issue_resolved` (reassigned) | Card removed; toast: "Order reassigned to another pharmacy" |
| `pharmacy.issue_resolved` (cancelled) | Card removed; toast: "Order cancelled" |
| `pharmacy.delivery_assigned` | Ready tab card shows delivery person name |
| `pharmacy.order_picked_up` | Ready tab card moves from "Awaiting Pickup" to "Picked Up" section |
| `pharmacy.order_delivered` | Ready tab card shows ✅ Delivered |

### 12.5 Reconnection Strategy

| Scenario | Behavior |
|----------|----------|
| SSE connection drops | Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s) |
| Reconnection succeeds | Fetch latest data from API to catch missed events |
| Offline for > 5 minutes | Show banner: "Connection lost. Data may be outdated. [Refresh]" |

*(Source: PORTAL-PHARMACY.md §13)*

---

## 13. Notification System — Inbound & Outbound

### 13.1 Inbound Events (Pharmacy Receives)

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

### 13.2 Outbound Events (Pharmacy Triggers)

| Pharmacy Action | Status Change | Recipients |
|----------------|---------------|------------|
| Start Preparing | `SENT_TO_PHARMACY` → `PREPARING` | Coordinator (SSE), Patient (push + WhatsApp: "Pharmacy is preparing your medication") |
| Mark Ready | `PREPARING` → `READY` | Coordinator (SSE + push: "Order ready, arrange delivery"), Patient (push + WhatsApp: "Your medication is ready and will be delivered soon") |
| Report Stock Issue | → `PHARMACY_ISSUE` | Coordinator (push + WhatsApp — URGENT), Patient (push: "Slight delay") |

### 13.3 Push Notification Configuration

- Pharmacy portal uses standard Web Push API via service worker
- Push subscription created on first successful login
- Notification permission requested after first successful login (not on the login page)
- WhatsApp notifications sent to the pharmacy's **main contact number** (`Pharmacy.phone` — the contact person's phone). This is distinct from `Pharmacy.portalLoginPhone` which is used exclusively for portal OTP login. In most cases both are the same person (the pharmacist), but they can differ if the pharmacy designates separate numbers for operations vs. portal access.

*(Source: PORTAL-PHARMACY.md §12)*

---

## 14. SLA Thresholds & BullMQ Escalation Engine

### 14.1 Pharmacy-Specific SLAs

| SLA Rule | Threshold | Escalation |
|----------|-----------|------------|
| Order not started after sent to pharmacy | 2 hours after `SENT_TO_PHARMACY` | Coordinator alert: "Pharmacy hasn't started preparing ORD-XXXX — sent 2+ hours ago" |
| Order preparation taking too long | 4 hours after `PREPARING` | Coordinator alert: "ORD-XXXX has been preparing for 4+ hours at [pharmacy name]" |
| Order ready but not picked up | 4 hours after `READY` | Coordinator alert: "ORD-XXXX ready for 4+ hours — arrange delivery" |

### 14.2 Full Delivery Order SLA Chain

| Stage | Max Time | Monitored By |
|-------|----------|-------------|
| Admin sends to pharmacy after prescription | 24 hours | BullMQ job → Admin reminder |
| Pharmacy starts preparing | 2 hours after sent | BullMQ job → Admin alert |
| Pharmacy completes preparation | 4 hours after started | BullMQ job → Admin alert |
| Delivery arranged after ready | 4 hours after ready | BullMQ job → Admin alert |
| Delivery completed after pickup | 24 hours after pickup | BullMQ job → Admin alert |
| End-to-end (prescription to delivery) | 48 hours | Admin dashboard — red indicator |

### 14.3 BullMQ SLA Check Job

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

### 14.4 Pharmacy Portal SLA Visibility

The pharmacy portal shows time-based visual indicators (green/amber/red clocks) on order cards, but does NOT display explicit SLA language or breach warnings. SLA enforcement is entirely coordinator-facing. This is intentional — the pharmacy is an external partner, and SLA pressure is managed through the coordinator relationship, not through portal messaging.

*(Source: PORTAL-PHARMACY.md §22, BACKEND-PART2B.md §18–§19)*

---

## 15. Privacy Model & RBAC — Data the Pharmacy Cannot See

### 15.1 CASL.js Rules for Pharmacy Role

```typescript
const pharmacyAbilities = defineAbility((can, cannot) => {
  // CAN: read/update orders assigned to their pharmacy
  can('read', 'Order', { pharmacyId: user.pharmacyId });
  can('update', 'Order', ['status', 'preparingAt', 'readyAt', 'issueType', 'issueMedications', 'issueNotes', 'issueReportedAt'],
    { pharmacyId: user.pharmacyId });

  // CAN: read prescription PDF URL + doctor info (for orders assigned to them)
  can('read', 'Prescription', ['pdfUrl', 'doctorName', 'doctorNmcNumber'],
    { 'order.pharmacyId': user.pharmacyId });

  // CAN: read their own pharmacy info
  can('read', 'Pharmacy', { id: user.pharmacyId });

  // CANNOT: see any patient personal data
  cannot('read', 'Patient');
  cannot('read', 'User', ['name', 'email', 'phone', 'address']);
  cannot('read', 'Consultation');
  cannot('read', 'Questionnaire');
  cannot('read', 'AIAssessment');
  cannot('read', 'LabOrder');
  cannot('read', 'Message');
  cannot('read', 'NurseVisit');
  cannot('read', 'Wallet');

  // CANNOT: access other pharmacies' orders
  cannot('read', 'Order', { pharmacyId: { $ne: user.pharmacyId } });

  // CANNOT: modify delivery details
  cannot('update', 'Order', ['deliveryPersonName', 'deliveryPersonPhone', 'deliveryOtp', 'deliveryMethod']);

  // CANNOT: cancel or reassign orders
  cannot('update', 'Order', ['cancelledAt']);
  cannot('delete', 'Order');
});
```

### 15.2 Data Scoping Summary

| Data Category | Pharmacy Can See | Pharmacy Cannot See |
|--------------|-----------------|---------------------|
| Order ID (ORD-XXXX) | ✅ | — |
| Anonymous patient ID (ONY-P-XXXX) | ✅ | — |
| Medication names, dosages, quantities | ✅ | — |
| Medication instructions (sig) | ✅ | — |
| Prescription PDF | ✅ | — |
| Doctor name | ✅ | — |
| Doctor NMC registration number | ✅ | — |
| Order timestamps | ✅ | — |
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

### 15.3 Anonymization Enforcement Layers

1. **API layer:** The pharmacy tRPC router only returns `OrderForPharmacy` type — a server-side projection that excludes patient personal fields. This is not a frontend filter.
2. **Database query:** Prisma queries use `select` to explicitly include only permitted fields. Patient PII is never fetched for pharmacy queries.
3. **CASL.js RBAC:** The `PHARMACY_STAFF` role's ability definition blocks access to `Patient`, `Consultation`, `Questionnaire`, `AIAssessment`, and `Message` entities entirely.
4. **Network inspector safe:** Even inspecting API responses in browser DevTools reveals no hidden PII fields.

*(Source: PORTAL-PHARMACY.md §4, §15, BACKEND-PART3A.md §22.4)*

---

## 16. Cross-Portal Synchronization Matrix

### 16.1 Upstream (What Feeds into the Pharmacy Portal)

| Source | Action | Effect on Pharmacy Portal |
|--------|--------|--------------------------|
| **Doctor Portal** | Creates prescription | Order record created in backend (status: `CREATED`) — pharmacy does NOT see this yet |
| **Payment System** | Patient subscribes | Consultation → `PAYMENT_COMPLETE`, first medication order created (status: `CREATED`) |
| **Admin Portal** | "Send to Pharmacy" | Order status → `SENT_TO_PHARMACY` with `pharmacyId` set → order appears in New tab (SSE push) |
| **Admin Portal** | Cancels order | Order removed from pharmacy portal (SSE push + toast) |
| **Admin Portal** | Reassigns to different pharmacy | Order removed from current pharmacy portal (SSE push + toast: "Reassigned") |
| **Admin Portal** | Resolves stock issue (proceed) | Issue banner removed, actions re-enabled (SSE push) |
| **Admin Portal** | Resolves stock issue (reassign) | Order removed from pharmacy portal (SSE push + toast) |
| **Auto-Reorder System** | Subscription renewal creates new order | Admin reviews → sends to pharmacy → appears in New tab (same flow) |

### 16.2 Downstream (What the Pharmacy Portal Feeds)

| Pharmacy Action | Effect on Admin Portal | Effect on Patient App |
|----------------|----------------------|----------------------|
| Start Preparing | Delivery card status → "PREPARING" (SSE) | Stepper updates to "Pharmacy Preparing" |
| Mark Ready | Delivery card → "READY"; "Arrange Delivery" button enabled (SSE) | Stepper updates to "Ready for Pickup" |
| Report Issue | Delivery card shows issue banner (SSE); coordinator gets URGENT push + WhatsApp | "Slight delay" push notification |

### 16.3 End-to-End Flow Diagram

```
Doctor Portal                    Admin Portal                     Pharmacy Portal
─────────────                    ────────────                     ───────────────
Creates Prescription ──→ Order appears (CREATED)                     
                                        │
                         Patient Pays (PAYMENT_COMPLETE)
                         Order created (CREATED)
                                        │
                         "Send to Pharmacy"  ──────────→ New Orders tab
                         (selects pharmacy)               (SENT_TO_PHARMACY)
                                        │                       │
                         Status: PREPARING ←──────────── "Start Preparing"
                                        │                       │
                         Status: READY     ←──────────── "Ready for Pickup"
                         "Arrange Delivery"                     │
                         (enters delivery person)               │
                                        │                       │
                         Status: OUT_FOR_DELIVERY          Ready tab: Picked Up
                                        │
                         Delivery OTP confirmed
                                        │
                         Status: DELIVERED                 Ready tab: ✅ Delivered
```

*(Source: PORTAL-PHARMACY.md §20, §26)*

---

## 17. Medications by Medical Vertical

### 17.1 Standard Prescription Medications

| Vertical | Common Medications | Forms |
|----------|-------------------|-------|
| **Hair Loss** | Finasteride 1mg, Minoxidil 5% topical, Biotin 10000mcg, Ketoconazole 2% shampoo | Tablets, topical solution, capsules, shampoo |
| **ED** | Tadalafil 5mg/10mg/20mg, Sildenafil 50mg/100mg | Tablets |
| **PE** | Dapoxetine 30mg/60mg, SSRIs (Paroxetine 10mg, Fluoxetine 20mg), Lidocaine spray | Tablets, spray |
| **Weight (Standard)** | Orlistat 120mg, Phentermine 15mg (Schedule H1), Metformin XR 500mg | Capsules, tablets |
| **Weight (GLP-1 Premium)** | Semaglutide 0.25mg/0.5mg/1mg/2.4mg, Liraglutide 0.6mg/1.2mg/1.8mg | Injection pens |
| **PCOS** | Metformin 500mg/1000mg, Spironolactone 25mg/50mg, Combined OCP, Letrozole 2.5mg | Tablets |

### 17.2 Pharmacy Staff Responsibility by Medication Type

The pharmacy staff does not see which vertical/condition a medication is for — they only see the medication names, dosages, and quantities. This is by design (privacy). However, staff should be aware of:

- **Topical solutions** (Minoxidil): Verify bottle seal intact
- **Injection pens** (Semaglutide, Liraglutide): Cold chain handling required (see §18)
- **Schedule H1 drugs** (Phentermine): Special prescription endorsement required (see §18)
- **Sprays** (Lidocaine): Verify packaging integrity

*(Source: PORTAL-PHARMACY.md §23, VERTICAL-HAIR-LOSS.md, VERTICAL-ED.md, VERTICAL-PE.md, VERTICAL-WEIGHT.md, VERTICAL-PCOS-PART1.md)*

---

## 18. Cold Chain & Controlled Substance Handling

### 18.1 Cold Chain Requirements

| Medication | Storage Temp | Pharmacy Handling |
|-----------|-------------|-------------------|
| Semaglutide (Ozempic/Wegovy) | 2–8°C refrigerated | Store in pharmacy fridge. Hand to delivery person in insulated bag. |
| Liraglutide (Saxenda) | 2–8°C refrigerated | Same as above |
| All other medications | Room temperature | Standard shelf storage |

**MVP constraint:** Cold chain tracking is **manual** for MVP. No system-level temperature monitoring is built. The pharmacy is expected to follow standard pharmaceutical cold chain practices. Digital cold chain tracking is planned for Phase 2 if GLP-1 volume warrants it.

### 18.2 Controlled Substances

Some medications (e.g., Phentermine — Schedule H1 under Drugs and Cosmetics Act) require special handling:

- Prescription must include specific Schedule H1 endorsement from the prescribing doctor
- Pharmacy staff should verify the prescription PDF includes required endorsements before dispensing
- If concerned about regulatory compliance → use the **"Regulatory Concern"** stock issue type to flag it for coordinator review
- The coordinator may escalate to the prescribing doctor for clarification

*(Source: PORTAL-PHARMACY.md §23)*

---

## 19. Error States & Edge Cases

### 19.1 Authentication Errors

| Scenario | What Happens |
|----------|-------------|
| Unregistered phone number attempts login | Error message: "This phone number is not registered as a pharmacy partner. Please contact the Onlyou admin." |
| OTP expires (>5 minutes) | "OTP expired. Please request a new one." |
| 5 wrong OTP attempts | Account locked for 30 minutes. "Too many incorrect attempts. Try again in 30 minutes." |
| Account deactivated by admin mid-session | Next API call returns 403 → redirect to login → "Account deactivated. Contact admin." |
| Concurrent sessions from different devices | New login invalidates previous session |

### 19.2 Order Status Errors

| Scenario | What Happens |
|----------|-------------|
| Pharmacy tries to start preparing an already-preparing order | Server returns 400: "Order is already being prepared" |
| Pharmacy tries to mark ready an order that's not PREPARING | Server returns 400: "Order must be in PREPARING status" |
| Pharmacy tries to act on a CANCELLED order | Server returns 400: "Order has been cancelled" |
| Two staff members try to start preparing the same order simultaneously | First request succeeds; second receives 409 Conflict |
| Order removed from portal while staff is viewing it | SSE event removes card from UI; toast: "This order has been cancelled/reassigned" |

### 19.3 Network & Connectivity Errors

| Scenario | What Happens |
|----------|-------------|
| API call fails (network error) | Toast: "Failed to update order. Please try again." Retry button shown. |
| SSE connection lost | Auto-reconnect with exponential backoff. After 5+ minutes: banner "Connection lost. Data may be outdated. [Refresh]" |
| Offline for extended period | Cached order list shown (service worker). Mutations queued locally. On reconnect: replayed with toast "Syncing [X] pending actions..." |
| CloudFront signed URL expires while viewing PDF | 1-hour expiry. If expired, next tap on "View Prescription" auto-refreshes URL via API. |

### 19.4 Stock Issue Edge Cases

| Scenario | What Happens |
|----------|-------------|
| Pharmacy reports issue, then medication restocks before coordinator resolves | Pharmacy must wait for coordinator resolution. Cannot self-resolve. (Phase 2 may add self-resolution.) |
| Coordinator resolves issue as "proceed" but pharmacy still can't fill order | Pharmacy can report another issue on the same order |
| Multiple issues on different orders simultaneously | Each handled independently; coordinator sees all issues in admin portal |
| Pharmacy reports issue on an order being reassigned at the same time | Race condition: server validates current status. If status already changed, API returns error. |

### 19.5 Delivery Edge Cases

| Scenario | What Happens |
|----------|-------------|
| Order marked READY but no delivery arranged for 4+ hours | BullMQ SLA alert → coordinator notified. Pharmacy sees 🔴 time indicator. |
| Delivery fails (patient unavailable) | Status → `DELIVERY_FAILED`. Admin reschedules. Pharmacy may see the order briefly in Ready tab before admin resolves. |
| Delivery person picks up wrong order | Admin manages resolution. Pharmacy is unaffected. |

*(Source: PORTAL-PHARMACY.md §17)*

---

## 20. Audit Logging & DPDPA Compliance

### 20.1 Audit Events Logged

Every pharmacy portal action creates an immutable audit record:

| Action | Event Name | Payload |
|--------|-----------|---------|
| Login | `pharmacy.login` | `{ pharmacyId, userId, timestamp }` |
| View new orders | `pharmacy.view_new_orders` | `{ pharmacyId, count, timestamp }` |
| View preparing tab | `pharmacy.view_preparing` | `{ pharmacyId, count, timestamp }` |
| View ready tab | `pharmacy.view_ready` | `{ pharmacyId, awaitingCount, pickedUpCount, timestamp }` |
| Start preparing | `pharmacy.start_preparing` | `{ orderId, pharmacyId, timeInNewQueue, timestamp }` |
| Mark ready | `pharmacy.mark_ready` | `{ orderId, pharmacyId, preparationDuration, timestamp }` |
| Report stock issue | `pharmacy.report_issue` | `{ orderId, pharmacyId, issueType, medicationCount, timestamp }` |
| View prescription PDF | `pharmacy.view_prescription` | `{ orderId, pharmacyId, timestamp }` |
| PWA installed | `pharmacy.pwa_installed` | `{ pharmacyId, timestamp }` |

### 20.2 DPDPA Compliance

- Pharmacy processing is covered under the patient's `PHARMACY_SHARING` consent record (separate consent for sharing prescription data with pharmacy partner)
- Pharmacy portal processes data under "purpose limitation" — orders are anonymized (no patient PII exposed to pharmacy)
- Audit trail provides full accountability chain from prescription receipt through delivery
- Retention: minimum 1 year (DPDP Rules 2025), recommended 3 years (aligned with Telemedicine Practice Guidelines 2020)
- No pre-ticked consent boxes or bundled consent terms — patient explicitly consents to pharmacy data sharing during onboarding

*(Source: BACKEND-PART3A.md §21, PORTAL-PHARMACY.md §19, Architecture Blueprint §15)*

---

## 21. Known Issues & Fixes from Verification Reports

### 21.1 Resolved Issues (from FIXES-CHANGELOG.md)

| ID | Severity | Description | Resolution |
|----|----------|-------------|------------|
| CRITICAL-2 | 🔴 | Status enum names in BACKEND-PART1.md §9 used wrong names (`PRESCRIBED` instead of `PRESCRIPTION_CREATED`, etc.) | Full rewrite of consultation status enum |
| CRITICAL-3 | 🔴 | CASL rules in BACKEND-PART1.md §4.6 diverged from BACKEND-PART3A.md §22.4 | BACKEND-PART3A.md §22.4 declared single source of truth for all CASL rules |
| MEDIUM-3 | 🟡 | Role enum case inconsistency: `'pharmacy'` vs `'PHARMACY_STAFF'` | Standardized to UPPERCASE: `'pharmacy'` → `'PHARMACY_STAFF'` |

### 21.2 Outstanding Issues (from backend-errors-report.md)

| ID | Severity | Description | Impact on Pharmacy |
|----|----------|-------------|-------------------|
| #7 | 🟡 HIGH | BullMQ queue names inconsistent: `notification-dispatch` vs `notifications` | Affects pharmacy notification delivery if queue name mismatch at runtime |
| #16 | 🟡 MEDIUM | Bull Board uses `ExpressAdapter` but app uses Fastify | Admin monitoring of pharmacy-related queues may not load. Fix: use `@bull-board/fastify` |
| #19 | 🟡 HIGH | Seed data pricing wrong for all verticals in BACKEND-PART3A Section 25 | May affect test pharmacy orders in development environment |
| NEW | 🟡 MEDIUM | BACKEND-PART2A `getPricing()` uses condition key `WEIGHT` instead of `WEIGHT_MANAGEMENT` | Weight Management orders may fail pricing lookup during payment, preventing order creation and pharmacy pipeline entry |
| NEW | 🟡 MEDIUM | BACKEND-PART2A `getPricing()` only includes Standard tier pricing for Weight | GLP-1 Premium tier orders have no pricing entry — when GLP-1 launches, `getPricing()` cannot resolve GLP-1 plan amounts |

### 21.3 Cross-Document Discrepancies Affecting Pharmacy

| Discrepancy | Where | Resolution |
|-------------|-------|------------|
| Status enum names: `PHARMACY_PREPARING` / `PHARMACY_READY` vs `PREPARING` / `READY` | onlyou-spec-resolved-v4.md §4.6 uses prefixed names; PORTAL-PHARMACY.md uses canonical unprefixed names | PORTAL-PHARMACY.md is source of truth — canonical enum uses `PREPARING`, `READY` |
| `PHARMACY_STOCK_ISSUE` vs `PHARMACY_ISSUE` | APP-PATIENT.md §6.1 uses `PHARMACY_STOCK_ISSUE` | Canonical enum is `PHARMACY_ISSUE` — APP-PATIENT.md should be corrected |
| "prescription ID" vs "Order ID" in pharmacy data | Multiple docs say pharmacy sees "prescription ID" | Pharmacy sees **Order ID** (`ORD-XXXX`), NOT prescription ID. `prescriptionId` is explicitly excluded from `OrderForPharmacy`. |
| Pharmacy portal "Incoming" tab vs "New Orders" tab | PORTAL-ADMIN.md §13 refers to "Incoming" tab | Correct name is **"New Orders"** / **"New"** tab |
| Timestamp naming: `sentAt` vs `sentToPharmacyAt` | ARCHITECTURE.md §5 uses `sentAt` | Canonical field name is `sentToPharmacyAt` (PORTAL-PHARMACY.md) |
| Timestamp naming: `preparingAt` vs `preparingStartedAt` | ARCHITECTURE.md and PORTAL-PHARMACY.md use `preparingAt`; Prisma schema (BACKEND-PART2A.md §11.2) uses `preparingStartedAt` | Prisma schema is database source of truth. Code must use `preparingStartedAt`. PORTAL-PHARMACY.md and ARCHITECTURE.md should be corrected. This doc follows PORTAL-PHARMACY.md naming (`preparingAt`) but actual DB column is `preparingStartedAt`. |
| JWT role claim: `'pharmacy'` vs `'PHARMACY_STAFF'` | PORTAL-PHARMACY.md §2, §4 uses `role: 'pharmacy'`; BACKEND-PART1.md (post FIXES-CHANGELOG MEDIUM-3) uses `'PHARMACY_STAFF'` | BACKEND-PART1.md is authoritative post-fix. PORTAL-PHARMACY.md §2 and §4 still show pre-fix value `'pharmacy'` and need updating. This doc uses the correct post-fix value `PHARMACY_STAFF`. |
| Middleware roleCheck param: `'pharmacy'` vs `'PHARMACY_STAFF'` | PORTAL-PHARMACY.md §14 says `roleCheck('pharmacy')`; BACKEND-PART1.md §4.5 (post-fix) says `ctx.user.role !== 'PHARMACY_STAFF'` | Same fix as above — PORTAL-PHARMACY.md's middleware chain description needs updating to `roleCheck('PHARMACY_STAFF')`. This doc uses the correct post-fix value. |
| Delivery completion SLA: 2h vs 24h | PORTAL-PHARMACY.md §22 says "2 hours after pickup"; BACKEND-PART2B.md §18.3 says `DELIVERY_COMPLETION_HOURS: 24` | BACKEND-PART2B.md is the SLA engine source of truth (24 hours). PORTAL-PHARMACY.md §22 is incorrect. This doc follows BACKEND-PART2B. |
| PORTAL-ADMIN.md §30 SLA values differ from BACKEND-PART2B.md §18.3 | Admin doc: Pharmacy preparation = "24 hours after sent", Delivery arrangement = "2 hours"; Backend: `PHARMACY_FINISH_HOURS: 4`, `DELIVERY_ARRANGEMENT_HOURS: 4` | BACKEND-PART2B.md §18.3 is the SLA engine source of truth. PORTAL-ADMIN.md §30 has wrong pharmacy SLA values and needs updating. This doc follows BACKEND-PART2B. |
| Consultation status: `PRESCRIBED` vs `PRESCRIPTION_CREATED` | WORKFLOW-PATIENT-CHANGES.md uses `PRESCRIBED`; PORTAL-DOCTOR.md §23 and REMAINING-DOCS-CHANGES.md use `PRESCRIPTION_CREATED` | `PRESCRIPTION_CREATED` is the canonical enum value per PORTAL-DOCTOR.md. `PRESCRIBED` in WORKFLOW-PATIENT-CHANGES.md should be corrected. This doc uses `PRESCRIPTION_CREATED`. |

### 21.4 Payment Flow Changes (from BACKEND-ALL-CHANGES.md)

The "Pay After Doctor, Not Before" redesign affects the pharmacy workflow:
- Medication orders are now created upon patient payment (`PAYMENT_COMPLETE`), not when the doctor creates the prescription
- The pharmacy pipeline is only triggered after payment confirmation, not after prescription creation
- No changes to the pharmacy portal itself — the pharmacy still receives and processes orders the same way
- The difference is that fewer orders enter the pipeline (only paying patients), which should reduce waste

*(Source: FIXES-CHANGELOG.md, backend-errors-report.md, BACKEND-ALL-CHANGES.md)*

---

## 22. Cross-Reference Index

| Topic | Primary Document | Section |
|-------|-----------------|---------|
| Pharmacy portal UI specification | PORTAL-PHARMACY.md | Full document |
| Order Prisma schema | BACKEND-PART2A.md | §11 |
| Order service (all methods) | BACKEND-PART2A.md | §11 |
| Payments & order creation trigger | BACKEND-PART2A.md | §14 |
| Full tRPC router tree | BACKEND-PART3B.md | §30.1 |
| S3 bucket architecture (prescription PDF storage) | BACKEND-PART2B.md | §20.1–§20.8 |
| BullMQ queue definitions + SLA processor | BACKEND-PART2B.md | §19.1–§19.6 |
| SLA configuration defaults | BACKEND-PART2B.md | §18.3 |
| SLA engine (admin perspective) | PORTAL-ADMIN.md | §33 |
| CASL.js rules (canonical) | BACKEND-PART3A.md | §22.4 |
| Audit log schema + service | BACKEND-PART3A.md | §21.9 |
| SSE architecture + Redis Pub/Sub | BACKEND-PART2B.md | §16 |
| SSE architecture rationale | Architecture Blueprint | §8 |
| Notification channels + templates | BACKEND-PART2A.md | §15 |
| Auth (OTP + JWT + refresh) | BACKEND-PART1.md | §4 |
| Admin send-to-pharmacy flow | PORTAL-ADMIN.md | §13 |
| Admin arrange delivery flow | PORTAL-ADMIN.md | §14 |
| Admin partner management (pharmacies) | PORTAL-ADMIN.md | §17–§18 |
| Admin SLA configuration | PORTAL-ADMIN.md | §30 |
| Patient medication delivery tracking | APP-PATIENT.md | §14 |
| Patient delivery OTP confirmation | APP-PATIENT.md | §14.3 |
| Patient activity tab stepper | APP-PATIENT.md | §6.1 |
| Patient subscription & auto-reorder | APP-PATIENT.md | §15 |
| Doctor prescription builder | PORTAL-DOCTOR.md | §12 |
| Doctor prescription submit flow | PORTAL-DOCTOR.md | §12.8 |
| Doctor workflow (post-prescription) | WORKFLOW-DOCTOR-PART2.md | §18 |
| Patient workflow (delivery lifecycle) | WORKFLOW-PATIENT.md | §22 |
| Hair Loss medications | VERTICAL-HAIR-LOSS.md | Prescription Templates |
| ED medications | VERTICAL-ED.md | Prescription Templates |
| PE medications | VERTICAL-PE.md | Prescription Templates |
| Weight medications (Standard + GLP-1) | VERTICAL-WEIGHT.md | Prescription Templates |
| PCOS medications | VERTICAL-PCOS-PART1.md | Prescription Templates |
| Payment flow redesign | BACKEND-ALL-CHANGES.md | §B2A-1 through §B2A-6 |
| Payment flow rationale | Pay_After_the_Doctor_Not_Before.md | Full document |
| Build phase & checkpoint | onlyou-spec-resolved-v4.md | Phase 4 (Week 11–14) |
| Backend errors report | backend-errors-report.md | Issues #7, #16, #19 |
| Fixes changelog | FIXES-CHANGELOG.md | CRITICAL-2/3, MEDIUM-3 |
| Seed data (test pharmacy) | PORTAL-PHARMACY.md | §24 |
| Testing checklist | PORTAL-PHARMACY.md | §25 |
| Deployment config | PORTAL-PHARMACY.md | §24 |

---

*End of WORKFLOW-PHARMACY.md — Pharmacy Staff Workflow: Complete Operational Guide*

*This document covers every pharmacy workflow from prescription receipt to delivery handoff, including all edge cases, cross-portal synchronization, backend service integration, SLA enforcement, stock issue handling, cold chain requirements, privacy/RBAC, notification cascades, and known issues from verification reports. For the portal UI specification, see PORTAL-PHARMACY.md. For the backend implementation, see BACKEND-PART2A.md §11 (Orders), §14 (Payments). For admin management of pharmacies, see PORTAL-ADMIN.md §13–§14, §17–§18.*

*v1.1 — Updated 2026-03-03: Re-verification pass completed. Fixed 3 errors: (1) Notifications module reference corrected from BACKEND-PART2B to BACKEND-PART2A §15; (2) Consultation status corrected from `PRESCRIBED` to `PRESCRIPTION_CREATED`; (3) Delivery completion SLA corrected from 2h to 24h per BACKEND-PART2B.md §18.3. Added 7 new cross-document discrepancies to §21.3: `preparingAt` vs `preparingStartedAt` field naming, JWT role claim pre/post-fix inconsistency, middleware roleCheck param, delivery completion SLA, PORTAL-ADMIN.md SLA values, and `PRESCRIBED` vs `PRESCRIPTION_CREATED` status naming. All verified against: PORTAL-PHARMACY.md, PORTAL-ADMIN.md, PORTAL-DOCTOR.md, PORTAL-LAB-FIXED.md, BACKEND-PART1.md, BACKEND-PART2A.md, BACKEND-PART2B.md, BACKEND-PART3A.md, BACKEND-PART3B.md, ARCHITECTURE.md, APP-PATIENT.md, FIXES-CHANGELOG.md, BACKEND-ALL-CHANGES.md, REMAINING-DOCS-CHANGES.md, WORKFLOW-PATIENT-CHANGES.md, WORKFLOW-LAB.md, WORKFLOW-NURSE-PART1.md, and all 5 vertical specifications.*
