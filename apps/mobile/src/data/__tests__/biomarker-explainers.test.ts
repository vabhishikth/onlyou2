/**
 * biomarker-explainers — TDD tests (Phase 2.5D / Wave 3, Task 3.1)
 *
 * Three cases:
 *  1. Returns specific text for known id "ldl".
 *  2. Returns specific text for known id "vitd".
 *  3. Returns fallback template for unknown id, interpolating the name.
 */

import { explainerFor } from "../biomarker-explainers";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("1. returns specific text for ldl", () => {
  const result = explainerFor("ldl", "LDL Cholesterol");
  // Should contain characteristic phrase from the ldl explainer
  expect(result).toContain("soluble fibre");
});

test("2. returns specific text for vitd", () => {
  const result = explainerFor("vitd", "Vitamin D");
  // Should contain characteristic phrase from the vitd explainer
  expect(result).toContain("morning sun");
});

test("3. returns fallback template for unknown id, interpolating name", () => {
  const result = explainerFor("unknown-biomarker", "Iron");
  // Fallback should mention the biomarker name (lowercased)
  expect(result).toContain("iron");
  // And should mention the retest cadence
  expect(result).toContain("90 days");
});
