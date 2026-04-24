import { describe, it, expect } from "vitest";

import { normalizePhoneE164, isValidE164 } from "./e164";

describe("normalizePhoneE164", () => {
  it.each([
    ["+91 99999 00001", "+919999900001"],
    ["+919999900001", "+919999900001"],
    ["9999900001", "+919999900001"],
    ["09999900001", "+919999900001"],
    ["+91-99999-00001", "+919999900001"],
    ["  +91 99999 00001  ", "+919999900001"],
    ["+91 (99999) 00001", "+919999900001"],
  ])("normalises %s → %s", (input, expected) => {
    expect(normalizePhoneE164(input)).toBe(expected);
  });

  it.each([
    [""],
    ["abcd"],
    ["99999"],
    ["+9199999000012345"],
    ["+1 202 555 0100"],
    ["+91 00000 00001"],
  ])("rejects %s", (input) => {
    expect(() => normalizePhoneE164(input)).toThrow(/invalid phone/i);
  });
});

describe("isValidE164", () => {
  it("accepts a normalised Indian mobile", () => {
    expect(isValidE164("+919999900001")).toBe(true);
  });

  it("rejects a spaced format", () => {
    expect(isValidE164("+91 99999 00001")).toBe(false);
  });

  it("rejects non-+91 numbers", () => {
    expect(isValidE164("+12025550100")).toBe(false);
  });
});
