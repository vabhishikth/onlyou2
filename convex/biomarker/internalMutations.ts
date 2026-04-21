import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";

import { insertLabReportRowInline } from "./lib/createLabReport";

export const markAnalyzing = internalMutation({
  args: { labReportId: v.id("lab_reports"), now: v.number() },
  handler: async (ctx, { labReportId, now }) => {
    const r = await ctx.db.get(labReportId);
    if (!r) return;
    await ctx.db.patch(labReportId, {
      status: "analyzing",
      lockedAt: now,
      firstAttemptAt: r.firstAttemptAt ?? now,
    });
  },
});

export const markReady = internalMutation({
  args: { labReportId: v.id("lab_reports"), now: v.number() },
  handler: async (ctx, { labReportId }) =>
    await ctx.db.patch(labReportId, {
      status: "ready",
      lockedAt: undefined,
      nextRetryAt: undefined,
    }),
});

export const markNotLabReport = internalMutation({
  args: { labReportId: v.id("lab_reports"), now: v.number() },
  handler: async (ctx, { labReportId }) =>
    await ctx.db.patch(labReportId, {
      status: "not_a_lab_report",
      lockedAt: undefined,
      nextRetryAt: undefined,
    }),
});

export const markParseFailed = internalMutation({
  args: {
    labReportId: v.id("lab_reports"),
    errorCode: v.string(),
    now: v.number(),
  },
  handler: async (ctx, { labReportId, errorCode }) =>
    await ctx.db.patch(labReportId, {
      status: "parse_failed",
      errorCode,
      lockedAt: undefined,
      nextRetryAt: undefined,
    }),
});

export const scheduleRetry = internalMutation({
  args: {
    labReportId: v.id("lab_reports"),
    nextRetryAt: v.number(),
    retryCount: v.number(),
    firstAttemptAt: v.number(),
  },
  handler: async (ctx, args) =>
    await ctx.db.patch(args.labReportId, {
      status: "analyzing",
      nextRetryAt: args.nextRetryAt,
      retryCount: args.retryCount,
      firstAttemptAt: args.firstAttemptAt,
      lockedAt: undefined,
    }),
});

export const createBiomarkerReport = internalMutation({
  args: {
    labReportId: v.id("lab_reports"),
    userId: v.id("users"),
    collectionDate: v.optional(v.string()),
    analyzedAt: v.number(),
  },
  handler: async (ctx, args) =>
    await ctx.db.insert("biomarker_reports", {
      labReportId: args.labReportId,
      userId: args.userId,
      collectionDate: args.collectionDate,
      narrative: "",
      narrativeModel: "pending",
      optimalCount: 0,
      subOptimalCount: 0,
      actionRequiredCount: 0,
      unclassifiedCount: 0,
      analyzedAt: args.analyzedAt,
    }),
});

export const patchBiomarkerReport = internalMutation({
  args: {
    biomarkerReportId: v.id("biomarker_reports"),
    narrative: v.string(),
    narrativeModel: v.string(),
    optimalCount: v.number(),
    subOptimalCount: v.number(),
    actionRequiredCount: v.number(),
    unclassifiedCount: v.number(),
  },
  handler: async (ctx, { biomarkerReportId, ...rest }) =>
    await ctx.db.patch(biomarkerReportId, rest),
});

export const insertBiomarkerValue = internalMutation({
  args: {
    biomarkerReportId: v.id("biomarker_reports"),
    userId: v.id("users"),
    collectionDate: v.optional(v.string()),
    canonicalId: v.optional(v.string()),
    nameOnReport: v.string(),
    valueType: v.union(v.literal("numeric"), v.literal("qualitative")),
    rawValue: v.string(),
    numericValue: v.optional(v.number()),
    rawUnit: v.optional(v.string()),
    canonicalUnit: v.optional(v.string()),
    convertedValue: v.optional(v.number()),
    labPrintedRange: v.optional(v.string()),
    status: v.union(
      v.literal("optimal"),
      v.literal("sub_optimal"),
      v.literal("action_required"),
      v.literal("unclassified"),
    ),
    unclassifiedReason: v.optional(v.any()),
    category: v.optional(v.string()),
    referenceRangeId: v.optional(v.id("biomarker_reference_ranges")),
    pageNumber: v.optional(v.number()),
    confidence: v.optional(v.number()),
    classifiedAt: v.number(),
    normalizedKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => await ctx.db.insert("biomarker_values", args),
});

export const updateLabReportNameMatch = internalMutation({
  args: {
    labReportId: v.id("lab_reports"),
    patientNameOnReport: v.string(),
    patientNameMatch: v.string(),
  },
  handler: async (ctx, args) =>
    await ctx.db.patch(args.labReportId, {
      patientNameOnReport: args.patientNameOnReport,
      patientNameMatch: args.patientNameMatch as
        | "match"
        | "mismatch"
        | "unknown",
    }),
});

// I-1 fix: claim retry candidates atomically inside a mutation so the cron
// cannot double-fire the same row. Stamps lockedAt: now on every candidate
// in the same DB transaction that reads them — the next cron tick will see
// lockedAt >= staleLockCutoff and skip the row until the 90 s window expires.
export const claimRetryCandidates = internalMutation({
  args: { now: v.number(), staleLockCutoff: v.number() },
  handler: async (
    ctx,
    { now, staleLockCutoff },
  ): Promise<Id<"lab_reports">[]> => {
    const candidates = await ctx.db
      .query("lab_reports")
      .withIndex("by_next_retry", (q) => q.lte("nextRetryAt", now))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "analyzing"),
          q.or(
            q.eq(q.field("lockedAt"), undefined),
            q.lt(q.field("lockedAt"), staleLockCutoff),
          ),
        ),
      )
      .take(25);
    const claimed: Id<"lab_reports">[] = [];
    for (const row of candidates) {
      await ctx.db.patch(row._id, { lockedAt: now });
      claimed.push(row._id);
    }
    return claimed;
  },
});

export const insertLabReportRow = internalMutation({
  args: {
    userId: v.id("users"),
    source: v.union(
      v.literal("patient_upload"),
      v.literal("lab_upload"),
      v.literal("nurse_flow"),
    ),
    labOrderId: v.optional(v.id("lab_orders")),
    fileId: v.id("_storage"),
    mimeType: v.union(
      v.literal("application/pdf"),
      v.literal("image/jpeg"),
      v.literal("image/png"),
    ),
    fileSizeBytes: v.number(),
    contentHash: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const { now, ...rest } = args;
    const labReportId = await insertLabReportRowInline(ctx, rest, now);
    return { labReportId };
  },
});

// Patches a curation queue row. Used by Layer C to mark a row "resolved"
// once the auto-DRAFT generator writes a reference range for it. Also used
// by the admin-curation UI (Phase 2.5D) to resolve rows by hand.
export const patchCurationQueueRow = internalMutation({
  args: {
    queueId: v.id("biomarker_curation_queue"),
    patch: v.object({
      status: v.optional(
        v.union(
          v.literal("pending"),
          v.literal("in_review"),
          v.literal("resolved"),
          v.literal("wont_fix"),
        ),
      ),
      resolvedAt: v.optional(v.number()),
      resolvedReferenceRangeId: v.optional(v.id("biomarker_reference_ranges")),
      resolvedByUserId: v.optional(v.id("users")),
    }),
  },
  handler: async (ctx, { queueId, patch }) => {
    await ctx.db.patch(queueId, patch);
    return { ok: true };
  },
});

// Inserts a new reference range row. Used by Layer C auto-DRAFT generation
// (convex/biomarker/lib/autoDraftRange.ts) to persist Claude-proposed ranges
// with clinicalReviewer = "DRAFT — auto-generated YYYY-MM-DD" for clinician
// review. Not used for clinician-curated ranges — those go through the
// packages/core/seeds/biomarker-ranges.json seed path.
export const insertReferenceRange = internalMutation({
  args: {
    canonicalId: v.string(),
    displayName: v.string(),
    aliases: v.array(v.string()),
    category: v.string(),
    canonicalUnit: v.string(),
    ageMin: v.number(),
    ageMax: v.number(),
    sex: v.union(v.literal("male"), v.literal("female"), v.literal("any")),
    pregnancySensitive: v.boolean(),
    optimalMin: v.number(),
    optimalMax: v.number(),
    subOptimalBelowMin: v.optional(v.number()),
    subOptimalAboveMax: v.optional(v.number()),
    actionBelow: v.optional(v.number()),
    actionAbove: v.optional(v.number()),
    explainer: v.string(),
    source: v.string(),
    clinicalReviewer: v.string(),
    isActive: v.boolean(),
    autoGenerated: v.optional(v.boolean()),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const { now, ...rest } = args;
    return await ctx.db.insert("biomarker_reference_ranges", {
      ...rest,
      updatedAt: now,
    });
  },
});

export const writeNotification = internalMutation({
  args: {
    userId: v.id("users"),
    kind: v.union(
      v.literal("lab_report_ready"),
      v.literal("lab_report_parse_failed"),
      v.literal("lab_report_updated"),
      v.literal("lab_report_uploaded_for_you"),
    ),
    biomarkerReportId: v.optional(v.id("biomarker_reports")),
    labReportId: v.optional(v.id("lab_reports")),
    title: v.string(),
    body: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      kind: args.kind,
      biomarkerReportId: args.biomarkerReportId,
      labReportId: args.labReportId,
      title: args.title,
      body: args.body,
      createdAt: args.now,
    });
  },
});

function uuid(): string {
  // Simple random token; Convex V8 lacks crypto.randomUUID. Use a pseudo-UUID.
  const chars = "abcdef0123456789";
  let s = "";
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * 16)];
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

export const acquireReclassifyLock = internalMutation({
  args: {
    canonicalId: v.string(),
    action: v.union(
      v.literal("reclassifyForCanonicalId"),
      v.literal("reclassifyAllReportsPreview"),
      v.literal("reclassifyAllReportsCommit"),
    ),
    ttlMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Check for ANY active lock that should block this acquisition
    // - If requesting per-canonical: block if global "*" is held OR same canonical is held
    // - If requesting global "*": block if ANY lock is held
    const activeLocks = await ctx.db.query("reclassify_locks").collect();
    const activeValid = activeLocks.filter((l) => l.expiresAt > now);

    if (args.canonicalId === "*") {
      if (activeValid.length > 0) return { acquired: false as const };
    } else {
      const blockers = activeValid.filter(
        (l) => l.canonicalId === "*" || l.canonicalId === args.canonicalId,
      );
      if (blockers.length > 0) return { acquired: false as const };
    }

    // 2. Clean up any expired rows with this canonicalId (stale-lock safety)
    const expiredSameCanonical = activeLocks.filter(
      (l) => l.canonicalId === args.canonicalId && l.expiresAt <= now,
    );
    for (const e of expiredSameCanonical) {
      await ctx.db.delete(e._id);
    }

    // 3. Insert fresh lock
    const ownerToken = uuid();
    await ctx.db.insert("reclassify_locks", {
      canonicalId: args.canonicalId,
      ownerToken,
      acquiredAt: now,
      expiresAt: now + args.ttlMs,
      action: args.action,
    });
    return { acquired: true as const, ownerToken };
  },
});

export const releaseReclassifyLock = internalMutation({
  args: { canonicalId: v.string(), ownerToken: v.string() },
  handler: async (ctx, { canonicalId, ownerToken }) => {
    const rows = await ctx.db
      .query("reclassify_locks")
      .withIndex("by_canonical", (q) => q.eq("canonicalId", canonicalId))
      .collect();
    for (const row of rows) {
      if (row.ownerToken === ownerToken) {
        await ctx.db.delete(row._id);
      }
    }
    return { ok: true };
  },
});

export const patchBiomarkerValue = internalMutation({
  args: {
    valueId: v.id("biomarker_values"),
    patch: v.object({
      status: v.optional(
        v.union(
          v.literal("optimal"),
          v.literal("sub_optimal"),
          v.literal("action_required"),
          v.literal("unclassified"),
        ),
      ),
      unclassifiedReason: v.optional(
        v.union(
          v.literal("not_in_reference_db"),
          v.literal("profile_incomplete"),
          v.literal("pregnancy_sensitive"),
          v.literal("qualitative_value"),
          v.literal("unit_conversion_missing"),
        ),
      ),
      referenceRangeId: v.optional(v.id("biomarker_reference_ranges")),
      classifiedAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { valueId, patch }) => {
    await ctx.db.patch(valueId, patch);
    return { ok: true };
  },
});

export const recomputeBiomarkerReportCounts = internalMutation({
  args: {
    biomarkerReportId: v.id("biomarker_reports"),
    now: v.number(),
  },
  handler: async (ctx, { biomarkerReportId, now }) => {
    const values = await ctx.db
      .query("biomarker_values")
      .withIndex("by_report", (q) =>
        q.eq("biomarkerReportId", biomarkerReportId),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    const counts = {
      optimalCount: 0,
      subOptimalCount: 0,
      actionRequiredCount: 0,
      unclassifiedCount: 0,
    };
    for (const v of values) {
      if (v.status === "optimal") counts.optimalCount++;
      else if (v.status === "sub_optimal") counts.subOptimalCount++;
      else if (v.status === "action_required") counts.actionRequiredCount++;
      else counts.unclassifiedCount++;
    }
    await ctx.db.patch(biomarkerReportId, {
      ...counts,
      lastReclassifiedAt: now,
    });
    return counts;
  },
});

// STUB — Task 24 ships real impl
export const writeAuditLog = internalMutation({
  args: {
    adminUserId: v.union(v.id("users"), v.null()),
    action: v.union(
      v.literal("curation_resolve"),
      v.literal("curation_wont_fix"),
      v.literal("range_create"),
      v.literal("range_update"),
      v.literal("range_deactivate"),
      v.literal("range_reactivate"),
      v.literal("reclassify_canonical_commit"),
      v.literal("reclassify_all_preview"),
      v.literal("reclassify_all_commit"),
    ),
    targetTable: v.union(
      v.literal("biomarker_curation_queue"),
      v.literal("biomarker_reference_ranges"),
    ),
    targetId: v.string(),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    now: v.number(),
  },
  handler: async () => ({ ok: true as const }), // Task 24 fills this
});

export const sweepExpiredReclassifyLocks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("reclassify_locks")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();
    for (const row of expired) await ctx.db.delete(row._id);
    return { swept: expired.length };
  },
});
