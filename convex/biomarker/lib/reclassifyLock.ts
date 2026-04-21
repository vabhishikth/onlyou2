import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";

export const DEFAULT_LOCK_TTL_MS = 5 * 60 * 1000;

export async function acquireLock(
  ctx: ActionCtx,
  canonicalId: string,
  action:
    | "reclassifyForCanonicalId"
    | "reclassifyAllReportsPreview"
    | "reclassifyAllReportsCommit",
): Promise<string> {
  const result = await ctx.runMutation(
    internal.biomarker.internalMutations.acquireReclassifyLock,
    { canonicalId, action, ttlMs: DEFAULT_LOCK_TTL_MS },
  );
  if (!result.acquired) {
    throw new Error("reclassify_in_progress");
  }
  return result.ownerToken!;
}

export async function releaseLock(
  ctx: ActionCtx,
  canonicalId: string,
  ownerToken: string,
): Promise<void> {
  await ctx.runMutation(
    internal.biomarker.internalMutations.releaseReclassifyLock,
    { canonicalId, ownerToken },
  );
}
