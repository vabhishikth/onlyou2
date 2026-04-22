import { describe, it, expect } from "vitest";

import { normalizeKey } from "../../biomarker/lib/normalizeKey";

describe("normalizeKey", () => {
  it("normalizes name + unit into a stable key", () => {
    expect(normalizeKey("HbA1c", "%")).toBe("hba1c|%");
    expect(normalizeKey("Hemoglobin A1c", "%")).toBe("hemoglobin_a1c|%");
    expect(normalizeKey("TSH", "mIU/L")).toBe("tsh|miu/l");
  });
  it("handles missing unit as 'none'", () => {
    expect(normalizeKey("Random Marker", undefined)).toBe("random_marker|none");
  });
  it("strips punctuation except allowed unit characters", () => {
    expect(normalizeKey("Vit D (25-OH)", "ng/mL")).toBe("vit_d_25oh|ng/ml");
  });
});
