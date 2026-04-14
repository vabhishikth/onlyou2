import {
  MIN_AGE_YEARS,
  computeAgeYears,
  isAtLeastMinAge,
} from "@onlyou/core/validators/age";

const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);

describe("computeAgeYears", () => {
  it("returns NaN for malformed input", () => {
    expect(computeAgeYears("")).toBeNaN();
    expect(computeAgeYears("2000/01/01")).toBeNaN();
    expect(computeAgeYears("2000-1-1")).toBeNaN();
  });

  it("returns NaN for impossible calendar dates", () => {
    expect(computeAgeYears("2025-02-30")).toBeNaN();
    expect(computeAgeYears("2025-13-01")).toBeNaN();
    expect(computeAgeYears("2023-02-29")).toBeNaN();
  });

  it("counts exactly-18 today as 18", () => {
    // Born 2008-04-14, reference 2026-04-14.
    expect(computeAgeYears("2008-04-14", utc(2026, 4, 14))).toBe(18);
  });

  it("counts the day before an 18th birthday as 17", () => {
    expect(computeAgeYears("2008-04-14", utc(2026, 4, 13))).toBe(17);
  });

  it("handles Feb 29 birthdays on common years (age bumps on Mar 1)", () => {
    // Born 2000-02-29 (leap). On 2018-02-28 they're still 17, on 2018-03-01 they're 18.
    expect(computeAgeYears("2000-02-29", utc(2018, 2, 28))).toBe(17);
    expect(computeAgeYears("2000-02-29", utc(2018, 3, 1))).toBe(18);
  });

  it("handles Feb 29 birthdays on leap years (age bumps on Feb 29)", () => {
    // Born 2000-02-29. On 2020-02-29 (leap) they should be 20.
    expect(computeAgeYears("2000-02-29", utc(2020, 2, 29))).toBe(20);
    expect(computeAgeYears("2000-02-29", utc(2020, 2, 28))).toBe(19);
  });
});

describe("isAtLeastMinAge", () => {
  it("exposes MIN_AGE_YEARS = 18", () => {
    expect(MIN_AGE_YEARS).toBe(18);
  });

  it("rejects under-18 and malformed input", () => {
    expect(isAtLeastMinAge("2010-04-14", utc(2026, 4, 14))).toBe(false);
    expect(isAtLeastMinAge("nope", utc(2026, 4, 14))).toBe(false);
  });

  it("accepts exactly-18 and older", () => {
    expect(isAtLeastMinAge("2008-04-14", utc(2026, 4, 14))).toBe(true);
    expect(isAtLeastMinAge("1990-01-01", utc(2026, 4, 14))).toBe(true);
  });
});
