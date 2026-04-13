import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { ROLES } from '../packages/core/src/enums/roles'

const roleValidator = v.union(...ROLES.map((r) => v.literal(r)))

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    role: roleValidator,
    createdAt: v.number(),
  }).index('by_phone', ['phone']),

  featureFlags: defineTable({
    key: v.string(),
    value: v.boolean(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),
})
