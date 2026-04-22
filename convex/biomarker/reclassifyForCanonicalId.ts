import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

import { classifyRow, computeAge } from "./internal/classifyRow";
import { writeNotificationFromAction } from "./lib/notifications";
import { acquireLock, releaseLock } from "./lib/reclassifyLock";

const CHUNK_SIZE = 100;
const CHUNK_SLEEP_MS = 50;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const reclassifyForCanonicalId = internalAction({
  args: { canonicalId: v.string() },
  handler: async (ctx, { canonicalId }) => {
    const ownerToken = await acquireLock(
      ctx,
      canonicalId,
      "reclassifyForCanonicalId",
    );
    try {
      const now = Date.now();

      // Load all values for this canonical
      const values = await ctx.runQuery(
        internal.biomarker.internalQueries.getValuesByCanonical,
        { canonicalId },
      );
      const ranges = await ctx.runQuery(
        internal.biomarker.internalQueries.getActiveRanges,
        {},
      );
      const conversions = await ctx.runQuery(
        internal.biomarker.internalQueries.getUnitConversions,
        {},
      );

      const changedValueIds: Id<"biomarker_values">[] = [];
      const affectedReports = new Set<Id<"biomarker_reports">>();

      for (let i = 0; i < values.length; i += CHUNK_SIZE) {
        const chunk = values.slice(i, i + CHUNK_SIZE);
        for (const val of chunk) {
          // Load the user for age/sex/pregnancy context
          const user = await ctx.runQuery(
            internal.biomarker.internalQueries.getUserProfile,
            { userId: val.userId },
          );
          if (!user) continue;

          // Build a marker-like input from the stored value
          const syntheticMarker = {
            name_on_report: val.nameOnReport,
            canonical_id_guess: val.canonicalId ?? null,
            qualifier: val.qualifier ?? null,
            value_type: val.valueType,
            raw_value: val.rawValue,
            numeric_value: val.numericValue ?? null,
            raw_unit: val.rawUnit ?? null,
            lab_printed_range: val.labPrintedRange ?? null,
            page_number: val.pageNumber ?? 1,
            confidence: val.confidence ?? 1,
          };
          const newResult = classifyRow({
            marker: syntheticMarker,
            user,
            ranges,
            conversions,
            forcedCanonicalId: canonicalId,
          });

          const statusChanged = newResult.status !== val.status;
          const reasonChanged =
            (newResult.unclassifiedReason ?? undefined) !==
            (val.unclassifiedReason ?? undefined);

          if (statusChanged || reasonChanged) {
            // Lookup new referenceRangeId
            let newRefId: Id<"biomarker_reference_ranges"> | undefined =
              undefined;
            if (newResult.canonicalId && newResult.status !== "unclassified") {
              const refId = await ctx.runQuery(
                internal.biomarker.internalQueries.findReferenceRangeId,
                {
                  canonicalId: newResult.canonicalId,
                  sex: user.sex ?? "any",
                  age: user.dob ? computeAge(user.dob) : 0,
                },
              );
              newRefId = refId ?? undefined;
            }
            await ctx.runMutation(
              internal.biomarker.internalMutations.patchBiomarkerValue,
              {
                valueId: val._id,
                patch: {
                  status: newResult.status,
                  unclassifiedReason: newResult.unclassifiedReason ?? undefined,
                  referenceRangeId: newRefId,
                  classifiedAt: now,
                },
              },
            );
            changedValueIds.push(val._id);
            affectedReports.add(val.biomarkerReportId);
          }
        }
        if (i + CHUNK_SIZE < values.length) await sleep(CHUNK_SLEEP_MS);
      }

      // Recompute counts + emit notifications for each affected report
      for (const reportId of affectedReports) {
        await ctx.runMutation(
          internal.biomarker.internalMutations.recomputeBiomarkerReportCounts,
          { biomarkerReportId: reportId, now },
        );
        const report = await ctx.runQuery(
          internal.biomarker.internalQueries.getBiomarkerReportById,
          { biomarkerReportId: reportId },
        );
        if (report) {
          await writeNotificationFromAction(ctx, "lab_report_updated", {
            userId: report.userId,
            biomarkerReportId: reportId,
          });
        }
      }

      // Audit log
      await ctx.runMutation(
        internal.biomarker.internalMutations.writeAuditLog,
        {
          adminUserId: null, // system-triggered
          action: "reclassify_canonical_commit",
          targetTable: "biomarker_reference_ranges",
          targetId: canonicalId,
          before: null,
          after: {
            changedCount: changedValueIds.length,
            affectedReports: affectedReports.size,
          },
          now,
        },
      );

      return {
        changedValueIds: changedValueIds.length,
        affectedReports: affectedReports.size,
      };
    } finally {
      await releaseLock(ctx, canonicalId, ownerToken);
    }
  },
});
