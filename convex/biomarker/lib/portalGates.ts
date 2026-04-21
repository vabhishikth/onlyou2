import { isProdDeployment } from "../../lib/envGuards";

export type PortalName = "LAB" | "DOCTOR";

export function assertPortalEnabled(
  portal: PortalName,
  deployment: string,
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): void {
  const enabled = env[`${portal}_PORTAL_ENABLED`] === "1";
  if (!enabled) {
    throw new Error(`endpoint_disabled:${portal}`);
  }
  const realAuth = env[`${portal}_PORTAL_REAL_AUTH`] === "1";
  if (isProdDeployment(deployment) && !realAuth) {
    throw new Error(`endpoint_disabled_unsafe_in_prod:${portal}`);
  }
}
