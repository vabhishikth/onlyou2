import { execSync } from "node:child_process";

if (process.env.ANTHROPIC_API_KEY) {
  execSync("pnpm test:claude", { stdio: "inherit" });
} else {
  console.log("Skipping pnpm test:claude — ANTHROPIC_API_KEY not set.");
}
