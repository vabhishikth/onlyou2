import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { ROLES } from "../packages/core/src/enums/roles";

const roleValidator = v.union(...ROLES.map((r) => v.literal(r)));
const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("other"),
);

export default defineSchema({
  users: defineTable({
    // Identity
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    role: roleValidator,

    // Profile (captured during profile-setup)
    gender: v.optional(genderValidator),
    dob: v.optional(v.string()), // ISO YYYY-MM-DD
    pincode: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    address: v.optional(v.string()),

    // Gates
    phoneVerified: v.boolean(),
    profileComplete: v.boolean(),

    // Dev flag — true for the 4 seeded fake patients
    isFixture: v.optional(v.boolean()),

    createdAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_email", ["email"])
    .index("by_fixture", ["isFixture"]),

  otpAttempts: defineTable({
    phone: v.string(),
    hashedOtp: v.string(),
    expiresAt: v.number(),
    attempts: v.number(),
    createdAt: v.number(),
  }).index("by_phone", ["phone"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(), // 32-byte hex
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  featureFlags: defineTable({
    key: v.string(),
    value: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
