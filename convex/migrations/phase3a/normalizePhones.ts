// One-shot migration. Invoked once per deployment via
//   npx convex run migrations/phase3a/normalizePhones:run
// Idempotent: re-running after success reports 0 updates.
//
// Strategy:
//   1. Scan users. For each row whose phone !== normalizePhoneE164(phone):
//      - If no row exists at the canonical phone: patch in place.
//      - Else: merge — reassign child rows (all userId-scoped tables) to
//        the canonical user, delete the legacy row.
//   2. Scan otpAttempts. Normalise phone in place. If a canonical-form
//      row already exists, drop it first to avoid the transient state
//      where two rows share the same phone (index is non-unique but
//      downstream code assumes uniqueness via `.unique()`).

import { normalizePhoneE164 } from "../../../packages/core/src/phone/e164";
import { Id } from "../../_generated/dataModel";
import { internalMutation, MutationCtx } from "../../_generated/server";

type MigrationResult = {
  usersUpdated: number;
  usersAlreadyCanonical: number;
  usersDeleted: number;
  otpAttemptsUpdated: number;
};

/**
 * Reassigns every userId-scoped child row from one user to another.
 * Called during the merge path when a legacy (un-normalised phone) user
 * already has a canonical counterpart. All seven tables that carry
 * `userId: v.id("users")` are covered here.
 *
 * NOTE: collect() on each table is scoped to a single userId via index —
 * this is fine at MVP scale. Revisit if per-user row counts grow very large.
 */
async function reassignUserReferences(
  ctx: MutationCtx,
  fromUserId: Id<"users">,
  toUserId: Id<"users">,
): Promise<void> {
  // sessions
  for (const s of await ctx.db
    .query("sessions")
    .withIndex("by_user", (q) => q.eq("userId", fromUserId))
    .collect()) {
    await ctx.db.patch(s._id, { userId: toUserId });
  }

  // lab_reports
  for (const r of await ctx.db
    .query("lab_reports")
    .withIndex("by_user_created", (q) => q.eq("userId", fromUserId))
    .collect()) {
    await ctx.db.patch(r._id, { userId: toUserId });
  }

  // biomarker_reports
  for (const r of await ctx.db
    .query("biomarker_reports")
    .withIndex("by_user_analyzed", (q) => q.eq("userId", fromUserId))
    .collect()) {
    await ctx.db.patch(r._id, { userId: toUserId });
  }

  // biomarker_values
  for (const v of await ctx.db
    .query("biomarker_values")
    .filter((q) => q.eq(q.field("userId"), fromUserId))
    .collect()) {
    await ctx.db.patch(v._id, { userId: toUserId });
  }

  // lab_orders
  for (const o of await ctx.db
    .query("lab_orders")
    .withIndex("by_user", (q) => q.eq("userId", fromUserId))
    .collect()) {
    await ctx.db.patch(o._id, { userId: toUserId });
  }

  // parse_rate_limits
  for (const l of await ctx.db
    .query("parse_rate_limits")
    .filter((q) => q.eq(q.field("userId"), fromUserId))
    .collect()) {
    await ctx.db.patch(l._id, { userId: toUserId });
  }

  // notifications
  for (const n of await ctx.db
    .query("notifications")
    .withIndex("by_user_created", (q) => q.eq("userId", fromUserId))
    .collect()) {
    await ctx.db.patch(n._id, { userId: toUserId });
  }
}

export const run = internalMutation({
  args: {},
  handler: async (ctx): Promise<MigrationResult> => {
    let usersUpdated = 0;
    let usersAlreadyCanonical = 0;
    let usersDeleted = 0;
    let otpAttemptsUpdated = 0;

    // NOTE: collect() on the entire users table is fine for MVP scale. Revisit
    // with pagination when the table crosses ~50k rows.
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      // Skip users without a phone (optional field in schema)
      if (!u.phone) {
        usersAlreadyCanonical++;
        continue;
      }

      let normalized: string;
      try {
        normalized = normalizePhoneE164(u.phone);
      } catch {
        console.warn(
          `[phase3a] skipping user ${u._id} — unparseable phone (prefix: ${u.phone.slice(0, 4)})`,
        );
        continue;
      }

      if (normalized === u.phone) {
        usersAlreadyCanonical++;
        continue;
      }

      const canonical = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", normalized))
        .unique();

      if (!canonical) {
        await ctx.db.patch(u._id, { phone: normalized });
        usersUpdated++;
        continue;
      }

      // Merge policy: canonical row is authoritative. Profile fields on the
      // legacy row (name/dob/gender/address) are discarded — rely on the user
      // re-completing their profile if it got cleared. Bidirectional merge is
      // tracked in docs/DEFERRED.md under Phase 8.
      await reassignUserReferences(ctx, u._id, canonical._id);
      await ctx.db.delete(u._id);
      usersDeleted++;
    }

    const attempts = await ctx.db.query("otpAttempts").collect();
    for (const a of attempts) {
      let normalized: string;
      try {
        normalized = normalizePhoneE164(a.phone);
      } catch {
        // Unparseable phone — drop the row (5-minute TTL, safe to purge)
        await ctx.db.delete(a._id);
        continue;
      }
      if (normalized !== a.phone) {
        const dupe = await ctx.db
          .query("otpAttempts")
          .withIndex("by_phone", (q) => q.eq("phone", normalized))
          .unique();
        if (dupe) await ctx.db.delete(dupe._id);
        await ctx.db.patch(a._id, { phone: normalized });
        otpAttemptsUpdated++;
      }
    }

    return {
      usersUpdated,
      usersAlreadyCanonical,
      usersDeleted,
      otpAttemptsUpdated,
    };
  },
});
