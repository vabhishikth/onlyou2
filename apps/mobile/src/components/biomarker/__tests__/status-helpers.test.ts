import { biomarkerPalette } from "@onlyou/core/tokens/biomarker";

import { statusColor, statusLabel, rangePct } from "../status-helpers";

describe("statusColor", () => {
  it("returns sage for optimal", () => {
    expect(statusColor("optimal")).toBe(biomarkerPalette.sage);
  });
  it("returns honey for watch", () => {
    expect(statusColor("watch")).toBe(biomarkerPalette.honey);
  });
  it("returns rose for high/low", () => {
    expect(statusColor("high")).toBe(biomarkerPalette.rose);
    expect(statusColor("low")).toBe(biomarkerPalette.rose);
  });
});

describe("statusLabel", () => {
  it("maps statuses to display labels", () => {
    expect(statusLabel("optimal")).toBe("In Range");
    expect(statusLabel("watch")).toBe("Watch");
    expect(statusLabel("high")).toBe("Out");
    expect(statusLabel("low")).toBe("Low");
  });
});

describe("rangePct", () => {
  it("returns 50 at midpoint", () => {
    expect(rangePct(50, 0, 100)).toBe(50);
  });
  it("clamps below 2", () => {
    expect(rangePct(-10, 0, 100)).toBe(2);
  });
  it("clamps above 98", () => {
    expect(rangePct(1000, 0, 100)).toBe(98);
  });
});
