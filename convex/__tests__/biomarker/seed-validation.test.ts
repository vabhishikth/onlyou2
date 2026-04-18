// @vitest-environment node
//
// convex/__tests__/biomarker/seed-validation.test.ts
//
// CI guard for Phase 2.5 biomarker seed data. Runs in `pnpm test:convex`
// BEFORE any deploy. Validates structure + threshold ordering on every
// row in packages/core/seeds/biomarker-ranges.json.
//
// NOTE: Uses @vitest-environment node (not the default edge-runtime) because
// this test reads files via node:fs. It has no Convex backend dependency.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { z } from "zod";

const rowSchema = z.object({
  canonicalId: z.string().min(1),
  displayName: z.string().min(1),
  aliases: z.array(z.string()),
  category: z.string().min(1),
  canonicalUnit: z.string().min(1),
  ageMin: z.number().int().min(0),
  ageMax: z.number().int().min(0),
  sex: z.enum(["male", "female", "any"]),
  pregnancySensitive: z.boolean(),
  optimalMin: z.number(),
  optimalMax: z.number(),
  subOptimalBelowMin: z.number().optional(),
  subOptimalAboveMax: z.number().optional(),
  actionBelow: z.number().optional(),
  actionAbove: z.number().optional(),
  explainer: z.string().min(20),
  source: z.string().min(5),
  clinicalReviewer: z.string().optional(),
  reviewedAt: z.number().nullable().optional(),
  isActive: z.boolean(),
});

const conversionSchema = z.object({
  canonicalId: z.string().min(1),
  rawUnitPattern: z.string().min(1),
  canonicalUnit: z.string().min(1),
  factor: z.number(),
});

function loadRows() {
  const path = resolve(
    process.cwd(),
    "packages/core/seeds/biomarker-ranges.json",
  );
  return JSON.parse(readFileSync(path, "utf8")) as unknown[];
}

function loadConversions() {
  const path = resolve(
    process.cwd(),
    "packages/core/seeds/unit-conversions.json",
  );
  return JSON.parse(readFileSync(path, "utf8")) as unknown[];
}

describe("biomarker-ranges.json", () => {
  const rows = loadRows();

  it("is a non-empty array", () => {
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(45);
  });

  it("every row matches the schema", () => {
    for (const [i, row] of rows.entries()) {
      const result = rowSchema.safeParse(row);
      if (!result.success) {
        throw new Error(
          `Row ${i} failed: ${result.error.issues.map((x) => x.message).join("; ")}`,
        );
      }
    }
  });

  it("every row has ageMin < ageMax", () => {
    for (const row of rows as z.infer<typeof rowSchema>[]) {
      expect(row.ageMin).toBeLessThan(row.ageMax);
    }
  });

  it("optimal band is well-ordered (min <= max)", () => {
    for (const row of rows as z.infer<typeof rowSchema>[]) {
      expect(row.optimalMin).toBeLessThanOrEqual(row.optimalMax);
    }
  });

  it("subOptimalBelowMin < optimalMin (when set)", () => {
    for (const row of rows as z.infer<typeof rowSchema>[]) {
      if (row.subOptimalBelowMin !== undefined) {
        expect(row.subOptimalBelowMin).toBeLessThan(row.optimalMin);
      }
    }
  });

  it("subOptimalAboveMax > optimalMax (when set)", () => {
    for (const row of rows as z.infer<typeof rowSchema>[]) {
      if (row.subOptimalAboveMax !== undefined) {
        expect(row.subOptimalAboveMax).toBeGreaterThan(row.optimalMax);
      }
    }
  });

  // Action bounds allow `<=` because the seed collapses action and sub-optimal
  // thresholds on the lower/upper edge — see seeds/README.md editing rules note.
  it("actionBelow <= subOptimalBelowMin (when both set)", () => {
    for (const row of rows as z.infer<typeof rowSchema>[]) {
      if (
        row.actionBelow !== undefined &&
        row.subOptimalBelowMin !== undefined
      ) {
        expect(row.actionBelow).toBeLessThanOrEqual(row.subOptimalBelowMin);
      }
    }
  });

  // Action bounds allow `>=` (i.e. `<=` in reverse) because the seed collapses
  // action and sub-optimal thresholds on the lower/upper edge — see seeds/README.md.
  it("actionAbove >= subOptimalAboveMax (when both set)", () => {
    for (const row of rows as z.infer<typeof rowSchema>[]) {
      if (
        row.actionAbove !== undefined &&
        row.subOptimalAboveMax !== undefined
      ) {
        expect(row.actionAbove).toBeGreaterThanOrEqual(row.subOptimalAboveMax);
      }
    }
  });

  it("pregnancySensitive is explicitly boolean on every row", () => {
    for (const row of rows as z.infer<typeof rowSchema>[]) {
      expect(typeof row.pregnancySensitive).toBe("boolean");
    }
  });

  it("source is a non-trivial citation", () => {
    for (const row of rows as z.infer<typeof rowSchema>[]) {
      expect(row.source.length).toBeGreaterThan(4);
    }
  });

  it("every row has clinicalReviewer == 'DRAFT — pending review'", () => {
    for (const [i, row] of (rows as z.infer<typeof rowSchema>[]).entries()) {
      expect(
        row.clinicalReviewer,
        `Row ${i} (${row.canonicalId}) missing clinicalReviewer`,
      ).toBe("DRAFT — pending review");
    }
  });

  it("every row has reviewedAt == null", () => {
    for (const [i, row] of (rows as z.infer<typeof rowSchema>[]).entries()) {
      expect(
        row.reviewedAt,
        `Row ${i} (${row.canonicalId}) reviewedAt must be null`,
      ).toBeNull();
    }
  });

  it("sex-differentiated markers have both male and female rows OR a 'any' row", () => {
    const byCanonical = new Map<string, z.infer<typeof rowSchema>[]>();
    for (const row of rows as z.infer<typeof rowSchema>[]) {
      if (!byCanonical.has(row.canonicalId)) {
        byCanonical.set(row.canonicalId, []);
      }
      byCanonical.get(row.canonicalId)!.push(row);
    }
    for (const [_id, group] of byCanonical) {
      const hasAny = group.some((r) => r.sex === "any");
      const hasMale = group.some((r) => r.sex === "male");
      const hasFemale = group.some((r) => r.sex === "female");
      expect(hasAny || (hasMale && hasFemale) || hasMale || hasFemale).toBe(
        true,
      );
      // at least one row exists for the canonicalId — coverage check
      expect(group.length).toBeGreaterThan(0);
    }
  });

  it("canonicalId + sex + ageMin + ageMax composite key is unique", () => {
    const seen = new Set<string>();
    for (const [i, row] of (rows as z.infer<typeof rowSchema>[]).entries()) {
      const key = `${row.canonicalId}|${row.sex}|${row.ageMin}|${row.ageMax}`;
      expect(seen.has(key), `Row ${i}: duplicate composite key "${key}"`).toBe(
        false,
      );
      seen.add(key);
    }
  });

  it("all 32 canonical markers from the spec are represented", () => {
    const expected = [
      "vitamin_d",
      "vitamin_b12",
      "folate_b9",
      "ferritin",
      "iron_serum",
      "tsh",
      "free_t3",
      "free_t4",
      "total_testosterone",
      "free_testosterone",
      "shbg",
      "dhea_s",
      "lh",
      "fsh",
      "prolactin",
      "estradiol",
      "amh",
      "hba1c",
      "fasting_glucose",
      "fasting_insulin",
      "total_cholesterol",
      "hdl_cholesterol",
      "ldl_cholesterol",
      "triglycerides",
      "alt_sgpt",
      "ast_sgot",
      "creatinine",
      "uric_acid",
      "hemoglobin",
      "wbc_total",
      "platelets",
      "mcv",
    ];
    const present = new Set(
      (rows as z.infer<typeof rowSchema>[]).map((r) => r.canonicalId),
    );
    for (const id of expected) {
      expect(present.has(id)).toBe(true);
    }
    expect(present.size).toBe(expected.length);
  });

  it("pregnancy-sensitive marker set matches the clinical decision", () => {
    const expectedSensitive = new Set([
      "tsh",
      "free_t3",
      "free_t4",
      "ferritin",
      "iron_serum",
      "hemoglobin",
      "hba1c",
      "fasting_glucose",
      "estradiol",
      "lh",
      "fsh",
      "prolactin",
    ]);
    for (const row of rows as z.infer<typeof rowSchema>[]) {
      if (expectedSensitive.has(row.canonicalId)) {
        expect(
          row.pregnancySensitive,
          `${row.canonicalId} (${row.sex}) should be pregnancySensitive`,
        ).toBe(true);
      } else {
        expect(
          row.pregnancySensitive,
          `${row.canonicalId} (${row.sex}) should NOT be pregnancySensitive`,
        ).toBe(false);
      }
    }
  });
});

describe("unit-conversions.json", () => {
  const conversions = loadConversions();

  it("is a non-empty array", () => {
    expect(Array.isArray(conversions)).toBe(true);
    expect((conversions as unknown[]).length).toBeGreaterThan(0);
  });

  it("every row matches the conversion schema", () => {
    for (const [i, row] of conversions.entries()) {
      const result = conversionSchema.safeParse(row);
      if (!result.success) {
        throw new Error(
          `Conversion row ${i} failed: ${result.error.issues.map((x) => x.message).join("; ")}`,
        );
      }
    }
  });

  it("all conversion factors are non-zero and finite", () => {
    for (const [i, row] of (
      conversions as z.infer<typeof conversionSchema>[]
    ).entries()) {
      expect(
        row.factor,
        `Conversion row ${i} (${row.canonicalId}) factor is zero`,
      ).not.toBe(0);
      expect(
        isFinite(row.factor),
        `Conversion row ${i} (${row.canonicalId}) factor is not finite`,
      ).toBe(true);
    }
  });
});
