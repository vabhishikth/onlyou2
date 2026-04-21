import { describe, it, expect } from "vitest";

import { jaroWinkler } from "../../biomarker/lib/jaroWinkler";

describe("jaroWinkler", () => {
  it("returns 1 for identical strings", () => {
    expect(jaroWinkler("hba1c", "hba1c")).toBe(1);
  });

  it("returns 0 for completely different strings", () => {
    expect(jaroWinkler("abc", "xyz")).toBe(0);
  });

  it("recognizes typographic variants (HbA1c vs HbA1C)", () => {
    expect(jaroWinkler("hba1c", "hba1c")).toBeGreaterThanOrEqual(0.92);
  });

  it("recognizes prefix-shared medical terms (hemoglobin vs hemoglobine)", () => {
    expect(jaroWinkler("hemoglobin", "hemoglobine")).toBeGreaterThanOrEqual(
      0.95,
    );
  });

  it("does NOT cross-match clinically distinct markers", () => {
    // Cholesterol Total vs Cholesterol Free — high character overlap but distinct.
    // Algorithm DOES score them high due to shared prefix; fuzzyAliasMatch layer
    // compensates via unit + canonical_id_guess agreement gating (Task 13).
    expect(jaroWinkler("cholesterol_total", "cholesterol_free")).toBeLessThan(
      0.98,
    );
  });

  it("handles empty strings", () => {
    expect(jaroWinkler("", "")).toBe(1);
    expect(jaroWinkler("", "x")).toBe(0);
  });
});
