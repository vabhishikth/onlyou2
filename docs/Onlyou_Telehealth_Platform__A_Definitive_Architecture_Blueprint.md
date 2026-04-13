# Onlyou telehealth platform: a definitive architecture blueprint

**The proposed NestJS + GraphQL + Prisma stack is 80% right but needs three critical changes: replace GraphQL with tRPC, split the single Next.js deployment into separate portal apps, and use SSE instead of WebSockets.** These changes will save the 2-person team an estimated 6–8 weeks of development time while producing a more maintainable, performant, and compliant system. The core infrastructure choices — PostgreSQL, Redis, AWS Mumbai, Expo for mobile — are sound and should be kept. What follows is a decision-by-decision analysis across all 15 architectural concerns, with specific recommendations calibrated for a 2-person team shipping across 29 weeks in the Indian healthcare market.

---

## 1. NestJS earns its place, but swap the HTTP engine

NestJS remains the right backend framework despite its decorator overhead. **Roche and multiple HIPAA-compliant healthcare platforms run NestJS in production**, and TechMagic (a 200+ person firm) specializes in HIPAA-compliant NestJS implementations. The framework's module system, Guards, Interceptors, and built-in dependency injection provide exactly the structure a healthcare platform needs for audit logging, role-based access, and compliance enforcement. The Indian developer hiring pool for NestJS is the largest of any enterprise Node.js framework, which matters when the team grows past two.

The legitimate concerns — **197ms startup time (26x slower than Express)**, verbose decorator patterns, and DI circular dependency pain — are real but manageable. The startup penalty only matters for serverless (irrelevant on ECS Fargate). The verbosity is the price of structure that healthcare compliance demands.

**The critical optimization: switch to Fastify as the HTTP adapter.** NestJS natively supports `@nestjs/platform-fastify` with zero code changes to controllers or services. Fastify delivers **2x faster JSON serialization** than Express and higher throughput at every concurrency level. This is a free performance win.

The alternatives were seriously considered. **Fastify + tRPC standalone** would ship faster but lacks NestJS's pre-built ecosystem for auth, file uploads, and mailing — saving approximately one month of boilerplate work. **Django + DRF** has a strong Indian hiring pool and mature audit packages (plus a free admin panel), but forces a Python/TypeScript split that doubles the cognitive load for two developers sharing a TypeScript monorepo. **Go/Gin** and **Elixir/Phoenix** offer superior performance and concurrency but require a language switch that would consume 4–6 weeks of the 29-week timeline. For a team that knows TypeScript, NestJS with Fastify is the highest-velocity path to a compliant healthcare backend.

---

## 2. tRPC should replace GraphQL across all seven interfaces

This is the single highest-impact change to the proposed stack. **All seven client interfaces are TypeScript** (React Native Expo + six Next.js web portals), which eliminates GraphQL's primary advantage — language-agnostic schema contracts — while retaining all its costs.

GraphQL's costs for a 2-person team are substantial. Apollo Client's normalized cache is notoriously difficult; a well-documented migration by Echobind found that switching from GraphQL to tRPC **removed 3,373 lines of code while adding only 1,765** — a net reduction of 1,608 lines. Their GraphQL codegen produced an **8,200-line type file** that visibly slowed VS Code, compared to tRPC's zero-generation approach where types are inferred at compile time. Benchmark data shows GraphQL averaging **1,864ms versus REST's 922ms** for equivalent queries, with the N+1 resolver problem requiring careful DataLoader implementation that adds yet more boilerplate.

tRPC eliminates all of this. Types flow from server to client automatically. Caching uses TanStack Query (dramatically simpler than Apollo's normalized cache). **tRPC works with React Native Expo** — confirmed by the official `trpc/zart` monorepo example, the `create-t3-turbo` template, and multiple production deployments. The bundle size is roughly **3.5x smaller** than Apollo Client.

For the rare cases where external integrations need a standard API (pharmacy systems, lab partners, future ABDM integration), expose REST endpoints alongside tRPC using NestJS controllers. tRPC handles the seven internal TypeScript clients; REST handles the external world. This hybrid gives **full type safety internally with standard interoperability externally**.

tRPC also supports real-time subscriptions via WebSockets or SSE, covering the doctor-patient chat use case without requiring a separate real-time stack.

---

## 3. Prisma stays, but enable the Query Compiler and plan escape hatches

Prisma's developer experience remains unmatched for a 2-person team. Auto-generated types, Prisma Studio for visual data inspection, and declarative migrations eliminate hours of boilerplate that Drizzle ORM requires. For healthcare data with complex relationship chains — Patient → Consultation → Prescription → Lab Order → Result → Delivery — Prisma's relation API is more ergonomic than writing manual JOINs.

**The historical performance concerns are addressed by Prisma's new Query Compiler** (available in v6.16+ as a preview, shipping as default in v7). This eliminates the Rust binary engine entirely, switching to a TypeScript/WASM implementation that delivers **up to 3.4x faster queries** and reduces the package from ~14MB to ~1.6MB. Enable it today with the `queryCompiler` and `driverAdapters` preview features.

Three specific mitigations are essential:

- **Enable `relationLoadStrategy: "join"`** on all relation queries to avoid the N+1 problem where Prisma generates separate SQL per relation (the default behavior that produced "47 separate SQL statements" in one production horror story)
- **Use `$queryRaw` with TypedSQL** for complex queries that Prisma handles poorly — doctor case queue full-text search, analytics aggregations, and audit log queries
- **Use PgBouncer** as a connection pooler from Stage 2 onward (100+ patients), deployed as a sidecar container in ECS, because Fargate tasks create frequent new connections that exhaust PostgreSQL's `max_connections`

Drizzle ORM is the fallback if Prisma's Query Compiler introduces performance regressions under production load. Drizzle generates **14x lower latency** on complex joins and has zero binary dependencies, but its ecosystem is younger and NestJS integration examples are fewer. Keep Drizzle as an evaluated option, not the default.

---

## 4. Expo is the right call, but push notifications are the #1 mobile risk

**Expo in managed workflow with development builds is the clear choice** for the patient mobile app. Hublo, a healthcare platform with 1M+ users, successfully rebuilt their app on Expo and reported months of saved development time. The New Architecture (Fabric, TurboModules, JSI) is mandatory as of React Native 0.82, and **83% of Expo SDK 54 projects on EAS Build already use it**. Hermes V1 delivers 2.5–9% faster time-to-interactive, particularly on low-end Android devices.

Every healthcare-specific feature works in managed Expo: `expo-camera` for medical photo capture, `expo-image-manipulator` for compression before upload (critical for Indian bandwidth), `expo-local-authentication` for biometric auth, and `expo-file-system` for caching downloaded prescription PDFs. The target app size of **15–25MB AAB download** (within the <30MB ideal for tier-2/3 Indian users on 32–64GB devices) is achievable with Hermes bytecode and ProGuard/R8.

**Push notification reliability on Indian Android devices is the platform's single greatest mobile risk.** Research shows **20–40% of push notification failures** on Android are caused by OEM battery optimization. Xiaomi MIUI aggressively kills background processes, canceling FCM messages. Samsung One UI suppresses notifications from infrequently opened apps. Realme UI and Oppo ColorOS restrict background data per app.

Five mandatory mitigations, all from day one:

- Use **FCM high-priority messages** for all medical notifications (appointment reminders, prescription ready, OTP delivery)
- Build an **in-app onboarding flow** that guides users through disabling battery optimization and enabling Autostart (use the `AutoStarter` library supporting Xiaomi, Samsung, Oppo, Vivo, OnePlus)
- Use **WhatsApp as the primary notification channel** for patients (500M+ WhatsApp users in India, superior delivery rates to FCM on Chinese OEM phones)
- Implement **SMS fallback** for critical notifications (OTP, appointment in 15 minutes)
- **Test on actual target devices** — Samsung M13, Redmi Note 11/12, Realme C-series — not Pixel emulators

Budget 2–3 weeks of the 29-week timeline specifically for push notification testing and optimization on these devices. Reference dontkillmyapp.com for manufacturer-specific workarounds.

---

## 5. Split the portals: one Next.js app per subdomain

Serving `doctor.onlyou.life`, `admin.onlyou.life`, `nurse.onlyou.life`, `lab.onlyou.life`, and `pharmacy.onlyou.life` from a single Next.js deployment with middleware routing is **architecturally wrong for this use case**. This pattern is designed for multi-tenant SaaS where every tenant gets identical functionality — not for six fundamentally different portals with distinct feature sets, security boundaries, and deployment cadences.

The problems are concrete. **Bundle size contamination**: despite page-level code splitting, shared layout components and barrel file imports cause cross-portal code leakage (tree-shaking breaks with barrel files per Next.js GitHub issue #12681). A nurse loading their portal could pull in pharmacy-specific charting libraries. **Deployment coupling**: a bug fix in the pharmacy portal triggers a rebuild of all six portals, and rolling back one means rolling back all. **Security risk**: all portals share the same Node.js process, meaning a vulnerability in one portal's PDF processing could expose another portal's data — for healthcare PHI, this is a compliance red flag.

The correct architecture is **separate Next.js apps in the Turborepo monorepo**, sharing components via internal packages:

```
apps/
  ├── landing/           # onlyou.life
  ├── doctor-portal/     # doctor.onlyou.life  
  ├── admin-portal/      # admin.onlyou.life
  ├── nurse-portal/      # nurse.onlyou.life (PWA)
  ├── lab-portal/        # lab.onlyou.life (PWA)
  ├── pharmacy-portal/   # pharmacy.onlyou.life (PWA)
  ├── mobile/            # Expo patient app
  └── api/               # NestJS backend
packages/
  ├── ui/                # Shared Tailwind + shadcn components
  ├── api-client/        # tRPC client + shared hooks
  ├── types/             # Zod schemas + TypeScript types
  └── config/            # ESLint, TS, Prettier configs
```

This yields **30–50% smaller per-portal bundles**, independent deployment per portal, infrastructure-level security isolation, and the ability for one developer to ship a pharmacy fix while the other works on the doctor portal without merge conflicts. Each portal gets its own service worker for PWA support (nurse, lab, and pharmacy portals need offline capabilities). Turborepo's dependency graph ensures a change to `packages/ui` only rebuilds the affected portals.

---

## 6. Turborepo + pnpm workspaces wins the monorepo decision

For a 2-person team managing NestJS + Expo + multiple Next.js apps + shared packages, **Turborepo with pnpm workspaces is the clear winner** over Nx and standalone pnpm. Setup takes 15 minutes versus Nx's 1–4 hours. Configuration is ~20 lines in `turbo.json` versus Nx's 200+ lines. Build caching (local + remote via Vercel, free for small teams) eliminates redundant builds.

The combination is proven for this exact stack. The `byCedric/expo-monorepo-example` (maintained by an Expo team member) demonstrates Turborepo + pnpm with Expo. The `create-t3-turbo` template adds tRPC. Multiple production monorepos run NestJS + Next.js + Expo in this configuration.

**One critical gotcha**: pnpm with React Native requires `node-linker=hoisted` in `.npmrc` because React Native's module resolution expects hoisted `node_modules`. EAS Build supports pnpm monorepos natively since Expo SDK 52, but verify workspace protocol resolution in CI.

---

## 7. PostgreSQL is the only database you need

PostgreSQL 16 on AWS RDS is the correct and sufficient choice. **JSONB eliminates any argument for MongoDB** — store structured data relationally (patients, consultations, prescriptions) and flexible data in JSONB columns (questionnaire responses across 5 verticals, AI assessment outputs, varying vitals). JSONB supports GIN indexing for fast queries inside JSON documents.

PostgreSQL's healthcare-specific capabilities are comprehensive. **Row-Level Security (RLS)** enforces data access at the database layer — even if application code has a bug, unauthorized access is blocked. **pgAudit** provides structured audit logging for DPDPA compliance (who accessed what, when, with the exact SQL statement). **pgcrypto** enables column-level encryption for Aadhaar numbers and other PII. **pg_cron** handles scheduled tasks like data retention cleanup without external job schedulers.

CockroachDB is unnecessary for single-region operation. MongoDB adds operational complexity with no benefits over JSONB. **Supabase is worth noting** — it now supports AWS ap-south-1 (Mumbai), is SOC 2 Type 2 compliant, and offers HIPAA compliance on the Team plan ($599/month). However, its Edge Functions **cannot process protected health information** per its own HIPAA guidance, and they run on Deno (not Node.js), making most NestJS healthcare libraries incompatible. Use Supabase only if you need to accelerate auth or real-time features, not as a backend replacement.

---

## 8. SSE beats WebSockets for async healthcare communication

The platform's real-time needs — doctor-patient async chat, delivery tracking, lab status updates, SLA breach alerts, case queue updates — are **95% unidirectional (server → client)**. Server-Sent Events handle this pattern perfectly without the infrastructure complexity of WebSockets.

For async chat specifically, the pattern is: **SSE downstream (server pushes new messages to connected clients) + HTTP POST upstream (client sends messages via regular API calls)**. This is not a compromise — it's how many production chat systems work. The 3ms latency advantage of WebSockets is irrelevant when end-to-end latency budgets are 100ms+.

SSE's operational advantages on ECS Fargate are decisive. **No sticky sessions required** — SSE connections are standard HTTP, handled by ALB without cookie-based stickiness. Socket.io requires sticky sessions because its handshake process (polling → WebSocket upgrade) needs two requests to hit the same backend. Socket.io's React Native client also has documented issues with ALB sticky sessions on Android (GitHub issues #574, #468). Redis Pub/Sub distributes SSE events across multiple Fargate tasks trivially.

**The real-time architecture should be:**
- SSE for all in-app live updates (dashboards, chat, status tracking)
- HTTP POST for all client-to-server messages
- Redis Pub/Sub for multi-instance event fan-out
- FCM + WhatsApp for offline/background delivery (the primary notification channel for patients)
- 30-second polling as fallback for non-critical updates (delivery tracking can start here)

Managed services like Ably ($49.99+/month) or Pusher ($49+/month) are unnecessary at this scale and add vendor dependency. Revisit only if scaling globally requires multi-region real-time infrastructure.

---

## 9. BullMQ handles every background job requirement

With Redis already in the stack (ElastiCache), **BullMQ is the natural and optimal choice** for all background job processing. It integrates natively with NestJS via `@nestjs/bullmq` and covers every job type Onlyou needs.

| Queue | Type | Priority | Configuration |
|---|---|---|---|
| Subscription renewals | Cron (daily) | Critical | Max 5 retries, idempotent processing |
| SLA escalation checks | Repeatable (every 15 min) | High | `repeat: { every: 900000 }` |
| Notification dispatch | Event-triggered | Medium | Rate-limited per channel (WhatsApp API limits) |
| AI pre-assessment | Event-triggered, multi-step | Medium | Flow producer (questionnaire → Claude API → report → notify) |
| PDF prescription generation | Event-triggered | Low | Concurrency: 2 (CPU-intensive) |
| Scheduled reminders | Delayed | Medium | `delay: ms-until-reminder-time` |

**Temporal is overkill.** It requires dedicated infrastructure (4–5 services, its own database), and ToolJet specifically migrated from Temporal to BullMQ for "simplified deployment while maintaining all existing functionality." **Inngest is interesting but risky** — its SaaS dependency for critical healthcare operations (subscription renewals, SLA checks) adds a failure point, and its HIPAA BAA is enterprise-only. pg-boss (PostgreSQL-based queues) works but can't match Redis throughput, and you already have Redis.

Install **Bull Board** (free, open-source) for job monitoring at `/admin/queues` — it provides visibility into job status, retries, and failures. Protect with admin-only middleware. Configure Redis with `maxmemory-policy noeviction` and AOF persistence for job data durability.

---

## 10. Build custom auth with WhatsApp OTP as the primary channel

Every managed auth service fails at least one critical requirement for an Indian healthcare platform. **Clerk** has no native OTP-via-SMS for Indian phone numbers, no WhatsApp OTP, and no data residency in India. **Auth0** is prohibitively expensive at scale ($0.07/MAU = **$6,300/month at 100K users**). **Supabase Auth** lacks a HIPAA BAA and has limited RBAC beyond PostgreSQL RLS. **Firebase Auth** isn't covered under Google's BAA for HIPAA.

**Custom NestJS JWT authentication with OTP** gives full control at dramatically lower cost. The auth flow: patient enters phone number → server generates 6-digit OTP stored hashed in Redis (5-minute TTL) → OTP sent via WhatsApp (primary, ~₹0.10–0.15/message) with SMS fallback (~₹0.15–0.50/message) → patient verifies → server issues JWT access token (15-minute expiry) + refresh token (stored hashed in PostgreSQL, 7–30 day expiry depending on role).

**Refresh token rotation** is essential: every refresh generates a new token pair and invalidates the old refresh token. Token blacklisting uses Redis SET with TTL matching the access token's remaining lifetime (maximum 15 minutes of storage). Use HttpOnly cookies for web portals (XSS-proof) and Bearer tokens for the mobile app.

For RBAC across 6 roles, **CASL.js integrated with NestJS Guards** is the strongest approach. CASL supports both role-based and attribute-based access control — critical for healthcare rules like "doctor can only read prescriptions for their own assigned patients." The `@casl/prisma` integration enables query-level enforcement, generating SQL WHERE clauses from permission rules.

Implementation estimate: **40–60 hours** for a complete auth system, comparable to the integration time for Auth0 plus the weeks of customization needed for OTP flows, WhatsApp delivery, and role mapping.

---

## 11. S3 with KMS encryption and CloudFront signed URLs for document delivery

**Use S3 presigned PUT URLs for uploads (short-lived, ~15-minute expiry) and CloudFront signed URLs with Origin Access Control for downloads.** OAC ensures S3 objects can only be served through CloudFront, preventing direct URL bypass. CloudFront's **17+ edge locations in India** (Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata) plus 1,140+ embedded POPs within ISP networks across 300+ cities deliver prescriptions and lab results with 5–30ms latency even in tier-2/3 cities.

**SSE-KMS encryption** (not SSE-S3) is required for healthcare compliance. At ~$5–15/month for MVP-scale operations (with S3 Bucket Keys reducing KMS API costs by up to 99%), it provides: CloudTrail logging of every encryption/decryption event, granular key policies per document type, automatic key rotation, and the ability to disable a key to instantly make all documents inaccessible (useful for right-to-erasure implementation under DPDPA).

For **prescription PDF generation**, use **@react-pdf/renderer** — it produces structured documents as React components, runs on Node.js, and is 10x lighter than Puppeteer (no headless Chrome, critical for Fargate cost optimization). For **patient photo optimization**, deploy Lambda@Edge with Sharp for on-the-fly resizing with WebP/AVIF format negotiation based on Accept headers, delivering 30–50% smaller files to bandwidth-constrained Indian users.

S3 lifecycle policies for medical record retention: Standard for 1 year → S3 Infrequent Access for 2 years → Glacier for 5+ years (aligned with the 3-year minimum under Telemedicine Practice Guidelines 2020, with extended retention for compliance safety).

---

## 12. Razorpay's UPI limitations demand defensive architecture

Three Razorpay subscription quirks will bite if not planned for. **UPI Autopay has a ₹15,000 per-transaction limit** — subscription plan pricing must stay below this. **UPI subscriptions cannot be updated** (upgrade/downgrade requires cancel + recreate, since Razorpay explicitly states updates only work for cards, not UPI or eMandate). **Customer-paused UPI subscriptions cannot be programmatically resumed** — only the customer can resume from their UPI app, giving Onlyou zero control.

The payment retry mechanism runs T+0 through T+3 (one attempt per day), then moves to "halted" state. **Always implement webhook + API polling dual-verification** — developer reports show delayed confirmations (up to 5 hours) and webhook delivery failures that disable the webhook endpoint after 24 hours of continuous failures. Store Razorpay subscription state locally and reconcile periodically. Process all payment webhooks idempotently.

For WhatsApp Business API, **Gupshup is recommended over MSG91** — it's the Meta-approved BSP dominant in India with enterprise-grade reliability, regional language localization, and chatbot capabilities for appointment booking automation. MSG91 is a viable cost-saving alternative for pure transactional messages. Template approval typically takes 24–48 hours.

**Network optimization for tier-2/3 India**: compress API responses with Brotli/gzip, implement progressive loading patterns, serve WebP images via CloudFront, paginate with small page sizes for list views, and design for offline-first where possible (cache last consultation, medication schedule, appointment details). SMS/WhatsApp fallbacks are essential for users on 2G/3G connections where push notifications and in-app updates are unreliable.

---

## 13. The modular monolith scales to 5,000+ patients before extraction is justified

**42% of organizations that adopted microservices are consolidating back** (CNCF 2025 survey). Amazon Prime Video achieved 90% infrastructure cost reduction moving from microservices to monolith. For a 2-person team, microservices reduce feature delivery by 20–40% because of distributed systems overhead.

The scaling trajectory with concrete costs:

**Stage 1 (10–50 patients, months 1–6):** Single ECS Fargate task (0.5 vCPU, 1GB), RDS db.t3.micro, ElastiCache t3.micro. **Total: ~$50–80/month.** No auto-scaling needed.

**Stage 2 (100–500 patients, months 6–12):** 2 Fargate tasks with ALB, RDS db.t3.small, add PgBouncer for connection pooling. **Total: ~$120–180/month.** First extraction candidate: move notification sending to a separate Fargate task (not a separate service — just a separate process consuming BullMQ queues).

**Stage 3 (5,000+ patients, months 12–18):** Auto-scaling 2–6 Fargate tasks (1 vCPU, 2GB), RDS db.t3.medium with read replica. **Total: ~$400–700/month.** Extraction candidates: notification service → separate ECS service with SQS, PDF generation → Lambda function (bursty, stateless, ideal for serverless), consider separating doctor-facing and patient-facing API routes at the gateway level.

Design NestJS modules for future extraction from day one: each module communicates via well-defined interfaces (not direct imports), uses NestJS EventEmitter for inter-module communication (trivially replaceable with SQS/SNS later), and owns its own database entities with no cross-module direct table queries.

---

## 14. Custom NestJS monolith beats every BaaS alternative for healthcare

**Supabase** comes closest to viability — it supports AWS Mumbai (ap-south-1) for data residency, offers SOC 2 Type 2 compliance, and has HIPAA compliance on the Team plan ($599/month). But its own documentation states **Edge Functions should not process PHI**, and they run on Deno (not Node.js), making NestJS healthcare libraries, audit logging packages, and PDF generation tools incompatible. It has no native background job support for SLA tracking, scheduled reminders, or batch processing.

**Firebase is disqualified.** Most Firebase services (Auth, Realtime Database) are not covered under Google's HIPAA BAA. Data residency guarantees for India are insufficient. NoSQL (Firestore) is suboptimal for relational healthcare data.

**The T3 stack (Next.js + tRPC + Prisma)** is excellent for the web portals but insufficient as the complete backend — Next.js API routes can't match NestJS's module system, Guards, Interceptors, and background job integration for complex healthcare workflows like prescription validation → pharmacy notification → dispensing confirmation → patient notification.

The most viable alternative is a **hybrid: Supabase Auth for authentication + custom NestJS for everything else.** This saves 2–3 weeks of auth development while keeping all PHI processing, healthcare workflows, and compliance logic in your own controlled infrastructure. Consider this if the timeline is tight, but recognize it adds a second system to manage.

---

## 15. DPDPA compliance requires encryption, consent tracking, and audit immutability from day one

The DPDP Rules 2025 were notified on November 14, 2025, with **full compliance required by May 2027**. Onlyou must implement three pillars before launch.

**Encryption at three layers.** At rest: RDS encryption enabled (AES-256, automatic for backups), SSE-KMS for S3. In transit: TLS 1.2+ on all connections. **Field-level encryption for high-sensitivity PII**: Aadhaar numbers, phone numbers, email addresses, diagnosis codes, and treatment plans. Use application-level AES-256-GCM encryption (Node.js `crypto` module) before database insertion for highest-sensitivity fields, with keys managed via AWS KMS and rotated quarterly.

**Consent management as a first-class module.** DPDPA requires granular, purpose-specific consent — separate consents for teleconsultation, prescription sharing with pharmacy, lab order processing, and health data analytics. Create an immutable `consent_records` table tracking: purpose, timestamp, privacy notice version, withdrawal timestamp. No pre-ticked boxes or bundled consent terms. Implement consent withdrawal with clear consequences stated upfront (Section 5(f)).

**Audit logging in an append-only table.** Log all data access events, modifications (with before/after values), authentication events, consent changes, and prescription generation/dispensing. Structure: `{ timestamp, user_id, role, action, resource_type, resource_id, ip_address, changes_json }`. Grant only INSERT permissions on the audit table — no UPDATE or DELETE. Retain for minimum 1 year (DPDP Rules), recommend 3 years (aligned with Telemedicine Practice Guidelines 2020).

For partner anonymization, **lab partners see only order ID, test type, and sample collection details** — no patient name, phone, or address. **Pharmacy partners see only Order ID (ORD-XXXX), anonymous patient ID (ONY-P-XXXX), medications, dosage, quantities, prescription PDF, and prescribing doctor name + NMC number** — no patient name, diagnosis codes, or internal prescription ID. Map patient identity via pseudonymized references that only the core platform can resolve.

---

## The complete recommended stack

| Layer | Choice | Key rationale |
|---|---|---|
| **Backend framework** | NestJS + Fastify adapter | Largest ecosystem, healthcare-proven, 2x JSON perf with Fastify |
| **API protocol** | tRPC (all 7 TS clients) + REST (external partners) | 40–50% less boilerplate than GraphQL, zero code generation |
| **ORM** | Prisma (Query Compiler enabled) | Best DX for 2-person team, escape to raw SQL for complex queries |
| **Database** | PostgreSQL 16 on RDS Mumbai | JSONB for flexible schemas, pgAudit, pgcrypto, RLS |
| **Cache / Queue** | Redis on ElastiCache | Session store, BullMQ queues, SSE pub/sub, JWT blacklist |
| **Mobile** | React Native Expo (managed + dev builds) | Fastest path for 2-person team, healthcare features work in managed |
| **Web portals** | Separate Next.js apps (one per subdomain) | Independent deployment, security isolation, smaller bundles |
| **Monorepo** | Turborepo + pnpm workspaces | 15-minute setup, proven with Expo + Next.js + NestJS |
| **Real-time** | SSE + Redis Pub/Sub | No sticky sessions on Fargate, covers 95% of use cases |
| **Background jobs** | BullMQ + Bull Board | Already have Redis, covers all job types with monitoring |
| **Auth** | Custom NestJS JWT + WhatsApp OTP | Full DPDPA control, cheapest at scale, exact RBAC needed |
| **File storage** | S3 (SSE-KMS) + CloudFront signed URLs | 17+ Indian edge locations, compliance-grade encryption |
| **PDF generation** | @react-pdf/renderer | 10x lighter than Puppeteer, React component model |
| **Payments** | Razorpay (design around UPI limitations) | UPI Autopay with cancel+recreate for plan changes |
| **WhatsApp/SMS** | Gupshup (primary) + SMS fallback | Dominant Indian BSP, Meta-approved, regional language support |
| **RBAC** | CASL.js + NestJS Guards | Attribute-based rules with Prisma query-level enforcement |
| **Infrastructure** | AWS Mumbai (ECS Fargate, RDS, ElastiCache, S3, CloudFront) | Data residency compliance, $50–80/month at MVP |

## Conclusion

The three changes that matter most are replacing GraphQL with tRPC (saving weeks of cache management pain and thousands of lines of boilerplate), splitting the single Next.js deployment into per-portal apps (enabling independent deployment and security isolation), and using SSE instead of WebSockets (eliminating sticky session complexity on Fargate). Everything else in the proposed stack — NestJS, Prisma, PostgreSQL, Redis, Expo, AWS Mumbai — is correct and should be kept with the specific optimizations noted above.

The modular monolith architecture scales comfortably to 5,000+ patients on infrastructure costing under $700/month, with clear extraction points identified for notifications (at ~500 patients) and PDF generation (at ~2,000 patients). DPDPA compliance requires field-level encryption, immutable audit logging, and granular consent tracking from day one — not as a later bolt-on. The Indian market demands WhatsApp-first communication, defensive Razorpay UPI handling, push notification workarounds for Chinese OEM Android devices, and aggressive network optimization for tier-2/3 connectivity. Design for all of these in the first sprint, not as afterthoughts.