// convex/biomarker/internal/upsertCurationRow.ts
//
// Inserts or increments a biomarker_curation_queue row for every marker
// extracted that did not classify against the reference DB. Idempotent on
// normalizedKey = normalize(nameOnReport) + "|" + normalize(rawUnit).

import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";

export const upsertCurationRow = internalMutation({
  args: {
    nameOnReport: v.string(),
    rawUnit: v.optional(v.string()),
    sampleLabPrintedRange: v.optional(v.string()),
    firstSeenBiomarkerReportId: v.id("biomarker_reports"),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const normalizedKey = normalize(args.nameOnReport, args.rawUnit);
    const existing = await ctx.db
      .query("biomarker_curation_queue")
      .withIndex("by_normalized_key", (q) =>
        q.eq("normalizedKey", normalizedKey),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        occurrenceCount: existing.occurrenceCount + 1,
        lastSeenAt: args.now,
      });
      return existing._id;
    }

    return await ctx.db.insert("biomarker_curation_queue", {
      normalizedKey,
      nameOnReport: args.nameOnReport,
      rawUnit: args.rawUnit,
      sampleLabPrintedRange: args.sampleLabPrintedRange,
      firstSeenBiomarkerReportId: args.firstSeenBiomarkerReportId,
      occurrenceCount: 1,
      lastSeenAt: args.now,
      status: "pending",
    });
  },
});

function normalize(name: string, unit: string | undefined): string {
  const n = name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const u = (unit ?? "none")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9/%_.-]/g, "");
  return `${n}|${u}`;
}
