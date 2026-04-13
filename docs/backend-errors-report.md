# Backend Specification — Errors & Inconsistencies Report

**Scope:** BACKEND-PART1.md, BACKEND-PART2A.md, BACKEND-PART2B.md, BACKEND-PART3A.md, BACKEND-PART3B.md  
**Cross-referenced against:** PORTAL-DOCTOR.md, PORTAL-ADMIN.md, PORTAL-NURSE-FIXED.md, PORTAL-LAB-FIXED.md, PORTAL-PHARMACY.md, APP-PATIENT.md, ARCHITECTURE.md, VERTICAL-PE.md, onlyou-spec-resolved-v4.md

---

## CRITICAL — Status Enum Mismatches

These are the most dangerous issues because developers implementing from different spec parts will write incompatible code.

---

### 1. Consultation Status Names — BACKEND-PART1 Uses Completely Different Names Than All Other Docs

**Location:** BACKEND-PART1.md Section 9.1 (Status Flow) and Section 9.2 (valid transitions map)

**The problem:** BACKEND-PART1 defines one set of status names, but the Doctor Portal, Patient App, Architecture doc, and even the Appendix in BACKEND-PART3B all use a different set. The BACKEND-PART1 statuses are the old/draft names that were superseded.

| Stage | BACKEND-PART1 (Section 9) | Doctor Portal / Patient App / BACKEND-PART3B Appendix |
|-------|---------------------------|-------------------------------------------------------|
| AI done, awaiting doctor | `PENDING_REVIEW` | `AI_COMPLETE` ✅ canonical |
| Doctor opens case | `IN_REVIEW` | `ASSIGNED` then `REVIEWING` ✅ canonical |
| Doctor creates prescription | `PRESCRIBED` | `PRESCRIPTION_CREATED` ✅ canonical |
| Doctor orders labs | `BLOOD_WORK_ORDERED` | `LABS_ORDERED` ✅ canonical |
| Doctor needs more info | `MORE_INFO_REQUESTED` | `INFO_REQUESTED` ✅ canonical |
| Treatment ongoing | *(missing)* | `TREATMENT_ACTIVE` ✅ canonical |
| Follow-up due | `FOLLOW_UP` | `FOLLOW_UP_DUE` ✅ canonical |
| Case finished | `CLOSED` | `COMPLETED` / `CLOSED` *(both appear — see Issue #2)* |

**Impact:** The `validTransitions` map in Section 9.2 is entirely built on the wrong enum values. A developer implementing from BACKEND-PART1 will create a state machine that rejects every legitimate transition from the portals.

**Fix needed:** Rewrite Section 9.1 status flow and Section 9.2 `validTransitions` map to use the canonical names from the Doctor Portal (PORTAL-DOCTOR.md Section 23). Also add the missing `ASSIGNED → REVIEWING` two-step transition.

---

### 2. Consultation Close Status: `CLOSED` vs `COMPLETED`

**Locations:**
- BACKEND-PART1.md Section 9.1: uses `CLOSED`
- BACKEND-PART3B Section 30.3 Appendix: uses `CLOSED`
- PORTAL-DOCTOR.md Section 23.2: uses `COMPLETED` ("Clicks Close Case → `COMPLETED`")
- APP-PATIENT.md Section 12.1: lists both `COMPLETED` ("Treatment Completed") and `CANCELLED`

**The problem:** When a doctor closes a case, does the status become `CLOSED` or `COMPLETED`? The backend parts say `CLOSED`, the portals say `COMPLETED`. These are two different enum values. Only one can exist in the Prisma schema.

**Fix needed:** Pick one and update all documents. Recommendation: use `COMPLETED` (more natural for the patient-facing side) or keep both as distinct statuses (`COMPLETED` = treatment finished normally, `CLOSED` = admin/system closure). Either way, all docs must agree.

---

### 3. Lab Order Status: `AT_LAB` vs `DELIVERED_TO_LAB` — Still Unresolved

**Locations:**
- BACKEND-PART2A Prisma enum: `AT_LAB`
- PORTAL-LAB-FIXED.md enum: `DELIVERED_TO_LAB` (but recommends choosing one)
- PORTAL-NURSE-FIXED.md: recommends `AT_LAB` as canonical
- BACKEND-PART3B Appendix Section 30.4: uses `DELIVERED_TO_LAB`
- BACKEND-PART2A Section 13.4 NurseVisit↔LabOrder mapping: uses `AT_LAB`

**The problem:** This was flagged in the portal specs as needing resolution, but the backend specs themselves are inconsistent — BACKEND-PART2A says `AT_LAB`, BACKEND-PART3B Appendix says `DELIVERED_TO_LAB`.

**Fix needed:** The Prisma enum in BACKEND-PART2A is the source of truth for the database. Choose `AT_LAB` (already in the enum) and update BACKEND-PART3B Section 30.4 to match. Or rename the enum value — but be consistent.

---

### 4. Lab Order Status in Appendix 30.4 Has Multiple Errors vs the Prisma Enum

**Location:** BACKEND-PART3B Section 30.4 vs BACKEND-PART2A Section 12.2

| Issue | Appendix 30.4 says | Prisma enum (PART2A) says |
|-------|--------------------|-----------------------------|
| Nurse traveling | `EN_ROUTE` | `NURSE_EN_ROUTE` |
| Nurse arrives | *(skipped entirely)* | `NURSE_ARRIVED` |
| Nurse delivers to lab | `DELIVERED_TO_LAB` | `AT_LAB` |
| Self-upload path | Shows `ORDERED → RESULTS_READY` | Should be `ORDERED → RESULTS_UPLOADED` |
| Missing statuses | — | `COLLECTION_FAILED`, `RECOLLECTION_NEEDED` not shown |

**Fix needed:** Rewrite Section 30.4 to exactly match the Prisma enum from BACKEND-PART2A Section 12.2. Add the missing `NURSE_ARRIVED` step, use `NURSE_EN_ROUTE` not `EN_ROUTE`, use `AT_LAB` not `DELIVERED_TO_LAB`, and show the self-upload path going to `RESULTS_UPLOADED` not `RESULTS_READY`.

---

### 5. Nurse Visit Appendix 30.6: `RUNNING_LATE` Shown as a Status, But It Isn't One

**Location:** BACKEND-PART3B Section 30.6

The appendix shows: `SCHEDULED or EN_ROUTE → RUNNING_LATE` as a status transition.

**The problem:** `RUNNING_LATE` is NOT in the `NurseVisitStatus` enum (BACKEND-PART2A Section 13.1, PORTAL-NURSE-FIXED Section 5). Running late is handled via fields (`lateReportedAt`, `newEta`, `lateReason`) — the visit stays in its current status (EN_ROUTE or SCHEDULED). The nurse portal correctly shows it as a reporting action, not a status change.

**Fix needed:** Remove `RUNNING_LATE` from the status flow diagram. Instead add a note: "Nurse can report running late at any point before ARRIVED — this sets `lateReportedAt`/`newEta` fields without changing the visit status."

---

## HIGH — Functional Inconsistencies

---

### 6. AI Model String Mismatch Between Backend Parts

**Locations:**
- BACKEND-PART1 Section 8.2 AI Service code: `claude-sonnet-4-5-20250929`
- BACKEND-PART3B Section 27.2 Environment Variables: `ANTHROPIC_MODEL=claude-sonnet-4-20250514`

**The problem:** Two different model identifiers. `claude-sonnet-4-5-20250929` vs `claude-sonnet-4-20250514` — these are different models. The code in Section 8.2 hardcodes the model string instead of reading from the env var.

**Fix needed:** The AI service code should use `process.env.ANTHROPIC_MODEL` (or the ConfigService equivalent), not a hardcoded string. The env var value should be the intended model. Pick one model identifier and use it everywhere.

---

### 7. BullMQ Queue Names — Inconsistent Across Sections 19, 26.6, and 26.7

**Location:** BACKEND-PART2B Section 19 vs BACKEND-PART3B Sections 26.6 and 26.7

| Queue | Defined in Section 19 | Monitored in 26.6 Health Check | Registered in 26.7 Bull Board |
|-------|----------------------|-------------------------------|-------------------------------|
| `subscription-renewal` | ✅ | ❌ Missing | ❌ Missing |
| `auto-reorder` | ✅ | ❌ Missing | ❌ Missing |
| `sla-check` | ✅ | ✅ | ✅ |
| `notification-dispatch` | ✅ (this name) | ✅ as `notifications` ⚠️ | ✅ as `notifications` ⚠️ |
| `ai-assessment` | ✅ | ✅ | ✅ |
| `pdf-generation` | ✅ | ✅ | ✅ |
| `scheduled-reminder` | ✅ | ❌ Missing | ❌ Missing |
| `data-retention` | ❌ Not defined | ✅ | ✅ |
| `payment-reconciliation` | ❌ Not defined | ❌ | ✅ (Bull Board only) |

**Problems:**
1. `notification-dispatch` (Section 19) vs `notifications` (Section 26) — name mismatch
2. `subscription-renewal`, `auto-reorder`, `scheduled-reminder` defined but never registered in Bull Board or health check
3. `data-retention` and `payment-reconciliation` registered in monitoring but never defined as queues with processors
4. `payment-reconciliation` appears only in Bull Board, nowhere else in any spec

**Fix needed:** Reconcile all queue names. Add missing queues to Bull Board and health check. Either define `data-retention` and `payment-reconciliation` processors in Section 19, or remove them from Section 26. Use consistent naming (`notification-dispatch` OR `notifications`, not both).

---

### 8. Email Provider: Resend (MVP) vs SES — Config Only Has SES

**Locations:**
- BACKEND-PART2A Section 15: States "Email (Resend MVP → SES scale)"
- BACKEND-PART3B Section 27.2: Only has `SES_REGION`, `SES_FROM_EMAIL`, `SES_FROM_NAME` env vars — no Resend API key

**The problem:** The notifications module says Resend for MVP, but the environment configuration has no Resend variables. Either Resend was dropped in favor of SES-from-the-start, or the env vars are incomplete.

**Fix needed:** If using Resend for MVP, add `RESEND_API_KEY` to the env vars and config validation. If SES from the start, update Section 15 to say "Email (SES)" and remove the Resend reference.

---

### 9. Consent Purposes — Different Names and Count Between Backend and Architecture

**Locations:**
- BACKEND-PART3A Section 21: 6 purposes — `TELECONSULTATION`, `PRESCRIPTION_PHARMACY`, `LAB_PROCESSING`, `HEALTH_DATA_ANALYTICS`, `MARKETING_COMMUNICATIONS`, `PHOTO_AI_PROCESSING`
- ARCHITECTURE.md: 4 purposes — `TELECONSULTATION`, `PHARMACY_SHARING`, `LAB_PROCESSING`, `ANALYTICS`

**Problems:**
1. `PRESCRIPTION_PHARMACY` (PART3A) vs `PHARMACY_SHARING` (ARCHITECTURE) — different names
2. `HEALTH_DATA_ANALYTICS` (PART3A) vs `ANALYTICS` (ARCHITECTURE) — different names
3. ARCHITECTURE.md is missing `MARKETING_COMMUNICATIONS` and `PHOTO_AI_PROCESSING`

**Fix needed:** BACKEND-PART3A Section 21 is the more detailed/recent spec. Update ARCHITECTURE.md to match the 6 purposes with the PART3A naming.

---

### 10. Duplicate tRPC Routes: `photo.*` and `storage.*`

**Location:** BACKEND-PART3B Section 30.1 tRPC Route Map

The route map defines:
- `photo.getUploadUrl` — "Patient: get presigned S3 upload URL"
- `photo.confirmUpload` — "Patient: confirm photo uploaded to S3"
- `storage.getPhotoUploadUrl` — "Patient: presigned URL for photo upload"
- `storage.confirmPhotoUpload` — "Patient: confirm S3 upload completion"

**The problem:** These are duplicate routes doing the same thing. Developers won't know which to use.

**Fix needed:** Either remove the `storage.getPhotoUploadUrl` and `storage.confirmPhotoUpload` routes (since `photo.*` already handles this), or remove `photo.getUploadUrl` and `photo.confirmUpload` in favor of a unified `storage.*` namespace. The `photo.getPhotos` query could remain since it's read-only.

---

### 11. CORS Origins Missing Patient App Port

**Location:** BACKEND-PART3B Section 27.2

```
CORS_ORIGINS=http://localhost:3001,...,http://localhost:3006
```

Section 29.4 shows the patient app runs on `http://localhost:8081` (Expo), but this port is not in the CORS origins list.

**Fix needed:** Add `http://localhost:8081` to the CORS_ORIGINS. (Note: React Native/Expo may not need CORS for API calls since it doesn't run in a browser, but for Expo Web testing it would be needed.)

---

## MEDIUM — Minor Inconsistencies

---

### 12. Appendix 30.3 Consultation Flow Uses Mixed Status Names

**Location:** BACKEND-PART3B Section 30.3

The appendix diagram uses `IN_REVIEW` (BACKEND-PART1 name) but `PRESCRIPTION_CREATED`, `INFO_REQUESTED`, `INFO_PROVIDED` (portal names). It also introduces `LABS_ORDERED` and `LABS_REVIEWED` which don't appear in BACKEND-PART1's enum.

It also uses `INFO_PROVIDED` — a status that doesn't appear in any other document. The Doctor Portal says when the patient responds to `INFO_REQUESTED`, it goes back to `REVIEWING`, not to a new `INFO_PROVIDED` status.

**Fix needed:** Rewrite Section 30.3 to match the canonical flow from PORTAL-DOCTOR.md Section 23. Remove `INFO_PROVIDED` (patient response returns to `REVIEWING`). Use `REVIEWING` not `IN_REVIEW`.

---

### 13. Nurse Visit Status `PATIENT_UNAVAILABLE` in Appendix 30.6 vs `FAILED` in Enum

**Location:** BACKEND-PART3B Section 30.6

Shows `EN_ROUTE → PATIENT_UNAVAILABLE` as a special path. But the NurseVisitStatus enum has `FAILED`, not `PATIENT_UNAVAILABLE`. The nurse portal handles this as transitioning to `FAILED` with a `failedReason` field.

**Fix needed:** Change `PATIENT_UNAVAILABLE` to `FAILED` in Section 30.6, with a note that `failedReason` captures the specific reason (patient unavailable, not fasting, etc.).

---

### 14. Section 30.3 Missing `CANCELLED` Status for Consultations

**Location:** BACKEND-PART3B Section 30.3

The consultation lifecycle diagram doesn't show `CANCELLED` as a possible status, but APP-PATIENT.md Section 12.1 includes it in the patient-facing status table.

**Fix needed:** Add `CANCELLED` to the consultation flow diagram with a note on which statuses can transition to it.

---

### 15. Health Check: `Roles('ADMIN')` Decorator Doesn't Match CASL Pattern

**Location:** BACKEND-PART3B Section 26.6

```typescript
@UseGuards(JwtGuard, Roles('ADMIN'))
```

But BACKEND-PART3A Section 22 describes a CASL-based authorization system, not a simple `Roles()` decorator. The guard should be `@UseGuards(JwtGuard, RoleGuard)` with CASL ability checks, or a dedicated `AdminGuard`.

**Fix needed:** Minor — align the health check code example with the CASL authorization pattern from Section 22.

---

### 16. Bull Board Uses ExpressAdapter But App Uses Fastify

**Location:** BACKEND-PART3B Section 26.7

```typescript
import { ExpressAdapter } from '@bull-board/express';
```

But BACKEND-PART1 Section 1 specifies "NestJS 10 + Fastify Adapter". Bull Board's Express adapter won't work with Fastify.

**Fix needed:** Change to `@bull-board/fastify` and `FastifyAdapter`:
```typescript
import { FastifyAdapter } from '@bull-board/fastify';
```

---

### 17. Prescription Status in ARCHITECTURE.md Not Defined in Backend Specs

**Location:** ARCHITECTURE.md

Lists Prescription status enum: `DRAFT → SIGNED → SENT_TO_PHARMACY → DISPENSED`

But BACKEND-PART1 Section 10 (Prescriptions Module) doesn't define this status enum or transitions anywhere. The backend specs only show prescription creation and signing, not the full status flow.

**Fix needed:** Add the Prescription status enum and valid transitions to BACKEND-PART1 Section 10.

---

### 18. `REASSIGNED` Order Status — Transition Not Shown in Appendix 30.5

**Location:** BACKEND-PART3B Section 30.5 and PORTAL-PHARMACY.md

The Pharmacy portal defines `REASSIGNED` as a valid order status, but the Appendix 30.5 medication order flow shows the admin resolve action going to `SENT_TO_PHARMACY` for "Proceed" or creating a new order for "Reassign". The `REASSIGNED` status is mentioned but its exact position in the flow is ambiguous — does the old order become `REASSIGNED` while a new order is created? Or does the same order get status `REASSIGNED` then `SENT_TO_PHARMACY`?

**Fix needed:** Clarify in Section 30.5: when admin reassigns to a different pharmacy, the current order's status changes to `REASSIGNED` (terminal for original pharmacy), and the same order gets re-routed with status `SENT_TO_PHARMACY` to the new pharmacy (or a new order is created). The current text says both "Reassign → REASSIGNED → new pharmacy receives order" which is ambiguous.

---

### 19. Seed Data Pricing Is Wrong for ALL Verticals

**Location:** BACKEND-PART3A Section 25 — Seed Data, line ~2470 (`subscription_plans` systemConfig upsert)

**Found during:** VERTICAL-PE.md cross-reference against all backend documents

**The problem:** The seed data uses early draft/placeholder prices that don't match the authoritative pricing in onlyou-spec-resolved-v4.md Section 5 or the Razorpay payments module in BACKEND-PART2A Section 14.

| Vertical | Seed Data (PART3A) | Authoritative (spec v4 + PART2A) |
|----------|-------------------|----------------------------------|
| Hair Loss Monthly | ₹599 | **₹999** |
| Hair Loss Quarterly | ₹1,499 | **₹2,499** |
| Hair Loss 6-Month | ₹2,699 | **₹4,499** |
| ED Monthly | ₹799 | **₹1,299** |
| ED Quarterly | ₹1,999 | **₹3,299** |
| ED 6-Month | ₹3,599 | **₹5,999** |
| PE Monthly | ₹799 | **₹1,299** |
| PE Quarterly | ₹1,999 | **₹3,299** |
| PE 6-Month | ₹3,599 | **₹5,999** |
| PCOS Monthly | ₹799 | **₹1,499** |
| PCOS Quarterly | ₹1,999 | **₹3,799** |
| PCOS 6-Month | ₹3,599 | **₹6,999** |
| Weight Standard | Matches ✅ | ₹2,999 / ₹7,999 / ₹14,999 |
| Weight GLP-1 | ₹8,999 quarterly | **₹24,999** quarterly (also monthly ₹9,999 correct) |

**Impact:** If seed data is used to populate the database, every patient will be charged the wrong amount. The Razorpay `getPricing()` method in BACKEND-PART2A Section 14 has the CORRECT prices (in paisa), so there's also an internal contradiction within the backend specs — the payments module and the seed script disagree.

**Fix needed:** Rewrite the `subscription_plans` seed data in BACKEND-PART3A to match the authoritative pricing from onlyou-spec-resolved-v4.md Section 5 and the `getPricing()` method in BACKEND-PART2A Section 14. Values should be in rupees (the seed uses rupees, while PART2A uses paisa — both conventions are fine as long as the amounts are correct for their respective unit).

---

### 20. Lab Test Pricing Table Missing PE-Specific Panels

**Location:** BACKEND-PART2A Section 12.5 — Lab Test Pricing

**Found during:** VERTICAL-PE.md cross-reference against all backend documents

**The problem:** BACKEND-PART2A defines a single generic lab panel for ED/PE:

> "Basic Health Check" — ₹800 — Testosterone, Fasting Glucose, Lipid Profile

But onlyou-spec-resolved-v4.md Section 6.9 defines 4 distinct PE-specific panels that doctors need to order:

| Panel | Tests | Price | When |
|-------|-------|-------|------|
| Thyroid Check | TSH, Free T3, T4 | ₹350 | Hyperthyroidism suspected |
| Hormonal | Testosterone, Prolactin | ₹800 | Low libido, acquired PE with hormonal suspicion |
| Prostate | PSA, Urine Culture | ₹500 | Prostatitis suspected |
| Combined | All of above | ₹1,500 | Multiple suspicions |

The generic "Basic Health Check" doesn't cover Thyroid Check (missing Free T3, T4), Prostate panel (missing PSA, Urine Culture), or the Combined panel. A doctor suspecting prostatitis as the cause of a patient's PE has no way to order the correct panel from the backend's current lab pricing table.

**Fix needed:** Expand BACKEND-PART2A Section 12.5 to include the PE-specific panels from the authoritative spec. The table should have entries for: Thyroid Check (₹350), PE Hormonal (₹800), Prostate Screen (₹500), and PE Combined (₹1,500) — in addition to or replacing the generic "Basic Health Check" row for PE.

---

## Summary

| Severity | Count | Key Theme |
|----------|-------|-----------|
| **CRITICAL** | 5 | Status enum mismatches — BACKEND-PART1 consultation statuses are completely wrong; Lab order and Nurse visit appendix diagrams contradict the Prisma enums |
| **HIGH** | 8 | Queue name mismatches, AI model string conflict, duplicate routes, missing config, consent purpose naming, **seed data pricing wrong for all verticals**, **missing PE lab panels** |
| **MEDIUM** | 7 | Mixed status names in appendix, missing statuses, wrong adapter, undefined enums |
| **TOTAL** | **20** | |

### Priority Fix Order

1. **BACKEND-PART1 Section 9** — Rewrite consultation status flow + valid transitions map with canonical names
2. **BACKEND-PART3B Section 30.3, 30.4, 30.5, 30.6** — Rewrite all appendix status flow diagrams to match Prisma enums
3. **BACKEND-PART3A Section 25** — Fix seed data pricing for ALL verticals (patients will be charged wrong amounts)
4. **BACKEND-PART2B Section 19 + BACKEND-PART3B Section 26** — Reconcile BullMQ queue names
5. **BACKEND-PART1 Section 8.2** — Fix AI model reference to use env var
6. **BACKEND-PART2A Section 12.5** — Add PE-specific lab panels
7. **All remaining items** — Standardize naming, fix adapter, add missing definitions
