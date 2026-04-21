import { describe, vi } from "vitest";

vi.mock("../../lib/claude", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/claude")>();
  return {
    ...actual,
    callAutoDraftRange: vi.fn(),
    extractMarkersWithRetry: vi.fn(),
    generateNarrativeWithGuard: vi.fn(),
  };
});

describe.todo("auto-classification pipeline end-to-end smoke", () => {
  // Full integration is exercised by reclassify-roundtrip.test.ts in Wave 6
  // (Task 31). This placeholder reminds us to sanity-check the wiring once
  // Wave 4 brings reclassifyForCanonicalId online with real behaviour.
});
