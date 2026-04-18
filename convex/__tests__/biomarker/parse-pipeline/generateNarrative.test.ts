// convex/__tests__/biomarker/parse-pipeline/generateNarrative.test.ts
import { describe, it, expect, vi } from "vitest";

import { generateNarrativeWithGuard } from "../../../biomarker/internal/generateNarrative";

vi.mock("../../../lib/claude", () => ({
  callNarrative: vi.fn().mockResolvedValue({
    narrative: "Your thyroid looks good.",
    modelUsed: "claude-sonnet-test",
  }),
}));

describe("generateNarrativeWithGuard", () => {
  it("returns fallback text on empty marker list", async () => {
    const r = await generateNarrativeWithGuard({ classifiedMarkers: [] });
    expect(r.narrative).toMatch(/no markers/i);
    expect(r.modelUsed).toBe("fallback");
  });

  it("passes markers through and returns Claude output on non-empty list", async () => {
    const r = await generateNarrativeWithGuard({
      classifiedMarkers: [{ name: "TSH", status: "optimal", value: 2.1 }],
    });
    expect(r.narrative).toMatch(/thyroid/i);
    expect(r.modelUsed).toMatch(/^claude-/);
  });
});
