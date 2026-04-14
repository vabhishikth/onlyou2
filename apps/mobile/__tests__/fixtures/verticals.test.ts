import { VERTICALS, visibleFor, type VerticalInfo } from "@/fixtures/verticals";

describe("verticals metadata", () => {
  it("has all 5 verticals", () => {
    expect(Object.keys(VERTICALS)).toHaveLength(5);
    expect(VERTICALS["hair-loss"]).toBeDefined();
    expect(VERTICALS.ed).toBeDefined();
    expect(VERTICALS.pe).toBeDefined();
    expect(VERTICALS.weight).toBeDefined();
    expect(VERTICALS.pcos).toBeDefined();
  });

  it("male patients see hair-loss, ed, pe, weight (not pcos)", () => {
    const visible = visibleFor("male").map((v: VerticalInfo) => v.id);
    expect(visible).toContain("hair-loss");
    expect(visible).toContain("ed");
    expect(visible).toContain("pe");
    expect(visible).toContain("weight");
    expect(visible).not.toContain("pcos");
  });

  it("female patients see hair-loss, weight, pcos (not ed, pe)", () => {
    const visible = visibleFor("female").map((v: VerticalInfo) => v.id);
    expect(visible).toContain("hair-loss");
    expect(visible).toContain("weight");
    expect(visible).toContain("pcos");
    expect(visible).not.toContain("ed");
    expect(visible).not.toContain("pe");
  });

  it("other sees neutral verticals by default", () => {
    const visible = visibleFor("other").map((v: VerticalInfo) => v.id);
    expect(visible).toContain("hair-loss");
    expect(visible).toContain("weight");
  });
});
