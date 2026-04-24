import { getIstGreeting, getIstDateLine } from "../ist-greeting";

const ist = (y: number, m: number, d: number, h: number, min: number) =>
  new Date(Date.UTC(y, m - 1, d, h - 5, min - 30));

test("06:00 IST → morning", () => {
  expect(getIstGreeting(ist(2026, 4, 23, 6, 0))).toBe("morning");
});
test("11:59 IST → morning", () => {
  expect(getIstGreeting(ist(2026, 4, 23, 11, 59))).toBe("morning");
});
test("12:00 IST → afternoon", () => {
  expect(getIstGreeting(ist(2026, 4, 23, 12, 0))).toBe("afternoon");
});
test("16:59 IST → afternoon", () => {
  expect(getIstGreeting(ist(2026, 4, 23, 16, 59))).toBe("afternoon");
});
test("17:00 IST → evening", () => {
  expect(getIstGreeting(ist(2026, 4, 23, 17, 0))).toBe("evening");
});
test("22:30 IST → evening", () => {
  expect(getIstGreeting(ist(2026, 4, 23, 22, 30))).toBe("evening");
});
test("date line formats WEEKDAY · DAY MONTH", () => {
  expect(getIstDateLine(ist(2026, 4, 23, 12, 0))).toBe("THURSDAY · 23 APRIL");
});
