// Shared validators for admin_audit_log action + targetTable unions.
//
// Used by:
//   - `convex/schema.ts` for the `admin_audit_log` table definition
//   - `convex/biomarker/internalMutations.ts::writeAuditLog` args
//
// Keeping the unions in one place prevents schema drift: adding a new
// action literal in two files silently (one missed) would compile but
// fail at runtime. Importing both call sites from here turns that into
// a single-file edit.
import { v } from "convex/values";

export const adminAuditActionValidator = v.union(
  v.literal("curation_resolve"),
  v.literal("curation_wont_fix"),
  v.literal("range_create"),
  v.literal("range_update"),
  v.literal("range_deactivate"),
  v.literal("range_reactivate"),
  v.literal("reclassify_canonical_commit"),
  v.literal("reclassify_all_preview"),
  v.literal("reclassify_all_commit"),
);

export const adminAuditTargetTableValidator = v.union(
  v.literal("biomarker_curation_queue"),
  v.literal("biomarker_reference_ranges"),
);
