// convex/biomarker/internal/seedRanges.ts
import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";

const rowValidator = v.object({
  canonicalId: v.string(),
  displayName: v.string(),
  aliases: v.array(v.string()),
  category: v.string(),
  canonicalUnit: v.string(),
  ageMin: v.number(),
  ageMax: v.number(),
  sex: v.union(v.literal("male"), v.literal("female"), v.literal("any")),
  pregnancySensitive: v.boolean(),
  optimalMin: v.number(),
  optimalMax: v.number(),
  subOptimalBelowMin: v.optional(v.number()),
  subOptimalAboveMax: v.optional(v.number()),
  actionBelow: v.optional(v.number()),
  actionAbove: v.optional(v.number()),
  explainer: v.string(),
  source: v.string(),
  clinicalReviewer: v.optional(v.string()),
  reviewedAt: v.optional(v.number()),
  isActive: v.boolean(),
});

export const upsertRanges = internalMutation({
  args: { rows: v.array(rowValidator) },
  handler: async (ctx, { rows }) => {
    let inserted = 0;
    let updated = 0;
    const now = Date.now();

    for (const row of rows) {
      const existing = await ctx.db
        .query("biomarker_reference_ranges")
        .withIndex("by_canonical_id", (q) =>
          q
            .eq("canonicalId", row.canonicalId)
            .eq("sex", row.sex)
            .eq("ageMin", row.ageMin),
        )
        .filter((q) => q.eq(q.field("ageMax"), row.ageMax))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, { ...row, updatedAt: now });
        updated += 1;
      } else {
        await ctx.db.insert("biomarker_reference_ranges", {
          ...row,
          updatedAt: now,
        });
        inserted += 1;
      }
    }

    return { inserted, updated, total: rows.length };
  },
});
