// scripts/seed-admin-user.ts
//
// Creates an admin user on the dev Convex deployment for testing + dev ops.
// Prod deploy: this script hard-fails. Real admin seeding in prod goes
// through Phase 5's invite flow.

import { spawnSync } from "node:child_process";

import { isProdDeployment } from "../packages/core/src/deployment/prod-patterns";

async function main() {
  const deployment = process.env.CONVEX_DEPLOYMENT ?? "";
  if (isProdDeployment(deployment)) {
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
