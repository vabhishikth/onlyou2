import { v } from "convex/values";

import { internalMutation } from "../_generated/server";

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
