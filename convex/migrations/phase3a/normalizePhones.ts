// One-shot migration. Invoked once per deployment via
//   npx convex run migrations/phase3a/normalizePhones:run
// Idempotent: re-running after success reports 0 updates.
//
// Strategy:
//   1. Scan users. For each row whose phone !== normalizePhoneE164(phone):
//      - If no row exists at the canonical phone: patch in place.
//      - Else: merge — reassign child rows (sessions) to the canonical
//        user, delete the legacy row.
//   2. Scan otpAttempts. Normalise phone in place. If a canonical-form
//      row already exists, drop it first to avoid the transient state
//      where two rows share the same phone (index is non-unique but
//      downstream code assumes uniqueness via `.unique()`).

import { normalizePhoneE164 } from "../../../packages/core/src/phone/e164";
import { internalMutation } from "../../_generated/server";

type MigrationResult = {
  usersUpdated: number;
  usersAlreadyCanonical: number;
  usersDeleted: number;
  otpAttemptsUpdated: number;
};

export const run = internalMutation({
  args: {},
  handler: async (ctx): Promise<MigrationResult> => {
    let usersUpdated = 0;
    let usersAlreadyCanonical = 0;
    let usersDeleted = 0;
    let otpAttemptsUpdated = 0;

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
          `[phase3a] skipping user ${u._id} — unparseable phone ${u.phone}`,
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

      // Merge: reassign sessions to the canonical user, then delete the legacy row
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .collect();
      for (const s of sessions) {
        await ctx.db.patch(s._id, { userId: canonical._id });
      }
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
