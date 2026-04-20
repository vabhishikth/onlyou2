import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx, MutationCtx } from "../../_generated/server";

export interface CreateLabReportArgs {
  userId: Id<"users">;
  source: "patient_upload" | "lab_upload" | "nurse_flow";
  labOrderId?: Id<"lab_orders">;
  fileId: Id<"_storage">;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  fileSizeBytes: number;
  contentHash: string;
}

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export function validateSizeAndMime(
  args: Pick<CreateLabReportArgs, "fileSizeBytes" | "mimeType">,
): void {
  if (args.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error("file_too_large");
  }
  const allowedMimes = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowedMimes.includes(args.mimeType)) {
    throw new Error("unsupported_mime");
  }
}

/**
 * Shared write path used by both createLabReportFromMutation (direct) and
 * insertLabReportRow internalMutation (via ctx.runMutation). Keeps the
 * insert + optional lab-order patch in one place so schema changes touch
 * one site, not two. Callers pass an explicit `now` so the internal
 * mutation can forward the arg it received.
 */
export async function insertLabReportRowInline(
  ctx: MutationCtx,
  args: CreateLabReportArgs,
  now: number,
): Promise<Id<"lab_reports">> {
  const labReportId = await ctx.db.insert("lab_reports", {
    userId: args.userId,
    source: args.source,
    labOrderId: args.labOrderId,
    fileId: args.fileId,
    mimeType: args.mimeType,
    fileSizeBytes: args.fileSizeBytes,
    contentHash: args.contentHash,
    status: "uploaded",
    retryCount: 0,
    userRetryCount: 0,
    createdAt: now,
  });
  if (args.labOrderId && args.source !== "patient_upload") {
    await ctx.db.patch(args.labOrderId, {
      labReportId,
      status: "results_uploaded" as const,
      updatedAt: now,
    });
  }
  return labReportId;
}

/**
 * Called from a mutation handler. Inserts lab_reports row and schedules
 * parseLabReport. Rate-limit checks happen in the CALLER, not here —
 * this helper is shared across patient + lab + nurse surfaces and only
 * patient uploads are rate-limited.
 */
export async function createLabReportFromMutation(
  ctx: MutationCtx,
  args: CreateLabReportArgs,
): Promise<{ labReportId: Id<"lab_reports"> }> {
  validateSizeAndMime(args);
  const now = Date.now();
  const labReportId = await insertLabReportRowInline(ctx, args, now);
  await ctx.scheduler.runAfter(
    0,
    internal.biomarker.parseLabReport.parseLabReport,
    {
      labReportId,
    },
  );
  return { labReportId };
}

/**
 * Called from an action handler (e.g., simulateLabUpload). Uses internal
 * mutation for the write, then scheduler.runAfter for the parse kickoff.
 */
export async function createLabReportFromAction(
  ctx: ActionCtx,
  args: CreateLabReportArgs,
): Promise<{ labReportId: Id<"lab_reports"> }> {
  validateSizeAndMime(args);
  const now = Date.now();
  const { labReportId } = await ctx.runMutation(
    internal.biomarker.internalMutations.insertLabReportRow,
    { ...args, now },
  );
  await ctx.scheduler.runAfter(
    0,
    internal.biomarker.parseLabReport.parseLabReport,
    {
      labReportId,
    },
  );
  return { labReportId };
}
