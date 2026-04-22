// convex/admin.ts
//
// Dev-only administrative operations. Every mutation + action in this file
// MUST runtime-check that the deployment is not production before doing
// anything. Phase 2.5A ships the scaffold only; Plans 2.5B/C add actual
// operations (simulateLabUpload etc.).
//
// Guard pattern:
//   assertNotProd();
// Throws "admin operations are disabled in production" if the current
// Convex deployment name matches a production pattern.

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { createLabReportFromAction } from "./biomarker/lib/createLabReport";
import { isProdDeployment } from "./lib/envGuards";

export function assertNotProd(): void {
  if (isProdDeployment(process.env.CONVEX_DEPLOYMENT ?? "")) {
    throw new Error(
      "admin operations are disabled in production (CONVEX_DEPLOYMENT matched a prod pattern)",
    );
  }
}

export const triggerParseForLabReport = internalMutation({
  args: { labReportId: v.id("lab_reports") },
  handler: async (ctx, { labReportId }) => {
    assertNotProd();
    await ctx.scheduler.runAfter(
      0,
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    return { scheduled: true };
  },
});

export const simulateLabUpload = action({
  args: {
    userId: v.id("users"),
    labOrderId: v.optional(v.id("lab_orders")),
    fileId: v.id("_storage"),
    mimeType: v.union(
      v.literal("application/pdf"),
      v.literal("image/jpeg"),
      v.literal("image/png"),
    ),
    fileSizeBytes: v.number(),
    source: v.union(v.literal("lab_upload"), v.literal("nurse_flow")),
  },
  handler: async (ctx, args) => {
    // Dashboard-only dev stub. `assertNotProd()` blocks prod; real admin
    // role enforcement lives behind Phase 5's admin portal. Identity is not
    // asserted here because the Convex dashboard invokes actions without
    // a user identity — same pattern as `triggerParseForLabReport`.
    assertNotProd();

    return await createLabReportFromAction(ctx, {
      userId: args.userId,
      source: args.source,
      labOrderId: args.labOrderId,
      fileId: args.fileId,
      mimeType: args.mimeType,
      fileSizeBytes: args.fileSizeBytes,
      contentHash: `pending:${args.fileId}`,
    });
  },
});

type SeedAdminUserResult =
  | { existing: true; userId: Id<"users"> }
  | { created: true; userId: Id<"users"> };

/**
 * Dev-only upload URL generator for the E2E driver script
 * (scripts/run-manual-e2e.ts). Internal — script invokes it via
 * `npx convex run admin:generateUploadUrl`, which uses the admin deploy key.
 * `assertNotProd()` is the defense-in-depth gate.
 */
export const generateUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => {
    assertNotProd();
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Dev-only E2E status probe. Returns the lab_report row plus any
 * biomarker_report + biomarker_values + notifications for the owning user,
 * all in one round-trip. Used by scripts/run-manual-e2e.ts to poll until the
 * parse pipeline reaches a terminal state. Internal — script invokes via
 * `npx convex run admin:getE2EStatus`. `assertNotProd()` is the
 * defense-in-depth gate.
 */
export const getE2EStatus = internalQuery({
  args: { labReportId: v.id("lab_reports") },
  handler: async (ctx, { labReportId }) => {
    assertNotProd();
    const labReport = await ctx.db.get(labReportId);
    if (!labReport) {
      return {
        labReport: null,
        biomarkerReport: null,
        values: [],
        notifications: [],
      };
    }
    const biomarkerReport = await ctx.db
      .query("biomarker_reports")
      .withIndex("by_lab_report", (q) => q.eq("labReportId", labReportId))
      .unique();
    const values = biomarkerReport
      ? await ctx.db
          .query("biomarker_values")
          .withIndex("by_report", (q) =>
            q.eq("biomarkerReportId", biomarkerReport._id),
          )
          .collect()
      : [];
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", labReport.userId))
      .collect();
    return { labReport, biomarkerReport, values, notifications };
  },
});

export const seedAdminUser = internalAction({
  args: { phone: v.string(), role: v.string() },
  handler: async (ctx, { phone, role }): Promise<SeedAdminUserResult> => {
    assertNotProd();
    if (role !== "ADMIN") {
      throw new Error("only ADMIN role seedable here");
    }
    const existing = await ctx.runQuery(internal.users.getUserByPhone, {
      phone,
    });
    if (existing) return { existing: true, userId: existing._id };
    const userId = await ctx.runMutation(internal.users.createUser, {
      phone,
      role: "ADMIN",
      phoneVerified: true,
      profileComplete: true,
    });
    return { created: true, userId };
  },
});
