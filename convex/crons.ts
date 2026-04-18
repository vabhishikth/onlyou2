// convex/crons.ts
import { cronJobs } from "convex/server";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

export const retryStuckParses = internalAction({
  args: {},
  handler: async (ctx): Promise<{ picked: number }> => {
    const now = Date.now();
    const staleLockCutoff = now - 90_000; // 90s lock timeout

    // Find rows where status=analyzing AND nextRetryAt<=now
    // AND (lockedAt is null OR lockedAt < staleLockCutoff)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidates: any[] = await ctx.runQuery(
      internal.biomarker.internalQueries.findRetryCandidates,
      { now, staleLockCutoff },
    );

    for (const row of candidates) {
      // Fire parseLabReport, don't await — cron should not hold the lock tail
      await ctx.scheduler.runAfter(
        0,
        api.biomarker.parseLabReport.parseLabReport,

        { labReportId: row._id as Id<"lab_reports"> },
      );
    }
    return { picked: candidates.length };
  },
});

const crons = cronJobs();
crons.interval(
  "retry stuck parses",
  { minutes: 2 },
  internal.crons.retryStuckParses,
);
export default crons;
