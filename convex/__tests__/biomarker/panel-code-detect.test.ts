import { describe, it, expect } from "vitest";

import { isPanelCode } from "../../biomarker/lib/panelCodeDetect";

describe("isPanelCode", () => {
  it("matches lab codes like HEM-401", () => {
    expect(isPanelCode("HEM-401")).toBe(true);
    expect(isPanelCode("LAB72")).toBe(true);
    expect(isPanelCode("CBC 401")).toBe(true);
  });
  it("matches ratio codes", () => {
    expect(isPanelCode("CBC/PLT-RATIO")).toBe(true);
    expect(isPanelCode("LDL/HDL Ratio")).toBe(true);
  });
  it("matches explicit panel/code/profile designators", () => {
    expect(isPanelCode("PANEL-12")).toBe(true);
    expect(isPanelCode("Profile 5")).toBe(true);
  });
  it("does NOT match real biomarker names", () => {
    expect(isPanelCode("Hemoglobin A1c")).toBe(false);
    expect(isPanelCode("TSH")).toBe(false);
    expect(isPanelCode("Vitamin D (25-OH)")).toBe(false);
    expect(isPanelCode("Ferritin")).toBe(false);
  });
  it("handles empty / whitespace", () => {
    expect(isPanelCode("")).toBe(false);
    expect(isPanelCode("   ")).toBe(false);
  });
});
