// Patient read surface — returns the caller's own biomarker reports.
//
// Auth: session-token pattern — see docs/decisions/2026-04-20-session-token-
// auth-in-2-5c-mutations.md. NEVER use ctx.auth.getUserIdentity(); there is
// no identity provider wired (auth.config.ts: providers: []).
//
// No portal gate: this is the patient app, not a portal.
//
// Wave 4 (2.5D): each projected value now includes a `canonical` block
// sourced from biomarker_reference_ranges (the single source of canonical
// metadata). The lookup first tries referenceRangeId (direct _id pointer),
// then falls back to the by_canonical_id index on canonicalId string.
// Returns null when no matching range exists (unclassified markers).
// Doctor-portal query (myPatientBiomarkerReports) is NOT touched.

import { ConvexError, v } from "convex/values";

import { query } from "../../_generated/server";

export const myBiomarkerReports = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({ code: "unauthenticated" });
    }
    const caller = await ctx.db.get(session.userId);
    if (!caller || caller.role !== "PATIENT") {
      throw new ConvexError({ code: "forbidden" });
    }

    const reports = await ctx.db
      .query("biomarker_reports")
      .withIndex("by_user_analyzed", (q) => q.eq("userId", session.userId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Project minimal fields — any new schema field must be explicitly added
    // here to become patient-visible, rather than auto-leaking.
    const result = [];
    for (const report of reports) {
      const values = await ctx.db
        .query("biomarker_values")
        .withIndex("by_report", (q) => q.eq("biomarkerReportId", report._id))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();

      const projectedValues = [];
      for (const val of values) {
        // Canonical join: prefer the direct referenceRangeId pointer, then
        // fall back to querying by_canonical_id string. Returns null for
        // unclassified markers that have no matching reference range.
        let canonical: {
          _id: string;
          displayName: string;
          category: string;
          canonicalUnit: string;
        } | null = null;
        let range: {
          optimalMin: number;
          optimalMax: number;
          actionBelow: number | null;
          actionAbove: number | null;
        } | null = null;

        const row = val.referenceRangeId
          ? await ctx.db.get(val.referenceRangeId)
          : val.canonicalId
            ? await ctx.db
                .query("biomarker_reference_ranges")
                .withIndex("by_canonical_id", (q) =>
                  q.eq("canonicalId", val.canonicalId as string),
                )
                .first()
            : null;

        if (row) {
          canonical = {
            _id: row._id,
            displayName: row.displayName,
            category: row.category,
            canonicalUnit: row.canonicalUnit,
          };
          range = {
            optimalMin: row.optimalMin,
            optimalMax: row.optimalMax,
            actionBelow: row.actionBelow ?? null,
            actionAbove: row.actionAbove ?? null,
          };
        }

        // Trend + prev: multi-point history for this (user, canonical).
        // Uses by_user_canonical_date index, excludes soft-deleted rows,
        // sorts ascending by collectionDate, and drops non-numeric rows.
        let trend: { value: number; collectionDate: string }[] = [];
        let prev: { value: number; collectionDate: string } | null = null;

        if (val.canonicalId && val.numericValue !== undefined) {
          const history = await ctx.db
            .query("biomarker_values")
            .withIndex("by_user_canonical_date", (q) =>
              q
                .eq("userId", session.userId)
                .eq("canonicalId", val.canonicalId as string),
            )
            .filter((q) => q.eq(q.field("deletedAt"), undefined))
            .collect();

          trend = history
            .filter(
              (h) =>
                h.numericValue !== undefined && h.collectionDate !== undefined,
            )
            .sort((a, b) =>
              (a.collectionDate as string).localeCompare(
                b.collectionDate as string,
              ),
            )
            .map((h) => ({
              value: h.numericValue as number,
              collectionDate: h.collectionDate as string,
            }));

          const idx = trend.findIndex(
            (p) => p.collectionDate === val.collectionDate,
          );
          prev = idx > 0 ? trend[idx - 1] : null;
        }

        projectedValues.push({
          _id: val._id,
          canonicalId: val.canonicalId,
          nameOnReport: val.nameOnReport,
          valueType: val.valueType,
          rawValue: val.rawValue,
          rawUnit: val.rawUnit,
          numericValue: val.numericValue,
          status: val.status,
          classifiedAt: val.classifiedAt,
          canonical,
          range,
          trend,
          prev,
        });
      }

      result.push({
        report: {
          _id: report._id,
          userId: report.userId,
          labReportId: report.labReportId,
          narrative: report.narrative,
          optimalCount: report.optimalCount,
          subOptimalCount: report.subOptimalCount,
          actionRequiredCount: report.actionRequiredCount,
          unclassifiedCount: report.unclassifiedCount,
          analyzedAt: report.analyzedAt,
        },
        values: projectedValues,
      });
    }
    return result;
  },
});
