// Photo upload surface for consultation flow.
// Session-token auth (never ctx.auth.getUserIdentity — auth.config.ts has providers:[]).

import { ConvexError, v } from "convex/values";

import { mutation, type MutationCtx } from "../_generated/server";
import { photoSlotValidator } from "../lib/photoSlot";

import { mimeTypeValidator } from "./schema";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

async function requireSessionUser(ctx: MutationCtx, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError({ code: "unauthenticated" });
  }
  return session.userId;
}

export const generatePhotoUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireSessionUser(ctx, token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const recordPhoto = mutation({
  args: {
    token: v.string(),
    consultationId: v.id("consultations"),
    slot: photoSlotValidator,
    fileId: v.id("_storage"),
    mimeType: mimeTypeValidator,
    fileSizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSessionUser(ctx, args.token);

    if (args.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new ConvexError({ code: "file_too_large" });
    }
    if (args.fileSizeBytes <= 0 || !Number.isFinite(args.fileSizeBytes)) {
      throw new ConvexError({ code: "invalid_file_size" });
    }

    const consultation = await ctx.db.get(args.consultationId);
    if (!consultation || consultation.deletedAt) {
      throw new ConvexError({ code: "not_found" });
    }
    if (consultation.userId !== userId) {
      throw new ConvexError({ code: "forbidden" });
    }

    // Soft-delete any prior photo for this (consultationId, slot).
    const existing = await ctx.db
      .query("photos")
      .withIndex("by_consultation_slot", (q) =>
        q.eq("consultationId", args.consultationId).eq("slot", args.slot),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    for (const e of existing) {
      await ctx.db.patch(e._id, { deletedAt: Date.now() });
    }

    const photoId = await ctx.db.insert("photos", {
      consultationId: args.consultationId,
      userId,
      slot: args.slot,
      fileId: args.fileId,
      mimeType: args.mimeType,
      fileSizeBytes: args.fileSizeBytes,
      uploadedAt: Date.now(),
    });
    return { photoId };
  },
});
