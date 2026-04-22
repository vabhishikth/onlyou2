// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { ROLES } from "../packages/core/src/enums/roles";

import {
  adminAuditActionValidator,
  adminAuditTargetTableValidator,
} from "./biomarker/lib/auditValidators";

const roleValidator = v.union(...ROLES.map((r) => v.literal(r)));
const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("other"),
);

const pregnancyStatusValidator = v.union(
  v.literal("pregnant"),
  v.literal("not_pregnant"),
  v.literal("unknown"),
);

const labReportSourceValidator = v.union(
  v.literal("patient_upload"),
  v.literal("lab_upload"),
  v.literal("nurse_flow"),
);

const labReportStatusValidator = v.union(
  v.literal("uploaded"),
  v.literal("analyzing"),
  v.literal("ready"),
  v.literal("parse_failed"),
  v.literal("rejected"),
  v.literal("not_a_lab_report"),
);

const patientNameMatchValidator = v.union(
  v.literal("match"),
  v.literal("mismatch"),
  v.literal("unknown"),
);

const mimeTypeValidator = v.union(
  v.literal("application/pdf"),
  v.literal("image/jpeg"),
  v.literal("image/png"),
);

const markerStatusValidator = v.union(
  v.literal("optimal"),
  v.literal("sub_optimal"),
  v.literal("action_required"),
  v.literal("unclassified"),
);

const unclassifiedReasonValidator = v.union(
  v.literal("not_in_reference_db"),
  v.literal("profile_incomplete"),
  v.literal("pregnancy_sensitive"),
  v.literal("qualitative_value"),
  v.literal("unit_conversion_missing"),
);

const valueTypeValidator = v.union(
  v.literal("numeric"),
  v.literal("qualitative"),
);

const refRangeSexValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("any"),
);

const curationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("in_review"),
  v.literal("resolved"),
  v.literal("wont_fix"),
);

const labOrderStatusValidator = v.union(
  v.literal("draft"),
  v.literal("sent_to_lab"),
  v.literal("awaiting_results"),
  v.literal("results_uploaded"),
  v.literal("cancelled"),
  v.literal("failed"),
);

const windowTypeValidator = v.union(v.literal("day"), v.literal("month"));

const notificationKindValidator = v.union(
  v.literal("lab_report_ready"),
  v.literal("lab_report_parse_failed"),
  v.literal("lab_report_updated"),
  v.literal("lab_report_uploaded_for_you"),
);

export default defineSchema({
  // ─── existing tables (with users additive change) ──────────────────
  users: defineTable({
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    role: roleValidator,
    gender: v.optional(genderValidator),
    dob: v.optional(v.string()),
    pincode: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    address: v.optional(v.string()),
    phoneVerified: v.boolean(),
    profileComplete: v.boolean(),
    isFixture: v.optional(v.boolean()),
    pregnancyStatus: v.optional(pregnancyStatusValidator),
    createdAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_email", ["email"])
    .index("by_fixture", ["isFixture"]),

  otpAttempts: defineTable({
    phone: v.string(),
    hashedOtp: v.string(),
    expiresAt: v.number(),
    attempts: v.number(),
    createdAt: v.number(),
  }).index("by_phone", ["phone"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  featureFlags: defineTable({
    key: v.string(),
    value: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // ─── Phase 2.5 new tables ──────────────────────────────────────────
  lab_reports: defineTable({
    userId: v.id("users"),
    source: labReportSourceValidator,
    labOrderId: v.optional(v.id("lab_orders")),
    fileId: v.id("_storage"),
    mimeType: mimeTypeValidator,
    fileSizeBytes: v.number(),
    contentHash: v.string(),
    collectionDate: v.optional(v.string()),
    patientNameOnReport: v.optional(v.string()),
    patientNameMatch: v.optional(patientNameMatchValidator),
    status: labReportStatusValidator,
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    retryCount: v.optional(v.number()),
    userRetryCount: v.optional(v.number()),
    nextRetryAt: v.optional(v.number()),
    lockedAt: v.optional(v.number()),
    firstAttemptAt: v.optional(v.number()),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_hash", ["userId", "contentHash"])
    .index("by_lab_order", ["labOrderId"])
    .index("by_status", ["status"])
    .index("by_deleted", ["deletedAt"])
    .index("by_next_retry", ["nextRetryAt"]),

  biomarker_reports: defineTable({
    labReportId: v.id("lab_reports"),
    userId: v.id("users"),
    collectionDate: v.optional(v.string()),
    narrative: v.string(),
    narrativeModel: v.string(),
    optimalCount: v.number(),
    subOptimalCount: v.number(),
    actionRequiredCount: v.number(),
    unclassifiedCount: v.number(),
    analyzedAt: v.number(),
    lastReclassifiedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_user_analyzed", ["userId", "analyzedAt"])
    .index("by_user_collection_date", ["userId", "collectionDate"])
    .index("by_lab_report", ["labReportId"])
    .index("by_deleted", ["deletedAt"]),

  biomarker_values: defineTable({
    biomarkerReportId: v.id("biomarker_reports"),
    userId: v.id("users"),
    collectionDate: v.optional(v.string()),
    canonicalId: v.optional(v.string()),
    normalizedKey: v.optional(v.string()),
    nameOnReport: v.string(),
    qualifier: v.optional(v.string()),
    valueType: valueTypeValidator,
    rawValue: v.string(),
    numericValue: v.optional(v.number()),
    rawUnit: v.optional(v.string()),
    canonicalUnit: v.optional(v.string()),
    convertedValue: v.optional(v.number()),
    labPrintedRange: v.optional(v.string()),
    status: markerStatusValidator,
    unclassifiedReason: v.optional(unclassifiedReasonValidator),
    category: v.optional(v.string()),
    referenceRangeId: v.optional(v.id("biomarker_reference_ranges")),
    pageNumber: v.optional(v.number()),
    confidence: v.optional(v.number()),
    classifiedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_report", ["biomarkerReportId"])
    .index("by_user_canonical_date", [
      "userId",
      "canonicalId",
      "collectionDate",
    ])
    .index("by_canonical_status", ["canonicalId", "status"])
    .index("by_report_canonical", ["biomarkerReportId", "canonicalId"])
    .index("by_normalized_key", ["normalizedKey"])
    .index("by_deleted", ["deletedAt"]),

  biomarker_reference_ranges: defineTable({
    canonicalId: v.string(),
    displayName: v.string(),
    aliases: v.array(v.string()),
    category: v.string(),
    canonicalUnit: v.string(),
    ageMin: v.number(),
    ageMax: v.number(),
    sex: refRangeSexValidator,
    pregnancySensitive: v.boolean(),
    optimalMin: v.number(),
    optimalMax: v.number(),
    subOptimalBelowMin: v.optional(v.number()),
    subOptimalAboveMax: v.optional(v.number()),
    actionBelow: v.optional(v.number()),
    actionAbove: v.optional(v.number()),
    explainer: v.string(),
    source: v.string(),
    clinicalReviewer: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    isActive: v.boolean(),
    autoGenerated: v.optional(v.boolean()),
    updatedAt: v.number(),
  })
    .index("by_canonical_id", ["canonicalId", "sex", "ageMin"])
    .index("by_active", ["isActive", "updatedAt"]),

  biomarker_curation_queue: defineTable({
    normalizedKey: v.string(),
    nameOnReport: v.string(),
    rawUnit: v.optional(v.string()),
    sampleLabPrintedRange: v.optional(v.string()),
    firstSeenBiomarkerReportId: v.id("biomarker_reports"),
    occurrenceCount: v.number(),
    lastSeenAt: v.number(),
    status: curationStatusValidator,
    resolvedReferenceRangeId: v.optional(v.id("biomarker_reference_ranges")),
    resolvedAt: v.optional(v.number()),
    resolvedByUserId: v.optional(v.id("users")),
  })
    .index("by_normalized_key", ["normalizedKey"])
    .index("by_status_prevalence", ["status", "occurrenceCount"]),

  lab_orders: defineTable({
    userId: v.id("users"),
    orderedByUserId: v.optional(v.id("users")),
    labPartnerId: v.optional(v.string()),
    panelName: v.optional(v.string()),
    requestedMarkers: v.array(v.string()),
    status: labOrderStatusValidator,
    labReportId: v.optional(v.id("lab_reports")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_lab_partner_status", ["labPartnerId", "status"]),

  parse_rate_limits: defineTable({
    userId: v.id("users"),
    windowType: windowTypeValidator,
    dateBucket: v.string(),
    count: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_window", ["userId", "windowType", "dateBucket"])
    .index("by_date_bucket", ["dateBucket"]),

  notifications: defineTable({
    userId: v.id("users"),
    kind: notificationKindValidator,
    biomarkerReportId: v.optional(v.id("biomarker_reports")),
    labReportId: v.optional(v.id("lab_reports")),
    title: v.string(),
    body: v.string(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
    pushSentAt: v.optional(v.number()),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_unread", ["userId", "readAt"]),

  reclassify_locks: defineTable({
    canonicalId: v.string(),
    ownerToken: v.string(),
    acquiredAt: v.number(),
    expiresAt: v.number(),
    action: v.union(
      v.literal("reclassifyForCanonicalId"),
      v.literal("reclassifyAllReportsPreview"),
      v.literal("reclassifyAllReportsCommit"),
    ),
  })
    .index("by_canonical", ["canonicalId"])
    .index("by_expires", ["expiresAt"]),

  admin_audit_log: defineTable({
    adminUserId: v.id("users"),
    action: adminAuditActionValidator,
    targetTable: adminAuditTargetTableValidator,
    targetId: v.string(),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_admin", ["adminUserId", "timestamp"])
    .index("by_target", ["targetTable", "targetId", "timestamp"]),
});
