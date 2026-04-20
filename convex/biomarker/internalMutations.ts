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
