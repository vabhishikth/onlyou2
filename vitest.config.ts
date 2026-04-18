import { defineConfig } from "vitest/config";

export default defineConfig({
  // Disable oxc's tsconfig auto-discovery. Vite 8's oxc transformer walks
  // upward from each imported file to find a tsconfig.json; when it
  // crosses into packages/core/ it finds a tsconfig that `extends` from
  // @onlyou/config (a workspace package) and oxc's resolver rejects it
  // with "Tsconfig not found". We only need oxc for TS->JS transforms,
  // not type-aware transforms, so bypass tsconfig resolution entirely.
  oxc: { tsconfig: false },
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts"],
    exclude: ["convex/**/*.live.test.ts", "**/node_modules/**"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
