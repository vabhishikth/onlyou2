import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

// Phase 3B stub. Phase 3C replaces with the real Claude pre-assessment call.
// Advances state SUBMITTED → AI_PROCESSING via the canonical transition path
// (transitions.ts validTransitions allows SUBMITTED → AI_PROCESSING).
export const kickoffAiStub = internalAction({
  args: { consultationId: v.id("consultations") },
  handler: async (ctx, { consultationId }) => {
    await ctx.runMutation(internal.consultations.transitions.transitionStatus, {
      consultationId,
      toStatus: "AI_PROCESSING",
      kind: "system",
      reason: "phase-3b stub",
    });
  },
});
