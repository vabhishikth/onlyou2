# BACKEND.md — Part 1 of 3: Foundation & Core Modules (Sections 1–10)

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

### Part 1 — Foundation & Core Modules (this document)
1. [Architecture Overview](#1-architecture-overview)
2. [Module Map & File Structure](#2-module-map--file-structure)
3. [tRPC Router & Context Setup](#3-trpc-router--context-setup)
4. [Auth Module](#4-auth-module)
5. [Users Module](#5-users-module)
6. [Questionnaire Engine Module](#6-questionnaire-engine-module)
7. [Photos Module](#7-photos-module)
8. [AI Assessment Module](#8-ai-assessment-module)
9. [Consultations Module](#9-consultations-module)
10. [Prescriptions Module](#10-prescriptions-module)

### Part 2 — Business Logic & Infrastructure
11. Orders Module (Medication Delivery)
12. Lab Orders Module (Sample Tracking)
13. Nurse Module (Visits & Assignments)
14. Payments Module (Razorpay/UPI)
15. Notifications Module (WhatsApp/SMS/FCM/Email)
16. Messaging Module (Doctor-Patient Chat + SSE)
17. Wallet & Referrals Module
18. Admin Module (Partners, SLA Engine)
19. Background Jobs (BullMQ Queues & Processors)
20. File Storage & Document Delivery (S3/CloudFront)

### Part 3 — Security, Ops & Testing
21. DPDPA Compliance & Data Privacy Implementation
22. Security Middleware, Guards & Interceptors
23. Error Handling & Exception Filters
24. Caching Strategy (Redis)
25. Database Migrations & Seed Data
26. Monitoring, Logging & Observability
27. Environment Configuration
28. Build & Deployment
29. Testing Strategy & Checklist
30. Appendix: Complete API Route Map & Status Flow Diagrams

---

## 1. Architecture Overview

### Pattern: Modular Monolith

Single NestJS process containing all modules. Each module communicates via well-defined interfaces — no direct cross-module Prisma queries, no importing another module's service directly. Inter-module communication uses NestJS `EventEmitter2` (trivially replaceable with SQS/SNS when extracting to microservices).

**Why not microservices:** A 2-person team (founder + Claude AI) cannot maintain distributed systems. The modular monolith gives all the code organization benefits of microservices without the operational overhead of service discovery, distributed tracing, and network failures between services.

**Extraction triggers (documented for future):**
- At 5,000+ patients: Extract notification dispatch to separate Fargate task
- At 10,000+ patients: Extract PDF generation to Lambda (bursty, stateless)
- At 25,000+ patients: Separate doctor-facing and patient-facing API at ALB routing level

### Runtime Stack

| Layer | Technology | Config |
|-------|-----------|--------|
| HTTP Server | Fastify 4 via `@nestjs/platform-fastify` | 2x JSON serialization perf vs Express |
| API Protocol | tRPC v10 via `nestjs-trpc` adapter | Type-safe RPC for all 7 TS clients |
| REST (external only) | NestJS `@Controller` | Razorpay webhooks, Gupshup webhooks, delivery SMS link |
| ORM | Prisma 5 with Query Compiler | Auto-generated types, escape to raw SQL for complex queries |
| Database | PostgreSQL 16 on RDS Mumbai | JSONB, pgAudit, pgcrypto, RLS |
| Cache | Redis 7 on ElastiCache Mumbai | Sessions, BullMQ, SSE pub/sub, JWT blacklist |
| Background Jobs | BullMQ + Bull Board | Cron, delayed, event-triggered, flow jobs |
| File Storage | S3 (SSE-KMS) + CloudFront (signed URLs) | 4 buckets: photos, prescriptions, lab-results, documents |
| Real-time | SSE + Redis Pub/Sub | Server → client push, no sticky sessions |

### Request Lifecycle

```
Client Request
  → CloudFront (static assets, signed URLs)
  → ALB (health check, SSL termination)
  → Fastify (HTTP parsing, ~2x faster than Express)
  → NestJS Pipeline:
      1. Global Middleware (CORS, helmet, compression, request logging)
      2. Guards (JWT validation → Role check → CASL permission check)
      3. Interceptors (audit logging, response transform, timeout)
      4. tRPC Router (procedure resolution → input validation via Zod)
      5. Service Layer (business logic, Prisma queries)
      6. Exception Filter (catch-all error formatting)
  → Response
```

### Module Communication Pattern

```typescript
// CORRECT: Use EventEmitter for cross-module communication
// In prescriptions.service.ts:
this.eventEmitter.emit('prescription.created', {
  prescriptionId,
  patientId,
  medications,
});

// In notifications.service.ts (listens):
@OnEvent('prescription.created')
async handlePrescriptionCreated(payload: PrescriptionCreatedEvent) {
  await this.sendToPatient(payload.patientId, 'prescription_ready', payload);
  await this.sendToCoordinator('new_prescription', payload);
}

// WRONG: Don't import another module's service directly
// import { NotificationsService } from '../notifications/notifications.service'; ← NO
```

---

## 2. Module Map & File Structure

Every NestJS module follows the same structure: `module.ts` → `service.ts` → `router.ts` (tRPC) → `dto/` (Zod schemas). This consistency enables Claude AI to generate code reliably across all modules.

```
apps/api/src/
├── main.ts                          → Fastify bootstrap + tRPC adapter + global pipes
├── app.module.ts                    → Root module (imports all feature modules)
│
├── trpc/                            → tRPC infrastructure
│   ├── trpc.module.ts               → NestJS module for tRPC setup
│   ├── trpc.router.ts               → Root router (merges all sub-routers)
│   ├── trpc.context.ts              → Request context factory (user, role, ability)
│   └── middleware/
│       ├── auth.middleware.ts        → JWT extraction + validation
│       ├── logging.middleware.ts     → Request/response logging
│       └── rate-limit.middleware.ts  → Per-procedure rate limiting
│
├── rest/                            → REST controllers (external partners only)
│   ├── webhook.controller.ts        → POST /api/webhooks/razorpay, /api/webhooks/gupshup
│   └── delivery.controller.ts       → GET /api/delivery/:token (SMS link page)
│
├── modules/
│   ├── auth/                        → Authentication & Authorization
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts          → OTP generation, JWT issue/refresh/revoke, social login
│   │   ├── auth.router.ts           → tRPC procedures: sendOtp, verifyOtp, socialLogin, refreshToken, logout
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts      → Passport JWT strategy (extracts user from token)
│   │   │   ├── google.strategy.ts   → Google OAuth2 (patient app only)
│   │   │   └── apple.strategy.ts    → Sign in with Apple (patient app only)
│   │   ├── guards/
│   │   │   ├── jwt.guard.ts         → Validates JWT, attaches user to request
│   │   │   ├── roles.guard.ts       → Checks user.role against @Roles() decorator
│   │   │   └── phone-verified.guard.ts → Blocks actions if phone not verified
│   │   ├── casl/
│   │   │   ├── casl-ability.factory.ts → Defines RBAC rules per role
│   │   │   └── policies.guard.ts       → Checks CASL ability on specific resources
│   │   ├── otp/
│   │   │   ├── otp.service.ts       → Generate 6-digit OTP, hash with bcrypt, store in Redis (5-min TTL)
│   │   │   └── otp.delivery.ts      → Send via Gupshup WhatsApp (primary) + SMS fallback
│   │   └── dto/
│   │       ├── send-otp.schema.ts
│   │       ├── verify-otp.schema.ts
│   │       └── social-login.schema.ts
│   │
│   ├── users/                       → User profiles (all 6 roles)
│   │   ├── users.module.ts
│   │   ├── users.service.ts         → CRUD for all user types + profile management
│   │   ├── users.router.ts          → tRPC procedures: getProfile, updateProfile, getPatientForDoctor, etc.
│   │   └── dto/
│   │       ├── update-profile.schema.ts
│   │       └── patient-profile.schema.ts
│   │
│   ├── questionnaire/               → Shared questionnaire engine (all 5 verticals)
│   │   ├── questionnaire.module.ts
│   │   ├── questionnaire.service.ts → Load schema, validate answers, evaluate skip logic, calculate scores
│   │   ├── questionnaire.router.ts  → tRPC: getSchema, saveProgress, submitAnswers
│   │   ├── engine/
│   │   │   ├── skip-logic.ts        → Evaluates skip conditions per question
│   │   │   ├── scoring.ts           → IIEF-5 (ED), PEDT (PE), BMI (Weight), Rotterdam (PCOS)
│   │   │   └── validator.ts         → Answer type validation (number ranges, required fields, etc.)
│   │   └── data/                    → Per-condition JSON schemas (questions, types, skip rules)
│   │       ├── hair-loss.json       → 25 questions
│   │       ├── ed.json              → 28 questions + IIEF-5
│   │       ├── pe.json              → 26 questions + PEDT
│   │       ├── weight.json          → 30 questions + BMI
│   │       └── pcos.json            → 32 questions + Rotterdam criteria
│   │
│   ├── photos/                      → Medical photo management
│   │   ├── photos.module.ts
│   │   ├── photos.service.ts        → S3 presigned URL generation, metadata storage
│   │   ├── photos.router.ts         → tRPC: getUploadUrl, confirmUpload, getViewUrl
│   │   └── dto/
│   │       └── photo-upload.schema.ts
│   │
│   ├── ai/                          → AI pre-assessment (Claude API)
│   │   ├── ai.module.ts
│   │   ├── ai.service.ts            → Build prompt, call Claude API, parse structured response, store
│   │   ├── ai.router.ts             → tRPC: getAssessment (doctor-only), retriggerAssessment (admin)
│   │   └── prompts/                 → Per-condition system prompts
│   │       ├── hair-loss.prompt.ts
│   │       ├── ed.prompt.ts
│   │       ├── pe.prompt.ts
│   │       ├── weight.prompt.ts
│   │       └── pcos.prompt.ts
│   │
│   ├── consultations/               → Consultation lifecycle management
│   │   ├── consultations.module.ts
│   │   ├── consultations.service.ts → Create, assign, transition statuses, video auto-skip
│   │   ├── consultations.router.ts  → tRPC: list, getById, updateStatus, assignDoctor
│   │   └── dto/
│   │       ├── create-consultation.schema.ts
│   │       └── update-status.schema.ts
│   │
│   ├── prescriptions/               → Prescription builder + PDF generation
│   │   ├── prescriptions.module.ts
│   │   ├── prescriptions.service.ts → Create from template, validate, generate PDF, store
│   │   ├── prescriptions.router.ts  → tRPC: create, getById, getTemplates, getPdf
│   │   ├── pdf-generator.ts         → @react-pdf/renderer: builds prescription PDF
│   │   └── templates/               → Per-condition prescription templates (medication presets)
│   │       ├── hair-loss.templates.ts
│   │       ├── ed.templates.ts
│   │       ├── pe.templates.ts
│   │       ├── weight.templates.ts
│   │       └── pcos.templates.ts
│   │
│   ├── orders/                      → Medication orders + delivery tracking
│   │   ├── orders.module.ts
│   │   ├── orders.service.ts        → Create from prescription, pharmacy assignment, delivery OTP, status flow
│   │   ├── orders.router.ts
│   │   └── dto/
│   │
│   ├── lab-orders/                  → Blood work lifecycle + sample tracking
│   │   ├── lab-orders.module.ts
│   │   ├── lab-orders.service.ts    → Full status flow from ORDERED → COMPLETED
│   │   ├── lab-orders.router.ts
│   │   └── dto/
│   │
│   ├── nurse/                       → Nurse visits, assignments, vitals
│   │   ├── nurse.module.ts
│   │   ├── nurse.service.ts
│   │   ├── nurse.router.ts
│   │   └── dto/
│   │
│   ├── payments/                    → Razorpay integration (one-time + subscriptions)
│   │   ├── payments.module.ts
│   │   ├── payments.service.ts      → Razorpay API, order creation, subscription management
│   │   ├── subscription.service.ts  → Plan management, renewals, UPI cancel+recreate for changes
│   │   ├── payments.router.ts
│   │   └── dto/
│   │
│   ├── notifications/               → Multi-channel notification dispatch
│   │   ├── notifications.module.ts
│   │   ├── notifications.service.ts → Route to correct channel(s) based on event + user preferences
│   │   ├── channels/
│   │   │   ├── whatsapp.channel.ts  → Gupshup WhatsApp Business API
│   │   │   ├── sms.channel.ts       → Gupshup SMS (primary) + MSG91 (fallback)
│   │   │   ├── push.channel.ts      → FCM (Firebase Cloud Messaging)
│   │   │   └── email.channel.ts     → Resend (MVP) → SES (scale)
│   │   └── templates/               → Per-event message templates (all channels)
│   │
│   ├── messaging/                   → Doctor-patient async chat + SSE
│   │   ├── messaging.module.ts
│   │   ├── messaging.service.ts     → Message CRUD, read receipts, canned responses
│   │   ├── messaging.router.ts
│   │   └── sse.gateway.ts           → SSE endpoint for real-time message delivery
│   │
│   ├── wallet/                      → Patient wallet (credits, refunds, promo codes)
│   │   ├── wallet.module.ts
│   │   ├── wallet.service.ts
│   │   └── wallet.router.ts
│   │
│   ├── referrals/                   → Referral to partner clinics
│   │   ├── referrals.module.ts
│   │   ├── referrals.service.ts
│   │   └── referrals.router.ts
│   │
│   ├── admin/                       → Admin/coordinator operations
│   │   ├── admin.module.ts
│   │   ├── admin.service.ts         → Partner CRUD, dashboard stats, user management
│   │   ├── admin.router.ts
│   │   └── sla/
│   │       ├── sla.service.ts       → Threshold checks, escalation triggers
│   │       └── sla.config.ts        → All SLA thresholds (configurable)
│   │
│   ├── jobs/                        → BullMQ queue definitions + processors
│   │   ├── jobs.module.ts
│   │   ├── queues/
│   │   │   ├── subscription-renewal.queue.ts
│   │   │   ├── sla-check.queue.ts
│   │   │   ├── notification-dispatch.queue.ts
│   │   │   ├── ai-assessment.queue.ts
│   │   │   ├── pdf-generation.queue.ts
│   │   │   └── scheduled-reminder.queue.ts
│   │   └── processors/
│   │       ├── subscription-renewal.processor.ts
│   │       ├── sla-check.processor.ts
│   │       ├── notification-dispatch.processor.ts
│   │       ├── ai-assessment.processor.ts
│   │       ├── pdf-generation.processor.ts
│   │       └── scheduled-reminder.processor.ts
│   │
│   └── common/                      → Shared infrastructure
│       ├── guards/
│       │   └── throttle.guard.ts    → Rate limiting guard
│       ├── interceptors/
│       │   ├── audit-log.interceptor.ts  → Logs every mutating action to AuditLog table
│       │   ├── transform.interceptor.ts  → Standardizes response format
│       │   └── timeout.interceptor.ts    → 30s timeout on all requests
│       ├── decorators/
│       │   ├── roles.decorator.ts        → @Roles('DOCTOR', 'ADMIN')
│       │   ├── current-user.decorator.ts → @CurrentUser() parameter decorator
│       │   └── public.decorator.ts       → @Public() skips auth for specific routes
│       ├── filters/
│       │   └── all-exceptions.filter.ts  → Catches all errors, formats response, logs
│       ├── middleware/
│       │   ├── correlation-id.middleware.ts → Adds X-Correlation-Id header for request tracing
│       │   └── request-logger.middleware.ts → Logs method, path, status, duration
│       └── pipes/
│           └── zod-validation.pipe.ts     → Validates input using Zod schemas
│
├── config/
│   ├── feature-flags.ts             → VIDEO_CONSULTATION_ENABLED, GLP1_COLD_CHAIN_TRACKING, etc.
│   ├── database.config.ts           → Prisma connection config (connection pooling, SSL)
│   ├── redis.config.ts              → ElastiCache connection (sessions, BullMQ, pub/sub)
│   ├── s3.config.ts                 → Bucket names, presigned URL expiry, CloudFront config
│   ├── razorpay.config.ts           → API keys, webhook secret
│   ├── gupshup.config.ts            → WhatsApp + SMS API config
│   └── app.config.ts                → Joi validation schema for all env vars
│
├── prisma/
│   ├── schema.prisma                → Complete database schema
│   ├── migrations/                  → Auto-generated Prisma migrations
│   └── seed.ts                      → Test data seeder (all 6 roles + sample data)
│
├── test/
│   ├── e2e/                         → End-to-end tests
│   └── unit/                        → Unit tests per module
│
├── Dockerfile                       → Multi-stage build (build → production)
└── package.json
```

---

## 3. tRPC Router & Context Setup

### 3.1 Bootstrap (`main.ts`)

```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV !== 'production',
      trustProxy: true, // Behind ALB
    }),
  );

  // Global prefix for REST routes only (tRPC has its own path)
  app.setGlobalPrefix('api', { exclude: ['/health'] });

  // CORS — allow all client origins
  app.enableCors({
    origin: [
      'https://onlyou.life',
      'https://doctor.onlyou.life',
      'https://admin.onlyou.life',
      'https://nurse.onlyou.life',
      'https://lab.onlyou.life',
      'https://pharmacy.onlyou.life',
      /^http:\/\/localhost:\d+$/,  // Local dev
    ],
    credentials: true,
  });

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new AuditLogInterceptor(),
    new TransformInterceptor(),
    new TimeoutInterceptor(30_000),
  );

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
```

### 3.2 Root tRPC Router

```typescript
// trpc/trpc.router.ts
import { router } from './trpc.init';
import { authRouter } from '../modules/auth/auth.router';
import { usersRouter } from '../modules/users/users.router';
import { questionnaireRouter } from '../modules/questionnaire/questionnaire.router';
import { photosRouter } from '../modules/photos/photos.router';
import { aiRouter } from '../modules/ai/ai.router';
import { consultationsRouter } from '../modules/consultations/consultations.router';
import { prescriptionsRouter } from '../modules/prescriptions/prescriptions.router';
import { ordersRouter } from '../modules/orders/orders.router';
import { labOrdersRouter } from '../modules/lab-orders/lab-orders.router';
import { nurseRouter } from '../modules/nurse/nurse.router';
import { paymentsRouter } from '../modules/payments/payments.router';
import { notificationsRouter } from '../modules/notifications/notifications.router';
import { messagingRouter } from '../modules/messaging/messaging.router';
import { walletRouter } from '../modules/wallet/wallet.router';
import { referralsRouter } from '../modules/referrals/referrals.router';
import { adminRouter } from '../modules/admin/admin.router';

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  questionnaire: questionnaireRouter,
  photos: photosRouter,
  ai: aiRouter,
  consultations: consultationsRouter,
  prescriptions: prescriptionsRouter,
  orders: ordersRouter,
  labOrders: labOrdersRouter,
  nurse: nurseRouter,
  payments: paymentsRouter,
  notifications: notificationsRouter,
  messaging: messagingRouter,
  wallet: walletRouter,
  referrals: referralsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
```

### 3.3 tRPC Context Factory

Every tRPC procedure receives this context. The `user` and `ability` are populated after JWT validation.

```typescript
// trpc/trpc.context.ts
import { inferAsyncReturnType } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { AppAbility } from '../modules/auth/casl/casl-ability.factory';

export interface Context {
  prisma: PrismaClient;
  redis: Redis;
  user: {
    id: string;
    role: 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'NURSE' | 'LAB_TECH' | 'PHARMACY_STAFF';
    email: string;
    phone?: string;
    phoneVerified: boolean;
  } | null;
  ability: AppAbility | null;
  requestId: string;       // X-Correlation-Id for tracing
  ip: string;
}

export function createContext(
  opts: CreateFastifyContextOptions,
  prisma: PrismaClient,
  redis: Redis,
): Context {
  return {
    prisma,
    redis,
    user: null,     // Populated by auth middleware
    ability: null,  // Populated by auth middleware
    requestId: opts.req.headers['x-correlation-id'] as string || crypto.randomUUID(),
    ip: opts.req.ip,
  };
}

export type AppContext = inferAsyncReturnType<typeof createContext>;
```

### 3.4 tRPC Middleware

```typescript
// trpc/trpc.init.ts
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { Context } from './trpc.context';

const t = initTRPC.context<Context>().create({
  transformer: superjson, // Handles Date, Map, Set serialization
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Authenticated procedure — requires valid JWT
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({ ctx: { ...ctx, user: ctx.user, ability: ctx.ability! } });
});

// Role-specific procedures
export const doctorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== 'DOCTOR') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Doctor access required' });
  }
  return next({ ctx });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const nurseProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== 'NURSE') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Nurse access required' });
  }
  return next({ ctx });
});

export const labProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== 'LAB_TECH') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Lab staff access required' });
  }
  return next({ ctx });
});

export const pharmacyProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== 'PHARMACY_STAFF') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Pharmacy staff access required' });
  }
  return next({ ctx });
});

// Patient-only (phone must be verified)
export const patientProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== 'PATIENT') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Patient access required' });
  }
  if (!ctx.user.phoneVerified) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Phone verification required' });
  }
  return next({ ctx });
});
```

---

## 4. Auth Module

### 4.1 Authentication Flows

**Patient App (React Native):** Email/Google/Apple sign-up → mandatory phone OTP verification → JWT issued. Social login reduces onboarding friction; phone is mandatory for prescriptions, WhatsApp notifications, and delivery OTP.

**All Web Portals (Doctor, Admin, Nurse, Lab, Pharmacy):** Phone OTP only → JWT issued. No social login for portals — staff members are registered by admin with their phone numbers.

### 4.2 OTP Service

```typescript
// auth/otp/otp.service.ts
@Injectable()
export class OtpService {
  constructor(
    private redis: Redis,
    private otpDelivery: OtpDeliveryService,
  ) {}

  // Generate and send OTP
  async sendOtp(phone: string): Promise<{ success: boolean; channel: 'whatsapp' | 'sms' }> {
    // Rate limit: max 5 OTPs per phone per hour
    const rateLimitKey = `otp:ratelimit:${phone}`;
    const count = await this.redis.incr(rateLimitKey);
    if (count === 1) await this.redis.expire(rateLimitKey, 3600);
    if (count > 5) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Too many OTP requests. Try again in 1 hour.' });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash OTP before storing (never store plain OTP)
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Store in Redis with 5-minute TTL
    const otpKey = `otp:${phone}`;
    await this.redis.setex(otpKey, 300, JSON.stringify({
      hash: hashedOtp,
      attempts: 0,
      createdAt: Date.now(),
    }));

    // Send via WhatsApp (primary), fall back to SMS
    const channel = await this.otpDelivery.send(phone, otp);
    return { success: true, channel };
  }

  // Verify OTP
  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const otpKey = `otp:${phone}`;
    const stored = await this.redis.get(otpKey);

    if (!stored) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'OTP expired or not found. Request a new one.' });
    }

    const { hash, attempts } = JSON.parse(stored);

    // Max 3 verification attempts
    if (attempts >= 3) {
      await this.redis.del(otpKey);
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Too many failed attempts. Request a new OTP.' });
    }

    // Increment attempt counter
    await this.redis.set(otpKey, JSON.stringify({ hash, attempts: attempts + 1, createdAt: Date.now() }), 'KEEPTTL');

    const isValid = await bcrypt.compare(otp, hash);
    if (!isValid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Incorrect OTP. ${2 - attempts} attempts remaining.` });
    }

    // Delete OTP after successful verification
    await this.redis.del(otpKey);
    return true;
  }
}
```

### 4.3 OTP Delivery (WhatsApp + SMS Fallback)

```typescript
// auth/otp/otp.delivery.ts
@Injectable()
export class OtpDeliveryService {
  constructor(private httpService: HttpService) {}

  async send(phone: string, otp: string): Promise<'whatsapp' | 'sms'> {
    // Attempt WhatsApp via Gupshup first
    try {
      await this.sendWhatsApp(phone, otp);
      return 'whatsapp';
    } catch (error) {
      // WhatsApp failed — fall back to SMS
      this.logger.warn(`WhatsApp OTP failed for ${phone}, falling back to SMS`, error);
      await this.sendSms(phone, otp);
      return 'sms';
    }
  }

  private async sendWhatsApp(phone: string, otp: string): Promise<void> {
    // Gupshup WhatsApp Business API
    await this.httpService.axiosRef.post('https://api.gupshup.io/wa/api/v1/msg', {
      channel: 'whatsapp',
      source: process.env.GUPSHUP_WHATSAPP_NUMBER,
      destination: phone,
      'src.name': process.env.GUPSHUP_APP_NAME,
      template: JSON.stringify({
        id: process.env.GUPSHUP_OTP_TEMPLATE_ID,
        params: [otp],
      }),
    }, {
      headers: { apikey: process.env.GUPSHUP_API_KEY },
    });
  }

  private async sendSms(phone: string, otp: string): Promise<void> {
    // Gupshup SMS as primary SMS, MSG91 as fallback
    try {
      await this.httpService.axiosRef.post('https://enterprise.smsgupshup.com/GatewayAPI/rest', null, {
        params: {
          userid: process.env.GUPSHUP_SMS_USERID,
          password: process.env.GUPSHUP_SMS_PASSWORD,
          send_to: phone,
          msg: `Your Onlyou verification code is ${otp}. Valid for 5 minutes. Do not share this code.`,
          method: 'SendMessage',
          msg_type: 'TEXT',
          auth_scheme: 'plain',
        },
      });
    } catch {
      // MSG91 fallback
      await this.httpService.axiosRef.post('https://control.msg91.com/api/v5/otp', {
        template_id: process.env.MSG91_OTP_TEMPLATE_ID,
        mobile: phone,
        otp,
      }, {
        headers: { authkey: process.env.MSG91_AUTH_KEY },
      });
    }
  }
}
```

### 4.4 JWT Service

```typescript
// auth/auth.service.ts (JWT portion)
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaClient,
    private redis: Redis,
    private otpService: OtpService,
  ) {}

  // Issue token pair after successful OTP verification or social login
  async issueTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, role: true, email: true, phone: true, phoneVerified: true },
    });

    // Access token: 15 minutes, stored in memory (client-side)
    const accessToken = this.jwtService.sign(
      { sub: user.id, role: user.role, phoneVerified: user.phoneVerified },
      { expiresIn: '15m' },
    );

    // Refresh token: 7 days, stored in httpOnly cookie
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' },
    );

    // Store refresh token hash in Redis for revocation
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.redis.setex(`refresh:${refreshHash}`, 7 * 24 * 3600, userId);

    return { accessToken, refreshToken };
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify refresh token signature
    const payload = this.jwtService.verify(refreshToken);
    if (payload.type !== 'refresh') {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid refresh token' });
    }

    // Check if refresh token is still valid in Redis (not revoked)
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const storedUserId = await this.redis.get(`refresh:${refreshHash}`);
    if (!storedUserId || storedUserId !== payload.sub) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Refresh token revoked or expired' });
    }

    // Token rotation: delete old refresh token, issue new pair
    await this.redis.del(`refresh:${refreshHash}`);
    return this.issueTokens(payload.sub);
  }

  // Logout: revoke refresh token + blacklist access token
  async logout(accessToken: string, refreshToken: string): Promise<void> {
    // Blacklist current access token until its expiry
    const payload = this.jwtService.decode(accessToken) as { exp: number; sub: string };
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.setex(`blacklist:${accessToken}`, ttl, '1');
    }

    // Revoke refresh token
    if (refreshToken) {
      const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await this.redis.del(`refresh:${refreshHash}`);
    }
  }
}
```

### 4.5 Social Login (Patient App Only)

```typescript
// auth/auth.service.ts (social login portion)

// Google Sign-In
async socialLoginGoogle(idToken: string): Promise<{ user: User; isNewUser: boolean; tokens: TokenPair }> {
  const ticket = await this.googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const { email, name, sub: googleId, picture } = ticket.getPayload();

  // Find or create user
  let user = await this.prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
  });

  let isNewUser = false;
  if (!user) {
    user = await this.prisma.user.create({
      data: {
        email,
        name,
        googleId,
        role: 'PATIENT',
        phoneVerified: false, // Must verify phone next
        avatarUrl: picture,
      },
    });
    isNewUser = true;
  } else if (!user.googleId) {
    // Link Google account to existing email account
    await this.prisma.user.update({
      where: { id: user.id },
      data: { googleId },
    });
  }

  const tokens = await this.issueTokens(user.id);
  return { user, isNewUser, tokens };
}

// Apple Sign-In
async socialLoginApple(identityToken: string, fullName?: { givenName: string; familyName: string }): Promise<{ user: User; isNewUser: boolean; tokens: TokenPair }> {
  const decoded = jwt.decode(identityToken, { complete: true });
  // Verify with Apple's public keys (JWKS)
  const appleKeys = await this.getApplePublicKeys();
  const verified = jwt.verify(identityToken, appleKeys);

  const { sub: appleId, email } = verified as { sub: string; email: string };

  let user = await this.prisma.user.findFirst({
    where: { OR: [{ appleId }, { email }] },
  });

  let isNewUser = false;
  if (!user) {
    // Apple only sends name on FIRST sign-in — store it
    user = await this.prisma.user.create({
      data: {
        email,
        name: fullName ? `${fullName.givenName} ${fullName.familyName}` : 'Apple User',
        appleId,
        role: 'PATIENT',
        phoneVerified: false,
      },
    });
    isNewUser = true;
  } else if (!user.appleId) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { appleId },
    });
  }

  const tokens = await this.issueTokens(user.id);
  return { user, isNewUser, tokens };
}
```

### 4.6 CASL.js RBAC (Ability Factory)

```typescript
// auth/casl/casl-ability.factory.ts
import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { accessibleBy } from '@casl/prisma';

type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete';
type Subjects = 'Consultation' | 'Prescription' | 'LabOrder' | 'Order' | 'NurseVisit' |
                'User' | 'Message' | 'Wallet' | 'Notification' | 'Partner' | 'AuditLog' | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export function defineAbilitiesFor(user: { id: string; role: string }): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // ─── CANONICAL CASL RULES ─────────────────────────────────────────────
  // See BACKEND-PART3A §22.4 for the full, authoritative CASL ability definitions.
  // That document contains the properly scoped rules with field-level conditions.
  // DO NOT duplicate CASL rules here — this section only shows the factory scaffold.
  // ──────────────────────────────────────────────────────────────────────

  switch (user.role) {
    case 'PATIENT':
      // → See BACKEND-PART3A §22.4 for full patient CASL rules
      break;

    case 'DOCTOR':
      // → See BACKEND-PART3A §22.4 for full doctor CASL rules
      break;

    case 'ADMIN':
      can('manage', 'all');
      break;

    case 'NURSE':
      // → See BACKEND-PART3A §22.4 for full nurse CASL rules
      break;

    case 'LAB_TECH':
      // → See BACKEND-PART3A §22.4 for full lab CASL rules
      break;

    case 'PHARMACY_STAFF':
      // → See BACKEND-PART3A §22.4 for full pharmacy CASL rules
      break;
  }

  return build();
}
```

### 4.7 Auth tRPC Router

```typescript
// auth/auth.router.ts
export const authRouter = router({
  // Send OTP to phone number
  sendOtp: publicProcedure
    .input(z.object({ phone: z.string().regex(/^\+91\d{10}$/, 'Invalid Indian phone number') }))
    .mutation(async ({ input, ctx }) => {
      return ctx.otpService.sendOtp(input.phone);
    }),

  // Verify OTP and get tokens (for portal staff login)
  verifyOtp: publicProcedure
    .input(z.object({
      phone: z.string(),
      otp: z.string().length(6),
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.otpService.verifyOtp(input.phone, input.otp);
      const user = await ctx.prisma.user.findUnique({ where: { phone: input.phone } });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'No account found with this phone number' });
      return ctx.authService.issueTokens(user.id);
    }),

  // Verify phone OTP for patient (after social login)
  verifyPhoneOtp: protectedProcedure
    .input(z.object({ phone: z.string(), otp: z.string().length(6) }))
    .mutation(async ({ input, ctx }) => {
      await ctx.otpService.verifyOtp(input.phone, input.otp);
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { phone: input.phone, phoneVerified: true },
      });
      return ctx.authService.issueTokens(ctx.user.id); // Re-issue with phoneVerified=true
    }),

  // Google social login (patient only)
  socialLoginGoogle: publicProcedure
    .input(z.object({ idToken: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.authService.socialLoginGoogle(input.idToken);
    }),

  // Apple social login (patient only)
  socialLoginApple: publicProcedure
    .input(z.object({
      identityToken: z.string(),
      fullName: z.object({ givenName: z.string(), familyName: z.string() }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.authService.socialLoginApple(input.identityToken, input.fullName);
    }),

  // Refresh access token
  refreshToken: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.authService.refreshAccessToken(input.refreshToken);
    }),

  // Logout
  logout: protectedProcedure
    .input(z.object({ refreshToken: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const accessToken = ctx.req.headers.authorization?.replace('Bearer ', '');
      return ctx.authService.logout(accessToken, input.refreshToken);
    }),

  // Get current user (validate session)
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true, role: true, name: true, email: true, phone: true,
        phoneVerified: true, avatarUrl: true, createdAt: true,
      },
    });
  }),
});
```

---

## 5. Users Module

### 5.1 Service

```typescript
// users/users.service.ts
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaClient) {}

  // Get patient profile (for patient themselves)
  async getPatientProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        patientProfile: true,
        subscriptions: { where: { status: { in: ['ACTIVE', 'PAUSED'] } } },
        addresses: true,
        wallet: true,
        consentRecords: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  // Get patient summary for doctor (case review left panel)
  async getPatientForDoctor(patientId: string, doctorId: string) {
    // CASL check: doctor must be assigned to at least one of this patient's consultations
    const hasAccess = await this.prisma.consultation.findFirst({
      where: { patientId, doctorId },
    });
    if (!hasAccess) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not assigned to this patient' });
    }

    return this.prisma.user.findUniqueOrThrow({
      where: { id: patientId },
      select: {
        id: true, name: true, avatarUrl: true,
        patientProfile: {
          select: {
            dob: true, gender: true, city: true,
            govIdType: true, govIdVerified: true,
          },
        },
        // Active subscriptions
        subscriptions: {
          where: { status: 'ACTIVE' },
          select: { vertical: true, planType: true, startDate: true, endDate: true },
        },
        // All consultations with this doctor
        consultations: {
          where: { doctorId },
          select: { id: true, condition: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        // Current medications (from latest questionnaire responses)
        // Allergies (from latest questionnaire responses)
      },
    });
  }

  // Update patient profile
  async updatePatientProfile(userId: string, data: UpdateProfileDto) {
    return this.prisma.patientProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  // Doctor profile (for doctor settings page)
  async getDoctorProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        doctorProfile: true,
      },
    });
  }

  // Update doctor availability schedule
  async updateDoctorSchedule(userId: string, schedule: DoctorScheduleDto) {
    return this.prisma.doctorProfile.update({
      where: { userId },
      data: { availableSchedule: schedule },
    });
  }
}
```

### 5.2 tRPC Router

```typescript
// users/users.router.ts
export const usersRouter = router({
  // Patient: get own profile
  getMyProfile: patientProcedure.query(async ({ ctx }) => {
    return ctx.usersService.getPatientProfile(ctx.user.id);
  }),

  // Patient: update profile
  updateMyProfile: patientProcedure
    .input(updateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.usersService.updatePatientProfile(ctx.user.id, input);
    }),

  // Doctor: get patient summary (for case review)
  getPatientSummary: doctorProcedure
    .input(z.object({ patientId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return ctx.usersService.getPatientForDoctor(input.patientId, ctx.user.id);
    }),

  // Doctor: get own profile
  getDoctorProfile: doctorProcedure.query(async ({ ctx }) => {
    return ctx.usersService.getDoctorProfile(ctx.user.id);
  }),

  // Doctor: update availability
  updateDoctorSchedule: doctorProcedure
    .input(doctorScheduleSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.usersService.updateDoctorSchedule(ctx.user.id, input);
    }),

  // Admin: list all users (with filters)
  listUsers: adminProcedure
    .input(z.object({
      role: z.enum(['PATIENT', 'DOCTOR', 'ADMIN', 'NURSE', 'LAB_TECH', 'PHARMACY_STAFF']).optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ input, ctx }) => {
      const where: any = {};
      if (input.role) where.role = input.role;
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: 'insensitive' } },
          { email: { contains: input.search, mode: 'insensitive' } },
          { phone: { contains: input.search } },
        ];
      }
      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: 'desc' },
        }),
        ctx.prisma.user.count({ where }),
      ]);
      return { users, total, page: input.page, totalPages: Math.ceil(total / input.limit) };
    }),
});
```

---

## 6. Questionnaire Engine Module

### 6.1 JSON Schema Format (per condition)

Each condition's questionnaire is defined in a JSON file. The engine reads this schema and processes answers generically — no condition-specific code in the engine itself.

```typescript
// questionnaire/data/hair-loss.json (simplified example)
{
  "condition": "HAIR_LOSS",
  "version": "1.0",
  "totalQuestions": 25,
  "estimatedMinutes": 8,
  "sections": [
    {
      "id": "basics",
      "title": "Basic Information",
      "questions": [
        {
          "id": "q1_age",
          "text": "What is your age?",
          "type": "number",
          "validation": { "min": 18, "max": 80 },
          "required": true,
          "aiUse": "Age context for treatment planning. Under 25: caution with finasteride."
        },
        {
          "id": "q3_pattern",
          "text": "Where are you noticing hair loss?",
          "type": "single_select",
          "options": [
            { "value": "hairline", "label": "Receding hairline" },
            { "value": "crown", "label": "Thinning at the crown" },
            { "value": "overall", "label": "Overall thinning" },
            { "value": "patches", "label": "Specific patches/bald spots" },
            { "value": "front_and_crown", "label": "Both hairline and crown" }
          ],
          "skipLogic": {
            "if": { "field": "q2_gender", "equals": "female" },
            "showOptions": ["overall", "part_widening", "diffuse"]
          }
        }
      ]
    }
  ],
  "scoring": {
    "type": "none"  // Hair Loss has no validated scoring tool
    // ED has "iief5" (Q range), PE has "pedt" (Q4-Q8), Weight has "bmi", PCOS has "rotterdam"
  }
}
```

### 6.2 Skip Logic Evaluator

```typescript
// questionnaire/engine/skip-logic.ts
export function shouldShowQuestion(
  question: QuestionSchema,
  answers: Record<string, any>,
): boolean {
  if (!question.skipLogic) return true;

  const { condition } = question.skipLogic;
  if (!condition) return true;

  switch (condition.operator) {
    case 'equals':
      return answers[condition.field] === condition.value;
    case 'not_equals':
      return answers[condition.field] !== condition.value;
    case 'in':
      return condition.values.includes(answers[condition.field]);
    case 'not_in':
      return !condition.values.includes(answers[condition.field]);
    case 'greater_than':
      return answers[condition.field] > condition.value;
    case 'less_than':
      return answers[condition.field] < condition.value;
    default:
      return true;
  }
}

// Determine which questions to show based on current answers
export function getVisibleQuestions(
  schema: QuestionnaireSchema,
  answers: Record<string, any>,
): QuestionSchema[] {
  return schema.sections.flatMap(section =>
    section.questions.filter(q => shouldShowQuestion(q, answers))
  );
}
```

### 6.3 Scoring Engine

```typescript
// questionnaire/engine/scoring.ts

// IIEF-5 for ED (sum of Q range, 5-25 scale)
export function calculateIIEF5(answers: Record<string, number>): {
  score: number;
  severity: 'severe' | 'moderate' | 'mild_to_moderate' | 'mild' | 'no_ed';
} {
  const keys = ['q_iief1', 'q_iief2', 'q_iief3', 'q_iief4', 'q_iief5'];
  const score = keys.reduce((sum, k) => sum + (answers[k] || 0), 0);
  let severity: string;
  if (score <= 7) severity = 'severe';
  else if (score <= 11) severity = 'moderate';
  else if (score <= 16) severity = 'mild_to_moderate';
  else if (score <= 21) severity = 'mild';
  else severity = 'no_ed';
  return { score, severity };
}

// PEDT for PE (sum of Q4-Q8, 0-20 scale)
export function calculatePEDT(answers: Record<string, number>): {
  score: number;
  classification: 'no_pe' | 'borderline' | 'pe_likely';
} {
  const keys = ['q4_delay', 'q5_before', 'q6_stimulation', 'q7_frustrated', 'q8_partner'];
  const score = keys.reduce((sum, k) => sum + (answers[k] || 0), 0);
  let classification: string;
  if (score <= 8) classification = 'no_pe';
  else if (score <= 10) classification = 'borderline';
  else classification = 'pe_likely';
  return { score, classification };
}

// BMI for Weight Management
export function calculateBMI(weightKg: number, heightCm: number): {
  bmi: number;
  category: 'underweight' | 'normal' | 'overweight' | 'obese_1' | 'obese_2' | 'obese_3';
} {
  const heightM = heightCm / 100;
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));
  // WHO Asian BMI cutoffs (lower thresholds for Asian populations)
  let category: string;
  if (bmi < 18.5) category = 'underweight';
  else if (bmi < 23) category = 'normal';
  else if (bmi < 25) category = 'overweight';
  else if (bmi < 30) category = 'obese_1';
  else if (bmi < 35) category = 'obese_2';
  else category = 'obese_3';
  return { bmi, category };
}

// Rotterdam Criteria for PCOS (need 2 of 3)
export function checkRotterdamCriteria(answers: Record<string, any>): {
  criteriaMetCount: number;
  oligo: boolean;      // Oligo/anovulation
  hyperandrogenism: boolean; // Clinical or biochemical hyperandrogenism
  polycystic: boolean; // Polycystic ovaries on ultrasound
  isPCOSLikely: boolean;
} {
  const oligo = answers.irregular_periods === true || answers.cycles_per_year < 8;
  const hyperandrogenism = answers.acne_severe === true || answers.hirsutism === true || answers.elevated_androgens === true;
  const polycystic = answers.ultrasound_polycystic === true;
  const criteriaMetCount = [oligo, hyperandrogenism, polycystic].filter(Boolean).length;
  return { criteriaMetCount, oligo, hyperandrogenism, polycystic, isPCOSLikely: criteriaMetCount >= 2 };
}
```

### 6.4 Questionnaire Service

```typescript
// questionnaire/questionnaire.service.ts
@Injectable()
export class QuestionnaireService {
  private schemas: Map<string, QuestionnaireSchema> = new Map();

  constructor(private prisma: PrismaClient, private redis: Redis) {
    // Load all questionnaire schemas on startup
    this.schemas.set('HAIR_LOSS', require('./data/hair-loss.json'));
    this.schemas.set('ED', require('./data/ed.json'));
    this.schemas.set('PE', require('./data/pe.json'));
    this.schemas.set('WEIGHT', require('./data/weight.json'));
    this.schemas.set('PCOS', require('./data/pcos.json'));
  }

  // Get schema for rendering (patient app)
  getSchema(condition: Condition): QuestionnaireSchema {
    const schema = this.schemas.get(condition);
    if (!schema) throw new TRPCError({ code: 'NOT_FOUND', message: `No questionnaire for ${condition}` });
    return schema;
  }

  // Save progress (patient can resume later)
  async saveProgress(userId: string, condition: string, answers: Record<string, any>): Promise<void> {
    const key = `questionnaire:progress:${userId}:${condition}`;
    await this.redis.setex(key, 7 * 24 * 3600, JSON.stringify(answers)); // 7-day TTL
  }

  // Get saved progress
  async getProgress(userId: string, condition: string): Promise<Record<string, any> | null> {
    const key = `questionnaire:progress:${userId}:${condition}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Submit final answers → create QuestionnaireResponse + trigger AI
  async submitAnswers(
    userId: string,
    condition: Condition,
    answers: Record<string, any>,
  ): Promise<{ responseId: string; consultationId: string }> {
    const schema = this.getSchema(condition);

    // Validate all required questions answered
    const visibleQuestions = getVisibleQuestions(schema, answers);
    const requiredMissing = visibleQuestions
      .filter(q => q.required && !answers[q.id])
      .map(q => q.id);
    if (requiredMissing.length > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Missing required answers: ${requiredMissing.join(', ')}`,
      });
    }

    // Calculate scores
    let scores: Record<string, any> = {};
    if (condition === 'ED') scores = { iief5: calculateIIEF5(answers) };
    if (condition === 'PE') scores = { pedt: calculatePEDT(answers) };
    if (condition === 'WEIGHT') scores = { bmi: calculateBMI(answers.weight_kg, answers.height_cm) };
    if (condition === 'PCOS') scores = { rotterdam: checkRotterdamCriteria(answers) };

    // Emergency interrupt check (front-end, but double-check server-side)
    this.checkEmergencyFlags(condition, answers);

    // Store questionnaire response
    const response = await this.prisma.questionnaireResponse.create({
      data: {
        userId,
        condition,
        schemaVersion: schema.version,
        answers,        // JSONB
        scores,         // JSONB
        questionsShown: visibleQuestions.length,
        questionsTotal: schema.totalQuestions,
      },
    });

    // Clear saved progress
    await this.redis.del(`questionnaire:progress:${userId}:${condition}`);

    // Create consultation (status: SUBMITTED)
    const consultation = await this.prisma.consultation.create({
      data: {
        patientId: userId,
        condition,
        questionnaireResponseId: response.id,
        status: 'SUBMITTED',
        videoStatus: 'NOT_REQUIRED', // Will be set after doctor review if needed
      },
    });

    // Trigger AI assessment via BullMQ (async — don't block the patient)
    this.eventEmitter.emit('questionnaire.submitted', {
      consultationId: consultation.id,
      responseId: response.id,
      condition,
      answers,
      scores,
    });

    return { responseId: response.id, consultationId: consultation.id };
  }

  // Emergency check (server-side backup for front-end checks)
  private checkEmergencyFlags(condition: string, answers: Record<string, any>): void {
    if (answers.suicidal_thoughts === true) {
      this.logger.error('EMERGENCY: Suicidal ideation flagged', { condition });
      // Don't block submission — the AI will flag this, and the patient app
      // already showed emergency numbers on the front-end
    }
    if (condition === 'ED' && answers.chest_pain_activity === true) {
      this.logger.error('EMERGENCY: Chest pain during activity (ED)', { condition });
    }
  }
}
```

### 6.5 tRPC Router

```typescript
// questionnaire/questionnaire.router.ts
export const questionnaireRouter = router({
  // Get questionnaire schema (for rendering)
  getSchema: patientProcedure
    .input(z.object({ condition: z.enum(['HAIR_LOSS', 'ED', 'PE', 'WEIGHT', 'PCOS']) }))
    .query(async ({ input, ctx }) => {
      const schema = ctx.questionnaireService.getSchema(input.condition);
      const progress = await ctx.questionnaireService.getProgress(ctx.user.id, input.condition);
      return { schema, savedProgress: progress };
    }),

  // Save progress (auto-save as patient answers)
  saveProgress: patientProcedure
    .input(z.object({
      condition: z.enum(['HAIR_LOSS', 'ED', 'PE', 'WEIGHT', 'PCOS']),
      answers: z.record(z.unknown()),
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.questionnaireService.saveProgress(ctx.user.id, input.condition, input.answers);
      return { success: true };
    }),

  // Submit final answers
  submitAnswers: patientProcedure
    .input(z.object({
      condition: z.enum(['HAIR_LOSS', 'ED', 'PE', 'WEIGHT', 'PCOS']),
      answers: z.record(z.unknown()),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.questionnaireService.submitAnswers(ctx.user.id, input.condition, input.answers);
    }),
});
```

---

## 7. Photos Module

Handles patient photo uploads (hair loss: 4 required photos, weight: 2 optional). Photos go directly to S3 via presigned PUT URLs — the API server never handles binary photo data.

### 7.1 Service

```typescript
// photos/photos.service.ts
@Injectable()
export class PhotosService {
  constructor(
    private prisma: PrismaClient,
    private s3: S3Client,
  ) {}

  // Generate presigned PUT URL for direct upload (15-minute expiry)
  async getUploadUrl(userId: string, consultationId: string, photoType: string): Promise<{
    uploadUrl: string;
    s3Key: string;
    expiresIn: number;
  }> {
    const s3Key = `photos/${userId}/${consultationId}/${photoType}_${Date.now()}.jpg`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_PHOTOS,       // 'onlyou-photos'
      Key: s3Key,
      ContentType: 'image/jpeg',
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: process.env.KMS_KEY_ID,
      Metadata: {
        'user-id': userId,
        'consultation-id': consultationId,
        'photo-type': photoType,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 900 }); // 15 min
    return { uploadUrl, s3Key, expiresIn: 900 };
  }

  // Client confirms upload completed → store metadata in DB
  async confirmUpload(userId: string, s3Key: string, consultationId: string, photoType: string): Promise<void> {
    // Verify the object actually exists in S3
    try {
      await this.s3.send(new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET_PHOTOS,
        Key: s3Key,
      }));
    } catch {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Photo not found in storage. Upload may have failed.' });
    }

    await this.prisma.photo.create({
      data: {
        userId,
        consultationId,
        s3Key,
        photoType,       // 'top_head', 'front_hairline', 'left_side', 'right_side', 'full_body_front', 'full_body_side'
        bucket: process.env.S3_BUCKET_PHOTOS,
      },
    });
  }

  // Get CloudFront signed URL for viewing (1-hour expiry)
  async getViewUrl(s3Key: string, requestingUserId: string): Promise<string> {
    // CASL permission check happens in the router layer
    const cloudFrontUrl = `${process.env.CLOUDFRONT_PHOTOS_DOMAIN}/${s3Key}`;
    return this.signCloudFrontUrl(cloudFrontUrl, 3600); // 1 hour
  }

  private signCloudFrontUrl(url: string, expiresInSeconds: number): string {
    const signer = new CloudFrontSigner(
      process.env.CLOUDFRONT_KEY_PAIR_ID,
      process.env.CLOUDFRONT_PRIVATE_KEY,
    );
    return signer.getSignedUrl({
      url,
      dateLessThan: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    });
  }
}
```

### 7.2 Photo Requirements by Vertical

| Vertical | Photos Required | Photo Types |
|----------|----------------|-------------|
| Hair Loss | 4 required | `top_head`, `front_hairline`, `left_side`, `right_side` |
| Weight | 2 optional | `full_body_front`, `full_body_side` |
| ED | None | — |
| PE | None | — |
| PCOS | None | — |

---

## 8. AI Assessment Module

### 8.1 Pipeline

```
Questionnaire submitted
  → BullMQ `ai-assessment` queue
  → Processor picks up job
  → Build condition-specific prompt (system prompt + patient data)
  → Call Claude API (Anthropic)
  → Parse structured JSON response
  → Store AIAssessment in database
  → Update consultation status: SUBMITTED → AI_PROCESSING → AI_COMPLETE
  → Notify coordinator (new case ready for doctor assignment)
  → Emit event: 'ai.assessment.completed'
```

### 8.2 AI Service

```typescript
// ai/ai.service.ts
@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaClient,
    private anthropic: Anthropic,
  ) {}

  async generateAssessment(consultationId: string): Promise<AIAssessment> {
    // Fetch consultation with all related data
    const consultation = await this.prisma.consultation.findUniqueOrThrow({
      where: { id: consultationId },
      include: {
        questionnaireResponse: true,
        photos: true,
        patient: {
          include: { patientProfile: true },
        },
      },
    });

    const { condition, questionnaireResponse, patient } = consultation;

    // Load condition-specific system prompt
    const systemPrompt = this.getSystemPrompt(condition);

    // Build user message with structured patient data
    const userMessage = this.buildUserMessage(condition, questionnaireResponse, patient);

    // Call Claude API
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Parse structured JSON from Claude's response
    const assessment = this.parseAssessmentResponse(condition, response.content[0].text);

    // Store in database
    const stored = await this.prisma.aiAssessment.create({
      data: {
        consultationId,
        condition,
        classification: assessment.classification,
        confidenceLevel: assessment.confidenceLevel,
        attentionLevel: assessment.attentionLevel,    // LOW | MEDIUM | HIGH | CRITICAL
        redFlags: assessment.redFlags,                 // string[]
        contraindications: assessment.contraindications, // JSONB
        riskFactors: assessment.riskFactors,
        recommendedProtocol: assessment.recommendedProtocol,
        summary: assessment.summary,
        conditionSpecific: assessment.conditionSpecific, // JSONB — varies by condition
        rawResponse: response.content[0].text,          // Full Claude response for audit
        modelUsed: 'claude-sonnet-4-5-20250929',
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      },
    });

    // Update consultation status
    await this.prisma.consultation.update({
      where: { id: consultationId },
      data: {
        status: 'AI_COMPLETE',
        aiAssessmentId: stored.id,
      },
    });

    return stored;
  }

  private getSystemPrompt(condition: Condition): string {
    const prompts: Record<string, () => string> = {
      'HAIR_LOSS': () => require('./prompts/hair-loss.prompt').systemPrompt,
      'ED': () => require('./prompts/ed.prompt').systemPrompt,
      'PE': () => require('./prompts/pe.prompt').systemPrompt,
      'WEIGHT': () => require('./prompts/weight.prompt').systemPrompt,
      'PCOS': () => require('./prompts/pcos.prompt').systemPrompt,
    };
    return prompts[condition]();
  }

  private buildUserMessage(
    condition: string,
    qResponse: QuestionnaireResponse,
    patient: User & { patientProfile: PatientProfile },
  ): string {
    return `
PATIENT DATA:
- Age: ${this.calculateAge(patient.patientProfile.dob)}
- Gender: ${patient.patientProfile.gender}
- City: ${patient.patientProfile.city}

QUESTIONNAIRE RESPONSES:
${JSON.stringify(qResponse.answers, null, 2)}

CALCULATED SCORES:
${JSON.stringify(qResponse.scores, null, 2)}

Please analyze this patient's data and provide your assessment in the following JSON format:
{
  "classification": "<condition-specific classification>",
  "confidenceLevel": "high|medium|low",
  "attentionLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "redFlags": ["<list of red flags, empty if none>"],
  "contraindications": [{"medication": "<name>", "status": "safe|caution|blocked", "reason": "<why>"}],
  "riskFactors": ["<list of risk factors>"],
  "recommendedProtocol": "<recommended treatment template name>",
  "summary": "<2-3 paragraph clinical summary for the doctor>",
  "conditionSpecific": { <condition-specific fields per the spec> }
}
    `.trim();
  }
}
```

### 8.3 Condition-Specific AI Output Extensions

| Condition | Extra Fields in `conditionSpecific` |
|-----------|--------------------------------------|
| Hair Loss | `norwoodScale`, `finasterideSafetyCheck`, `alopeciaType` |
| ED | `iief5Score`, `iief5Severity`, `cardiovascularRisk`, `nitrateCheck` (RED if positive), `etiologyAssessment` |
| PE | `pedtScore`, `pedtClassification`, `peType` (lifelong/acquired/variable/situational), `estimatedIELT`, `comorbidED`, `psychologicalComponent`, `serotoninDrugCheck`, `seizureCheck` |
| Weight | `bmi`, `bmiCategory` (WHO Asian cutoffs), `metabolicRisk`, `eatingDisorderFlag`, `glp1Eligibility` |
| PCOS | `rotterdamCriteriaMet`, `pcosPheno­type`, `fertilityIntentBanner`, `insulinResistanceFlag` |

---

## 9. Consultations Module

### 9.1 Status Flow

```
SUBMITTED
  → AI_PROCESSING (BullMQ picks up AI job)
  → AI_COMPLETE (AI done, waiting for doctor assignment)
  → ASSIGNED (admin/auto assigns doctor)
  → REVIEWING (doctor opens case)
  → [Branch A] PRESCRIPTION_CREATED (doctor created prescription)
  → [Branch B] LAB_ORDERED (doctor ordered lab tests → LabOrder flow)
  → [Branch C] INFO_REQUESTED (doctor needs more info → patient notified)
  → [Branch D] REFERRED (doctor referred to partner clinic)
  → FOLLOW_UP (scheduled follow-up check-in)
  → COMPLETED (consultation complete)
```

**Video Status (parallel track, muted for MVP):**
```
NOT_REQUIRED → (default for MVP)
PENDING → SCHEDULED → IN_PROGRESS → COMPLETED
SKIPPED_TESTING → (auto-set when VIDEO_CONSULTATION_ENABLED = false)
```

### 9.2 Service

```typescript
// consultations/consultations.service.ts
@Injectable()
export class ConsultationsService {
  constructor(
    private prisma: PrismaClient,
    private eventEmitter: EventEmitter2,
  ) {}

  // List consultations for doctor queue
  async listForDoctor(doctorId: string, filters: ConsultationFilters) {
    const where: Prisma.ConsultationWhereInput = { doctorId };
    if (filters.condition) where.condition = filters.condition;
    if (filters.status) where.status = { in: filters.status };
    if (filters.attentionLevel) {
      where.aiAssessment = { attentionLevel: { in: filters.attentionLevel } };
    }

    return this.prisma.consultation.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, patientProfile: true } },
        aiAssessment: { select: { attentionLevel: true, classification: true, summary: true } },
      },
      orderBy: filters.sortBy === 'attention' 
        ? { aiAssessment: { attentionLevel: 'desc' } }
        : { createdAt: filters.sortBy === 'oldest' ? 'asc' : 'desc' },
    });
  }

  // Get full consultation detail (for case review)
  async getFullDetail(consultationId: string, doctorId: string) {
    const consultation = await this.prisma.consultation.findUniqueOrThrow({
      where: { id: consultationId },
      include: {
        patient: {
          include: {
            patientProfile: true,
            subscriptions: { where: { status: 'ACTIVE' } },
          },
        },
        questionnaireResponse: true,
        aiAssessment: true,
        photos: true,
        prescriptions: { orderBy: { createdAt: 'desc' } },
        labOrders: { orderBy: { createdAt: 'desc' } },
        messages: { orderBy: { createdAt: 'asc' }, take: 50 },
      },
    });

    // CASL check
    if (consultation.doctorId !== doctorId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not assigned to this case' });
    }

    // Auto-transition to REVIEWING when doctor opens case
    if (consultation.status === 'ASSIGNED') {
      await this.updateStatus(consultationId, 'REVIEWING', doctorId);
    }

    return consultation;
  }

  // Transition status with validation
  async updateStatus(consultationId: string, newStatus: ConsultationStatus, actorId: string): Promise<void> {
    const consultation = await this.prisma.consultation.findUniqueOrThrow({
      where: { id: consultationId },
    });

    // Validate transition
    const validTransitions: Record<string, string[]> = {
      'SUBMITTED': ['AI_PROCESSING'],
      'AI_PROCESSING': ['AI_COMPLETE'],
      'AI_COMPLETE': ['ASSIGNED'],
      'ASSIGNED': ['REVIEWING'],
      'REVIEWING': ['PRESCRIPTION_CREATED', 'LAB_ORDERED', 'INFO_REQUESTED', 'REFERRED', 'COMPLETED'],
      'INFO_REQUESTED': ['REVIEWING'],     // Patient responds → goes back to review
      'PRESCRIPTION_CREATED': ['FOLLOW_UP', 'COMPLETED'],
      'LAB_ORDERED': ['REVIEWING'],       // Lab results come back → re-review
      'REFERRED': ['COMPLETED'],
      'FOLLOW_UP': ['REVIEWING', 'COMPLETED'],
    };

    if (!validTransitions[consultation.status]?.includes(newStatus)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot transition from ${consultation.status} to ${newStatus}`,
      });
    }

    // Handle video auto-skip for MVP
    if (newStatus === 'PRESCRIPTION_CREATED' && !isFeatureEnabled('VIDEO_CONSULTATION_ENABLED')) {
      await this.prisma.consultation.update({
        where: { id: consultationId },
        data: {
          status: newStatus,
          videoStatus: 'SKIPPED_TESTING',
          [`${newStatus.toLowerCase()}At`]: new Date(),
        },
      });
    } else {
      await this.prisma.consultation.update({
        where: { id: consultationId },
        data: {
          status: newStatus,
          [`${newStatus.toLowerCase()}At`]: new Date(),
        },
      });
    }

    // Emit event for other modules to react
    this.eventEmitter.emit('consultation.statusChanged', {
      consultationId,
      previousStatus: consultation.status,
      newStatus,
      actorId,
    });
  }
}
```

---

## 10. Prescriptions Module

### 10.1 Service

```typescript
// prescriptions/prescriptions.service.ts
@Injectable()
export class PrescriptionsService {
  constructor(
    private prisma: PrismaClient,
    private pdfGenerator: PrescriptionPdfGenerator,
    private s3: S3Client,
    private eventEmitter: EventEmitter2,
  ) {}

  // Get available templates for a condition
  getTemplates(condition: Condition): PrescriptionTemplate[] {
    const templates: Record<string, () => PrescriptionTemplate[]> = {
      'HAIR_LOSS': () => require('./templates/hair-loss.templates').templates,
      'ED': () => require('./templates/ed.templates').templates,
      'PE': () => require('./templates/pe.templates').templates,
      'WEIGHT': () => require('./templates/weight.templates').templates,
      'PCOS': () => require('./templates/pcos.templates').templates,
    };
    return templates[condition]();
  }

  // Create prescription from template + doctor customizations
  async createPrescription(doctorId: string, data: CreatePrescriptionDto): Promise<Prescription> {
    const consultation = await this.prisma.consultation.findUniqueOrThrow({
      where: { id: data.consultationId },
      include: { patient: { include: { patientProfile: true } } },
    });

    // Verify doctor is assigned to this consultation
    if (consultation.doctorId !== doctorId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not assigned to this case' });
    }

    // Validate consultation is in reviewable status
    if (!['REVIEWING', 'LAB_ORDERED'].includes(consultation.status)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Consultation not in reviewable status' });
    }

    // Get doctor details for prescription header
    const doctor = await this.prisma.user.findUniqueOrThrow({
      where: { id: doctorId },
      include: { doctorProfile: true },
    });

    // Create prescription record
    const prescription = await this.prisma.prescription.create({
      data: {
        consultationId: data.consultationId,
        doctorId,
        patientId: consultation.patientId,
        condition: consultation.condition,
        templateUsed: data.templateName || 'custom',
        medications: data.medications,      // JSONB: [{drug, dosage, frequency, duration, instructions}]
        counselingNotes: data.counselingNotes,
        diagnosis: data.diagnosis,
        status: 'DRAFT',
      },
    });

    return prescription;
  }

  // Sign prescription → generate PDF → store in S3
  async signAndGenerate(prescriptionId: string, doctorId: string, signatureDataUrl: string): Promise<string> {
    const prescription = await this.prisma.prescription.findUniqueOrThrow({
      where: { id: prescriptionId },
      include: {
        consultation: { include: { patient: { include: { patientProfile: true } } } },
        doctor: { include: { doctorProfile: true } },
      },
    });

    if (prescription.doctorId !== doctorId) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    // Generate PDF using @react-pdf/renderer
    const pdfBuffer = await this.pdfGenerator.generate({
      prescription,
      patient: prescription.consultation.patient,
      doctor: prescription.doctor,
      signatureDataUrl,
    });

    // Upload to S3
    const s3Key = `prescriptions/${prescription.patientId}/${prescription.id}_${Date.now()}.pdf`;
    await this.s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_PRESCRIPTIONS,  // 'onlyou-prescriptions'
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: process.env.KMS_KEY_ID,
    }));

    // Update prescription with PDF URL and signed status
    await this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        status: 'SIGNED',
        pdfS3Key: s3Key,
        digitalSignatureUrl: signatureDataUrl,
        signedAt: new Date(),
      },
    });

    // Update consultation status
    await this.prisma.consultation.update({
      where: { id: prescription.consultationId },
      data: { status: 'PRESCRIPTION_CREATED', prescribedAt: new Date() },
    });

    // Emit event → creates Order, notifies patient + coordinator
    this.eventEmitter.emit('prescription.created', {
      prescriptionId,
      consultationId: prescription.consultationId,
      patientId: prescription.patientId,
      doctorId,
      medications: prescription.medications,
      condition: prescription.condition,
    });

    return s3Key;
  }
}
```

### 10.2 PDF Generator

```typescript
// prescriptions/pdf-generator.ts
import { renderToBuffer } from '@react-pdf/renderer';
import { PrescriptionDocument } from './PrescriptionDocument'; // React component

@Injectable()
export class PrescriptionPdfGenerator {
  async generate(data: PrescriptionPdfData): Promise<Buffer> {
    // PrescriptionDocument is a React component using @react-pdf/renderer
    // Contains: header (doctor details, NMC number, date), patient info,
    // diagnosis, medications table, counseling notes, signature, footer
    const buffer = await renderToBuffer(
      <PrescriptionDocument
        doctor={{
          name: data.doctor.name,
          nmcNumber: data.doctor.doctorProfile.nmcNumber,
          specializations: data.doctor.doctorProfile.specializations,
          clinicAddress: data.doctor.doctorProfile.clinicAddress,
        }}
        patient={{
          name: data.patient.name,
          age: this.calculateAge(data.patient.patientProfile.dob),
          gender: data.patient.patientProfile.gender,
          city: data.patient.patientProfile.city,
        }}
        prescription={{
          id: data.prescription.id,
          date: data.prescription.createdAt,
          diagnosis: data.prescription.diagnosis,
          medications: data.prescription.medications,
          counselingNotes: data.prescription.counselingNotes,
        }}
        signatureDataUrl={data.signatureDataUrl}
      />
    );
    return buffer;
  }
}
```

### 10.3 Prescription Templates (PE Example)

```typescript
// prescriptions/templates/pe.templates.ts
export const templates: PrescriptionTemplate[] = [
  {
    name: 'On-Demand Dapoxetine 30mg',
    description: 'First-line for lifelong PE. No serotonergic drug interactions.',
    medications: [
      {
        drug: 'Dapoxetine 30mg',
        dosage: '30mg',
        frequency: 'Take 1-3 hours before anticipated sexual activity',
        duration: '30 days (8 tablets)',
        instructions: 'Max once per 24 hours. Take with water, food optional. Do NOT combine with alcohol.',
      },
    ],
    counselingNotes: 'Do NOT combine dapoxetine with alcohol (increased risk of fainting). Do NOT take if you have taken any SSRI, SNRI, MAOI, or triptan in the last 14 days. Stay hydrated. Common side effects: nausea, dizziness, headache — usually mild, improve with use. If you feel faint or dizzy, sit or lie down immediately. Give it 4-6 attempts before judging effectiveness. Behavioral techniques (start-stop, squeeze) complement medication.',
    whenToUse: 'First-line for lifelong PE. No serotonergic drug interactions.',
  },
  {
    name: 'On-Demand Dapoxetine 60mg',
    description: '30mg insufficient after 4+ attempts, no CYP3A4 inhibitors.',
    medications: [
      {
        drug: 'Dapoxetine 60mg',
        dosage: '60mg',
        frequency: 'Take 1-3 hours before anticipated sexual activity',
        duration: '30 days (8 tablets)',
        instructions: 'Max once per 24 hours. Same precautions as 30mg.',
      },
    ],
    counselingNotes: 'Same as 30mg template.',
    whenToUse: '30mg insufficient after 4+ attempts, no CYP3A4 inhibitors.',
  },
  {
    name: 'Daily Paroxetine',
    description: 'Acquired PE, or patient prefers daily medication, or PE with comorbid depression/anxiety.',
    medications: [
      {
        drug: 'Paroxetine 10mg',
        dosage: '10mg',
        frequency: 'Once daily (morning)',
        duration: '30 days',
        instructions: 'Increase to 20mg after 2 weeks if tolerated and needed. Takes 1-2 weeks for full effect.',
      },
    ],
    counselingNotes: 'Paroxetine is a daily medication — take it every day at the same time. Full effect takes 1-2 weeks. Do not stop suddenly; taper off under doctor guidance. May cause initial drowsiness, decreased appetite. Sexual side effects (delayed ejaculation) are actually the therapeutic effect for PE.',
    whenToUse: 'Acquired PE, or patient prefers daily medication, or PE with comorbid depression/anxiety.',
  },
  {
    name: 'Combined ED+PE',
    description: 'PE comorbid with ED — tadalafil for erections, dapoxetine for ejaculation control.',
    medications: [
      {
        drug: 'Tadalafil 5mg',
        dosage: '5mg',
        frequency: 'Once daily',
        duration: '30 days',
        instructions: 'Take at the same time each day.',
      },
      {
        drug: 'Dapoxetine 30mg',
        dosage: '30mg',
        frequency: 'On-demand, 1-3 hours before sexual activity',
        duration: '30 days (8 tablets)',
        instructions: 'Max once per 24 hours.',
      },
    ],
    counselingNotes: 'Tadalafil daily provides consistent erectile support. Dapoxetine on-demand addresses ejaculation timing. These are safe to combine. Do not use dapoxetine with other SSRIs. Avoid excessive alcohol.',
    whenToUse: 'PE comorbid with ED — combined treatment approach.',
  },
  {
    name: 'Topical Only',
    description: 'When dapoxetine is contraindicated (patient on SSRIs, seizure history, liver disease).',
    medications: [
      {
        drug: 'Lidocaine-Prilocaine Cream 5%',
        dosage: 'Apply thin layer',
        frequency: 'Apply 15-20 minutes before sexual activity',
        duration: '1 tube (30g)',
        instructions: 'Wash off before contact. Use condom to prevent partner numbness. Do not apply to broken skin.',
      },
    ],
    counselingNotes: 'Since oral PE medications are not suitable for you due to your current medications/medical history, this topical cream provides local desensitization. Apply 15-20 minutes before, wash thoroughly before contact.',
    whenToUse: 'Dapoxetine contraindicated (on SSRIs, seizure history, liver disease).',
  },
  {
    name: 'Behavioral + Medication',
    description: 'Significant psychological component, wants holistic approach.',
    medications: [
      {
        drug: 'Dapoxetine 30mg',
        dosage: '30mg',
        frequency: 'On-demand',
        duration: '30 days (8 tablets)',
        instructions: 'Same as standard dapoxetine instructions.',
      },
    ],
    counselingNotes: 'In addition to medication, I recommend practicing these behavioral techniques: 1) Start-Stop technique: stimulate until close to ejaculation, stop completely for 30 seconds, then resume. Repeat 3 times before allowing ejaculation. 2) Squeeze technique: at the point of no return, firmly squeeze the tip of the penis for 10-20 seconds until the urge subsides. 3) Pelvic floor exercises (Kegels): 10 contractions, 3 times daily. These techniques combined with medication produce the best long-term results.',
    whenToUse: 'Significant psychological component, wants holistic approach.',
  },
  {
    name: 'Custom',
    description: 'Doctor builds from scratch for complex cases.',
    medications: [],
    counselingNotes: '',
    whenToUse: 'Complex cases requiring individualized approach.',
  },
];
```

---

*End of BACKEND.md Part 1 (Sections 1–10). Continue with Part 2 for sections 11–20 (Orders, Lab Orders, Nurse, Payments, Notifications, Messaging, Wallet, Admin, Jobs, S3/CloudFront).*
