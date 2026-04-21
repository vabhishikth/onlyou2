// convex/biomarker/internal/upsertCurationRow.ts
//
// Inserts or increments a biomarker_curation_queue row for every marker
// extracted that did not classify against the reference DB. Idempotent on
// normalizedKey = normalizeKey(nameOnReport, rawUnit) — see
// ../lib/normalizeKey.ts. The shared helper is also used by parseLabReport
// when persisting biomarker_values rows so that a queue row and its
// contributing value rows resolve to the same key.

import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { normalizeKey } from "../lib/normalizeKey";

export const upsertCurationRow = internalMutation({
  args: {
    nameOnReport: v.string(),
    rawUnit: v.optional(v.string()),
    sampleLabPrintedRange: v.optional(v.string()),
    firstSeenBiomarkerReportId: v.id("biomarker_reports"),
    now: v.number(),
    // When the caller has already decided this marker is a lab panel code
    // (not a real biomarker), skip clinician review by marking the queue row
    // resolved as wont_fix immediately. Existing "pending" rows are upgraded
    // to wont_fix on subsequent sightings; already-resolved rows are untouched.
    resolveAsWontFix: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const normalizedKey = normalizeKey(args.nameOnReport, args.rawUnit);
    const existing = await ctx.db
      .query("biomarker_curation_queue")
      .withIndex("by_normalized_key", (q) =>
        q.eq("normalizedKey", normalizedKey),
      )
      .first();

    if (existing) {
      const patch: Record<string, unknown> = {
        occurrenceCount: existing.occurrenceCount + 1,
        lastSeenAt: args.now,
      };
      if (args.resolveAsWontFix && existing.status === "pending") {
        patch.status = "wont_fix";
        patch.resolvedAt = args.now;
      }
      await ctx.db.patch(existing._id, patch);
      return { queueId: existing._id, normalizedKey };
    }

    const status = args.resolveAsWontFix
      ? ("wont_fix" as const)
      : ("pending" as const);
    const queueId = await ctx.db.insert("biomarker_curation_queue", {
      normalizedKey,
      nameOnReport: args.nameOnReport,
      rawUnit: args.rawUnit,
      sampleLabPrintedRange: args.sampleLabPrintedRange,
      firstSeenBiomarkerReportId: args.firstSeenBiomarkerReportId,
      occurrenceCount: 1,
      lastSeenAt: args.now,
      status,
      resolvedAt: args.resolveAsWontFix ? args.now : undefined,
    });
    return { queueId, normalizedKey };
  },
});
