import { describe, it, expect } from "vitest";

import {
  istDayBucket,
  istMonthBucket,
  nextMidnightIST,
  nextFirstOfMonthIST,
} from "../../biomarker/lib/rateLimits";

describe("rate-limit IST buckets", () => {
  it("day bucket formats IST date as YYYY-MM-DD", () => {
    // 2026-04-20 18:30 UTC === 2026-04-21 00:00 IST
    const t = Date.UTC(2026, 3, 20, 18, 30);
    expect(istDayBucket(t)).toBe("2026-04-21");
  });

  it("month bucket formats IST month as YYYY-MM", () => {
    const t = Date.UTC(2026, 3, 20, 18, 30);
    expect(istMonthBucket(t)).toBe("2026-04");
  });

  it("nextMidnightIST returns timestamp at next IST midnight", () => {
    // 2026-04-20 10:00 UTC === 2026-04-20 15:30 IST
    const t = Date.UTC(2026, 3, 20, 10, 0);
    const next = nextMidnightIST(t);
    // Next IST midnight = 2026-04-21 00:00 IST === 2026-04-20 18:30 UTC
    expect(next).toBe(Date.UTC(2026, 3, 20, 18, 30));
  });

  it("nextFirstOfMonthIST returns timestamp at next IST month-first midnight", () => {
    const t = Date.UTC(2026, 3, 20, 10, 0);
    const next = nextFirstOfMonthIST(t);
    // Next = 2026-05-01 00:00 IST === 2026-04-30 18:30 UTC
    expect(next).toBe(Date.UTC(2026, 3, 30, 18, 30));
  });
});
