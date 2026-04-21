// convex/biomarker/reclassifyForCanonicalId.ts
//
// Scheduler entry-point stub. Filled in by Wave 4 (Task 22). Until then it
// is a no-op so Layer C of parseLabReport (Task 17) can reference it without
// blocking typecheck. The action is intentionally registered with the same
// arg shape and return type the Wave 4 implementation will use; only the
// handler body changes.

import { v } from "convex/values";

import { internalAction } from "../_generated/server";

export const reclassifyForCanonicalId = internalAction({
  args: { canonicalId: v.string() },
  handler: async (_ctx, _args): Promise<{ outcome: string }> => {
    // TODO(phase-2.5c/wave-4): walk biomarker_values for canonicalId,
    // acquire reclassify lock, re-run classifyRow for each row, persist
    // patches, emit lab_report_updated notifications for band changes.
    return { outcome: "stub_not_yet_implemented" };
  },
});
