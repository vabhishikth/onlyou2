// Schema fragment — consumed by convex/schema.ts which spreads these into
// the top-level defineSchema({...}). Isolated here so the transitions +
// mutations modules can import validators without a circular import.

import { v } from "convex/values";

import { photoSlotValidator } from "../lib/photoSlot";

export const verticalValidator = v.union(
  v.literal("hair_loss"),
  v.literal("ed"),
  v.literal("pe"),
  v.literal("weight"),
  v.literal("pcos"),
);

export const consultationStatusValidator = v.union(
  v.literal("SUBMITTED"),
  v.literal("AI_PROCESSING"),
  v.literal("AI_FAILED"),
  v.literal("AI_COMPLETE"),
  v.literal("ASSIGNED"),
  v.literal("REVIEWING"),
  v.literal("MORE_INFO_REQUESTED"),
  v.literal("LAB_ORDERED"),
  v.literal("PRESCRIBED"),
  v.literal("AWAITING_PAYMENT"),
  v.literal("EXPIRED_UNPAID"),
  v.literal("REFERRED"),
  v.literal("DECLINED"),
  v.literal("PAYMENT_COMPLETE"),
  v.literal("PHARMACY_PROCESSING"),
  v.literal("DISPATCHED"),
  v.literal("DELIVERED"),
  v.literal("TREATMENT_ACTIVE"),
  v.literal("FOLLOW_UP_DUE"),
  v.literal("COMPLETED"),
  v.literal("CANCELLED"),
  v.literal("ABANDONED"),
);

export const transitionKindValidator = v.union(
  v.literal("user"),
  v.literal("doctor"),
  v.literal("admin"),
  v.literal("system"),
);

export const mimeTypeValidator = v.union(
  v.literal("image/jpeg"),
  v.literal("image/png"),
  v.literal("image/heic"),
);

export const consultations = {
  userId: v.id("users"),
  vertical: verticalValidator,
  status: consultationStatusValidator,
  statusUpdatedAt: v.number(),
  submittedAt: v.number(),
  declineReason: v.optional(v.string()),
  referralSpecialistType: v.optional(v.string()),
  referralReason: v.optional(v.string()),
  moreInfoQuestion: v.optional(v.string()),
  moreInfoAnsweredAt: v.optional(v.number()),
  assignedDoctorId: v.optional(v.id("users")),
  createdAt: v.number(),
  deletedAt: v.optional(v.number()),
};

export const questionnaire_responses = {
  consultationId: v.id("consultations"),
  userId: v.id("users"),
  schemaVersion: v.string(),
  answers: v.any(),
  completedAt: v.number(),
};

export const photos = {
  consultationId: v.id("consultations"),
  userId: v.id("users"),
  slot: photoSlotValidator,
  fileId: v.id("_storage"),
  mimeType: mimeTypeValidator,
  fileSizeBytes: v.number(),
  uploadedAt: v.number(),
  deletedAt: v.optional(v.number()),
};

export const consultation_status_history = {
  consultationId: v.id("consultations"),
  fromStatus: v.optional(consultationStatusValidator),
  toStatus: consultationStatusValidator,
  kind: transitionKindValidator,
  actorUserId: v.optional(v.id("users")),
  reason: v.optional(v.string()),
  changedAt: v.number(),
};
