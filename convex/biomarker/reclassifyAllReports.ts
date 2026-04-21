import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

import { classifyRow } from "./internal/classifyRow";
import { writeNotificationFromAction } from "./lib/notifications";
import { acquireLock, releaseLock } from "./lib/reclassifyLock";

interface PreviewPayload {
  totalValues: number;
  wouldChange: number;
  byTransition: Record<string, number>;
  byMarker: Array<{
    canonicalId: string;
    displayName: string;
    changeCount: number;
  }>;
  affectedReports: number;
  affectedPatientCount: number;
  rangesSignature: string;
  previewedAt: number;
  committedAt?: number;
}

const CHUNK = 500;
const CHUNK_SLEEP_MS = 50;
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function computeReclassifyPayload(
  ctx: import("../_generated/server").ActionCtx,
  write: boolean,
): Promise<
  PreviewPayload & {
    changedValueIds: Id<"biomarker_values">[];
    affectedReportsSet: Set<Id<"biomarker_reports">>;
  }
> {
  const now = Date.now();
  const rangesSignature = await ctx.runQuery(
    internal.biomarker.internalQueries.getMaxRangeUpdatedAt,
    {},
  );
  const values = await ctx.runQuery(
    internal.biomarker.internalQueries.listAllValues,
    {},
  );
  const ranges = await ctx.runQuery(
    internal.biomarker.internalQueries.getActiveRanges,
    {},
  );
  const conversions = await ctx.runQuery(
    internal.biomarker.internalQueries.getUnitConversions,
    {},
  );

  const byTransition: Record<string, number> = {};
  const byMarkerMap = new Map<
    string,
    { displayName: string; changeCount: number }
  >();
  const changedValueIds: Id<"biomarker_values">[] = [];
  const affectedReportsSet = new Set<Id<"biomarker_reports">>();
  const affectedUsersSet = new Set<Id<"users">>();

  for (let i = 0; i < values.length; i += CHUNK) {
    const chunk = values.slice(i, i + CHUNK);
    for (const val of chunk) {
      const user = await ctx.runQuery(
        internal.biomarker.internalQueries.getUserProfile,
        { userId: val.userId },
      );
      if (!user) continue;
      const synthetic = {
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
        marker: synthetic,
        user,
        ranges,
        conversions,
        forcedCanonicalId: val.canonicalId ?? undefined,
      });
      if (
        newResult.status !== val.status ||
        (newResult.unclassifiedReason ?? undefined) !==
          (val.unclassifiedReason ?? undefined)
      ) {
        const key = `${val.status}_to_${newResult.status}`;
        byTransition[key] = (byTransition[key] ?? 0) + 1;
        if (val.canonicalId) {
          const rangeRow = ranges.find(
            (r) => r.canonicalId === val.canonicalId,
          );
          const display = rangeRow?.displayName ?? val.canonicalId;
          const existing = byMarkerMap.get(val.canonicalId);
          if (existing) existing.changeCount++;
          else
            byMarkerMap.set(val.canonicalId, {
              displayName: display,
              changeCount: 1,
            });
        }
        changedValueIds.push(val._id);
        affectedReportsSet.add(val.biomarkerReportId);
        affectedUsersSet.add(val.userId);

        if (write) {
          let newRefId: Id<"biomarker_reference_ranges"> | undefined =
            undefined;
          if (newResult.canonicalId && newResult.status !== "unclassified") {
            const refId = await ctx.runQuery(
              internal.biomarker.internalQueries.findReferenceRangeId,
              {
                canonicalId: newResult.canonicalId,
                sex: user.sex ?? "any",
                age: 30,
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
        }
      }
    }
    if (i + CHUNK < values.length) await sleep(CHUNK_SLEEP_MS);
  }

  const byMarker = Array.from(byMarkerMap.entries())
    .map(([canonicalId, { displayName, changeCount }]) => ({
      canonicalId,
      displayName,
      changeCount,
    }))
    .sort((a, b) => b.changeCount - a.changeCount);

  return {
    totalValues: values.length,
    wouldChange: changedValueIds.length,
    byTransition,
    byMarker,
    affectedReports: affectedReportsSet.size,
    affectedPatientCount: affectedUsersSet.size,
    rangesSignature,
    previewedAt: now,
    changedValueIds,
    affectedReportsSet,
  };
}

export const reclassifyAllReports = internalAction({
  args: {
    mode: v.union(v.literal("preview"), v.literal("commit")),
    rangesSignature: v.optional(v.string()),
  },
  handler: async (ctx, { mode, rangesSignature: passedSig }) => {
    if (mode === "commit") {
      // Staleness check BEFORE acquiring the lock
      const currentSig = await ctx.runQuery(
        internal.biomarker.internalQueries.getMaxRangeUpdatedAt,
        {},
      );
      if (!passedSig || currentSig !== passedSig) {
        throw new Error("ranges_changed_since_preview");
      }
    }
    const action =
      mode === "preview"
        ? "reclassifyAllReportsPreview"
        : "reclassifyAllReportsCommit";
    const ownerToken = await acquireLock(ctx, "*", action);
    try {
      const payload = await computeReclassifyPayload(ctx, mode === "commit");

      if (mode === "commit") {
        // Recompute counts + emit notifications
        for (const reportId of payload.affectedReportsSet) {
          await ctx.runMutation(
            internal.biomarker.internalMutations.recomputeBiomarkerReportCounts,
            { biomarkerReportId: reportId, now: payload.previewedAt },
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
        await ctx.runMutation(
          internal.biomarker.internalMutations.writeAuditLog,
          {
            adminUserId: null,
            action: "reclassify_all_commit",
            targetTable: "biomarker_reference_ranges",
            targetId: "*",
            before: null,
            after: {
              changedValuesCount: payload.wouldChange,
              affectedReports: payload.affectedReports,
              affectedPatientCount: payload.affectedPatientCount,
              rangesSignature: payload.rangesSignature,
            },
            now: payload.previewedAt,
          },
        );
        return {
          ...stripInternals(payload),
          committedAt: payload.previewedAt,
        };
      }
      // Preview
      await ctx.runMutation(
        internal.biomarker.internalMutations.writeAuditLog,
        {
          adminUserId: null,
          action: "reclassify_all_preview",
          targetTable: "biomarker_reference_ranges",
          targetId: "*",
          before: null,
          after: {
            wouldChange: payload.wouldChange,
            affectedReports: payload.affectedReports,
            affectedPatientCount: payload.affectedPatientCount,
            rangesSignature: payload.rangesSignature,
          },
          now: payload.previewedAt,
        },
      );
      return stripInternals(payload);
    } finally {
      await releaseLock(ctx, "*", ownerToken);
    }
  },
});

function stripInternals(
  p: Awaited<ReturnType<typeof computeReclassifyPayload>>,
): PreviewPayload {
  const { changedValueIds: _ids, affectedReportsSet: _set, ...rest } = p;
  void _ids;
  void _set;
  return rest;
}
