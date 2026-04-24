import { EXPLAINER_MAP, explainerFor } from "../biomarker-explainers";

test("returns base + byStatus.optimal for a known id with 'optimal' status", () => {
  const out = explainerFor("ldl", "LDL Cholesterol", "optimal");
  expect(out).toContain("LDL");
  expect(out).not.toContain("high");
});

test("returns base + byStatus.high for 'high' status", () => {
  const out = explainerFor("ldl", "LDL Cholesterol", "high");
  expect(out.length).toBeGreaterThan(20);
});

test("returns a fallback for unknown canonical id", () => {
  const out = explainerFor("xenon", "Xenon", "watch");
  expect(out).toMatch(/outside our reference database/i);
});

test("every seeded canonical id has all four status variants", () => {
  for (const [, entry] of Object.entries(EXPLAINER_MAP)) {
    expect(entry).toHaveProperty("base");
    expect(entry.byStatus).toHaveProperty("optimal");
    expect(entry.byStatus).toHaveProperty("watch");
    expect(entry.byStatus).toHaveProperty("high");
    expect(entry.byStatus).toHaveProperty("low");
    for (const k of ["optimal", "watch", "high", "low"] as const) {
      expect(entry.byStatus[k].length).toBeGreaterThan(10);
    }
  }
});
