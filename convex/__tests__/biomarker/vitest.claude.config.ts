// convex/__tests__/biomarker/vitest.claude.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: [
      "convex/__tests__/biomarker/parse-pipeline/parseLabReport.live.test.ts",
    ],
    environment: "node",
    // Vision calls take 20-40s. Multipage wellness panels need the
    // max_tokens retry path (2 sequential calls), so budget for both.
    testTimeout: 180_000,
    hookTimeout: 30_000,
  },
});
