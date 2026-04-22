// scripts/seed-admin-user.ts
//
// Creates an admin user on the dev Convex deployment for testing + dev ops.
// Prod deploy: this script hard-fails. Real admin seeding in prod goes
// through Phase 5's invite flow.

import { spawnSync } from "node:child_process";

// Must match convex/lib/envGuards.ts PROD_DEPLOYMENT_PATTERNS.
// Dash-bounded so we don't false-positive on names like `prodigy-staging`
// or `reproductive-dev`, but still match `prod`, `prod-deploy`,
// `deploy-prod`, `foo-prod-bar`, and any `production` variant.
// Kept inline (not imported from @onlyou/core) because the root workspace
// does not currently depend on that package and adding one export is not
// worth the dep-graph churn — review this comment if that changes.
const PROD_DEPLOYMENT_PATTERNS: RegExp[] = [/(^|-)(prod|production)(-|$)/i];

async function main() {
  const deployment = process.env.CONVEX_DEPLOYMENT ?? "";
  const isProd = PROD_DEPLOYMENT_PATTERNS.some((p) => p.test(deployment));
  if (isProd) {
    console.error("seed-admin-user is dev-only; refuse to run against prod");
    process.exit(1);
  }
  const phone = process.env.ADMIN_PHONE ?? "+919999900099";
  const args = { phone, role: "ADMIN" };
  const proc = spawnSync(
    "npx",
    ["convex", "run", "admin:seedAdminUser", JSON.stringify(args)],
    {
      encoding: "utf8",
      env: { ...process.env },
      shell: process.platform === "win32",
    },
  );
  if (proc.status !== 0) {
    process.stderr.write(proc.stderr ?? "");
    throw new Error(`convex run exited with status ${proc.status}`);
  }
  console.log(proc.stdout);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
