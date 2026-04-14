import {
  FEATURE_FLAGS,
  DEFAULT_FLAGS,
  type FeatureFlag,
} from "../packages/core/src/flags";

import { query, mutation } from "./_generated/server";

export const getFlags = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("featureFlags").collect();
    const result: Record<string, boolean> = { ...DEFAULT_FLAGS };
    for (const row of rows) {
      if (FEATURE_FLAGS.includes(row.key as FeatureFlag)) {
        result[row.key] = row.value;
      }
    }
    return result;
  },
});

export const seedFlags = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    for (const key of FEATURE_FLAGS) {
      const existing = await ctx.db
        .query("featureFlags")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (!existing) {
        await ctx.db.insert("featureFlags", {
          key,
          value: DEFAULT_FLAGS[key],
          updatedAt: now,
        });
      }
    }
    return { seeded: FEATURE_FLAGS.length };
  },
});
