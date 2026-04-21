import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";

import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
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
  it("does not false-positive on prodigy-staging / reproductive-dev", () => {
    const env = { LAB_PORTAL_ENABLED: "1", LAB_PORTAL_REAL_AUTH: "" };
    expect(() =>
      assertPortalEnabled("LAB", "prodigy-staging", env),
    ).not.toThrow();
    expect(() =>
      assertPortalEnabled("LAB", "reproductive-dev", env),
    ).not.toThrow();
  });
  it("matches prod-suffix / prod-in-middle / bare prod", () => {
    const env = { LAB_PORTAL_ENABLED: "1", LAB_PORTAL_REAL_AUTH: "" };
    expect(() => assertPortalEnabled("LAB", "deploy-prod", env)).toThrow(
      /endpoint_disabled_unsafe_in_prod/,
    );
    expect(() => assertPortalEnabled("LAB", "foo-prod-bar", env)).toThrow(
      /endpoint_disabled_unsafe_in_prod/,
    );
    expect(() => assertPortalEnabled("LAB", "prod", env)).toThrow(
      /endpoint_disabled_unsafe_in_prod/,
    );
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

describe("biomarkerReportsForPatient query", () => {
  async function seedSession(
    t: ReturnType<typeof convexTest>,
    userId: Id<"users">,
  ): Promise<string> {
    const token = `tok-${userId}-${Date.now()}-${Math.random()}`;
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 60 * 60 * 1000,
        createdAt: Date.now(),
      });
    });
    return token;
  }

  it("throws endpoint_disabled when flag off", async () => {
    delete process.env.DOCTOR_PORTAL_ENABLED;
    const t = convexTest(schema, modules);
    const patientId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        createdAt: Date.now(),
      }),
    );
    const doctorId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        role: "DOCTOR",
        phoneVerified: true,
        profileComplete: true,
        createdAt: Date.now(),
      }),
    );
    const token = await seedSession(t, doctorId);
    await expect(
      t.query(
        api.biomarker.portal.biomarkerReportsForPatient
          .biomarkerReportsForPatient,
        { token, patientId },
      ),
    ).rejects.toThrow(/endpoint_disabled/);
  });

  it("throws unauthenticated when token missing or expired", async () => {
    process.env.DOCTOR_PORTAL_ENABLED = "1";
    process.env.CONVEX_DEPLOYMENT = "dev-deploy";
    const t = convexTest(schema, modules);
    const patientId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        createdAt: Date.now(),
      }),
    );
    await expect(
      t.query(
        api.biomarker.portal.biomarkerReportsForPatient
          .biomarkerReportsForPatient,
        { token: "bogus-token", patientId },
      ),
    ).rejects.toThrow(/unauthenticated/);
  });

  it("happy path on dev returns reports+values for patientId", async () => {
    process.env.DOCTOR_PORTAL_ENABLED = "1";
    process.env.CONVEX_DEPLOYMENT = "dev-deploy";
    delete process.env.DOCTOR_PORTAL_REAL_AUTH;
    const t = convexTest(schema, modules);
    const fid = await t.run(async (ctx) => {
      const blob = new Blob(["%PDF"], { type: "application/pdf" });
      return await ctx.storage.store(blob);
    });
    const { patientId, doctorId } = await t.run(async (ctx) => {
      const patientId = await ctx.db.insert("users", {
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        createdAt: Date.now(),
      });
      const doctorId = await ctx.db.insert("users", {
        role: "DOCTOR",
        phoneVerified: true,
        profileComplete: true,
        createdAt: Date.now(),
      });
      const lrid = await ctx.db.insert("lab_reports", {
        userId: patientId,
        source: "patient_upload",
        fileId: fid,
        mimeType: "application/pdf",
        fileSizeBytes: 1,
        contentHash: "x",
        status: "ready",
        createdAt: Date.now(),
      });
      const brid = await ctx.db.insert("biomarker_reports", {
        labReportId: lrid,
        userId: patientId,
        narrative: "test",
        narrativeModel: "m",
        optimalCount: 1,
        subOptimalCount: 0,
        actionRequiredCount: 0,
        unclassifiedCount: 0,
        analyzedAt: Date.now(),
      });
      await ctx.db.insert("biomarker_values", {
        biomarkerReportId: brid,
        userId: patientId,
        canonicalId: "tsh",
        nameOnReport: "TSH",
        valueType: "numeric",
        rawValue: "2.0",
        numericValue: 2.0,
        status: "optimal",
        classifiedAt: Date.now(),
      });
      return { patientId, doctorId };
    });
    const token = await seedSession(t, doctorId);

    const result = await t.query(
      api.biomarker.portal.biomarkerReportsForPatient
        .biomarkerReportsForPatient,
      { token, patientId },
    );
    expect(result).toHaveLength(1);
    expect(result[0].report.userId).toBe(patientId);
    expect(result[0].values).toHaveLength(1);
    expect(result[0].values[0].canonicalId).toBe("tsh");
    // Projection: internal fields must not leak.
    expect("_creationTime" in result[0].report).toBe(false);
    expect("deletedAt" in result[0].values[0]).toBe(false);
  });

  it("rejects when caller role is not doctor", async () => {
    process.env.DOCTOR_PORTAL_ENABLED = "1";
    process.env.CONVEX_DEPLOYMENT = "dev-deploy";
    const t = convexTest(schema, modules);
    const { patientId, nonDoctorId } = await t.run(async (ctx) => {
      const patientId = await ctx.db.insert("users", {
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        createdAt: Date.now(),
      });
      const nonDoctorId = await ctx.db.insert("users", {
        role: "NURSE",
        phoneVerified: true,
        profileComplete: true,
        createdAt: Date.now(),
      });
      return { patientId, nonDoctorId };
    });
    const token = await seedSession(t, nonDoctorId);
    await expect(
      t.query(
        api.biomarker.portal.biomarkerReportsForPatient
          .biomarkerReportsForPatient,
        { token, patientId },
      ),
    ).rejects.toThrow(/forbidden/);
  });
});
