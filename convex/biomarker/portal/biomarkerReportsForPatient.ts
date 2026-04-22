// Doctor-portal read surface.
//
// Auth: session-token pattern — see docs/decisions/2026-04-20-session-token-
// auth-in-2-5c-mutations.md. Plan prescribed getUserIdentity(); codebase
// has no identity provider wired (auth.config.ts: providers: []).

import { ConvexError, v } from "convex/values";

import { query } from "../../_generated/server";
import { assertPortalEnabled } from "../lib/portalGates";

export const biomarkerReportsForPatient = query({
  args: {
    token: v.string(),
    patientId: v.id("users"),
  },
  handler: async (ctx, { token, patientId }) => {
    assertPortalEnabled("DOCTOR", process.env.CONVEX_DEPLOYMENT ?? "");

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({ code: "unauthenticated" });
    }
    const caller = await ctx.db.get(session.userId);
    if (!caller || caller.role !== "DOCTOR") {
      throw new ConvexError({ code: "forbidden" });
    }

    const reports = await ctx.db
      .query("biomarker_reports")
      .withIndex("by_user_analyzed", (q) => q.eq("userId", patientId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Project minimal fields — this is the first external-party read surface
    // for biomarker data. Any new schema field added later must be explicitly
    // added here to become doctor-visible, rather than auto-leaking.
    const result = [];
    for (const report of reports) {
      const values = await ctx.db
        .query("biomarker_values")
        .withIndex("by_report", (q) => q.eq("biomarkerReportId", report._id))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();
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
        values: values.map((v) => ({
          _id: v._id,
          canonicalId: v.canonicalId,
          nameOnReport: v.nameOnReport,
          valueType: v.valueType,
          rawValue: v.rawValue,
          rawUnit: v.rawUnit,
          numericValue: v.numericValue,
          status: v.status,
          classifiedAt: v.classifiedAt,
        })),
      });
    }
    return result;
  },
});
