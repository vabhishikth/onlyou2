// Shared accessor for lab_reports.by_user_hash. Every consumer in the
// codebase MUST go through this helper — the content-hash-guard test
// fails CI if any other file touches the index directly.
//
// Why: intakeUpload + labUploadResult write placeholder contentHash values
// of the form "pending:<fileId>" before parseLabReport computes the real
// SHA-256. A raw by_user_hash consumer would false-match those placeholders
// during the insert→parse window. This helper filters PENDING_HASH_PREFIX
// out unconditionally.

import { v } from "convex/values";

import type { Doc, Id } from "../../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../../_generated/server";

import { PENDING_HASH_PREFIX } from "./createLabReport";

export async function findLabReportByContentHash(
  ctx: QueryCtx,
  userId: Id<"users">,
  contentHash: string,
): Promise<Doc<"lab_reports"> | null> {
  if (contentHash.startsWith(PENDING_HASH_PREFIX)) return null;

  const rows = await ctx.db
    .query("lab_reports")
    .withIndex("by_user_hash", (q) =>
      q.eq("userId", userId).eq("contentHash", contentHash),
    )
    .collect();

  for (const r of rows) {
    if (!r.contentHash.startsWith(PENDING_HASH_PREFIX)) return r;
  }
  return null;
}

// Thin query wrapper so tests can reach the helper via the Convex RPC layer.
// Application code should import findLabReportByContentHash directly.
export const findLabReportByContentHashQuery = internalQuery({
  args: { userId: v.id("users"), contentHash: v.string() },
  handler: async (ctx, args) =>
    findLabReportByContentHash(ctx, args.userId, args.contentHash),
});
