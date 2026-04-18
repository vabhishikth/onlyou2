import { describe, it, expect } from "vitest";

import { matchPatientName } from "../../../biomarker/internal/matchPatientName";

describe("matchPatientName", () => {
  it("returns match on exact case-insensitive equality", () => {
    expect(matchPatientName("Priya Iyer", "priya iyer")).toBe("match");
  });

  it("tolerates leading/trailing whitespace + Mr./Ms. prefixes", () => {
    expect(matchPatientName("Ms. Priya Iyer ", "Priya Iyer")).toBe("match");
    expect(matchPatientName("Mr Rajesh Kumar", "Rajesh Kumar")).toBe("match");
  });

  it("matches on initials expansion (A. Sharma vs Anand Sharma)", () => {
    expect(matchPatientName("A. Sharma", "Anand Sharma")).toBe("match");
    expect(matchPatientName("Arjun S", "Arjun Sharma")).toBe("match");
  });

  it("returns mismatch on clearly different names", () => {
    expect(matchPatientName("Priya Iyer", "Rajesh Kumar")).toBe("mismatch");
  });

  it("returns unknown when either input is empty/null/undefined", () => {
    expect(matchPatientName("", "Priya")).toBe("unknown");
    expect(matchPatientName("Priya", "")).toBe("unknown");
    expect(matchPatientName(null, "Priya")).toBe("unknown");
    expect(matchPatientName("Priya", undefined)).toBe("unknown");
  });

  it("handles reversed name order (family-first)", () => {
    expect(matchPatientName("Iyer Priya", "Priya Iyer")).toBe("match");
  });
});
