# ONLYOU — ARCHITECTURE & TECH STACK

> **Complete system architecture, infrastructure decisions, and technical design.**
> Source of truth: Architecture Blueprint + onlyou-spec-resolved-v4.md

---

## 1. ARCHITECTURE PHILOSOPHY

**Modular monolith** — NOT microservices. A non-technical founder building with Claude AI cannot maintain distributed systems. The backend is a single NestJS application with well-defined module boundaries, designed for future extraction when scale demands it.

### Core Principles
- **TypeScript everywhere** — backend, frontend, mobile, shared packages. One language, one mental model.
- **Type safety end-to-end** — tRPC eliminates API contract drift between server and all 7 clients.
- **AI-friendly architecture** — consistent file naming, module patterns, and code conventions so Claude produces coherent code across the entire codebase. Every module follows the same structure (module → service → router → dto).
- **Healthcare-first** — every architectural decision is evaluated against DPDPA compliance, audit requirements, and patient data safety.
- **India-first** — WhatsApp as primary channel, UPI payment handling, tier-2/3 network optimization, Chinese OEM Android push notification workarounds.
- **Ship fast, scale later** — manual processes for MVP (coordinator-managed delivery, partner pharmacy), with clear automation triggers documented.

---

## 2. HIGH-LEVEL SYSTEM DIAGRAM

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                      │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │
│  │  Patient App │  │   Doctor    │  │    Admin    │  │    Nurse     │   │
│  │ React Native │  │  Next.js   │  │  Next.js   │  │  Next.js PWA │   │
│  │    Expo      │  │  Portal    │  │  Portal    │  │   Portal     │   │
│  └──────┬───────┘  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘   │
│         │                │               │                │            │
│  ┌──────┴────┐  ┌────────┴───┐  ┌────────┴──────┐  ┌─────┴────────┐   │
│  │  Lab      │  │  Pharmacy  │  │  Landing Page │  │  Delivery    │   │
│  │  Next.js  │  │  Next.js   │  │  Next.js SSG  │  │  SMS Link    │   │
│  │  PWA      │  │  PWA       │  │               │  │  (no portal) │   │
│  └─────┬─────┘  └─────┬─────┘  └───────────────┘  └──────┬───────┘   │
│        │              │                                    │           │
└────────┼──────────────┼────────────────────────────────────┼───────────┘
         │              │                                    │
         ▼              ▼                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        AWS INFRASTRUCTURE                                 │
│                                                                          │
│  ┌─────────────────────────────────────────────┐                        │
│  │              CloudFront CDN                  │                        │
│  │   (17+ Indian edge locations, signed URLs)   │                        │
│  └──────────────────────┬──────────────────────┘                        │
│                         │                                                │
│  ┌──────────────────────▼──────────────────────┐                        │
│  │        Application Load Balancer (ALB)       │                        │
│  └──────────────────────┬──────────────────────┘                        │
│                         │                                                │
│  ┌──────────────────────▼──────────────────────┐                        │
│  │         ECS Fargate (NestJS Backend)         │                        │
│  │    ┌──────────────────────────────────┐      │                        │
│  │    │  NestJS + Fastify + tRPC + Prisma │      │                        │
│  │    │  ┌─────┐ ┌─────┐ ┌──────┐       │      │                        │
│  │    │  │Auth │ │ AI  │ │Orders│ ...    │      │                        │
│  │    │  └─────┘ └─────┘ └──────┘       │      │                        │
│  │    └──────────────────────────────────┘      │                        │
│  │    ┌──────────────────────────────────┐      │                        │
│  │    │  BullMQ Workers (same process)    │      │                        │
│  │    └──────────────────────────────────┘      │                        │
│  │    ┌──────────────────────────────────┐      │                        │
│  │    │  PgBouncer Sidecar (Stage 2+)     │      │                        │
│  │    └──────────────────────────────────┘      │                        │
│  └─────────────────────────────────────────────┘                        │
│         │              │              │                                   │
│         ▼              ▼              ▼                                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                           │
│  │ PostgreSQL │ │   Redis    │ │     S3     │                           │
│  │  RDS       │ │ ElastiCache│ │  (SSE-KMS) │                           │
│  │  Mumbai    │ │   Mumbai   │ │   Mumbai   │                           │
│  └────────────┘ └────────────┘ └────────────┘                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

EXTERNAL SERVICES:
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Razorpay │ │ Gupshup  │ │  Claude  │ │   FCM    │
│ Payments │ │ WhatsApp │ │    AI    │ │   Push   │
│  + UPI   │ │  + SMS   │ │   API    │ │  Notifs  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## 3. TECH STACK — COMPLETE DECISION TABLE

| Layer | Choice | Why This | What Was Rejected |
|---|---|---|---|
| **Backend Framework** | NestJS + Fastify adapter | Healthcare-proven, largest Node.js enterprise ecosystem, Guards/Interceptors for compliance, 2x JSON perf with Fastify | Express (slower), Django (Python/TS split), Go/Gin (language switch cost), Fastify standalone (lacks NestJS ecosystem) |
| **API Protocol** | tRPC (7 internal TS clients) + REST (external partners) | 40-50% less boilerplate than GraphQL, zero code generation, types flow automatically, 3.5x smaller bundle than Apollo Client | GraphQL (8,200-line type files, Apollo cache pain, 1,864ms vs 922ms latency), REST only (no type safety) |
| **ORM** | Prisma (Query Compiler enabled) | Best DX for AI-generated code, auto-generated types, relation API, Prisma Studio for visual DB inspection | Drizzle (younger ecosystem, fewer NestJS examples), TypeORM (maintenance concerns), raw SQL (too slow to develop) |
| **Database** | PostgreSQL 16 on RDS Mumbai | JSONB for flexible schemas, pgAudit for compliance, pgcrypto for encryption, RLS for access control | MongoDB (no relational integrity), CockroachDB (overkill for single-region), Supabase (Edge Functions can't process PHI) |
| **Cache / Queue** | Redis on ElastiCache Mumbai | Session store, BullMQ queues, SSE pub/sub, JWT blacklist — single service covers 4 use cases | Memcached (no pub/sub), SQS (separate service for queues) |
| **Mobile App** | React Native Expo (managed + dev builds) | Fastest path for AI-assisted development, healthcare features work in managed workflow, Hermes engine for performance | Flutter (Dart = different language), native iOS+Android (2x codebase), Ionic (performance) |
| **Web Portals** | Separate Next.js 14 apps (one per subdomain) | Independent deployment, security isolation, smaller bundles (30-50% reduction), no cross-portal code leakage | Single Next.js with middleware routing (bundle contamination, deployment coupling, security risk) |
| **Monorepo** | Turborepo + pnpm workspaces | 15-minute setup, proven with Expo + Next.js + NestJS, build caching | Nx (1-4 hour setup, 200+ lines config), Lerna (deprecated approach), standalone pnpm (no caching) |
| **Real-time** | SSE + Redis Pub/Sub | No sticky sessions on Fargate, covers 95% of use cases (server→client), standard HTTP handled by ALB | WebSockets/Socket.io (sticky sessions required, React Native issues with ALB), Ably/Pusher (vendor dependency, unnecessary cost) |
| **Background Jobs** | BullMQ + Bull Board | Already have Redis, covers all job types (cron, delayed, event-triggered, flows), free monitoring UI | Temporal (requires dedicated infra), Inngest (SaaS dependency for critical ops), pg-boss (lower throughput) |
| **Auth** | Custom NestJS JWT + WhatsApp OTP (primary) + SMS fallback | Full DPDPA control, cheapest at scale, exact RBAC needed for 6 roles | Clerk (no Indian OTP), Auth0 ($6,300/mo at 100K users), Firebase Auth (no HIPAA BAA), Supabase Auth (no HIPAA BAA) |
| **Patient Auth** | Email/Google/Apple sign-up + **mandatory phone OTP** | Better onboarding UX (social login reduces friction), phone mandatory for prescriptions/WhatsApp notifications | Phone OTP only (higher drop-off), email+password only (no phone for prescriptions) |
| **RBAC** | CASL.js + NestJS Guards | Attribute-based rules ("doctor can only see own patients"), Prisma query-level enforcement via @casl/prisma | Simple role checks (insufficient for healthcare), Casbin (heavier setup) |
| **File Storage** | S3 (SSE-KMS) + CloudFront signed URLs + OAC | 17+ Indian edge locations, compliance-grade encryption, CloudTrail audit logging, 5-30ms latency in tier-2/3 cities | Firebase Storage (no HIPAA), Cloudinary (image-focused, not document-grade), Supabase Storage (no Mumbai with HIPAA) |
| **PDF Generation** | @react-pdf/renderer | 10x lighter than Puppeteer, React component model, runs on Node.js without headless Chrome | Puppeteer (heavy, needs Chrome, expensive on Fargate), wkhtmltopdf (deprecated), PDFKit (lower-level API) |
| **Payments** | Razorpay (subscriptions + one-time) | UPI Autopay support, dominant Indian payment processor, recurring billing API | Stripe (limited UPI support in India), PayU (smaller developer ecosystem), Cashfree (newer, less docs) |
| **WhatsApp/SMS** | Gupshup (primary: WhatsApp + SMS) + MSG91 (SMS-only fallback) | Meta-approved BSP, dominant in India, regional language support, enterprise reliability | Twilio (expensive for India), direct WhatsApp Business API (complex self-hosting) |
| **AI Engine** | Claude API (Anthropic) | Superior medical reasoning, condition-specific prompt engineering, structured output | GPT-4 (comparable but more expensive), Gemini (less proven for medical), local LLM (insufficient quality) |
| **Blog CMS** | Sanity CMS (headless) | Visual editor for non-dev content, free tier, real-time preview, structured content | WordPress (heavy), Contentful (expensive), MDX files (no visual editing for non-dev) |
| **Email** | Resend (MVP) → SES (scale) | 5-line setup, 100/day free, React Email templates, migrate to SES when volume grows | SES from day one (complex setup for MVP), SendGrid (unnecessary cost), Postmark (no Indian server) |
| **Infrastructure** | AWS Mumbai (ECS Fargate, RDS, ElastiCache, S3, CloudFront) | Data residency compliance (DPDPA), $50-80/month at MVP, mature healthcare customer base | GCP (fewer Indian edge locations), Azure (higher cost), DigitalOcean (lacks managed services) |

---

## 4. MONOREPO STRUCTURE

```
onlyou/
├── turbo.json                    → Turborepo pipeline config (~20 lines)
├── pnpm-workspace.yaml           → Workspace definitions
├── .npmrc                        → node-linker=hoisted (React Native requirement)
├── package.json                  → Root scripts (dev, build, lint, test)
│
├── apps/
│   ├── api/                      → NestJS + Fastify backend
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts           → Fastify adapter bootstrap
│   │   │   ├── trpc/             → tRPC router definitions
│   │   │   │   ├── trpc.module.ts
│   │   │   │   ├── trpc.router.ts    → Root router (merges all sub-routers)
│   │   │   │   └── trpc.context.ts   → Request context (user, role, permissions)
│   │   │   ├── rest/             → REST controllers (external partners only)
│   │   │   │   ├── webhook.controller.ts   → Razorpay/Gupshup webhooks
│   │   │   │   └── delivery.controller.ts  → Delivery person SMS link endpoints
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.service.ts         → OTP generation, JWT issue/refresh
│   │   │   │   ├── auth.guard.ts           → JWT validation guard
│   │   │   │   ├── roles.guard.ts          → Role-based access guard
│   │   │   │   ├── casl-ability.factory.ts → CASL permission definitions
│   │   │   │   ├── strategies/
│   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   ├── google.strategy.ts
│   │   │   │   │   └── apple.strategy.ts
│   │   │   │   └── otp/
│   │   │   │       ├── otp.service.ts      → Generate, hash, verify OTP
│   │   │   │       └── otp.delivery.ts     → WhatsApp (Gupshup) + SMS fallback
│   │   │   ├── users/
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── users.router.ts         → tRPC router for user operations
│   │   │   │   └── dto/
│   │   │   ├── questionnaire/
│   │   │   │   ├── questionnaire.module.ts
│   │   │   │   ├── questionnaire.service.ts
│   │   │   │   ├── questionnaire.router.ts
│   │   │   │   ├── engine/                 → Shared rendering engine
│   │   │   │   │   ├── skip-logic.ts
│   │   │   │   │   ├── scoring.ts          → IIEF-5, PEDT, BMI, Rotterdam
│   │   │   │   │   └── validation.ts
│   │   │   │   └── data/                   → Per-condition JSON schemas
│   │   │   │       ├── hair-loss.json
│   │   │   │       ├── ed.json
│   │   │   │       ├── pe.json
│   │   │   │       ├── weight.json
│   │   │   │       └── pcos.json
│   │   │   ├── photos/
│   │   │   │   ├── photos.module.ts
│   │   │   │   ├── photos.service.ts       → S3 presigned URL generation
│   │   │   │   └── photos.router.ts
│   │   │   ├── ai/
│   │   │   │   ├── ai.module.ts
│   │   │   │   ├── ai.service.ts           → Claude API integration
│   │   │   │   ├── ai.router.ts
│   │   │   │   └── prompts/                → Per-condition system prompts
│   │   │   │       ├── hair-loss.prompt.ts
│   │   │   │       ├── ed.prompt.ts
│   │   │   │       ├── pe.prompt.ts
│   │   │   │       ├── weight.prompt.ts
│   │   │   │       └── pcos.prompt.ts
│   │   │   ├── consultations/
│   │   │   │   ├── consultations.module.ts
│   │   │   │   ├── consultations.service.ts → Full lifecycle + video status (muted)
│   │   │   │   └── consultations.router.ts
│   │   │   ├── prescriptions/
│   │   │   │   ├── prescriptions.module.ts
│   │   │   │   ├── prescriptions.service.ts
│   │   │   │   ├── prescriptions.router.ts
│   │   │   │   ├── pdf-generator.ts        → @react-pdf/renderer templates
│   │   │   │   └── templates/              → Per-condition prescription templates
│   │   │   ├── orders/
│   │   │   │   ├── orders.module.ts
│   │   │   │   ├── orders.service.ts       → Medication orders + delivery + OTP
│   │   │   │   └── orders.router.ts
│   │   │   ├── lab-orders/
│   │   │   │   ├── lab-orders.module.ts
│   │   │   │   ├── lab-orders.service.ts   → Blood work lifecycle + sample tracking
│   │   │   │   └── lab-orders.router.ts
│   │   │   ├── nurse/
│   │   │   │   ├── nurse.module.ts
│   │   │   │   ├── nurse.service.ts        → Assignments, vitals, visits
│   │   │   │   └── nurse.router.ts
│   │   │   ├── payments/
│   │   │   │   ├── payments.module.ts
│   │   │   │   ├── payments.service.ts     → Razorpay integration
│   │   │   │   ├── subscription.service.ts → Plan management, renewals
│   │   │   │   └── payments.router.ts
│   │   │   ├── notifications/
│   │   │   │   ├── notifications.module.ts
│   │   │   │   ├── notifications.service.ts
│   │   │   │   ├── channels/
│   │   │   │   │   ├── whatsapp.channel.ts  → Gupshup API
│   │   │   │   │   ├── sms.channel.ts       → Gupshup SMS (primary) + MSG91 (fallback)
│   │   │   │   │   ├── push.channel.ts      → FCM
│   │   │   │   │   └── email.channel.ts     → Resend (MVP: 100/day free, 5-line setup; migrate to SES at scale)
│   │   │   │   └── templates/               → Message templates per event
│   │   │   ├── messaging/
│   │   │   │   ├── messaging.module.ts
│   │   │   │   ├── messaging.service.ts     → Doctor-patient async chat
│   │   │   │   ├── messaging.router.ts
│   │   │   │   └── sse.gateway.ts           → SSE for real-time message delivery
│   │   │   ├── wallet/
│   │   │   │   ├── wallet.module.ts
│   │   │   │   ├── wallet.service.ts        → Credits, refunds, promo codes
│   │   │   │   └── wallet.router.ts
│   │   │   ├── referrals/
│   │   │   │   ├── referrals.module.ts
│   │   │   │   └── referrals.service.ts
│   │   │   ├── admin/
│   │   │   │   ├── admin.module.ts
│   │   │   │   ├── admin.service.ts         → Partner management, SLA engine
│   │   │   │   ├── admin.router.ts
│   │   │   │   └── sla/
│   │   │   │       ├── sla.service.ts       → Threshold checks, escalation
│   │   │   │       └── sla.config.ts        → All SLA thresholds
│   │   │   ├── jobs/                        → BullMQ queue definitions
│   │   │   │   ├── jobs.module.ts
│   │   │   │   ├── queues/
│   │   │   │   │   ├── subscription-renewal.queue.ts
│   │   │   │   │   ├── sla-check.queue.ts
│   │   │   │   │   ├── notification-dispatch.queue.ts
│   │   │   │   │   ├── ai-assessment.queue.ts
│   │   │   │   │   ├── pdf-generation.queue.ts
│   │   │   │   │   └── scheduled-reminder.queue.ts
│   │   │   │   └── processors/
│   │   │   ├── common/
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── audit-log.interceptor.ts  → Logs every action
│   │   │   │   │   └── transform.interceptor.ts
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/
│   │   │   │   │   └── all-exceptions.filter.ts
│   │   │   │   └── middleware/
│   │   │   └── config/
│   │   │       ├── feature-flags.ts         → VIDEO_CONSULTATION_ENABLED, etc.
│   │   │       ├── database.config.ts
│   │   │       └── redis.config.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── mobile/                   → React Native Expo (patient app)
│   │   ├── app.json
│   │   ├── src/
│   │   │   ├── app/              → Expo Router (file-based routing)
│   │   │   │   ├── (auth)/       → Login, signup, OTP verification
│   │   │   │   ├── (tabs)/       → Main tab navigator
│   │   │   │   │   ├── home/
│   │   │   │   │   ├── explore/
│   │   │   │   │   ├── activity/
│   │   │   │   │   ├── messages/
│   │   │   │   │   └── profile/
│   │   │   │   ├── questionnaire/ → Dynamic questionnaire screens
│   │   │   │   ├── photo-upload/
│   │   │   │   ├── treatment/    → Plan selection, payment
│   │   │   │   ├── lab-booking/
│   │   │   │   └── lab-results/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   │   ├── useTRPC.ts    → tRPC client hook
│   │   │   │   └── useAuth.ts
│   │   │   ├── services/
│   │   │   │   ├── trpc.ts       → tRPC client configuration
│   │   │   │   ├── auth.ts
│   │   │   │   └── notifications.ts → FCM + AutoStarter setup
│   │   │   ├── stores/           → Zustand state management
│   │   │   └── utils/
│   │   ├── eas.json
│   │   └── package.json
│   │
│   ├── doctor-portal/            → doctor.onlyou.life
│   │   ├── src/app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          → Case queue (default landing)
│   │   │   ├── case/[id]/        → Case review (3-panel)
│   │   │   ├── patients/         → My patients
│   │   │   ├── stats/            → Doctor statistics
│   │   │   └── settings/         → Profile, availability, canned messages
│   │   └── package.json
│   │
│   ├── admin-portal/             → admin.onlyou.life
│   │   ├── src/app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          → Overview (real-time dashboard)
│   │   │   ├── lab-orders/       → Blood work pipeline
│   │   │   ├── deliveries/       → Medication delivery pipeline
│   │   │   ├── partners/         → Nurses, labs, pharmacies, clinics
│   │   │   └── settings/         → Users, plans, flags, audit log
│   │   └── package.json
│   │
│   ├── nurse-portal/             → nurse.onlyou.life (PWA)
│   │   ├── src/app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          → Today's assignments
│   │   │   └── visit/[id]/       → Visit flow (verify → vitals → collect → complete)
│   │   ├── public/manifest.json  → PWA manifest
│   │   ├── public/sw.js          → Service worker for offline
│   │   └── package.json
│   │
│   ├── lab-portal/               → lab.onlyou.life (PWA)
│   │   ├── src/app/
│   │   │   ├── layout.tsx
│   │   │   ├── incoming/         → Mark samples received
│   │   │   ├── processing/       → Track in-progress
│   │   │   └── upload/           → Upload results + flag abnormals
│   │   ├── public/manifest.json
│   │   └── package.json
│   │
│   ├── pharmacy-portal/          → pharmacy.onlyou.life (PWA)
│   │   ├── src/app/
│   │   │   ├── layout.tsx
│   │   │   ├── new/              → Incoming prescriptions
│   │   │   ├── preparing/        → Orders being packed
│   │   │   └── ready/            → Ready for pickup
│   │   ├── public/manifest.json
│   │   └── package.json
│   │
│   └── landing/                  → onlyou.life (SSG)
│       ├── src/app/
│       │   ├── page.tsx          → Homepage
│       │   ├── hair-loss/
│       │   ├── erectile-dysfunction/
│       │   ├── premature-ejaculation/
│       │   ├── weight-management/
│       │   ├── pcos/
│       │   ├── terms/
│       │   ├── privacy/
│       │   ├── refund/
│       │   ├── about/
│       │   └── blog/
│       └── package.json
│
├── packages/
│   ├── ui/                       → Shared Tailwind + shadcn/ui components
│   │   ├── src/
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── status-badge.tsx
│   │   │   ├── stepper.tsx       → Vertical status stepper (lab/delivery)
│   │   │   ├── form-fields/      → Input, select, multi-select, scale
│   │   │   └── index.ts
│   │   ├── tailwind.config.ts    → Shared Tailwind config + Onlyou theme
│   │   └── package.json
│   │
│   ├── api-client/               → tRPC client + shared hooks
│   │   ├── src/
│   │   │   ├── client.ts         → tRPC client factory
│   │   │   ├── hooks/            → Shared query hooks (useCase, useLabOrder, etc.)
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── types/                    → Zod schemas + TypeScript types
│   │   ├── src/
│   │   │   ├── enums.ts          → All enums (statuses, roles, conditions)
│   │   │   ├── user.ts
│   │   │   ├── consultation.ts
│   │   │   ├── prescription.ts
│   │   │   ├── lab-order.ts
│   │   │   ├── order.ts
│   │   │   ├── nurse-visit.ts
│   │   │   ├── ai-assessment.ts
│   │   │   ├── questionnaire.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── config/                   → ESLint, TypeScript, Prettier configs
│       ├── eslint-config.js
│       ├── tsconfig.json
│       └── prettier.config.js
│
├── CLAUDE.md                     → AI coding assistant instructions
├── checkpoint.md                 → Current build progress tracker
└── docs/                         → All documentation (this folder)
```

---

## 5. DATABASE DESIGN

### PostgreSQL 16 on RDS Mumbai

**Key features used:**
- **JSONB columns** — questionnaire responses (varying per vertical), AI assessment outputs, vitals records, notification preferences
- **Row-Level Security (RLS)** — database-layer access control (doctor can only query own patients even if app code has bug)
- **pgAudit** — structured audit logging for DPDPA compliance
- **pgcrypto** — column-level encryption for Aadhaar, phone numbers, PII
- **pg_cron** — data retention cleanup only (purely DB-level operation). SLA checks handled by BullMQ (see §8)

### Core Entities (Simplified ERD)

```
User (id, role, name, email, phone, passwordHash?, googleId?, appleId?)
  │
  ├── Patient extends User
  │     ├── Profile (DOB, gender, city, address, govIdType, govIdUrl)
  │     ├── Subscription[] (verticalId, planType, status, razorpaySubId, startDate, endDate)
  │     ├── Consultation[] ──→ one per vertical per assessment
  │     ├── Prescription[]
  │     ├── Order[] (medication deliveries)
  │     ├── LabOrder[]
  │     ├── Message[]
  │     ├── Wallet
  │     └── ConsentRecord[] (DPDPA: purpose, timestamp, version, withdrawn?)
  │
  ├── Doctor extends User
  │     ├── DoctorProfile (nmcNumber, specializations[], availableSchedule)
  │     ├── Consultation[] (assigned cases)
  │     └── Prescription[] (created)
  │
  ├── Nurse extends User
  │     ├── NurseProfile (gender, qualification: GNM|BSC_NURSING|ANM|OTHER, certificationNumber, certificationDocUrl, availableDays[], availableTimeStart, availableTimeEnd, maxDailyVisits, currentCity, serviceableAreas[], canAdministerInjections: boolean, completedVisits, failedVisits, rating, isActive)
  │     └── NurseVisit[]
  │
  ├── LabStaff extends User
  │     └── DiagnosticCentre (FK)
  │
  └── PharmacyStaff extends User
        └── Pharmacy (FK)

Consultation
  ├── patientId, doctorId, condition (enum)
  ├── questionnaireResponseId (→ JSONB)
  ├── photoUpload[] (S3 URLs)
  ├── aiAssessmentId (→ JSONB)
  ├── status (enum: SUBMITTED → AI_PROCESSING → AI_COMPLETE → ASSIGNED → REVIEWING → ... → COMPLETED)
  ├── videoStatus (enum: NOT_REQUIRED | PENDING | SCHEDULED | IN_PROGRESS | COMPLETED | SKIPPED_TESTING)
  └── prescriptionId?

Prescription
  ├── consultationId, doctorId, patientId
  ├── medications[] (JSONB: drug, dosage, frequency, duration, instructions)
  ├── counselingNotes, templateUsed
  ├── pdfUrl (S3), digitalSignatureUrl
  └── status (enum: DRAFT → SIGNED → SENT_TO_PHARMACY → DISPENSED)

LabOrder
  ├── consultationId, patientId, doctorId
  ├── tests[] (panel name, individual tests)
  ├── nurseVisitId?, diagnosticCentreId?
  ├── status (enum: ORDERED → SLOT_BOOKED → NURSE_ASSIGNED → ... → COMPLETED)
  ├── resultPdfUrl?, resultFlags[] (JSONB: test, value, status: normal/abnormal/critical)
  └── selfUploaded: boolean

NurseVisit
  ├── nurseId, patientId, labOrderId?
  ├── visitType (enum: BLOOD_COLLECTION | INJECTION_ADMIN | VITALS_ONLY | FOLLOW_UP)
  ├── status (enum: SCHEDULED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED | FAILED | CANCELLED)
  ├── scheduledTimeSlot, visitAddress, visitCity, visitPincode
  ├── vitals (JSONB: bp, pulse, spo2, weight, temp, notes)
  ├── tubeCount?, collectionNotes?
  ├── injectionFields (Phase 2 — muted)
  ├── timestamps (scheduledAt, enRouteAt?, arrivedAt?, inProgressAt?, completedAt?, failedAt?, failedReason?, cancelledAt?, cancelledReason?)

Order (Medication Delivery)
  ├── prescriptionId, patientId, pharmacyId?
  ├── medications[] (JSONB)
  ├── status (enum: CREATED → SENT_TO_PHARMACY → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED | PHARMACY_ISSUE | DELIVERY_FAILED | CANCELLED | REASSIGNED)
  ├── deliveryPersonName?, deliveryPersonPhone?
  ├── deliveryOtp (hashed), deliveryOtpExpiresAt
  ├── deliveryMethod (enum: RAPIDO | DUNZO | OWN | OTHER)
  ├── issueType?, issueMedications[]?, issueNotes?, issueReportedAt?, issueReportedFromStatus?
  ├── manualOverride (bool), overrideReason?
  └── timestamps (sentToPharmacyAt, preparingAt, readyAt, pickedUpAt, deliveredAt, cancelledAt)

Partner Entities:
  DiagnosticCentre (id, name, city, address, phone, testsOffered[], avgTurnaround, isActive)
  Pharmacy (id, name, city, address, phone, medicationsStocked[], operatingHours, isActive)
  ReferralClinic (id, name, city, specializations[], negotiatedRate, isActive)

Wallet
  ├── patientId, balance
  └── WalletTransaction[] (type: CREDIT/DEBIT, amount, reason, referenceId)

AuditLog (APPEND-ONLY — no UPDATE or DELETE permissions)
  ├── timestamp, userId, role, action, resourceType, resourceId
  ├── ipAddress, userAgent
  └── changesJson (before/after values)

ConsentRecord (IMMUTABLE)
  ├── patientId, purpose (enum: TELECONSULTATION | PHARMACY_SHARING | LAB_PROCESSING | ANALYTICS)
  ├── consentedAt, privacyNoticeVersion
  └── withdrawnAt?

Message
  ├── conversationId, senderId, recipientId
  ├── senderRole (enum: patient | doctor)
  ├── content (text), attachmentUrl? (S3)
  ├── readAt?, deliveredAt?
  └── createdAt

NotificationPreference
  ├── patientId
  ├── pushEnabled, whatsappEnabled, smsEnabled, emailEnabled
  ├── discreetMode: boolean (neutral notification content, no condition names)
  └── quietHoursStart?, quietHoursEnd?

AddressBook
  ├── patientId, label (e.g., "Home", "Office")
  ├── addressLine1, addressLine2?, city, state, pincode
  ├── isDefault: boolean
  └── type (enum: DELIVERY | COLLECTION | BOTH)

PromoCode
  ├── code (unique), description
  ├── discountType (enum: PERCENTAGE | FLAT), discountValue
  ├── maxUses, currentUses, maxUsesPerUser
  ├── validFrom, validUntil, isActive
  └── applicableVerticals[] (null = all)

DeliveryLink
  ├── orderId, token (unique, hashed)
  ├── deliveryPersonName, deliveryPersonPhone
  ├── pickupAddress, dropAddress
  ├── status (enum: ACTIVE | USED | EXPIRED)
  └── createdAt, expiresAt, usedAt?
```

### Prisma Configuration

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["queryCompiler", "driverAdapters", "relationLoadStrategy"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Critical Prisma settings:**
- Enable `relationLoadStrategy: "join"` on all relation queries (avoids N+1 — Prisma default generates separate SQL per relation)
- Use `$queryRaw` with TypedSQL for: doctor case queue search, analytics aggregations, audit log queries
- PgBouncer sidecar from Stage 2 (100+ patients) — Fargate tasks create frequent connections that exhaust `max_connections`
- **Note:** `queryCompiler` and `relationLoadStrategy` may have graduated from `previewFeatures` to GA by build time. Check Prisma release notes and remove from `previewFeatures` if so to avoid deprecation warnings.

---

## 6. AUTHENTICATION SYSTEM

### Patient Auth Flow

```
┌──────────────┐
│  App Launch   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│  Sign Up / Sign In Options   │
│                              │
│  [Continue with Google]      │
│  [Continue with Apple]       │
│  [Continue with Email]       │
│                              │
│  Already have account?       │
│  [Sign In]                   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  Account Created / Logged In │
│                              │
│  Now verify your phone:      │
│                              │
│  "We need your phone number  │
│   to send prescriptions,     │
│   delivery updates, and      │
│   keep your care team        │
│   connected with you."       │
│                              │
│  [Enter Phone Number]        │
│  [Send OTP via WhatsApp]     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  Enter 6-digit OTP           │
│  (sent via WhatsApp primary, │
│   SMS fallback)              │
│                              │
│  OTP stored hashed in Redis  │
│  (5-minute TTL)              │
└──────────────┬───────────────┘
               │  ✅ Verified
               ▼
┌──────────────────────────────┐
│  JWT Access Token (15 min)   │
│  + Refresh Token (7-30 days) │
│                              │
│  Refresh token stored hashed │
│  in PostgreSQL               │
│                              │
│  Refresh token rotation:     │
│  every refresh = new pair    │
└──────────────────────────────┘
```

### Portal Auth Flow (Doctor, Admin, Nurse, Lab, Pharmacy)

```
Phone Number → WhatsApp OTP (SMS fallback) → Verify → JWT
```

No social login for portal users — these are professional accounts provisioned by the coordinator.

### Token Strategy

| Token | Storage | Expiry | Purpose |
|---|---|---|---|
| Access Token (JWT) | Mobile: Bearer header; Web: HttpOnly cookie | 15 minutes | API authorization |
| Refresh Token | Mobile: Secure storage; Web: HttpOnly cookie | 7 days (patient), 30 days (doctor/admin) | Silent token refresh |
| OTP | Redis (hashed, SHA-256) | 5 minutes | Phone verification |

**Refresh token rotation:** Every refresh request issues a new access + refresh token pair and invalidates the old refresh token. If an old refresh token is reused (theft detection), all tokens for that user are invalidated immediately.

**JWT blacklisting:** On logout or token revocation, store token JTI in Redis SET with TTL matching remaining access token lifetime (max 15 minutes of storage).

### RBAC — 6 Roles

| Role | Access Scope |
|---|---|
| `patient` | Own data only (consultations, prescriptions, orders, messages, wallet) |
| `doctor` | Assigned patients only, own stats, prescription creation |
| `admin` | Everything — all patients, all orders, all partners, system config |
| `nurse` | Assigned visits only, patient address + tests (no diagnosis) |
| `lab` | Assigned samples only, anonymous patient ID (no name/phone/address) |
| `pharmacy` | Assigned orders only, anonymous patient ID, prescription (no diagnosis) |

**CASL.js rules example:**

```typescript
// Doctor can only read consultations assigned to them
can('read', 'Consultation', { doctorId: user.id });

// Doctor can create prescriptions for their consultations
can('create', 'Prescription', { doctorId: user.id });

// Lab staff can only see orders for their diagnostic centre
can('read', 'LabOrder', { diagnosticCentreId: user.diagnosticCentreId });

// Pharmacy staff sees no diagnosis field
cannot('read', 'Consultation', ['questionnaireResponse', 'aiAssessment', 'condition']);
```

---

## 7. REAL-TIME SYSTEM

### Architecture: SSE + Redis Pub/Sub

**Why SSE over WebSockets:**
- 95% of real-time needs are server → client (unidirectional)
- No sticky sessions required on ECS Fargate (standard HTTP)
- Socket.io has documented issues with ALB on Android
- Simpler infrastructure, same latency for this use case

### Real-Time Events

| Event | Source | Consumers | Method |
|---|---|---|---|
| New consultation submitted | Patient app | Doctor dashboard, admin dashboard | SSE |
| Case status update | Doctor dashboard | Patient app, admin dashboard | SSE |
| New message | Doctor or patient | Other party | SSE |
| Lab order status change | Nurse/lab portal | Patient app, doctor dashboard, admin | SSE |
| Delivery status change | Delivery person / admin | Patient app, admin | SSE |
| SLA breach | BullMQ job | Admin dashboard | SSE |
| Prescription ready | Doctor | Pharmacy portal (via admin), patient | SSE |

### Implementation Pattern

```
Client sends message → HTTP POST → API → save to DB → publish to Redis Pub/Sub
                                                              │
Redis Pub/Sub → All connected SSE clients subscribed to that channel receive event
```

**Offline delivery:** If client is not connected via SSE (app in background, phone off), the notification system (BullMQ queue) sends FCM push + WhatsApp + SMS as appropriate.

**Fallback:** 30-second polling for non-critical updates (delivery tracking can start with polling, upgrade to SSE).

---

## 8. BACKGROUND JOBS (BullMQ)

| Queue | Type | Priority | Config |
|---|---|---|---|
| `subscription-renewal` | Cron (daily at 2 AM IST) | Critical | Max 5 retries, idempotent |
| `sla-check` | Repeatable (every 15 min) | High | Checks all thresholds, triggers escalations |
| `notification-dispatch` | Event-triggered | Medium | Rate-limited per channel (WhatsApp API limits) |
| `ai-assessment` | Event-triggered, multi-step | Medium | Flow: questionnaire → Claude API → store → notify doctor |
| `pdf-generation` | Event-triggered | Low | Concurrency: 2 (CPU-intensive) |
| `scheduled-reminder` | Delayed | Medium | Check-in reminders, medication reminders |
| `auto-reorder` | Cron (daily) | Medium | Create new orders for active subscriptions |

**Monitoring:** Bull Board at `/admin/queues` (admin-only, behind auth middleware).

**Redis config:** `maxmemory-policy noeviction` + AOF persistence for job durability.

---

## 9. FILE STORAGE & DOCUMENT DELIVERY

### S3 Configuration

| Bucket | Contents | Encryption | Access |
|---|---|---|---|
| `onlyou-photos` | Patient photos (hair, weight) | SSE-KMS | Presigned PUT (upload), CloudFront signed URL (view) |
| `onlyou-prescriptions` | PDF prescriptions | SSE-KMS | CloudFront signed URL (doctor, patient, pharmacy) |
| `onlyou-lab-results` | Lab result PDFs | SSE-KMS | CloudFront signed URL (doctor, patient) |
| `onlyou-documents` | Gov IDs, nurse certifications | SSE-KMS | Presigned URL (upload), internal access only |

### Upload Flow
1. Client requests presigned PUT URL from API (15-minute expiry)
2. Client uploads directly to S3 (no data passes through API server)
3. Client confirms upload → API records S3 key in database

### Download Flow
1. Client requests file → API checks CASL permissions
2. API generates CloudFront signed URL (1-hour expiry)
3. Client fetches via CloudFront (cached at edge, 5-30ms latency in India)

### Photo Optimization (Stage 2+)
> **MVP:** Standard S3 + CloudFront delivery. Photos uploaded at reasonable quality (client-side compression via Expo ImageManipulator before upload).
> **Stage 2+:** Lambda@Edge with Sharp for on-the-fly resizing, WebP/AVIF format negotiation. Adds 30-50% bandwidth savings but adds infrastructure complexity.

### Retention Policy
- Standard storage: 1 year
- S3 Infrequent Access: 2 years
- S3 Glacier: 5+ years
- Aligned with Telemedicine Practice Guidelines 2020 (3-year minimum)

---

## 10. PAYMENT SYSTEM (RAZORPAY)

### Known UPI Limitations (Design Around These)

| Issue | Impact | Mitigation |
|---|---|---|
| UPI Autopay ₹15,000/transaction limit | All plans are under this — OK | Monitor if GLP-1 6-month (₹44,999) hits limit |
| UPI subscriptions CANNOT be updated | Upgrade/downgrade requires cancel + recreate | Build cancel-and-recreate flow, not update flow |
| Customer-paused UPI subs can't be programmatically resumed | Only customer can resume from UPI app | Notify patient via WhatsApp to resume, provide deep link |
| Webhook delays (up to 5 hours reported) | Payment state may be stale | Implement webhook + API polling dual-verification |
| Webhook endpoint disabled after 24hr continuous failures | Missed payment events | Health check on webhook endpoint, alert on failure |

### Payment Retry Logic
- T+0 through T+3: one attempt per day (Razorpay automatic)
- After T+3: subscription moves to "halted" state
- System sends WhatsApp reminder at T+1, T+2, T+3
- At "halted": pause treatment, notify patient, offer manual payment link

### Subscription Flow
```
Patient selects plan → Razorpay Checkout (UPI/card/netbanking) → webhook: payment.authorized →
verify via API → activate subscription → create first order → begin treatment
```

### Idempotent Webhook Processing
- Store Razorpay event ID → check before processing → skip duplicates
- Store local subscription state → reconcile with Razorpay API periodically (daily cron)

---

## 11. INFRASTRUCTURE SCALING TRAJECTORY

### Stage 1: MVP Launch (10-50 patients, months 1-6)

| Service | Spec | Cost/Month |
|---|---|---|
| ECS Fargate | 1 task (0.5 vCPU, 1GB) | ~$18 |
| RDS PostgreSQL | db.t3.micro | ~$15 |
| ElastiCache Redis | t3.micro | ~$13 |
| S3 + CloudFront | Minimal usage | ~$5 |
| **Total** | | **~$50-80** |

### Stage 2: Traction (100-500 patients, months 6-12)

| Service | Spec | Cost/Month |
|---|---|---|
| ECS Fargate | 2 tasks with ALB | ~$45 |
| RDS PostgreSQL | db.t3.small | ~$25 |
| ElastiCache Redis | t3.small | ~$25 |
| S3 + CloudFront | Growing | ~$15 |
| PgBouncer | Sidecar container | Included in Fargate |
| **Total** | | **~$120-180** |

**First extraction:** Notification sending → separate Fargate task (same codebase, separate process consuming BullMQ queues).

### Stage 3: Growth (5,000+ patients, months 12-18)

| Service | Spec | Cost/Month |
|---|---|---|
| ECS Fargate | Auto-scaling 2-6 tasks (1 vCPU, 2GB) | ~$200 |
| RDS PostgreSQL | db.t3.medium + read replica | ~$100 |
| ElastiCache Redis | t3.medium | ~$50 |
| S3 + CloudFront | Significant | ~$50 |
| Lambda (PDF gen) | Bursty, stateless | ~$20 |
| **Total** | | **~$400-700** |

**Extractions:** Notification service → separate ECS + SQS. PDF generation → Lambda. Consider separating doctor-facing and patient-facing API routes at gateway level.

---

## 12. DPDPA COMPLIANCE (FROM DAY ONE)

### Three Pillars

**1. Encryption at Three Layers**
- **At rest:** RDS encryption (AES-256, automatic for backups), SSE-KMS for S3
- **In transit:** TLS 1.2+ on all connections (ALB → Fargate, client → CloudFront)
- **Field-level:** Application-level AES-256-GCM (Node.js `crypto` module) for Aadhaar numbers, phone numbers, email addresses, diagnosis codes. Keys via AWS KMS, rotated quarterly.

**2. Consent Management**
- Separate consents for: teleconsultation, pharmacy sharing, lab processing, analytics
- Immutable `consent_records` table: purpose, timestamp, privacy notice version, withdrawal timestamp
- No pre-ticked boxes or bundled consent
- Withdrawal with clear consequences stated upfront

**3. Audit Logging**
- Append-only `audit_log` table (INSERT only — no UPDATE or DELETE permissions)
- Logs: all data access, modifications (before/after), auth events, consent changes, prescription generation/dispensing
- Structure: `{ timestamp, user_id, role, action, resource_type, resource_id, ip_address, changes_json }`
- Retention: minimum 1 year (DPDP Rules), recommend 3 years

### Partner Anonymization
- Lab partners see: order ID, test type, sample details only
- Pharmacy partners see: prescription ID, medications, dosage, doctor ID only
- Patient identity mapped via pseudonymized references only the core platform can resolve

---

## 13. NETWORK OPTIMIZATION FOR INDIA

### Tier-2/3 Connectivity Mitigations
- Compress API responses with Brotli/gzip
- Progressive loading patterns (skeleton screens, paginate with small page sizes)
- WebP images via CloudFront (30-50% smaller than JPEG)
- Offline-first where possible: cache last consultation, medication schedule, appointment details
- SMS/WhatsApp fallbacks for users on 2G/3G

### Android Push Notification Workarounds
- FCM high-priority messages for all medical notifications
- In-app onboarding: guide users to disable battery optimization + enable Autostart (Xiaomi, Samsung, Oppo, Vivo, OnePlus)
- WhatsApp as primary notification channel (superior delivery on Chinese OEM phones)
- SMS fallback for critical notifications (OTP, appointment in 15 min)
- Test on actual target devices: Samsung M13, Redmi Note 11/12, Realme C-series

### Target App Size
- 15-25MB AAB download (under 30MB ideal for tier-2/3 users on 32-64GB devices)
- Achievable with Hermes bytecode + ProGuard/R8

---

## 14. FEATURE FLAGS

| Flag | Default (MVP) | Purpose |
|---|---|---|
| `VIDEO_CONSULTATION_ENABLED` | `false` | Enables real video consultation flow |
| `GLP1_COLD_CHAIN_TRACKING` | `false` | Enables cold chain tracking system |
| `FACE_MATCH_VERIFICATION` | `false` | Enables selfie + face match identity check |
| `ABHA_INTEGRATION` | `false` | Enables ABHA ID integration |
| `GPS_NURSE_CHECKIN` | `false` | Enables GPS verification on nurse arrival |
| `INJECTION_ADMINISTRATION` | `false` | Enables nurse injection workflow |
| `THREE_WAY_VIDEO_BRIDGE` | `false` | Enables patient + nurse + doctor video |
| `SHIPROCKET_INTEGRATION` | `false` | Enables Shiprocket/Delhivery for delivery |
| `LAB_API_INTEGRATION` | `false` | Enables Thyrocare/SRL API |

Feature flags stored in environment variables (MVP) → migrate to database-backed flags at scale.

---

## 15. DEVELOPMENT ENVIRONMENT

### Developer Setup

> **Important:** The founder has no coding experience. All code is written by Claude AI via Cursor IDE or Antigravity IDE. The founder's job is to: (1) describe what to build, (2) test by using the app visually, (3) report what's wrong or missing. Claude handles all code, debugging, and technical decisions.

| Aspect | Setup |
|---|---|
| **Machine** | Windows laptop |
| **IDE** | Cursor IDE or Antigravity IDE (Claude writes all code) |
| **Founder's role** | Describe features → test visually → report issues |
| **iOS builds** | EAS Build (cloud) → TestFlight (Apple Developer Account) |
| **Android builds** | Local Expo dev client + Android emulator (Android Studio) or physical device |
| **Web portals** | `localhost` + browser DevTools |
| **Backend** | Local via `pnpm dev` in `apps/api` |
| **Testing** | 100% manual — click through flows, check screens, report bugs to Claude |

### iOS Development on Windows

You **cannot** build iOS locally on Windows. The workflow is:

1. **Android**: Instant iteration — Expo dev client on emulator or physical device via USB/WiFi. Hot reload works.
2. **iOS**: Use **EAS Build** (cloud) to generate development builds. Install via TestFlight. ~30 free builds/month on Expo's plan, each build takes 10-15 minutes. Test critical flows on iOS after stabilizing on Android.
3. **Web portals**: No platform issue — test on `localhost` with Chrome DevTools.

### Local Infrastructure

```bash
# Option A: Docker Compose (recommended — full local stack)
# Requires Docker Desktop on Windows (or WSL2)
docker compose up -d  # PostgreSQL 16 + Redis 7

# Option B: Cloud dev database (simpler, no Docker)
# Use Railway, Neon, or Supabase for PostgreSQL
# Use Upstash for Redis
# Free tiers sufficient for development
```

### Local Port Assignments

| Service | Port | Command |
|---|---|---|
| API (NestJS) | `3000` | `pnpm --filter api dev` |
| Doctor Portal | `3001` | `pnpm --filter doctor-portal dev` |
| Admin Portal | `3002` | `pnpm --filter admin-portal dev` |
| Nurse Portal | `3003` | `pnpm --filter nurse-portal dev` |
| Lab Portal | `3004` | `pnpm --filter lab-portal dev` |
| Pharmacy Portal | `3005` | `pnpm --filter pharmacy-portal dev` |
| Landing Page | `3006` | `pnpm --filter landing dev` |
| PostgreSQL | `5432` | Docker Compose |
| Redis | `6379` | Docker Compose |
| Bull Board | `3000/admin/queues` | Part of API |

### Mobile ↔ Local API Connection

- **Android emulator**: API at `http://10.0.2.2:3000` (special Android emulator alias for host machine)
- **Physical device (same WiFi)**: API at `http://<your-local-ip>:3000`
- **Expo tunnel** (fallback): `npx expo start --tunnel` — proxies through Expo's servers (slower, but works through firewalls)

### Docker Compose (Recommended)

```yaml
# docker-compose.yml (at monorepo root)
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: onlyou
      POSTGRES_PASSWORD: onlyou_dev
      POSTGRES_DB: onlyou_dev
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --appendonly yes

volumes:
  pgdata:
```

### Seed Data

Pre-populated test accounts for manual testing (created by `prisma/seed.ts`):

| Role | Email | Phone | Notes |
|---|---|---|---|
| Patient (test) | `patient@test.onlyou.life` | `+919999900001` | Has sample consultation + prescription |
| Doctor | `doctor@test.onlyou.life` | `+919999900002` | Dermatologist, has assigned cases |
| Admin | `admin@test.onlyou.life` | `+919999900003` | Full access |
| Nurse | `nurse@test.onlyou.life` | `+919999900004` | Has assigned visits |
| Lab Staff | `lab@test.onlyou.life` | `+919999900005` | Linked to test diagnostic centre |
| Pharmacy Staff | `pharmacy@test.onlyou.life` | `+919999900006` | Linked to test pharmacy |

Seed script also creates: 1 test diagnostic centre, 1 test pharmacy, 1 test referral clinic, sample Hair Loss consultation with AI assessment, sample prescription, sample lab order at various statuses.

---

## 16. EMAIL PROVIDER

| Aspect | Decision |
|---|---|
| **MVP** | **Resend** — 5-line setup, 100 emails/day free tier, excellent DX, React Email templates |
| **Scale (1,000+ emails/day)** | Migrate to **AWS SES** — requires domain verification, bounce/complaint handling, production access request |
| **Templates** | React Email (works with both Resend and SES) |

Transactional emails sent: OTP verification, prescription ready, delivery confirmation, payment receipts, subscription reminders.

---

*This is the complete architecture document. For portal-specific details, see individual portal documents. For vertical-specific details, see vertical documents.*
