# BACKEND.md — Part 3b of 3: Operations, Deployment & Testing (Sections 26–30)

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

### Part 2b — Business Logic: Messaging, Wallet, Admin, Jobs, Storage (BACKEND-PART2B.md)
16. Messaging Module (Doctor-Patient Chat + SSE)
17. Wallet & Referrals Module
18. Admin Module (Partners, SLA Engine, Dashboard)
19. Background Jobs (BullMQ Queues & Processors)
20. File Storage & Document Delivery (S3/CloudFront)

### Part 3a — Security & Infrastructure (BACKEND-PART3A.md)
21. DPDPA Compliance & Data Privacy Implementation
22. Security Middleware, Guards & Interceptors
23. Error Handling & Exception Filters
24. Caching Strategy (Redis)
25. Database Migrations & Seed Data

### Part 3b — Operations, Deployment & Testing (this document)
26. [Monitoring, Logging & Observability](#26-monitoring-logging--observability)
27. [Environment Configuration](#27-environment-configuration)
28. [Build & Deployment](#28-build--deployment)
29. [Testing Strategy & Checklist](#29-testing-strategy--checklist)
30. [Appendix: Complete API Route Map & Status Flow Diagrams](#30-appendix-complete-api-route-map--status-flow-diagrams)

---

## 26. Monitoring, Logging & Observability

### 26.1 Logging Architecture

```
Application Logs (NestJS Logger)
  → stdout/stderr (structured JSON)
  → CloudWatch Logs (ECS Fargate auto-collects stdout)
  → CloudWatch Log Insights (query, search, analyze)
  → CloudWatch Alarms (alert on error patterns)

AWS Service Logs
  → ALB access logs → S3
  → RDS slow query log → CloudWatch
  → CloudFront access logs → S3
  → S3 access logs → S3 (for KMS audit)
  → CloudTrail → S3 (API call audit)
```

### 26.2 Structured Logging Format

```typescript
// logger/logger.config.ts
// All logs are structured JSON — CloudWatch Log Insights can query any field

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: string;           // ISO 8601
  requestId?: string;          // X-Request-Id header (propagated through ALB)
  userId?: string;
  userRole?: string;
  module?: string;             // NestJS module name
  action?: string;             // e.g., 'consultation.create', 'payment.capture'
  duration?: number;           // ms
  error?: {
    name: string;
    message: string;
    stack?: string;            // Only in development / error level
    code?: string;             // Prisma error code, HTTP status, tRPC code
  };
  metadata?: Record<string, any>; // Additional context (resource IDs, counts, etc.)
}
```

```typescript
// logger/custom-logger.service.ts
import { LoggerService, Injectable } from '@nestjs/common';

@Injectable()
export class StructuredLogger implements LoggerService {
  log(message: string, context?: string, metadata?: Record<string, any>) {
    this.emit('info', message, context, metadata);
  }

  error(message: string, trace?: string, context?: string) {
    this.emit('error', message, context, { stack: trace });
  }

  warn(message: string, context?: string) {
    this.emit('warn', message, context);
  }

  debug(message: string, context?: string) {
    if (process.env.NODE_ENV === 'development') {
      this.emit('debug', message, context);
    }
  }

  private emit(level: string, message: string, context?: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      level: level as any,
      message,
      timestamp: new Date().toISOString(),
      module: context,
      ...metadata,
    };

    // JSON to stdout — CloudWatch collects automatically from ECS Fargate
    const output = JSON.stringify(entry);
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }
}

// Bootstrap in main.ts:
// app.useLogger(new StructuredLogger());
```

### 26.3 Log Levels by Environment

| Level | Development | Staging | Production |
|-------|------------|---------|------------|
| `debug` | ✅ | ❌ | ❌ |
| `info` | ✅ | ✅ | ✅ |
| `warn` | ✅ | ✅ | ✅ |
| `error` | ✅ | ✅ | ✅ |
| `fatal` | ✅ | ✅ | ✅ |

**What to log at each level:**

| Level | Examples |
|-------|---------|
| `debug` | Prisma query details, cache hit/miss, SSE connection events |
| `info` | Request completed, background job started/finished, user logged in |
| `warn` | Rate limit approaching, SLA warning threshold, retry attempt |
| `error` | Unhandled exception, Razorpay API failure, S3 upload failure |
| `fatal` | Database connection lost, Redis connection lost, application crash |

### 26.4 CloudWatch Log Insights Queries

```
# Find all errors in the last hour
fields @timestamp, message, error.message, userId, module
| filter level = 'error'
| sort @timestamp desc
| limit 50

# Slow requests (>3 seconds)
fields @timestamp, message, duration, userId, module, action
| filter duration > 3000
| sort duration desc
| limit 20

# Payment failures
fields @timestamp, message, metadata.razorpayOrderId, metadata.amount, userId
| filter module = 'PaymentsModule' and level = 'error'
| sort @timestamp desc

# Request volume per minute
fields @timestamp
| filter level = 'info' and message like /Request completed/
| stats count(*) as requests by bin(1m)

# Top errors by type
fields error.message
| filter level = 'error'
| stats count(*) as errorCount by error.message
| sort errorCount desc
| limit 10

# SLA breaches
fields @timestamp, message, metadata.type, metadata.hoursOverdue, metadata.resourceId
| filter action like /sla.breach/
| sort @timestamp desc

# User activity (specific user investigation)
fields @timestamp, message, action, module
| filter userId = 'USER_ID_HERE'
| sort @timestamp desc
| limit 100
```

### 26.5 CloudWatch Alarms

| Alarm | Metric | Threshold | Action |
|-------|--------|-----------|--------|
| **High Error Rate** | Errors per minute | > 10 errors/min for 5 min | SNS → Founder email/SMS |
| **API Latency P95** | Request duration P95 | > 5 seconds for 3 consecutive periods | SNS → Founder email |
| **Database CPU** | RDS CPUUtilization | > 80% for 10 min | SNS → Founder email |
| **Database Connections** | RDS DatabaseConnections | > 80% of max | SNS → Founder email |
| **Redis Memory** | ElastiCache BytesUsedForCache | > 80% of eviction threshold | SNS → Founder email |
| **ECS Task Health** | ECS RunningTaskCount | < 1 for 2 min | SNS → Founder email + SMS |
| **5xx Responses** | ALB HTTPCode_Target_5XX_Count | > 5 in 5 min | SNS → Founder email |
| **Payment Failures** | Custom metric (logged) | > 3 in 15 min | SNS → Founder email + SMS |
| **SLA Breaches** | Custom metric (logged) | Any CRITICAL event | SNS → Founder email |
| **Disk Space** | EBS VolumeQueueLength | Queue length > 10 | SNS → Founder email |

```typescript
// Emit custom CloudWatch metrics for business-critical events
// monitoring/metrics.service.ts
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

@Injectable()
export class MetricsService {
  private cloudwatch: CloudWatchClient;

  constructor() {
    this.cloudwatch = new CloudWatchClient({ region: 'ap-south-1' });
  }

  async emitMetric(metricName: string, value: number, unit: 'Count' | 'Milliseconds' = 'Count'): Promise<void> {
    await this.cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'Onlyou/Backend',
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: [
          { Name: 'Environment', Value: process.env.NODE_ENV || 'development' },
        ],
      }],
    })).catch(err => {
      // Don't let metric emission failures affect business logic
      console.error('[METRICS] Failed to emit:', metricName, err.message);
    });
  }

  // Convenience methods
  async trackPaymentSuccess() { await this.emitMetric('PaymentSuccess', 1); }
  async trackPaymentFailure() { await this.emitMetric('PaymentFailure', 1); }
  async trackSLABreach(type: string) { await this.emitMetric(`SLABreach_${type}`, 1); }
  async trackConsultationCreated() { await this.emitMetric('ConsultationCreated', 1); }
  async trackPrescriptionSigned() { await this.emitMetric('PrescriptionSigned', 1); }
  async trackAIAssessmentDuration(ms: number) { await this.emitMetric('AIAssessmentDuration', ms, 'Milliseconds'); }
}
```

### 26.6 Health Check Endpoint

```typescript
// health/health.controller.ts
@Controller('api')
export class HealthController {
  constructor(
    private prisma: PrismaClient,
    private redis: RedisService,
  ) {}

  @Get('health')
  async healthCheck(): Promise<{
    status: 'ok' | 'degraded' | 'down';
    version: string;
    timestamp: string;
    checks: Record<string, { status: string; latency?: number }>;
  }> {
    const checks: Record<string, { status: string; latency?: number }> = {};

    // Check PostgreSQL
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok', latency: Date.now() - start };
    } catch {
      checks.database = { status: 'down' };
    }

    // Check Redis
    try {
      const start = Date.now();
      await this.redis.ping();
      checks.redis = { status: 'ok', latency: Date.now() - start };
    } catch {
      checks.redis = { status: 'down' };
    }

    // Overall status
    const allOk = Object.values(checks).every(c => c.status === 'ok');
    const anyDown = Object.values(checks).some(c => c.status === 'down');

    return {
      status: allOk ? 'ok' : anyDown ? 'down' : 'degraded',
      version: process.env.APP_VERSION || '1.0.0',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  // Detailed health check for internal monitoring (not exposed to ALB)
  @Get('health/detailed')
  @UseGuards(JwtGuard, Roles('ADMIN'))
  async detailedHealthCheck(): Promise<any> {
    const [dbPoolStats, redisInfo, queueHealth] = await Promise.all([
      this.prisma.$metrics.prometheus(), // Prisma connection pool metrics
      this.redis.info(),
      this.getQueueHealth(),
    ]);

    return {
      database: {
        poolStats: dbPoolStats,
      },
      redis: {
        info: redisInfo,
        memoryUsed: redisInfo.match(/used_memory_human:(\S+)/)?.[1],
        connectedClients: redisInfo.match(/connected_clients:(\d+)/)?.[1],
      },
      queues: queueHealth,
      process: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };
  }

  private async getQueueHealth(): Promise<Record<string, any>> {
    // Check BullMQ queue depths
    const queues = ['notifications', 'pdf-generation', 'ai-assessment', 'sla-check', 'data-retention'];
    const health: Record<string, any> = {};

    for (const queueName of queues) {
      const queue = new Queue(queueName, { connection: this.redis });
      const counts = await queue.getJobCounts();
      health[queueName] = {
        waiting: counts.waiting,
        active: counts.active,
        failed: counts.failed,
        delayed: counts.delayed,
      };
      await queue.close();
    }

    return health;
  }
}
```

### 26.7 Bull Board (Queue Monitoring Dashboard)

```typescript
// monitoring/bull-board.module.ts
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature(
      { name: 'notifications', adapter: BullMQAdapter },
      { name: 'pdf-generation', adapter: BullMQAdapter },
      { name: 'ai-assessment', adapter: BullMQAdapter },
      { name: 'sla-check', adapter: BullMQAdapter },
      { name: 'data-retention', adapter: BullMQAdapter },
      { name: 'payment-reconciliation', adapter: BullMQAdapter },
    ),
  ],
})
export class BullBoardSetupModule {}

// Access: http://localhost:3000/admin/queues (dev)
// Production: Protected by JWT + ADMIN role guard
```

### 26.8 Sentry (Error Tracking)

```typescript
// main.ts — Sentry initialization
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.APP_VERSION,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod
    profilesSampleRate: 0.1,

    // Scrub sensitive data before sending to Sentry
    beforeSend(event) {
      // Remove PII from error reports
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      if (event.request?.data) {
        // Redact known PII fields
        const data = typeof event.request.data === 'string'
          ? JSON.parse(event.request.data)
          : event.request.data;
        if (data.phone) data.phone = '[REDACTED]';
        if (data.email) data.email = '[REDACTED]';
        if (data.aadhaar) data.aadhaar = '[REDACTED]';
        if (data.address) data.address = '[REDACTED]';
        event.request.data = data;
      }
      return event;
    },
  });
}
```

---

## 27. Environment Configuration

### 27.1 Environment Files

```
apps/api/
├── .env.example          → Template with all variables (committed to Git)
├── .env                  → Local development (NOT committed — in .gitignore)
├── .env.test             → Test environment (committed, no real credentials)
└── .env.production       → NEVER exists as a file — all production vars in AWS Secrets Manager
```

### 27.2 Complete Environment Variables

```bash
# .env.example — Copy to .env for local development

# ─── APPLICATION ───
NODE_ENV=development                    # development | staging | production
APP_VERSION=1.0.0
PORT=3000

# ─── DATABASE ───
DATABASE_URL=postgresql://onlyou:onlyou_dev@localhost:5432/onlyou_dev
DATABASE_POOL_SIZE=10                   # Prisma connection pool size
DATABASE_TIMEOUT=30000                  # Query timeout (ms)

# ─── REDIS ───
REDIS_URL=redis://localhost:6379
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000

# ─── JWT ───
JWT_ACCESS_SECRET=dev_access_secret_change_in_production_minimum_256_bits
JWT_REFRESH_SECRET=dev_refresh_secret_change_in_production_minimum_256_bits
JWT_ACCESS_EXPIRY=15m                   # 15-minute access token
JWT_REFRESH_EXPIRY=7d                   # 7-day refresh token

# ─── ENCRYPTION (DPDPA Field-Level) ───
AWS_KMS_KEY_ID=alias/onlyou-healthcare-data   # KMS key alias
FIELD_HASH_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef  # 32-byte hex for HMAC

# ─── AWS ───
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key       # For local dev only — use IAM roles in production
AWS_SECRET_ACCESS_KEY=your_secret_key   # For local dev only — use IAM roles in production

# ─── S3 BUCKETS ───
S3_BUCKET_PHOTOS=onlyou-photos-dev
S3_BUCKET_PRESCRIPTIONS=onlyou-prescriptions-dev
S3_BUCKET_LAB_RESULTS=onlyou-lab-results-dev
S3_BUCKET_DOCUMENTS=onlyou-documents-dev

# ─── CLOUDFRONT ───
CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
CLOUDFRONT_KEY_PAIR_ID=APKA1234567890
CLOUDFRONT_PRIVATE_KEY_PATH=./keys/cloudfront-private-key.pem  # Base64 in prod

# ─── RAZORPAY ───
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# ─── GUPSHUP (WhatsApp + SMS) ───
GUPSHUP_API_KEY=your_gupshup_api_key
GUPSHUP_APP_NAME=onlyou
GUPSHUP_WHATSAPP_NUMBER=919876543210
GUPSHUP_WEBHOOK_API_KEY=your_webhook_api_key

# ─── MSG91 (SMS Fallback) ───
MSG91_AUTH_KEY=your_msg91_auth_key
MSG91_SENDER_ID=ONLYOU
MSG91_TEMPLATE_ID_OTP=your_template_id

# ─── FIREBASE (FCM Push Notifications) ───
FIREBASE_PROJECT_ID=onlyou-prod
FIREBASE_PRIVATE_KEY_BASE64=base64_encoded_service_account_key
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@onlyou-prod.iam.gserviceaccount.com

# ─── CLAUDE AI ───
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
ANTHROPIC_MODEL=claude-sonnet-4-20250514
AI_ASSESSMENT_MAX_TOKENS=4096
AI_ASSESSMENT_TIMEOUT=60000              # 60 seconds

# ─── EMAIL (SES) ───
SES_REGION=ap-south-1
SES_FROM_EMAIL=noreply@onlyou.life
SES_FROM_NAME=Onlyou Health

# ─── SENTRY ───
SENTRY_DSN=https://xxxx@sentry.io/yyyy

# ─── FEATURE FLAGS (overrides DB values for dev) ───
FF_VIDEO_CONSULTATION=false
FF_PCOS_VERTICAL=false
FF_REFERRAL_BONUS=false

# ─── CORS ───
CORS_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:3005,http://localhost:3006
```

### 27.3 Configuration Service

```typescript
// config/config.module.ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      validationSchema: Joi.object({
        // Required in ALL environments
        NODE_ENV: Joi.string().valid('development', 'staging', 'production').required(),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),

        // Required in production only
        AWS_KMS_KEY_ID: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().required(),
          otherwise: Joi.string().optional(),
        }),
        RAZORPAY_KEY_ID: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().required(),
          otherwise: Joi.string().optional().default('rzp_test_placeholder'),
        }),
        ANTHROPIC_API_KEY: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().required(),
          otherwise: Joi.string().optional().default('sk-ant-placeholder'),
        }),

        // Optional with defaults
        DATABASE_POOL_SIZE: Joi.number().default(10),
        JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRY: Joi.string().default('7d'),
      }),
      validationOptions: {
        allowUnknown: true,     // Don't fail on extra env vars
        abortEarly: false,      // Report all validation errors at once
      },
    }),
  ],
})
export class AppConfigModule {}
```

### 27.4 Production Secrets Management

```
Production environment variables are stored in AWS Secrets Manager + ECS Task Definition:

AWS Secrets Manager:
├── onlyou/production/database     → DATABASE_URL
├── onlyou/production/redis        → REDIS_URL
├── onlyou/production/jwt          → JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
├── onlyou/production/razorpay     → RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
├── onlyou/production/gupshup      → GUPSHUP_API_KEY, GUPSHUP_WEBHOOK_API_KEY
├── onlyou/production/anthropic    → ANTHROPIC_API_KEY
├── onlyou/production/firebase     → FIREBASE_PRIVATE_KEY_BASE64
├── onlyou/production/encryption   → FIELD_HASH_KEY
└── onlyou/production/sentry       → SENTRY_DSN

ECS Task Definition:
  → References Secrets Manager ARNs for each variable
  → Secrets injected as environment variables at container startup
  → No secrets in Docker image, no secrets in Git, no secrets in CI/CD config
```

---

## 28. Build & Deployment

### 28.1 Docker Multi-Stage Build

```dockerfile
# apps/api/Dockerfile

# ─── Stage 1: Dependencies ───
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/config/package.json packages/config/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# ─── Stage 2: Build ───
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN pnpm --filter api prisma generate

# Build the API
RUN pnpm --filter api build

# Prune dev dependencies
RUN pnpm prune --prod

# ─── Stage 3: Production Runner ───
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

EXPOSE 3000

# Use dumb-init to handle PID 1 properly (signal forwarding, zombie reaping)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

### 28.2 Docker Compose (Full Local Stack)

```yaml
# docker-compose.yml (monorepo root)
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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U onlyou -d onlyou_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --appendonly yes
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  redisdata:
```

### 28.3 ECS Fargate Task Definition

```json
{
  "family": "onlyou-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/onlyou-ecs-execution-role",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/onlyou-ecs-task-role",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "ACCOUNT.dkr.ecr.ap-south-1.amazonaws.com/onlyou-api:latest",
      "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
      "essential": true,
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/onlyou-api",
          "awslogs-region": "ap-south-1",
          "awslogs-stream-prefix": "api"
        }
      },
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:onlyou/production/database:DATABASE_URL::" },
        { "name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:onlyou/production/redis:REDIS_URL::" },
        { "name": "JWT_ACCESS_SECRET", "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:onlyou/production/jwt:JWT_ACCESS_SECRET::" },
        { "name": "JWT_REFRESH_SECRET", "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:onlyou/production/jwt:JWT_REFRESH_SECRET::" },
        { "name": "RAZORPAY_KEY_ID", "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:onlyou/production/razorpay:RAZORPAY_KEY_ID::" },
        { "name": "RAZORPAY_KEY_SECRET", "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:onlyou/production/razorpay:RAZORPAY_KEY_SECRET::" },
        { "name": "ANTHROPIC_API_KEY", "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:onlyou/production/anthropic:ANTHROPIC_API_KEY::" },
        { "name": "SENTRY_DSN", "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT:secret:onlyou/production/sentry:SENTRY_DSN::" }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3000" },
        { "name": "AWS_REGION", "value": "ap-south-1" }
      ]
    }
  ]
}
```

### 28.4 Deployment Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy-api.yml
name: Deploy API

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/types/**'
      - '.github/workflows/deploy-api.yml'

env:
  AWS_REGION: ap-south-1
  ECR_REPOSITORY: onlyou-api
  ECS_CLUSTER: onlyou-cluster
  ECS_SERVICE: onlyou-api-service

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to ECR
        id: ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG -f apps/api/Dockerfile .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Run database migrations
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        run: |
          npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_SERVICE \
            --force-new-deployment

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster $ECS_CLUSTER \
            --services $ECS_SERVICE

      - name: Notify success
        if: success()
        run: echo "✅ API deployed successfully"

      - name: Notify failure
        if: failure()
        run: echo "❌ API deployment failed"
```

### 28.5 Web Portal Deployment (Per-Portal)

```yaml
# .github/workflows/deploy-doctor-portal.yml (template — duplicate for each portal)
name: Deploy Doctor Portal

on:
  push:
    branches: [main]
    paths:
      - 'apps/doctor-portal/**'
      - 'packages/ui/**'
      - 'packages/api-client/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm --filter doctor-portal build
        env:
          NEXT_PUBLIC_API_URL: https://api.onlyou.life

      - name: Build Docker image & deploy to ECS
        # Same ECR build + ECS deploy pattern as API
        # Each portal is a separate ECS service with its own task definition
        run: |
          # ... (same as API deployment)
```

### 28.6 Domain Routing (ALB + CloudFront)

```
CloudFront Distributions:
├── onlyou.life              → S3 (landing page static site) or ECS (if SSR)
├── api.onlyou.life          → ALB → ECS (NestJS API)
├── doctor.onlyou.life       → ALB → ECS (Doctor Portal)
├── admin.onlyou.life        → ALB → ECS (Admin Portal)
├── nurse.onlyou.life        → ALB → ECS (Nurse Portal)
├── lab.onlyou.life          → ALB → ECS (Lab Portal)
└── pharmacy.onlyou.life     → ALB → ECS (Pharmacy Portal)

ALB Listener Rules:
  Host: api.onlyou.life       → Target Group: onlyou-api (port 3000)
  Host: doctor.onlyou.life    → Target Group: onlyou-doctor (port 3001)
  Host: admin.onlyou.life     → Target Group: onlyou-admin (port 3002)
  Host: nurse.onlyou.life     → Target Group: onlyou-nurse (port 3003)
  Host: lab.onlyou.life       → Target Group: onlyou-lab (port 3004)
  Host: pharmacy.onlyou.life  → Target Group: onlyou-pharmacy (port 3005)

SSL Certificates (ACM):
  *.onlyou.life (wildcard) — auto-renewed by ACM
```

### 28.7 Scaling Configuration

| Stage | ECS Config | RDS Config | ElastiCache Config | Monthly Cost |
|-------|-----------|-----------|-------------------|-------------|
| **MVP (0-500 patients)** | 1 task, 0.5 vCPU, 1GB | db.t3.micro | t3.micro | ~$50-80 |
| **Stage 2 (500-5,000)** | 1-2 tasks, 1 vCPU, 2GB | db.t3.small | t3.small | ~$120-180 |
| **Stage 3 (5,000+)** | 2-6 tasks, 1 vCPU, 2GB + auto-scaling | db.t3.medium + read replica | t3.medium | ~$400-700 |

**Auto-scaling policy (Stage 3):**
```json
{
  "TargetTrackingScalingPolicyConfiguration": {
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }
}
```

### 28.8 Rollback Strategy

```bash
# If a deployment causes issues:

# 1. Roll back ECS to previous task definition
aws ecs update-service \
  --cluster onlyou-cluster \
  --service onlyou-api-service \
  --task-definition onlyou-api:<PREVIOUS_REVISION>

# 2. If database migration needs rollback (RARE — avoid destructive migrations):
# Prisma does not have built-in rollback
# Strategy: deploy a NEW migration that reverses the changes
# This is why we only deploy ADDITIVE schema changes (add columns/tables)

# 3. Emergency: revert Git commit and redeploy
git revert HEAD
git push origin main
# Pipeline auto-deploys the reverted code
```

---

## 29. Testing Strategy & Checklist

### 29.1 Testing Approach

**100% manual testing for MVP.** The founder has no coding experience — all testing is visual, click-through testing. Claude AI writes the code; the founder tests by using the app and reporting what's wrong.

**Why no automated tests for MVP:**
- 2-person team (founder + Claude AI) — automated tests double the codebase to maintain
- The founder can't write tests (non-technical)
- Claude AI can generate tests, but maintaining them alongside rapid iteration is counterproductive
- The risk profile of a <1,000 patient MVP doesn't justify the investment

**When to add automated tests:**
- Stage 2 (500+ patients): Add integration tests for payment flows and prescription generation
- Stage 3 (5,000+ patients): Add E2E tests for critical paths, unit tests for business logic

### 29.2 Manual Testing Workflow

```
1. Claude AI writes/modifies code
2. Founder tests the change by:
   a. Opening the relevant app/portal in browser
   b. Clicking through the affected flow
   c. Checking that the expected behavior occurs
   d. Testing edge cases (empty states, errors, slow network)
3. If broken: describe what happened to Claude → Claude fixes → repeat
4. If working: move to next feature/fix
```

### 29.3 Complete Testing Checklist — Backend API

#### Authentication & Authorization

| # | Test Case | How to Test | Expected Result |
|---|-----------|-------------|-----------------|
| A1 | Patient OTP login | Open patient app → enter phone → receive OTP (WhatsApp) → enter code | Login successful, redirected to home |
| A2 | OTP SMS fallback | Disable WhatsApp on test phone → request OTP | OTP arrives via SMS |
| A3 | Invalid OTP | Enter wrong 6-digit code | "Invalid OTP" error, attempts counter incremented |
| A4 | OTP rate limit | Request OTP 4 times in 15 minutes for same phone | 4th request blocked: "Too many OTP requests" |
| A5 | OTP expiry | Wait 6 minutes after receiving OTP → try to verify | "OTP expired" error |
| A6 | JWT refresh | Wait 16+ minutes (access token expired) → make API call | Token auto-refreshes, request succeeds |
| A7 | Logout | Tap logout in any portal | Token cleared, redirected to login, API calls fail |
| A8 | Cross-role access | Use doctor JWT to call patient-only endpoint | 403 Forbidden |
| A9 | Expired refresh token | Don't use app for 8+ days → return | Redirect to login (refresh token expired) |
| A10 | Concurrent sessions | Login on two devices simultaneously | Both sessions work independently |
| A11 | Token theft detection | Reuse an old refresh token after rotation | ALL sessions revoked, user must re-login |
| A12 | Google social login | Patient app → tap "Sign in with Google" | Account created/linked, redirected to phone verification |
| A13 | Apple social login | Patient app (iOS) → tap "Sign in with Apple" | Account created/linked, redirected to phone verification |
| A14 | Admin phone OTP login | Admin portal → enter admin phone → verify OTP | Login successful, admin dashboard shown |
| A15 | Doctor phone OTP login | Doctor portal → enter doctor phone → verify OTP | Login successful, doctor caseload shown |

#### Consultation Flow (End-to-End)

| # | Test Case | How to Test | Expected Result |
|---|-----------|-------------|-----------------|
| C1 | Create consultation | Patient app → select Hair Loss → complete questionnaire | Consultation created, status: SUBMITTED |
| C2 | Photo upload | Patient app → upload 4 head photos | Photos visible in consultation, S3 upload confirmed |
| C3 | AI assessment | After photo upload → wait for AI processing | Assessment generated (severity, flags, suggestions), status: AI_COMPLETE |
| C4 | Doctor receives case | Doctor portal → check caseload | New case appears in "New" tab with AI assessment |
| C5 | Doctor reviews | Doctor portal → open case → view questionnaire + photos + AI | All data visible, status changes to REVIEWING |
| C6 | Prescription created | Doctor portal → create prescription → select medications → sign | Prescription PDF generated, status: PRESCRIPTION_CREATED |
| C7 | Patient sees prescription | Patient app → consultation detail | Prescription card visible with medication list + PDF download |
| C8 | Lab order created | Doctor portal → order blood work panel | Lab order created, patient notified to book slot |

#### Prescription & Medication Delivery

| # | Test Case | How to Test | Expected Result |
|---|-----------|-------------|-----------------|
| D1 | Order sent to pharmacy | Admin portal → select order → send to pharmacy | Pharmacy portal shows new order, status: SENT_TO_PHARMACY |
| D2 | Pharmacy starts preparing | Pharmacy portal → tap "Start Preparing" | Status: PREPARING, admin sees update |
| D3 | Pharmacy marks ready | Pharmacy portal → tap "Ready for Pickup" | Status: READY, admin can arrange delivery |
| D4 | Admin arranges delivery | Admin portal → enter delivery person details | Status: OUT_FOR_DELIVERY, SMS sent to delivery person |
| D5 | Delivery person link | Open SMS link on delivery phone | Delivery page shows address, order details, OTP input |
| D6 | Patient confirms delivery | Patient provides 4-digit OTP to delivery person | Status: DELIVERED, order complete |
| D7 | Pharmacy stock issue | Pharmacy portal → report stock issue | Status: PHARMACY_ISSUE, admin notified |
| D8 | Admin resolves stock issue | Admin portal → reassign to different pharmacy | New pharmacy receives the order |
| D9 | Delivery failed | Delivery person can't deliver → mark failed | Status: DELIVERY_FAILED, admin can reschedule |

#### Lab Orders & Nurse Visits

| # | Test Case | How to Test | Expected Result |
|---|-----------|-------------|-----------------|
| L1 | Patient books slot | Patient app → lab order → book time slot | Slot booked, status: SLOT_BOOKED |
| L2 | Admin assigns nurse | Admin portal → assign nurse to visit | Nurse portal shows new assignment |
| L3 | Nurse starts visit | Nurse portal → "Start Visit" → navigate to patient | Status: EN_ROUTE, patient notified |
| L4 | Nurse records vitals | Nurse portal → enter BP, weight, etc. | Vitals saved, visible in consultation |
| L5 | Nurse collects sample | Nurse portal → confirm sample collection, enter tube count | Status: SAMPLE_COLLECTED |
| L6 | Nurse delivers to lab | Nurse portal → mark delivered to lab | Lab portal shows incoming sample |
| L7 | Lab receives sample | Lab portal → confirm receipt, verify tube count | Status: SAMPLE_RECEIVED |
| L8 | Lab processes sample | Lab portal → mark "Start Processing" | Status: PROCESSING |
| L9 | Lab uploads results | Lab portal → upload PDF → enter flags | Status: RESULTS_READY, doctor notified |
| L10 | Doctor reviews results | Doctor portal → view results + flags | Results visible, can create follow-up prescription |
| L11 | Patient self-uploads | Patient app → lab order → self-upload results | PDF uploaded, doctor notified |
| L12 | Critical value flag | Lab enters critical value (e.g., very low TSH) | Alert sent to doctor AND admin immediately |

#### Payments & Subscriptions

| # | Test Case | How to Test | Expected Result |
|---|-----------|-------------|-----------------|
| P1 | New subscription (Razorpay) | Patient app → select plan → complete Razorpay checkout | Subscription active, consultation flow unlocked |
| P2 | UPI payment | Patient app → select plan → pay via UPI | Payment captured, subscription active |
| P3 | Payment failure | Patient app → intentionally fail payment (test card) | Error shown, subscription not created |
| P4 | Subscription renewal | Wait for cycle end (use test subscription) | Auto-renews, new order created for medications |
| P5 | Subscription cancellation | Patient app → settings → cancel subscription | Cancelled, current cycle remains active |
| P6 | Razorpay webhook | Trigger test webhook from Razorpay dashboard | Payment status updated in database |
| P7 | Refund request | Doctor portal → request refund for patient | Refund request appears in admin portal |
| P8 | Refund approval | Admin portal → approve refund | Razorpay refund processed OR wallet credit applied |
| P9 | Wallet usage | Patient with wallet balance → checkout → apply wallet | Wallet deducted, remaining charged via Razorpay |
| P10 | Promo code | Patient app → enter valid promo code at checkout | Discount applied to first payment |

#### Notifications

| # | Test Case | How to Test | Expected Result |
|---|-----------|-------------|-----------------|
| N1 | WhatsApp OTP | Request OTP in any portal | OTP arrives via WhatsApp within 10 seconds |
| N2 | SMS OTP fallback | Block WhatsApp delivery → request OTP | OTP arrives via SMS within 15 seconds |
| N3 | Push notification (Android) | Trigger notification event (new case for doctor) | FCM push notification arrives on Android |
| N4 | Push notification (iOS) | Same as N3 on iOS device | APNs push notification arrives on iOS |
| N5 | WhatsApp prescription | Patient gets prescription → notification sent | WhatsApp message with prescription summary |
| N6 | SSE real-time update | Doctor portal open → admin changes case status | Status updates in real-time without page refresh |
| N7 | SSE reconnection | Kill network → restore → check doctor portal | "Reconnecting..." banner → auto-reconnects → data refreshes |
| N8 | Discreet mode | Patient app → enable discreet mode → trigger notification | Notification shows "Onlyou: New update" (no medical content) |

#### Admin Portal

| # | Test Case | How to Test | Expected Result |
|---|-----------|-------------|-----------------|
| AD1 | Dashboard overview | Open admin portal desktop | All metrics visible (today's cases, active orders, revenue) |
| AD2 | Case management | Admin portal → Cases tab → filter by status | Cases list with correct filters and counts |
| AD3 | Partner management | Admin portal → add new pharmacy partner | Partner created, appears in partner list |
| AD4 | SLA monitoring | Wait for SLA threshold to pass | SLA warning/breach appears in admin dashboard |
| AD5 | Activity feed | Perform various actions across portals | All actions appear in real-time activity feed |
| AD6 | Audit log | Admin portal → Audit Log section | All logged actions visible with filters |
| AD7 | Feature flags | Admin portal → toggle feature flag | Flag change takes effect within 5 minutes |
| AD8 | Pricing update | Admin portal → update subscription pricing | New pricing reflected in patient app checkout |

#### DPDPA Compliance

| # | Test Case | How to Test | Expected Result |
|---|-----------|-------------|-----------------|
| PR1 | Consent grant | Patient app → onboarding → review consent screens | Each consent recorded separately in consent_records |
| PR2 | Consent withdrawal | Patient app → settings → privacy → withdraw marketing consent | Consent withdrawn, marketing notifications stop |
| PR3 | Data export | Patient app → settings → privacy → request data export | JSON file downloadable with all patient data |
| PR4 | Data erasure | Patient app → settings → privacy → request account deletion | PII redacted, retained data list shown to patient |
| PR5 | Pharmacy anonymization | Check pharmacy portal data | No patient name, phone, or address visible |
| PR6 | Lab anonymization | Check lab portal data | Only sample ID, tests, age, gender visible |
| PR7 | Audit trail immutability | Attempt to update/delete audit_log via direct DB | Permission denied (INSERT-only) |

### 29.4 Testing Environment Setup

```bash
# 1. Start local infrastructure
docker compose up -d

# 2. Apply migrations
pnpm --filter api prisma migrate dev

# 3. Seed test data
pnpm --filter api prisma db seed

# 4. Start all services
pnpm dev  # (Turborepo runs all apps in parallel)

# 5. Open test accounts:
#    Patient app: http://localhost:8081 (Expo)
#    Doctor: http://localhost:3001
#    Admin: http://localhost:3002
#    Nurse: http://localhost:3003
#    Lab: http://localhost:3004
#    Pharmacy: http://localhost:3005

# 6. Login with test phone numbers:
#    In development: OTP is always 123456 (hardcoded bypass)
```

### 29.5 Development OTP Bypass

```typescript
// auth/otp/otp.service.ts — Development shortcut
async verifyOtp(phone: string, code: string): Promise<boolean> {
  // In development: accept 123456 as universal OTP
  if (process.env.NODE_ENV === 'development' && code === '123456') {
    return true;
  }

  // Production: verify against Redis-stored hashed OTP
  const storedHash = await this.redis.get(CacheKeys.otp(phone));
  if (!storedHash) return false; // Expired
  return bcrypt.compare(code, storedHash);
}
```

---

## 30. Appendix: Complete API Route Map & Status Flow Diagrams

### 30.1 Complete tRPC Route Map

```
appRouter
├── auth
│   ├── sendOtp                  mutation  → Send OTP via WhatsApp/SMS
│   ├── verifyOtp                mutation  → Verify OTP, return JWT pair
│   ├── socialLogin              mutation  → Google/Apple OAuth → link/create account
│   ├── refreshToken             mutation  → Rotate refresh token, issue new access token
│   ├── logout                   mutation  → Blacklist JWT, clear refresh token
│   └── verifyPhone              mutation  → Mandatory phone verification for social login users
│
├── user
│   ├── getProfile               query     → Get current user's profile (any role)
│   ├── updateProfile            mutation  → Update profile fields (any role)
│   ├── getPatientForDoctor      query     → Doctor: get assigned patient details
│   ├── deactivateAccount        mutation  → Patient: request account deactivation
│   └── updateNotificationPrefs  mutation  → Patient: update notification preferences
│
├── questionnaire
│   ├── getByVertical            query     → Get questionnaire schema for a condition
│   └── submit                   mutation  → Submit questionnaire responses
│
├── photo
│   ├── getUploadUrl             mutation  → Patient: get presigned S3 upload URL
│   ├── confirmUpload            mutation  → Patient: confirm photo uploaded to S3
│   └── getPhotos                query     → Doctor: get patient photos for consultation
│
├── aiAssessment
│   ├── getByConsultation        query     → Doctor: get AI assessment for a case
│   └── regenerate               mutation  → Admin: force regenerate AI assessment
│
├── consultation
│   ├── create                   mutation  → Patient: create new consultation
│   ├── getById                  query     → Get consultation detail (patient/doctor)
│   ├── list                     query     → List consultations (filtered by role)
│   ├── updateStatus             mutation  → Doctor: transition consultation status
│   ├── getDoctorCaseload        query     → Doctor: get all assigned active cases
│   ├── assignDoctor             mutation  → Admin: assign doctor to consultation
│   └── close                    mutation  → Doctor: close consultation with reason
│
├── prescription
│   ├── create                   mutation  → Doctor: create prescription for consultation
│   ├── sign                     mutation  → Doctor: digitally sign prescription
│   ├── getById                  query     → Get prescription detail (patient/doctor/admin)
│   ├── getPdf                   query     → Get signed PDF download URL
│   └── listTemplates            query     → Doctor: get medication templates by vertical
│
├── labOrder
│   ├── create                   mutation  → Doctor: create lab order
│   ├── getById                  query     → Get lab order detail
│   ├── list                     query     → List lab orders (filtered by role)
│   ├── bookSlot                 mutation  → Patient: book collection time slot
│   ├── assignNurse              mutation  → Admin: assign nurse to collection visit
│   ├── assignLab                mutation  → Admin: assign diagnostic centre
│   ├── updateStatus             mutation  → Update lab order status (role-specific transitions)
│   ├── uploadResults            mutation  → Lab: upload result PDF + flags
│   ├── selfUploadResults        mutation  → Patient: self-upload results from external lab
│   ├── reportIssue              mutation  → Lab: report issue with sample
│   └── requestRecollection      mutation  → Admin/Doctor: request new collection
│
├── order
│   ├── getById                  query     → Get medication order detail
│   ├── list                     query     → List orders (filtered by role)
│   ├── sendToPharmacy           mutation  → Admin: send order to pharmacy
│   ├── updateStatus             mutation  → Update order status (role-specific transitions)
│   ├── reportStockIssue         mutation  → Pharmacy: report stock issue
│   ├── resolveStockIssue        mutation  → Admin: resolve pharmacy stock issue
│   ├── arrangeDelivery          mutation  → Admin: enter delivery person details
│   ├── confirmDelivery          mutation  → Delivery person: confirm with OTP
│   └── cancelOrder              mutation  → Admin: cancel order with reason
│
├── nurseVisit
│   ├── getById                  query     → Get visit detail
│   ├── getMyAssignments         query     → Nurse: get today's assignments
│   ├── startVisit               mutation  → Nurse: mark en route
│   ├── recordVitals             mutation  → Nurse: submit vitals measurements
│   ├── collectSample            mutation  → Nurse: confirm sample collection
│   ├── completeVisit            mutation  → Nurse: mark visit complete
│   ├── reportLate               mutation  → Nurse: report running late
│   ├── reportUnavailable        mutation  → Nurse: patient unavailable
│   └── deliverToLab             mutation  → Nurse: confirm lab delivery
│
├── payment
│   ├── createSubscription       mutation  → Patient: create Razorpay subscription
│   ├── cancelSubscription       mutation  → Patient: cancel subscription
│   ├── getPaymentHistory        query     → Patient: get payment history
│   ├── applyPromoCode           mutation  → Patient: validate and apply promo code
│   ├── requestRefund            mutation  → Doctor: request refund for patient
│   ├── approveRefund            mutation  → Admin: approve refund request
│   └── rejectRefund             mutation  → Admin: reject refund request
│
├── notification
│   ├── getMyNotifications       query     → Get notifications for current user
│   ├── markRead                 mutation  → Mark notification as read
│   ├── markAllRead              mutation  → Mark all notifications as read
│   └── registerFcmToken         mutation  → Register device FCM token for push
│
├── message
│   ├── send                     mutation  → Send message in consultation chat
│   ├── getByConsultation        query     → Get message history for consultation
│   ├── markRead                 mutation  → Mark messages as read
│   └── getCannedResponses       query     → Doctor: get canned response templates
│
├── wallet
│   ├── getBalance               query     → Patient: get wallet balance
│   ├── getTransactions          query     → Patient: get transaction history
│   ├── applyReferralCode        mutation  → Patient: apply referral code
│   └── getMyReferralCode        query     → Patient: get personal referral code
│
├── consent
│   ├── getActiveConsents        query     → Patient: get all active consents
│   ├── grantConsent             mutation  → Patient: grant consent for purpose
│   ├── withdrawConsent          mutation  → Patient: withdraw consent
│   └── getConsentHistory        query     → Patient: get consent change history
│
├── privacy
│   ├── requestDataExport        mutation  → Patient: generate data export
│   ├── requestDataErasure       mutation  → Patient: request account/data deletion
│   └── requestDataCorrection    mutation  → Patient: request correction of personal data
│
├── admin
│   ├── getDashboard             query     → Admin: dashboard metrics + charts
│   ├── getActivityFeed          query     → Admin: system event feed
│   ├── getAuditLogs             query     → Admin: audit log with filters
│   ├── getPartners              query     → Admin: list all partners (pharmacies, labs, clinics)
│   ├── createPartner            mutation  → Admin: create partner entity
│   ├── updatePartner            mutation  → Admin: update partner details
│   ├── deactivatePartner        mutation  → Admin: deactivate partner
│   ├── getConfig                query     → Admin: get system config (feature flags, SLA, pricing)
│   ├── updateConfig             mutation  → Admin: update system config
│   ├── getUsers                 query     → Admin: list/search users by role
│   ├── activateUser             mutation  → Admin: activate user account
│   ├── deactivateUser           mutation  → Admin: deactivate user account
│   └── getSLAReport             query     → Admin: SLA compliance report
│
└── storage
    ├── getPhotoUploadUrl        mutation  → Patient: presigned URL for photo upload
    ├── getLabResultUploadUrl    mutation  → Lab: presigned URL for result upload
    ├── getDownloadUrl           query     → Any authorized: signed download URL
    └── confirmPhotoUpload       mutation  → Patient: confirm S3 upload completion
```

### 30.2 REST Endpoints (External Only)

```
POST /api/webhooks/razorpay
  → Razorpay payment/subscription event webhooks
  → Guarded by: RazorpayWebhookGuard (HMAC signature verification)
  → Events: payment.captured, payment.failed, subscription.activated,
    subscription.charged, subscription.cancelled, refund.processed

POST /api/webhooks/gupshup
  → Gupshup delivery receipts + incoming WhatsApp messages
  → Guarded by: GupshupWebhookGuard (API key verification)
  → Events: message.delivered, message.read, message.failed, message.received

GET /api/delivery/:token
  → Delivery person page (opened via SMS link)
  → Token: JWT with orderId + deliveryPersonPhone (1-hour expiry)
  → Returns: HTML page with delivery details + OTP input form
  → No auth required (token IS the auth)

GET /api/health
  → ALB health check
  → Returns: { status, version, timestamp, checks }
  → No auth required

GET /api/health/detailed
  → Detailed system health (admin only)
  → Returns: database pool, Redis info, queue depths, process metrics
  → Guarded by: JwtGuard + Admin role

GET /api/sse/patient
GET /api/sse/doctor
GET /api/sse/admin
GET /api/sse/nurse
GET /api/sse/lab
GET /api/sse/pharmacy
  → Server-Sent Events endpoints (one per role)
  → Guarded by: JWT (from query param or cookie)
  → Returns: EventStream with role-specific events

/admin/queues/*
  → Bull Board UI for queue monitoring
  → Guarded by: JWT + Admin role
```

### 30.3 Status Flow: Consultation Lifecycle

```
Patient creates consultation
        │
        ▼
    SUBMITTED ──────────────────────────────────────────────────┐
        │                                                       │
        │ Auto: AI assessment queued (BullMQ)                   │
        ▼                                                       │
    AI_PROCESSING ──→ (failure) ──→ AI_FAILED ──→ (retry) ─────┤
        │                                                       │
        │ Auto: AI complete, case queued for assignment          │
        ▼                                                       │
    AI_COMPLETE                                                 │
        │                                                       │
        │ Admin/auto: assign to doctor                          │
        ▼                                                       │
    ASSIGNED (doctor notification sent)                         │
        │                                                       │
        │ Doctor opens case                                     │
        ▼                                                       │
    REVIEWING                                                   │
        │                                                       │
        ├── Doctor creates prescription ──→ PRESCRIPTION_CREATED │
        │                                                       │
        ├── Doctor requests more info ──→ INFO_REQUESTED ───────┤
        │       │                                               │
        │       │ Patient responds                              │
        │       ▼                                               │
        │   (patient responds) ──→ (doctor reviews) ──→ REVIEWING│
        │                                                       │
        ├── Doctor orders labs ──→ LAB_ORDERED ─────────────────┤
        │       │                                               │
        │       │ Results received + reviewed                   │
        │       ▼                                               │
        │   (results ready) ──→ (may create prescription)       │
        │                                                       │
        └── Doctor refers out ──→ REFERRED ─────────────────────┤
                                                                │
    PRESCRIPTION_CREATED                                        │
        │                                                       │
        │ Auto: medication order created                        │
        │ Patient follow-up period begins                       │
        ▼                                                       │
    FOLLOW_UP (30/60/90 day monitoring period)                  │
        │                                                       │
        │ Doctor closes case after follow-up period             │
        ▼                                                       │
    COMPLETED ──────────────────────────────────────────────────┘
```

### 30.4 Status Flow: Lab Order Lifecycle

```
Doctor creates lab order
        │
        ▼
    ORDERED
        │
        │ Patient books time slot
        ▼
    SLOT_BOOKED
        │
        │ Admin assigns nurse
        ▼
    NURSE_ASSIGNED
        │
        │ Nurse marks en route
        ▼
    EN_ROUTE
        │
        │ Nurse arrives, verifies identity, collects sample
        ▼
    SAMPLE_COLLECTED
        │
        │ Nurse delivers to diagnostic centre
        ▼
    DELIVERED_TO_LAB
        │
        │ Lab confirms receipt (verifies tube count)
        ▼
    SAMPLE_RECEIVED
        │
        │ Lab starts processing
        ▼
    PROCESSING
        │
        │ Lab uploads results + flags
        ▼
    RESULTS_READY
        │
        │ Doctor reviews results
        ▼
    DOCTOR_REVIEWED
        │
        │ Doctor creates follow-up prescription or closes
        ▼
    CLOSED


SPECIAL PATHS:

SAMPLE_RECEIVED or PROCESSING → SAMPLE_ISSUE
  → Lab reports problem (hemolyzed, insufficient, etc.)
  → Admin arranges recollection: new lab order created

Any pre-results status → CANCELLED
  → Admin or doctor cancels the order

ORDERED → (patient self-uploads) → RESULTS_READY
  → Skips nurse/lab path entirely
  → selfUploaded: true flag set
```

### 30.5 Status Flow: Medication Order Lifecycle

```
Prescription signed by doctor
        │
        │ Auto: order created
        ▼
    CREATED
        │
        │ Admin sends to pharmacy
        ▼
    SENT_TO_PHARMACY
        │
        │ Pharmacy starts preparing
        ▼
    PREPARING
        │
        │ Pharmacy marks ready
        ▼
    READY
        │
        │ Admin arranges delivery (enters delivery person details)
        ▼
    OUT_FOR_DELIVERY
        │
        │ Patient confirms with 4-digit OTP
        ▼
    DELIVERED ✅


SPECIAL PATHS:

SENT_TO_PHARMACY or PREPARING → PHARMACY_ISSUE
  → Pharmacy reports stock issue
  → Admin resolves:
      → "Proceed" → SENT_TO_PHARMACY (re-enters normal flow)
      → "Reassign" → REASSIGNED → new pharmacy receives order
      → "Cancel" → CANCELLED

OUT_FOR_DELIVERY → DELIVERY_FAILED
  → Delivery couldn't be completed
  → Admin can reschedule → OUT_FOR_DELIVERY (retry)

Any pre-delivery status → CANCELLED
  → Admin cancels order
```

### 30.6 Status Flow: Nurse Visit Lifecycle

```
Lab order has NURSE_ASSIGNED status
        │
        │ Nurse visit record created
        ▼
    SCHEDULED
        │
        │ Nurse taps "Start Visit"
        ▼
    EN_ROUTE (patient notified: "nurse on the way")
        │
        │ Nurse arrives, verifies patient identity
        │ Records vitals (BP, weight, heart rate, temp)
        ▼
    IN_PROGRESS
        │
        │ Nurse collects blood sample
        │ Confirms tube count, labels tubes
        ▼
    SAMPLE_COLLECTED
        │
        │ Nurse delivers all tubes to diagnostic centre
        ▼
    COMPLETED ✅


SPECIAL PATHS:

EN_ROUTE → PATIENT_UNAVAILABLE
  → Nurse arrives, patient not home
  → Admin reschedules: new visit created

Any pre-collection status → CANCELLED
  → Admin cancels the visit

SCHEDULED or EN_ROUTE → RUNNING_LATE
  → Nurse reports delay (with ETA)
  → Patient notified of delay
  → Visit continues normally after nurse arrives
```

---

## Cross-Reference: Complete Module Dependency Map

```
                           ┌─────────────┐
                           │    main.ts   │
                           └──────┬───────┘
                                  │
                           ┌──────▼───────┐
                           │  AppModule   │
                           └──────┬───────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
    ┌─────▼─────┐          ┌─────▼─────┐          ┌─────▼─────┐
    │   Auth    │          │   tRPC    │          │   REST    │
    │  Module   │          │  Router   │          │Controllers│
    └─────┬─────┘          └─────┬─────┘          └─────┬─────┘
          │                      │                      │
          │    ┌─────────────────┼─────────────────┐    │
          │    │                 │                  │    │
    ┌─────▼────▼──┐    ┌───────▼────────┐   ┌────▼────▼───┐
    │   Users     │    │ Consultations  │   │  Webhooks   │
    │   Module    │    │    Module      │   │  (Razorpay, │
    └─────────────┘    └───────┬────────┘   │   Gupshup)  │
                               │             └─────────────┘
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──┐   ┌───────▼────────┐  ┌────▼──────────┐
    │Questionnaire│  │  AI Assessment │  │ Prescriptions │
    │   Engine   │   │    Module      │  │    Module     │
    └────────────┘   └────────────────┘  └───────┬───────┘
                                                  │
                                         ┌───────▼───────┐
                                         │    Orders     │
                                         │    Module     │
                                         └───────┬───────┘
                                                  │
                              ┌───────────────────┼──────────────┐
                              │                   │              │
                    ┌─────────▼──┐      ┌────────▼───┐   ┌─────▼─────┐
                    │  Lab Orders │     │  Payments  │   │  Wallet   │
                    │   Module   │      │   Module   │   │  Module   │
                    └──────┬─────┘      └────────────┘   └───────────┘
                           │
                    ┌──────▼─────┐
                    │   Nurse    │
                    │   Module   │
                    └────────────┘

    CROSS-CUTTING MODULES (used by all):
    ┌──────────┐  ┌────────────┐  ┌───────┐  ┌─────────┐  ┌──────────┐
    │Messaging │  │Notifications│  │Storage│  │  Audit  │  │  Cache   │
    │(SSE+Chat)│  │(WhatsApp/  │  │ (S3)  │  │ Service │  │ Service  │
    │          │  │SMS/FCM/SES)│  │       │  │         │  │ (Redis)  │
    └──────────┘  └────────────┘  └───────┘  └─────────┘  └──────────┘

    BACKGROUND (BullMQ):
    ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐
    │ Notification │  │     PDF      │  │  SLA Check    │  │    Data     │
    │   Dispatch   │  │  Generation  │  │  (every 15m)  │  │  Retention  │
    └──────────────┘  └──────────────┘  └───────────────┘  └─────────────┘
```

---

*End of BACKEND-PART3B.md — Sections 26–30 Complete*

*This concludes the complete Backend specification (Parts 1, 2A, 2B, 3A, 3B) — 30 sections covering the entire Onlyou Telehealth backend system.*
