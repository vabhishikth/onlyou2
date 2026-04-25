// Transition engine — canonical status-change surface for consultations.
//
// `transitionStatus` is the user/doctor/admin-facing API. Every call is
// checked against `validTransitions` (sourced from SOT §3A).
//
// `systemTransition` is the scheduler/webhook-facing API. Calls bypass
// `validTransitions` and are checked against `systemTransitions` (SOT §3B).
//
// Both write a `consultation_status_history` row on every successful
// change and patch `statusUpdatedAt`. Terminal states (listed explicitly)
// have no outbound transitions regardless of caller type.

import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";

import { consultationStatusValidator, transitionKindValidator } from "./schema";

type Status = Doc<"consultations">["status"];

export const validTransitions: Record<Status, Status[]> = {
  SUBMITTED: ["AI_PROCESSING"],
  AI_PROCESSING: ["AI_COMPLETE", "AI_FAILED"],
  AI_FAILED: ["AI_PROCESSING", "AI_COMPLETE"],
  AI_COMPLETE: ["ASSIGNED"],
  ASSIGNED: ["REVIEWING"],
  REVIEWING: [
    "MORE_INFO_REQUESTED",
    "LAB_ORDERED",
    "PRESCRIBED",
    "REFERRED",
    "DECLINED",
    "COMPLETED",
  ],
  MORE_INFO_REQUESTED: ["REVIEWING"],
  LAB_ORDERED: ["REVIEWING"],
  PRESCRIBED: ["AWAITING_PAYMENT"],
  AWAITING_PAYMENT: ["PAYMENT_COMPLETE", "EXPIRED_UNPAID"],
  EXPIRED_UNPAID: [],
  PAYMENT_COMPLETE: ["PHARMACY_PROCESSING"],
  PHARMACY_PROCESSING: ["DISPATCHED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: ["TREATMENT_ACTIVE"],
  TREATMENT_ACTIVE: ["FOLLOW_UP_DUE", "COMPLETED", "CANCELLED"],
  FOLLOW_UP_DUE: ["REVIEWING"],
  REFERRED: [],
  DECLINED: [],
  COMPLETED: [],
  CANCELLED: [],
  ABANDONED: [],
};

export const systemTransitions: Array<[Status[], Status]> = [
  [["SUBMITTED", "AI_COMPLETE", "AI_FAILED"], "ABANDONED"],
  [["AWAITING_PAYMENT"], "EXPIRED_UNPAID"],
  [["PRESCRIBED"], "AWAITING_PAYMENT"],
  [["PAYMENT_COMPLETE"], "PHARMACY_PROCESSING"],
  [["PHARMACY_PROCESSING"], "DISPATCHED"],
  [["DISPATCHED"], "DELIVERED"],
  [["DELIVERED"], "TREATMENT_ACTIVE"],
];

const TERMINAL_STATES = new Set<Status>([
  "EXPIRED_UNPAID",
  "REFERRED",
  "DECLINED",
  "COMPLETED",
  "CANCELLED",
  "ABANDONED",
]);

async function applyTransition(
  ctx: MutationCtx,
  consultationId: Id<"consultations">,
  fromStatus: Status,
  toStatus: Status,
  kind: "user" | "doctor" | "admin" | "system",
  actorUserId?: Id<"users">,
  reason?: string,
) {
  const now = Date.now();
  await ctx.db.patch(consultationId, {
    status: toStatus,
    statusUpdatedAt: now,
  });
  await ctx.db.insert("consultation_status_history", {
    consultationId,
    fromStatus,
    toStatus,
    kind,
    actorUserId,
    reason,
    changedAt: now,
  });
}

export const transitionStatus = internalMutation({
  args: {
    consultationId: v.id("consultations"),
    toStatus: consultationStatusValidator,
    kind: transitionKindValidator,
    actorUserId: v.optional(v.id("users")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.consultationId);
    if (!row) throw new Error(`consultation ${args.consultationId} not found`);
    if (TERMINAL_STATES.has(row.status)) {
      throw new Error(
        `invalid transition: ${row.status} is terminal (attempted → ${args.toStatus})`,
      );
    }
    const allowed = validTransitions[row.status];
    if (!allowed.includes(args.toStatus)) {
      throw new Error(
        `invalid transition: ${row.status} → ${args.toStatus} (allowed: ${allowed.join(", ") || "(none)"})`,
      );
    }
    await applyTransition(
      ctx,
      args.consultationId,
      row.status,
      args.toStatus,
      args.kind,
      args.actorUserId,
      args.reason,
    );
  },
});

export const systemTransition = internalMutation({
  args: {
    consultationId: v.id("consultations"),
    toStatus: consultationStatusValidator,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.consultationId);
    if (!row) throw new Error(`consultation ${args.consultationId} not found`);
    if (TERMINAL_STATES.has(row.status)) {
      throw new Error(
        `invalid system transition: ${row.status} is terminal (attempted → ${args.toStatus})`,
      );
    }
    const rule = systemTransitions.find(
      ([froms, to]) => to === args.toStatus && froms.includes(row.status),
    );
    if (!rule) {
      throw new Error(
        `invalid system transition: ${row.status} → ${args.toStatus}`,
      );
    }
    await applyTransition(
      ctx,
      args.consultationId,
      row.status,
      args.toStatus,
      "system",
      undefined,
      args.reason,
    );
  },
});
