/// <reference types="vite/client" />
//
// The canonical DRAFT→reviewed round-trip test (Phase 2.5C, Task 31).
//
// Documented in docs/decisions/2026-04-20-proceeding-on-draft-ranges.md:
// we proceed on DRAFT ranges, then swap to clinician-reviewed ranges and
// reclassify every existing biomarker value. This test exercises the full
// loop:
//   1. Seed a DRAFT range for vitamin_d with optimal 30..100.
//   2. Insert a measured value of 25 ng/mL → classifies as sub_optimal.
//   3. Patch the range to widen optimal to 25..100 (the "clinician review").
//   4. Preview → wouldChange: 1, transition sub_optimal→optimal.
//   5. Commit with correct rangesSignature → band flips, counts recomputed,
//      lastReclassifiedAt set, `lab_report_updated` notification emitted.
//   6. Second test confirms stale rangesSignature throws.

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

describe("DRAFT→reviewed round-trip (the canonical 2.5C test)", () => {
  it("upload on DRAFT → reviewed ranges → reclassify → assert band flips + lastReclassifiedAt + aggregate counts", async () => {
    const t = convexTest(schema, modules);

    // Step 1: Seed patient, lab_report, biomarker_report, one sub_optimal
    // biomarker_value (vitamin D = 25 ng/mL), and a DRAFT reference range
    // where 25 falls in sub_optimal band (20..30).
    const { userId, biomarkerReportId, valueId, draftRangeId } = await t.run(
      async (ctx) => {
        // Sentinel ADMIN so writeAuditLog doesn't skip.
        await ctx.db.insert("users", {
          role: "ADMIN",
          phoneVerified: true,
          profileComplete: true,
          createdAt: Date.now(),
        });
        const userId = await ctx.db.insert("users", {
          role: "PATIENT",
          phoneVerified: true,
          profileComplete: true,
          gender: "male",
          dob: "1990-01-01",
          createdAt: Date.now(),
        });
        const blob = new Blob(["%PDF-1.4 fake"], {
          type: "application/pdf",
        });
        const fileId = await ctx.storage.store(blob);
        const labReportId = await ctx.db.insert("lab_reports", {
          userId,
          source: "patient_upload",
          fileId,
          mimeType: "application/pdf",
          fileSizeBytes: 1,
          contentHash: "roundtrip-r",
          status: "ready",
          createdAt: Date.now(),
        });
        const biomarkerReportId = await ctx.db.insert("biomarker_reports", {
          labReportId,
          userId,
          narrative: "",
          narrativeModel: "",
          optimalCount: 0,
          subOptimalCount: 1,
          actionRequiredCount: 0,
          unclassifiedCount: 0,
          analyzedAt: Date.now(),
        });
        const valueId = await ctx.db.insert("biomarker_values", {
          biomarkerReportId,
          userId,
          canonicalId: "vitamin_d",
          nameOnReport: "Vitamin D (25-OH)",
          valueType: "numeric",
          rawValue: "25",
          numericValue: 25,
          rawUnit: "ng/mL",
          status: "sub_optimal",
          classifiedAt: Date.now(),
        });
        // DRAFT range — 25 lands in sub-optimal band (20..30).
        const draftRangeId = await ctx.db.insert("biomarker_reference_ranges", {
          canonicalId: "vitamin_d",
          displayName: "Vitamin D (25-OH)",
          aliases: ["Vit D", "25-OH Vitamin D"],
          category: "Nutrient Health",
          canonicalUnit: "ng/mL",
          ageMin: 18,
          ageMax: 120,
          sex: "any",
          pregnancySensitive: false,
          optimalMin: 30,
          optimalMax: 100,
          subOptimalBelowMin: 20,
          subOptimalAboveMax: 150,
          actionBelow: 20,
          actionAbove: 150,
          explainer: "",
          source: "DRAFT ref",
          clinicalReviewer: "DRAFT — pending review",
          isActive: true,
          updatedAt: 1000,
        });
        return { userId, biomarkerReportId, valueId, draftRangeId };
      },
    );

    // Step 2: Verify initial state.
    {
      const val = await t.run(async (ctx) => ctx.db.get(valueId));
      expect(val?.status).toBe("sub_optimal");
    }

    // Step 3: Simulate clinician-reviewed swap — widen optimal to 25..100
    // and bump updatedAt so rangesSignature flips.
    await t.run(async (ctx) => {
      await ctx.db.patch(draftRangeId, {
        optimalMin: 25,
        optimalMax: 100,
        subOptimalBelowMin: 15,
        actionBelow: 10,
        clinicalReviewer: "Dr. Sharma, MBBS MD",
        reviewedAt: Date.now(),
        updatedAt: 2000,
      });
    });

    // Step 4: Preview — confirm wouldChange + rangesSignature.
    const preview = await t.action(
      internal.biomarker.reclassifyAllReports.reclassifyAllReports,
      { mode: "preview" },
    );
    expect(preview.rangesSignature).toBe("2000");
    expect(preview.wouldChange).toBe(1);
    expect(preview.byTransition["sub_optimal_to_optimal"]).toBe(1);
    expect(preview.affectedPatientCount).toBe(1);
    expect(preview.affectedReports).toBe(1);

    // Step 5: Commit with matching rangesSignature.
    const commit = await t.action(
      internal.biomarker.reclassifyAllReports.reclassifyAllReports,
      { mode: "commit", rangesSignature: "2000" },
    );
    expect(commit.committedAt).toBeDefined();

    // Step 6: Band flipped, aggregate counts recomputed, lastReclassifiedAt set.
    const valueAfter = await t.run(async (ctx) => ctx.db.get(valueId));
    expect(valueAfter?.status).toBe("optimal");
    const reportAfter = await t.run(async (ctx) =>
      ctx.db.get(biomarkerReportId),
    );
    expect(reportAfter?.optimalCount).toBe(1);
    expect(reportAfter?.subOptimalCount).toBe(0);
    expect(reportAfter?.actionRequiredCount).toBe(0);
    expect(reportAfter?.unclassifiedCount).toBe(0);
    expect(reportAfter?.lastReclassifiedAt).toBeDefined();

    // Step 7: lab_report_updated notification emitted exactly once.
    const notifs = await t.run(async (ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_user_created", (q) => q.eq("userId", userId))
        .collect(),
    );
    expect(notifs.filter((n) => n.kind === "lab_report_updated").length).toBe(
      1,
    );
  });

  it("commit with stale rangesSignature throws ranges_changed_since_preview", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("biomarker_reference_ranges", {
        canonicalId: "tsh",
        displayName: "TSH",
        aliases: [],
        category: "Thyroid",
        canonicalUnit: "mIU/L",
        ageMin: 18,
        ageMax: 120,
        sex: "any",
        pregnancySensitive: false,
        optimalMin: 0.5,
        optimalMax: 4.5,
        explainer: "",
        source: "test",
        isActive: true,
        updatedAt: 3000,
      });
    });
    await expect(
      t.action(internal.biomarker.reclassifyAllReports.reclassifyAllReports, {
        mode: "commit",
        rangesSignature: "1000",
      }),
    ).rejects.toThrow(/ranges_changed_since_preview/);
  });
});
