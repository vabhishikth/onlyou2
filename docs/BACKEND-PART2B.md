# BACKEND.md — Part 2b of 3: Business Logic Modules (Sections 16–20)

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

### Part 2a — Business Logic: Orders, Labs, Nurse, Payments, Notifications (BACKEND-PART2A.md)
11. Orders Module (Medication Delivery)
12. Lab Orders Module (Sample Tracking)
13. Nurse Module (Visits & Assignments)
14. Payments Module (Razorpay/UPI)
15. Notifications Module (WhatsApp/SMS/FCM/Email)

### Part 2b — Business Logic: Messaging, Wallet, Admin, Jobs, Storage (this document)
16. [Messaging Module (Doctor-Patient Chat + SSE)](#16-messaging-module-doctor-patient-chat--sse)
17. [Wallet & Referrals Module](#17-wallet--referrals-module)
18. [Admin Module (Partners, SLA Engine, Dashboard)](#18-admin-module-partners-sla-engine-dashboard)
19. [Background Jobs (BullMQ Queues & Processors)](#19-background-jobs-bullmq-queues--processors)
20. [File Storage & Document Delivery (S3/CloudFront)](#20-file-storage--document-delivery-s3cloudfront)

### Part 3 — Security, Ops & Testing
21–30. (See BACKEND-PART1.md for full TOC)

---

## 16. Messaging Module (Doctor-Patient Chat + SSE)

### 16.1 Architecture

The messaging system uses **SSE downstream + HTTP POST upstream**:
- Patient/doctor sends message → tRPC mutation (HTTP POST) → stored in DB → event emitted
- Event → Redis Pub/Sub → SSE pushes message to all connected clients for that consultation
- No WebSockets — SSE handles all server→client push without sticky sessions

**File structure:**
```
src/modules/messaging/
├── messaging.module.ts
├── messaging.service.ts     → Message CRUD, read receipts, canned responses
├── messaging.router.ts      → tRPC procedures
└── sse.gateway.ts           → SSE endpoint for real-time message delivery
```

### 16.2 Prisma Schema

```prisma
model Message {
  id               String       @id @default(uuid())
  consultationId   String
  consultation     Consultation @relation(fields: [consultationId], references: [id])
  senderId         String       // userId of sender (patient or doctor)
  senderRole       Role         // PATIENT | DOCTOR
  type             MessageType  @default(TEXT)
  content          String?      // Text content (nullable for IMAGE/FILE types)
  s3Key            String?      // For IMAGE/FILE attachments
  metadata         Json?        // { fileName, fileSize, mimeType } for files
  readAt           DateTime?    // When recipient read the message
  createdAt        DateTime     @default(now())

  @@index([consultationId, createdAt])
  @@index([senderId])
}

enum MessageType {
  TEXT
  IMAGE
  FILE         // Lab results, prescriptions shared in chat
  SYSTEM       // Auto-generated: "Dr. Patel prescribed medications", "Lab results are ready"
  CANNED       // From doctor's canned response library
}

model CannedResponse {
  id        String   @id @default(uuid())
  doctorId  String
  doctor    User     @relation(fields: [doctorId], references: [id])
  label     String   // Max 30 chars — shown as chip text
  content   String   // Max 500 chars — full message body
  sortOrder Int      @default(0)
  isSystem  Boolean  @default(false) // System defaults cannot be edited/deleted
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([doctorId, sortOrder])
}
```

### 16.3 Service Implementation

```typescript
// messaging/messaging.service.ts
@Injectable()
export class MessagingService {
  constructor(
    private prisma: PrismaClient,
    private eventEmitter: EventEmitter2,
    private redis: RedisService,
  ) {}

  // ─── SEND MESSAGE ───
  async sendMessage(input: {
    consultationId: string;
    senderId: string;
    senderRole: 'PATIENT' | 'DOCTOR';
    type: 'TEXT' | 'IMAGE' | 'FILE' | 'CANNED';
    content?: string;
    s3Key?: string;
    metadata?: Record<string, any>;
  }): Promise<Message> {
    // Verify sender belongs to this consultation
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: input.consultationId },
      select: { patientId: true, doctorId: true, status: true },
    });

    if (!consultation) throw new TRPCError({ code: 'NOT_FOUND' });

    // Verify sender is participant
    if (input.senderRole === 'PATIENT' && consultation.patientId !== input.senderId) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    if (input.senderRole === 'DOCTOR' && consultation.doctorId !== input.senderId) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    // Block messaging if consultation is in terminal state
    const terminalStatuses = ['COMPLETED', 'CANCELLED', 'REFERRED'];
    if (terminalStatuses.includes(consultation.status)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot send messages to a closed consultation.' });
    }

    const message = await this.prisma.message.create({
      data: {
        consultationId: input.consultationId,
        senderId: input.senderId,
        senderRole: input.senderRole,
        type: input.type,
        content: input.content,
        s3Key: input.s3Key,
        metadata: input.metadata ?? undefined,
      },
    });

    // Emit for SSE delivery + notifications
    this.eventEmitter.emit('message.sent', {
      messageId: message.id,
      consultationId: input.consultationId,
      senderId: input.senderId,
      senderRole: input.senderRole,
      type: input.type,
      content: input.content,
      createdAt: message.createdAt,
    });

    return message;
  }

  // ─── SYSTEM MESSAGE (auto-generated) ───
  async sendSystemMessage(consultationId: string, content: string): Promise<void> {
    await this.prisma.message.create({
      data: {
        consultationId,
        senderId: 'SYSTEM',
        senderRole: 'DOCTOR', // System messages appear on doctor's side of chat
        type: 'SYSTEM',
        content,
      },
    });

    this.eventEmitter.emit('message.sent', {
      messageId: 'system',
      consultationId,
      senderId: 'SYSTEM',
      senderRole: 'SYSTEM',
      type: 'SYSTEM',
      content,
      createdAt: new Date(),
    });
  }

  // ─── GET MESSAGES (paginated) ───
  async getMessages(consultationId: string, cursor?: string, limit = 30): Promise<{
    messages: Message[];
    nextCursor: string | null;
  }> {
    const messages = await this.prisma.message.findMany({
      where: { consultationId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' }, // Newest first, client reverses for display
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    return {
      messages,
      nextCursor: hasMore ? messages[messages.length - 1].id : null,
    };
  }

  // ─── MARK AS READ ───
  async markAsRead(consultationId: string, readerId: string): Promise<void> {
    // Mark all unread messages from the OTHER participant as read
    await this.prisma.message.updateMany({
      where: {
        consultationId,
        senderId: { not: readerId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    this.eventEmitter.emit('message.read', {
      consultationId,
      readerId,
      readAt: new Date(),
    });
  }

  // ─── UNREAD COUNT ───
  async getUnreadCount(consultationId: string, userId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        consultationId,
        senderId: { not: userId },
        readAt: null,
      },
    });
  }

  // ─── CANNED RESPONSES ───
  async getCannedResponses(doctorId: string): Promise<CannedResponse[]> {
    return this.prisma.cannedResponse.findMany({
      where: { doctorId },
      orderBy: [{ isSystem: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  async createCannedResponse(doctorId: string, label: string, content: string): Promise<CannedResponse> {
    // Max 20 custom canned responses per doctor
    const count = await this.prisma.cannedResponse.count({
      where: { doctorId, isSystem: false },
    });
    if (count >= 20) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Maximum 20 custom canned responses.' });
    }

    return this.prisma.cannedResponse.create({
      data: { doctorId, label, content, isSystem: false, sortOrder: count },
    });
  }

  async updateCannedResponse(id: string, doctorId: string, label: string, content: string): Promise<CannedResponse> {
    const existing = await this.prisma.cannedResponse.findUnique({ where: { id } });
    if (!existing || existing.doctorId !== doctorId) throw new TRPCError({ code: 'NOT_FOUND' });
    if (existing.isSystem) throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot edit system defaults.' });

    return this.prisma.cannedResponse.update({
      where: { id },
      data: { label, content },
    });
  }

  async deleteCannedResponse(id: string, doctorId: string): Promise<void> {
    const existing = await this.prisma.cannedResponse.findUnique({ where: { id } });
    if (!existing || existing.doctorId !== doctorId) throw new TRPCError({ code: 'NOT_FOUND' });
    if (existing.isSystem) throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot delete system defaults.' });

    await this.prisma.cannedResponse.delete({ where: { id } });
  }

  // ─── SEED SYSTEM CANNED RESPONSES ───
  // Called when doctor first created — creates default canned responses
  async seedSystemCannedResponses(doctorId: string): Promise<void> {
    const systemDefaults = [
      { label: 'Results look good', content: 'Your results look good. I\'ll be preparing your treatment plan shortly.' },
      { label: 'Need more photos', content: 'I need a few more photos to complete my assessment. Please upload clear, well-lit photos as described in the app instructions.' },
      { label: 'Schedule follow-up', content: 'I\'d like to schedule a follow-up check-in to monitor your progress. Please complete the check-in questionnaire when it becomes available.' },
      { label: 'Lab work required', content: 'I\'m ordering some blood tests to complete your assessment. You\'ll receive instructions for booking a home collection.' },
      { label: 'Side effects normal', content: 'The side effects you\'re describing are within the expected range for this medication. They typically improve within 2-4 weeks. If they persist or worsen, please let me know immediately.' },
      { label: 'Stop medication', content: 'Please stop taking [medication] immediately and let me know if symptoms improve. I\'ll review your case and adjust your treatment plan.' },
    ];

    await this.prisma.cannedResponse.createMany({
      data: systemDefaults.map((d, i) => ({
        doctorId,
        label: d.label,
        content: d.content,
        isSystem: true,
        sortOrder: i,
      })),
    });
  }
}
```

### 16.4 SSE Gateway

```typescript
// messaging/sse.gateway.ts
import { Controller, Get, Req, Res } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';

@Controller('api/sse')
export class SseGateway {
  private subscriber: Redis;
  private connections: Map<string, FastifyReply[]> = new Map(); // channelId → connected clients

  constructor(private redis: RedisService) {
    this.subscriber = this.redis.createSubscriber();
    this.setupSubscriber();
  }

  private setupSubscriber() {
    this.subscriber.on('message', (channel, message) => {
      const clients = this.connections.get(channel) || [];
      const data = JSON.parse(message);

      clients.forEach((reply) => {
        try {
          reply.raw.write(`id: ${data.id}\nevent: ${data.event}\ndata: ${JSON.stringify(data.payload)}\n\n`);
        } catch {
          // Client disconnected, will be cleaned up
        }
      });
    });
  }

  // ─── PATIENT SSE ───
  @Get('patient')
  async patientSSE(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const userId = req.user.id; // From JWT middleware
    const channel = `patient:${userId}`;

    this.setupSSEConnection(reply, channel);
    await this.subscriber.subscribe(channel);

    req.raw.on('close', () => this.cleanupConnection(reply, channel));
  }

  // ─── DOCTOR SSE ───
  @Get('doctor')
  async doctorSSE(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const userId = req.user.id;
    const channel = `doctor:${userId}`;

    this.setupSSEConnection(reply, channel);
    await this.subscriber.subscribe(channel);

    req.raw.on('close', () => this.cleanupConnection(reply, channel));
  }

  // ─── ADMIN SSE ───
  @Get('admin')
  async adminSSE(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const channel = `admin:global`; // All admins share one channel

    this.setupSSEConnection(reply, channel);
    await this.subscriber.subscribe(channel);

    req.raw.on('close', () => this.cleanupConnection(reply, channel));
  }

  // ─── NURSE SSE ───
  @Get('nurse')
  async nurseSSE(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const userId = req.user.id;
    const channel = `nurse:${userId}`;

    this.setupSSEConnection(reply, channel);
    await this.subscriber.subscribe(channel);

    req.raw.on('close', () => this.cleanupConnection(reply, channel));
  }

  // ─── LAB SSE ───
  @Get('lab')
  async labSSE(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const labId = req.user.diagnosticCentreId;
    const channel = `lab:${labId}`;

    this.setupSSEConnection(reply, channel);
    await this.subscriber.subscribe(channel);

    req.raw.on('close', () => this.cleanupConnection(reply, channel));
  }

  // ─── PHARMACY SSE ───
  @Get('pharmacy')
  async pharmacySSE(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const pharmacyId = req.user.pharmacyId;
    const channel = `pharmacy:${pharmacyId}`;

    this.setupSSEConnection(reply, channel);
    await this.subscriber.subscribe(channel);

    req.raw.on('close', () => this.cleanupConnection(reply, channel));
  }

  // ─── SHARED HELPERS ───
  private setupSSEConnection(reply: FastifyReply, channel: string) {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx: disable proxy buffering
    });

    // Send initial heartbeat
    reply.raw.write(`:heartbeat\n\n`);

    // Store connection
    const existing = this.connections.get(channel) || [];
    existing.push(reply);
    this.connections.set(channel, existing);
  }

  private cleanupConnection(reply: FastifyReply, channel: string) {
    const existing = this.connections.get(channel) || [];
    this.connections.set(channel, existing.filter((r) => r !== reply));

    // If no more clients on this channel, unsubscribe
    if (this.connections.get(channel)?.length === 0) {
      this.subscriber.unsubscribe(channel);
      this.connections.delete(channel);
    }
  }
}
```

### 16.5 SSE Event Publisher (used by all modules)

```typescript
// messaging/sse-publisher.service.ts
@Injectable()
export class SsePublisherService {
  private publisher: Redis;
  private eventCounter = 0;

  constructor(private redis: RedisService) {
    this.publisher = this.redis.createClient();
  }

  // Publish event to a specific channel
  async publish(channel: string, event: string, payload: Record<string, any>): Promise<void> {
    const id = `${Date.now()}-${++this.eventCounter}`;
    await this.publisher.publish(channel, JSON.stringify({ id, event, payload }));

    // Also store in Redis list for catch-up on reconnection (buffer: 500 per channel)
    const bufferKey = `sse:buffer:${channel}`;
    await this.publisher.lpush(bufferKey, JSON.stringify({ id, event, payload, timestamp: Date.now() }));
    await this.publisher.ltrim(bufferKey, 0, 499);
    await this.publisher.expire(bufferKey, 86400); // 24-hour TTL
  }

  // Get missed events since a given event ID (for Last-Event-ID reconnection)
  async getMissedEvents(channel: string, lastEventId: string): Promise<any[]> {
    const bufferKey = `sse:buffer:${channel}`;
    const events = await this.publisher.lrange(bufferKey, 0, -1);
    const parsed = events.map((e) => JSON.parse(e)).reverse(); // Oldest first

    const lastIndex = parsed.findIndex((e) => e.id === lastEventId);
    if (lastIndex === -1) return parsed; // Gap too large, return all buffered
    return parsed.slice(lastIndex + 1);
  }
}
```

### 16.6 SSE Events Matrix (All Channels)

| Channel | Events Received |
|---------|----------------|
| `patient:{userId}` | `message.received`, `message.read`, `consultation.status_changed`, `order.status_changed`, `lab_order.status_changed`, `prescription.created`, `payment.status_changed` |
| `doctor:{userId}` | `case.assigned`, `case.patient_responded`, `case.message_received`, `case.lab_results_ready`, `case.status_changed`, `case.reassigned`, `sla.warning` |
| `admin:global` | ALL system events — `consultation.*`, `lab_order.*`, `delivery.*`, `sla.*`, `refund.*`, `payment.*`, `partner.*` |
| `nurse:{userId}` | `assignment.new`, `assignment.cancelled`, `assignment.rescheduled`, `patient.confirmed_slot`, `visit.reminder`, `sla.warning` |
| `lab:{labId}` | `sample.incoming`, `sample.arrived`, `sample.issue`, `order.cancelled` |
| `pharmacy:{pharmacyId}` | `order.new`, `order.cancelled`, `order.reassigned` |

### 16.7 SSE Reconnection & Buffer

- **Buffer:** 500 events per channel (Redis list with LTRIM)
- **Reconnection:** Client sends `Last-Event-ID` header → server replays missed events
- **Gap too large (>500 missed):** Server returns all buffered events → client does full data refresh via API
- **Heartbeat:** Every 30 seconds → `:heartbeat\n\n` (keeps connection alive through proxies/ALB)
- **ALB idle timeout:** Set to 120 seconds (SSE heartbeat at 30s ensures connection stays alive)
- **No sticky sessions:** SSE over standard HTTP — ALB routes normally

### 16.8 tRPC Router

```typescript
// messaging/messaging.router.ts
export const messagingRouter = router({
  // ─── MESSAGES ───
  send: protectedProcedure
    .input(z.object({
      consultationId: z.string().uuid(),
      type: z.enum(['TEXT', 'IMAGE', 'FILE', 'CANNED']),
      content: z.string().max(2000).optional(),
      s3Key: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.messagingService.sendMessage({
        ...input,
        senderId: ctx.user.id,
        senderRole: ctx.user.role,
      })
    ),

  getMessages: protectedProcedure
    .input(z.object({
      consultationId: z.string().uuid(),
      cursor: z.string().uuid().optional(),
      limit: z.number().min(1).max(50).default(30),
    }))
    .query(({ ctx, input }) =>
      ctx.messagingService.getMessages(input.consultationId, input.cursor, input.limit)
    ),

  markAsRead: protectedProcedure
    .input(z.object({ consultationId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      ctx.messagingService.markAsRead(input.consultationId, ctx.user.id)
    ),

  getUnreadCount: protectedProcedure
    .input(z.object({ consultationId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      ctx.messagingService.getUnreadCount(input.consultationId, ctx.user.id)
    ),

  // Patient: get total unread across all active consultations
  getTotalUnread: protectedProcedure
    .query(async ({ ctx }) => {
      const consultations = await ctx.prisma.consultation.findMany({
        where: { patientId: ctx.user.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        select: { id: true },
      });
      let total = 0;
      for (const c of consultations) {
        total += await ctx.messagingService.getUnreadCount(c.id, ctx.user.id);
      }
      return { count: total };
    }),

  // ─── CANNED RESPONSES (Doctor only) ───
  cannedResponses: router({
    list: protectedProcedure
      .use(requireRole('DOCTOR'))
      .query(({ ctx }) => ctx.messagingService.getCannedResponses(ctx.user.id)),

    create: protectedProcedure
      .use(requireRole('DOCTOR'))
      .input(z.object({
        label: z.string().min(1).max(30),
        content: z.string().min(1).max(500),
      }))
      .mutation(({ ctx, input }) =>
        ctx.messagingService.createCannedResponse(ctx.user.id, input.label, input.content)
      ),

    update: protectedProcedure
      .use(requireRole('DOCTOR'))
      .input(z.object({
        id: z.string().uuid(),
        label: z.string().min(1).max(30),
        content: z.string().min(1).max(500),
      }))
      .mutation(({ ctx, input }) =>
        ctx.messagingService.updateCannedResponse(input.id, ctx.user.id, input.label, input.content)
      ),

    delete: protectedProcedure
      .use(requireRole('DOCTOR'))
      .input(z.object({ id: z.string().uuid() }))
      .mutation(({ ctx, input }) =>
        ctx.messagingService.deleteCannedResponse(input.id, ctx.user.id)
      ),
  }),
});
```

### 16.9 Events Emitted

| Event | Trigger | Payload |
|-------|---------|---------|
| `message.sent` | New message created | `{ messageId, consultationId, senderId, senderRole, type, content, createdAt }` |
| `message.read` | Recipient viewed messages | `{ consultationId, readerId, readAt }` |

**Event Listeners (in NotificationsService):**
- `message.sent` where senderRole=DOCTOR → push notification to patient (WhatsApp + FCM)
- `message.sent` where senderRole=PATIENT → SSE to doctor + push if doctor offline
- `message.sent` where type=SYSTEM → SSE only (no push notifications for system messages)

---

## 17. Wallet & Referrals Module

### 17.1 Wallet Overview

The wallet is a **credit-only** system — patients cannot top up with cash. Credits come exclusively from refunds, promotional campaigns, and referral bonuses. Wallet balance is auto-applied at manual checkout but **never** deducted from Razorpay subscription auto-renewals.

**File structure:**
```
src/modules/wallet/
├── wallet.module.ts
├── wallet.service.ts
└── wallet.router.ts

src/modules/referrals/
├── referrals.module.ts
├── referrals.service.ts
└── referrals.router.ts
```

### 17.2 Prisma Schema

```prisma
model Wallet {
  id        String   @id @default(uuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  balance   Int      @default(0) // In paisa (₹1 = 100 paisa)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model WalletTransaction {
  id          String              @id @default(uuid())
  walletId    String
  wallet      Wallet              @relation(fields: [walletId], references: [id])
  type        WalletTransactionType
  amount      Int                 // In paisa — always positive
  balanceAfter Int                // Balance after this transaction (paisa)
  reason      WalletTransactionReason
  description String              // Human-readable: "Refund for cancelled order ORD-0042"
  referenceId String?             // Links to Order, RefundRequest, PromoCode, etc.
  createdAt   DateTime            @default(now())

  @@index([walletId, createdAt(sort: Desc)])
}

enum WalletTransactionType {
  CREDIT
  DEBIT
}

enum WalletTransactionReason {
  REFUND                // Order/subscription cancellation refund
  PROMO_CREDIT          // Promotional campaign credit
  REFERRAL_BONUS        // Referral program reward
  WELCOME_BONUS         // New user welcome credit
  PAYMENT_DEDUCTION     // Used wallet balance at checkout
  ADMIN_ADJUSTMENT      // Manual admin credit/debit
}

model PromoCode {
  id            String     @id @default(uuid())
  code          String     @unique // e.g., "WELCOME200", "HAIR50"
  type          PromoType
  value         Int        // In paisa for FLAT, percentage for PERCENT
  maxDiscount   Int?       // Cap for PERCENT type (paisa)
  minOrderValue Int?       // Minimum order value to apply (paisa)
  maxUses       Int?       // Total uses allowed (null = unlimited)
  usedCount     Int        @default(0)
  maxUsesPerUser Int       @default(1)
  validFrom     DateTime
  validUntil    DateTime
  conditions    Json?      // { verticals: ['HAIR_LOSS'], planTypes: ['MONTHLY'] }
  isActive      Boolean    @default(true)
  createdAt     DateTime   @default(now())

  @@index([code])
  @@index([isActive, validUntil])
}

enum PromoType {
  FLAT        // Fixed amount off (e.g., ₹200 off)
  PERCENT     // Percentage off (e.g., 10% off, max ₹500)
  WALLET      // Credit added to wallet (not applied at checkout)
}

model Referral {
  id              String        @id @default(uuid())
  consultationId  String?
  consultation    Consultation? @relation(fields: [consultationId], references: [id])
  referringDoctorId String
  referringDoctor   User        @relation("ReferralDoctor", fields: [referringDoctorId], references: [id])
  patientId       String
  patient         User          @relation("ReferralPatient", fields: [patientId], references: [id])
  clinicId        String?
  clinic          ReferralClinic? @relation(fields: [clinicId], references: [id])
  reason          String        // Doctor's reason for referral
  speciality      String?       // e.g., "Dermatologist", "Endocrinologist"
  urgency         ReferralUrgency @default(ROUTINE)
  patientNotes    String?       // Instructions for the patient
  status          ReferralStatus @default(CREATED)
  closeConsultation Boolean     @default(false)
  createdAt       DateTime      @default(now())

  @@index([patientId])
  @@index([consultationId])
}

enum ReferralUrgency {
  ROUTINE       // Within 2 weeks
  URGENT        // Within 48 hours
  EMERGENCY     // Immediate (rare in telehealth)
}

enum ReferralStatus {
  CREATED
  ACKNOWLEDGED  // Patient viewed the referral
  COMPLETED     // Patient confirmed they visited
  EXPIRED       // 30 days with no action
}
```

### 17.3 Wallet Service

```typescript
// wallet/wallet.service.ts
@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaClient,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── GET OR CREATE WALLET ───
  async getWallet(userId: string): Promise<Wallet> {
    return this.prisma.wallet.upsert({
      where: { userId },
      create: { userId, balance: 0 },
      update: {},
    });
  }

  // ─── CREDIT (refund, promo, referral) ───
  async credit(input: {
    userId: string;
    amount: number; // In paisa
    reason: WalletTransactionReason;
    description: string;
    referenceId?: string;
  }): Promise<WalletTransaction> {
    if (input.amount <= 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Amount must be positive.' });

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: input.userId },
        create: { userId: input.userId, balance: 0 },
        update: {},
      });

      const newBalance = wallet.balance + input.amount;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      const txn = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount: input.amount,
          balanceAfter: newBalance,
          reason: input.reason,
          description: input.description,
          referenceId: input.referenceId,
        },
      });

      this.eventEmitter.emit('wallet.credited', {
        userId: input.userId,
        amount: input.amount,
        reason: input.reason,
        newBalance,
      });

      return txn;
    });
  }

  // ─── DEBIT (checkout) ───
  async debit(input: {
    userId: string;
    amount: number;
    description: string;
    referenceId?: string;
  }): Promise<WalletTransaction> {
    if (input.amount <= 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Amount must be positive.' });

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: input.userId } });
      if (!wallet || wallet.balance < input.amount) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient wallet balance.' });
      }

      const newBalance = wallet.balance - input.amount;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount: input.amount,
          balanceAfter: newBalance,
          reason: 'PAYMENT_DEDUCTION',
          description: input.description,
          referenceId: input.referenceId,
        },
      });
    });
  }

  // ─── GET TRANSACTION HISTORY ───
  async getTransactions(userId: string, cursor?: string, limit = 20): Promise<{
    transactions: WalletTransaction[];
    nextCursor: string | null;
  }> {
    const wallet = await this.getWallet(userId);

    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = transactions.length > limit;
    if (hasMore) transactions.pop();

    return {
      transactions,
      nextCursor: hasMore ? transactions[transactions.length - 1].id : null,
    };
  }

  // ─── VALIDATE PROMO CODE ───
  async validatePromoCode(code: string, userId: string, orderValue: number, vertical?: string, planType?: string): Promise<{
    valid: boolean;
    discount: number; // In paisa
    message?: string;
  }> {
    const promo = await this.prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });

    if (!promo || !promo.isActive) return { valid: false, discount: 0, message: 'Invalid promo code.' };
    if (new Date() < promo.validFrom || new Date() > promo.validUntil) return { valid: false, discount: 0, message: 'Promo code expired.' };
    if (promo.maxUses && promo.usedCount >= promo.maxUses) return { valid: false, discount: 0, message: 'Promo code fully redeemed.' };
    if (promo.minOrderValue && orderValue < promo.minOrderValue) {
      return { valid: false, discount: 0, message: `Minimum order value ₹${promo.minOrderValue / 100} required.` };
    }

    // Check per-user usage
    const userUsage = await this.prisma.walletTransaction.count({
      where: { wallet: { userId }, referenceId: promo.id, reason: 'PROMO_CREDIT' },
    });
    if (userUsage >= promo.maxUsesPerUser) return { valid: false, discount: 0, message: 'You\'ve already used this code.' };

    // Check vertical/plan conditions
    if (promo.conditions) {
      const conditions = promo.conditions as { verticals?: string[]; planTypes?: string[] };
      if (conditions.verticals && vertical && !conditions.verticals.includes(vertical)) {
        return { valid: false, discount: 0, message: 'Code not valid for this condition.' };
      }
      if (conditions.planTypes && planType && !conditions.planTypes.includes(planType)) {
        return { valid: false, discount: 0, message: 'Code not valid for this plan type.' };
      }
    }

    // Calculate discount
    let discount = 0;
    if (promo.type === 'FLAT') {
      discount = Math.min(promo.value, orderValue);
    } else if (promo.type === 'PERCENT') {
      discount = Math.floor(orderValue * promo.value / 100);
      if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
    } else if (promo.type === 'WALLET') {
      discount = 0; // WALLET promos add credits post-purchase, not at checkout
    }

    return { valid: true, discount };
  }

  // ─── APPLY PROMO CODE ───
  async applyPromoCode(code: string, userId: string): Promise<void> {
    const promo = await this.prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!promo) return;

    await this.prisma.promoCode.update({
      where: { id: promo.id },
      data: { usedCount: { increment: 1 } },
    });

    // For WALLET type promos, credit wallet
    if (promo.type === 'WALLET') {
      await this.credit({
        userId,
        amount: promo.value,
        reason: 'PROMO_CREDIT',
        description: `Promo code ${promo.code} applied`,
        referenceId: promo.id,
      });
    }
  }

  // ─── REFUND SCENARIOS (event listeners) ───

  // Called by PaymentsService when refund approved
  async processRefundToWallet(userId: string, amount: number, reason: string, referenceId: string): Promise<void> {
    await this.credit({
      userId,
      amount,
      reason: 'REFUND',
      description: reason,
      referenceId,
    });
  }
}
```

### 17.4 Refund Policy Table

| Scenario | Refund % | Destination |
|----------|----------|-------------|
| Cancellation before doctor review | 100% | Wallet |
| Cancellation after doctor review, before pharmacy | 75% | Wallet |
| Cancellation after medication dispatched | 0% | — |
| Delivery failed (platform fault) | 100% | Wallet or original payment |
| Wrong medication delivered | 100% + replacement | Wallet + new order |
| Subscription cancelled mid-cycle | Prorated remaining days | Wallet |
| Lab order cancelled before nurse dispatch | 100% | Wallet |
| Lab order cancelled after nurse dispatched | 50% | Wallet |

### 17.5 Referrals Service

```typescript
// referrals/referrals.service.ts
@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaClient,
    private eventEmitter: EventEmitter2,
  ) {}

  async createReferral(input: {
    consultationId?: string;
    referringDoctorId: string;
    patientId: string;
    clinicId?: string;
    reason: string;
    speciality?: string;
    urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
    patientNotes?: string;
    closeConsultation: boolean;
  }): Promise<Referral> {
    const referral = await this.prisma.referral.create({ data: input });

    // If closing consultation, update status
    if (input.closeConsultation && input.consultationId) {
      await this.prisma.consultation.update({
        where: { id: input.consultationId },
        data: { status: 'REFERRED' },
      });
    }

    this.eventEmitter.emit('referral.created', {
      referralId: referral.id,
      patientId: input.patientId,
      clinicId: input.clinicId,
      urgency: input.urgency,
    });

    return referral;
  }

  async acknowledgeReferral(referralId: string, patientId: string): Promise<void> {
    await this.prisma.referral.update({
      where: { id: referralId, patientId },
      data: { status: 'ACKNOWLEDGED' },
    });
  }

  async completeReferral(referralId: string, patientId: string): Promise<void> {
    await this.prisma.referral.update({
      where: { id: referralId, patientId },
      data: { status: 'COMPLETED' },
    });
  }
}
```

### 17.6 tRPC Router

```typescript
// wallet/wallet.router.ts
export const walletRouter = router({
  getBalance: protectedProcedure
    .use(requireRole('PATIENT'))
    .query(async ({ ctx }) => {
      const wallet = await ctx.walletService.getWallet(ctx.user.id);
      return { balance: wallet.balance };
    }),

  getTransactions: protectedProcedure
    .use(requireRole('PATIENT'))
    .input(z.object({
      cursor: z.string().uuid().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(({ ctx, input }) =>
      ctx.walletService.getTransactions(ctx.user.id, input.cursor, input.limit)
    ),

  validatePromo: protectedProcedure
    .use(requireRole('PATIENT'))
    .input(z.object({
      code: z.string().min(1).max(20),
      orderValue: z.number().positive(),
      vertical: z.string().optional(),
      planType: z.string().optional(),
    }))
    .query(({ ctx, input }) =>
      ctx.walletService.validatePromoCode(input.code, ctx.user.id, input.orderValue, input.vertical, input.planType)
    ),
});

// referrals/referrals.router.ts
export const referralsRouter = router({
  create: protectedProcedure
    .use(requireRole('DOCTOR'))
    .input(z.object({
      consultationId: z.string().uuid().optional(),
      patientId: z.string().uuid(),
      clinicId: z.string().uuid().optional(),
      reason: z.string().min(1).max(1000),
      speciality: z.string().max(100).optional(),
      urgency: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']),
      patientNotes: z.string().max(500).optional(),
      closeConsultation: z.boolean(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.referralsService.createReferral({ ...input, referringDoctorId: ctx.user.id })
    ),

  acknowledge: protectedProcedure
    .use(requireRole('PATIENT'))
    .input(z.object({ referralId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      ctx.referralsService.acknowledgeReferral(input.referralId, ctx.user.id)
    ),

  complete: protectedProcedure
    .use(requireRole('PATIENT'))
    .input(z.object({ referralId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      ctx.referralsService.completeReferral(input.referralId, ctx.user.id)
    ),
});
```

### 17.7 Events Emitted

| Event | Trigger | Payload |
|-------|---------|---------|
| `wallet.credited` | Refund/promo/bonus credited | `{ userId, amount, reason, newBalance }` |
| `referral.created` | Doctor creates referral | `{ referralId, patientId, clinicId, urgency }` |

---

## 18. Admin Module (Partners, SLA Engine, Dashboard)

### 18.1 Overview

The Admin module powers the coordinator dashboard — the nerve center for managing all platform operations. It handles partner CRUD, SLA enforcement, dashboard statistics, refund approvals, and system configuration.

**File structure:**
```
src/modules/admin/
├── admin.module.ts
├── admin.service.ts         → Partner CRUD, dashboard stats, user management
├── admin.router.ts
└── sla/
    ├── sla.service.ts       → Threshold checks, escalation triggers
    └── sla.config.ts        → All SLA thresholds (configurable)
```

### 18.2 Prisma Schema (Partner Models)

```prisma
model Pharmacy {
  id              String    @id @default(uuid())
  name            String
  contactPerson   String
  phone           String
  whatsappPhone   String?
  email           String?
  address         String
  area            String    // For proximity matching
  city            String
  pincode         String
  licenseNumber   String
  gstNumber       String?
  isActive        Boolean   @default(true)
  notes           String?
  orders          Order[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([isActive, area])
}

model DiagnosticCentre {
  id              String     @id @default(uuid())
  name            String
  contactPerson   String
  phone           String
  whatsappPhone   String?
  email           String?
  address         String
  area            String
  city            String
  pincode         String
  licenseNumber   String
  nabhlAccredited Boolean    @default(false)
  testsOffered    String[]   // e.g., ['CBC', 'TSH', 'Testosterone', 'Ferritin']
  isActive        Boolean    @default(true)
  notes           String?
  labOrders       LabOrder[]
  labStaff        User[]     // Lab portal users
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@index([isActive, area])
}

model Nurse {
  id              String      @id @default(uuid())
  userId          String      @unique
  user            User        @relation(fields: [userId], references: [id])
  phone           String
  whatsappPhone   String?
  address         String
  area            String      // Primary service area
  city            String
  pincode         String
  certificationNumber String
  certificationExpiry DateTime
  isActive        Boolean     @default(true)
  notes           String?
  visits          NurseVisit[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([isActive, area])
}

model ReferralClinic {
  id              String     @id @default(uuid())
  name            String
  speciality      String     // e.g., "Dermatology", "Endocrinology"
  contactPerson   String
  phone           String
  email           String?
  address         String
  area            String
  city            String
  isPartner       Boolean    @default(false) // Partner = receives notifications
  isActive        Boolean    @default(true)
  referrals       Referral[]
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}

model SystemEvent {
  id           String          @id @default(uuid())
  type         String          // e.g., 'consultation.submitted', 'sla.breach'
  severity     EventSeverity
  title        String          // Human-readable summary
  resourceType String          // CONSULTATION | LAB_ORDER | ORDER | PARTNER | REFUND | SYSTEM
  resourceId   String?
  metadata     Json?           // Event-specific details
  readAt       DateTime?
  createdAt    DateTime        @default(now())

  @@index([type, createdAt(sort: Desc)])
  @@index([severity, readAt])
}

enum EventSeverity {
  INFO
  WARNING
  CRITICAL
}

model AuditLog {
  id           String   @id @default(uuid())
  userId       String?
  userRole     String?
  action       String   // e.g., 'prescription.created', 'partner.deactivated'
  resourceType String
  resourceId   String?
  ipAddress    String?
  userAgent    String?
  changesJson  Json?    // Before/after values
  createdAt    DateTime @default(now())

  // INSERT-ONLY — no UPDATE or DELETE permissions at DB level
  @@index([action, createdAt(sort: Desc)])
  @@index([userId, createdAt(sort: Desc)])
  @@index([resourceType, resourceId])
}
```

### 18.3 SLA Configuration

```typescript
// admin/sla/sla.config.ts
export const SLA_DEFAULTS = {
  // Consultation pipeline
  DOCTOR_FIRST_REVIEW_HOURS: 24,        // Doctor must review within 24 hours of assignment
  DOCTOR_CASE_ACTION_HOURS: 48,         // Doctor must take action within 48 hours of ASSIGNED status
  DOCTOR_INFO_RESPONSE_REVIEW_HOURS: 72, // Doctor must re-review within 72 hours of patient responding to INFO_REQUESTED
  AI_ASSESSMENT_MINUTES: 5,             // AI assessment must complete within 5 minutes

  // Lab pipeline
  NURSE_ASSIGNMENT_HOURS: 2,            // Nurse must be assigned within 2 hours of slot booking
  SAMPLE_COLLECTION_HOURS: 1,           // Nurse must collect within 1 hour of arrival
  LAB_RESULTS_HOURS: 48,               // Lab must upload results within 48 hours
  DOCTOR_LAB_REVIEW_HOURS: 24,          // Doctor must review results within 24 hours
  PATIENT_SLOT_BOOKING_HOURS: 24,       // Patient should book slot within 24 hours (soft SLA)

  // Delivery pipeline
  PHARMACY_START_HOURS: 2,              // Pharmacy must start preparing within 2 hours
  PHARMACY_FINISH_HOURS: 4,             // Pharmacy must finish within 4 hours of start
  DELIVERY_ARRANGEMENT_HOURS: 4,        // Admin must arrange delivery within 4 hours of READY
  DELIVERY_COMPLETION_HOURS: 24,        // Delivery must complete within 24 hours of dispatch

  // Refund pipeline
  REFUND_APPROVAL_HOURS: 24,            // Admin must approve/reject refund within 24 hours

  // Warning threshold (hours before breach to trigger amber warning)
  WARNING_THRESHOLD_HOURS: 2,
};
```

### 18.4 SLA Service

```typescript
// admin/sla/sla.service.ts
@Injectable()
export class SlaService {
  constructor(
    private prisma: PrismaClient,
    private eventEmitter: EventEmitter2,
  ) {}

  // Called by BullMQ repeatable job every 15 minutes
  async checkAllSLAs(): Promise<void> {
    const config = await this.getConfig(); // From DB (admin-editable) with fallback to SLA_DEFAULTS

    await Promise.all([
      this.checkConsultationSLAs(config),
      this.checkLabSLAs(config),
      this.checkDeliverySLAs(config),
      this.checkRefundSLAs(config),
    ]);
  }

  private async checkConsultationSLAs(config: typeof SLA_DEFAULTS): Promise<void> {
    // 1. Find consultations awaiting doctor FIRST REVIEW past SLA (24 hours)
    const overdueConsultations = await this.prisma.consultation.findMany({
      where: {
        status: { in: ['AI_COMPLETE', 'ASSIGNED'] },
        assignedAt: { lt: hoursAgo(config.DOCTOR_FIRST_REVIEW_HOURS) },
      },
      include: { doctor: { select: { id: true, name: true } } },
    });

    for (const c of overdueConsultations) {
      const hoursOverdue = hoursSince(c.assignedAt!);
      await this.createOrUpdateBreach({
        type: 'DOCTOR_REVIEW_OVERDUE',
        resourceType: 'CONSULTATION',
        resourceId: c.id,
        hoursOverdue,
        metadata: { doctorId: c.doctorId, doctorName: c.doctor?.name },
      });
    }

    // 2. Find ASSIGNED consultations with no doctor action past SLA (48 hours)
    const overdueCaseAction = await this.prisma.consultation.findMany({
      where: {
        status: 'ASSIGNED',
        assignedAt: { lt: hoursAgo(config.DOCTOR_CASE_ACTION_HOURS) },
      },
      include: { doctor: { select: { id: true, name: true } } },
    });

    for (const c of overdueCaseAction) {
      const hoursOverdue = hoursSince(c.assignedAt!);
      await this.createOrUpdateBreach({
        type: 'DOCTOR_CASE_ACTION_OVERDUE',
        resourceType: 'CONSULTATION',
        resourceId: c.id,
        hoursOverdue,
        metadata: { doctorId: c.doctorId, doctorName: c.doctor?.name },
      });
    }

    // 3. Find INFO_REQUESTED consultations where patient responded but doctor hasn't re-reviewed (72 hours)
    const overdueInfoResponse = await this.prisma.consultation.findMany({
      where: {
        status: 'INFO_REQUESTED',
        lastPatientResponseAt: {
          not: null,
          lt: hoursAgo(config.DOCTOR_INFO_RESPONSE_REVIEW_HOURS),
        },
      },
      include: { doctor: { select: { id: true, name: true } } },
    });

    for (const c of overdueInfoResponse) {
      const hoursOverdue = hoursSince(c.lastPatientResponseAt!);
      await this.createOrUpdateBreach({
        type: 'DOCTOR_INFO_RESPONSE_REVIEW_OVERDUE',
        resourceType: 'CONSULTATION',
        resourceId: c.id,
        hoursOverdue,
        metadata: { doctorId: c.doctorId, doctorName: c.doctor?.name },
      });
    }

    // 4. Find consultations approaching first review SLA (warning state)
    const warningConsultations = await this.prisma.consultation.findMany({
      where: {
        status: { in: ['AI_COMPLETE', 'ASSIGNED'] },
        assignedAt: {
          lt: hoursAgo(config.DOCTOR_FIRST_REVIEW_HOURS - config.WARNING_THRESHOLD_HOURS),
          gte: hoursAgo(config.DOCTOR_FIRST_REVIEW_HOURS),
        },
      },
    });

    for (const c of warningConsultations) {
      this.eventEmitter.emit('sla.warning', {
        type: 'DOCTOR_REVIEW_APPROACHING',
        resourceType: 'CONSULTATION',
        resourceId: c.id,
        hoursRemaining: config.DOCTOR_FIRST_REVIEW_HOURS - hoursSince(c.assignedAt!),
      });
    }
  }

  private async checkLabSLAs(config: typeof SLA_DEFAULTS): Promise<void> {
    // Lab results overdue
    const overdueResults = await this.prisma.labOrder.findMany({
      where: {
        status: 'PROCESSING',
        processingStartedAt: { lt: hoursAgo(config.LAB_RESULTS_HOURS) },
      },
    });

    for (const lo of overdueResults) {
      await this.createOrUpdateBreach({
        type: 'LAB_RESULTS_OVERDUE',
        resourceType: 'LAB_ORDER',
        resourceId: lo.id,
        hoursOverdue: hoursSince(lo.processingStartedAt!),
      });
    }

    // Nurse assignment overdue
    const overdueNurseAssign = await this.prisma.labOrder.findMany({
      where: {
        status: 'SLOT_BOOKED',
        slotBookedAt: { lt: hoursAgo(config.NURSE_ASSIGNMENT_HOURS) },
      },
    });

    for (const lo of overdueNurseAssign) {
      await this.createOrUpdateBreach({
        type: 'NURSE_ASSIGNMENT_OVERDUE',
        resourceType: 'LAB_ORDER',
        resourceId: lo.id,
        hoursOverdue: hoursSince(lo.slotBookedAt!),
      });
    }

    // Doctor lab review overdue
    const overdueReview = await this.prisma.labOrder.findMany({
      where: {
        status: 'RESULTS_READY',
        resultsUploadedAt: { lt: hoursAgo(config.DOCTOR_LAB_REVIEW_HOURS) },
      },
    });

    for (const lo of overdueReview) {
      await this.createOrUpdateBreach({
        type: 'DOCTOR_LAB_REVIEW_OVERDUE',
        resourceType: 'LAB_ORDER',
        resourceId: lo.id,
        hoursOverdue: hoursSince(lo.resultsUploadedAt!),
      });
    }
  }

  private async checkDeliverySLAs(config: typeof SLA_DEFAULTS): Promise<void> {
    // Pharmacy start overdue
    const overduePharmacyStart = await this.prisma.order.findMany({
      where: {
        status: 'SENT_TO_PHARMACY',
        sentToPharmacyAt: { lt: hoursAgo(config.PHARMACY_START_HOURS) },
      },
    });

    for (const o of overduePharmacyStart) {
      await this.createOrUpdateBreach({
        type: 'PHARMACY_START_OVERDUE',
        resourceType: 'ORDER',
        resourceId: o.id,
        hoursOverdue: hoursSince(o.sentToPharmacyAt!),
      });
    }

    // Delivery arrangement overdue
    const overdueArrangement = await this.prisma.order.findMany({
      where: {
        status: 'READY',
        readyAt: { lt: hoursAgo(config.DELIVERY_ARRANGEMENT_HOURS) },
      },
    });

    for (const o of overdueArrangement) {
      await this.createOrUpdateBreach({
        type: 'DELIVERY_ARRANGEMENT_OVERDUE',
        resourceType: 'ORDER',
        resourceId: o.id,
        hoursOverdue: hoursSince(o.readyAt!),
      });
    }
  }

  private async checkRefundSLAs(config: typeof SLA_DEFAULTS): Promise<void> {
    const overdueRefunds = await this.prisma.refundRequest.findMany({
      where: {
        status: 'PENDING_APPROVAL',
        createdAt: { lt: hoursAgo(config.REFUND_APPROVAL_HOURS) },
      },
    });

    for (const r of overdueRefunds) {
      await this.createOrUpdateBreach({
        type: 'REFUND_APPROVAL_OVERDUE',
        resourceType: 'REFUND',
        resourceId: r.id,
        hoursOverdue: hoursSince(r.createdAt),
      });
    }
  }

  private async createOrUpdateBreach(input: {
    type: string;
    resourceType: string;
    resourceId: string;
    hoursOverdue: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    // Idempotent — don't create duplicate breach events for same resource
    const existing = await this.prisma.systemEvent.findFirst({
      where: {
        type: `sla.breach.${input.type}`,
        resourceId: input.resourceId,
        createdAt: { gte: hoursAgo(24) }, // Within last 24 hours
      },
    });

    if (existing) return; // Already reported

    await this.prisma.systemEvent.create({
      data: {
        type: `sla.breach.${input.type}`,
        severity: 'CRITICAL',
        title: `SLA BREACH: ${input.type.replace(/_/g, ' ')} — ${Math.round(input.hoursOverdue)}h overdue`,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        metadata: { hoursOverdue: input.hoursOverdue, ...input.metadata },
      },
    });

    this.eventEmitter.emit('sla.breach', {
      type: input.type,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      hoursOverdue: input.hoursOverdue,
      metadata: input.metadata,
    });
  }

  // ─── GET CONFIG (admin-editable) ───
  async getConfig(): Promise<typeof SLA_DEFAULTS> {
    const stored = await this.prisma.systemConfig.findUnique({ where: { key: 'sla_thresholds' } });
    if (stored) return { ...SLA_DEFAULTS, ...(stored.value as any) };
    return SLA_DEFAULTS;
  }

  async updateConfig(updates: Partial<typeof SLA_DEFAULTS>): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key: 'sla_thresholds' },
      create: { key: 'sla_thresholds', value: updates },
      update: { value: updates },
    });
  }
}

// ─── Helpers ───
function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function hoursSince(date: Date): number {
  return (Date.now() - date.getTime()) / (60 * 60 * 1000);
}
```

### 18.5 Admin Service

```typescript
// admin/admin.service.ts
@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaClient,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── DASHBOARD STATS ───
  async getOverviewStats(): Promise<{
    activePatients: number;
    pendingReview: number;
    labOrdersInProgress: number;
    deliveriesInProgress: number;
    slaBreaches: number;
    todaysRevenue: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activePatients, pendingReview, labOrders, deliveries, slaBreaches, revenue] = await Promise.all([
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.consultation.count({
        where: { status: { in: ['AI_COMPLETE', 'ASSIGNED'] } },
      }),
      this.prisma.labOrder.count({
        where: {
          status: { in: ['ORDERED', 'SLOT_BOOKED', 'NURSE_ASSIGNED', 'SAMPLE_COLLECTED', 'AT_LAB', 'PROCESSING'] },
        },
      }),
      this.prisma.order.count({
        where: {
          status: { in: ['CREATED', 'SENT_TO_PHARMACY', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] },
        },
      }),
      this.prisma.systemEvent.count({
        where: { severity: 'CRITICAL', type: { startsWith: 'sla.breach' }, readAt: null },
      }),
      this.prisma.razorpayPayment.aggregate({
        where: { status: 'CAPTURED', capturedAt: { gte: today } },
        _sum: { amount: true },
      }),
    ]);

    return {
      activePatients,
      pendingReview,
      labOrdersInProgress: labOrders,
      deliveriesInProgress: deliveries,
      slaBreaches,
      todaysRevenue: revenue._sum.amount || 0,
    };
  }

  // ─── ANALYTICS CHARTS ───
  async getOverviewCharts(): Promise<{
    dailyOrders: { date: string; count: number }[];
    revenueTrend: { date: string; amount: number }[];
    slaCompliance: { onTime: number; warning: number; breach: number };
  }> {
    // 7-day daily orders
    const dailyOrders = await this.prisma.$queryRaw<{ date: string; count: number }[]>`
      SELECT DATE(created_at AT TIME ZONE 'Asia/Kolkata') as date, COUNT(*)::int as count
      FROM "Order"
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at AT TIME ZONE 'Asia/Kolkata')
      ORDER BY date
    `;

    // 30-day revenue trend
    const revenueTrend = await this.prisma.$queryRaw<{ date: string; amount: number }[]>`
      SELECT DATE(captured_at AT TIME ZONE 'Asia/Kolkata') as date, SUM(amount)::int as amount
      FROM "RazorpayPayment"
      WHERE status = 'CAPTURED' AND captured_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(captured_at AT TIME ZONE 'Asia/Kolkata')
      ORDER BY date
    `;

    // 30-day SLA compliance (approximate from SystemEvent counts)
    const totalActions = await this.prisma.systemEvent.count({
      where: { createdAt: { gte: daysAgo(30) } },
    });
    const breaches = await this.prisma.systemEvent.count({
      where: { severity: 'CRITICAL', type: { startsWith: 'sla.breach' }, createdAt: { gte: daysAgo(30) } },
    });
    const warnings = await this.prisma.systemEvent.count({
      where: { severity: 'WARNING', type: { startsWith: 'sla.warning' }, createdAt: { gte: daysAgo(30) } },
    });

    return {
      dailyOrders,
      revenueTrend,
      slaCompliance: {
        onTime: Math.max(0, totalActions - breaches - warnings),
        warning: warnings,
        breach: breaches,
      },
    };
  }

  // ─── ACTIVITY FEED ───
  async getActivityFeed(cursor?: string, limit = 30, severity?: EventSeverity): Promise<{
    events: SystemEvent[];
    nextCursor: string | null;
  }> {
    const where: any = {};
    if (severity) where.severity = severity;

    const events = await this.prisma.systemEvent.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = events.length > limit;
    if (hasMore) events.pop();

    return {
      events,
      nextCursor: hasMore ? events[events.length - 1].id : null,
    };
  }

  async markEventRead(eventId: string): Promise<void> {
    await this.prisma.systemEvent.update({
      where: { id: eventId },
      data: { readAt: new Date() },
    });
  }

  // ─── PARTNER CRUD (Pharmacy example — same pattern for Lab, Nurse, Clinic) ───
  async createPharmacy(input: Prisma.PharmacyCreateInput): Promise<Pharmacy> {
    const pharmacy = await this.prisma.pharmacy.create({ data: input });
    this.eventEmitter.emit('partner.created', { type: 'PHARMACY', partnerId: pharmacy.id });
    return pharmacy;
  }

  async updatePharmacy(id: string, input: Prisma.PharmacyUpdateInput): Promise<Pharmacy> {
    return this.prisma.pharmacy.update({ where: { id }, data: input });
  }

  async deactivatePharmacy(id: string): Promise<void> {
    await this.prisma.pharmacy.update({ where: { id }, data: { isActive: false } });
    this.eventEmitter.emit('partner.deactivated', { type: 'PHARMACY', partnerId: id });
  }

  async listPharmacies(filters?: { isActive?: boolean; area?: string }): Promise<Pharmacy[]> {
    return this.prisma.pharmacy.findMany({
      where: filters,
      orderBy: { name: 'asc' },
    });
  }

  // ─── REFUND APPROVAL ───
  async approveRefund(refundRequestId: string, destination: 'wallet' | 'original_payment', adminNotes?: string): Promise<void> {
    const request = await this.prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
      include: { consultation: { select: { patientId: true } } },
    });
    if (!request || request.status !== 'PENDING_APPROVAL') {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    await this.prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: { status: 'APPROVED', adminNotes, processedAt: new Date() },
    });

    this.eventEmitter.emit('refund.approved', {
      refundRequestId,
      patientId: request.consultation?.patientId,
      amount: request.amount,
      destination,
    });
  }

  async rejectRefund(refundRequestId: string, reason: string): Promise<void> {
    await this.prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: { status: 'REJECTED', adminNotes: reason, processedAt: new Date() },
    });

    this.eventEmitter.emit('refund.rejected', { refundRequestId, reason });
  }

  // ─── AUDIT LOG ───
  async createAuditLog(entry: {
    userId?: string;
    userRole?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    changesJson?: Record<string, any>;
  }): Promise<void> {
    await this.prisma.auditLog.create({ data: entry });
  }

  async getAuditLogs(filters: {
    action?: string;
    userRole?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ logs: AuditLog[]; nextCursor: string | null }> {
    const where: any = {};
    if (filters.action) where.action = { startsWith: filters.action };
    if (filters.userRole) where.userRole = filters.userRole;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }
    if (filters.search) {
      where.OR = [
        { action: { contains: filters.search, mode: 'insensitive' } },
        { resourceId: { contains: filters.search } },
      ];
    }

    const limit = filters.limit || 30;
    const logs = await this.prisma.auditLog.findMany({
      where,
      take: limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = logs.length > limit;
    if (hasMore) logs.pop();

    return { logs, nextCursor: hasMore ? logs[logs.length - 1].id : null };
  }

  // ─── SYSTEM CONFIG (Feature Flags, etc.) ───
  async getConfig(key: string): Promise<any> {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    return config?.value;
  }

  async setConfig(key: string, value: any): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
```

### 18.6 Feature Flags

```typescript
// config/feature-flags.ts
export const FEATURE_FLAGS = {
  VIDEO_CONSULTATION_ENABLED: false,     // Stage 2+
  PCOS_VERTICAL_ENABLED: false,          // Launch after initial 4 verticals
  REFERRAL_BONUS_ENABLED: false,         // Patient referral program
  SELF_UPLOAD_LAB_RESULTS: true,         // Patient can upload own lab results
  DISCREET_MODE_AVAILABLE: true,         // Privacy-first notification option
  AUTO_REORDER_ENABLED: true,            // Subscription auto-reorder
  WALLET_AT_CHECKOUT: true,              // Use wallet credits at checkout
  PROMO_CODES_ENABLED: true,             // Promo code system active
  PHOTO_OPTIMIZATION_LAMBDA: false,      // Stage 2+: Lambda@Edge photo resizing
  BULK_ACTIONS_ENABLED: true,            // Admin desktop bulk operations
};
```

### 18.7 SystemConfig Prisma Model

```prisma
model SystemConfig {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}

model RefundRequest {
  id               String       @id @default(uuid())
  consultationId   String?
  consultation     Consultation? @relation(fields: [consultationId], references: [id])
  requestedById    String       // Doctor or patient who requested
  requestedByRole  Role
  amount           Int          // In paisa
  type             RefundType   // FULL | PARTIAL
  reason           String
  reasonCategory   String       // 'contraindication', 'duplicate', 'not_suitable', 'other'
  status           RefundRequestStatus @default(PENDING_APPROVAL)
  adminNotes       String?
  destination      String?      // 'wallet' | 'original_payment'
  razorpayRefundId String?
  processedAt      DateTime?
  createdAt        DateTime     @default(now())

  @@index([status, createdAt])
}

enum RefundType {
  FULL
  PARTIAL
}

enum RefundRequestStatus {
  PENDING_APPROVAL
  APPROVED
  REJECTED
  PROCESSING
  COMPLETED
  FAILED
}
```

### 18.8 Events Emitted

| Event | Trigger | Payload |
|-------|---------|---------|
| `sla.breach` | SLA threshold exceeded | `{ type, resourceType, resourceId, hoursOverdue }` |
| `sla.warning` | Approaching SLA threshold | `{ type, resourceType, resourceId, hoursRemaining }` |
| `partner.created` | New partner added | `{ type, partnerId }` |
| `partner.deactivated` | Partner deactivated | `{ type, partnerId }` |
| `refund.approved` | Admin approves refund | `{ refundRequestId, patientId, amount, destination }` |
| `refund.rejected` | Admin rejects refund | `{ refundRequestId, reason }` |

---

## 19. Background Jobs (BullMQ Queues & Processors)

### 19.1 Queue Architecture

All background processing uses BullMQ with Redis 7 on ElastiCache. Jobs are organized by function with independent concurrency limits.

**File structure:**
```
src/modules/jobs/
├── jobs.module.ts
├── queues/
│   ├── subscription-renewal.queue.ts
│   ├── auto-reorder.queue.ts
│   ├── sla-check.queue.ts
│   ├── notification-dispatch.queue.ts
│   ├── ai-assessment.queue.ts
│   ├── pdf-generation.queue.ts
│   └── scheduled-reminder.queue.ts
└── processors/
    ├── subscription-renewal.processor.ts
    ├── auto-reorder.processor.ts
    ├── sla-check.processor.ts
    ├── notification-dispatch.processor.ts
    ├── ai-assessment.processor.ts
    ├── pdf-generation.processor.ts
    └── scheduled-reminder.processor.ts
```

### 19.2 Queue Definitions

| Queue | Type | Schedule/Trigger | Priority | Concurrency | Max Retries | Backoff |
|-------|------|-----------------|----------|-------------|-------------|---------|
| `subscription-renewal` | Cron | Daily 2:00 AM IST | Critical | 5 | 5 | Exponential (1m, 2m, 4m, 8m, 16m) |
| `auto-reorder` | Cron | Daily 3:00 AM IST | Medium | 3 | 3 | Exponential (5m, 15m, 45m) |
| `sla-check` | Repeatable | Every 15 minutes | High | 1 | 2 | Fixed (1m) |
| `notification-dispatch` | Event-triggered | On event emission | Medium | 10 | 3 | Exponential (30s, 60s, 120s) |
| `ai-assessment` | Event-triggered | On questionnaire completion | Medium | 3 | 2 | Fixed (30s) |
| `pdf-generation` | Event-triggered | On prescription signed | Low | 2 | 3 | Exponential (1m, 5m, 15m) |
| `scheduled-reminder` | Delayed | Per-patient scheduling | Medium | 5 | 2 | Fixed (5m) |

### 19.3 Processor Implementations

```typescript
// processors/subscription-renewal.processor.ts
@Processor('subscription-renewal')
export class SubscriptionRenewalProcessor {
  constructor(
    private prisma: PrismaClient,
    private paymentsService: PaymentsService,
  ) {}

  @Process()
  async handleRenewal(job: Job): Promise<void> {
    // Find all active subscriptions with renewal date = today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { gte: today, lt: tomorrow },
        razorpaySubscriptionId: { not: null },
      },
    });

    for (const sub of dueSubscriptions) {
      try {
        // Razorpay handles the actual charge via subscription API
        // This job just ensures our local state is in sync
        await this.paymentsService.syncSubscriptionStatus(sub.id);
      } catch (error) {
        job.log(`Failed to sync subscription ${sub.id}: ${error.message}`);
        // Individual failures don't fail the whole job
      }
    }
  }
}

// processors/auto-reorder.processor.ts
@Processor('auto-reorder')
export class AutoReorderProcessor {
  constructor(
    private prisma: PrismaClient,
    private ordersService: OrdersService,
  ) {}

  @Process()
  async handleAutoReorder(job: Job): Promise<void> {
    // Find subscriptions due for reorder (active, not paused, doctor hasn't paused treatment)
    const dueForReorder = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        isPaused: false,
        treatmentPaused: false,
        nextReorderDate: { lte: new Date() },
      },
      include: {
        patient: true,
        latestPrescription: {
          include: { medications: true },
        },
      },
    });

    for (const sub of dueForReorder) {
      if (!sub.latestPrescription) continue;

      // Check if follow-up check-in is required but overdue
      if (sub.requiresCheckIn && !sub.lastCheckInAt) {
        job.log(`Skipping reorder for ${sub.id} — check-in overdue`);
        continue;
      }

      try {
        await this.ordersService.createAutoReorder(sub.id, sub.latestPrescription);
        job.log(`Auto-reorder created for subscription ${sub.id}`);
      } catch (error) {
        job.log(`Auto-reorder failed for ${sub.id}: ${error.message}`);
      }
    }
  }
}

// processors/sla-check.processor.ts
@Processor('sla-check')
export class SlaCheckProcessor {
  constructor(private slaService: SlaService) {}

  @Process()
  async handleSlaCheck(): Promise<void> {
    await this.slaService.checkAllSLAs();
  }
}

// processors/notification-dispatch.processor.ts
@Processor('notification-dispatch')
export class NotificationDispatchProcessor {
  constructor(private notificationsService: NotificationsService) {}

  @Process()
  async handleNotification(job: Job<{
    event: string;
    userId: string;
    payload: Record<string, any>;
  }>): Promise<void> {
    const { event, userId, payload } = job.data;
    await this.notificationsService.dispatch(event, userId, payload);
  }
}

// processors/ai-assessment.processor.ts
@Processor('ai-assessment')
export class AiAssessmentProcessor {
  constructor(private aiService: AiAssessmentService) {}

  @Process()
  async handleAssessment(job: Job<{
    consultationId: string;
    questionnaireResponseId: string;
  }>): Promise<void> {
    const { consultationId, questionnaireResponseId } = job.data;

    // Step 1: Fetch questionnaire response + patient history
    // Step 2: Build Claude API prompt
    // Step 3: Call Claude API (anthropic SDK)
    // Step 4: Parse response → store AI assessment
    // Step 5: Update consultation status → AI_COMPLETE
    // Step 6: Emit event → auto-assign to doctor

    await this.aiService.runAssessment(consultationId, questionnaireResponseId);
  }
}

// processors/pdf-generation.processor.ts
@Processor('pdf-generation')
export class PdfGenerationProcessor {
  constructor(private prescriptionsService: PrescriptionsService) {}

  @Process()
  async handlePdfGeneration(job: Job<{
    prescriptionId: string;
    doctorId: string;
    signatureDataUrl: string;
  }>): Promise<void> {
    const { prescriptionId, doctorId, signatureDataUrl } = job.data;
    await this.prescriptionsService.signAndGeneratePdf(prescriptionId, doctorId, signatureDataUrl);
  }
}

// processors/scheduled-reminder.processor.ts
@Processor('scheduled-reminder')
export class ScheduledReminderProcessor {
  constructor(
    private notificationsService: NotificationsService,
    private prisma: PrismaClient,
  ) {}

  @Process()
  async handleReminder(job: Job<{
    type: 'MEDICATION' | 'CHECKIN' | 'SLOT_BOOKING' | 'LAB_FOLLOW_UP' | 'VISIT_REMINDER';
    userId: string;
    metadata: Record<string, any>;
  }>): Promise<void> {
    const { type, userId, metadata } = job.data;

    // Verify the reminder is still relevant (subscription still active, etc.)
    if (type === 'MEDICATION') {
      const sub = await this.prisma.subscription.findFirst({
        where: { patientId: userId, status: 'ACTIVE' },
      });
      if (!sub) return; // Subscription cancelled, skip reminder
    }

    await this.notificationsService.dispatch(`reminder.${type.toLowerCase()}`, userId, metadata);
  }
}
```

### 19.4 Queue Registration

```typescript
// jobs/jobs.module.ts
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null, // Required for BullMQ
      },
      defaultJobOptions: {
        removeOnComplete: { age: 86400, count: 1000 },  // Keep completed jobs for 24h, max 1000
        removeOnFail: { age: 604800, count: 5000 },     // Keep failed jobs for 7 days, max 5000
      },
    }),

    // Queue registrations
    BullModule.registerQueue(
      { name: 'subscription-renewal' },
      { name: 'auto-reorder' },
      { name: 'sla-check' },
      { name: 'notification-dispatch' },
      { name: 'ai-assessment' },
      { name: 'pdf-generation' },
      { name: 'scheduled-reminder' },
    ),
  ],
  providers: [
    SubscriptionRenewalProcessor,
    AutoReorderProcessor,
    SlaCheckProcessor,
    NotificationDispatchProcessor,
    AiAssessmentProcessor,
    PdfGenerationProcessor,
    ScheduledReminderProcessor,
  ],
})
export class JobsModule implements OnModuleInit {
  constructor(
    @InjectQueue('subscription-renewal') private renewalQueue: Queue,
    @InjectQueue('auto-reorder') private reorderQueue: Queue,
    @InjectQueue('sla-check') private slaQueue: Queue,
  ) {}

  async onModuleInit() {
    // Register repeatable/cron jobs on startup

    // Subscription renewal check — daily at 2:00 AM IST (8:30 PM UTC previous day)
    await this.renewalQueue.add('daily-renewal', {}, {
      repeat: { pattern: '30 20 * * *' }, // UTC cron
      jobId: 'subscription-renewal-daily',
    });

    // Auto-reorder check — daily at 3:00 AM IST (9:30 PM UTC previous day)
    await this.reorderQueue.add('daily-reorder', {}, {
      repeat: { pattern: '30 21 * * *' },
      jobId: 'auto-reorder-daily',
    });

    // SLA check — every 15 minutes
    await this.slaQueue.add('sla-check', {}, {
      repeat: { every: 15 * 60 * 1000 },
      jobId: 'sla-check-15min',
    });
  }
}
```

### 19.5 Bull Board (Admin Monitoring)

```typescript
// In main.ts or admin route setup
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';

// Setup Bull Board at /admin/queues (behind admin auth middleware)
const serverAdapter = new FastifyAdapter();
createBullBoard({
  queues: [
    new BullMQAdapter(renewalQueue),
    new BullMQAdapter(reorderQueue),
    new BullMQAdapter(slaQueue),
    new BullMQAdapter(notificationQueue),
    new BullMQAdapter(aiQueue),
    new BullMQAdapter(pdfQueue),
    new BullMQAdapter(reminderQueue),
  ],
  serverAdapter,
});
serverAdapter.setBasePath('/admin/queues');
```

### 19.6 Redis Configuration for Jobs

```
# redis.conf additions for BullMQ durability
maxmemory-policy noeviction    # Never evict job data
appendonly yes                  # AOF persistence
appendfsync everysec            # Sync to disk every second
```

**Memory estimation (MVP scale):**
- ~500 active patients → ~2,000 jobs/day across all queues
- Average job payload: ~500 bytes
- With 7-day retention of failed jobs: ~7MB
- Redis memory: 50MB allocation sufficient for MVP

---

## 20. File Storage & Document Delivery (S3/CloudFront)

### 20.1 Bucket Architecture

| Bucket | Contents | Encryption | Upload | Download |
|--------|----------|------------|--------|----------|
| `onlyou-photos` | Patient photos (hair, weight progress) | SSE-KMS | Presigned PUT (15-min expiry) | CloudFront signed URL (1-hour expiry) |
| `onlyou-prescriptions` | PDF prescriptions (generated by @react-pdf/renderer) | SSE-KMS | Server-side (API uploads directly) | CloudFront signed URL (1-hour expiry) |
| `onlyou-lab-results` | Lab result PDFs (uploaded by lab staff or patient) | SSE-KMS | Presigned PUT (15-min expiry) | CloudFront signed URL (1-hour expiry) |
| `onlyou-documents` | Gov IDs, nurse certifications, partner licenses | SSE-KMS | Presigned PUT (15-min expiry) | Presigned GET (internal access only) |

**S3 Key Patterns:**
```
photos/{userId}/{consultationId}/{photoType}_{timestamp}.jpg
prescriptions/{patientId}/{prescriptionId}_{timestamp}.pdf
lab-results/{labOrderId}/{timestamp}.pdf
lab-results/self-upload/{patientId}/{labOrderId}_{timestamp}.pdf
documents/nurse/{nurseId}/certification_{timestamp}.pdf
documents/pharmacy/{pharmacyId}/license_{timestamp}.pdf
documents/lab/{labId}/accreditation_{timestamp}.pdf
```

### 20.2 Storage Service

```typescript
// storage/storage.service.ts
@Injectable()
export class StorageService {
  private s3: S3Client;
  private cloudFrontSigner: CloudFrontSigner;

  constructor() {
    this.s3 = new S3Client({ region: 'ap-south-1' });
    this.cloudFrontSigner = new CloudFrontSigner(
      process.env.CLOUDFRONT_KEY_PAIR_ID!,
      process.env.CLOUDFRONT_PRIVATE_KEY!,
    );
  }

  // ─── PRESIGNED UPLOAD URL ───
  async getUploadUrl(input: {
    bucket: string;
    key: string;
    contentType: string;
    metadata?: Record<string, string>;
    maxSizeBytes?: number;
  }): Promise<{ uploadUrl: string; s3Key: string; expiresIn: number }> {
    const command = new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      ContentType: input.contentType,
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: process.env.KMS_KEY_ID,
      Metadata: input.metadata,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 900 }); // 15 minutes
    return { uploadUrl, s3Key: input.key, expiresIn: 900 };
  }

  // ─── VERIFY UPLOAD EXISTS ───
  async verifyUpload(bucket: string, key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  // ─── CLOUDFRONT SIGNED URL (downloads) ───
  getDownloadUrl(s3Key: string, bucketType: 'photos' | 'prescriptions' | 'lab-results'): string {
    const domainMap: Record<string, string> = {
      'photos': process.env.CLOUDFRONT_PHOTOS_DOMAIN!,
      'prescriptions': process.env.CLOUDFRONT_PRESCRIPTIONS_DOMAIN!,
      'lab-results': process.env.CLOUDFRONT_LAB_RESULTS_DOMAIN!,
    };

    const url = `${domainMap[bucketType]}/${s3Key}`;
    return this.cloudFrontSigner.getSignedUrl({
      url,
      dateLessThan: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour
    });
  }

  // ─── PRESIGNED GET (internal documents — no CloudFront) ───
  async getInternalDocumentUrl(bucket: string, key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  // ─── SERVER-SIDE UPLOAD (prescriptions PDFs) ───
  async uploadBuffer(input: {
    bucket: string;
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<string> {
    await this.s3.send(new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: process.env.KMS_KEY_ID,
    }));
    return input.key;
  }

  // ─── DELETE (right-to-erasure under DPDPA) ───
  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  // ─── BULK DELETE (account deletion) ───
  async deleteUserFiles(userId: string): Promise<void> {
    const buckets = ['onlyou-photos', 'onlyou-prescriptions', 'onlyou-lab-results', 'onlyou-documents'];

    for (const bucket of buckets) {
      const prefix = bucket === 'onlyou-photos' ? `photos/${userId}/` :
                     bucket === 'onlyou-prescriptions' ? `prescriptions/${userId}/` :
                     `documents/${userId}/`;

      let continuationToken: string | undefined;
      do {
        const listResult = await this.s3.send(new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }));

        if (listResult.Contents?.length) {
          await this.s3.send(new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: listResult.Contents.map((obj) => ({ Key: obj.Key! })),
            },
          }));
        }

        continuationToken = listResult.NextContinuationToken;
      } while (continuationToken);
    }
  }
}
```

### 20.3 CloudFront Configuration

```
# CloudFront Distribution (one per bucket)
# Origin: S3 bucket with OAC (Origin Access Control)
# No direct S3 URL access — all downloads go through CloudFront

CloudFront Distribution: photos.cdn.onlyou.life
  → Origin: onlyou-photos.s3.ap-south-1.amazonaws.com
  → Origin Access Control (OAC): enabled
  → Viewer Protocol Policy: HTTPS only
  → Cache Policy: CachingOptimized (TTL: 24 hours)
  → Signed URLs: Required (RSA key pair)
  → Edge Locations: All India (Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata + 1140 embedded POPs)

CloudFront Distribution: rx.cdn.onlyou.life
  → Origin: onlyou-prescriptions.s3.ap-south-1.amazonaws.com
  → Same config as above
  → Cache Policy: CachingDisabled (prescriptions should always fetch fresh)

CloudFront Distribution: lab.cdn.onlyou.life
  → Origin: onlyou-lab-results.s3.ap-south-1.amazonaws.com
  → Same config as photos
```

### 20.4 S3 Lifecycle Policies

```json
{
  "Rules": [
    {
      "ID": "StandardToIA",
      "Filter": { "Prefix": "" },
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 365,
          "StorageClass": "STANDARD_IA"
        }
      ]
    },
    {
      "ID": "IAToGlacier",
      "Filter": { "Prefix": "" },
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 730,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

**Retention alignment:**
- 0–12 months: S3 Standard (frequent access during active treatment)
- 12–24 months: S3 Infrequent Access (past patients, occasional reference)
- 24+ months: S3 Glacier (archival, 3-year minimum per Telemedicine Practice Guidelines 2020)
- Right-to-erasure: DPDPA requires ability to delete on request — `deleteUserFiles()` handles this

### 20.5 Photo Optimization (Stage 2+)

**MVP approach (current):**
- Client-side compression: Expo ImageManipulator before upload (resize to max 1200px, quality 0.8)
- S3 Standard + CloudFront delivery
- Estimated photo size: 200-500KB per photo

**Stage 2+ approach (Lambda@Edge):**
```
Client Request → CloudFront
  → Lambda@Edge (Origin Request)
    → Check if optimized variant exists in S3
    → If yes: serve from S3 via CloudFront
    → If no: fetch original, resize with Sharp, save optimized variant, serve
    → Content negotiation: WebP for Chrome/Android, AVIF for Safari 16+, JPEG fallback
    → Sizes: thumbnail (150px), medium (600px), full (1200px)
```

Estimated savings: 30-50% bandwidth reduction, significant for Indian mobile users on data-constrained plans.

### 20.6 KMS Key Management

```typescript
// One KMS key for all healthcare data, with key policy per bucket
// Key alias: alias/onlyou-healthcare-data

// S3 Bucket Key: enabled on all buckets
// Reduces KMS API calls by up to 99% (generates bucket-level data key, caches for minutes)
// Cost impact: ~$5-15/month for MVP scale vs $50+ without Bucket Keys

// Key rotation: automatic (AWS-managed, every year)
// Key deletion: disabled (cannot accidentally make data inaccessible)

// CloudTrail logging: enabled for all KMS operations
// → Full audit trail of every encryption/decryption event
// → Required for DPDPA compliance audits
```

### 20.7 tRPC Router

```typescript
// storage/storage.router.ts
export const storageRouter = router({
  // Patient: get upload URL for photos
  getPhotoUploadUrl: protectedProcedure
    .use(requireRole('PATIENT'))
    .input(z.object({
      consultationId: z.string().uuid(),
      photoType: z.enum(['top_head', 'front_hairline', 'left_side', 'right_side', 'full_body_front', 'full_body_side']),
    }))
    .mutation(async ({ ctx, input }) => {
      const key = `photos/${ctx.user.id}/${input.consultationId}/${input.photoType}_${Date.now()}.jpg`;
      return ctx.storageService.getUploadUrl({
        bucket: 'onlyou-photos',
        key,
        contentType: 'image/jpeg',
        metadata: { 'user-id': ctx.user.id, 'consultation-id': input.consultationId },
      });
    }),

  // Patient: confirm photo upload
  confirmPhotoUpload: protectedProcedure
    .use(requireRole('PATIENT'))
    .input(z.object({
      s3Key: z.string(),
      consultationId: z.string().uuid(),
      photoType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.storageService.verifyUpload('onlyou-photos', input.s3Key);
      if (!exists) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Photo not found in storage.' });

      await ctx.prisma.photo.create({
        data: {
          userId: ctx.user.id,
          consultationId: input.consultationId,
          s3Key: input.s3Key,
          photoType: input.photoType,
          bucket: 'onlyou-photos',
        },
      });
    }),

  // Any authorized user: get download URL
  getDownloadUrl: protectedProcedure
    .input(z.object({
      s3Key: z.string(),
      bucketType: z.enum(['photos', 'prescriptions', 'lab-results']),
    }))
    .query(({ ctx, input }) => {
      // CASL permission check happens via middleware — ensures user can access this resource
      return { url: ctx.storageService.getDownloadUrl(input.s3Key, input.bucketType) };
    }),

  // Lab: get upload URL for results
  getLabResultUploadUrl: protectedProcedure
    .use(requireRole('LAB_TECH'))
    .input(z.object({
      labOrderId: z.string().uuid(),
      contentType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
    }))
    .mutation(async ({ ctx, input }) => {
      const ext = input.contentType === 'application/pdf' ? 'pdf' : 'jpg';
      const key = `lab-results/${input.labOrderId}/${Date.now()}.${ext}`;
      return ctx.storageService.getUploadUrl({
        bucket: 'onlyou-lab-results',
        key,
        contentType: input.contentType,
        metadata: { 'lab-order-id': input.labOrderId },
      });
    }),

  // Patient: get upload URL for self-upload lab results
  getSelfUploadUrl: protectedProcedure
    .use(requireRole('PATIENT'))
    .input(z.object({
      labOrderId: z.string().uuid(),
      contentType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
    }))
    .mutation(async ({ ctx, input }) => {
      const ext = input.contentType === 'application/pdf' ? 'pdf' : 'jpg';
      const key = `lab-results/self-upload/${ctx.user.id}/${input.labOrderId}_${Date.now()}.${ext}`;
      return ctx.storageService.getUploadUrl({
        bucket: 'onlyou-lab-results',
        key,
        contentType: input.contentType,
        metadata: { 'patient-id': ctx.user.id, 'lab-order-id': input.labOrderId },
      });
    }),
});
```

### 20.8 Upload/Download Flow Summary

**Upload (photos, lab results, documents):**
```
1. Client → tRPC mutation: getUploadUrl({ bucket, photoType })
2. Server → generates presigned PUT URL (15-min expiry, SSE-KMS)
3. Server → returns { uploadUrl, s3Key }
4. Client → HTTP PUT directly to S3 (binary data never touches API server)
5. Client → tRPC mutation: confirmUpload({ s3Key })
6. Server → HeadObject to verify → stores metadata in PostgreSQL
```

**Download (photos, prescriptions, lab results):**
```
1. Client → tRPC query: getDownloadUrl({ s3Key, bucketType })
2. Server → CASL permission check (is this user allowed to view this resource?)
3. Server → generates CloudFront signed URL (1-hour expiry)
4. Client → fetches via CloudFront (edge-cached, 5-30ms latency in India)
```

**Server-side upload (prescriptions):**
```
1. Doctor signs prescription → event emitted
2. BullMQ pdf-generation job → @react-pdf/renderer generates PDF
3. Server → PutObject directly to S3 (no presigned URL needed)
4. Server → stores s3Key in Prescription record
```

---

## Cross-Reference: Module Dependency Map

```
Messaging ──→ SSE Publisher ──→ Redis Pub/Sub
    ↑                              ↑
    │                              │
Notifications ──→ BullMQ ──→ Redis (jobs)
    ↑
    │
All Modules (via EventEmitter2)
    │
    ├── Orders ──→ Payments, Wallet, Storage
    ├── Lab Orders ──→ Nurse, Storage, Notifications
    ├── Consultations ──→ AI Assessment, Prescriptions
    ├── Prescriptions ──→ PDF Generation (BullMQ), Storage
    └── Admin/SLA ──→ SystemEvent → SSE (admin channel)
```

---

*End of BACKEND-PART2B.md — Sections 16–20 Complete*

*Next: BACKEND-PART3.md — Security, Infrastructure, Deployment & Testing (Sections 21–30)*
