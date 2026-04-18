// convex/admin.ts
//
// Dev-only administrative operations. Every mutation + action in this file
// MUST runtime-check that the deployment is not production before doing
// anything. Phase 2.5A ships the scaffold only; Plans 2.5B/C add actual
// operations (simulateLabUpload etc.).
//
// Guard pattern:
//   assertNotProd(ctx);
// Throws "admin operations are disabled in production" if the current
// Convex deployment name matches a production pattern.

import type { MutationCtx, ActionCtx } from "./_generated/server";

const PROD_DEPLOYMENT_PATTERNS = [/^prod$/i, /prod$/i, /^production$/i];

export function assertNotProd(_ctx: MutationCtx | ActionCtx): void {
  const deployment = process.env.CONVEX_DEPLOYMENT ?? "";
  const isProd = PROD_DEPLOYMENT_PATTERNS.some((p) => p.test(deployment));
  if (isProd) {
    throw new Error(
      "admin operations are disabled in production (CONVEX_DEPLOYMENT matched a prod pattern)",
    );
  }
}
