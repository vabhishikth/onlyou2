// convex/__tests__/biomarker/vitest.claude.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: [
      "convex/__tests__/biomarker/parse-pipeline/parseLabReport.live.test.ts",
    ],
    environment: "node",
    testTimeout: 60_000, // vision calls take 20-40s
    hookTimeout: 30_000,
  },
});
