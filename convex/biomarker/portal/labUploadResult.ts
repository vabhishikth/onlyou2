import { ConvexError, v } from "convex/values";

import { mutation } from "../../_generated/server";
import { createLabReportFromMutation } from "../lib/createLabReport";
import { writeNotificationFromMutation } from "../lib/notifications";
import { assertPortalEnabled } from "../lib/portalGates";

export const labUploadResult = mutation({
  args: {
    labPartnerToken: v.string(),
    labOrderId: v.id("lab_orders"),
    fileId: v.id("_storage"),
    mimeType: v.union(
      v.literal("application/pdf"),
      v.literal("image/jpeg"),
      v.literal("image/png"),
    ),
    fileSizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    assertPortalEnabled("LAB", process.env.CONVEX_DEPLOYMENT ?? "");

    if (!args.labPartnerToken || args.labPartnerToken.trim().length === 0) {
      throw new ConvexError({ code: "invalid_partner_token" });
    }

    const order = await ctx.db.get(args.labOrderId);
    if (!order) throw new ConvexError({ code: "not_found" });
    if (order.status !== "awaiting_results") {
      throw new ConvexError({
        code: "invalid_order_state",
        status: order.status,
      });
    }

    const { labReportId } = await createLabReportFromMutation(ctx, {
      userId: order.userId,
      source: "lab_upload",
      labOrderId: args.labOrderId,
      fileId: args.fileId,
      mimeType: args.mimeType,
      fileSizeBytes: args.fileSizeBytes,
      contentHash: `pending:${args.fileId}`,
    });

    await writeNotificationFromMutation(ctx, "lab_report_uploaded_for_you", {
      userId: order.userId,
      labReportId,
    });

    return { labReportId, status: "uploaded" as const };
  },
});
