import { describe, it, expect } from "vitest";

import { assertPortalEnabled } from "../../biomarker/lib/portalGates";

describe("assertPortalEnabled", () => {
  it("throws endpoint_disabled when flag is not '1'", () => {
    const env = { LAB_PORTAL_ENABLED: "", LAB_PORTAL_REAL_AUTH: "" };
    expect(() => assertPortalEnabled("LAB", "dev-deploy", env)).toThrow(
      /endpoint_disabled/,
    );
  });
  it("throws endpoint_disabled_unsafe_in_prod when prod+ENABLED=1+REAL_AUTH missing", () => {
    const env = { LAB_PORTAL_ENABLED: "1", LAB_PORTAL_REAL_AUTH: "" };
    expect(() => assertPortalEnabled("LAB", "prod-deploy", env)).toThrow(
      /endpoint_disabled_unsafe_in_prod/,
    );
  });
  it("passes when both ENABLED=1 AND REAL_AUTH=1 on prod", () => {
    const env = { LAB_PORTAL_ENABLED: "1", LAB_PORTAL_REAL_AUTH: "1" };
    expect(() => assertPortalEnabled("LAB", "prod-deploy", env)).not.toThrow();
  });
  it("passes on dev with only ENABLED=1 (no REAL_AUTH required)", () => {
    const env = { LAB_PORTAL_ENABLED: "1", LAB_PORTAL_REAL_AUTH: "" };
    expect(() => assertPortalEnabled("LAB", "dev-deploy", env)).not.toThrow();
  });
  it("applies the same pattern to DOCTOR", () => {
    const env = { DOCTOR_PORTAL_ENABLED: "1", DOCTOR_PORTAL_REAL_AUTH: "" };
    expect(() => assertPortalEnabled("DOCTOR", "prod-deploy", env)).toThrow(
      /endpoint_disabled_unsafe_in_prod/,
    );
    expect(() =>
      assertPortalEnabled("DOCTOR", "dev-deploy", env),
    ).not.toThrow();
  });
});
