// convex/crons.ts
import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

export const retryStuckParses = internalAction({
  args: {},
  handler: async (ctx): Promise<{ picked: number }> => {
    const now = Date.now();
    const staleLockCutoff = now - 90_000; // 90s lock timeout

    // I-1 fix: claim candidates atomically inside a mutation so the cron
    // cannot double-fire a row. claimRetryCandidates stamps lockedAt:now on
    // each candidate in the same DB transaction that reads them — a concurrent
    // cron tick will see lockedAt >= staleLockCutoff and skip the row.
    const claimedIds: Id<"lab_reports">[] = await ctx.runMutation(
      internal.biomarker.internalMutations.claimRetryCandidates,
      { now, staleLockCutoff },
    );

    for (const labReportId of claimedIds) {
      // Fire parseLabReport, don't await — cron should not hold the lock tail
      await ctx.scheduler.runAfter(
        0,
        internal.biomarker.parseLabReport.parseLabReport,
        { labReportId },
      );
    }
    return { picked: claimedIds.length };
  },
});

const crons = cronJobs();
crons.interval(
  "retry stuck parses",
  { minutes: 2 },
  internal.crons.retryStuckParses,
);
crons.interval(
  "sweep-expired-reclassify-locks",
  { minutes: 5 },
  internal.biomarker.internalMutations.sweepExpiredReclassifyLocks,
);
export default crons;
