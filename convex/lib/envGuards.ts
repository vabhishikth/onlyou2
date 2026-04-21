// Shared deployment-name classification. Dash-bounded so we don't
// false-positive on names like `prodigy-staging` or `reproductive-dev`,
// but still match `prod`, `prod-deploy`, `deploy-prod`, `foo-prod-bar`,
// and any variant with `-production-`/`-production$`.
// Imported by admin.ts (assertNotProd) and biomarker/lib/portalGates.ts
// (assertPortalEnabled).

export const PROD_DEPLOYMENT_PATTERNS: RegExp[] = [
  /(^|-)(prod|production)(-|$)/i,
];

export function isProdDeployment(deployment: string): boolean {
  return PROD_DEPLOYMENT_PATTERNS.some((p) => p.test(deployment));
}
