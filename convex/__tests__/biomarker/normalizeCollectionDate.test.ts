import { describe, it, expect } from "vitest";

import { normalizeCollectionDate } from "../../biomarker/lib/normalizeCollectionDate";

describe("normalizeCollectionDate", () => {
  it("returns already-ISO YYYY-MM-DD unchanged", () => {
    expect(normalizeCollectionDate("2026-04-10")).toBe("2026-04-10");
  });

  it("re-emits DD/MM/YYYY as YYYY-MM-DD (day-first Indian lab format)", () => {
    // 10 April 2026, not Oct 4. Explicit day-first interpretation.
    expect(normalizeCollectionDate("10/04/2026")).toBe("2026-04-10");
  });

  it("re-emits full ISO timestamps as the date-only form", () => {
    // Unambiguous ISO-8601 timestamp; Date.parse is deterministic here.
    expect(normalizeCollectionDate("2026-04-10T13:45:00Z")).toBe("2026-04-10");
  });

  it("returns garbage strings unchanged (caller logs collection_date_malformed)", () => {
    expect(normalizeCollectionDate("not-a-date")).toBe("not-a-date");
  });

  it("returns undefined when input is undefined", () => {
    expect(normalizeCollectionDate(undefined)).toBeUndefined();
  });
});
