# WORKFLOW-DELIVERY.md — Medication Delivery Workflow: Complete Operational Guide

> **Platform:** Onlyou Telehealth — Indian telehealth for stigmatized chronic conditions
> **Roles Involved:** Admin/Coordinator (primary), Delivery Person (SMS link), Pharmacy Staff (upstream), Patient (downstream)
> **Interface — Coordinator:** `admin.onlyou.life` — Next.js 14 SPA (desktop-first)
> **Interface — Delivery Person:** Single-use SMS link web page (mobile-optimized, no auth — token IS the auth)
> **Interface — Patient:** React Native Expo mobile app (delivery tracking stepper + OTP display)
> **Scope:** Covers the complete medication delivery lifecycle from prescription creation → pharmacy fulfillment → coordinator arranges delivery → delivery person pickup & drop → patient OTP confirmation → post-delivery experience. Includes auto-reorder, cold chain handling, delivery failures, manual overrides, replacement orders, SLA enforcement, cross-portal synchronization, and privacy considerations.

---

## Table of Contents

1. [Delivery System Overview & Context](#1-delivery-system-overview--context)
2. [Delivery Order Lifecycle — End-to-End Status Flow](#2-delivery-order-lifecycle--end-to-end-status-flow)
3. [Workflow 1: Order Creation Triggers](#3-workflow-1-order-creation-triggers)
4. [Workflow 2: Admin Sends Order to Pharmacy](#4-workflow-2-admin-sends-order-to-pharmacy)
5. [Workflow 3: Pharmacy Fulfillment (Upstream)](#5-workflow-3-pharmacy-fulfillment-upstream)
6. [Workflow 4: Coordinator Arranges Delivery](#6-workflow-4-coordinator-arranges-delivery)
7. [Workflow 5: Delivery Person — SMS Link Flow](#7-workflow-5-delivery-person--sms-link-flow)
8. [Workflow 6: Patient OTP Confirmation](#8-workflow-6-patient-otp-confirmation)
9. [Workflow 7: Delivery Failure & Rescheduling](#9-workflow-7-delivery-failure--rescheduling)
10. [Workflow 8: Manual Delivery Override](#10-workflow-8-manual-delivery-override)
11. [Workflow 9: Pharmacy Stock Issues & Reassignment](#11-workflow-9-pharmacy-stock-issues--reassignment)
12. [Workflow 10: Replacement Orders (Wrong/Damaged Medication)](#12-workflow-10-replacement-orders-wrongdamaged-medication)
13. [Auto-Reorder on Subscription Renewal](#13-auto-reorder-on-subscription-renewal)
14. [Cold Chain & Controlled Substance Delivery](#14-cold-chain--controlled-substance-delivery)
15. [Discreet Packaging & Privacy](#15-discreet-packaging--privacy)
16. [Patient Delivery Tracking Experience](#16-patient-delivery-tracking-experience)
17. [Post-Delivery Experience](#17-post-delivery-experience)
18. [Backend Service Integration](#18-backend-service-integration)
19. [Database Schema — Delivery-Relevant Models](#19-database-schema--delivery-relevant-models)
20. [tRPC & REST API Reference](#20-trpc--rest-api-reference)
21. [Real-Time System (SSE + Redis Pub/Sub)](#21-real-time-system-sse--redis-pubsub)
22. [Notification Matrix — All Delivery Events](#22-notification-matrix--all-delivery-events)
23. [SLA Thresholds & BullMQ Escalation Engine](#23-sla-thresholds--bullmq-escalation-engine)
24. [Cross-Portal Synchronization Matrix](#24-cross-portal-synchronization-matrix)
25. [Refund Scenarios — Delivery-Related](#25-refund-scenarios--delivery-related)
26. [Edge Cases & Error States](#26-edge-cases--error-states)
27. [Audit Logging & DPDPA Compliance](#27-audit-logging--dpdpa-compliance)
28. [Testing Checklist](#28-testing-checklist)
29. [Cross-Reference Index](#29-cross-reference-index)

---

## 1. Delivery System Overview & Context

### 1.1 What Is Delivery in Onlyou?

Delivery is the physical fulfillment link that bridges the doctor's clinical decision and the patient receiving their medication. Every active subscription across all five verticals (Hair Loss, ED, PE, Weight Management, PCOS) depends on reliable medication delivery. Without delivery, the treatment plan remains an unfulfilled prescription on paper.

The delivery system is **coordinator-managed, not automated**. There is no integrated logistics API (no Delhivery/Shiprocket integration at MVP). Instead, the admin/coordinator manually arranges each delivery by entering a delivery person's details and the system generates an SMS link for pickup and drop-off. This is intentional — it gives the small team full control over delivery quality, enables flexible use of different delivery methods (Rapido, Dunzo, own delivery person, or other), and avoids upfront logistics integration costs.

### 1.2 Key Design Decisions

**No delivery person portal.** The delivery person is a gig worker or local runner, not an Onlyou employee. They receive a single-use SMS link per delivery — no login, no app, no training required. The link is a lightweight mobile-optimized web page that works on slow connections.

**OTP confirmation follows Indian standard pattern.** The patient holds the 4-digit OTP (displayed on their app). The delivery person asks for it verbally and enters it on the SMS link page. This matches Swiggy, Zomato, Flipkart, and other Indian delivery platforms — familiar UX for both parties.

**Coordinator is the orchestrator.** The admin/coordinator is the single point of control for the entire delivery pipeline. They assign pharmacies, arrange delivery persons, update ETAs, handle failures, and perform manual overrides when needed.

**Privacy is paramount.** The delivery person sees only: package ID, pharmacy pickup address, patient delivery address, and patient phone. They never see the patient's name, condition, medication names, diagnosis, or any clinical data. The package itself is plain Onlyou-branded box with no condition or medication information visible externally.

### 1.3 Delivery Person — Who Are They?

The delivery person is NOT an Onlyou employee. They are:

- A Rapido/Dunzo gig rider booked by the coordinator
- An "own delivery person" — a local runner the coordinator knows
- Any other ad hoc delivery method

They receive an SMS with a link. They open it. They pick up from pharmacy, deliver to patient, enter OTP, done. No account, no app, no onboarding.

### 1.4 Interaction Touchpoints

| Role | How Delivery Interacts | Direction |
|------|------------------------|-----------|
| **Admin/Coordinator** | Arranges delivery (enters delivery person details, generates SMS link), monitors delivery progress, handles failures, performs manual overrides | Admin ↔ Delivery System (primary controller) |
| **Pharmacy Staff** | Prepares medication, marks order as READY, monitors pickup status (read-only) | Pharmacy → Delivery (upstream handoff) |
| **Delivery Person** | Receives SMS link, picks up from pharmacy, delivers to patient, enters OTP | Delivery Person ↔ SMS Link Page |
| **Patient** | Views delivery tracking stepper, receives OTP, shares OTP with delivery person, calls delivery person if needed | Patient ↔ App (passive tracking + OTP share) |
| **Doctor** | Creates prescription that triggers the order (no further delivery involvement) | Doctor → Order Creation (indirect) |

*(Source: PORTAL-ADMIN.md §13–§15, PORTAL-PHARMACY.md §20, APP-PATIENT.md §14, onlyou-spec-resolved-v4.md §4.8)*

---

## 2. Delivery Order Lifecycle — End-to-End Status Flow

### 2.1 Complete Status Flow Diagram

```
         ┌─────────────────────────────┐
         │ Doctor Creates Prescription  │
         │ + Patient Completes Payment  │
         └────────────┬────────────────┘
                      ▼
              ┌──────────────┐
              │   CREATED    │ ← Order exists, no pharmacy assigned
              └──────┬───────┘     Admin sees in "New (needs pharmacy)" filter
                     │ Admin sends to pharmacy
                     ▼
         ┌──────────────────────┐
         │  SENT_TO_PHARMACY    │ ← Pharmacy portal New tab shows this
         └──────────┬───────────┘
                    │ Pharmacy taps "Start Preparing"
                    ▼
            ┌──────────────┐
            │  PREPARING   │ ← Pharmacy is gathering & packing medications
            └──────┬───────┘
                   │ Pharmacy taps "Ready for Pickup"
                   ▼
              ┌──────────┐
              │  READY   │ ← Admin can now arrange delivery
              └─────┬────┘
                    │ Admin enters delivery person details → SMS link sent
                    ▼
         ┌──────────────────────┐
         │  OUT_FOR_DELIVERY    │ ← Delivery person has the SMS link
         └──────────┬───────────┘     Patient sees OTP on tracking screen
                    │ Delivery person enters patient's 4-digit OTP
                    ▼
            ┌──────────────┐
            │  DELIVERED   │ ← Terminal success state
            └──────────────┘


SPECIAL PATHS:

         ┌────────────────────────┐
         │ Pharmacy Reports Issue  │
         │ (at SENT_TO_PHARMACY    │
         │  or PREPARING)          │
         └───────────┬────────────┘
                     ▼
          ┌────────────────────┐
          │  PHARMACY_ISSUE    │ → Coordinator resolves:
          └────────────────────┘     • Proceed (resume normal flow)
                                     • Reassign to different pharmacy
                                     • Cancel order

         ┌────────────────────────┐
         │ Delivery Person Marks   │
         │ "Delivery Failed"       │
         └───────────┬────────────┘
                     ▼
          ┌────────────────────┐
          │  DELIVERY_FAILED   │ → Coordinator reschedules delivery
          └────────────────────┘

         ┌────────────────────────┐
         │ Admin Reassigns Order   │
         │ (to different pharmacy)  │
         └───────────┬────────────┘
                     ▼
          ┌────────────────────┐
          │   REASSIGNED       │ → Order removed from original pharmacy,
          └────────────────────┘     appears at new pharmacy as SENT_TO_PHARMACY

         ┌────────────────────────┐
         │ Admin Cancels Order     │
         │ (at any pre-delivery)   │
         └───────────┬────────────┘
                     ▼
          ┌────────────────────┐
          │    CANCELLED       │ → Terminal state
          └────────────────────┘
```

### 2.2 OrderStatus Enum

```typescript
enum OrderStatus {
  CREATED              // Order exists, no pharmacy assigned
  SENT_TO_PHARMACY     // Assigned to a pharmacy, awaiting preparation
  PREPARING            // Pharmacy is gathering & packing medications
  READY                // Packed and waiting for delivery pickup
  OUT_FOR_DELIVERY     // Delivery person has pickup, en route to patient
  DELIVERED            // Patient confirmed receipt via OTP (terminal)
  PHARMACY_ISSUE       // Pharmacy reported a stock or prescription issue
  DELIVERY_FAILED      // Delivery attempt failed (not home, wrong address, etc.)
  REASSIGNED           // Moved to a different pharmacy (terminal for original)
  CANCELLED            // Admin cancelled the order (terminal)
}
```

### 2.3 DeliveryMethod Enum

```typescript
enum DeliveryMethod {
  RAPIDO    // Rapido bike courier
  DUNZO     // Dunzo delivery service
  OWN       // Coordinator's own delivery person / local runner
  OTHER     // Any other ad hoc method
}
```

### 2.4 Valid Status Transitions

| Current Status | Action | New Status | Who |
|---------------|--------|------------|-----|
| `CREATED` | Send to pharmacy | `SENT_TO_PHARMACY` | Admin |
| `SENT_TO_PHARMACY` | Start preparing | `PREPARING` | Pharmacy |
| `PREPARING` | Mark ready | `READY` | Pharmacy |
| `READY` | Arrange delivery | `OUT_FOR_DELIVERY` | Admin |
| `OUT_FOR_DELIVERY` | OTP confirmed | `DELIVERED` | Delivery person (via SMS link) |
| `OUT_FOR_DELIVERY` | Manual override | `DELIVERED` | Admin |
| `OUT_FOR_DELIVERY` | Mark failed | `DELIVERY_FAILED` | Delivery person (via SMS link) |
| `DELIVERY_FAILED` | Reschedule | `OUT_FOR_DELIVERY` | Admin |
| `SENT_TO_PHARMACY` or `PREPARING` | Report issue | `PHARMACY_ISSUE` | Pharmacy |
| `PHARMACY_ISSUE` | Resolve (proceed) | Previous status | Admin |
| `PHARMACY_ISSUE` | Resolve (reassign) | `REASSIGNED` | Admin |
| `CREATED`, `SENT_TO_PHARMACY`, `PREPARING`, `READY`, or `PHARMACY_ISSUE` | Cancel | `CANCELLED` | Admin |

> **Note:** `OUT_FOR_DELIVERY` and `DELIVERY_FAILED` are NOT cancellable per BACKEND-PART2A.md §11.4 `cancelOrder()`. These must be resolved through rescheduling or manual override.

### 2.5 Invalid Transitions (Server Rejects)

| Attempted Transition | Why Blocked |
|---------------------|-------------|
| `SENT_TO_PHARMACY` → `READY` | Must go through PREPARING first |
| `READY` → `PREPARING` | Cannot go backwards |
| `PHARMACY_ISSUE` → `PREPARING` | Issue must be resolved by coordinator first |
| `CANCELLED` → any | Cancelled is terminal |
| `DELIVERED` → any | Delivered is terminal |
| `OUT_FOR_DELIVERY` → `PREPARING` | Cannot go backwards after delivery starts |

*(Source: PORTAL-PHARMACY.md §21, BACKEND-PART2A.md §11.2)*

---

## 3. Workflow 1: Order Creation Triggers

### 3.1 When Delivery Orders Are Created

Orders are created automatically in three scenarios:

**Trigger 1: First prescription after payment (Pay-After-Doctor model)**

The first medication order is created when the patient completes payment (`PAYMENT_COMPLETE` status), NOT when the doctor creates the prescription. This is handled in the Razorpay webhook handler:

```
Payment confirmed → activateSubscriptionAndCreateOrder():
  1. Activate subscription record
  2. Transition consultation: AWAITING_PAYMENT → PAYMENT_COMPLETE
  3. Create first Order record (status: CREATED)
  4. Emit 'order.created' event → coordinator notification
  5. Consultation auto-transitions: PAYMENT_COMPLETE → PHARMACY_PROCESSING
```

**Trigger 2: Auto-reorder on subscription renewal**

When a monthly or quarterly subscription renews successfully via Razorpay, the auto-reorder service creates a new order based on the most recent active prescription. See Section 13 for full details.

**Trigger 3: Patient manual reorder**

Patient taps "Reorder" on the Home tab of the mobile app. This creates a new delivery order using the current active prescription.

### 3.2 Order Record Created

When an order is created, the following data is set:

- `orderNumber`: Sequential (ORD-0001, ORD-0002, etc.)
- `patientId`: The patient's UUID
- `prescriptionId`: The active prescription UUID
- `subscriptionId`: The active subscription UUID (null for one-time orders)
- `medications`: JSON snapshot of medications from prescription (denormalized for pharmacy view)
- `condition`: The medical vertical (HAIR_LOSS, ED, PE, WEIGHT, PCOS)
- `deliveryAddress`, `deliveryCity`, `deliveryPincode`: From patient's address book
- `status`: `CREATED`
- `isAutoReorder`: Boolean (true for subscription renewal orders)
- `parentOrderId`: Previous order UUID (for reorder chain tracking)

### 3.3 What Happens After Creation

The coordinator (admin) sees the new order in the Deliveries screen under the "New (needs pharmacy)" filter tab with a red badge count. The order card shows the patient name, condition, medication list, and awaits the coordinator's action to assign it to a pharmacy.

*(Source: PORTAL-ADMIN.md §11, BACKEND-PART2A.md §10.2, APP-PATIENT.md §14.1)*

---

## 4. Workflow 2: Admin Sends Order to Pharmacy

### 4.1 Trigger

Coordinator sees a new order (status `CREATED`) in the Deliveries screen and taps **"Send to Pharmacy"**.

### 4.2 Step-by-Step Flow

1. Coordinator taps "Send to Pharmacy" on the order card
2. Dropdown appears with list of active partner pharmacies
3. Coordinator selects the appropriate pharmacy (based on location, stock availability, past reliability)
4. Confirmation: "Send this order to MedPlus (MG Road)?"
5. On confirm → API call: `trpc.admin.orders.sendToPharmacy.mutate({ orderId, pharmacyId })`

### 4.3 Backend Processing

1. Validate order exists and status is `CREATED`
2. Update `Order.pharmacyId` = selected pharmacy
3. Update `Order.status` → `SENT_TO_PHARMACY`
4. Set `Order.sentToPharmacyAt` = now
5. Notify pharmacy (push via portal + WhatsApp to contact person): "New prescription received — [Medication list]. Please prepare."
6. Prescription PDF becomes visible in the pharmacy portal
7. SSE event → admin feed, pharmacy portal
8. Audit log entry: `order_sent_to_pharmacy`

**Privacy note:** Pharmacy sees Order ID (ORD-XXXX format), anonymous patient ID (ONY-P-XXXX), medications, dosages, quantities, prescription PDF, and prescribing doctor name + NMC number. They do NOT see patient name, diagnosis, questionnaire data, patient address, or the internal prescriptionId.

*(Source: PORTAL-ADMIN.md §13, BACKEND-PART2A.md §11.4)*

---

## 5. Workflow 3: Pharmacy Fulfillment (Upstream)

> **Full details:** See WORKFLOW-PHARMACY.md for the complete pharmacy staff workflow. This section summarizes only what is relevant to the delivery pipeline.

### 5.1 Pharmacy Receives Order

Order appears in the pharmacy portal's **New Orders** tab via SSE push. Badge count increments. Card shows: Order ID, anonymous patient ID, medication list, prescription PDF link, prescribing doctor, and timestamp.

### 5.2 Pharmacy Prepares Order

1. Staff taps **"Start Preparing"** → status: `PREPARING`
2. Physical work: gather medications from shelf/fridge, verify against prescription PDF, check expiry dates, pack medications, label package with Order ID
3. For cold-chain items (GLP-1 pens): use insulated bag with gel ice packs and temperature indicator strip

### 5.3 Pharmacy Marks Ready

1. Staff taps **"Ready for Pickup"** → status: `READY`
2. Coordinator receives push notification: "Order ORD-XXXX ready at MedPlus (MG Road). Arrange delivery."
3. Patient receives push + WhatsApp: "Your medication is ready and will be delivered soon."
4. **Pharmacy's active role ends here.** Everything after is monitoring only (read-only Ready tab).

### 5.4 Time Indicators — Awaiting Pickup (Pharmacy View)

| Duration Waiting | Indicator | Meaning |
|-----------------|-----------|---------|
| < 2 hours | 🟢 Normal | Coordinator is arranging delivery |
| 2–4 hours | 🟡 Amber | May want to follow up with coordinator |
| > 4 hours | 🔴 Red | Something may be delayed |

*(Source: WORKFLOW-PHARMACY.md §4–§7)*

---

## 6. Workflow 4: Coordinator Arranges Delivery

### 6.1 Trigger

Order status is `READY` (pharmacy has packed the medication). Coordinator sees this in the Deliveries screen under "Ready for Pickup" filter. The **"Arrange Delivery"** button becomes enabled.

### 6.2 Delivery Setup Modal

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

### 6.3 API Call

```typescript
trpc.admin.delivery.arrangeDelivery.mutate({
  orderId: 'uuid',
  deliveryPersonName: 'Ravi Kumar',
  deliveryPersonPhone: '+919876543210',
  deliveryMethod: 'OWN',       // RAPIDO | DUNZO | OWN | OTHER
  estimatedMinutes: 45
})
```

**Zod validation:**
- `deliveryPersonName`: string, min 2, max 100 chars
- `deliveryPersonPhone`: regex `^\+91\d{10}$` (Indian mobile)
- `deliveryMethod`: enum `['RAPIDO', 'DUNZO', 'OWN', 'OTHER']`
- `estimatedMinutes`: integer, min 5, max 480 (8 hours)

### 6.4 Backend Processing — Arrange Delivery

Within a Prisma transaction:

1. Validate order belongs to system and status is `READY`
2. Generate 4-digit delivery OTP: `crypto.randomInt(1000, 9999)` → bcrypt hash stored in `Order.deliveryOtp`
3. Generate delivery link token: `crypto.randomUUID()` → SHA-256 hash stored in `DeliveryLink.token`
4. Create `DeliveryLink` record with 24-hour expiry
5. Update `Order`: status → `OUT_FOR_DELIVERY`, set `deliveryPersonName`, `deliveryPersonPhone`, `deliveryMethod`, `estimatedDeliveryMinutes`, `outForDeliveryAt`, reset `deliveryOtpAttempts` to 0

Post-transaction:

6. Send SMS to delivery person with link:
   > "Onlyou Delivery: Pick up package from MedPlus (MG Road) and deliver to 123 MG Road, Bangalore. Open link for details: {BASE_URL}/api/delivery/{token}"
7. Send notification → patient (push + WhatsApp): "Your medication is on its way! Delivery ETA: ~45 minutes."
8. Display delivery OTP prominently on patient's app tracking screen
9. SSE broadcast → admin feed, pharmacy portal (status update)
10. Schedule SLA check: delivery must complete within 24 hours (`sla.schedule` event)
11. Audit log entry: `DELIVERY_ARRANGED`

**Delivery link expires:** After OTP-confirmed delivery or 24 hours, whichever comes first.

*(Source: PORTAL-ADMIN.md §14, BACKEND-PART2A.md §11.4–§11.5)*

> **⚠️ Cross-Document Delivery Link Discrepancies:**
> - **URL format:** PORTAL-ADMIN.md §14.2 shows `https://admin.onlyou.life/d/{token}`. BACKEND-PART2A.md §11.6 (actual REST controller) uses `GET /api/delivery/:token` with domain set via `process.env.BASE_URL`. This document follows the backend code (authoritative).
> - **Token type:** BACKEND-PART3B.md §30.2 describes the token as "JWT with orderId + deliveryPersonPhone (1-hour expiry)". BACKEND-PART2A.md §11.4 (actual code) uses a random UUID → SHA-256 hash with 24-hour expiry via the `DeliveryLink` Prisma model. BACKEND-PART2A.md is authoritative. BACKEND-PART3B.md should be corrected.

---

## 7. Workflow 5: Delivery Person — SMS Link Flow

### 7.1 How the Delivery Person Enters the Flow

1. Delivery person receives an SMS on their phone
2. SMS contains a URL: `{BASE_URL}/api/delivery/{token}`
3. They tap the link → opens a mobile-optimized web page in their browser
4. **No login required.** The token in the URL IS the authentication.
5. The page works on slow 2G/3G connections (lightweight HTML, no heavy JS)

### 7.2 Delivery Person SMS Link Page

**NOT part of any portal.** This is a separate single-use mobile-optimized web page served by a REST endpoint (`GET /api/delivery/:token`):

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

### 7.3 Delivery Person Interactions

| Action | What Happens |
|--------|-------------|
| **"Navigate" (pickup)** | Opens Google Maps with pharmacy address |
| **"Call" (pharmacy)** | Opens phone dialer with pharmacy contact number |
| **"Confirm Pickup"** | Marks order as picked up — status update visible to admin + patient. `Order.pickedUpAt` set. |
| **"Navigate" (drop-off)** | Opens Google Maps with patient delivery address |
| **"Call Patient"** | Opens phone dialer with patient phone number |
| **OTP entry (4 digits)** | Delivery person enters the code the patient verbally shares → API verifies against stored bcrypt hash |
| **"Confirm Delivery"** | If OTP valid → `DELIVERED`. If invalid → error message + retry. |
| **"Delivery Failed"** | Opens reason selector → admin notified for rescheduling |

### 7.4 What the Delivery Person Can See (Privacy)

| Data | Visible? |
|------|----------|
| Package ID (ORD-XXXX) | ✅ Yes |
| Pharmacy name & address | ✅ Yes |
| Pharmacy phone | ✅ Yes |
| Patient delivery address | ✅ Yes |
| Patient phone number | ✅ Yes (for calling if needed) |
| Patient name | ❌ No |
| Patient condition/diagnosis | ❌ No |
| Medication names or details | ❌ No |
| Delivery OTP | ❌ No (patient holds it) |
| Prescription PDF | ❌ No |
| Any clinical data | ❌ No |

### 7.5 REST Endpoint — Delivery Link Page

```typescript
// rest/delivery.controller.ts
@Controller('api/delivery')
export class DeliveryController {
  @Get(':token')
  async getDeliveryPage(@Param('token') token: string, @Res() res: FastifyReply) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const link = await this.prisma.deliveryLink.findUnique({
      where: { token: tokenHash },
      include: { order: { include: { pharmacy: true } } },
    });

    if (!link || link.expiresAt < new Date()) {
      return res.status(404).send({ error: 'Link expired or invalid' });
    }

    // Mark as clicked (first access tracking)
    if (!link.clickedAt) {
      await this.prisma.deliveryLink.update({
        where: { id: link.id },
        data: { clickedAt: new Date() },
      });
    }

    // Return MINIMAL delivery info — NO patient name, NO condition, NO OTP
    return res.send({
      orderNumber: link.order.orderNumber,
      pickup: {
        pharmacyName: link.order.pharmacy?.name,
        pharmacyAddress: link.order.pharmacy?.address,
        pharmacyPhone: link.order.pharmacy?.contactPhone,
      },
      dropoff: {
        address: link.order.deliveryAddress,
        city: link.order.deliveryCity,
        pincode: link.order.deliveryPincode,
        patientPhone: link.order.patient?.phone, // For "Call Patient" button
      },
      instructions: 'Collect the package from the pharmacy. Deliver to the address above. The customer will share a 4-digit OTP to confirm delivery.',
    });
  }
}
```

> **⚠️ Backend Code Bug — Patient Phone Missing:**
> BACKEND-PART2A.md §11.6 `DeliveryController` explicitly excludes patient phone from the response with the comment `// NO patient phone`. However, onlyou-spec-resolved-v4.md §4.8 ("Patient phone number — tap to call"), PORTAL-ADMIN.md §14.3 ("[📞 Call Patient]" button), and PROJECT-OVERVIEW-UPDATED.md §7 ("Delivery person sees: patient phone") all confirm the delivery person needs it. The REST endpoint must include `patientPhone` in the `dropoff` object during implementation. This document shows the corrected response.

*(Source: PORTAL-ADMIN.md §14.3, BACKEND-PART2A.md §11.6, onlyou-spec-resolved-v4.md §4.8)*

---

## 8. Workflow 6: Patient OTP Confirmation

### 8.1 OTP Flow (Indian Standard Pattern)

This follows the same pattern as Swiggy, Zomato, Flipkart — the **customer holds the OTP**.

1. When delivery is arranged and order enters `OUT_FOR_DELIVERY`, system generates a 4-digit OTP
2. OTP is displayed prominently on the patient's app (delivery tracking screen)
3. OTP is also sent via push notification when delivery is ~15 minutes away
4. Delivery person arrives at patient's address
5. Delivery person's SMS link page shows: "Enter the 4-digit code from the customer"
6. Patient verbally tells the delivery person the 4-digit OTP
7. Delivery person enters OTP on their SMS link → API verifies → delivery confirmed
8. Status changes to `DELIVERED`
9. Patient sees: "Delivered ✅ — Here's how to use your medication:"
10. Usage instructions appear (medication-specific: how to take, when, with/without food, etc.)

### 8.2 Backend Processing — OTP Verification

```typescript
async confirmDelivery(orderId: string, otp: string): Promise<Order> {
  const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });

  // Validate current status
  this.assertStatus(order, 'OUT_FOR_DELIVERY', 'confirmDelivery');

  // Max 3 OTP attempts
  if (order.deliveryOtpAttempts >= 3) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Too many failed attempts. Contact coordinator.',
    });
  }

  // Verify OTP against bcrypt hash
  const isValid = await bcrypt.compare(otp, order.deliveryOtp!);

  if (!isValid) {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { deliveryOtpAttempts: { increment: 1 } },
    });
    const remaining = 2 - order.deliveryOtpAttempts;
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Incorrect OTP. ${remaining} attempt(s) remaining.`,
    });
  }

  // OTP valid → mark as delivered
  const updated = await this.prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
      deliveryOtp: null, // Clear OTP hash after successful delivery (security)
    },
  });

  // Post-delivery notifications and events
  // → Patient notification: "Delivered ✅"
  // → SSE broadcast to admin + pharmacy
  // → Audit log: 'delivery_confirmed_otp'

  return updated;
}
```

### 8.3 Edge Cases — Delivery OTP

| Scenario | What Happens |
|----------|-------------|
| Wrong OTP entered by delivery person | "Incorrect code. Please ask the customer to re-read the code." Attempt counter incremented. |
| 3 failed OTP attempts | Delivery person sees: "Having trouble? Contact coordinator." Shows admin phone number. Admin can manually mark as delivered (see Section 10). |
| Patient can't find OTP in app | OTP shown on delivery tracking screen + push notification. If still can't find: Contact Support. |
| Delivery person doesn't have data/internet | SMS link page is lightweight HTML (works on slow 2G/3G). Worst case: coordinator manually confirms. |
| Patient shares OTP with wrong person | This is a patient-side responsibility. OTP system prevents delivery person from confirming without patient's direct involvement. |

*(Source: WORKFLOW-PATIENT.md §23, APP-PATIENT.md §14.3, BACKEND-PART2A.md §11.4)*

---

## 9. Workflow 7: Delivery Failure & Rescheduling

### 9.1 When Delivery Fails

The delivery person taps **"Delivery Failed"** on the SMS link page. A reason selector appears:

| Reason Code | Display Label |
|-------------|--------------|
| `NOT_HOME` | Not home |
| `WRONG_ADDRESS` | Wrong address |
| `UNREACHABLE` | Unreachable (phone off / no answer) |
| `OTHER` | Other |

### 9.2 Failure Processing

1. Delivery person selects reason → API call with orderId + reason
2. `Order.status` → `DELIVERY_FAILED`
3. `Order.cancelledReason` stores the failure reason (reusing field; could be renamed in implementation)
4. Coordinator receives **URGENT** notification (push + WhatsApp): "❌ Delivery failed for ORD-XXXX — Reason: Not home. Reschedule delivery."
5. Patient receives notification: "Delivery attempt was unsuccessful. Our team will reschedule your delivery."
6. SSE event → admin feed
7. Audit log entry: `delivery_failed`

### 9.3 Rescheduling

The coordinator handles rescheduling from the Deliveries screen:

1. Find the failed order in the "Issues" filter tab
2. Tap "Reschedule Delivery"
3. The same Arrange Delivery modal opens (Section 6.2) — may use same or different delivery person
4. New delivery link generated, new OTP generated
5. Order status transitions: `DELIVERY_FAILED` → `OUT_FOR_DELIVERY`
6. Patient notified: "Your delivery has been rescheduled. New ETA: ~[X] minutes."

**If delivery fails repeatedly (3+ times):** Coordinator should contact the patient directly to verify address and availability, then arrange with confirmed time window.

*(Source: PORTAL-ADMIN.md §14.3, WORKFLOW-PATIENT.md §22.5)*

---

## 10. Workflow 8: Manual Delivery Override

### 10.1 When to Use

For cases where the OTP system fails: patient's phone is dead, patient is elderly and can't find the OTP, delivery person's phone can't load the page, or network issues prevent OTP verification.

### 10.2 Override Modal

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

### 10.3 Override API

```typescript
trpc.admin.delivery.manualConfirmDelivery.mutate({
  orderId: 'uuid',
  reason: 'patient_confirmed_phone',
  notes: 'Called patient, confirmed receipt of package'
})
```

**Zod validation:**
- `orderId`: UUID
- `reason`: string, min 10, max 500 chars

### 10.4 Backend Processing

1. Validate order status is `OUT_FOR_DELIVERY`
2. Update `Order.status` → `DELIVERED`
3. Set `Order.deliveredAt` = now
4. Set `Order.manualOverride` = true
5. Store `overrideReason` and `overrideNotes`
6. Audit log entry with **override flag** — clearly marked for compliance review
7. Notify patient: "Your medication has been marked as delivered."

**Important:** Manual overrides are prominently flagged in the audit trail. This ensures accountability and prevents misuse. The admin must provide a reason for every override.

*(Source: PORTAL-ADMIN.md §15)*

---

## 11. Workflow 9: Pharmacy Stock Issues & Reassignment

### 11.1 When Pharmacy Reports an Issue

Pharmacy staff can report stock issues at `SENT_TO_PHARMACY` or `PREPARING` status. Six predefined issue types:

| Issue Type | Description |
|-----------|-------------|
| `out_of_stock` | Medication completely unavailable |
| `partial_stock` | Some medications available, others not |
| `incorrect_prescription` | Prescription details seem incorrect |
| `quantity_concern` | Unusual quantity prescribed |
| `regulatory_concern` | Schedule H1 compliance issue (Phentermine) |
| `other` | Free-text description |

### 11.2 Issue Processing

1. Pharmacy taps "Stock Issue" → selects issue type, affected medications, optional notes
2. `Order.status` → `PHARMACY_ISSUE`
3. Previous status stored in `Order.issueReportedFromStatus` (for restoration if resolved)
4. Coordinator receives **URGENT** notification (push + WhatsApp): "⚠️ Stock issue at MedPlus (MG Road) for ORD-XXXX — Out of stock: Finasteride 1mg"
5. Patient receives softer notification: "Slight delay with your medication. Our team is resolving it."

### 11.3 Coordinator Resolution Options

| Resolution | Action | Result |
|-----------|--------|--------|
| **Proceed** | Issue resolved (pharmacy found stock, etc.) | Status reverts to `issueReportedFromStatus`. Pharmacy resumes. |
| **Reassign** | Move order to a different pharmacy | Status → `REASSIGNED` at original pharmacy (order disappears). New order appears at new pharmacy as `SENT_TO_PHARMACY`. |
| **Cancel** | Order cancelled entirely | Status → `CANCELLED`. Refund process triggered. |

### 11.4 Reassignment Flow

When coordinator selects "Reassign to different pharmacy":

1. Select new pharmacy from dropdown
2. API: `trpc.admin.orders.resolveIssue.mutate({ orderId, resolution: 'reassign', newPharmacyId })`
3. Original order status → `REASSIGNED` (removed from original pharmacy's portal via SSE)
4. New `Order.pharmacyId` set, status → `SENT_TO_PHARMACY`
5. New pharmacy sees order in their New tab (SSE push)
6. Patient is NOT notified of the reassignment (they see "Slight delay" only)
7. Audit log records the reassignment chain

*(Source: WORKFLOW-PHARMACY.md §8, PORTAL-ADMIN.md §13, BACKEND-PART2A.md §11.4)*

---

## 12. Workflow 10: Replacement Orders (Wrong/Damaged Medication)

### 12.1 When to Create a Replacement

- Patient reports receiving wrong medication
- Patient reports damaged medication on delivery
- Coordinator verifies the issue (may call patient)

### 12.2 Replacement Flow

1. Coordinator taps "Create Replacement" on the order card (expanded actions via "...")
2. Reason entered: "Wrong medication" or "Damaged in transit"
3. New order created linked to original (`parentOrderId`)
4. New order enters the same pharmacy pipeline: `CREATED` → assign pharmacy → prepare → deliver
5. Original order marked with replacement metadata
6. Patient notified: "A replacement order has been created. We'll deliver the correct medication as soon as possible."
7. Full refund + replacement automatically applied (100% refund + new order at no additional cost)

*(Source: PORTAL-ADMIN.md §11.2, WORKFLOW-PATIENT-CHANGES.md)*

---

## 13. Auto-Reorder on Subscription Renewal

### 13.1 Trigger Mechanism

**Monthly and Quarterly plans (Razorpay recurring subscription):**

When Razorpay charges the patient on their renewal date, the webhook handler triggers auto-reorder:

```
Razorpay webhook: subscription.charged
  → PaymentService.handleSubscriptionCharged()
    → AutoReorderService.handleRenewal({ subscriptionId, patientId, condition })
```

**6-Month plans (one-time payment — NOT a Razorpay subscription):**

Since 6-month plans are charged as a one-time upfront payment, auto-reorder is triggered by BullMQ scheduled jobs at 30-day intervals:

- Day 30, 60, 90, 120, 150: BullMQ fires → create reorder if subscription is active and not paused
- Day 150 (Month 5): Also sends renewal reminder notification
- Day 165: Second renewal reminder
- Day 175: Final renewal reminder (push + WhatsApp)
- Day 180: If not renewed → subscription status → `EXPIRED`. No auto-reorder.

### 13.2 Auto-Reorder Service Logic

```typescript
@OnEvent('subscription.renewed')
async handleRenewal(payload: SubscriptionRenewedEvent): Promise<void> {
  const { subscriptionId, patientId, condition } = payload;

  const subscription = await this.prisma.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: { patient: true },
  });

  // Check if auto-reorder should be paused
  if (subscription.autoReorderPaused) {
    return; // Doctor paused treatment or check-in overdue
  }

  // Find the most recent active prescription for this condition
  const latestPrescription = await this.prisma.prescription.findFirst({
    where: { patientId, condition, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestPrescription) return; // No active prescription

  // Create new order based on latest prescription
  await this.ordersService.createOrder({
    patientId,
    prescriptionId: latestPrescription.id,
    subscriptionId,
    medications: latestPrescription.medications,
    condition,
    isAutoReorder: true,
    parentOrderId: previousOrderId, // Most recent order for this subscription
  });
}
```

### 13.3 Auto-Reorder Pause Conditions

Auto-reorder is **paused** when:

- Subscription is paused by patient
- Doctor has paused treatment (awaiting lab results, dosage change pending)
- Follow-up check-in is overdue and doctor flagged "must check-in before next reorder"
- Payment failed and subscription is `HALTED`

### 13.4 Admin Auto-Reorder Management

The Deliveries screen has a section "Upcoming Auto-Reorders" showing:

```
┌────────────────────────────────────────────────────┐
│ Rahul Mehta — Hair Loss Monthly                    │
│ Renewal: 5 Mar 2026 — ₹999                        │
│ Medications: Finasteride 1mg, Minoxidil 5%         │
│ [Pause Reorder] [Process Now]                      │
└────────────────────────────────────────────────────┘
```

**Admin actions:**
- **"Pause Reorder"** → manually pause for a specific patient (with reason)
- **"Process Now"** → manually trigger reorder ahead of schedule (creates new order immediately)
- **"Resume"** → resume paused auto-reorder (only if not blocked by doctor or system)

### 13.5 Refill Quantities by Vertical

All verticals auto-refill every 30 days regardless of plan duration:

| Vertical | Medications | Monthly Refill |
|----------|------------|----------------|
| Hair Loss | Finasteride 1mg, Minoxidil 5%, Biotin | 30 tablets, 1 bottle, 30 capsules |
| ED (on-demand) | Tadalafil/Sildenafil | 4–8 tablets (per prescription) |
| ED (daily) | Tadalafil 5mg | 30 tablets |
| PE (on-demand) | Dapoxetine | 8 tablets |
| PE (daily SSRI) | Paroxetine/Fluoxetine | 30 tablets |
| Weight (Standard) | Orlistat/Metformin/Phentermine | 30-day supply per medication |
| PCOS | Metformin/Spironolactone/OCP | 30-day supply per medication |

*(Source: APP-PATIENT.md §15.2, PORTAL-ADMIN.md §16, BACKEND-PART2A.md §11.7, VERTICAL-HAIR-LOSS.md §10.4)*

---

## 14. Cold Chain & Controlled Substance Delivery

### 14.1 Cold Chain Requirements (GLP-1 Premium — Phase 2)

| Medication | Storage | Packaging | Delivery Window |
|-----------|---------|-----------|-----------------|
| Semaglutide (Ozempic/Wegovy) | 2–8°C refrigerated | Insulated bag + gel ice packs + temperature indicator strip | Same-day or next-day only |
| Liraglutide (Victoza/Saxenda) | 2–8°C refrigerated | Insulated bag + gel ice packs + temperature indicator strip | Same-day or next-day only |

**Cold chain delivery rules:**
- Hand package directly to cold-chain courier — do NOT leave unattended
- Standard courier is NOT acceptable for cold-chain items
- Temperature indicator strip must be included for patient verification
- Patient instruction leaflet included: "Store in refrigerator. Do not freeze. Use within 28 days of first use (can be stored at room temperature below 30°C for up to 28 days)."
- If temperature breach detected during delivery → pharmacy must re-ship with new pen. Patient advised not to use temperature-compromised medication.

### 14.2 Schedule H1 Controlled Substance — Phentermine

Phentermine is a Schedule H1 controlled substance in India. Special handling:

- Prescription must include special endorsement from prescribing doctor
- Pharmacy portal flags Schedule H1 restriction
- Pharmacist must verify state regulations before shipping
- May require patient to collect in person (state-dependent)
- Short-term use only (12 weeks max) — auto-reorder system must respect this limit

*(Source: VERTICAL-WEIGHT.md §13.4–§13.5, WORKFLOW-PHARMACY.md §18)*

---

## 15. Discreet Packaging & Privacy

### 15.1 Packaging Rules

All medication deliveries across all verticals follow the same discreet packaging standard:

- **Plain Onlyou-branded box** — no other text visible externally
- **No condition name** on any external surface
- **No medication names** on any external surface
- **No pharmacy name** on the packaging (only inside)
- Package is **indistinguishable** from any other Onlyou delivery (a Hair Loss package looks identical to an ED package)
- Order ID (ORD-XXXX) on the exterior for identification by delivery person and pharmacy

### 15.2 ED/PE-Specific Privacy Emphasis

Given the heightened stigma surrounding erectile dysfunction and premature ejaculation in India, packaging discretion is even more critical for these verticals. The package must be completely indistinguishable from any other health/wellness delivery. "Generic Health & Wellness" appears on any visible label if a category is legally required.

### 15.3 Patient Notification (First Delivery)

Before the first delivery, patient receives a reassurance notification:

> "Your medication will arrive in a plain Onlyou-branded box. No condition name or medication details are visible on the outside."

### 15.4 Delivery Person Privacy

The delivery person never sees:
- Patient name (they see delivery address only)
- Condition or diagnosis
- Medication names or types
- Any clinical data

Anonymous patient IDs (ONY-P-XXXX) are used across the entire delivery chain. The pharmacy, delivery person, and any logistics intermediary never receive the patient's real identity or condition.

*(Source: PROJECT-OVERVIEW.md §7, VERTICAL-ED.md §10.4, VERTICAL-PE.md §10.4, VERTICAL-HAIR-LOSS.md §10.3)*

---

## 16. Patient Delivery Tracking Experience

### 16.1 Tracking Screen

**Screen:** `(tabs)/activity/[orderId].tsx` (when order type = delivery)

Full vertical stepper showing all delivery statuses with timestamps:

| Status (canonical) | Patient Display | Patient Actions |
|--------------------|----------------|-----------------|
| `CREATED` | "Prescription ready" | View prescription PDF |
| `SENT_TO_PHARMACY` | "Sent to pharmacy" | Wait |
| `PREPARING` | "Pharmacy is preparing" | Wait |
| `READY` | "Ready for pickup by delivery" | Wait |
| `OUT_FOR_DELIVERY` | "On its way!" + delivery person name/phone/ETA | Call delivery person, view delivery OTP |
| `DELIVERED` | "Delivered ✅" | Rate experience, view usage instructions |
| `DELIVERY_FAILED` | "Delivery attempt failed" | Reschedule delivery (via support) |
| `PHARMACY_ISSUE` | "Medication temporarily unavailable" | Contact support |
| `CANCELLED` | "Order cancelled" | View refund status |

### 16.2 Stepper Visual

```
┌─────────────────────────────────────┐
│  📦 Treatment Kit — Hair Loss         │
│  Finasteride 1mg, Minoxidil 5%      │
│                                      │
│  ✅ Prescription Created (1 Feb)      │
│  ✅ Sent to Pharmacy (1 Feb)          │
│  ✅ Pharmacy Preparing (2 Feb)        │
│  🔵 Ready for Pickup                  │
│  ⚪ Out for Delivery                  │
│  ⚪ Delivered                          │
│                                      │
│  Pharmacy: MedPlus, Banjara Hills   │
│  [Track] [Contact Support]          │
└─────────────────────────────────────┘
```

Each completed status shows ✅ with date/time. Current status shows 🔵 with descriptive text. Future statuses show ⚪.

### 16.3 Out for Delivery — Enhanced View

When status = `OUT_FOR_DELIVERY`, additional delivery person card appears:

```
Delivery by: Ravi K.
Phone: +91 98765 43210 [📞 Call]
Method: Rapido
ETA: ~30 minutes

Your delivery OTP:  [ 4 7 2 1 ]
Share this code with the delivery person when they arrive.
```

- Tap phone number → opens dialer
- ETA updates manually by coordinator (not GPS-based in MVP)
- Delivery OTP displayed prominently

*(Source: APP-PATIENT.md §14, WORKFLOW-PATIENT.md §22–§23)*

---

## 17. Post-Delivery Experience

### 17.1 Immediately After Delivery

1. Status updates to `DELIVERED` with timestamp
2. Patient sees: "Delivered ✅ — Here's how to use your medication:"
3. **Medication usage instructions** appear — specific to the prescribed medications:
   - How to take (oral, topical, subcutaneous)
   - When to take (morning, evening, with meals, before bed)
   - With or without food
   - Storage instructions
   - Common side effects to watch for
4. Patient can rate the delivery experience

### 17.2 Medication Reminders Begin

Once delivered, the medication reminder system activates:

1. **Morning:** Push notification (if enabled): "Time for your morning medications"
2. Patient opens app → Home tab → Medication Reminders section shows today's medications
3. Patient taps checkbox next to each medication as taken → ✅ with timestamp
4. Long-press option: "Taken" / "Skipped" / "Remind in 1 hour"
5. If "Skipped" → brief modal: "Why? (Side effect / Forgot / Other)" — logged for doctor review
6. **Evening:** Repeat for evening medications
7. **End of day:** Any unchecked medications remain for the next day as "Missed yesterday"

### 17.3 Treatment Active State

- Patient can message doctor anytime via Messages tab
- Quick-reply chips available for common questions
- Patient can upload new progress photos to share with doctor
- Treatment card shows "Day [X]" count since first prescription
- Next auto-reorder date shown on Home tab

*(Source: WORKFLOW-PATIENT.md §24)*

---

## 18. Backend Service Integration

### 18.1 Order Service — Key Methods

The Order Service (`OrdersService` — NestJS module) handles all delivery-related business logic:

| Method | Trigger | Status Transition |
|--------|---------|-------------------|
| `createOrder()` | Payment confirmed / auto-reorder / manual reorder | → `CREATED` |
| `sendToPharmacy(orderId, pharmacyId)` | Admin action | `CREATED` → `SENT_TO_PHARMACY` |
| `startPreparing(orderId, pharmacyId)` | Pharmacy action | `SENT_TO_PHARMACY` → `PREPARING` |
| `markReady(orderId, pharmacyId)` | Pharmacy action | `PREPARING` → `READY` |
| `arrangeDelivery(orderId, input)` | Admin action | `READY` → `OUT_FOR_DELIVERY` |
| `confirmDelivery(orderId, otp)` | Delivery person (via SMS link) | `OUT_FOR_DELIVERY` → `DELIVERED` |
| `manualConfirmDelivery(orderId, reason)` | Admin override | `OUT_FOR_DELIVERY` → `DELIVERED` |
| `markDeliveryFailed(orderId, reason)` | Delivery person (via SMS link) | `OUT_FOR_DELIVERY` → `DELIVERY_FAILED` |
| `reportIssue(orderId, pharmacyId, issueType, ...)` | Pharmacy action | `SENT_TO_PHARMACY`/`PREPARING` → `PHARMACY_ISSUE` |
| `resolveIssue(orderId, resolution, ...)` | Admin action | `PHARMACY_ISSUE` → proceed/reassign/cancel |
| `cancelOrder(orderId, reason)` | Admin action | `CREATED`/`SENT_TO_PHARMACY`/`PREPARING`/`READY`/`PHARMACY_ISSUE` → `CANCELLED` |

### 18.2 Event Flow

Every status transition emits events via EventEmitter2:

```
Order status change
  │
  ├── 'order.status_changed' → SSE broadcast (admin + pharmacy + patient)
  ├── 'notification.send' → Push/WhatsApp/SMS to relevant parties
  ├── 'sla.schedule' → BullMQ SLA timer for next expected action
  └── 'audit.log' → Immutable audit trail entry
```

*(Source: BACKEND-PART2A.md §11)*

---

## 19. Database Schema — Delivery-Relevant Models

### 19.1 Order Model

```prisma
model Order {
  id                    String        @id @default(uuid())
  orderNumber           String        @unique // ORD-0001, ORD-0002, etc.

  // Relations
  patientId             String
  patient               Patient       @relation(fields: [patientId], references: [id])
  prescriptionId        String
  prescription          Prescription  @relation(fields: [prescriptionId], references: [id])
  subscriptionId        String?
  subscription          Subscription? @relation(fields: [subscriptionId], references: [id])

  // Pharmacy
  pharmacyId            String?
  pharmacy              Pharmacy?     @relation(fields: [pharmacyId], references: [id])
  pharmacyStaffId       String?

  // Medications (denormalized snapshot from prescription)
  medications           Json          // Array<{ drug, dosage, frequency, duration, quantity }>
  condition             Condition

  // Status
  status                OrderStatus   @default(CREATED)
  issueType             String?
  issueDetails          String?
  issueMedications      String[]
  issueReportedFromStatus OrderStatus?

  // Delivery
  deliveryAddress       String
  deliveryCity          String
  deliveryPincode       String
  deliveryPersonName    String?
  deliveryPersonPhone   String?
  deliveryMethod        DeliveryMethod?
  deliveryOtp           String?       // bcrypt-hashed 4-digit OTP
  deliveryOtpAttempts   Int           @default(0)
  deliveryLinkToken     String?       @unique // SHA-256 hashed token
  estimatedDeliveryMinutes Int?

  // Manual override
  manualOverride        Boolean       @default(false)
  overrideReason        String?
  overrideNotes         String?
  // ⚠️ SCHEMA GAP: These 3 fields are referenced in PORTAL-ADMIN.md §15.2
  // and PORTAL-PHARMACY.md §5 but are NOT present in BACKEND-PART2A.md §11.2.
  // The current backend stores override info only in the audit log.
  // These fields must be added to the Prisma schema during implementation.

  // Auto-reorder tracking
  isAutoReorder         Boolean       @default(false)
  parentOrderId         String?
  parentOrder           Order?        @relation("OrderReorder", fields: [parentOrderId], references: [id])
  childOrders           Order[]       @relation("OrderReorder")

  // Timestamps
  sentToPharmacyAt      DateTime?
  preparingStartedAt    DateTime?
  readyAt               DateTime?
  pickedUpAt            DateTime?
  outForDeliveryAt      DateTime?
  deliveredAt           DateTime?
  cancelledAt           DateTime?
  cancelledReason       String?

  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  deliveryLink          DeliveryLink?

  @@index([patientId])
  @@index([pharmacyId])
  @@index([status])
  @@index([orderNumber])
}
```

### 19.2 DeliveryLink Model

```prisma
model DeliveryLink {
  id          String   @id @default(uuid())
  orderId     String   @unique
  order       Order    @relation(fields: [orderId], references: [id])
  token       String   @unique // SHA-256 hash of the SMS link token
  expiresAt   DateTime          // 24-hour expiry from creation
  clickedAt   DateTime?         // First access timestamp
  createdAt   DateTime @default(now())
}
```

*(Source: BACKEND-PART2A.md §11.2)*

---

## 20. tRPC & REST API Reference

### 20.1 tRPC Routes — Admin Delivery

```typescript
// Admin-only delivery management
trpc.admin.orders.sendToPharmacy.mutate({ orderId, pharmacyId })
trpc.admin.orders.resolveIssue.mutate({ orderId, resolution, newPharmacyId?, adminNotes? })
trpc.admin.orders.cancelOrder.mutate({ orderId, reason })
trpc.admin.delivery.arrangeDelivery.mutate({ orderId, deliveryPersonName, deliveryPersonPhone, deliveryMethod, estimatedMinutes })
trpc.admin.delivery.manualConfirmDelivery.mutate({ orderId, reason, notes? })
trpc.admin.orders.listAll.query({ status?, page?, pageSize?, pharmacyId?, patientId? })
```

### 20.2 tRPC Routes — Pharmacy

```typescript
// Pharmacy staff actions
trpc.pharmacy.order.startPreparing.mutate({ orderId })
trpc.pharmacy.order.markReady.mutate({ orderId })
trpc.pharmacy.order.reportIssue.mutate({ orderId, issueType, issueMedications, notes? })
trpc.pharmacy.order.list.query({ status? })
```

### 20.3 REST Endpoints — Delivery Person (No Auth)

```
GET  /api/delivery/:token       → Delivery page data (pickup/dropoff info)
POST /api/delivery/:token/pickup → Confirm pickup from pharmacy
POST /api/delivery/:token/confirm → Submit OTP for delivery confirmation
POST /api/delivery/:token/failed  → Mark delivery as failed (with reason)
```

**Security:** Token-based access (no JWT, no login). Token is SHA-256 hashed, one-time use, 24-hour expiry. The raw token in the URL is the only authentication. Link becomes invalid after successful delivery confirmation.

### 20.4 Zod Schemas

```typescript
export const ArrangeDeliveryInput = z.object({
  orderId: z.string().uuid(),
  deliveryPersonName: z.string().min(2).max(100),
  deliveryPersonPhone: z.string().regex(/^\+91\d{10}$/),
  deliveryMethod: z.enum(['RAPIDO', 'DUNZO', 'OWN', 'OTHER']),
  estimatedMinutes: z.number().int().min(5).max(480),
});

export const ConfirmDeliveryInput = z.object({
  orderId: z.string().uuid(),
  otp: z.string().length(4).regex(/^\d{4}$/),
});

export const MarkDeliveredManualInput = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(10).max(500),
});

export const ReportIssueInput = z.object({
  orderId: z.string().uuid(),
  issueType: z.enum([
    'out_of_stock', 'partial_stock', 'incorrect_prescription',
    'quantity_concern', 'regulatory_concern', 'other',
  ]),
  issueMedications: z.array(z.string()).min(1),
  notes: z.string().max(500).optional(),
});

export const ResolveIssueInput = z.object({
  orderId: z.string().uuid(),
  resolution: z.enum(['proceed', 'reassign', 'cancel']),
  newPharmacyId: z.string().uuid().optional(),
  adminNotes: z.string().max(500).optional(),
});
```

*(Source: BACKEND-PART2A.md §11.3, §11.6)*

---

## 21. Real-Time System (SSE + Redis Pub/Sub)

### 21.1 SSE Events — Delivery-Related

| Event | Channel | Trigger | Recipients |
|-------|---------|---------|------------|
| `order.status_changed` | `admin` | Any order status change | All admin portal users |
| `order.status_changed` | `pharmacy:{pharmacyId}` | Status changes relevant to pharmacy | Pharmacy staff at that pharmacy |
| `order.status_changed` | `patient:{patientId}` | Status changes relevant to patient | Patient's mobile app |
| `order.issue_reported` | `admin` | Pharmacy reports stock issue | Coordinator (urgent) |
| `order.delivery_arranged` | `pharmacy:{pharmacyId}` | Admin arranges delivery | Pharmacy (shows delivery person name) |
| `order.picked_up` | `admin`, `pharmacy:{pharmacyId}`, `patient:{patientId}` | Delivery person confirms pickup | All parties |
| `order.delivered` | `admin`, `pharmacy:{pharmacyId}`, `patient:{patientId}` | OTP confirmed or manual override | All parties |

### 21.2 SSE Connection Architecture

```
Admin Portal ──SSE──→ /api/sse?channel=admin
                        ↑
                   Redis Pub/Sub
                        ↑
Pharmacy Portal ──SSE──→ /api/sse?channel=pharmacy:{pharmacyId}
                        ↑
Patient App ──SSE──→ /api/sse?channel=patient:{patientId}
```

All order status changes are broadcast via Redis Pub/Sub to the appropriate channels. Portals subscribe on mount and update UI reactively.

*(Source: BACKEND-PART2A.md §15, WORKFLOW-PHARMACY.md §12)*

---

## 22. Notification Matrix — All Delivery Events

### 22.1 Notification Templates

| Event | Recipient | Channels | Normal Template | Discreet Template |
|-------|-----------|----------|----------------|-------------------|
| Order created | Coordinator | SSE + Push | "New order ORD-XXXX — [Condition] — needs pharmacy assignment" | Same (admin-only) |
| Sent to pharmacy | Pharmacy | Push + WhatsApp | "New prescription received — [Medication list]. Please prepare." | Same (pharmacy-only) |
| Sent to pharmacy | Patient | Push | "Your prescription has been sent to the pharmacy" | "Health update available" |
| Pharmacy preparing | Patient | Push | "Your pharmacy is preparing your medication" | "Order update" |
| Ready for pickup | Coordinator | SSE + Push | "Order ORD-XXXX ready at [Pharmacy]. Arrange delivery." | Same (admin-only) |
| Ready for pickup | Patient | Push + WhatsApp | "Your medication is ready and will be delivered soon" | "Your order will be shipped soon" |
| Out for delivery | Patient | Push + WhatsApp | "Your medication is on its way! Delivery person: [Name]. Your OTP: [XXXX]" | "Your package is on its way. Open the app for your delivery code." |
| Delivered | Patient | Push | "Delivered ✅ — Here's how to use your medication" | "Delivery complete" |
| Delivery failed | Coordinator | Push + WhatsApp (URGENT) | "❌ Delivery failed — ORD-XXXX — Reason: [reason]. Reschedule." | Same (admin-only) |
| Delivery failed | Patient | Push | "Delivery attempt was unsuccessful. We'll reschedule." | "Delivery update" |
| Pharmacy issue | Coordinator | Push + WhatsApp (URGENT) | "⚠️ Stock issue — [Pharmacy] — ORD-XXXX — [Issue type]" | Same (admin-only) |
| Pharmacy issue | Patient | Push | "Slight delay with your medication. Our team is resolving it." | "Order update" |

### 22.2 Discreet Mode

When patient has `discreetMode = true`, all notifications use the discreet template — generic, wellness-focused language with no mention of conditions, medications, or medical terminology. Patient must open the app to see actual details.

*(Source: BACKEND-PART2A.md §15.5)*

---

## 23. SLA Thresholds & BullMQ Escalation Engine

### 23.1 Delivery-Specific SLA Rules

| SLA Rule | Default Threshold | Backend Constant | Escalation Action |
|----------|-------------------|-----------------|-------------------|
| Pharmacy assignment after prescription | 4 hours after `CREATED` | *(no constant — see note)* | Admin self-alert: "Assign pharmacy to ORD-XXXX" |
| Pharmacy starts preparation | 2 hours after `SENT_TO_PHARMACY` | `PHARMACY_START_HOURS: 2` | Admin alert: "Pharmacy hasn't started ORD-XXXX — sent 2+ hours ago" |
| Pharmacy completes preparation | 4 hours after `PREPARING` | `PHARMACY_FINISH_HOURS: 4` | Admin alert: "ORD-XXXX preparing for 4+ hours at [pharmacy]" |
| Delivery arranged after ready | 4 hours after `READY` | `DELIVERY_ARRANGEMENT_HOURS: 4` | Admin alert: "ORD-XXXX ready for 4+ hours — arrange delivery" |
| Delivery completed after dispatch | 24 hours after `OUT_FOR_DELIVERY` | `DELIVERY_COMPLETION_HOURS: 24` | Admin alert: "ORD-XXXX out for delivery 24+ hours — contact delivery person" |
| End-to-end (prescription to delivery) | 48 hours | *(composite)* | Admin dashboard — red indicator |

> **⚠️ Cross-Document SLA Discrepancy (Existing):**
> Multiple source documents show conflicting SLA values. BACKEND-PART2B.md §18.3 (`SLA_DEFAULTS`) is the SLA engine source of truth — values in this table follow the backend code. Known conflicts that need correction in other docs:
> - **PORTAL-ADMIN.md §30** shows "Pharmacy preparation: 24 hours after sent" — should be split into "start: 2 hours" + "finish: 4 hours". Also shows "Delivery arrangement: 2 hours" — should be "4 hours".
> - **WORKFLOW-PHARMACY.md §14.2** shows "Admin sends to pharmacy: 24 hours" — conflicts with PORTAL-ADMIN.md §30's "4 hours". No backend constant exists for pharmacy assignment SLA; one must be added to `SLA_DEFAULTS`.
> - **PORTAL-PHARMACY.md §22** and **WORKFLOW-PHARMACY.md §14.2** show "Delivery completed: 2 hours after pickup" — should be "24 hours" per BACKEND-PART2B.md. WORKFLOW-PHARMACY.md §21.3 already documents this discrepancy and declares BACKEND-PART2B as authoritative.

### 23.2 BullMQ SLA Check Job

```
Job: sla-check
Schedule: Every 15 minutes (repeatable)
Priority: High
Actions:
  1. Query all Orders with status in [CREATED, SENT_TO_PHARMACY, PREPARING, READY, OUT_FOR_DELIVERY]
  2. For each, check if time since last status change exceeds threshold
  3. If breached → create SystemEvent with severity CRITICAL
  4. Send notification to coordinator (all channels)
  5. If already notified once within 24h → escalate (higher urgency)
  6. Update breach counter
```

### 23.3 SLA Configuration (Admin-Editable)

All SLA thresholds are editable by the admin via Settings > SLA Configuration. Changes take effect on the next SLA check cycle (every 15 minutes). Changes are logged in the audit trail.

*(Source: WORKFLOW-PHARMACY.md §22, PORTAL-ADMIN.md §30, BACKEND-PART2B.md §18)*

---

## 24. Cross-Portal Synchronization Matrix

### 24.1 Delivery Event → Portal Updates

| Delivery Event | Admin Portal | Pharmacy Portal | Patient App | Delivery Person |
|---------------|-------------|-----------------|-------------|-----------------|
| Order created | New order in Deliveries tab | — | — | — |
| Sent to pharmacy | Card moves to "At Pharmacy" | New order appears in New tab | Stepper: "Sent to pharmacy" | — |
| Pharmacy starts preparing | Status badge: PREPARING | Card moves to Preparing tab | Stepper: "Pharmacy preparing" | — |
| Pharmacy marks ready | "Arrange Delivery" enabled | Card moves to Ready tab | Stepper: "Ready for pickup" | — |
| Delivery arranged | Status: OUT_FOR_DELIVERY | Delivery person name shown | Stepper: "On its way!" + OTP + delivery person info | Receives SMS link |
| Pickup confirmed | Status update | Card moves to "Picked Up" section | — | — |
| OTP confirmed (delivered) | Status: DELIVERED | Card shows ✅ Delivered | Stepper: "Delivered ✅" + usage instructions | "Delivery Confirmed ✅" |
| Delivery failed | Status: DELIVERY_FAILED, Issues tab | — | Stepper: "Delivery failed" | — |
| Pharmacy issue reported | Issue banner, URGENT alert | Issue banner on order card | "Slight delay" notification | — |
| Admin cancels order | Status: CANCELLED | Order removed from portal | "Order cancelled" + refund status | Link invalidated |
| Admin reassigns pharmacy | Status: REASSIGNED → SENT_TO_PHARMACY at new | Order removed (SSE + toast) | — (no notification of reassignment) | — |

*(Source: PORTAL-PHARMACY.md §20, PORTAL-ADMIN.md §11–§15, APP-PATIENT.md §14)*

---

## 25. Refund Scenarios — Delivery-Related

### 25.1 Refund Table

| Scenario | Refund Amount | Refund To | Notes |
|----------|-------------|-----------|-------|
| Patient doesn't proceed after treatment plan | N/A | N/A | No payment was collected (pay-after-doctor model) |
| Cancellation (after payment, before pharmacy dispatches) | 100% | Wallet | Patient paid but medication hasn't shipped |
| Cancellation (medication already dispatched / out for delivery) | 0% | — | Delivery completes normally |
| Delivery failed (platform fault) | 100% | Wallet or original payment method | |
| Wrong medication delivered | 100% + replacement order | Wallet + new order | |
| Damaged medication delivered | 100% + replacement order | Wallet + new order | |
| Subscription cancelled mid-cycle | Prorated remaining days | Wallet | |

### 25.2 Refund Experience (Patient)

1. Refund initiated (by admin or system)
2. Wallet shows: "+₹X — Refund for [reason]" (pending)
3. Wallet credits: instant. Original payment method refunds: 5–7 business days.
4. Push notification: "₹X has been credited to your Onlyou wallet."

*(Source: WORKFLOW-PATIENT-CHANGES.md, WORKFLOW-PATIENT.md §30)*

---

## 26. Edge Cases & Error States

### 26.1 Delivery-Specific Edge Cases

| Scenario | What Happens |
|----------|-------------|
| Pharmacy doesn't have a medication in stock | Status: `PHARMACY_ISSUE`. Patient sees: "Medication temporarily unavailable." Admin resolves — reassign or contact doctor for substitute. |
| Delivery person can't reach patient's address | Delivery person calls patient. If unreachable after 15 min → marks `DELIVERY_FAILED`. Admin reschedules. |
| Patient not home at delivery time | Delivery person marks as failed → admin reschedules. |
| Weather delays delivery | ETA updated manually by coordinator. Patient sees updated ETA. |
| Multiple medications from different pharmacies | MVP: single pharmacy per order. All medications in one package. |
| Patient wants to change delivery address mid-transit | Not possible once `OUT_FOR_DELIVERY`. Must fail and reschedule. Can change address for future deliveries via Address Book. |
| Delivery link expired (24 hours) | Delivery person sees "Link expired or invalid." Coordinator must generate new delivery link. |
| Delivery person's phone has no internet | SMS link is lightweight HTML (works on slow 2G/3G connections). Worst case: coordinator manually confirms delivery via phone call + manual override. |
| Patient runs out of medication before next auto-reorder | Patient taps "Reorder" on Home tab → new delivery order created immediately. |
| Auto-reorder fires but prescription was recently changed by doctor | Auto-reorder always uses the most recent ACTIVE prescription. If doctor changed prescription, the new medications are used. |
| GLP-1 injection pen temperature breach during delivery | Cold-chain tracking shows temperature excursion. Pharmacy must re-ship new pen. Patient advised not to use compromised medication. |
| Phentermine (Schedule H1) delivery restricted in certain states | Pharmacy portal flags restriction. Pharmacist verifies state regulations. May require patient in-person collection. |
| Patient cancels subscription while delivery is in transit | Delivery completes normally. No refund for dispatched medication. |

### 26.2 Concurrent Access

- Multiple admin users can view the Deliveries screen simultaneously (SSE keeps all in sync)
- Only one admin can act on a given order at a time (server validates current status before transition)
- Pharmacy staff at the same pharmacy all see the same orders (scoped by `pharmacyId`)

*(Source: WORKFLOW-PATIENT.md §22.5, VERTICAL-WEIGHT.md §20.2)*

---

## 27. Audit Logging & DPDPA Compliance

### 27.1 Audit Events — Delivery

Every delivery action creates an immutable audit log entry:

| Action | Logged Data |
|--------|------------|
| `order_created` | orderId, patientId, prescriptionId, isAutoReorder |
| `order_sent_to_pharmacy` | orderId, pharmacyId, adminId |
| `pharmacy_started_preparing` | orderId, pharmacyStaffId |
| `pharmacy_marked_ready` | orderId, pharmacyStaffId |
| `pharmacy_reported_issue` | orderId, issueType, issueMedications |
| `DELIVERY_ARRANGED` | orderId, deliveryPersonName, deliveryMethod, adminId |
| `delivery_pickup_confirmed` | orderId, timestamp |
| `delivery_confirmed_otp` | orderId, timestamp |
| `delivery_manual_override` | orderId, adminId, reason, notes, **override flag** |
| `delivery_failed` | orderId, failureReason |
| `order_reassigned` | orderId, fromPharmacyId, toPharmacyId, adminId |
| `order_cancelled` | orderId, reason, adminId |

### 27.2 DPDPA Compliance Notes

- Patient delivery addresses are stored with encryption at rest (AWS KMS)
- Delivery person receives only the minimum data needed: package ID, pickup address, dropoff address, patient phone
- Delivery link tokens are SHA-256 hashed in the database (raw token only in the SMS)
- Delivery OTP is bcrypt-hashed in the database (raw OTP only shown in patient's app)
- Audit logs are append-only and retained per DPDPA data retention requirements
- On account deletion: delivery address data is purged, order records are anonymized (patient reference removed), audit logs retained for legal compliance period

*(Source: BACKEND-PART2A.md §11, PORTAL-ADMIN.md §15)*

---

## 28. Testing Checklist

### 28.1 Order Creation & Pharmacy Assignment

- [ ] Order created on payment confirmation (pay-after-doctor model)
- [ ] Order appears in admin Deliveries tab under "New (needs pharmacy)"
- [ ] Admin can send order to selected pharmacy
- [ ] Pharmacy portal shows new order via SSE push
- [ ] Patient stepper updates to "Sent to pharmacy"

### 28.2 Pharmacy Fulfillment

- [ ] Pharmacy can start preparing (SENT_TO_PHARMACY → PREPARING)
- [ ] Pharmacy can mark ready (PREPARING → READY)
- [ ] Cannot skip PREPARING step (direct SENT_TO_PHARMACY → READY rejected)
- [ ] Pharmacy can report stock issue at SENT_TO_PHARMACY or PREPARING
- [ ] Admin receives URGENT notification on stock issue

### 28.3 Delivery Arrangement

- [ ] "Arrange Delivery" button only enabled when status = READY
- [ ] Delivery setup modal validates all fields (name, phone format, method, ETA range)
- [ ] SMS sent to delivery person with correct link
- [ ] Delivery OTP generated and displayed on patient's app
- [ ] Patient notification received (push + WhatsApp)
- [ ] Order status transitions to OUT_FOR_DELIVERY

### 28.4 Delivery Person SMS Link

- [ ] Link opens on mobile browser (lightweight page)
- [ ] Expired/invalid link shows 404 error
- [ ] "Navigate" buttons open Google Maps with correct addresses
- [ ] "Call" buttons open phone dialer
- [ ] "Confirm Pickup" marks order as picked up
- [ ] OTP entry accepts 4 digits only
- [ ] Valid OTP → "Delivery Confirmed ✅"
- [ ] Invalid OTP → error message with remaining attempts
- [ ] 3 failed attempts → "Contact coordinator" message
- [ ] "Delivery Failed" → reason selector → admin notified

### 28.5 Patient OTP & Tracking

- [ ] OTP visible on patient tracking screen when OUT_FOR_DELIVERY
- [ ] OTP push notification sent
- [ ] Delivery person info card shows (name, phone, method, ETA)
- [ ] Tap phone → opens dialer
- [ ] Post-delivery: usage instructions appear
- [ ] All stepper states render correctly with timestamps

### 28.6 Edge Cases & Overrides

- [ ] Manual delivery override works with required reason
- [ ] Override flagged in audit trail
- [ ] Delivery failure → rescheduling generates new link + OTP
- [ ] Pharmacy reassignment removes order from original, adds to new
- [ ] Order cancellation at any pre-delivery status works correctly
- [ ] Cancelled order triggers refund flow

### 28.7 Auto-Reorder

- [ ] Auto-reorder triggers on monthly subscription renewal
- [ ] Auto-reorder uses most recent active prescription
- [ ] Paused subscription skips auto-reorder
- [ ] Admin can pause/resume auto-reorder per patient
- [ ] Admin can "Process Now" to trigger early reorder
- [ ] 6-month plan auto-reorder fires at 30-day intervals

### 28.8 SLA Enforcement

- [ ] SLA check runs every 15 minutes
- [ ] Overdue pharmacy assignment triggers alert (4h)
- [ ] Overdue pharmacy preparation triggers alert (2h after sent)
- [ ] Overdue delivery arrangement triggers alert (4h after ready)
- [ ] Overdue delivery completion triggers alert (2h after pickup)
- [ ] End-to-end 48h SLA shows red indicator on admin dashboard

*(Source: BACKEND-PART3B.md §33)*

---

## 29. Cross-Reference Index

| Topic | Primary Source | Related Sources |
|-------|---------------|-----------------|
| Order status enum | BACKEND-PART2A.md §11.2 | PORTAL-PHARMACY.md §21, PORTAL-ADMIN.md §11.3 |
| Arrange delivery API | BACKEND-PART2A.md §11.4 | PORTAL-ADMIN.md §14.2 |
| Delivery link REST endpoint | BACKEND-PART2A.md §11.6 | PORTAL-ADMIN.md §14.3, onlyou-spec-resolved-v4.md §4.8 |
| OTP confirmation logic | BACKEND-PART2A.md §11.4 | WORKFLOW-PATIENT.md §23, APP-PATIENT.md §14.3 |
| Manual override | PORTAL-ADMIN.md §15 | BACKEND-PART2A.md §11.4 |
| Auto-reorder service | BACKEND-PART2A.md §11.7 | APP-PATIENT.md §15.2, PORTAL-ADMIN.md §16 |
| Pharmacy fulfillment workflow | WORKFLOW-PHARMACY.md §4–§7 | PORTAL-PHARMACY.md §7–§9 |
| Patient delivery tracking | APP-PATIENT.md §14 | WORKFLOW-PATIENT.md §22–§23 |
| Delivery status flow (patient view) | WORKFLOW-PATIENT.md §22.2 | APP-PATIENT.md §6.1 |
| Cold chain handling | VERTICAL-WEIGHT.md §13.4 | WORKFLOW-PHARMACY.md §18 |
| Schedule H1 restrictions | VERTICAL-WEIGHT.md §13.5 | WORKFLOW-PHARMACY.md §18 |
| Discreet packaging | PROJECT-OVERVIEW.md §7 | VERTICAL-ED.md §10.4, VERTICAL-PE.md §10.4 |
| Delivery SLA thresholds | PORTAL-ADMIN.md §30 | WORKFLOW-PHARMACY.md §22, BACKEND-PART2B.md §18 |
| Refund scenarios | WORKFLOW-PATIENT-CHANGES.md | WORKFLOW-PATIENT.md §30, PORTAL-ADMIN.md §31 |
| Notification templates (delivery) | BACKEND-PART2A.md §15.5 | APP-PATIENT.md §14 |
| Order Prisma schema | BACKEND-PART2A.md §11.2 | BACKEND-PART3B.md §30 |
| Admin Deliveries screen | PORTAL-ADMIN.md §11 | onlyou-spec-resolved-v4.md §4.6 |
| Medication refill quantities | VERTICAL-HAIR-LOSS.md §10.4 | VERTICAL-ED.md §10.5, VERTICAL-PE.md §10.5 |
| Payment failure retry | WORKFLOW-PATIENT.md §29 | APP-PATIENT.md §15.3 |
| 6-month plan renewal reminders | APP-PATIENT.md §15.2 | WORKFLOW-PATIENT.md §28 |

---

*This is the complete Delivery Workflow specification for the Onlyou Telehealth platform. For pharmacy-specific workflows, see WORKFLOW-PHARMACY.md. For patient-facing delivery tracking, see APP-PATIENT.md §14. For admin delivery management, see PORTAL-ADMIN.md §11–§16. For backend implementation, see BACKEND-PART2A.md §11.*
