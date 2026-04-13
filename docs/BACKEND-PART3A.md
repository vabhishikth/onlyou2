# BACKEND.md — Part 3a of 3: Security & Infrastructure (Sections 21–25)

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

### Part 3a — Security & Infrastructure (this document)
21. [DPDPA Compliance & Data Privacy Implementation](#21-dpdpa-compliance--data-privacy-implementation)
22. [Security Middleware, Guards & Interceptors](#22-security-middleware-guards--interceptors)
23. [Error Handling & Exception Filters](#23-error-handling--exception-filters)
24. [Caching Strategy (Redis)](#24-caching-strategy-redis)
25. [Database Migrations & Seed Data](#25-database-migrations--seed-data)

### Part 3b — Operations, Deployment & Testing (BACKEND-PART3B.md)
26. Monitoring, Logging & Observability
27. Environment Configuration
28. Build & Deployment
29. Testing Strategy & Checklist
30. Appendix: Complete API Route Map & Status Flow Diagrams

---

## 21. DPDPA Compliance & Data Privacy Implementation

### 21.1 Regulatory Context

The Digital Personal Data Protection Act, 2023 (DPDPA) with DPDP Rules 2025 (notified November 14, 2025) requires **full compliance by May 2027**. Onlyou implements compliance from day one — retrofitting data privacy into an existing healthcare system is exponentially harder than building it in.

**Key DPDPA obligations for Onlyou:**
- Purpose-limited data collection with granular consent
- Right to access, correct, and erase personal data
- Data breach notification (72 hours to Data Protection Board)
- Immutable audit trails for all data processing
- Data minimization — collect only what's clinically necessary
- Anonymization/pseudonymization for partner-shared data

### 21.2 Three-Layer Encryption

```typescript
// security/encryption/encryption.service.ts
import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { KMSClient, DecryptCommand, GenerateDataKeyCommand } from '@aws-sdk/client-kms';

@Injectable()
export class EncryptionService {
  private kmsClient: KMSClient;
  private kmsKeyId: string;

  constructor(private config: ConfigService) {
    this.kmsClient = new KMSClient({ region: 'ap-south-1' });
    this.kmsKeyId = this.config.get('AWS_KMS_KEY_ID'); // alias/onlyou-healthcare-data
  }

  // ─── LAYER 1: AT REST (handled by AWS) ───
  // RDS: AES-256 encryption enabled (automatic for all data + backups)
  // S3: SSE-KMS on all 4 buckets (photos, prescriptions, lab-results, documents)
  // ElastiCache: in-transit + at-rest encryption enabled

  // ─── LAYER 2: IN TRANSIT (handled by AWS/infra) ───
  // ALB → Fargate: TLS 1.2+ (ACM certificate on ALB)
  // Client → CloudFront: TLS 1.2+ (ACM certificate)
  // Fargate → RDS: TLS enforced via RDS parameter group (rds.force_ssl = 1)
  // Fargate → ElastiCache: TLS enforced via Redis cluster config

  // ─── LAYER 3: FIELD-LEVEL ENCRYPTION (application-level) ───
  // For highest-sensitivity PII: Aadhaar, phone numbers, email addresses,
  // diagnosis codes, treatment plans

  /**
   * Encrypt a field value using AES-256-GCM with a KMS-managed data key.
   * The encrypted data key is prepended to the ciphertext so we can decrypt
   * without a separate key lookup.
   */
  async encryptField(plaintext: string): Promise<string> {
    // Generate a data key from KMS
    const { Plaintext: dataKey, CiphertextBlob: encryptedDataKey } =
      await this.kmsClient.send(new GenerateDataKeyCommand({
        KeyId: this.kmsKeyId,
        KeySpec: 'AES_256',
      }));

    if (!dataKey || !encryptedDataKey) throw new Error('KMS data key generation failed');

    // Encrypt with AES-256-GCM
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(dataKey), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Pack: encryptedDataKey length (2 bytes) + encryptedDataKey + iv (12 bytes) + authTag (16 bytes) + ciphertext
    const encryptedKeyLen = Buffer.alloc(2);
    encryptedKeyLen.writeUInt16BE(encryptedDataKey.length);

    const packed = Buffer.concat([
      encryptedKeyLen,
      Buffer.from(encryptedDataKey),
      iv,
      authTag,
      encrypted,
    ]);

    return packed.toString('base64');
  }

  /**
   * Decrypt a field value encrypted by encryptField().
   */
  async decryptField(ciphertext: string): Promise<string> {
    const packed = Buffer.from(ciphertext, 'base64');

    // Unpack
    const encryptedKeyLen = packed.readUInt16BE(0);
    let offset = 2;
    const encryptedDataKey = packed.subarray(offset, offset + encryptedKeyLen);
    offset += encryptedKeyLen;
    const iv = packed.subarray(offset, offset + 12);
    offset += 12;
    const authTag = packed.subarray(offset, offset + 16);
    offset += 16;
    const encrypted = packed.subarray(offset);

    // Decrypt the data key via KMS
    const { Plaintext: dataKey } = await this.kmsClient.send(new DecryptCommand({
      CiphertextBlob: encryptedDataKey,
    }));

    if (!dataKey) throw new Error('KMS data key decryption failed');

    // Decrypt the field value
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(dataKey), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Hash a value for lookups (e.g., find user by phone number
   * without decrypting every row). Uses HMAC-SHA256 with a stable key.
   */
  hashForLookup(value: string): string {
    const key = this.config.get('FIELD_HASH_KEY'); // 32-byte hex string, stored in AWS Secrets Manager
    const hmac = require('crypto').createHmac('sha256', Buffer.from(key, 'hex'));
    hmac.update(value);
    return hmac.digest('hex');
  }
}
```

### 21.3 Fields Requiring Encryption

| Field | Model | Encryption | Lookup Hash | Rationale |
|-------|-------|-----------|-------------|-----------|
| Phone number | User | AES-256-GCM | Yes (`phoneHash`) | PII, primary identifier |
| Email address | User | AES-256-GCM | Yes (`emailHash`) | PII |
| Aadhaar number | PatientProfile | AES-256-GCM | Yes (`aadhaarHash`) | Govt ID, highly sensitive |
| Patient address | PatientProfile | AES-256-GCM | No | PII, needed for delivery |
| Diagnosis codes | Consultation | AES-256-GCM | No | Clinical sensitivity |
| Treatment plan | Prescription.counselingNotes | AES-256-GCM | No | Clinical sensitivity |

**Fields NOT encrypted at application level** (protected by RDS encryption + RLS):
- Patient name — needed for display across portals, RLS-protected
- Questionnaire responses — JSONB, RLS-protected, doctor-only access
- AI assessment outputs — JSONB, RLS-protected, doctor-only access
- Medication names — needed for pharmacy operations, anonymized to partners

### 21.4 Prisma Schema: Encrypted Fields Pattern

```prisma
model User {
  id             String   @id @default(uuid())
  role           Role
  name           String
  
  // Encrypted fields — stored as base64 ciphertext
  phoneEncrypted String?  @map("phone_encrypted")
  emailEncrypted String?  @map("email_encrypted")
  
  // Lookup hashes — for querying without decryption
  phoneHash      String?  @unique @map("phone_hash")
  emailHash      String?  @unique @map("email_hash")
  
  // ... other fields
  
  @@index([phoneHash])
  @@index([emailHash])
}
```

```typescript
// Usage in auth.service.ts — finding user by phone
async findByPhone(phone: string): Promise<User | null> {
  const phoneHash = this.encryptionService.hashForLookup(phone);
  const user = await this.prisma.user.findUnique({ where: { phoneHash } });
  
  if (user) {
    // Decrypt phone for use in service logic
    user.phone = await this.encryptionService.decryptField(user.phoneEncrypted!);
  }
  
  return user;
}

// Usage in users.service.ts — creating user
async createUser(data: CreateUserInput): Promise<User> {
  return this.prisma.user.create({
    data: {
      ...data,
      phoneEncrypted: await this.encryptionService.encryptField(data.phone),
      phoneHash: this.encryptionService.hashForLookup(data.phone),
      emailEncrypted: data.email ? await this.encryptionService.encryptField(data.email) : null,
      emailHash: data.email ? this.encryptionService.hashForLookup(data.email) : null,
    },
  });
}
```

### 21.5 Consent Management

```prisma
// prisma/schema.prisma
model ConsentRecord {
  id                    String   @id @default(uuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id])
  
  purpose               ConsentPurpose
  granted               Boolean  @default(true)
  privacyNoticeVersion  String   // e.g., "1.0", "1.1" — must match current version
  grantedAt             DateTime @default(now())
  withdrawnAt           DateTime?
  withdrawalReason      String?
  
  // Metadata
  ipAddress             String?
  userAgent             String?
  collectionMethod      String   // 'app_onboarding', 'web_checkout', 'settings_page'
  
  createdAt             DateTime @default(now())
  
  @@index([userId, purpose])
  @@index([purpose, granted])
}

enum ConsentPurpose {
  TELECONSULTATION         // Core service — required for platform use
  PRESCRIPTION_PHARMACY    // Sharing prescription data with pharmacy partner
  LAB_PROCESSING          // Sharing lab order data with diagnostic centre
  HEALTH_DATA_ANALYTICS   // Anonymized analytics on treatment outcomes
  MARKETING_COMMUNICATIONS // Promotional messages via WhatsApp/email
  PHOTO_AI_PROCESSING     // Using patient photos for AI assessment
}
```

```typescript
// consent/consent.service.ts
@Injectable()
export class ConsentService {
  constructor(
    private prisma: PrismaClient,
    private auditService: AuditService,
  ) {}

  /**
   * Record a new consent grant. DPDPA requires:
   * - No pre-ticked boxes (consent must be affirmative action)
   * - No bundled consent (each purpose is separate)
   * - Clear description of what data is shared and why
   */
  async grantConsent(input: {
    userId: string;
    purpose: ConsentPurpose;
    privacyNoticeVersion: string;
    ipAddress?: string;
    userAgent?: string;
    collectionMethod: string;
  }): Promise<ConsentRecord> {
    // Check if already granted (idempotent)
    const existing = await this.prisma.consentRecord.findFirst({
      where: {
        userId: input.userId,
        purpose: input.purpose,
        granted: true,
        withdrawnAt: null,
      },
    });

    if (existing) return existing;

    const record = await this.prisma.consentRecord.create({ data: input });

    await this.auditService.log({
      userId: input.userId,
      action: 'consent.granted',
      resourceType: 'ConsentRecord',
      resourceId: record.id,
      ipAddress: input.ipAddress,
      changesJson: { purpose: input.purpose, version: input.privacyNoticeVersion },
    });

    return record;
  }

  /**
   * Withdraw consent. DPDPA Section 5(f) requires:
   * - Withdrawal must be as easy as granting
   * - Clear consequences stated before withdrawal is processed
   * - Withdrawal takes effect immediately
   */
  async withdrawConsent(input: {
    userId: string;
    purpose: ConsentPurpose;
    reason?: string;
    ipAddress?: string;
  }): Promise<{ consequences: string[] }> {
    const existing = await this.prisma.consentRecord.findFirst({
      where: {
        userId: input.userId,
        purpose: input.purpose,
        granted: true,
        withdrawnAt: null,
      },
    });

    if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'No active consent found for this purpose.' });

    // Determine consequences BEFORE processing withdrawal
    const consequences = this.getWithdrawalConsequences(input.purpose);

    await this.prisma.consentRecord.update({
      where: { id: existing.id },
      data: {
        withdrawnAt: new Date(),
        withdrawalReason: input.reason,
      },
    });

    await this.auditService.log({
      userId: input.userId,
      action: 'consent.withdrawn',
      resourceType: 'ConsentRecord',
      resourceId: existing.id,
      ipAddress: input.ipAddress,
      changesJson: { purpose: input.purpose, reason: input.reason },
    });

    // Trigger downstream effects
    await this.processWithdrawalEffects(input.userId, input.purpose);

    return { consequences };
  }

  private getWithdrawalConsequences(purpose: ConsentPurpose): string[] {
    const consequences: Record<ConsentPurpose, string[]> = {
      TELECONSULTATION: [
        'You will no longer be able to use the Onlyou platform for consultations.',
        'Existing prescriptions remain valid but no new consultations can be created.',
        'Your account will be deactivated after 30 days.',
      ],
      PRESCRIPTION_PHARMACY: [
        'Pharmacies will no longer receive your prescription details.',
        'You will need to arrange medication procurement independently.',
        'Active medication orders in progress will complete but no new orders can be placed.',
      ],
      LAB_PROCESSING: [
        'Diagnostic centres will no longer receive your lab order details.',
        'You can still self-upload lab results from external labs.',
        'Active lab orders in progress will complete but no new orders can be placed.',
      ],
      HEALTH_DATA_ANALYTICS: [
        'Your anonymized health data will no longer be used for research or analytics.',
        'This does not affect your ability to use the platform.',
      ],
      MARKETING_COMMUNICATIONS: [
        'You will no longer receive promotional messages.',
        'Transactional messages (appointment reminders, OTPs) are not affected.',
      ],
      PHOTO_AI_PROCESSING: [
        'Your photos will no longer be processed by AI for clinical assessment.',
        'Doctors will review your case manually, which may take longer.',
        'Existing AI assessments remain in your record.',
      ],
    };

    return consequences[purpose];
  }

  private async processWithdrawalEffects(userId: string, purpose: ConsentPurpose): Promise<void> {
    switch (purpose) {
      case 'TELECONSULTATION':
        // Schedule account deactivation in 30 days (BullMQ delayed job)
        // Don't deactivate immediately — active orders/prescriptions may be in progress
        break;
      case 'MARKETING_COMMUNICATIONS':
        // Update notification preferences to disable marketing
        await this.prisma.user.update({
          where: { id: userId },
          data: { notificationPreferences: { marketing: false } },
        });
        break;
      // Other purposes: downstream services check consent before processing
    }
  }

  /**
   * Check if a user has active consent for a specific purpose.
   * Called before any data-sharing operation (e.g., sending prescription to pharmacy).
   */
  async hasConsent(userId: string, purpose: ConsentPurpose): Promise<boolean> {
    const consent = await this.prisma.consentRecord.findFirst({
      where: {
        userId,
        purpose,
        granted: true,
        withdrawnAt: null,
      },
    });

    return !!consent;
  }

  /**
   * Get all active consents for a user (for the privacy settings screen).
   */
  async getActiveConsents(userId: string): Promise<ConsentRecord[]> {
    return this.prisma.consentRecord.findMany({
      where: { userId, granted: true, withdrawnAt: null },
      orderBy: { grantedAt: 'desc' },
    });
  }
}
```

### 21.6 Consent Required Per Operation

| Operation | Required Consent | Check Point |
|-----------|-----------------|-------------|
| Create consultation | `TELECONSULTATION` | consultation.service → create |
| Submit photos for AI analysis | `PHOTO_AI_PROCESSING` | ai-assessment.service → process |
| Send prescription to pharmacy | `PRESCRIPTION_PHARMACY` | orders.service → sendToPharmacy |
| Create lab order | `LAB_PROCESSING` | lab-orders.service → create |
| Send WhatsApp promotional | `MARKETING_COMMUNICATIONS` | notifications.service → send |
| Include data in analytics | `HEALTH_DATA_ANALYTICS` | analytics cron job → aggregate |

**Enforcement pattern:**
```typescript
// In any service that shares data with partners:
async sendToPharmacy(orderId: string): Promise<void> {
  const order = await this.prisma.order.findUnique({ where: { id: orderId } });
  
  // DPDPA consent check — BEFORE sharing data
  const hasConsent = await this.consentService.hasConsent(order.patientId, 'PRESCRIPTION_PHARMACY');
  if (!hasConsent) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Patient has not consented to sharing prescription data with pharmacy partners.',
    });
  }
  
  // Proceed with anonymized data sharing...
}
```

### 21.7 Partner Data Anonymization

```typescript
// privacy/anonymization.service.ts
@Injectable()
export class AnonymizationService {
  /**
   * Prepare order data for pharmacy portal — DPDPA data minimization.
   * Pharmacy sees ONLY what they need to dispense medication.
   */
  toPharmacyView(order: Order & { prescription: Prescription; patient: User }): PharmacyOrderView {
    return {
      orderId: order.displayId,                              // ORD-XXXX
      anonymousPatientId: `ONY-P-${order.patient.id.slice(0, 8)}`, // Pseudonymized
      medications: order.prescription.medications,            // Drug names, dosages, quantities
      prescriptionPdfUrl: order.prescription.pdfUrl,         // Signed URL (1-hour expiry)
      prescribingDoctor: {
        name: order.prescription.doctor.name,
        nmcNumber: order.prescription.doctor.nmcNumber,
      },
      // EXCLUDED: patient name, phone, address, diagnosis, condition, consultation details
    };
  }

  /**
   * Prepare lab order data for lab portal — DPDPA data minimization.
   * Lab sees ONLY what they need to process the sample.
   */
  toLabView(labOrder: LabOrder & { patient: User }): LabOrderView {
    return {
      sampleId: labOrder.displayId,                          // LAB-XXXX
      tests: labOrder.tests,                                 // Panel name + individual tests
      patientAge: this.calculateAge(labOrder.patient.dateOfBirth),
      patientGender: labOrder.patient.gender,                // Needed for reference ranges
      tubeCount: labOrder.expectedTubeCount,
      notes: labOrder.labNotes,                              // e.g., "fasting sample"
      // EXCLUDED: patient name, phone, address, diagnosis, condition, doctor name
    };
  }

  /**
   * Prepare nurse visit data — limited patient info for collection.
   */
  toNurseView(visit: NurseVisit & { patient: User; labOrder: LabOrder }): NurseVisitView {
    return {
      visitId: visit.id,
      patientFirstName: visit.patient.name.split(' ')[0],   // First name only for greeting
      patientPhone: visit.patient.phone,                     // Needed for calling/navigation
      address: visit.patient.address,                        // Needed for navigation
      preferredTimeSlot: visit.preferredTime,
      tests: visit.labOrder.tests,                           // Needed for tube preparation
      specialInstructions: visit.labOrder.collectionNotes,
      // EXCLUDED: last name, diagnosis, condition, AI assessment, prescription details
    };
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) age--;
    return age;
  }
}
```

### 21.8 Data Subject Rights (Patient Self-Service)

```typescript
// privacy/data-rights.service.ts
@Injectable()
export class DataRightsService {
  constructor(
    private prisma: PrismaClient,
    private encryptionService: EncryptionService,
    private auditService: AuditService,
    private storageService: StorageService,
  ) {}

  /**
   * Right to Access — DPDPA Section 11
   * Patient can request a copy of all their personal data.
   * Returned as a downloadable JSON file.
   */
  async generateDataExport(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: true,
        consultations: {
          include: {
            questionnaireResponse: true,
            photos: true,
            aiAssessment: true,
            prescription: true,
            messages: true,
          },
        },
        labOrders: true,
        orders: true,
        subscriptions: true,
        wallet: true,
        consentRecords: true,
      },
    });

    if (!user) throw new TRPCError({ code: 'NOT_FOUND' });

    // Decrypt encrypted fields for the export
    const exportData = {
      personalInfo: {
        name: user.name,
        phone: user.phoneEncrypted ? await this.encryptionService.decryptField(user.phoneEncrypted) : null,
        email: user.emailEncrypted ? await this.encryptionService.decryptField(user.emailEncrypted) : null,
        dateOfBirth: user.patientProfile?.dateOfBirth,
        gender: user.patientProfile?.gender,
        city: user.patientProfile?.city,
      },
      consents: user.consentRecords.map(c => ({
        purpose: c.purpose,
        granted: c.granted,
        grantedAt: c.grantedAt,
        withdrawnAt: c.withdrawnAt,
      })),
      consultations: user.consultations.map(c => ({
        condition: c.condition,
        status: c.status,
        createdAt: c.createdAt,
        questionnaireResponse: c.questionnaireResponse,
        aiAssessment: c.aiAssessment ? { severity: c.aiAssessment.severity, flags: c.aiAssessment.flags } : null,
        prescription: c.prescription ? { medications: c.prescription.medications, createdAt: c.prescription.createdAt } : null,
      })),
      labOrders: user.labOrders.map(l => ({
        tests: l.tests,
        status: l.status,
        createdAt: l.createdAt,
      })),
      medicationOrders: user.orders.map(o => ({
        status: o.status,
        createdAt: o.createdAt,
      })),
      subscriptions: user.subscriptions.map(s => ({
        vertical: s.verticalId,
        planType: s.planType,
        status: s.status,
        startDate: s.startDate,
        endDate: s.endDate,
      })),
      wallet: user.wallet ? { balance: user.wallet.balance } : null,
      exportGeneratedAt: new Date().toISOString(),
    };

    // Upload as JSON to S3 (temporary, 7-day expiry)
    const key = `data-exports/${userId}/${Date.now()}.json`;
    await this.storageService.putObject({
      bucket: 'onlyou-documents',
      key,
      body: JSON.stringify(exportData, null, 2),
      contentType: 'application/json',
    });

    await this.auditService.log({
      userId,
      action: 'privacy.data_export_generated',
      resourceType: 'DataExport',
      resourceId: key,
    });

    return this.storageService.getDownloadUrl(key, 'documents');
  }

  /**
   * Right to Erasure — DPDPA Section 12
   * Patient can request deletion of their data.
   * NOTE: Certain data must be retained per Telemedicine Practice Guidelines 2020
   * (medical records: 3 years, prescriptions: 3 years, audit logs: 3 years).
   * We soft-delete PII and retain anonymized clinical records.
   */
  async requestDataErasure(userId: string, reason: string): Promise<{
    erasedData: string[];
    retainedData: { type: string; reason: string; retentionPeriod: string }[];
  }> {
    // 1. Anonymize PII fields
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: '[REDACTED]',
        phoneEncrypted: null,
        phoneHash: `deleted_${userId}`, // Unique placeholder to maintain DB constraint
        emailEncrypted: null,
        emailHash: `deleted_${userId}`,
        isActive: false,
        deletedAt: new Date(),
      },
    });

    // 2. Delete patient profile PII
    await this.prisma.patientProfile.update({
      where: { userId },
      data: {
        address: null,
        aadhaarEncrypted: null,
        aadhaarHash: null,
        govIdUrl: null,
        city: '[REDACTED]',
      },
    });

    // 3. Delete photos from S3
    const photos = await this.prisma.photo.findMany({ where: { userId } });
    for (const photo of photos) {
      await this.storageService.deleteObject(photo.bucket, photo.s3Key);
    }
    await this.prisma.photo.deleteMany({ where: { userId } });

    // 4. Delete messages content (retain metadata for audit)
    await this.prisma.message.updateMany({
      where: { senderId: userId },
      data: { content: '[REDACTED]' },
    });

    // 5. Withdraw all consents
    await this.prisma.consentRecord.updateMany({
      where: { userId, withdrawnAt: null },
      data: { withdrawnAt: new Date(), withdrawalReason: 'data_erasure_request' },
    });

    await this.auditService.log({
      userId,
      action: 'privacy.data_erasure_processed',
      resourceType: 'User',
      resourceId: userId,
      changesJson: { reason },
    });

    return {
      erasedData: [
        'Personal information (name, phone, email, address, Aadhaar)',
        'Clinical photos',
        'Message content',
        'Consent records (withdrawn)',
      ],
      retainedData: [
        { type: 'Prescription records', reason: 'Telemedicine Practice Guidelines 2020', retentionPeriod: '3 years from creation' },
        { type: 'Consultation clinical data (anonymized)', reason: 'Telemedicine Practice Guidelines 2020', retentionPeriod: '3 years from creation' },
        { type: 'Audit logs', reason: 'DPDPA compliance + Telemedicine Practice Guidelines 2020', retentionPeriod: '3 years from creation' },
        { type: 'Payment records', reason: 'Income Tax Act / GST requirements', retentionPeriod: '7 years from financial year' },
      ],
    };
  }

  /**
   * Right to Correction — DPDPA Section 11
   * Patient can request correction of inaccurate data.
   */
  async requestDataCorrection(userId: string, corrections: {
    field: string;
    currentValue: string;
    correctedValue: string;
    reason: string;
  }[]): Promise<void> {
    // Corrections to clinical data (questionnaire responses, AI assessments)
    // are NOT allowed — data integrity requirement.
    // Corrections to personal data (name, DOB, address) are processed.

    const allowedFields = ['name', 'dateOfBirth', 'gender', 'city', 'address'];

    for (const correction of corrections) {
      if (!allowedFields.includes(correction.field)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Correction of '${correction.field}' is not supported. Clinical data cannot be modified for data integrity reasons.`,
        });
      }

      await this.auditService.log({
        userId,
        action: 'privacy.data_correction_requested',
        resourceType: 'User',
        resourceId: userId,
        changesJson: {
          field: correction.field,
          oldValue: correction.currentValue,
          newValue: correction.correctedValue,
          reason: correction.reason,
        },
      });
    }

    // Auto-approve personal data corrections (no admin review needed)
    // Clinical data corrections route to admin queue
  }
}
```

### 21.9 Audit Log Implementation

```prisma
// prisma/schema.prisma
model AuditLog {
  id           String   @id @default(uuid())
  userId       String?
  userRole     String?
  action       String   // Dotted notation: 'consultation.created', 'prescription.signed'
  resourceType String   // 'Consultation', 'Prescription', 'User', etc.
  resourceId   String?
  ipAddress    String?
  userAgent    String?
  changesJson  Json?    // { before: {...}, after: {...} } for modifications
  createdAt    DateTime @default(now())

  // INSERT-ONLY — database-level enforcement via PostgreSQL permissions
  // GRANT INSERT ON audit_log TO app_user;
  // REVOKE UPDATE, DELETE ON audit_log FROM app_user;

  @@index([action, createdAt(sort: Desc)])
  @@index([userId, createdAt(sort: Desc)])
  @@index([resourceType, resourceId])
  @@index([createdAt]) // For retention cleanup queries
}
```

```typescript
// audit/audit.service.ts
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaClient) {}

  async log(entry: {
    userId?: string;
    userRole?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    changesJson?: Record<string, any>;
  }): Promise<void> {
    // Fire-and-forget — audit logging should never block business logic
    this.prisma.auditLog.create({ data: entry }).catch((err) => {
      // Log to stderr if audit write fails (should never happen)
      console.error('[AUDIT_FAILURE]', err, entry);
    });
  }
}

// audit/audit.interceptor.ts — Auto-audit all mutations
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp().getRequest();
    const user = ctx.user;
    const startTime = Date.now();

    return next.handle().pipe(
      tap((result) => {
        // Only audit mutations (not queries)
        const procedureType = ctx.trpcProcedureType; // 'mutation' | 'query'
        if (procedureType === 'mutation') {
          this.auditService.log({
            userId: user?.id,
            userRole: user?.role,
            action: ctx.trpcPath, // e.g., 'consultation.updateStatus'
            resourceType: this.extractResourceType(ctx.trpcPath),
            resourceId: result?.id || ctx.trpcInput?.id,
            ipAddress: ctx.ip,
            userAgent: ctx.headers?.['user-agent'],
            changesJson: { input: ctx.trpcInput, duration: Date.now() - startTime },
          });
        }
      }),
    );
  }

  private extractResourceType(path: string): string {
    // 'consultation.updateStatus' → 'Consultation'
    const module = path.split('.')[0];
    return module.charAt(0).toUpperCase() + module.slice(1);
  }
}
```

### 21.10 Data Retention & Cleanup

```typescript
// jobs/data-retention.processor.ts
// Runs daily at 2:00 AM IST via BullMQ cron

@Processor('data-retention')
export class DataRetentionProcessor {
  constructor(private prisma: PrismaClient, private auditService: AuditService) {}

  @Process('cleanup')
  async handleCleanup(): Promise<void> {
    const now = new Date();

    // 1. Delete expired OTPs (Redis handles this via TTL, but clean DB records)
    // OTPs have 5-minute TTL — no DB storage needed

    // 2. Delete expired data export files from S3 (7-day expiry)
    // S3 lifecycle rule handles this — no application code needed

    // 3. Purge audit logs older than 3 years
    const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
    const { count } = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: threeYearsAgo } },
    });
    if (count > 0) {
      console.log(`[DATA_RETENTION] Purged ${count} audit logs older than 3 years`);
    }

    // 4. Delete soft-deleted user data older than 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const deletedUsers = await this.prisma.user.findMany({
      where: { deletedAt: { lt: thirtyDaysAgo, not: null } },
    });
    // Process final cleanup for each deleted user...

    // 5. Expire completed notification records older than 90 days
    await this.prisma.notification.deleteMany({
      where: {
        status: 'SENT',
        createdAt: { lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
      },
    });
  }
}
```

### 21.11 Data Breach Response

```typescript
// privacy/breach-response.ts

/**
 * DPDPA requires notification to the Data Protection Board within 72 hours
 * of becoming aware of a personal data breach.
 * 
 * This is a MANUAL process — not automated:
 * 1. Engineer detects breach (monitoring alert, log analysis, user report)
 * 2. Engineer runs breach assessment
 * 3. Founder reviews and decides on notification
 * 4. Template provided below for DPB notification
 * 
 * Store this in the codebase as reference — it's a runbook, not runtime code.
 */

export const BREACH_RESPONSE_RUNBOOK = {
  step1_detect: 'Monitor CloudWatch alarms, audit log anomalies, user reports',
  step2_contain: 'Revoke affected credentials, block suspicious IPs, rotate KMS keys if needed',
  step3_assess: {
    dataTypes: 'What personal data was exposed? (PII, health data, financial data)',
    affectedUsers: 'How many data principals are affected?',
    severity: 'Risk of harm to data principals?',
  },
  step4_notify: {
    dpb: 'Notify Data Protection Board within 72 hours (Form to be prescribed by DPDP Rules)',
    users: 'Notify affected users without unreasonable delay',
    template: 'Use breach notification template from legal counsel',
  },
  step5_remediate: 'Fix vulnerability, update security measures, update audit trail',
};
```

### 21.12 Row-Level Security (PostgreSQL)

```sql
-- migrations/20240101_row_level_security.sql

-- Enable RLS on sensitive tables
ALTER TABLE "Consultation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prescription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LabOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Photo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- Doctor can only see own assigned consultations
CREATE POLICY doctor_consultations ON "Consultation"
  FOR SELECT TO app_user
  USING (
    current_setting('app.current_user_role') = 'ADMIN'
    OR "doctorId" = current_setting('app.current_user_id')
    OR "patientId" = current_setting('app.current_user_id')
  );

-- Patient can only see own prescriptions
CREATE POLICY patient_prescriptions ON "Prescription"
  FOR SELECT TO app_user
  USING (
    current_setting('app.current_user_role') = 'ADMIN'
    OR current_setting('app.current_user_role') = 'DOCTOR'
    OR "patientId" = current_setting('app.current_user_id')
  );

-- Photos: only patient (owner) and assigned doctor
CREATE POLICY photo_access ON "Photo"
  FOR SELECT TO app_user
  USING (
    current_setting('app.current_user_role') = 'ADMIN'
    OR "userId" = current_setting('app.current_user_id')
    OR EXISTS (
      SELECT 1 FROM "Consultation" c
      WHERE c.id = "consultationId"
      AND c."doctorId" = current_setting('app.current_user_id')
    )
  );

-- Messages: only sender, receiver, or admin
CREATE POLICY message_access ON "Message"
  FOR SELECT TO app_user
  USING (
    current_setting('app.current_user_role') = 'ADMIN'
    OR "senderId" = current_setting('app.current_user_id')
    OR "receiverId" = current_setting('app.current_user_id')
  );
```

```typescript
// In Prisma query middleware — set RLS variables before each query
// prisma/rls.middleware.ts
export function rlsMiddleware(userId: string, userRole: string) {
  return async (params: any, next: any) => {
    // Set session variables for RLS policies
    await params.client.$executeRawUnsafe(
      `SET LOCAL app.current_user_id = '${userId}'; SET LOCAL app.current_user_role = '${userRole}';`
    );
    return next(params);
  };
}
```

---

## 22. Security Middleware, Guards & Interceptors

### 22.1 Global Middleware Stack

Applied to every request in order:

```typescript
// main.ts — Global middleware registration
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  // 1. Security headers (Helmet equivalent for Fastify)
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://*.cloudfront.net'],
        connectSrc: ["'self'", 'https://api.onlyou.life'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for CloudFront signed URLs
  });

  // 2. CORS
  app.enableCors({
    origin: [
      'https://doctor.onlyou.life',
      'https://admin.onlyou.life',
      'https://nurse.onlyou.life',
      'https://lab.onlyou.life',
      'https://pharmacy.onlyou.life',
      'https://onlyou.life',
      // Development
      ...(process.env.NODE_ENV === 'development' ? [
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:3004',
        'http://localhost:3005',
        'http://localhost:3006',
        'exp://localhost:8081',  // Expo dev client
      ] : []),
    ],
    credentials: true, // Required for httpOnly cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  // 3. Compression
  await app.register(fastifyCompress, {
    encodings: ['br', 'gzip'], // Brotli preferred, gzip fallback
    threshold: 1024,           // Only compress responses > 1KB
  });

  // 4. Rate limiting
  await app.register(fastifyRateLimit, {
    global: true,
    max: 100,                 // 100 requests per window
    timeWindow: '1 minute',
    keyGenerator: (req) => {
      // Rate limit by user ID if authenticated, IP otherwise
      return req.user?.id || req.ip;
    },
    // Specific endpoint overrides set via route decorators
  });

  // 5. Request ID propagation
  await app.register(fastifyRequestId);

  // 6. Body size limits
  app.useBodyParser('application/json', { bodyLimit: 10 * 1024 * 1024 }); // 10MB max

  // 7. Global pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // 8. Global interceptors
  app.useGlobalInterceptors(
    new RequestLoggingInterceptor(),
    new AuditInterceptor(app.get(AuditService)),
    new TimeoutInterceptor(30_000), // 30-second timeout
  );

  // 9. Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(3000, '0.0.0.0');
}
```

### 22.2 JWT Guard

```typescript
// auth/guards/jwt.guard.ts
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('No token provided');

    try {
      // 1. Verify JWT signature and expiration
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
        algorithms: ['RS256'],
      });

      // 2. Check blacklist (revoked tokens)
      const isBlacklisted = await this.redis.sismember('jwt:blacklist', payload.jti);
      if (isBlacklisted) throw new UnauthorizedException('Token has been revoked');

      // 3. Attach user to request
      request.user = {
        id: payload.sub,
        role: payload.role,
        jti: payload.jti,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: FastifyRequest): string | null {
    // Try Authorization header first (mobile app)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Try httpOnly cookie (web portals)
    return request.cookies?.access_token || null;
  }
}
```

### 22.3 Role Guard

```typescript
// auth/guards/roles.guard.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true; // No roles required, allow access

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new UnauthorizedException('Not authenticated');

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Role '${user.role}' does not have access to this resource`);
    }

    return true;
  }
}
```

### 22.4 CASL Ability Factory

```typescript
// auth/casl/casl-ability.factory.ts
import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';

export type AppAbility = MongoAbility;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: { id: string; role: Role }): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    switch (user.role) {
      case 'PATIENT':
        // Patients can only access their own data
        can('read', 'Consultation', { patientId: user.id });
        can('create', 'Consultation', { patientId: user.id });
        can('read', 'Prescription', { patientId: user.id });
        can('read', 'LabOrder', { patientId: user.id });
        can('read', 'Order', { patientId: user.id });
        can('manage', 'Message', { senderId: user.id });
        can('read', 'Message', { receiverId: user.id });
        can('manage', 'Photo', { userId: user.id });
        can('manage', 'Profile', { userId: user.id });
        can('read', 'Wallet', { userId: user.id });
        can('manage', 'ConsentRecord', { userId: user.id });
        break;

      case 'DOCTOR':
        // Doctors can only access assigned consultations
        can('read', 'Consultation', { doctorId: user.id });
        can('update', 'Consultation', { doctorId: user.id });
        can('create', 'Prescription', { doctorId: user.id });
        can('read', 'Prescription', { doctorId: user.id });
        can('create', 'LabOrder', { doctorId: user.id });
        can('read', 'LabOrder', { doctorId: user.id });
        can('manage', 'Message', { senderId: user.id });
        can('read', 'Message', { receiverId: user.id });
        // Doctors can read patient photos for assigned consultations only
        can('read', 'Photo'); // Filtered at query level by consultation assignment
        cannot('delete', 'Consultation'); // Cannot delete any clinical data
        cannot('update', 'AiAssessment'); // Cannot modify AI outputs
        break;

      case 'NURSE':
        can('read', 'NurseVisit', { nurseId: user.id });
        can('update', 'NurseVisit', { nurseId: user.id });
        can('read', 'LabOrder'); // Filtered at query level by assignment
        // Nurse sees limited patient data (first name, phone, address)
        cannot('read', 'Consultation'); // No clinical data access
        cannot('read', 'Prescription'); // No prescription access
        break;

      case 'LAB_TECH':
        can('read', 'LabOrder'); // Filtered by diagnosticCentreId
        can('update', 'LabOrder'); // Only status transitions allowed
        // Lab sees anonymized patient data (age, gender only)
        cannot('read', 'Consultation');
        cannot('read', 'Prescription');
        cannot('read', 'User'); // No patient profile access
        break;

      case 'PHARMACY_STAFF':
        can('read', 'Order'); // Filtered by pharmacyId
        can('update', 'Order'); // Only status transitions allowed
        can('read', 'Prescription'); // PDF access for dispensing
        // Pharmacy sees anonymized patient data (anonymous ID only)
        cannot('read', 'Consultation');
        cannot('read', 'User'); // No patient profile access
        break;

      case 'ADMIN':
        can('manage', 'all'); // Full access
        cannot('create', 'Prescription'); // Clinical action — doctor only
        cannot('update', 'AiAssessment'); // Clinical data integrity
        cannot('update', 'QuestionnaireResponse'); // Patient data integrity
        cannot('delete', 'AuditLog'); // Immutable audit trail
        break;
    }

    return build();
  }
}
```

### 22.5 CASL Policies Guard (tRPC integration)

```typescript
// auth/casl/policies.guard.ts
// Used as tRPC middleware to enforce CASL permissions

export function requireAbility(action: string, subject: string) {
  return t.middleware(async ({ ctx, next, rawInput }) => {
    const ability = ctx.ability; // Created in tRPC context from CaslAbilityFactory

    if (!ability.can(action, subject)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You do not have permission to ${action} ${subject}.`,
      });
    }

    return next();
  });
}

// Usage in router:
// consultation.getById: protectedProcedure
//   .use(requireAbility('read', 'Consultation'))
//   .input(z.object({ id: z.string().uuid() }))
//   .query(...)
```

### 22.6 Rate Limiting Per Endpoint

```typescript
// security/rate-limit.config.ts
export const RATE_LIMITS = {
  // Auth endpoints — strictest limits
  'auth.sendOtp': { max: 3, window: '15 minutes' },     // 3 OTP requests per phone per 15 min
  'auth.verifyOtp': { max: 5, window: '15 minutes' },    // 5 attempts per 15 min
  'auth.refreshToken': { max: 10, window: '1 minute' },  // 10 refreshes per minute

  // File uploads — moderate limits
  'storage.getPhotoUploadUrl': { max: 20, window: '10 minutes' },    // 20 photos per 10 min
  'storage.getLabResultUploadUrl': { max: 10, window: '10 minutes' }, // 10 uploads per 10 min

  // Write operations — moderate limits
  'consultation.create': { max: 5, window: '1 hour' },        // 5 consultations per hour
  'prescription.create': { max: 20, window: '1 hour' },       // 20 prescriptions per hour (doctor)
  'message.send': { max: 60, window: '1 minute' },            // 60 messages per minute

  // Read operations — generous limits
  'consultation.getById': { max: 200, window: '1 minute' },
  'consultation.list': { max: 100, window: '1 minute' },

  // Webhooks — no user-level rate limiting (Razorpay/Gupshup have their own)
  'webhook.*': { max: 1000, window: '1 minute' },
};

// tRPC middleware for per-procedure rate limiting
export function rateLimitMiddleware(procedurePath: string) {
  return t.middleware(async ({ ctx, next }) => {
    const config = RATE_LIMITS[procedurePath] || { max: 100, window: '1 minute' };
    const key = `ratelimit:${procedurePath}:${ctx.user?.id || ctx.ip}`;

    const current = await ctx.redis.incr(key);
    if (current === 1) {
      await ctx.redis.expire(key, parseWindow(config.window));
    }

    if (current > config.max) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Maximum ${config.max} requests per ${config.window}.`,
      });
    }

    return next();
  });
}
```

### 22.7 Phone Verification Guard

```typescript
// auth/guards/phone-verified.guard.ts
@Injectable()
export class PhoneVerifiedGuard implements CanActivate {
  constructor(private prisma: PrismaClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new UnauthorizedException('Not authenticated');

    // Skip check for non-patient roles (verified during account creation by admin)
    if (user.role !== 'PATIENT') return true;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { phoneVerified: true },
    });

    if (!dbUser?.phoneVerified) {
      throw new ForbiddenException('Phone number verification required before accessing this resource.');
    }

    return true;
  }
}
```

### 22.8 Request Logging Interceptor

```typescript
// interceptors/request-logging.interceptor.ts
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const startTime = Date.now();
    const requestId = request.id || randomUUID();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const response = context.switchToHttp().getResponse();

        this.logger.log({
          requestId,
          method: request.method,
          url: request.url,
          statusCode: response.statusCode,
          duration: `${duration}ms`,
          userId: request.user?.id || 'anonymous',
          userRole: request.user?.role,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          // Redact sensitive fields from body
          ...(duration > 3000 ? { slow: true } : {}),
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error({
          requestId,
          method: request.method,
          url: request.url,
          error: error.message,
          stack: error.stack,
          duration: `${duration}ms`,
          userId: request.user?.id || 'anonymous',
        });
        throw error;
      }),
    );
  }
}
```

### 22.9 Timeout Interceptor

```typescript
// interceptors/timeout.interceptor.ts
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutMs: number = 30_000) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          throw new RequestTimeoutException(
            `Request timed out after ${this.timeoutMs / 1000} seconds. Please try again.`
          );
        }
        throw err;
      }),
    );
  }
}
```

### 22.10 Webhook Signature Verification

```typescript
// rest/guards/webhook-signature.guard.ts

// Razorpay webhook signature verification
@Injectable()
export class RazorpayWebhookGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const signature = request.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(request.body);
    const secret = this.config.get('RAZORPAY_WEBHOOK_SECRET');

    const expectedSignature = createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid Razorpay webhook signature');
    }

    return true;
  }
}

// Gupshup webhook signature verification
@Injectable()
export class GupshupWebhookGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const apiKey = request.headers['x-gupshup-apikey'] as string;

    if (apiKey !== this.config.get('GUPSHUP_WEBHOOK_API_KEY')) {
      throw new UnauthorizedException('Invalid Gupshup webhook API key');
    }

    return true;
  }
}
```

### 22.11 Security Headers Summary

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS for 2 years |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `0` | Disable legacy XSS filter (CSP handles this) |
| `Content-Security-Policy` | See §22.1 | Prevent XSS, injection attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused browser APIs |
| `X-Request-Id` | `<uuid>` | Request tracing through ALB → Fargate → logs |

---

## 23. Error Handling & Exception Filters

### 23.1 Global Exception Filter

```typescript
// filters/global-exception.filter.ts
import { Catch, ExceptionFilter, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const { statusCode, errorResponse } = this.normalizeException(exception);

    // Log full error details (never expose to client)
    this.logger.error({
      requestId: request.id,
      path: request.url,
      method: request.method,
      userId: (request as any).user?.id,
      statusCode,
      error: errorResponse.message,
      stack: exception instanceof Error ? exception.stack : undefined,
      // Prisma-specific debugging
      ...(exception instanceof PrismaClientKnownRequestError ? {
        prismaCode: exception.code,
        prismaMeta: exception.meta,
      } : {}),
    });

    response.status(statusCode).send(errorResponse);
  }

  private normalizeException(exception: unknown): {
    statusCode: number;
    errorResponse: { message: string; code: string; details?: any };
  } {
    // 1. NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      return {
        statusCode: exception.getStatus(),
        errorResponse: {
          message: typeof response === 'string' ? response : (response as any).message,
          code: this.httpStatusToCode(exception.getStatus()),
        },
      };
    }

    // 2. tRPC errors (from tRPC procedures)
    if (exception instanceof TRPCError) {
      const statusCode = this.trpcCodeToHttpStatus(exception.code);
      return {
        statusCode,
        errorResponse: {
          message: exception.message,
          code: exception.code,
        },
      };
    }

    // 3. Prisma errors
    if (exception instanceof PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception);
    }

    if (exception instanceof PrismaClientValidationError) {
      return {
        statusCode: 400,
        errorResponse: {
          message: 'Invalid data provided.',
          code: 'BAD_REQUEST',
        },
      };
    }

    // 4. Zod validation errors
    if (exception instanceof Error && exception.name === 'ZodError') {
      return {
        statusCode: 400,
        errorResponse: {
          message: 'Validation failed.',
          code: 'BAD_REQUEST',
          details: (exception as any).issues?.map((i: any) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      };
    }

    // 5. Unknown errors — NEVER expose internals
    return {
      statusCode: 500,
      errorResponse: {
        message: 'An unexpected error occurred. Please try again.',
        code: 'INTERNAL_SERVER_ERROR',
      },
    };
  }

  private handlePrismaError(error: PrismaClientKnownRequestError): {
    statusCode: number;
    errorResponse: { message: string; code: string };
  } {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        const field = (error.meta?.target as string[])?.join(', ') || 'field';
        return {
          statusCode: 409,
          errorResponse: {
            message: `A record with this ${field} already exists.`,
            code: 'CONFLICT',
          },
        };

      case 'P2025': // Record not found
        return {
          statusCode: 404,
          errorResponse: {
            message: 'The requested record was not found.',
            code: 'NOT_FOUND',
          },
        };

      case 'P2003': // Foreign key constraint
        return {
          statusCode: 400,
          errorResponse: {
            message: 'Referenced record does not exist.',
            code: 'BAD_REQUEST',
          },
        };

      default:
        return {
          statusCode: 500,
          errorResponse: {
            message: 'A database error occurred. Please try again.',
            code: 'INTERNAL_SERVER_ERROR',
          },
        };
    }
  }

  private trpcCodeToHttpStatus(code: string): number {
    const map: Record<string, number> = {
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      TOO_MANY_REQUESTS: 429,
      INTERNAL_SERVER_ERROR: 500,
      TIMEOUT: 408,
      PRECONDITION_FAILED: 412,
    };
    return map[code] || 500;
  }

  private httpStatusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      408: 'TIMEOUT',
      409: 'CONFLICT',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] || 'UNKNOWN_ERROR';
  }
}
```

### 23.2 tRPC Error Handler

```typescript
// trpc/error-handler.ts
// Custom tRPC error formatter that sanitizes errors before sending to client

export const errorFormatter = ({ shape, error }: { shape: any; error: TRPCError }) => {
  return {
    ...shape,
    data: {
      ...shape.data,
      // Include Zod validation details for BAD_REQUEST
      zodError: error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
        ? error.cause.flatten()
        : null,
      // NEVER include stack traces in production
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
  };
};
```

### 23.3 Business Logic Error Classes

```typescript
// errors/business-errors.ts

/** Thrown when a status transition is invalid (e.g., DELIVERED → PREPARING) */
export class InvalidStatusTransitionError extends TRPCError {
  constructor(resource: string, currentStatus: string, targetStatus: string) {
    super({
      code: 'BAD_REQUEST',
      message: `Cannot transition ${resource} from '${currentStatus}' to '${targetStatus}'.`,
    });
  }
}

/** Thrown when a clinical action violates medical rules */
export class ClinicalValidationError extends TRPCError {
  constructor(message: string) {
    super({ code: 'BAD_REQUEST', message });
  }
}

/** Thrown when consent is missing for a data-sharing operation */
export class ConsentRequiredError extends TRPCError {
  constructor(purpose: string) {
    super({
      code: 'FORBIDDEN',
      message: `Patient consent for '${purpose}' is required for this operation.`,
    });
  }
}

/** Thrown when a Razorpay operation fails */
export class PaymentError extends TRPCError {
  constructor(message: string, razorpayError?: any) {
    super({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Payment processing failed: ${message}`,
      cause: razorpayError,
    });
  }
}

/** Thrown when a partner (pharmacy/lab) is unavailable */
export class PartnerUnavailableError extends TRPCError {
  constructor(partnerType: string, partnerId: string) {
    super({
      code: 'PRECONDITION_FAILED',
      message: `${partnerType} partner is currently unavailable. Please try again or select a different partner.`,
    });
  }
}
```

### 23.4 Client-Facing Error Response Format

Every error response follows this consistent format across tRPC and REST:

```typescript
// For tRPC responses (wrapped by tRPC automatically):
{
  error: {
    message: "Human-readable error message",
    data: {
      code: "BAD_REQUEST",           // tRPC error code
      httpStatus: 400,               // HTTP status equivalent
      zodError: null | {             // Only for validation errors
        fieldErrors: {
          "email": ["Invalid email format"],
          "phone": ["Phone number is required"]
        }
      }
    }
  }
}

// For REST webhook responses (Razorpay/Gupshup):
{
  message: "Human-readable error message",
  code: "BAD_REQUEST",
  details: [...]                     // Optional validation details
}
```

---

## 24. Caching Strategy (Redis)

### 24.1 Redis Architecture

Single Redis 7 instance on ElastiCache Mumbai (t3.micro for MVP, t3.small at Stage 2). Six logical "namespaces" separated by key prefix:

```
Redis ElastiCache (ap-south-1)
├── session:*          → Refresh token sessions (7-day TTL)
├── otp:*              → OTP codes (5-minute TTL)
├── jwt:blacklist      → Revoked JTI set (TTL = remaining access token life)
├── cache:*            → Application data cache (variable TTL)
├── sse:*              → SSE Pub/Sub channels (no persistence)
└── bull:*             → BullMQ job queues (managed by BullMQ)
```

### 24.2 Cache Key Schema

```typescript
// cache/cache-keys.ts
export const CacheKeys = {
  // Session management
  refreshToken: (tokenId: string) => `session:refresh:${tokenId}`,
  userSessions: (userId: string) => `session:user:${userId}`,

  // OTP
  otp: (phone: string) => `otp:${phone}`,
  otpAttempts: (phone: string) => `otp:attempts:${phone}`,
  otpRateLimit: (phone: string) => `otp:ratelimit:${phone}`,

  // JWT blacklist
  jwtBlacklist: 'jwt:blacklist',

  // Application cache
  userProfile: (userId: string) => `cache:user:${userId}`,
  doctorCaseload: (doctorId: string) => `cache:doctor:caseload:${doctorId}`,
  consultationDetail: (id: string) => `cache:consultation:${id}`,
  subscriptionPlans: 'cache:subscription:plans',
  medicationCatalog: (vertical: string) => `cache:medications:${vertical}`,
  questionnaire: (vertical: string) => `cache:questionnaire:${vertical}`,
  featureFlags: 'cache:feature:flags',
  slaConfig: 'cache:sla:config',
  adminDashboard: 'cache:admin:dashboard',
  pharmacyList: 'cache:partners:pharmacies',
  labList: 'cache:partners:labs',
  clinicList: 'cache:partners:clinics',

  // Rate limiting
  rateLimit: (procedure: string, identifier: string) => `ratelimit:${procedure}:${identifier}`,

  // SSE Pub/Sub channels
  ssePatient: (userId: string) => `sse:patient:${userId}`,
  sseDoctor: (doctorId: string) => `sse:doctor:${doctorId}`,
  sseAdmin: 'sse:admin',
  sseNurse: (nurseId: string) => `sse:nurse:${nurseId}`,
  sseLab: (centreId: string) => `sse:lab:${centreId}`,
  ssePharmacy: (pharmacyId: string) => `sse:pharmacy:${pharmacyId}`,
};
```

### 24.3 TTL Strategy

| Cache Key | TTL | Invalidation Trigger | Rationale |
|-----------|-----|---------------------|-----------|
| `session:refresh:*` | 7 days | Logout, token rotation, theft detection | Refresh token lifetime |
| `otp:*` | 5 minutes | Successful verification | DPDPA: minimize PII retention |
| `otp:attempts:*` | 15 minutes | Successful verification | Reset on success |
| `otp:ratelimit:*` | 15 minutes | Auto-expire | 3 OTPs per 15 min |
| `jwt:blacklist` | 15 minutes (per entry) | Auto-expire | Access token lifetime (15 min) |
| `cache:user:*` | 30 minutes | Profile update, role change | Low-change, frequently read |
| `cache:doctor:caseload:*` | 5 minutes | New case assigned, case status change | Changes with each assignment |
| `cache:consultation:*` | 10 minutes | Status change, message added | Active consultations change often |
| `cache:subscription:plans` | 1 hour | Admin pricing update | Rarely changes |
| `cache:medications:*` | 1 hour | Admin medication catalog update | Rarely changes |
| `cache:questionnaire:*` | 1 hour | Admin questionnaire update | Rarely changes |
| `cache:feature:flags` | 5 minutes | Admin flag toggle | Short TTL for quick propagation |
| `cache:sla:config` | 5 minutes | Admin SLA threshold update | Short TTL for quick propagation |
| `cache:admin:dashboard` | 2 minutes | Any system event | Frequently read, data changes constantly |
| `cache:partners:*` | 15 minutes | Partner created/updated/deactivated | Moderate change frequency |
| `ratelimit:*` | Varies (per config) | Auto-expire | Per §22.6 |

### 24.4 Cache Service

```typescript
// cache/cache.service.ts
@Injectable()
export class CacheService {
  constructor(private redis: RedisService) {}

  /**
   * Get cached value with automatic deserialization.
   * Returns null on cache miss (not an error).
   */
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  }

  /**
   * Set cached value with TTL in seconds.
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  /**
   * Delete a specific cache key (explicit invalidation).
   */
  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Delete all keys matching a pattern (e.g., invalidate all user caches).
   * Uses SCAN to avoid blocking Redis.
   */
  async deletePattern(pattern: string): Promise<number> {
    let cursor = '0';
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.redis.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');

    return deletedCount;
  }

  /**
   * Cache-aside pattern: get from cache, or compute and cache.
   */
  async getOrSet<T>(key: string, ttlSeconds: number, computeFn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await computeFn();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
```

### 24.5 Cache Invalidation Patterns

```typescript
// Example: Invalidate consultation cache when status changes
// In consultation.service.ts:
async updateStatus(consultationId: string, newStatus: string): Promise<void> {
  await this.prisma.consultation.update({
    where: { id: consultationId },
    data: { status: newStatus },
  });

  // Invalidate specific consultation cache
  await this.cacheService.delete(CacheKeys.consultationDetail(consultationId));

  // Invalidate doctor's caseload cache (list of active cases)
  const consultation = await this.prisma.consultation.findUnique({
    where: { id: consultationId },
    select: { doctorId: true },
  });
  if (consultation?.doctorId) {
    await this.cacheService.delete(CacheKeys.doctorCaseload(consultation.doctorId));
  }

  // Invalidate admin dashboard cache
  await this.cacheService.delete(CacheKeys.adminDashboard);
}

// Example: Invalidate partner cache when admin updates partner
// In admin.service.ts:
async updatePartner(partnerId: string, updates: any): Promise<void> {
  const partner = await this.prisma.pharmacy.update({ where: { id: partnerId }, data: updates });
  await this.cacheService.delete(CacheKeys.pharmacyList);
}
```

### 24.6 What NOT to Cache

| Data | Reason |
|------|--------|
| Prescription PDFs | Served via CloudFront signed URLs (CDN-level caching) |
| Patient photos | Served via CloudFront signed URLs (CDN-level caching) |
| Lab result PDFs | Served via CloudFront signed URLs (CDN-level caching) |
| Message content | Real-time via SSE, no caching benefit |
| Payment status | Must be real-time from Razorpay (webhook-driven) |
| Audit logs | Append-only, queried infrequently by admin |
| OTP codes (beyond Redis) | Only in Redis with 5-min TTL, never in app memory |

---

## 25. Database Migrations & Seed Data

### 25.1 Prisma Migration Workflow

```bash
# Development: Create a new migration from schema changes
pnpm --filter api prisma migrate dev --name add_consent_records

# This does 3 things:
# 1. Generates SQL migration file in prisma/migrations/
# 2. Applies the migration to local dev database
# 3. Regenerates Prisma Client types

# Production: Apply pending migrations (CI/CD pipeline)
pnpm --filter api prisma migrate deploy

# This does:
# 1. Applies all pending migrations in order
# 2. Does NOT regenerate client (already built)
# 3. Fails if any migration cannot be applied (rolls back transaction)

# Reset dev database (destructive — development only)
pnpm --filter api prisma migrate reset
# Drops database → recreates → applies all migrations → runs seed script
```

### 25.2 Migration Naming Convention

```
prisma/migrations/
├── 20240101000000_initial_schema/
│   └── migration.sql
├── 20240115000000_add_consent_records/
│   └── migration.sql
├── 20240120000000_add_nurse_visit_vitals/
│   └── migration.sql
├── 20240201000000_add_wallet_transactions/
│   └── migration.sql
├── 20240215000000_add_row_level_security/
│   └── migration.sql
└── 20240301000000_add_field_level_encryption/
    └── migration.sql
```

**Naming rules:**
- Timestamp prefix: `YYYYMMDDHHMMSS`
- Descriptive name: `add_`, `update_`, `remove_`, `create_`, `alter_`
- Snake_case: `add_consent_records`, not `addConsentRecords`
- One logical change per migration (don't combine unrelated changes)

### 25.3 Custom SQL Migrations

Some operations require custom SQL that Prisma can't generate:

```sql
-- prisma/migrations/20240215000000_add_row_level_security/migration.sql

-- Enable RLS on sensitive tables
ALTER TABLE "Consultation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prescription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LabOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Photo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- Create application database user (not the migration user)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user WITH LOGIN PASSWORD 'changeme_in_production';
  END IF;
END
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- Audit log: INSERT only
REVOKE UPDATE, DELETE ON "AuditLog" FROM app_user;
GRANT INSERT ON "AuditLog" TO app_user;

-- RLS policies (see §21.12 for full policies)
CREATE POLICY doctor_consultations ON "Consultation"
  FOR SELECT TO app_user
  USING (
    current_setting('app.current_user_role', true) = 'ADMIN'
    OR "doctorId" = current_setting('app.current_user_id', true)
    OR "patientId" = current_setting('app.current_user_id', true)
  );

-- Enable pgAudit extension
CREATE EXTENSION IF NOT EXISTS pgaudit;
SET pgaudit.log = 'write, ddl';  -- Log all write operations and DDL changes
```

```sql
-- prisma/migrations/20240301000000_add_field_level_encryption/migration.sql

-- Add encrypted columns alongside existing ones
ALTER TABLE "User" ADD COLUMN "phone_encrypted" TEXT;
ALTER TABLE "User" ADD COLUMN "phone_hash" TEXT UNIQUE;
ALTER TABLE "User" ADD COLUMN "email_encrypted" TEXT;
ALTER TABLE "User" ADD COLUMN "email_hash" TEXT UNIQUE;

ALTER TABLE "PatientProfile" ADD COLUMN "aadhaar_encrypted" TEXT;
ALTER TABLE "PatientProfile" ADD COLUMN "aadhaar_hash" TEXT UNIQUE;

-- Create indexes on hash columns for lookups
CREATE INDEX idx_user_phone_hash ON "User" ("phone_hash");
CREATE INDEX idx_user_email_hash ON "User" ("email_hash");
CREATE INDEX idx_patient_aadhaar_hash ON "PatientProfile" ("aadhaar_hash");

-- NOTE: Data migration (encrypting existing plaintext data) must be done
-- via a one-time script AFTER this migration runs. See seed script.
```

### 25.4 Seed Data Script

```typescript
// prisma/seed.ts
import { PrismaClient, Role, Condition, ConsultationStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── 1. ADMIN USER ───
  const admin = await prisma.user.upsert({
    where: { phoneHash: hashForLookup('+919999900003') },
    update: {},
    create: {
      role: 'ADMIN',
      name: 'Onlyou Admin',
      phoneEncrypted: await encryptField('+919999900003'),
      phoneHash: hashForLookup('+919999900003'),
      emailEncrypted: await encryptField('admin@test.onlyou.life'),
      emailHash: hashForLookup('admin@test.onlyou.life'),
      phoneVerified: true,
      isActive: true,
    },
  });
  console.log(`  ✅ Admin: ${admin.id}`);

  // ─── 2. DOCTOR ───
  const doctor = await prisma.user.upsert({
    where: { phoneHash: hashForLookup('+919999900002') },
    update: {},
    create: {
      role: 'DOCTOR',
      name: 'Dr. Priya Sharma',
      phoneEncrypted: await encryptField('+919999900002'),
      phoneHash: hashForLookup('+919999900002'),
      emailEncrypted: await encryptField('doctor@test.onlyou.life'),
      emailHash: hashForLookup('doctor@test.onlyou.life'),
      phoneVerified: true,
      isActive: true,
    },
  });

  await prisma.doctorProfile.upsert({
    where: { userId: doctor.id },
    update: {},
    create: {
      userId: doctor.id,
      nmcNumber: 'NMC-TEST-12345',
      specializations: ['DERMATOLOGY', 'TRICHOLOGY'],
      qualifications: 'MBBS, MD (Dermatology)',
      yearsOfExperience: 8,
      consultationFeePerCase: 0, // Paid by platform, not per-case
    },
  });
  console.log(`  ✅ Doctor: ${doctor.id}`);

  // ─── 3. PATIENT ───
  const patient = await prisma.user.upsert({
    where: { phoneHash: hashForLookup('+919999900001') },
    update: {},
    create: {
      role: 'PATIENT',
      name: 'Rahul Test',
      phoneEncrypted: await encryptField('+919999900001'),
      phoneHash: hashForLookup('+919999900001'),
      emailEncrypted: await encryptField('patient@test.onlyou.life'),
      emailHash: hashForLookup('patient@test.onlyou.life'),
      phoneVerified: true,
      isActive: true,
    },
  });

  await prisma.patientProfile.upsert({
    where: { userId: patient.id },
    update: {},
    create: {
      userId: patient.id,
      dateOfBirth: new Date('1995-03-15'),
      gender: 'MALE',
      city: 'Bangalore',
    },
  });
  console.log(`  ✅ Patient: ${patient.id}`);

  // ─── 4. NURSE ───
  const nurse = await prisma.user.upsert({
    where: { phoneHash: hashForLookup('+919999900004') },
    update: {},
    create: {
      role: 'NURSE',
      name: 'Anita Nurse',
      phoneEncrypted: await encryptField('+919999900004'),
      phoneHash: hashForLookup('+919999900004'),
      phoneVerified: true,
      isActive: true,
    },
  });

  await prisma.nurseProfile.upsert({
    where: { userId: nurse.id },
    update: {},
    create: {
      userId: nurse.id,
      gender: 'FEMALE',
      qualification: 'BSC_NURSING',
      certificationNumber: 'KA-NURSE-TEST-001',
      availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      availableTimeStart: '08:00',
      availableTimeEnd: '17:00',
      maxDailyVisits: 8,
      currentCity: 'Bangalore',
      serviceableAreas: ['Koramangala', 'HSR Layout', 'Indiranagar', 'Whitefield'],
      canAdministerInjections: false,
    },
  });
  console.log(`  ✅ Nurse: ${nurse.id}`);

  // ─── 5. DIAGNOSTIC CENTRE + LAB STAFF ───
  const lab = await prisma.diagnosticCentre.upsert({
    where: { id: 'test-lab-001' },
    update: {},
    create: {
      id: 'test-lab-001',
      name: 'PathLab Plus',
      city: 'Bangalore',
      address: 'MG Road, Bangalore',
      contactPhone: '+919999900010',
      contactEmail: 'lab@pathlab-test.com',
      operatingHours: { weekdays: '07:00-20:00', weekends: '08:00-14:00' },
      isActive: true,
    },
  });

  const labStaff = await prisma.user.upsert({
    where: { phoneHash: hashForLookup('+919999900005') },
    update: {},
    create: {
      role: 'LAB_TECH',
      name: 'Lab Tech Test',
      phoneEncrypted: await encryptField('+919999900005'),
      phoneHash: hashForLookup('+919999900005'),
      phoneVerified: true,
      isActive: true,
      diagnosticCentreId: lab.id,
    },
  });
  console.log(`  ✅ Lab: ${lab.id}, Staff: ${labStaff.id}`);

  // ─── 6. PHARMACY + PHARMACY STAFF ───
  const pharmacy = await prisma.pharmacy.upsert({
    where: { id: 'test-pharmacy-001' },
    update: {},
    create: {
      id: 'test-pharmacy-001',
      name: 'MedPlus Pharmacy',
      city: 'Bangalore',
      address: 'MG Road, Bangalore',
      contactPhone: '+919999900011',
      contactEmail: 'pharmacy@medplus-test.com',
      drugLicenseNumber: 'DL-KA-TEST-001',
      operatingHours: { weekdays: '09:00-21:00', weekends: '09:00-15:00' },
      isActive: true,
    },
  });

  const pharmacyStaff = await prisma.user.upsert({
    where: { phoneHash: hashForLookup('+919999900006') },
    update: {},
    create: {
      role: 'PHARMACY_STAFF',
      name: 'Pharmacy Staff Test',
      phoneEncrypted: await encryptField('+919999900006'),
      phoneHash: hashForLookup('+919999900006'),
      phoneVerified: true,
      isActive: true,
      pharmacyId: pharmacy.id,
    },
  });
  console.log(`  ✅ Pharmacy: ${pharmacy.id}, Staff: ${pharmacyStaff.id}`);

  // ─── 7. REFERRAL CLINIC ───
  await prisma.referralClinic.upsert({
    where: { id: 'test-clinic-001' },
    update: {},
    create: {
      id: 'test-clinic-001',
      name: 'Skin & Hair Clinic',
      city: 'Bangalore',
      address: 'Koramangala, Bangalore',
      specialization: 'Dermatology',
      contactPhone: '+919999900012',
      isActive: true,
    },
  });

  // ─── 8. SAMPLE CONSULTATION (Hair Loss) ───
  const consultation = await prisma.consultation.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      condition: 'HAIR_LOSS',
      status: 'PRESCRIPTION_CREATED',
      displayId: 'CONS-TEST-001',
      questionnaireResponse: {
        create: {
          vertical: 'HAIR_LOSS',
          responses: {
            duration: '6-12 months',
            pattern: 'receding_hairline',
            familyHistory: true,
            previousTreatments: ['minoxidil_topical'],
            stress: 'moderate',
          },
        },
      },
      aiAssessment: {
        create: {
          vertical: 'HAIR_LOSS',
          severity: 'MODERATE',
          flags: ['ANDROGENETIC_ALOPECIA_LIKELY'],
          suggestedActions: ['prescription_finasteride', 'topical_minoxidil', 'lab_panel_thyroid'],
          confidence: 0.87,
          rawOutput: {},
        },
      },
    },
  });
  console.log(`  ✅ Consultation: ${consultation.id}`);

  // ─── 9. SAMPLE PRESCRIPTION ───
  const prescription = await prisma.prescription.create({
    data: {
      consultationId: consultation.id,
      doctorId: doctor.id,
      patientId: patient.id,
      displayId: 'RX-TEST-001',
      medications: [
        {
          drug: 'Finasteride',
          dosage: '1mg',
          frequency: 'Once daily',
          duration: '3 months',
          instructions: 'Take at bedtime. Do not crush or chew.',
        },
        {
          drug: 'Minoxidil 5% Solution',
          dosage: '1ml',
          frequency: 'Twice daily (morning and night)',
          duration: '3 months',
          instructions: 'Apply to dry scalp. Allow to dry for 20 minutes before sleeping.',
        },
      ],
      counselingNotes: 'Patient counseled on expected timeline (3-6 months for visible results). Discussed potential side effects.',
      status: 'SIGNED',
      pdfUrl: 'prescriptions/test/rx-test-001.pdf', // Placeholder S3 key
    },
  });
  console.log(`  ✅ Prescription: ${prescription.id}`);

  // ─── 10. SAMPLE LAB ORDER ───
  const labOrder = await prisma.labOrder.create({
    data: {
      consultationId: consultation.id,
      patientId: patient.id,
      doctorId: doctor.id,
      displayId: 'LAB-TEST-001',
      tests: {
        panelName: 'Hair Loss Panel',
        tests: ['TSH', 'Free T4', 'Ferritin', 'Vitamin D', 'CBC'],
      },
      status: 'ORDERED',
      selfUploaded: false,
    },
  });
  console.log(`  ✅ Lab Order: ${labOrder.id}`);

  // ─── 11. SAMPLE MEDICATION ORDER ───
  const order = await prisma.order.create({
    data: {
      prescriptionId: prescription.id,
      patientId: patient.id,
      pharmacyId: pharmacy.id,
      displayId: 'ORD-TEST-001',
      status: 'SENT_TO_PHARMACY',
    },
  });
  console.log(`  ✅ Order: ${order.id}`);

  // ─── 12. PATIENT CONSENT RECORDS ───
  const consentPurposes: ConsentPurpose[] = [
    'TELECONSULTATION',
    'PRESCRIPTION_PHARMACY',
    'LAB_PROCESSING',
    'PHOTO_AI_PROCESSING',
  ];

  for (const purpose of consentPurposes) {
    await prisma.consentRecord.create({
      data: {
        userId: patient.id,
        purpose,
        granted: true,
        privacyNoticeVersion: '1.0',
        collectionMethod: 'app_onboarding',
      },
    });
  }
  console.log(`  ✅ Consent records created`);

  // ─── 13. SUBSCRIPTION PLANS (System Config) ───
  await prisma.systemConfig.upsert({
    where: { key: 'subscription_plans' },
    update: {},
    create: {
      key: 'subscription_plans',
      value: {
        HAIR_LOSS: {
          monthly: { price: 599, currency: 'INR' },
          quarterly: { price: 1499, currency: 'INR' },
          biannual: { price: 2699, currency: 'INR' },
        },
        ERECTILE_DYSFUNCTION: {
          monthly: { price: 799, currency: 'INR' },
          quarterly: { price: 1999, currency: 'INR' },
          biannual: { price: 3599, currency: 'INR' },
        },
        PREMATURE_EJACULATION: {
          monthly: { price: 799, currency: 'INR' },
          quarterly: { price: 1999, currency: 'INR' },
          biannual: { price: 3599, currency: 'INR' },
        },
        WEIGHT_MANAGEMENT: {
          standard: {
            monthly: { price: 2999, currency: 'INR' },
            quarterly: { price: 7999, currency: 'INR' },
            biannual: { price: 14999, currency: 'INR' },
          },
          glp1: {
            monthly: { price: 8999, currency: 'INR' },
            quarterly: { price: 24999, currency: 'INR' },
            biannual: { price: 44999, currency: 'INR' },
          },
        },
        PCOS: {
          monthly: { price: 799, currency: 'INR' },
          quarterly: { price: 1999, currency: 'INR' },
          biannual: { price: 3599, currency: 'INR' },
        },
      },
    },
  });
  console.log(`  ✅ Subscription plans configured`);

  // ─── 14. FEATURE FLAGS ───
  await prisma.systemConfig.upsert({
    where: { key: 'feature_flags' },
    update: {},
    create: {
      key: 'feature_flags',
      value: {
        VIDEO_CONSULTATION_ENABLED: false,
        PCOS_VERTICAL_ENABLED: false,
        REFERRAL_BONUS_ENABLED: false,
        SELF_UPLOAD_LAB_RESULTS: true,
        DISCREET_MODE_AVAILABLE: true,
        AUTO_REORDER_ENABLED: true,
        WALLET_AT_CHECKOUT: true,
        PROMO_CODES_ENABLED: true,
        PHOTO_OPTIMIZATION_LAMBDA: false,
        BULK_ACTIONS_ENABLED: true,
      },
    },
  });
  console.log(`  ✅ Feature flags configured`);

  // ─── 15. SLA THRESHOLDS ───
  await prisma.systemConfig.upsert({
    where: { key: 'sla_thresholds' },
    update: {},
    create: {
      key: 'sla_thresholds',
      value: {
        DOCTOR_FIRST_REVIEW_HOURS: 4,
        DOCTOR_FOLLOWUP_RESPONSE_HOURS: 24,
        AI_ASSESSMENT_MINUTES: 5,
        NURSE_ASSIGNMENT_HOURS: 2,
        SAMPLE_COLLECTION_HOURS: 1,
        LAB_RESULTS_HOURS: 48,
        DOCTOR_LAB_REVIEW_HOURS: 24,
        PATIENT_SLOT_BOOKING_HOURS: 24,
        PHARMACY_START_HOURS: 2,
        PHARMACY_FINISH_HOURS: 4,
        DELIVERY_ARRANGEMENT_HOURS: 4,
        DELIVERY_COMPLETION_HOURS: 24,
        REFUND_APPROVAL_HOURS: 24,
        WARNING_THRESHOLD_HOURS: 2,
      },
    },
  });
  console.log(`  ✅ SLA thresholds configured`);

  // ─── 16. PATIENT WALLET ───
  await prisma.wallet.upsert({
    where: { userId: patient.id },
    update: {},
    create: {
      userId: patient.id,
      balance: 0, // In paisa (₹0.00)
    },
  });
  console.log(`  ✅ Patient wallet created`);

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Test accounts:');
  console.log('  Patient: +919999900001 (patient@test.onlyou.life)');
  console.log('  Doctor:  +919999900002 (doctor@test.onlyou.life)');
  console.log('  Admin:   +919999900003 (admin@test.onlyou.life)');
  console.log('  Nurse:   +919999900004 (nurse@test.onlyou.life)');
  console.log('  Lab:     +919999900005 (lab@test.onlyou.life)');
  console.log('  Pharmacy:+919999900006 (pharmacy@test.onlyou.life)');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

### 25.5 package.json Seed Configuration

```json
// apps/api/package.json (relevant section)
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

```bash
# Run seed manually:
pnpm --filter api prisma db seed

# Run seed automatically after migration reset:
pnpm --filter api prisma migrate reset
# (This runs: drop → create → migrate → seed)
```

### 25.6 Migration Safety Checklist

Before deploying any migration to production:

| Check | Command | What to Verify |
|-------|---------|---------------|
| Schema diff | `prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma` | Expected SQL changes only |
| Migration preview | Open `prisma/migrations/<latest>/migration.sql` | No destructive operations (DROP TABLE, DROP COLUMN) without explicit review |
| Backward compatibility | N/A (manual review) | Old code can still work with new schema during rolling deploy |
| Data volume impact | Check table row counts | Large table ALTERs may need `CONCURRENTLY` or off-peak scheduling |
| Index impact | Check for new indexes | Large table indexes should use `CREATE INDEX CONCURRENTLY` |
| RLS policy impact | Check for policy changes | Ensure policies don't break existing queries |

### 25.7 Production Migration Deployment

```bash
# In CI/CD pipeline (GitHub Actions or similar):

# 1. Run migrations against production database
DATABASE_URL=$PRODUCTION_DATABASE_URL pnpm --filter api prisma migrate deploy

# 2. If migration fails:
# - Prisma wraps each migration in a transaction
# - Failed migrations are automatically rolled back
# - Fix the migration file and re-deploy

# 3. Status check:
DATABASE_URL=$PRODUCTION_DATABASE_URL pnpm --filter api prisma migrate status
```

**Zero-downtime deployment pattern:**
1. Deploy migration FIRST (additive schema changes only — add columns, add tables)
2. Deploy new application code that uses new schema
3. Remove old columns/tables in a LATER migration (after verifying no code references them)

---

*End of BACKEND-PART3A.md — Sections 21–25 Complete*

*Next: BACKEND-PART3B.md — Operations, Deployment & Testing (Sections 26–30)*
