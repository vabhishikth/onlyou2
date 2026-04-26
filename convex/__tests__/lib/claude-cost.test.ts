import { describe, expect, it } from "vitest";

import { computeCostPaisa, SONNET_4_6_RATES } from "../../lib/claude";

describe("computeCostPaisa", () => {
  it("computes input-only cost: $3 / 1M tokens × usdToPaisa", () => {
    const cost = computeCostPaisa({
      tokensInput: 1_000_000,
      tokensOutput: 0,
      tokensCacheRead: 0,
    });
    expect(cost).toBe(Math.round(3 * SONNET_4_6_RATES.usdToPaisa));
  });

  it("computes output-only cost: $15 / 1M tokens × usdToPaisa", () => {
    const cost = computeCostPaisa({
      tokensInput: 0,
      tokensOutput: 1_000_000,
      tokensCacheRead: 0,
    });
    expect(cost).toBe(Math.round(15 * SONNET_4_6_RATES.usdToPaisa));
  });

  it("computes cache-read cost at 10× discount vs fresh input ($0.30 vs $3.00)", () => {
    const allInput = computeCostPaisa({
      tokensInput: 1_000_000,
      tokensOutput: 0,
      tokensCacheRead: 0,
    });
    const allCache = computeCostPaisa({
      tokensInput: 0,
      tokensOutput: 0,
      tokensCacheRead: 1_000_000,
    });
    expect(Math.abs(allCache * 10 - allInput)).toBeLessThanOrEqual(1);
  });

  it("returns an integer", () => {
    const cost = computeCostPaisa({
      tokensInput: 1,
      tokensOutput: 1,
      tokensCacheRead: 1,
    });
    expect(Number.isInteger(cost)).toBe(true);
    expect(cost).toBeGreaterThanOrEqual(0);
  });

  it("returns 0 for all-zero input", () => {
    expect(
      computeCostPaisa({ tokensInput: 0, tokensOutput: 0, tokensCacheRead: 0 }),
    ).toBe(0);
  });
});
