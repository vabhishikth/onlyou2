# BACKEND.md — Part 2a of 3: Business Logic Modules (Sections 11–15)

> **Platform:** Onlyou Telehealth — Indian telehealth for stigmatized chronic conditions
> **Framework:** NestJS 10 + Fastify Adapter + tRPC + Prisma ORM + PostgreSQL 16
> **Runtime:** Node.js 20 LTS on AWS ECS Fargate (ap-south-1 Mumbai)
> **API Protocol:** tRPC for all 7 TypeScript clients; REST only for external webhooks + delivery SMS link
> **Cache/Queue:** Redis 7 on ElastiCache (sessions, BullMQ, SSE pub/sub, JWT blacklist)
> **File Storage:** S3 (SSE-KMS) + CloudFront signed URLs
> **Port:** `3000` (local dev), behind ALB in production
> **Audience:** Developers and Claude Code AI agents building the backend

---

## Master Table of Contents (All 3 Parts)

### Part 1 — Foundation & Core Modules (BACKEND-PART1.md)
1. Architecture Overview
2. Module Map & File Structure
3. tRPC Router & Context Setup
4. Auth Module
5. Users Module
6. Questionnaire Engine Module
7. Photos Module
8. AI Assessment Module
9. Consultations Module
10. Prescriptions Module

### Part 2a — Business Logic: Orders, Labs, Nurse, Payments, Notifications (this document)
11. [Orders Module (Medication Delivery)](#11-orders-module-medication-delivery)
12. [Lab Orders Module (Sample Tracking)](#12-lab-orders-module-sample-tracking)
13. [Nurse Module (Visits & Assignments)](#13-nurse-module-visits--assignments)
14. [Payments Module (Razorpay/UPI)](#14-payments-module-razorpayupi)
15. [Notifications Module (WhatsApp/SMS/FCM/Email)](#15-notifications-module-whaborerapushfcmemail)

### Part 2b — Business Logic: Messaging, Wallet, Admin, Jobs, Storage (BACKEND-PART2B.md)
16. Messaging Module (Doctor-Patient Chat + SSE)
17. Wallet & Referrals Module
18. Admin Module (Partners, SLA Engine)
19. Background Jobs (BullMQ Queues & Processors)
20. File Storage & Document Delivery (S3/CloudFront)

### Part 3 — Security, Ops & Testing
21–30. (See BACKEND-PART1.md for full TOC)

---

## 11. Orders Module (Medication Delivery)

### 11.1 Status Flow

```
CREATED                        ← Doctor prescribed → order auto-created
  │ Admin sends to pharmacy
  ▼
SENT_TO_PHARMACY               ← Pharmacy portal: appears in "New Orders" tab
  │ Pharmacy taps "Start Preparing"
  ▼
PREPARING                      ← Pharmacy portal: appears in "Preparing" tab
  │ Pharmacy taps "Ready for Pickup"
  ▼
READY                          ← Admin arranges delivery (enters delivery person details)
  │ Delivery person picks up → admin marks dispatched
  ▼
OUT_FOR_DELIVERY               ← SMS link sent to delivery person
  │ Patient confirms with 4-digit OTP
  ▼
DELIVERED                      ← Terminal success state


SPECIAL PATHS:

SENT_TO_PHARMACY or PREPARING → PHARMACY_ISSUE   ← Pharmacy reports stock issue
PHARMACY_ISSUE → SENT_TO_PHARMACY                 ← Admin resolves: "Proceed"
PHARMACY_ISSUE → REASSIGNED                       ← Admin resolves: "Reassign to different pharmacy"
PHARMACY_ISSUE → CANCELLED                        ← Admin resolves: "Cancel order"

Any pre-delivery status → CANCELLED               ← Admin cancels order
Any pre-delivery status → REASSIGNED              ← Admin reassigns to different pharmacy
OUT_FOR_DELIVERY → DELIVERY_FAILED                ← Delivery person couldn't deliver
DELIVERY_FAILED → OUT_FOR_DELIVERY                ← Admin reschedules delivery
```

### 11.2 Prisma Schema

```prisma
model Order {
  id                    String        @id @default(uuid())
  orderNumber           String        @unique // ORD-0001 format (auto-generated)
  prescriptionId        String
  prescription          Prescription  @relation(fields: [prescriptionId], references: [id])
  patientId             String
  patient               User          @relation("PatientOrders", fields: [patientId], references: [id])
  doctorId              String
  doctor                User          @relation("DoctorOrders", fields: [doctorId], references: [id])
  consultationId        String
  consultation          Consultation  @relation(fields: [consultationId], references: [id])
  subscriptionId        String?       // Null for one-time orders
  subscription          Subscription? @relation(fields: [subscriptionId], references: [id])

  // Pharmacy
  pharmacyId            String?
  pharmacy              Pharmacy?     @relation(fields: [pharmacyId], references: [id])
  pharmacyStaffId       String?       // Staff member who prepared the order

  // Medications snapshot (denormalized from prescription for pharmacy view)
  medications           Json          // Array<{ drug, dosage, frequency, duration, quantity }>
  condition             Condition

  // Status
  status                OrderStatus   @default(CREATED)
  issueType             String?       // 'out_of_stock' | 'partial_stock' | 'incorrect_prescription' | ...
  issueDetails          String?       // Free-text from pharmacy
  issueMedications      String[]      // Which medications have the issue
  issueReportedFromStatus OrderStatus? // Status when issue was reported

  // Delivery
  deliveryAddress       String
  deliveryCity          String
  deliveryPincode       String
  deliveryPersonName    String?
  deliveryPersonPhone   String?
  deliveryMethod        DeliveryMethod?
  deliveryOtp           String?       // bcrypt-hashed 4-digit OTP
  deliveryOtpAttempts   Int           @default(0)
  deliveryLinkToken     String?       @unique // Hashed token for SMS link
  estimatedDeliveryMinutes Int?

  // Auto-reorder tracking
  isAutoReorder         Boolean       @default(false)
  parentOrderId         String?       // Previous order this reorder is based on
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

  // Relations
  deliveryLink          DeliveryLink?

  @@index([patientId])
  @@index([pharmacyId])
  @@index([status])
  @@index([orderNumber])
}

model DeliveryLink {
  id          String   @id @default(uuid())
  orderId     String   @unique
  order       Order    @relation(fields: [orderId], references: [id])
  token       String   @unique // SHA-256 hash of the link token
  expiresAt   DateTime
  clickedAt   DateTime?
  createdAt   DateTime @default(now())
}

enum OrderStatus {
  CREATED
  SENT_TO_PHARMACY
  PREPARING
  READY
  OUT_FOR_DELIVERY
  DELIVERED
  PHARMACY_ISSUE
  DELIVERY_FAILED
  REASSIGNED
  CANCELLED
}

enum DeliveryMethod {
  RAPIDO
  DUNZO
  OWN
  OTHER
}
```

### 11.3 Zod Schemas

```typescript
// orders/dto/orders.schema.ts
import { z } from 'zod';

export const SendToPharmacyInput = z.object({
  orderId: z.string().uuid(),
  pharmacyId: z.string().uuid(),
});

export const UpdatePharmacyStatusInput = z.object({
  orderId: z.string().uuid(),
  action: z.enum(['start_preparing', 'mark_ready']),
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
  newPharmacyId: z.string().uuid().optional(), // Required if resolution = 'reassign'
  adminNotes: z.string().max(500).optional(),
});

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

export const OrderListInput = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
  pharmacyId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
});
```

### 11.4 Order Service

```typescript
// orders/orders.service.ts
@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaClient,
    private eventEmitter: EventEmitter2,
    private redis: Redis,
  ) {}

  // Auto-called via event when prescription is created
  @OnEvent('prescription.created')
  async createFromPrescription(payload: PrescriptionCreatedEvent): Promise<Order> {
    const { prescriptionId, consultationId, patientId, doctorId, medications, condition } = payload;

    // Get patient delivery address
    const patient = await this.prisma.user.findUniqueOrThrow({
      where: { id: patientId },
      include: { patientProfile: true },
    });

    const defaultAddress = await this.prisma.address.findFirst({
      where: { userId: patientId, isDefaultDelivery: true },
    });

    if (!defaultAddress) {
      // Patient must set delivery address — order created but flagged
      this.eventEmitter.emit('notification.send', {
        userId: patientId,
        event: 'delivery_address_needed',
        data: { prescriptionId },
      });
    }

    // Generate sequential order number
    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        prescriptionId,
        consultationId,
        patientId,
        doctorId,
        medications,
        condition,
        status: 'CREATED',
        deliveryAddress: defaultAddress?.fullAddress || '',
        deliveryCity: defaultAddress?.city || patient.patientProfile?.city || '',
        deliveryPincode: defaultAddress?.pincode || '',
      },
    });

    // Notify admin/coordinator: new order needs pharmacy assignment
    this.eventEmitter.emit('notification.send', {
      userId: null, // All admins
      role: 'admin',
      event: 'order_created',
      data: { orderId: order.id, orderNumber, condition, medications },
    });

    // SSE push to admin portal
    this.eventEmitter.emit('sse.broadcast', {
      channel: 'admin',
      event: 'order.created',
      data: { orderId: order.id, orderNumber, status: 'CREATED' },
    });

    return order;
  }

  // Admin sends order to pharmacy
  async sendToPharmacy(orderId: string, pharmacyId: string, adminId: string): Promise<Order> {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });

    this.assertStatus(order, 'CREATED', 'sendToPharmacy');

    const pharmacy = await this.prisma.pharmacy.findUniqueOrThrow({
      where: { id: pharmacyId, isActive: true },
    });

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        pharmacyId,
        status: 'SENT_TO_PHARMACY',
        sentToPharmacyAt: new Date(),
      },
    });

    // Notify pharmacy (push + WhatsApp)
    this.eventEmitter.emit('notification.send', {
      userId: null,
      pharmacyId,
      event: 'new_order_received',
      data: { orderId, orderNumber: order.orderNumber, medications: order.medications },
    });

    // SSE push to pharmacy portal
    this.eventEmitter.emit('sse.broadcast', {
      channel: `pharmacy:${pharmacyId}`,
      event: 'order.new',
      data: { orderId, orderNumber: order.orderNumber },
    });

    // Schedule SLA check: pharmacy must start preparing within 2 hours
    this.eventEmitter.emit('sla.schedule', {
      type: 'pharmacy_start_preparing',
      orderId,
      thresholdMinutes: 120,
    });

    // Audit log
    this.eventEmitter.emit('audit.log', {
      action: 'ORDER_SENT_TO_PHARMACY',
      entityType: 'Order',
      entityId: orderId,
      performedBy: adminId,
      details: { pharmacyId, pharmacyName: pharmacy.name },
    });

    return updated;
  }

  // Pharmacy starts preparing
  async startPreparing(orderId: string, pharmacyStaffId: string): Promise<Order> {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });

    this.assertStatus(order, 'SENT_TO_PHARMACY', 'startPreparing');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PREPARING',
        pharmacyStaffId,
        preparingStartedAt: new Date(),
      },
    });

    // SSE push to admin portal
    this.eventEmitter.emit('sse.broadcast', {
      channel: 'admin',
      event: 'order.status_changed',
      data: { orderId, status: 'PREPARING' },
    });

    // Schedule SLA check: pharmacy must finish preparing within 4 hours
    this.eventEmitter.emit('sla.schedule', {
      type: 'pharmacy_finish_preparing',
      orderId,
      thresholdMinutes: 240,
    });

    // Audit log
    this.eventEmitter.emit('audit.log', {
      action: 'ORDER_PREPARING',
      entityType: 'Order',
      entityId: orderId,
      performedBy: pharmacyStaffId,
    });

    return updated;
  }

  // Pharmacy marks ready for pickup
  async markReady(orderId: string, pharmacyStaffId: string): Promise<Order> {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });

    this.assertStatus(order, 'PREPARING', 'markReady');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'READY',
        readyAt: new Date(),
      },
    });

    // Notify admin: order ready, arrange delivery
    this.eventEmitter.emit('notification.send', {
      userId: null,
      role: 'admin',
      event: 'order_ready_for_pickup',
      data: { orderId, orderNumber: order.orderNumber },
    });

    // Notify patient: pharmacy preparing your medication
    this.eventEmitter.emit('notification.send', {
      userId: order.patientId,
      event: 'order_ready',
      data: { orderId, orderNumber: order.orderNumber },
    });

    // SSE push
    this.eventEmitter.emit('sse.broadcast', {
      channel: 'admin',
      event: 'order.status_changed',
      data: { orderId, status: 'READY' },
    });
    this.eventEmitter.emit('sse.broadcast', {
      channel: `pharmacy:${order.pharmacyId}`,
      event: 'order.status_changed',
      data: { orderId, status: 'READY' },
    });

    // Schedule SLA check: delivery must be arranged within 4 hours
    this.eventEmitter.emit('sla.schedule', {
      type: 'delivery_arrangement',
      orderId,
      thresholdMinutes: 240,
    });

    // Audit log
    this.eventEmitter.emit('audit.log', {
      action: 'ORDER_READY',
      entityType: 'Order',
      entityId: orderId,
      performedBy: pharmacyStaffId,
    });

    return updated;
  }

  // Pharmacy reports stock issue
  async reportIssue(input: ReportIssueInput, pharmacyStaffId: string): Promise<Order> {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: input.orderId } });

    if (!['SENT_TO_PHARMACY', 'PREPARING'].includes(order.status)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot report issue in current status' });
    }

    const updated = await this.prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: 'PHARMACY_ISSUE',
        issueType: input.issueType,
        issueDetails: input.notes,
        issueMedications: input.issueMedications,
        issueReportedFromStatus: order.status as OrderStatus,
      },
    });

    // Notify admin immediately (critical)
    this.eventEmitter.emit('notification.send', {
      userId: null,
      role: 'admin',
      event: 'pharmacy_issue',
      priority: 'critical',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        issueType: input.issueType,
        medications: input.issueMedications,
      },
    });

    // Notify patient: slight delay
    this.eventEmitter.emit('notification.send', {
      userId: order.patientId,
      event: 'order_slight_delay',
      data: { orderId: order.id },
    });

    // SSE push
    this.eventEmitter.emit('sse.broadcast', {
      channel: 'admin',
      event: 'order.issue',
      data: { orderId: order.id, issueType: input.issueType },
    });

    // Audit log
    this.eventEmitter.emit('audit.log', {
      action: 'ORDER_PHARMACY_ISSUE',
      entityType: 'Order',
      entityId: input.orderId,
      performedBy: pharmacyStaffId,
      details: { issueType: input.issueType, medications: input.issueMedications },
    });

    return updated;
  }

  // Admin resolves pharmacy issue
  async resolveIssue(input: ResolveIssueInput, adminId: string): Promise<Order> {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: input.orderId } });

    this.assertStatus(order, 'PHARMACY_ISSUE', 'resolveIssue');

    let newStatus: OrderStatus;
    let data: Prisma.OrderUpdateInput = {};

    switch (input.resolution) {
      case 'proceed':
        // Revert to the status before the issue was reported
        newStatus = order.issueReportedFromStatus || 'SENT_TO_PHARMACY';
        data = {
          status: newStatus,
          issueType: null,
          issueDetails: null,
          issueMedications: [],
          issueReportedFromStatus: null,
        };
        break;

      case 'reassign':
        if (!input.newPharmacyId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'New pharmacy ID required for reassignment' });
        }
        newStatus = 'SENT_TO_PHARMACY';
        data = {
          status: newStatus,
          pharmacyId: input.newPharmacyId,
          pharmacyStaffId: null,
          issueType: null,
          issueDetails: null,
          issueMedications: [],
          issueReportedFromStatus: null,
          sentToPharmacyAt: new Date(),
          preparingStartedAt: null,
        };
        // Notify new pharmacy
        this.eventEmitter.emit('notification.send', {
          pharmacyId: input.newPharmacyId,
          event: 'new_order_received',
          data: { orderId: order.id, orderNumber: order.orderNumber },
        });
        // Notify old pharmacy: order removed
        this.eventEmitter.emit('sse.broadcast', {
          channel: `pharmacy:${order.pharmacyId}`,
          event: 'order.removed',
          data: { orderId: order.id, reason: 'reassigned' },
        });
        break;

      case 'cancel':
        newStatus = 'CANCELLED';
        data = {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledReason: input.adminNotes || 'Cancelled due to pharmacy issue',
        };
        // Notify pharmacy: order removed
        this.eventEmitter.emit('sse.broadcast', {
          channel: `pharmacy:${order.pharmacyId}`,
          event: 'order.removed',
          data: { orderId: order.id, reason: 'cancelled' },
        });
        // Trigger refund for patient
        this.eventEmitter.emit('refund.initiate', {
          orderId: order.id,
          patientId: order.patientId,
          reason: 'pharmacy_issue_cancelled',
        });
        break;
    }

    const updated = await this.prisma.order.update({
      where: { id: input.orderId },
      data,
    });

    // Audit log
    this.eventEmitter.emit('audit.log', {
      action: 'ORDER_ISSUE_RESOLVED',
      entityType: 'Order',
      entityId: input.orderId,
      performedBy: adminId,
      details: { resolution: input.resolution, newPharmacyId: input.newPharmacyId },
    });

    return updated;
  }

  // Admin arranges delivery
  async arrangeDelivery(input: ArrangeDeliveryInput, adminId: string): Promise<Order> {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: input.orderId } });

    this.assertStatus(order, 'READY', 'arrangeDelivery');

    // Generate 4-digit delivery OTP
    const otpRaw = crypto.randomInt(1000, 9999).toString();
    const otpHash = await bcrypt.hash(otpRaw, 10);

    // Generate delivery link token
    const linkTokenRaw = crypto.randomUUID();
    const linkTokenHash = crypto.createHash('sha256').update(linkTokenRaw).digest('hex');

    const updated = await this.prisma.$transaction(async (tx) => {
      // Create delivery link
      await tx.deliveryLink.create({
        data: {
          orderId: order.id,
          token: linkTokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour expiry
        },
      });

      // Update order
      return tx.order.update({
        where: { id: input.orderId },
        data: {
          status: 'OUT_FOR_DELIVERY',
          deliveryPersonName: input.deliveryPersonName,
          deliveryPersonPhone: input.deliveryPersonPhone,
          deliveryMethod: input.deliveryMethod,
          estimatedDeliveryMinutes: input.estimatedMinutes,
          deliveryOtp: otpHash,
          deliveryOtpAttempts: 0,
          deliveryLinkToken: linkTokenHash,
          outForDeliveryAt: new Date(),
        },
      });
    });

    // Send SMS to delivery person with link
    const deliveryUrl = `${process.env.BASE_URL}/api/delivery/${linkTokenRaw}`;
    this.eventEmitter.emit('sms.send', {
      phone: input.deliveryPersonPhone,
      message: `Onlyou Delivery: Pickup from ${order.pharmacyId ? 'assigned pharmacy' : 'pharmacy'}, deliver to patient. Details: ${deliveryUrl}`,
    });

    // Send delivery OTP to patient (push notification)
    this.eventEmitter.emit('notification.send', {
      userId: order.patientId,
      event: 'out_for_delivery',
      data: { orderId: order.id, deliveryOtp: otpRaw, deliveryPersonName: input.deliveryPersonName },
    });

    // SSE push
    this.eventEmitter.emit('sse.broadcast', {
      channel: 'admin',
      event: 'order.status_changed',
      data: { orderId: order.id, status: 'OUT_FOR_DELIVERY' },
    });
    this.eventEmitter.emit('sse.broadcast', {
      channel: `pharmacy:${order.pharmacyId}`,
      event: 'order.status_changed',
      data: { orderId: order.id, status: 'OUT_FOR_DELIVERY' },
    });

    // Schedule SLA check: delivery must complete within 2 hours
    this.eventEmitter.emit('sla.schedule', {
      type: 'delivery_completion',
      orderId: order.id,
      thresholdMinutes: 120,
    });

    // Audit log
    this.eventEmitter.emit('audit.log', {
      action: 'DELIVERY_ARRANGED',
      entityType: 'Order',
      entityId: input.orderId,
      performedBy: adminId,
      details: {
        deliveryPersonName: input.deliveryPersonName,
        deliveryMethod: input.deliveryMethod,
      },
    });

    return updated;
  }

  // Confirm delivery via OTP
  async confirmDelivery(orderId: string, otp: string): Promise<Order> {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });

    this.assertStatus(order, 'OUT_FOR_DELIVERY', 'confirmDelivery');

    // Max 3 OTP attempts
    if (order.deliveryOtpAttempts >= 3) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Too many failed attempts. Contact coordinator.',
      });
    }

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

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        deliveryOtp: null, // Clear OTP after successful delivery
      },
    });

    // Notify patient: delivery confirmed
    this.eventEmitter.emit('notification.send', {
      userId: order.patientId,
      event: 'delivery_confirmed',
      data: { orderId, orderNumber: order.orderNumber },
    });

    // SSE push
    this.eventEmitter.emit('sse.broadcast', {
      channel: 'admin',
      event: 'order.status_changed',
      data: { orderId, status: 'DELIVERED' },
    });

    // Audit log
    this.eventEmitter.emit('audit.log', {
      action: 'ORDER_DELIVERED',
      entityType: 'Order',
      entityId: orderId,
      performedBy: 'delivery_otp_confirmed',
    });

    return updated;
  }

  // Admin manual delivery override (when OTP system has issues)
  async markDeliveredManual(orderId: string, reason: string, adminId: string): Promise<Order> {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });

    this.assertStatus(order, 'OUT_FOR_DELIVERY', 'markDeliveredManual');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        deliveryOtp: null,
      },
    });

    // Audit log with manual override flag
    this.eventEmitter.emit('audit.log', {
      action: 'ORDER_DELIVERED_MANUAL',
      entityType: 'Order',
      entityId: orderId,
      performedBy: adminId,
      details: { reason, isManualOverride: true },
    });

    return updated;
  }

  // Cancel order (admin only)
  async cancelOrder(orderId: string, reason: string, adminId: string): Promise<Order> {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });

    const cancellableStatuses: OrderStatus[] = [
      'CREATED', 'SENT_TO_PHARMACY', 'PREPARING', 'READY', 'PHARMACY_ISSUE',
    ];
    if (!cancellableStatuses.includes(order.status as OrderStatus)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot cancel order in ${order.status} status`,
      });
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledReason: reason,
      },
    });

    // Remove from pharmacy portal if assigned
    if (order.pharmacyId) {
      this.eventEmitter.emit('sse.broadcast', {
        channel: `pharmacy:${order.pharmacyId}`,
        event: 'order.removed',
        data: { orderId, reason: 'cancelled' },
      });
    }

    // Trigger refund
    this.eventEmitter.emit('refund.initiate', {
      orderId,
      patientId: order.patientId,
      reason: 'admin_cancelled',
    });

    // Audit log
    this.eventEmitter.emit('audit.log', {
      action: 'ORDER_CANCELLED',
      entityType: 'Order',
      entityId: orderId,
      performedBy: adminId,
      details: { reason },
    });

    return updated;
  }

  // Generate sequential order number (ORD-0001, ORD-0002, etc.)
  private async generateOrderNumber(): Promise<string> {
    const count = await this.prisma.order.count();
    return `ORD-${String(count + 1).padStart(4, '0')}`;
  }

  // Validate status transitions
  private assertStatus(order: Order, expected: OrderStatus, action: string): void {
    if (order.status !== expected) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot ${action}: order is ${order.status}, expected ${expected}`,
      });
    }
  }
}
```

### 11.5 Orders tRPC Router

```typescript
// orders/orders.router.ts
import { router, protectedProcedure, adminProcedure, pharmacyProcedure, patientProcedure } from '../../trpc/trpc.init';

export const ordersRouter = router({
  // Patient: list my orders
  list: patientProcedure
    .input(OrderListInput)
    .query(async ({ ctx, input }) => {
      return ctx.ordersService.listOrders({ ...input, patientId: ctx.user.id });
    }),

  // Patient: get order detail
  getById: protectedProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.ordersService.getOrder(input.orderId);
      // CASL check: patient can only see own orders, admin sees all
      ctx.ability.throwUnlessCan('read', subject('Order', order));
      return order;
    }),

  // Admin: send order to pharmacy
  sendToPharmacy: adminProcedure
    .input(SendToPharmacyInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.ordersService.sendToPharmacy(input.orderId, input.pharmacyId, ctx.user.id);
    }),

  // Pharmacy: start preparing / mark ready
  updatePharmacyStatus: pharmacyProcedure
    .input(UpdatePharmacyStatusInput)
    .mutation(async ({ ctx, input }) => {
      if (input.action === 'start_preparing') {
        return ctx.ordersService.startPreparing(input.orderId, ctx.user.id);
      }
      return ctx.ordersService.markReady(input.orderId, ctx.user.id);
    }),

  // Pharmacy: report stock issue
  reportIssue: pharmacyProcedure
    .input(ReportIssueInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.ordersService.reportIssue(input, ctx.user.id);
    }),

  // Admin: resolve pharmacy issue
  resolveIssue: adminProcedure
    .input(ResolveIssueInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.ordersService.resolveIssue(input, ctx.user.id);
    }),

  // Admin: arrange delivery
  arrangeDelivery: adminProcedure
    .input(ArrangeDeliveryInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.ordersService.arrangeDelivery(input, ctx.user.id);
    }),

  // Delivery person / patient: confirm delivery with OTP
  confirmDelivery: protectedProcedure
    .input(ConfirmDeliveryInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.ordersService.confirmDelivery(input.orderId, input.otp);
    }),

  // Admin: manual delivery override
  markDeliveredManual: adminProcedure
    .input(MarkDeliveredManualInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.ordersService.markDeliveredManual(input.orderId, input.reason, ctx.user.id);
    }),

  // Admin: cancel order
  cancel: adminProcedure
    .input(z.object({ orderId: z.string().uuid(), reason: z.string().min(5).max(500) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.ordersService.cancelOrder(input.orderId, input.reason, ctx.user.id);
    }),

  // Pharmacy: list orders for my pharmacy
  listForPharmacy: pharmacyProcedure
    .input(OrderListInput)
    .query(async ({ ctx, input }) => {
      const pharmacyId = await ctx.ordersService.getPharmacyIdForUser(ctx.user.id);
      return ctx.ordersService.listOrders({ ...input, pharmacyId });
    }),

  // Admin: list all orders
  listAll: adminProcedure
    .input(OrderListInput)
    .query(async ({ ctx, input }) => {
      return ctx.ordersService.listOrders(input);
    }),
});
```

### 11.6 Delivery Link REST Endpoint

The delivery SMS link opens a minimal web page (no auth required — uses one-time token):

```typescript
// rest/delivery.controller.ts
@Controller('api/delivery')
export class DeliveryController {
  constructor(
    private prisma: PrismaClient,
    private ordersService: OrdersService,
  ) {}

  @Get(':token')
  async getDeliveryPage(@Param('token') token: string, @Res() res: FastifyReply) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const link = await this.prisma.deliveryLink.findUnique({
      where: { token: tokenHash },
      include: {
        order: {
          include: {
            pharmacy: true,
          },
        },
      },
    });

    if (!link || link.expiresAt < new Date()) {
      return res.status(404).send({ error: 'Link expired or invalid' });
    }

    // Mark as clicked
    if (!link.clickedAt) {
      await this.prisma.deliveryLink.update({
        where: { id: link.id },
        data: { clickedAt: new Date() },
      });
    }

    // Return minimal delivery info (NO patient name, NO condition, NO phone, NO OTP)
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
      },
      instructions: 'Collect the package from the pharmacy. Deliver to the address above. The customer will share a 4-digit OTP to confirm delivery.',
    });
  }
}
```

### 11.7 Auto-Reorder (Subscription Renewal)

```typescript
// orders/auto-reorder.service.ts
@Injectable()
export class AutoReorderService {
  constructor(
    private prisma: PrismaClient,
    private ordersService: OrdersService,
    private eventEmitter: EventEmitter2,
  ) {}

  // Triggered by subscription renewal event (Section 14)
  @OnEvent('subscription.renewed')
  async handleRenewal(payload: SubscriptionRenewedEvent): Promise<void> {
    const { subscriptionId, patientId, condition } = payload;

    // Check if auto-reorder should be paused
    const subscription = await this.prisma.subscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      include: { patient: true },
    });

    if (subscription.autoReorderPaused) {
      return; // Doctor paused treatment or check-in overdue
    }

    // Find the most recent prescription for this condition
    const latestPrescription = await this.prisma.prescription.findFirst({
      where: { patientId, condition, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestPrescription) {
      // No active prescription — notify admin
      this.eventEmitter.emit('notification.send', {
        role: 'admin',
        event: 'auto_reorder_no_prescription',
        data: { subscriptionId, patientId, condition },
      });
      return;
    }

    // Find the last order to base the reorder on
    const lastOrder = await this.prisma.order.findFirst({
      where: { patientId, prescriptionId: latestPrescription.id, status: 'DELIVERED' },
      orderBy: { createdAt: 'desc' },
    });

    // Create reorder using same prescription
    this.eventEmitter.emit('prescription.created', {
      prescriptionId: latestPrescription.id,
      consultationId: latestPrescription.consultationId,
      patientId,
      doctorId: latestPrescription.doctorId,
      medications: latestPrescription.medications,
      condition,
      isAutoReorder: true,
      parentOrderId: lastOrder?.id,
    });
  }
}
```

### 11.8 Events Emitted

| Event | Payload | Consumers |
|-------|---------|-----------|
| `order.created` | `{ orderId, orderNumber, condition, medications }` | Admin notification, SSE |
| `order.status_changed` | `{ orderId, status, previousStatus }` | SSE to admin + pharmacy + patient |
| `order.issue` | `{ orderId, issueType, medications }` | Admin critical notification |
| `order.delivered` | `{ orderId, patientId }` | Patient notification, analytics |
| `sla.schedule` | `{ type, orderId, thresholdMinutes }` | BullMQ SLA check scheduler |
| `refund.initiate` | `{ orderId, patientId, reason }` | Wallet/Refund module |

### 11.9 Invalid Status Transitions (Server Rejects)

| Attempted Transition | Why Blocked |
|---------------------|-------------|
| `SENT_TO_PHARMACY` → `READY` | Must prepare first |
| `READY` → `PREPARING` | Cannot go backwards |
| `PHARMACY_ISSUE` → `PREPARING` | Issue must be resolved by coordinator first |
| `CANCELLED` → any | Cancelled is terminal |
| `DELIVERED` → any | Delivered is terminal |
| `OUT_FOR_DELIVERY` → `PREPARING` | Cannot go backwards after pickup |

---

## 12. Lab Orders Module (Sample Tracking)

### 12.1 Status Flow

```
ORDERED                         ← Doctor creates lab order
  │ Patient books slot (or coordinator assigns directly)
  ▼
SLOT_BOOKED                     ← Patient selected date + time + address
  │ Coordinator assigns nurse
  ▼
NURSE_ASSIGNED                  ← Nurse portal shows the assignment
  │ Nurse starts travel
  ▼
NURSE_EN_ROUTE                  ← Nurse tapped "Start Visit"
  │ Nurse arrives
  ▼
NURSE_ARRIVED                   ← Nurse opened visit flow
  │ Nurse collects sample
  ▼
SAMPLE_COLLECTED                ← Nurse marked collected (tube count recorded)
  │ Nurse delivers to diagnostic centre
  ▼
AT_LAB (canonical: DELIVERED_TO_LAB) ← Nurse confirmed delivery
  │ Lab confirms receipt
  ▼
SAMPLE_RECEIVED                 ← Lab staff tapped "Mark Received"
  │ Lab begins processing
  ▼
PROCESSING                      ← Lab staff tapped "Start Processing"
  │ Lab uploads results
  ▼
RESULTS_READY                   ← Lab staff submitted results + PDF
  │ Doctor reviews
  ▼
DOCTOR_REVIEWED                 ← Doctor reviewed + took action
  │
  ▼
CLOSED                          ← Terminal success state


SPECIAL PATHS:

Patient self-upload:
ORDERED → RESULTS_UPLOADED → DOCTOR_REVIEWED → CLOSED

Lab reports issue:
SAMPLE_RECEIVED or PROCESSING → SAMPLE_ISSUE → RECOLLECTION_NEEDED

Nurse can't collect:
NURSE_ASSIGNED or NURSE_EN_ROUTE → COLLECTION_FAILED → SLOT_BOOKED (reschedule)
```

### 12.2 Prisma Schema

```prisma
model LabOrder {
  id                    String          @id @default(uuid())
  orderNumber           String          @unique // LAB-0001 format
  consultationId        String
  consultation          Consultation    @relation(fields: [consultationId], references: [id])
  patientId             String
  patient               User            @relation("PatientLabOrders", fields: [patientId], references: [id])
  doctorId              String
  doctor                User            @relation("DoctorLabOrders", fields: [doctorId], references: [id])

  // Test details
  condition             Condition
  testPanel             String          // 'Extended Hair Panel', 'PCOS Screen Panel', etc.
  tests                 String[]        // Individual test names: ['TSH', 'CBC', 'Ferritin']
  price                 Int             // Price in paisa (₹1,200 = 120000)
  paymentId             String?         // Razorpay payment reference

  // Scheduling
  scheduledDate         DateTime?
  scheduledTimeSlot     String?         // '8:00-10:00 AM'
  collectionAddress     String?
  collectionCity        String?
  collectionPincode     String?

  // Assignments
  nurseId               String?
  nurse                 Nurse?          @relation(fields: [nurseId], references: [id])
  diagnosticCentreId    String?
  diagnosticCentre      DiagnosticCentre? @relation(fields: [diagnosticCentreId], references: [id])

  // Status
  status                LabOrderStatus  @default(ORDERED)

  // Results
  resultPdfUrl          String?         // S3 key for results PDF
  resultData            Json?           // Structured results (if available)
  selfUploadPdfUrl      String?         // Patient-uploaded results
  doctorNotes           String?         // Doctor's notes after reviewing results

  // Recollection
  parentLabOrderId      String?         // If this is a recollection, links to original
  parentLabOrder        LabOrder?       @relation("LabOrderRecollection", fields: [parentLabOrderId], references: [id])
  childLabOrders        LabOrder[]      @relation("LabOrderRecollection")
  recollectionReason    String?

  // Sample issue
  sampleIssueType       String?         // 'hemolyzed', 'insufficient', 'wrong_tube', 'contaminated'
  sampleIssueNotes      String?

  // Timestamps
  slotBookedAt          DateTime?
  nurseAssignedAt       DateTime?
  sampleCollectedAt     DateTime?
  deliveredToLabAt      DateTime?
  sampleReceivedAt      DateTime?
  processingStartedAt   DateTime?
  resultsReadyAt        DateTime?
  doctorReviewedAt      DateTime?
  closedAt              DateTime?

  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt

  // Relations
  nurseVisit            NurseVisit?

  @@index([patientId])
  @@index([nurseId])
  @@index([diagnosticCentreId])
  @@index([status])
}

enum LabOrderStatus {
  ORDERED
  SLOT_BOOKED
  NURSE_ASSIGNED
  NURSE_EN_ROUTE
  NURSE_ARRIVED
  SAMPLE_COLLECTED
  AT_LAB              // Canonical: nurse delivered to lab
  SAMPLE_RECEIVED     // Lab confirmed receipt
  PROCESSING
  RESULTS_READY
  RESULTS_UPLOADED    // Patient self-upload path
  DOCTOR_REVIEWED
  CLOSED
  COLLECTION_FAILED
  SAMPLE_ISSUE
  RECOLLECTION_NEEDED
  CANCELLED
}
```

### 12.3 Lab Orders Service

```typescript
// lab-orders/lab-orders.service.ts
@Injectable()
export class LabOrdersService {
  constructor(
    private prisma: PrismaClient,
    private eventEmitter: EventEmitter2,
  ) {}

  // Doctor creates lab order during consultation
  async create(input: CreateLabOrderInput, doctorId: string): Promise<LabOrder> {
    const orderNumber = await this.generateLabOrderNumber();

    const labOrder = await this.prisma.labOrder.create({
      data: {
        orderNumber,
        consultationId: input.consultationId,
        patientId: input.patientId,
        doctorId,
        condition: input.condition,
        testPanel: input.testPanel,
        tests: input.tests,
        price: input.price,
        status: 'ORDERED',
      },
    });

    // Notify patient: doctor ordered blood tests
    this.eventEmitter.emit('notification.send', {
      userId: input.patientId,
      event: 'lab_tests_ordered',
      data: { labOrderId: labOrder.id, testPanel: input.testPanel },
    });

    // SSE to admin
    this.eventEmitter.emit('sse.broadcast', {
      channel: 'admin',
      event: 'labOrder.created',
      data: { labOrderId: labOrder.id, orderNumber },
    });

    // Schedule SLA: patient should book slot within 7 days
    this.eventEmitter.emit('sla.schedule', {
      type: 'patient_slot_booking',
      labOrderId: labOrder.id,
      thresholdMinutes: 7 * 24 * 60, // 7 days
    });

    return labOrder;
  }

  // Patient books collection slot
  async bookSlot(labOrderId: string, input: BookSlotInput, patientId: string): Promise<LabOrder> {
    const labOrder = await this.prisma.labOrder.findUniqueOrThrow({ where: { id: labOrderId } });

    if (labOrder.patientId !== patientId) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    this.assertStatus(labOrder, 'ORDERED', 'bookSlot');

    const updated = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'SLOT_BOOKED',
        scheduledDate: input.date,
        scheduledTimeSlot: input.timeSlot,
        collectionAddress: input.address,
        collectionCity: input.city,
        collectionPincode: input.pincode,
        slotBookedAt: new Date(),
      },
    });

    // Notify admin: needs nurse assignment
    this.eventEmitter.emit('notification.send', {
      role: 'admin',
      event: 'lab_slot_booked',
      data: { labOrderId, date: input.date, timeSlot: input.timeSlot, city: input.city },
    });

    // Schedule SLA: nurse must be assigned within 2 hours
    this.eventEmitter.emit('sla.schedule', {
      type: 'nurse_assignment',
      labOrderId,
      thresholdMinutes: 120,
    });

    return updated;
  }

  // Admin assigns nurse
  async assignNurse(labOrderId: string, nurseId: string, adminId: string): Promise<LabOrder> {
    const labOrder = await this.prisma.labOrder.findUniqueOrThrow({ where: { id: labOrderId } });

    this.assertStatus(labOrder, 'SLOT_BOOKED', 'assignNurse');

    // Validate nurse is available and in the right area
    const nurse = await this.prisma.nurse.findUniqueOrThrow({
      where: { id: nurseId, isActive: true },
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update lab order
      const order = await tx.labOrder.update({
        where: { id: labOrderId },
        data: {
          nurseId,
          status: 'NURSE_ASSIGNED',
          nurseAssignedAt: new Date(),
        },
      });

      // Create NurseVisit record
      await tx.nurseVisit.create({
        data: {
          nurseId,
          patientId: labOrder.patientId,
          labOrderId,
          visitType: 'BLOOD_COLLECTION',
          scheduledDate: labOrder.scheduledDate!,
          scheduledTimeSlot: labOrder.scheduledTimeSlot!,
          visitAddress: labOrder.collectionAddress!,
          visitCity: labOrder.collectionCity!,
          visitPincode: labOrder.collectionPincode!,
          status: 'SCHEDULED',
        },
      });

      return order;
    });

    // Notify nurse (push + WhatsApp)
    this.eventEmitter.emit('notification.send', {
      userId: nurse.userId,
      event: 'new_assignment',
      data: {
        labOrderId,
        date: labOrder.scheduledDate,
        timeSlot: labOrder.scheduledTimeSlot,
        area: labOrder.collectionCity,
        tests: labOrder.tests,
      },
    });

    // Notify patient
    this.eventEmitter.emit('notification.send', {
      userId: labOrder.patientId,
      event: 'nurse_assigned',
      data: { nurseName: nurse.name, date: labOrder.scheduledDate, timeSlot: labOrder.scheduledTimeSlot },
    });

    // SSE
    this.eventEmitter.emit('sse.broadcast', {
      channel: `nurse:${nurseId}`,
      event: 'assignment.new',
      data: { labOrderId },
    });

    return updated;
  }

  // Admin assigns lab (diagnostic centre)
  async assignLab(labOrderId: string, labId: string, adminId: string): Promise<LabOrder> {
    const labOrder = await this.prisma.labOrder.findUniqueOrThrow({ where: { id: labOrderId } });

    const updated = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: { diagnosticCentreId: labId },
    });

    this.eventEmitter.emit('audit.log', {
      action: 'LAB_ASSIGNED',
      entityType: 'LabOrder',
      entityId: labOrderId,
      performedBy: adminId,
      details: { labId },
    });

    return updated;
  }

  // Lab confirms sample received
  async markSampleReceived(labOrderId: string, labStaffId: string): Promise<LabOrder> {
    const labOrder = await this.prisma.labOrder.findUniqueOrThrow({ where: { id: labOrderId } });

    this.assertStatus(labOrder, 'AT_LAB', 'markSampleReceived');

    const updated = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: { status: 'SAMPLE_RECEIVED', sampleReceivedAt: new Date() },
    });

    // SSE to admin
    this.eventEmitter.emit('sse.broadcast', {
      channel: 'admin',
      event: 'labOrder.status_changed',
      data: { labOrderId, status: 'SAMPLE_RECEIVED' },
    });

    // Schedule SLA: results must be ready within 48 hours
    this.eventEmitter.emit('sla.schedule', {
      type: 'lab_results',
      labOrderId,
      thresholdMinutes: 48 * 60,
    });

    return updated;
  }

  // Lab starts processing
  async startProcessing(labOrderId: string, labStaffId: string): Promise<LabOrder> {
    const labOrder = await this.prisma.labOrder.findUniqueOrThrow({ where: { id: labOrderId } });

    this.assertStatus(labOrder, 'SAMPLE_RECEIVED', 'startProcessing');

    return this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: { status: 'PROCESSING', processingStartedAt: new Date() },
    });
  }

  // Lab uploads results
  async uploadResults(labOrderId: string, resultPdfUrl: string, resultData: any, labStaffId: string): Promise<LabOrder> {
    const labOrder = await this.prisma.labOrder.findUniqueOrThrow({ where: { id: labOrderId } });

    if (!['PROCESSING', 'SAMPLE_RECEIVED'].includes(labOrder.status)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot upload results in current status' });
    }

    const updated = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'RESULTS_READY',
        resultPdfUrl,
        resultData,
        resultsReadyAt: new Date(),
      },
    });

    // Notify patient: results ready
    this.eventEmitter.emit('notification.send', {
      userId: labOrder.patientId,
      event: 'lab_results_ready',
      data: { labOrderId, testPanel: labOrder.testPanel },
    });

    // Notify doctor: results ready for review
    this.eventEmitter.emit('notification.send', {
      userId: labOrder.doctorId,
      event: 'lab_results_ready_for_review',
      data: { labOrderId, patientId: labOrder.patientId, testPanel: labOrder.testPanel },
    });

    // Schedule SLA: doctor must review within 24 hours
    this.eventEmitter.emit('sla.schedule', {
      type: 'doctor_lab_review',
      labOrderId,
      thresholdMinutes: 24 * 60,
    });

    return updated;
  }

  // Patient self-uploads results (bypasses lab entirely)
  async selfUploadResults(labOrderId: string, pdfUrl: string, patientId: string): Promise<LabOrder> {
    const labOrder = await this.prisma.labOrder.findUniqueOrThrow({ where: { id: labOrderId } });

    if (labOrder.patientId !== patientId) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    if (labOrder.status !== 'ORDERED') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only self-upload when order is in ORDERED status' });
    }

    const updated = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'RESULTS_UPLOADED',
        selfUploadPdfUrl: pdfUrl,
        resultsReadyAt: new Date(),
      },
    });

    // Notify doctor
    this.eventEmitter.emit('notification.send', {
      userId: labOrder.doctorId,
      event: 'patient_uploaded_results',
      data: { labOrderId, patientId },
    });

    return updated;
  }

  // Doctor reviews results
  async doctorReview(labOrderId: string, notes: string, doctorId: string): Promise<LabOrder> {
    const labOrder = await this.prisma.labOrder.findUniqueOrThrow({ where: { id: labOrderId } });

    if (!['RESULTS_READY', 'RESULTS_UPLOADED'].includes(labOrder.status)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No results to review' });
    }

    const updated = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'DOCTOR_REVIEWED',
        doctorNotes: notes,
        doctorReviewedAt: new Date(),
      },
    });

    // Notify patient: doctor reviewed your results
    this.eventEmitter.emit('notification.send', {
      userId: labOrder.patientId,
      event: 'lab_results_reviewed',
      data: { labOrderId, hasNotes: !!notes },
    });

    return updated;
  }

  // Lab reports sample issue (triggers recollection)
  async reportSampleIssue(labOrderId: string, issueType: string, notes: string, labStaffId: string): Promise<LabOrder> {
    const labOrder = await this.prisma.labOrder.findUniqueOrThrow({ where: { id: labOrderId } });

    if (!['SAMPLE_RECEIVED', 'PROCESSING'].includes(labOrder.status)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot report issue in current status' });
    }

    // Mark original order as SAMPLE_ISSUE
    const updated = await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: {
        status: 'SAMPLE_ISSUE',
        sampleIssueType: issueType,
        sampleIssueNotes: notes,
      },
    });

    // Create recollection order linked to original
    const recollectionOrder = await this.create({
      consultationId: labOrder.consultationId,
      patientId: labOrder.patientId,
      condition: labOrder.condition,
      testPanel: labOrder.testPanel,
      tests: labOrder.tests,
      price: 0, // No charge for recollection
    }, labOrder.doctorId);

    await this.prisma.labOrder.update({
      where: { id: recollectionOrder.id },
      data: { parentLabOrderId: labOrderId, recollectionReason: `${issueType}: ${notes}` },
    });

    // Update original to RECOLLECTION_NEEDED
    await this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: { status: 'RECOLLECTION_NEEDED' },
    });

    // Notify patient
    this.eventEmitter.emit('notification.send', {
      userId: labOrder.patientId,
      event: 'recollection_needed',
      data: { reason: issueType },
    });

    return updated;
  }

  // Close lab order
  async close(labOrderId: string): Promise<LabOrder> {
    return this.prisma.labOrder.update({
      where: { id: labOrderId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  private async generateLabOrderNumber(): Promise<string> {
    const count = await this.prisma.labOrder.count();
    return `LAB-${String(count + 1).padStart(4, '0')}`;
  }

  private assertStatus(labOrder: LabOrder, expected: LabOrderStatus, action: string): void {
    if (labOrder.status !== expected) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot ${action}: lab order is ${labOrder.status}, expected ${expected}`,
      });
    }
  }
}
```

### 12.4 Lab Orders tRPC Router

```typescript
// lab-orders/lab-orders.router.ts
export const labOrdersRouter = router({
  // Doctor: create lab order
  create: doctorProcedure
    .input(CreateLabOrderInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.labOrdersService.create(input, ctx.user.id);
    }),

  // Patient: book collection slot
  bookSlot: patientProcedure
    .input(BookSlotInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.labOrdersService.bookSlot(input.labOrderId, input, ctx.user.id);
    }),

  // Patient: self-upload results
  selfUpload: patientProcedure
    .input(z.object({ labOrderId: z.string().uuid(), pdfUrl: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.labOrdersService.selfUploadResults(input.labOrderId, input.pdfUrl, ctx.user.id);
    }),

  // Admin: assign nurse
  assignNurse: adminProcedure
    .input(z.object({ labOrderId: z.string().uuid(), nurseId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.labOrdersService.assignNurse(input.labOrderId, input.nurseId, ctx.user.id);
    }),

  // Admin: assign lab
  assignLab: adminProcedure
    .input(z.object({ labOrderId: z.string().uuid(), labId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.labOrdersService.assignLab(input.labOrderId, input.labId, ctx.user.id);
    }),

  // Lab: mark received, start processing, upload results, report issue
  markReceived: labProcedure
    .input(z.object({ labOrderId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.labOrdersService.markSampleReceived(input.labOrderId, ctx.user.id);
    }),

  startProcessing: labProcedure
    .input(z.object({ labOrderId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.labOrdersService.startProcessing(input.labOrderId, ctx.user.id);
    }),

  uploadResults: labProcedure
    .input(z.object({
      labOrderId: z.string().uuid(),
      resultPdfUrl: z.string(),
      resultData: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.labOrdersService.uploadResults(input.labOrderId, input.resultPdfUrl, input.resultData, ctx.user.id);
    }),

  reportIssue: labProcedure
    .input(z.object({
      labOrderId: z.string().uuid(),
      issueType: z.enum(['hemolyzed', 'insufficient', 'wrong_tube', 'contaminated', 'other']),
      notes: z.string().max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.labOrdersService.reportSampleIssue(input.labOrderId, input.issueType, input.notes, ctx.user.id);
    }),

  // Doctor: review results
  reviewResults: doctorProcedure
    .input(z.object({ labOrderId: z.string().uuid(), notes: z.string().max(2000) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.labOrdersService.doctorReview(input.labOrderId, input.notes, ctx.user.id);
    }),

  // Patient: list my lab orders
  list: patientProcedure
    .input(z.object({ status: z.nativeEnum(LabOrderStatus).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.labOrdersService.listForPatient(ctx.user.id, input.status);
    }),

  // Admin: list all lab orders
  listAll: adminProcedure
    .input(z.object({
      status: z.nativeEnum(LabOrderStatus).optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.labOrdersService.listAll(input);
    }),

  // Get single lab order
  getById: protectedProcedure
    .input(z.object({ labOrderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const labOrder = await ctx.labOrdersService.getById(input.labOrderId);
      ctx.ability.throwUnlessCan('read', subject('LabOrder', labOrder));
      return labOrder;
    }),
});
```

### 12.5 Lab Test Pricing

| Test Panel | Price | Condition | Tests Included |
|-----------|-------|-----------|----------------|
| Extended Hair Panel | ₹1,200 (120000 paisa) | Hair Loss | TSH, CBC, Ferritin, Vitamin D, DHT, Zinc |
| PCOS Screen Panel | ₹1,500 (150000 paisa) | PCOS | LH, FSH, Testosterone, DHEAS, Prolactin, HbA1c, Lipid Profile |
| Metabolic Panel | ₹1,800 (180000 paisa) | Weight | HbA1c, Fasting Glucose, Lipid Profile, Liver Panel, Kidney Panel, TSH |
| Basic Health Check | ₹800 (80000 paisa) | ED/PE | Testosterone, Fasting Glucose, Lipid Profile |
| Follow-up Panel | ₹600–₹1,200 | Varies | Subset of initial panel per doctor's order |

---

## 13. Nurse Module (Visits & Assignments)

### 13.1 Data Model

```prisma
model Nurse {
  id                      String            @id @default(uuid())
  userId                  String            @unique
  user                    User              @relation(fields: [userId], references: [id])
  name                    String
  phone                   String
  email                   String?
  gender                  Gender

  // Qualifications
  qualification           NurseQualification
  certificationDocUrl     String?
  certificationNumber     String?

  // Availability
  availableDays           DayOfWeek[]
  availableTimeStart      String            // "08:00"
  availableTimeEnd        String            // "18:00"
  maxDailyVisits          Int               @default(8)

  // Service area
  currentCity             String
  serviceableAreas        String[]          // Pincodes

  // Stats
  completedVisits         Int               @default(0)
  failedVisits            Int               @default(0)
  rating                  Float?

  // Phase 2
  canAdministerInjections Boolean           @default(false)

  isActive                Boolean           @default(true)
  createdAt               DateTime          @default(now())
  updatedAt               DateTime          @updatedAt

  visits                  NurseVisit[]
  labOrders               LabOrder[]
}

model NurseVisit {
  id                    String            @id @default(uuid())
  nurseId               String
  nurse                 Nurse             @relation(fields: [nurseId], references: [id])
  patientId             String
  patient               User              @relation(fields: [patientId], references: [id])
  labOrderId            String?           @unique
  labOrder              LabOrder?         @relation(fields: [labOrderId], references: [id])

  visitType             NurseVisitType    @default(BLOOD_COLLECTION)
  scheduledDate         DateTime
  scheduledTimeSlot     String
  visitAddress          String
  visitCity             String
  visitPincode          String
  specialInstructions   String?           // "Fasting required", "Gate code: 1234"

  // Status
  status                NurseVisitStatus  @default(SCHEDULED)

  // Vitals (recorded at every visit)
  vitals                Json?
  // Schema: { bloodPressureSystolic, bloodPressureDiastolic, pulseRate, spO2, weight, temperature, notes }

  // Blood Collection
  tubeCount             Int?
  collectionNotes       String?

  // Running Late
  lateReportedAt        DateTime?
  newEta                String?
  lateReason            String?

  // Timestamps
  scheduledAt           DateTime          @default(now())
  enRouteAt             DateTime?
  arrivedAt             DateTime?
  inProgressAt          DateTime?
  completedAt           DateTime?
  failedAt              DateTime?
  failedReason          String?
  cancelledAt           DateTime?
  cancelledReason       String?

  // Lab delivery tracking
  deliveredToLabAt      DateTime?
  deliveredToLabId      String?
  deliveredToLab        DiagnosticCentre? @relation(fields: [deliveredToLabId], references: [id])
  deliveryTubeCount     Int?

  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
}
```

### 13.2 Nurse Visit Service

```typescript
// nurse/nurse.service.ts
@Injectable()
export class NurseService {
  constructor(
    private prisma: PrismaClient,
    private eventEmitter: EventEmitter2,
  ) {}

  // Get today's visits for a nurse
  async getTodaysVisits(nurseId: string): Promise<NurseVisit[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.nurseVisit.findMany({
      where: {
        nurseId,
        scheduledDate: { gte: today, lt: tomorrow },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        patient: { select: { name: true, phone: true } },
        labOrder: { select: { tests: true, testPanel: true } },
      },
      orderBy: { scheduledTimeSlot: 'asc' },
    });
  }

  // Nurse starts travel to patient
  async startVisit(visitId: string, nurseId: string): Promise<NurseVisit> {
    const visit = await this.getVisitForNurse(visitId, nurseId);
    this.assertVisitStatus(visit, 'SCHEDULED', 'startVisit');

    const updated = await this.prisma.nurseVisit.update({
      where: { id: visitId },
      data: { status: 'EN_ROUTE', enRouteAt: new Date() },
    });

    // Update lab order status
    if (visit.labOrderId) {
      await this.prisma.labOrder.update({
        where: { id: visit.labOrderId },
        data: { status: 'NURSE_EN_ROUTE' },
      });
    }

    // SSE to admin
    this.eventEmitter.emit('sse.broadcast', {
      channel: 'admin',
      event: 'nurseVisit.status_changed',
      data: { visitId, nurseId, status: 'EN_ROUTE' },
    });

    return updated;
  }

  // Record vitals and mark sample collected
  async markCollected(visitId: string, input: MarkCollectedInput, nurseId: string): Promise<NurseVisit> {
    const visit = await this.getVisitForNurse(visitId, nurseId);

    if (!['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(visit.status)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Visit not in progress' });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update visit with vitals and collection data
      const v = await tx.nurseVisit.update({
        where: { id: visitId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          vitals: input.vitals,
          tubeCount: input.tubeCount,
          collectionNotes: input.collectionNotes,
        },
      });

      // Update lab order status
      if (visit.labOrderId) {
        await tx.labOrder.update({
          where: { id: visit.labOrderId },
          data: { status: 'SAMPLE_COLLECTED', sampleCollectedAt: new Date() },
        });
      }

      // Increment nurse completed visits
      await tx.nurse.update({
        where: { id: nurseId },
        data: { completedVisits: { increment: 1 } },
      });

      return v;
    });

    // Notify patient
    this.eventEmitter.emit('notification.send', {
      userId: visit.patientId,
      event: 'sample_collected',
      data: { visitId },
    });

    // SSE to admin
    this.eventEmitter.emit('sse.broadcast', {
      channel: 'admin',
      event: 'nurseVisit.completed',
      data: { visitId, nurseId, labOrderId: visit.labOrderId },
    });

    // Check for critical vitals
    if (input.vitals) {
      this.checkCriticalVitals(input.vitals, visit.patientId, visitId);
    }

    return updated;
  }

  // Mark visit as failed (patient unavailable)
  async markFailed(visitId: string, reason: string, nurseId: string): Promise<NurseVisit> {
    const visit = await this.getVisitForNurse(visitId, nurseId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const v = await tx.nurseVisit.update({
        where: { id: visitId },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failedReason: reason,
        },
      });

      // Update lab order
      if (visit.labOrderId) {
        await tx.labOrder.update({
          where: { id: visit.labOrderId },
          data: { status: 'COLLECTION_FAILED' },
        });
      }

      // Increment nurse failed visits
      await tx.nurse.update({
        where: { id: nurseId },
        data: { failedVisits: { increment: 1 } },
      });

      return v;
    });

    // Notify coordinator to reschedule
    this.eventEmitter.emit('notification.send', {
      role: 'admin',
      event: 'visit_failed',
      priority: 'warning',
      data: { visitId, nurseId, reason, patientId: visit.patientId },
    });

    return updated;
  }

  // Nurse reports running late
  async reportLate(visitId: string, newEta: string, reason: string, nurseId: string): Promise<NurseVisit> {
    const visit = await this.getVisitForNurse(visitId, nurseId);

    const updated = await this.prisma.nurseVisit.update({
      where: { id: visitId },
      data: {
        lateReportedAt: new Date(),
        newEta,
        lateReason: reason,
      },
    });

    // Notify patient
    this.eventEmitter.emit('notification.send', {
      userId: visit.patientId,
      event: 'nurse_running_late',
      data: { newEta, nurseName: visit.nurse?.name },
    });

    // Notify coordinator
    this.eventEmitter.emit('sse.broadcast', {
      channel: 'admin',
      event: 'nurseVisit.late',
      data: { visitId, nurseId, newEta },
    });

    return updated;
  }

  // Nurse delivers samples to lab (batch delivery)
  async deliverToLab(input: DeliverToLabInput, nurseId: string): Promise<void> {
    const { visitIds, labId, tubeCount } = input;

    await this.prisma.$transaction(async (tx) => {
      for (const visitId of visitIds) {
        const visit = await tx.nurseVisit.findUniqueOrThrow({
          where: { id: visitId, nurseId },
        });

        // Update visit
        await tx.nurseVisit.update({
          where: { id: visitId },
          data: {
            deliveredToLabAt: new Date(),
            deliveredToLabId: labId,
            deliveryTubeCount: tubeCount,
          },
        });

        // Update lab order status
        if (visit.labOrderId) {
          await tx.labOrder.update({
            where: { id: visit.labOrderId },
            data: { status: 'AT_LAB', deliveredToLabAt: new Date() },
          });
        }
      }
    });

    // Notify patients
    for (const visitId of visitIds) {
      const visit = await this.prisma.nurseVisit.findUniqueOrThrow({ where: { id: visitId } });
      this.eventEmitter.emit('notification.send', {
        userId: visit.patientId,
        event: 'sample_delivered_to_lab',
        data: {},
      });
    }

    // SSE to admin
    this.eventEmitter.emit('sse.broadcast', {
      channel: 'admin',
      event: 'samples.delivered_to_lab',
      data: { visitIds, labId, tubeCount, nurseId },
    });

    // SSE to lab portal
    this.eventEmitter.emit('sse.broadcast', {
      channel: `lab:${labId}`,
      event: 'samples.incoming',
      data: { visitIds, tubeCount },
    });
  }

  // Check for critical vitals and alert coordinator
  private checkCriticalVitals(vitals: any, patientId: string, visitId: string): void {
    const alerts: string[] = [];

    if (vitals.bloodPressureSystolic > 180 || vitals.bloodPressureDiastolic > 120) {
      alerts.push(`Critical BP: ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}`);
    }
    if (vitals.pulseRate && (vitals.pulseRate < 50 || vitals.pulseRate > 120)) {
      alerts.push(`Abnormal pulse: ${vitals.pulseRate} BPM`);
    }
    if (vitals.spO2 && vitals.spO2 < 92) {
      alerts.push(`Low SpO2: ${vitals.spO2}%`);
    }

    if (alerts.length > 0) {
      this.eventEmitter.emit('notification.send', {
        role: 'admin',
        event: 'critical_vitals',
        priority: 'critical',
        data: { patientId, visitId, alerts },
      });
    }
  }

  private async getVisitForNurse(visitId: string, nurseId: string): Promise<NurseVisit> {
    return this.prisma.nurseVisit.findUniqueOrThrow({
      where: { id: visitId, nurseId },
      include: { nurse: true, labOrder: true },
    });
  }

  private assertVisitStatus(visit: NurseVisit, expected: NurseVisitStatus, action: string): void {
    if (visit.status !== expected) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot ${action}: visit is ${visit.status}, expected ${expected}`,
      });
    }
  }
}
```

### 13.3 Nurse tRPC Router

```typescript
// nurse/nurse.router.ts
export const nurseRouter = router({
  // Today's visits
  todaysVisits: nurseProcedure
    .query(async ({ ctx }) => {
      const nurseId = await ctx.nurseService.getNurseIdForUser(ctx.user.id);
      return ctx.nurseService.getTodaysVisits(nurseId);
    }),

  // Start visit (en route)
  startVisit: nurseProcedure
    .input(z.object({ visitId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const nurseId = await ctx.nurseService.getNurseIdForUser(ctx.user.id);
      return ctx.nurseService.startVisit(input.visitId, nurseId);
    }),

  // Mark collected (includes vitals)
  markCollected: nurseProcedure
    .input(MarkCollectedInput)
    .mutation(async ({ ctx, input }) => {
      const nurseId = await ctx.nurseService.getNurseIdForUser(ctx.user.id);
      return ctx.nurseService.markCollected(input.visitId, input, nurseId);
    }),

  // Mark failed
  markFailed: nurseProcedure
    .input(z.object({
      visitId: z.string().uuid(),
      reason: z.enum([
        'NOT_HOME', 'NO_ANSWER', 'RESCHEDULE_REQUESTED',
        'PATIENT_NOT_FASTING', 'WRONG_ADDRESS', 'PATIENT_REFUSED', 'OTHER',
      ]),
    }))
    .mutation(async ({ ctx, input }) => {
      const nurseId = await ctx.nurseService.getNurseIdForUser(ctx.user.id);
      return ctx.nurseService.markFailed(input.visitId, input.reason, nurseId);
    }),

  // Report running late
  reportLate: nurseProcedure
    .input(z.object({
      visitId: z.string().uuid(),
      newEta: z.string().regex(/^\d{2}:\d{2}$/),
      reason: z.string().max(200),
    }))
    .mutation(async ({ ctx, input }) => {
      const nurseId = await ctx.nurseService.getNurseIdForUser(ctx.user.id);
      return ctx.nurseService.reportLate(input.visitId, input.newEta, input.reason, nurseId);
    }),

  // Deliver to lab (batch)
  deliverToLab: nurseProcedure
    .input(DeliverToLabInput)
    .mutation(async ({ ctx, input }) => {
      const nurseId = await ctx.nurseService.getNurseIdForUser(ctx.user.id);
      return ctx.nurseService.deliverToLab(input, nurseId);
    }),

  // Visit history
  history: nurseProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
      status: z.enum(['ALL', 'COMPLETED', 'FAILED']).default('ALL'),
    }))
    .query(async ({ ctx, input }) => {
      const nurseId = await ctx.nurseService.getNurseIdForUser(ctx.user.id);
      return ctx.nurseService.getHistory(nurseId, input);
    }),

  // Profile
  getProfile: nurseProcedure
    .query(async ({ ctx }) => {
      return ctx.nurseService.getProfile(ctx.user.id);
    }),

  // Register push token
  registerPushToken: nurseProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.nurseService.registerPushToken(ctx.user.id, input.token);
    }),
});
```

### 13.4 NurseVisit ↔ LabOrder Status Mapping

| NurseVisit Status | LabOrder Status | Trigger |
|-------------------|----------------|---------|
| `SCHEDULED` | `NURSE_ASSIGNED` | Admin assigns nurse |
| `EN_ROUTE` | `NURSE_EN_ROUTE` | Nurse starts visit |
| `ARRIVED` | `NURSE_ARRIVED` | Nurse opens visit flow |
| `COMPLETED` | `SAMPLE_COLLECTED` | Nurse marks collected |
| Lab delivery | `AT_LAB` | Nurse delivers to lab |
| `FAILED` | `COLLECTION_FAILED` | Nurse marks failed |
| `CANCELLED` | Reverts to `SLOT_BOOKED` | Admin cancels nurse assignment |

---

## 14. Payments Module (Razorpay/UPI)

### 14.1 Architecture Overview

```
Patient selects plan
  → Backend creates Razorpay Order (one-time) or Subscription (monthly/quarterly)
  → Frontend opens Razorpay Checkout SDK
  → Patient pays via UPI / Card / Net Banking
  → Razorpay webhook → POST /api/webhooks/razorpay
  → Backend verifies via Razorpay API (dual verification)
  → Activate subscription, create first medication order
  → Daily reconciliation cron job compares local state with Razorpay API
```

### 14.2 Prisma Schema

```prisma
model Subscription {
  id                    String              @id @default(uuid())
  patientId             String
  patient               User                @relation(fields: [patientId], references: [id])
  condition             Condition
  plan                  SubscriptionPlan    // MONTHLY, QUARTERLY, SIX_MONTH
  pricePerCycle         Int                 // In paisa
  totalPrice            Int                 // In paisa (same as pricePerCycle for monthly/quarterly)

  // Razorpay
  razorpaySubscriptionId String?  @unique   // Null for 6-month (one-time payment)
  razorpayPlanId        String?             // Razorpay plan ID
  razorpayCustomerId    String?

  // Status
  status                SubscriptionStatus  @default(CREATED)
  autoReorderPaused     Boolean             @default(false)
  autoReorderPausedReason String?

  // Billing
  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  nextBillingDate       DateTime?
  totalCycles           Int                 @default(0)

  // 6-month specific
  expiresAt             DateTime?           // Only for 6-month plans

  cancelledAt           DateTime?
  cancelledReason       String?
  pausedAt              DateTime?

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  orders                Order[]
  payments              RazorpayPayment[]
}

model RazorpayPayment {
  id                    String    @id @default(uuid())
  razorpayPaymentId     String    @unique
  razorpayOrderId       String?
  razorpaySignature     String?
  subscriptionId        String?
  subscription          Subscription? @relation(fields: [subscriptionId], references: [id])
  patientId             String
  patient               User      @relation(fields: [patientId], references: [id])

  amount                Int       // In paisa
  currency              String    @default("INR")
  status                PaymentStatus @default(CREATED)
  method                String?   // 'upi', 'card', 'netbanking'
  description           String?
  walletAmountUsed      Int       @default(0) // Paisa deducted from wallet

  // Webhook tracking
  razorpayEventId       String?   @unique // For idempotent processing
  webhookReceivedAt     DateTime?
  verifiedViaApi        Boolean   @default(false)

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}

model RefundRequest {
  id                    String        @id @default(uuid())
  patientId             String
  patient               User          @relation(fields: [patientId], references: [id])
  orderId               String?
  subscriptionId        String?
  paymentId             String?
  amount                Int           // In paisa
  reason                String
  source                RefundSource  // DOCTOR_INITIATED, PATIENT_CANCELLATION, PLATFORM_FAULT
  destination           RefundDestination? // WALLET, ORIGINAL_PAYMENT
  status                RefundStatus  @default(PENDING_APPROVAL)
  adminNotes            String?
  razorpayRefundId      String?
  requestedBy           String        // userId of requester
  approvedBy            String?       // Admin userId

  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

enum SubscriptionPlan {
  MONTHLY
  QUARTERLY
  SIX_MONTH
}

enum SubscriptionStatus {
  CREATED
  ACTIVE
  PAUSED
  HALTED      // Payment failed after retries
  CANCELLED
  EXPIRED
}

enum PaymentStatus {
  CREATED
  AUTHORIZED
  CAPTURED
  FAILED
  REFUNDED
}

enum RefundSource {
  DOCTOR_INITIATED
  PATIENT_CANCELLATION
  PLATFORM_FAULT
}

enum RefundDestination {
  WALLET
  ORIGINAL_PAYMENT
}

enum RefundStatus {
  PENDING_APPROVAL
  APPROVED
  REJECTED
  PROCESSING
  COMPLETED
}
```

### 14.3 Payments Service

```typescript
// payments/payments.service.ts
import Razorpay from 'razorpay';

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay;

  constructor(
    private prisma: PrismaClient,
    private eventEmitter: EventEmitter2,
    private redis: Redis,
  ) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  // Create payment for subscription (monthly/quarterly = Razorpay subscription, 6-month = one-time order)
  async createPayment(input: CreatePaymentInput, patientId: string) {
    const { condition, plan, walletDeduction } = input;

    const pricing = this.getPricing(condition, plan);

    // Apply wallet deduction (only for manual checkout, NOT auto-renewals)
    let amountToCharge = pricing.totalPrice;
    let walletUsed = 0;

    if (walletDeduction && walletDeduction > 0) {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId: patientId } });
      walletUsed = Math.min(walletDeduction, wallet?.balance || 0, amountToCharge);
      amountToCharge -= walletUsed;
    }

    if (plan === 'SIX_MONTH') {
      // One-time payment via Razorpay Order
      const razorpayOrder = await this.razorpay.orders.create({
        amount: amountToCharge,
        currency: 'INR',
        receipt: `onlyou_${Date.now()}`,
        notes: { condition, plan, patientId },
      });

      const payment = await this.prisma.razorpayPayment.create({
        data: {
          razorpayOrderId: razorpayOrder.id,
          patientId,
          amount: amountToCharge,
          walletAmountUsed: walletUsed,
          status: 'CREATED',
          description: `${condition} 6-Month Plan`,
        },
      });

      return {
        type: 'order' as const,
        razorpayOrderId: razorpayOrder.id,
        amount: amountToCharge,
        walletUsed,
        paymentId: payment.id,
      };
    }

    // Monthly/Quarterly → Razorpay Subscription
    const razorpayPlan = await this.getOrCreateRazorpayPlan(condition, plan, pricing.pricePerCycle);

    const razorpaySub = await this.razorpay.subscriptions.create({
      plan_id: razorpayPlan.id,
      total_count: plan === 'MONTHLY' ? 12 : 4, // Max cycles
      quantity: 1,
      notes: { condition, plan, patientId },
    });

    const subscription = await this.prisma.subscription.create({
      data: {
        patientId,
        condition,
        plan,
        pricePerCycle: pricing.pricePerCycle,
        totalPrice: pricing.totalPrice,
        razorpaySubscriptionId: razorpaySub.id,
        razorpayPlanId: razorpayPlan.id,
        status: 'CREATED',
      },
    });

    return {
      type: 'subscription' as const,
      razorpaySubscriptionId: razorpaySub.id,
      amount: pricing.pricePerCycle, // First charge amount
      walletUsed,
      subscriptionId: subscription.id,
    };
  }

  // Handle Razorpay webhook
  async handleWebhook(body: any, signature: string): Promise<void> {
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(JSON.stringify(body))
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    const eventId = body.event_id || body.payload?.payment?.entity?.id;

    // Idempotent check: skip if already processed
    const existing = await this.prisma.razorpayPayment.findFirst({
      where: { razorpayEventId: eventId },
    });
    if (existing) return;

    switch (body.event) {
      case 'payment.authorized':
        await this.handlePaymentAuthorized(body.payload.payment.entity, eventId);
        break;
      case 'payment.captured':
        await this.handlePaymentCaptured(body.payload.payment.entity, eventId);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(body.payload.payment.entity, eventId);
        break;
      case 'subscription.activated':
        await this.handleSubscriptionActivated(body.payload.subscription.entity);
        break;
      case 'subscription.charged':
        await this.handleSubscriptionCharged(body.payload.subscription.entity, body.payload.payment.entity, eventId);
        break;
      case 'subscription.halted':
        await this.handleSubscriptionHalted(body.payload.subscription.entity);
        break;
    }
  }

  private async handlePaymentAuthorized(payment: any, eventId: string): Promise<void> {
    // Auto-capture the payment
    await this.razorpay.payments.capture(payment.id, payment.amount, 'INR');

    await this.prisma.razorpayPayment.updateMany({
      where: { razorpayOrderId: payment.order_id },
      data: {
        razorpayPaymentId: payment.id,
        status: 'AUTHORIZED',
        method: payment.method,
        razorpayEventId: eventId,
        webhookReceivedAt: new Date(),
      },
    });
  }

  private async handlePaymentCaptured(payment: any, eventId: string): Promise<void> {
    // Verify via API (dual verification)
    const verified = await this.razorpay.payments.fetch(payment.id);
    if (verified.status !== 'captured') return;

    await this.prisma.razorpayPayment.updateMany({
      where: { razorpayPaymentId: payment.id },
      data: {
        status: 'CAPTURED',
        verifiedViaApi: true,
        razorpayEventId: eventId,
        webhookReceivedAt: new Date(),
      },
    });

    // Deduct wallet if applicable
    const localPayment = await this.prisma.razorpayPayment.findFirst({
      where: { razorpayPaymentId: payment.id },
    });

    if (localPayment?.walletAmountUsed && localPayment.walletAmountUsed > 0) {
      this.eventEmitter.emit('wallet.debit', {
        userId: localPayment.patientId,
        amount: localPayment.walletAmountUsed,
        reason: 'Applied to payment',
        referenceId: localPayment.id,
      });
    }

    // Notify patient
    this.eventEmitter.emit('notification.send', {
      userId: localPayment?.patientId,
      event: 'payment_received',
      data: { amount: payment.amount },
    });
  }

  private async handleSubscriptionActivated(sub: any): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: sub.id },
    });
    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: new Date(sub.current_start * 1000),
        currentPeriodEnd: new Date(sub.current_end * 1000),
        nextBillingDate: new Date(sub.charge_at * 1000),
      },
    });

    // Emit subscription activated → triggers first order creation
    this.eventEmitter.emit('subscription.activated', {
      subscriptionId: subscription.id,
      patientId: subscription.patientId,
      condition: subscription.condition,
    });
  }

  private async handleSubscriptionCharged(sub: any, payment: any, eventId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: sub.id },
    });
    if (!subscription) return;

    // Record the payment
    await this.prisma.razorpayPayment.create({
      data: {
        razorpayPaymentId: payment.id,
        subscriptionId: subscription.id,
        patientId: subscription.patientId,
        amount: payment.amount,
        status: 'CAPTURED',
        method: payment.method,
        razorpayEventId: eventId,
        webhookReceivedAt: new Date(),
        verifiedViaApi: false, // Will be verified by reconciliation job
        description: `${subscription.condition} ${subscription.plan} renewal`,
      },
    });

    // Update subscription period
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        currentPeriodStart: new Date(sub.current_start * 1000),
        currentPeriodEnd: new Date(sub.current_end * 1000),
        nextBillingDate: sub.charge_at ? new Date(sub.charge_at * 1000) : null,
        totalCycles: { increment: 1 },
      },
    });

    // Trigger auto-reorder
    this.eventEmitter.emit('subscription.renewed', {
      subscriptionId: subscription.id,
      patientId: subscription.patientId,
      condition: subscription.condition,
    });
  }

  private async handleSubscriptionHalted(sub: any): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { razorpaySubscriptionId: sub.id },
    });
    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'HALTED',
        autoReorderPaused: true,
        autoReorderPausedReason: 'Payment failed after retries',
      },
    });

    // Notify patient
    this.eventEmitter.emit('notification.send', {
      userId: subscription.patientId,
      event: 'subscription_halted',
      data: { condition: subscription.condition },
    });
  }

  // Pricing lookup
  private getPricing(condition: Condition, plan: SubscriptionPlan): { pricePerCycle: number; totalPrice: number } {
    const pricing: Record<string, Record<string, { pricePerCycle: number; totalPrice: number }>> = {
      HAIR_LOSS: {
        MONTHLY:    { pricePerCycle: 99900,   totalPrice: 99900 },
        QUARTERLY:  { pricePerCycle: 83300,   totalPrice: 249900 },
        SIX_MONTH:  { pricePerCycle: 75000,   totalPrice: 449900 },
      },
      ED: {
        MONTHLY:    { pricePerCycle: 129900,  totalPrice: 129900 },
        QUARTERLY:  { pricePerCycle: 110000,  totalPrice: 329900 },
        SIX_MONTH:  { pricePerCycle: 100000,  totalPrice: 599900 },
      },
      PE: {
        MONTHLY:    { pricePerCycle: 129900,  totalPrice: 129900 },
        QUARTERLY:  { pricePerCycle: 110000,  totalPrice: 329900 },
        SIX_MONTH:  { pricePerCycle: 100000,  totalPrice: 599900 },
      },
      WEIGHT: {
        MONTHLY:    { pricePerCycle: 299900,  totalPrice: 299900 },
        QUARTERLY:  { pricePerCycle: 266600,  totalPrice: 799900 },
        SIX_MONTH:  { pricePerCycle: 250000,  totalPrice: 1499900 },
      },
      PCOS: {
        MONTHLY:    { pricePerCycle: 149900,  totalPrice: 149900 },
        QUARTERLY:  { pricePerCycle: 126600,  totalPrice: 379900 },
        SIX_MONTH:  { pricePerCycle: 116700,  totalPrice: 699900 },
      },
    };
    return pricing[condition][plan];
  }

  private async getOrCreateRazorpayPlan(
    condition: Condition,
    plan: SubscriptionPlan,
    amount: number,
  ): Promise<{ id: string }> {
    // Cache plan IDs in Redis
    const cacheKey = `razorpay_plan:${condition}:${plan}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return { id: cached };

    const interval = plan === 'MONTHLY' ? 'monthly' : 'quarterly'; // Razorpay only supports monthly/yearly
    const period = plan === 'QUARTERLY' ? 3 : 1;

    const razorpayPlan = await this.razorpay.plans.create({
      period: 'monthly',
      interval: period,
      item: {
        name: `Onlyou ${condition} ${plan}`,
        amount,
        currency: 'INR',
      },
    });

    await this.redis.setex(cacheKey, 86400, razorpayPlan.id); // Cache 24h
    return razorpayPlan;
  }
}
```

### 14.4 Subscription Service (Plan Changes)

```typescript
// payments/subscription.service.ts
@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaClient,
    private razorpay: Razorpay,
    private paymentsService: PaymentsService,
    private eventEmitter: EventEmitter2,
  ) {}

  // Change plan (UPI: cancel + recreate, Card: update)
  async changePlan(subscriptionId: string, newPlan: SubscriptionPlan, patientId: string) {
    const sub = await this.prisma.subscription.findUniqueOrThrow({
      where: { id: subscriptionId, patientId },
    });

    if (sub.status !== 'ACTIVE') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only change plan on active subscriptions' });
    }

    // For UPI subscriptions: cancel + recreate (UPI subs cannot be updated)
    // For Card: can update directly via Razorpay API
    // We use cancel + recreate for ALL to keep the flow consistent
    await this.cancel(subscriptionId, 'Plan change', patientId);

    // Calculate prorated credit for remaining days
    const remainingDays = Math.max(0,
      Math.ceil((sub.currentPeriodEnd!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
    const dailyRate = sub.pricePerCycle / 30; // Approximate
    const creditAmount = Math.round(remainingDays * dailyRate);

    if (creditAmount > 0) {
      this.eventEmitter.emit('wallet.credit', {
        userId: patientId,
        amount: creditAmount,
        reason: `Prorated credit for plan change (${remainingDays} days remaining)`,
        referenceId: subscriptionId,
      });
    }

    // Create new subscription with new plan
    return this.paymentsService.createPayment({
      condition: sub.condition,
      plan: newPlan,
      walletDeduction: creditAmount, // Auto-apply the credit
    }, patientId);
  }

  // Pause subscription
  async pause(subscriptionId: string, patientId: string): Promise<Subscription> {
    const sub = await this.prisma.subscription.findUniqueOrThrow({
      where: { id: subscriptionId, patientId },
    });

    if (sub.status !== 'ACTIVE') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only pause active subscriptions' });
    }

    // Pause in Razorpay
    if (sub.razorpaySubscriptionId) {
      await this.razorpay.subscriptions.pause(sub.razorpaySubscriptionId);
    }

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
        autoReorderPaused: true,
        autoReorderPausedReason: 'Patient paused subscription',
      },
    });
  }

  // Cancel subscription
  async cancel(subscriptionId: string, reason: string, patientId: string): Promise<Subscription> {
    const sub = await this.prisma.subscription.findUniqueOrThrow({
      where: { id: subscriptionId, patientId },
    });

    if (['CANCELLED', 'EXPIRED'].includes(sub.status)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Subscription already cancelled/expired' });
    }

    // Cancel in Razorpay (at period end)
    if (sub.razorpaySubscriptionId) {
      await this.razorpay.subscriptions.cancel(sub.razorpaySubscriptionId, false); // false = cancel at end of period
    }

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledReason: reason,
        autoReorderPaused: true,
      },
    });
  }
}
```

### 14.5 Razorpay Webhook Controller

```typescript
// rest/webhook.controller.ts
@Controller('api/webhooks')
export class WebhookController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('razorpay')
  async handleRazorpay(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
  ): Promise<{ status: string }> {
    await this.paymentsService.handleWebhook(body, signature);
    return { status: 'ok' };
  }
}
```

### 14.6 Payment Retry Flow

| Day | Action | Notification |
|-----|--------|--------------|
| T+0 | First charge fails | Push + WhatsApp: "Payment failed. Please update your payment method." |
| T+1 | Retry #1 (Razorpay automatic) | WhatsApp: "Still unable to process payment" |
| T+2 | Retry #2 | WhatsApp: "Your treatment may be interrupted" |
| T+3 | Retry #3 (final) | Push + WhatsApp + SMS: "Last attempt failed. Treatment paused. [Pay Now]" |
| T+3+ | Subscription → `HALTED` | Treatment paused, no reorders, manual payment link provided |

### 14.7 Known UPI Limitations

| Issue | Impact | Mitigation |
|-------|--------|------------|
| UPI Autopay ₹15,000/txn limit | All plans under this — OK | Monitor GLP-1 6-month (₹44,999) |
| UPI subscriptions cannot be updated | Upgrade/downgrade requires cancel + recreate | Cancel-and-recreate flow built |
| Customer-paused UPI subs can't be programmatically resumed | Only customer can resume from UPI app | WhatsApp notification with deep link |
| Webhook delays (up to 5 hours) | Payment state may be stale | Webhook + API polling dual-verification |
| Webhook endpoint disabled after 24h continuous failures | Missed payment events | Health check on webhook endpoint, alert |

---

## 15. Notifications Module (WhatsApp/SMS/FCM/Email)

### 15.1 Architecture

```
Event emitted (e.g., 'notification.send')
  → NotificationsService receives event
  → Look up user notification preferences
  → Check discreet mode flag
  → Select template (normal vs discreet)
  → Route to correct channel(s)
  → BullMQ notification-dispatch queue
  → Channel processor sends via provider API
```

### 15.2 Channel Providers

| Channel | Provider | Fallback | Cost |
|---------|----------|----------|------|
| WhatsApp | Gupshup WhatsApp Business API | SMS | ~₹0.10–0.15/msg |
| SMS | Gupshup SMS | MSG91 | ~₹0.15–0.50/msg |
| Push (FCM) | Firebase Cloud Messaging | WhatsApp | Free |
| Email | Resend (MVP) → SES (scale) | — | ~$0.001/msg |

### 15.3 Notification Service

```typescript
// notifications/notifications.service.ts
@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
    @InjectQueue('notification-dispatch') private notificationQueue: Queue,
    private whatsappChannel: WhatsAppChannel,
    private smsChannel: SmsChannel,
    private pushChannel: PushChannel,
    private emailChannel: EmailChannel,
  ) {}

  // Main entry point — called via EventEmitter2
  @OnEvent('notification.send')
  async handleNotification(payload: NotificationPayload): Promise<void> {
    const { userId, role, event, data, priority } = payload;

    // Determine recipients
    let recipients: NotificationRecipient[];

    if (userId) {
      // Specific user
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { notificationPreferences: true },
      });
      recipients = [{ user, preferences: user.notificationPreferences }];
    } else if (role) {
      // All users of a role (e.g., all admins)
      const users = await this.prisma.user.findMany({
        where: { role, isActive: true },
        include: { notificationPreferences: true },
      });
      recipients = users.map(u => ({ user: u, preferences: u.notificationPreferences }));
    } else if (payload.pharmacyId) {
      // All staff of a pharmacy
      const users = await this.prisma.user.findMany({
        where: { role: 'pharmacy', pharmacyStaff: { pharmacyId: payload.pharmacyId } },
        include: { notificationPreferences: true },
      });
      recipients = users.map(u => ({ user: u, preferences: u.notificationPreferences }));
    } else {
      return; // No recipients
    }

    // Get template for this event
    const template = this.getTemplate(event);

    for (const recipient of recipients) {
      const channels = this.resolveChannels(event, recipient.preferences, priority);
      const isDiscreet = recipient.user.discreetMode || false;
      const isQuietHour = this.isQuietHour(recipient.preferences);

      for (const channel of channels) {
        // SLA warnings override quiet hours
        const skipQuietHour = priority === 'critical' || event.startsWith('sla_');

        if (isQuietHour && !skipQuietHour && ['push', 'whatsapp'].includes(channel)) {
          // Queue for delayed delivery at end of quiet period
          const delayMs = this.getQuietHourEndDelay(recipient.preferences);
          await this.notificationQueue.add('dispatch', {
            channel,
            userId: recipient.user.id,
            event,
            template: isDiscreet ? template.discreet : template.normal,
            data,
            phone: recipient.user.phone,
            email: recipient.user.email,
          }, { delay: delayMs, priority: priority === 'critical' ? 1 : 5 });
        } else {
          // Immediate dispatch
          await this.notificationQueue.add('dispatch', {
            channel,
            userId: recipient.user.id,
            event,
            template: isDiscreet ? template.discreet : template.normal,
            data,
            phone: recipient.user.phone,
            email: recipient.user.email,
          }, { priority: priority === 'critical' ? 1 : 5 });
        }
      }

      // Store notification in database for in-app notification center
      await this.prisma.notification.create({
        data: {
          userId: recipient.user.id,
          event,
          title: isDiscreet ? template.discreet.title : template.normal.title,
          body: this.interpolate(isDiscreet ? template.discreet.body : template.normal.body, data),
          data: data as any,
          isRead: false,
          priority: priority || 'info',
        },
      });
    }
  }

  // Determine which channels to use based on user preferences and event type
  private resolveChannels(
    event: string,
    preferences: NotificationPreferences | null,
    priority?: string,
  ): NotificationChannel[] {
    // SLA breaches go to ALL channels regardless of preferences
    if (priority === 'critical' || event.startsWith('sla_')) {
      return ['push', 'whatsapp', 'email', 'sms'];
    }

    // Map event to category
    const category = this.getEventCategory(event);

    // Non-disableable categories always get push + whatsapp
    const alwaysOn = ['treatment_updates', 'delivery_updates', 'lab_updates'];
    if (alwaysOn.includes(category)) {
      const channels: NotificationChannel[] = ['push'];
      if (preferences?.whatsappEnabled !== false) channels.push('whatsapp');
      return channels;
    }

    // Apply user preferences
    const channels: NotificationChannel[] = [];
    if (preferences?.pushEnabled !== false) channels.push('push');
    if (preferences?.whatsappEnabled !== false) channels.push('whatsapp');
    if (preferences?.smsEnabled !== false && this.isSmsEvent(event)) channels.push('sms');
    if (preferences?.emailEnabled !== false && this.isEmailEvent(event)) channels.push('email');

    return channels;
  }

  // Events that always get SMS (critical delivery)
  private isSmsEvent(event: string): boolean {
    return [
      'otp_delivery', 'nurse_arriving', 'out_for_delivery',
      'doctor_needs_info', 'payment_failed', 'sla_breach',
    ].includes(event);
  }

  // Events that get email (receipts and reports)
  private isEmailEvent(event: string): boolean {
    return [
      'payment_received', 'prescription_ready', 'lab_results_ready',
      'delivery_confirmed', 'payment_failed', 'daily_digest',
    ].includes(event);
  }

  private isQuietHour(preferences: NotificationPreferences | null): boolean {
    if (!preferences?.quietHoursEnabled) return false;
    const now = new Date();
    const hours = now.getHours();
    const start = parseInt(preferences.quietHoursStart || '22');
    const end = parseInt(preferences.quietHoursEnd || '7');

    if (start > end) {
      // Crosses midnight (e.g., 22:00 → 07:00)
      return hours >= start || hours < end;
    }
    return hours >= start && hours < end;
  }

  private interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
  }
}
```

### 15.4 Channel Implementations

```typescript
// notifications/channels/whatsapp.channel.ts
@Injectable()
export class WhatsAppChannel {
  constructor(private httpService: HttpService) {}

  async send(phone: string, templateId: string, params: string[]): Promise<void> {
    await this.httpService.axiosRef.post('https://api.gupshup.io/wa/api/v1/msg', {
      channel: 'whatsapp',
      source: process.env.GUPSHUP_WHATSAPP_NUMBER,
      destination: phone,
      'src.name': process.env.GUPSHUP_APP_NAME,
      template: JSON.stringify({ id: templateId, params }),
    }, {
      headers: { apikey: process.env.GUPSHUP_API_KEY },
    });
  }
}

// notifications/channels/push.channel.ts
import * as admin from 'firebase-admin';

@Injectable()
export class PushChannel {
  private messaging: admin.messaging.Messaging;

  constructor(private prisma: PrismaClient) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)),
      });
    }
    this.messaging = admin.messaging();
  }

  async send(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId, isActive: true },
    });

    if (tokens.length === 0) return;

    const messages: admin.messaging.Message[] = tokens.map(t => ({
      token: t.token,
      notification: { title, body },
      data: data || {},
      android: {
        priority: 'high' as const, // Critical for Chinese OEM devices
        notification: {
          channelId: 'onlyou_medical', // Pre-created Android notification channel
          priority: 'max' as const,
        },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    }));

    const response = await this.messaging.sendEach(messages);

    // Clean up failed tokens
    response.responses.forEach((res, i) => {
      if (res.error?.code === 'messaging/registration-token-not-registered') {
        this.prisma.pushToken.update({
          where: { id: tokens[i].id },
          data: { isActive: false },
        });
      }
    });
  }
}

// notifications/channels/sms.channel.ts
@Injectable()
export class SmsChannel {
  constructor(private httpService: HttpService) {}

  async send(phone: string, message: string): Promise<void> {
    try {
      // Primary: Gupshup SMS
      await this.httpService.axiosRef.post('https://enterprise.smsgupshup.com/GatewayAPI/rest', null, {
        params: {
          userid: process.env.GUPSHUP_SMS_USERID,
          password: process.env.GUPSHUP_SMS_PASSWORD,
          send_to: phone,
          msg: message,
          method: 'SendMessage',
          msg_type: 'TEXT',
          auth_scheme: 'plain',
        },
      });
    } catch {
      // Fallback: MSG91
      await this.httpService.axiosRef.post('https://api.msg91.com/api/v5/flow/', {
        template_id: process.env.MSG91_GENERIC_TEMPLATE_ID,
        recipients: [{ mobiles: phone, message }],
      }, {
        headers: { authkey: process.env.MSG91_AUTH_KEY },
      });
    }
  }
}

// notifications/channels/email.channel.ts
import { Resend } from 'resend';

@Injectable()
export class EmailChannel {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    await this.resend.emails.send({
      from: 'Onlyou <noreply@onlyou.life>',
      to,
      subject,
      html,
    });
  }
}
```

### 15.5 Notification Templates (Example)

```typescript
// notifications/templates/index.ts
export const templates: Record<string, NotificationTemplate> = {
  prescription_ready: {
    normal: {
      title: 'Prescription Ready',
      body: 'Your {{condition}} prescription has been created by your doctor.',
      whatsappTemplateId: 'onlyou_prescription_ready',
      emailSubject: 'Your Onlyou Prescription is Ready',
    },
    discreet: {
      title: 'Health Update',
      body: 'Your health update is ready. Open the app for details.',
      whatsappTemplateId: 'onlyou_generic_update',
      emailSubject: 'Onlyou — Account Update',
    },
  },
  out_for_delivery: {
    normal: {
      title: 'Out for Delivery',
      body: 'Your medication is on its way! Delivery person: {{deliveryPersonName}}. Your OTP: {{deliveryOtp}}',
      whatsappTemplateId: 'onlyou_delivery_otw',
      emailSubject: 'Your Onlyou Order is Out for Delivery',
    },
    discreet: {
      title: 'Delivery Update',
      body: 'Your package is on its way. Open the app for your delivery code.',
      whatsappTemplateId: 'onlyou_generic_delivery',
      emailSubject: 'Onlyou — Delivery Update',
    },
  },
  lab_results_ready: {
    normal: {
      title: 'Lab Results Ready',
      body: 'Your {{testPanel}} results are ready. Your doctor will review them shortly.',
      whatsappTemplateId: 'onlyou_lab_results',
      emailSubject: 'Your Lab Results are Ready',
    },
    discreet: {
      title: 'Health Update',
      body: 'New health information is available. Open the app for details.',
      whatsappTemplateId: 'onlyou_generic_update',
      emailSubject: 'Onlyou — Account Update',
    },
  },
  payment_failed: {
    normal: {
      title: 'Payment Failed',
      body: 'We couldn\'t process your payment for {{condition}} treatment. Please update your payment method.',
      whatsappTemplateId: 'onlyou_payment_failed',
      emailSubject: 'Action Required: Payment Failed',
    },
    discreet: {
      title: 'Payment Issue',
      body: 'We couldn\'t process your recent payment. Open the app to resolve.',
      whatsappTemplateId: 'onlyou_generic_payment',
      emailSubject: 'Onlyou — Payment Issue',
    },
  },
  nurse_assigned: {
    normal: {
      title: 'Nurse Assigned',
      body: '{{nurseName}} will visit you on {{date}} between {{timeSlot}} for your blood test collection.',
      whatsappTemplateId: 'onlyou_nurse_assigned',
      emailSubject: null, // No email for this event
    },
    discreet: {
      title: 'Appointment Update',
      body: 'A healthcare professional has been assigned for your upcoming appointment.',
      whatsappTemplateId: 'onlyou_generic_appointment',
      emailSubject: null,
    },
  },
  sla_breach: {
    normal: {
      title: '⚠️ SLA Breach',
      body: '{{description}}',
      whatsappTemplateId: 'onlyou_admin_sla',
      emailSubject: '⚠️ Onlyou SLA Breach Alert',
    },
    discreet: null, // SLA breaches are admin-only, no discreet mode
  },
};
```

### 15.6 Android Push Mitigation Strategy

20–40% FCM delivery failure on Indian Android devices (Xiaomi, Samsung, Oppo, Realme, Vivo) due to OEM battery optimization.

**Mitigations (all from Day 1):**

1. **FCM high-priority** for all medical notifications (set in PushChannel)
2. **In-app onboarding flow:** Guide user through disabling battery optimization and enabling Autostart using `AutoStarter` library
3. **WhatsApp as primary channel:** More reliable than FCM on Chinese OEM phones
4. **SMS fallback** for critical events: OTP, nurse arriving, delivery in 15 min
5. **In-app polling fallback:** App polls for unread notifications every 5 minutes when in foreground (catches any missed pushes)

### 15.7 Complete Notification Event Matrix (Patient)

| Event | Push | WhatsApp | SMS | Email |
|-------|------|----------|-----|-------|
| OTP delivery | — | ✅ primary | ✅ fallback | — |
| Consultation submitted | ✅ | ✅ | — | ✅ receipt |
| Doctor assigned | ✅ | ✅ | — | — |
| Doctor needs more info | ✅ | ✅ | ✅ | — |
| Prescription ready | ✅ | ✅ | — | ✅ PDF |
| Lab tests ordered | ✅ | ✅ | — | — |
| Nurse assigned | ✅ | ✅ | ✅ | — |
| Nurse arriving (15 min) | ✅ | ✅ | ✅ | — |
| Lab results ready | ✅ | ✅ | — | ✅ |
| Doctor reviewed results | ✅ | ✅ | — | — |
| Order dispatched | ✅ | ✅ | — | — |
| Out for delivery | ✅ | ✅ | ✅ | — |
| Delivery confirmed | ✅ | — | — | ✅ receipt |
| Payment received | ✅ | — | — | ✅ receipt |
| Payment failed | ✅ | ✅ | ✅ | ✅ |
| Subscription renewal (3 days) | ✅ | ✅ | — | — |
| Follow-up check-in due | ✅ | ✅ | — | — |
| Daily medication reminder | ✅ | — | — | — |
| New message from doctor | ✅ | ✅ | — | — |

---

*End of BACKEND.md Part 2a (Sections 11–15). Continue with Part 2b for sections 16–20 (Messaging, Wallet & Referrals, Admin, Background Jobs, File Storage & Document Delivery).*
