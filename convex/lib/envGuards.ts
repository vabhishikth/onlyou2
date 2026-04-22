// Shared deployment-name classification. Re-exports from
// `packages/core/src/deployment/prod-patterns` so Convex functions + Node
// scripts share a single canonical regex + helper. Imported by admin.ts
// (assertNotProd) and biomarker/lib/portalGates.ts (assertPortalEnabled).

export {
  PROD_DEPLOYMENT_PATTERNS,
  isProdDeployment,
} from "../../packages/core/src/deployment/prod-patterns";
