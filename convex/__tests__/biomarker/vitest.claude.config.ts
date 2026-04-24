// convex/__tests__/biomarker/vitest.claude.config.ts
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Load `.env.local` so `pnpm test:claude` works out of the box after a
// key rotation. Previously callers had to `$env:ANTHROPIC_API_KEY="..."`
// in PowerShell each time. `loadEnv` reads .env / .env.local from repo
// root (process.cwd()) at vitest boot; values land in `test.env` which
// vitest writes into each worker's process.env.
const env = loadEnv("", process.cwd(), "");

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
    env: {
      ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY ?? "",
      ANTHROPIC_MODEL: env.ANTHROPIC_MODEL ?? "",
    },
  },
});
