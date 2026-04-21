export type PortalName = "LAB" | "DOCTOR";

const PROD_PATTERN = /prod/i;

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
  const prod = PROD_PATTERN.test(deployment);
  const realAuth = env[`${portal}_PORTAL_REAL_AUTH`] === "1";
  if (prod && !realAuth) {
    throw new Error(`endpoint_disabled_unsafe_in_prod:${portal}`);
  }
}
