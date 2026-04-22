/// <reference types="vite/client" />
//
// Tests for findReferenceRangeId isActive filter (Phase 2.5C, Task 7).
//
// Silent correctness bug from 2.5B: findReferenceRangeId matched by
// canonicalId + age + sex but did not filter isActive. Deactivation
// created a window where the classifier could pick an inactive row.
// Fix so Wave-4 reclassify can assume active-only.

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";

import { internal } from "../../../_generated/api";
import schema from "../../../schema";

const modules = import.meta.glob("../../../**/*.ts");

describe("findReferenceRangeId filters isActive", () => {
  it("returns active range when both active and inactive exist for same canonical/sex/age", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      // Inactive row
      await ctx.db.insert("biomarker_reference_ranges", {
        canonicalId: "tsh",
        displayName: "TSH (old)",
        aliases: [],
        category: "Thyroid",
        canonicalUnit: "mIU/L",
        ageMin: 18,
        ageMax: 120,
        sex: "any",
        pregnancySensitive: true,
        optimalMin: 0.4,
        optimalMax: 4.5,
        explainer: "old",
        source: "test",
        isActive: false,
        updatedAt: Date.now() - 10000,
      });
      // Active row
      await ctx.db.insert("biomarker_reference_ranges", {
        canonicalId: "tsh",
        displayName: "TSH",
        aliases: [],
        category: "Thyroid",
        canonicalUnit: "mIU/L",
        ageMin: 18,
        ageMax: 120,
        sex: "any",
        pregnancySensitive: true,
        optimalMin: 0.5,
        optimalMax: 4.0,
        explainer: "new",
        source: "test",
        isActive: true,
        updatedAt: Date.now(),
      });
    });
    const result = await t.query(
      internal.biomarker.internalQueries.findReferenceRangeId,
      { canonicalId: "tsh", sex: "male", age: 30 },
    );
    expect(result).not.toBeNull();
    const row = await t.run(async (ctx) => ctx.db.get(result!));
    expect(row?.optimalMax).toBe(4.0); // active row
  });

  it("returns null when only inactive rows exist", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("biomarker_reference_ranges", {
        canonicalId: "b12",
        displayName: "B12",
        aliases: [],
        category: "Nutrient Health",
        canonicalUnit: "pg/mL",
        ageMin: 18,
        ageMax: 120,
        sex: "any",
        pregnancySensitive: false,
        optimalMin: 200,
        optimalMax: 900,
        explainer: "",
        source: "test",
        isActive: false,
        updatedAt: Date.now(),
      });
    });
    const result = await t.query(
      internal.biomarker.internalQueries.findReferenceRangeId,
      { canonicalId: "b12", sex: "male", age: 30 },
    );
    expect(result).toBeNull();
  });
});
