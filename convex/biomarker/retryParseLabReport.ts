// convex/biomarker/retryParseLabReport.ts
//
// Patient-facing user-triggered retry mutation (Phase 2.5C, Task 6).
//
// Distinct from 2.5B's automatic retry cron: this is the path behind the
// "Retry" button on the parse-failed state in the patient portal. Rules:
//   - Lifetime cap of 3 retries per lab_report (tracked by `userRetryCount`).
//   - Only callable when status === "parse_failed".
//   - Only the owner can retry their own lab_report.
//   - Resets the per-attempt auto-retry budget (`retryCount` → 0) and wipes
//     all cron state (errorCode, errorMessage, nextRetryAt, lockedAt,
//     firstAttemptAt) so the next auto-retry budget starts fresh.
//   - Rate-limit buckets are NOT touched (distinct from `intakeUpload`).
//
// Auth: session-token pattern — see docs/decisions/2026-04-20-session-token-
// auth-in-2-5c-mutations.md. Plan text prescribed getUserIdentity(); this
// file overrides that per the decision note to match the codebase.

import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { logParseEvent } from "../lib/telemetry";

const USER_RETRY_CAP = 3;

export const retryParseLabReport = mutation({
  args: {
    token: v.string(),
    labReportId: v.id("lab_reports"),
  },
  handler: async (ctx, { token, labReportId }) => {
    // 1. Auth via session-token (matches intakeUpload / users.ts pattern).
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) {
      throw new ConvexError({ code: "unauthenticated" });
    }
    if (session.expiresAt < Date.now()) {
      throw new ConvexError({ code: "unauthenticated" });
    }
    const userId = session.userId;

    // 2. Fetch + ownership + state guards.
    const row = await ctx.db.get(labReportId);
    if (!row) {
      throw new ConvexError({ code: "not_found" });
    }
    if (row.userId !== userId) {
      throw new ConvexError({ code: "forbidden" });
    }
    if (row.status !== "parse_failed") {
      throw new ConvexError({
        code: "invalid_retry_state",
        status: row.status,
      });
    }
    const currentUserRetries = row.userRetryCount ?? 0;
    if (currentUserRetries >= USER_RETRY_CAP) {
      throw new ConvexError({ code: "retry_cap_exceeded" });
    }

    // 3. Reset pipeline state — wipe cron bookkeeping so the auto-retry
    //    budget starts from zero on the next run.
    await ctx.db.patch(labReportId, {
      status: "uploaded",
      userRetryCount: currentUserRetries + 1,
      retryCount: 0,
      errorCode: undefined,
      errorMessage: undefined,
      nextRetryAt: undefined,
      lockedAt: undefined,
      firstAttemptAt: undefined,
    });

    // 4. Reschedule parse immediately.
    await ctx.scheduler.runAfter(
      0,
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );

    // 5. Telemetry.
    logParseEvent({
      level: "info",
      labReportId,
      userId,
      event: "intake_retried",
      retryCount: currentUserRetries + 1,
    });

    return {
      labReportId,
      status: "uploaded" as const,
      userRetryCount: currentUserRetries + 1,
    };
  },
});
