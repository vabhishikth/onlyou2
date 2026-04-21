import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";

import { api } from "../../_generated/api";
import { assertPortalEnabled } from "../../biomarker/lib/portalGates";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

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

describe("labUploadResult mutation", () => {
  async function seedOrder(t: ReturnType<typeof convexTest>) {
    const fileId = await t.run(async (ctx) => {
      const blob = new Blob(["%PDF-1.4 fake"], { type: "application/pdf" });
      return await ctx.storage.store(blob);
    });
    return await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        createdAt: Date.now(),
      });
      const labOrderId = await ctx.db.insert("lab_orders", {
        userId,
        requestedMarkers: ["tsh"],
        status: "awaiting_results",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { userId, labOrderId, fileId };
    });
  }

  it("throws endpoint_disabled when LAB_PORTAL_ENABLED != 1", async () => {
    delete process.env.LAB_PORTAL_ENABLED;
    delete process.env.LAB_PORTAL_REAL_AUTH;
    const t = convexTest(schema, modules);
    const { labOrderId, fileId } = await seedOrder(t);
    await expect(
      t.mutation(api.biomarker.portal.labUploadResult.labUploadResult, {
        labPartnerToken: "any",
        labOrderId,
        fileId,
        mimeType: "application/pdf",
        fileSizeBytes: 1024,
      }),
    ).rejects.toThrow(/endpoint_disabled/);
  });

  it("happy path when LAB_PORTAL_ENABLED=1 on dev (no REAL_AUTH needed)", async () => {
    process.env.LAB_PORTAL_ENABLED = "1";
    process.env.CONVEX_DEPLOYMENT = "dev-deploy";
    delete process.env.LAB_PORTAL_REAL_AUTH;
    const t = convexTest(schema, modules);
    const { labOrderId, fileId } = await seedOrder(t);
    const result = await t.mutation(
      api.biomarker.portal.labUploadResult.labUploadResult,
      {
        labPartnerToken: "any-nonempty",
        labOrderId,
        fileId,
        mimeType: "application/pdf",
        fileSizeBytes: 1024,
      },
    );
    expect(result).toHaveProperty("labReportId");
    expect(result.status).toBe("uploaded");
  });

  it("throws invalid_order_state when order is not awaiting_results", async () => {
    process.env.LAB_PORTAL_ENABLED = "1";
    process.env.CONVEX_DEPLOYMENT = "dev-deploy";
    const t = convexTest(schema, modules);
    const { labOrderId, fileId } = await seedOrder(t);
    await t.run(async (ctx) =>
      ctx.db.patch(labOrderId, { status: "cancelled" }),
    );
    await expect(
      t.mutation(api.biomarker.portal.labUploadResult.labUploadResult, {
        labPartnerToken: "any",
        labOrderId,
        fileId,
        mimeType: "application/pdf",
        fileSizeBytes: 1024,
      }),
    ).rejects.toThrow(/invalid_order_state/);
  });

  it("emits lab_report_uploaded_for_you notification", async () => {
    process.env.LAB_PORTAL_ENABLED = "1";
    process.env.CONVEX_DEPLOYMENT = "dev-deploy";
    const t = convexTest(schema, modules);
    const { userId, labOrderId, fileId } = await seedOrder(t);
    await t.mutation(api.biomarker.portal.labUploadResult.labUploadResult, {
      labPartnerToken: "x",
      labOrderId,
      fileId,
      mimeType: "application/pdf",
      fileSizeBytes: 1024,
    });
    const notifs = await t.run(async (ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_user_created", (q) => q.eq("userId", userId))
        .collect(),
    );
    expect(
      notifs.filter((n) => n.kind === "lab_report_uploaded_for_you").length,
    ).toBe(1);
  });
});
