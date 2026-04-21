import { ConvexError, v } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import { assertPortalEnabled } from "../lib/portalGates";

export const biomarkerReportsForPatient = query({
  args: {
    patientId: v.id("users"),
  },
  handler: async (ctx, { patientId }) => {
    assertPortalEnabled("DOCTOR", process.env.CONVEX_DEPLOYMENT ?? "");

    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new ConvexError({ code: "unauthenticated" });
    const callerId = ident.subject as Id<"users">;
    const caller = await ctx.db.get(callerId);
    if (!caller || caller.role !== "DOCTOR") {
      throw new ConvexError({ code: "forbidden" });
    }

    const reports = await ctx.db
      .query("biomarker_reports")
      .withIndex("by_user_analyzed", (q) => q.eq("userId", patientId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const result = [];
    for (const report of reports) {
      const values = await ctx.db
        .query("biomarker_values")
        .withIndex("by_report", (q) => q.eq("biomarkerReportId", report._id))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();
      result.push({ report, values });
    }
    return result;
  },
});
