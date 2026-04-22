// Shared deployment-name classification used by both Convex-side env guards
// (`convex/lib/envGuards.ts`) and Node-side driver scripts
// (`scripts/seed-admin-user.ts`, `scripts/run-manual-e2e.ts`).
//
// Dash-bounded so we don't false-positive on names like `prodigy-staging` or
// `reproductive-dev`, but still match `prod`, `prod-deploy`, `deploy-prod`,
// `foo-prod-bar`, and any variant with `-production-` / `-production$`.

export const PROD_DEPLOYMENT_PATTERNS: readonly RegExp[] = [
  /(^|-)(prod|production)(-|$)/i,
];

export function isProdDeployment(deployment: string): boolean {
  return PROD_DEPLOYMENT_PATTERNS.some((p) => p.test(deployment));
}
