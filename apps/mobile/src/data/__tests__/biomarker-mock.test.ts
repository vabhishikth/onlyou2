import { BIOMARKERS_MOCK, CATEGORIES } from "../biomarker-mock";

test("mock has 24 rows", () => {
  expect(BIOMARKERS_MOCK.length).toBe(24);
});

test("every row has all required keys with correct types", () => {
  for (const b of BIOMARKERS_MOCK) {
    expect(typeof b.id).toBe("string");
    expect(typeof b.name).toBe("string");
    expect(typeof b.cat).toBe("string");
    expect(typeof b.unit).toBe("string");
    expect(typeof b.value).toBe("number");
    expect(typeof b.low).toBe("number");
    expect(typeof b.high).toBe("number");
    expect(typeof b.optLow).toBe("number");
    expect(typeof b.optHigh).toBe("number");
    expect(typeof b.prev).toBe("number");
    expect(Array.isArray(b.trend)).toBe(true);
    expect(b.trend.length).toBe(7);
    expect(["optimal", "watch", "high", "low"]).toContain(b.status);
  }
});

test("ids are unique", () => {
  const ids = BIOMARKERS_MOCK.map((b) => b.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("categories list has 7 entries", () => {
  expect(CATEGORIES.length).toBe(7);
});

test("every biomarker category matches a defined category", () => {
  const categoryIds = new Set(CATEGORIES.map((c) => c.id));
  for (const b of BIOMARKERS_MOCK) {
    expect(categoryIds.has(b.cat)).toBe(true);
  }
});
