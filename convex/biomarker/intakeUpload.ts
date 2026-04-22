// convex/biomarker/intakeUpload.ts
//
// Patient-facing upload mutation (Phase 2.5C, Task 5).
//
// Flow: auth → kill-switch → size gate → rate-limit read →
//   lab_reports insert (+ parse schedule via shared helper) →
//   atomic rate-limit bucket upsert (both day + month) → telemetry.
//
// Atomicity: the rate-limit read + insert + bucket upsert all run in a
// single mutation transaction, so two concurrent calls cannot both pass
// the count check before the other increments. The `createLabReportFromMutation`
// helper uses ctx.scheduler.runAfter, which Convex binds to transaction
// commit — if anything in this mutation throws, the parse is never
// scheduled.

import { ConvexError, v } from "convex/values";

import { mutation } from "../_generated/server";
import { logParseEvent } from "../lib/telemetry";

import {
  createLabReportFromMutation,
  MAX_FILE_SIZE_BYTES,
  PENDING_HASH_PREFIX,
} from "./lib/createLabReport";
import {
  istDayBucket,
  istMonthBucket,
  nextMidnightIST,
  nextFirstOfMonthIST,
  DAILY_UPLOAD_LIMIT,
  MONTHLY_UPLOAD_LIMIT,
} from "./lib/rateLimits";

export const intakeUpload = mutation({
  args: {
    token: v.string(),
    fileId: v.id("_storage"),
    mimeType: v.union(
      v.literal("application/pdf"),
      v.literal("image/jpeg"),
      v.literal("image/png"),
    ),
    fileSizeBytes: v.number(),
    source: v.literal("patient_upload"),
    labOrderId: v.optional(v.id("lab_orders")),
  },
  handler: async (ctx, args) => {
    // 1. Auth — session-token lookup (matches users.ts pattern; ONLYOU v2
    //    never wired Convex's built-in identity bridge).
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!session) {
      throw new ConvexError({ code: "unauthenticated" });
    }
    if (session.expiresAt < Date.now()) {
      throw new ConvexError({ code: "unauthenticated" });
    }
    const userId = session.userId;

    // 2. Kill-switch (shipped in 2.5A).
    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", "BIOMARKER_PARSING_ENABLED"))
      .first();
    if (flag && flag.value === false) {
      throw new ConvexError({ code: "parsing_disabled" });
    }

    // 3. Size gate (also enforced inside the helper; we check here so the
    //    caller gets a ConvexError with a structured `code` field before
    //    the helper’s generic Error is thrown).
    if (args.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new ConvexError({ code: "file_too_large" });
    }

    // 4. Rate-limit read. Day bucket first, then month bucket. Both checks
    //    use the same `now` so the buckets computed here and the buckets
    //    we upsert below line up exactly.
    const now = Date.now();
    const dayKey = istDayBucket(now);
    const monthKey = istMonthBucket(now);
    const dayRow = await ctx.db
      .query("parse_rate_limits")
      .withIndex("by_user_window", (q) =>
        q.eq("userId", userId).eq("windowType", "day").eq("dateBucket", dayKey),
      )
      .first();
    const monthRow = await ctx.db
      .query("parse_rate_limits")
      .withIndex("by_user_window", (q) =>
        q
          .eq("userId", userId)
          .eq("windowType", "month")
          .eq("dateBucket", monthKey),
      )
      .first();
    if (dayRow && dayRow.count >= DAILY_UPLOAD_LIMIT) {
      throw new ConvexError({
        code: "rate_limited:day",
        resetAt: nextMidnightIST(now),
      });
    }
    if (monthRow && monthRow.count >= MONTHLY_UPLOAD_LIMIT) {
      throw new ConvexError({
        code: "rate_limited:month",
        resetAt: nextFirstOfMonthIST(now),
      });
    }

    // 5. contentHash placeholder. The schema requires a non-null string;
    //    the authoritative SHA-256 is computed server-side during
    //    parseLabReport (see 2.5B). We store a `pending:<fileId>` proxy
    //    so the row is valid but dedupe can’t false-match a real hash.
    const contentHashProxy = `${PENDING_HASH_PREFIX}${args.fileId}`;

    // 6. Insert lab_report + schedule parse via the shared helper.
    const { labReportId } = await createLabReportFromMutation(ctx, {
      userId,
      source: args.source,
      labOrderId: args.labOrderId,
      fileId: args.fileId,
      mimeType: args.mimeType,
      fileSizeBytes: args.fileSizeBytes,
      contentHash: contentHashProxy,
    });

    // 7. Upsert rate-limit buckets (both day + month) atomically with the
    //    insert. Because Convex mutations are serializable transactions,
    //    this prevents the classic TOCTOU race where two concurrent
    //    uploads both pass the limit check before either increments.
    if (dayRow) {
      await ctx.db.patch(dayRow._id, {
        count: dayRow.count + 1,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("parse_rate_limits", {
        userId,
        windowType: "day",
        dateBucket: dayKey,
        count: 1,
        updatedAt: now,
      });
    }
    if (monthRow) {
      await ctx.db.patch(monthRow._id, {
        count: monthRow.count + 1,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("parse_rate_limits", {
        userId,
        windowType: "month",
        dateBucket: monthKey,
        count: 1,
        updatedAt: now,
      });
    }

    // 8. Telemetry.
    logParseEvent({
      level: "info",
      labReportId,
      userId,
      event: "intake_uploaded",
    });

    return { labReportId, status: "uploaded" as const };
  },
});
