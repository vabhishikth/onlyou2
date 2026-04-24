/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

describe("migrations.phase3a.normalizePhones", () => {
  it("rewrites spaced phones to E.164 and is idempotent", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        phone: "+91 99999 00001",
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: false,
        createdAt: 1,
      });
      await ctx.db.insert("users", {
        phone: "+919999900002",
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: false,
        createdAt: 2,
      });
      await ctx.db.insert("otpAttempts", {
        phone: "+91 99999 00003",
        hashedOtp: "x",
        attempts: 0,
        expiresAt: 10_000,
        createdAt: 1,
      });
    });

    const firstRun = await t.mutation(
      internal.migrations.phase3a.normalizePhones.run,
      {},
    );
    expect(firstRun).toEqual({
      usersUpdated: 1,
      usersAlreadyCanonical: 1,
      otpAttemptsUpdated: 1,
      usersDeleted: 0,
    });

    const secondRun = await t.mutation(
      internal.migrations.phase3a.normalizePhones.run,
      {},
    );
    expect(secondRun).toEqual({
      usersUpdated: 0,
      usersAlreadyCanonical: 2,
      otpAttemptsUpdated: 0,
      usersDeleted: 0,
    });

    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users.map((u) => u.phone).sort()).toEqual([
      "+919999900001",
      "+919999900002",
    ]);
  });

  it("merges a duplicate E.164 row when one already exists", async () => {
    const t = convexTest(schema, modules);

    const ids = await t.run(async (ctx) => {
      const canonical = await ctx.db.insert("users", {
        phone: "+919999900099",
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        createdAt: 1,
      });
      const legacy = await ctx.db.insert("users", {
        phone: "+91 99999 00099",
        role: "PATIENT",
        phoneVerified: false,
        profileComplete: false,
        createdAt: 2,
      });
      await ctx.db.insert("sessions", {
        userId: legacy,
        token: "t",
        expiresAt: Date.now() + 1000,
        createdAt: Date.now(),
      });
      return { canonical, legacy };
    });

    const result = await t.mutation(
      internal.migrations.phase3a.normalizePhones.run,
      {},
    );
    expect(result.usersDeleted).toBe(1);

    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(1);
    expect(users[0].phone).toBe("+919999900099");
    expect(users[0]._id).toBe(ids.canonical);

    const sessions = await t.run((ctx) => ctx.db.query("sessions").collect());
    expect(sessions).toHaveLength(1);
    expect(sessions[0].userId).toBe(users[0]._id);
  });

  it("merge reassigns every userId-scoped table to the canonical row", async () => {
    const t = convexTest(schema, modules);

    const { canonical, legacy } = await t.run(async (ctx) => {
      const canonical = await ctx.db.insert("users", {
        phone: "+919888800088",
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        createdAt: 1,
      });
      const legacy = await ctx.db.insert("users", {
        phone: "+91 98888 00088",
        role: "PATIENT",
        phoneVerified: false,
        profileComplete: false,
        createdAt: 2,
      });

      // sessions
      await ctx.db.insert("sessions", {
        userId: legacy,
        token: "tok-legacy",
        expiresAt: Date.now() + 10_000,
        createdAt: Date.now(),
      });

      // lab_reports — requires a real storage blob for fileId
      const fakeBlob = new Blob(["%PDF-1.4 stub"], { type: "application/pdf" });
      const fileId = await ctx.storage.store(fakeBlob);
      const labReportId = await ctx.db.insert("lab_reports", {
        userId: legacy,
        source: "patient_upload",
        fileId,
        mimeType: "application/pdf",
        fileSizeBytes: 14,
        contentHash: "stub-hash-001",
        status: "uploaded",
        createdAt: Date.now(),
      });

      // biomarker_reports — references the lab_report above
      const biomarkerReportId = await ctx.db.insert("biomarker_reports", {
        userId: legacy,
        labReportId,
        narrative: "stub narrative",
        narrativeModel: "stub-model",
        optimalCount: 0,
        subOptimalCount: 0,
        actionRequiredCount: 0,
        unclassifiedCount: 1,
        analyzedAt: Date.now(),
      });

      // biomarker_values — references the biomarker_report above
      await ctx.db.insert("biomarker_values", {
        userId: legacy,
        biomarkerReportId,
        nameOnReport: "TSH",
        valueType: "numeric",
        rawValue: "2.5",
        status: "optimal",
        classifiedAt: Date.now(),
      });

      // lab_orders
      await ctx.db.insert("lab_orders", {
        userId: legacy,
        requestedMarkers: ["tsh"],
        status: "draft",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // parse_rate_limits
      await ctx.db.insert("parse_rate_limits", {
        userId: legacy,
        windowType: "day",
        dateBucket: "2026-04-24",
        count: 1,
        updatedAt: Date.now(),
      });

      // notifications
      await ctx.db.insert("notifications", {
        userId: legacy,
        kind: "lab_report_ready",
        title: "Your report is ready",
        body: "View your biomarker report",
        createdAt: Date.now(),
      });

      // biomarker_curation_queue — resolvedByUserId optional FK
      await ctx.db.insert("biomarker_curation_queue", {
        normalizedKey: "tsh",
        nameOnReport: "TSH",
        firstSeenBiomarkerReportId: biomarkerReportId,
        occurrenceCount: 1,
        lastSeenAt: Date.now(),
        status: "resolved",
        resolvedByUserId: legacy,
        resolvedAt: Date.now(),
      });

      // lab_orders — orderedByUserId optional FK (admin/doctor who ordered;
      // distinct from the patient userId already inserted above)
      await ctx.db.insert("lab_orders", {
        userId: canonical, // patient is canonical; orderedByUserId is the legacy admin
        requestedMarkers: ["tsh"],
        status: "draft",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        orderedByUserId: legacy,
      });

      return { canonical, legacy };
    });

    const result = await t.mutation(
      internal.migrations.phase3a.normalizePhones.run,
      {},
    );
    expect(result.usersDeleted).toBe(1);

    // Legacy user is gone
    const legacyUser = await t.run((ctx) => ctx.db.get(legacy));
    expect(legacyUser).toBeNull();

    // All child rows now point at canonical
    const childSessions = await t.run((ctx) =>
      ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", canonical))
        .collect(),
    );
    expect(childSessions).toHaveLength(1);

    const childLabReports = await t.run((ctx) =>
      ctx.db
        .query("lab_reports")
        .withIndex("by_user_created", (q) => q.eq("userId", canonical))
        .collect(),
    );
    expect(childLabReports).toHaveLength(1);

    const childBiomarkerReports = await t.run((ctx) =>
      ctx.db
        .query("biomarker_reports")
        .withIndex("by_user_analyzed", (q) => q.eq("userId", canonical))
        .collect(),
    );
    expect(childBiomarkerReports).toHaveLength(1);

    const childBiomarkerValues = await t.run((ctx) =>
      ctx.db
        .query("biomarker_values")
        .filter((q) => q.eq(q.field("userId"), canonical))
        .collect(),
    );
    expect(childBiomarkerValues).toHaveLength(1);

    const childLabOrders = await t.run((ctx) =>
      ctx.db
        .query("lab_orders")
        .withIndex("by_user", (q) => q.eq("userId", canonical))
        .collect(),
    );
    // 2 rows: the original patient row (userId: legacy → reassigned) +
    // the admin-ordered row (userId: canonical from the start)
    expect(childLabOrders).toHaveLength(2);

    const childParseRateLimits = await t.run((ctx) =>
      ctx.db
        .query("parse_rate_limits")
        .filter((q) => q.eq(q.field("userId"), canonical))
        .collect(),
    );
    expect(childParseRateLimits).toHaveLength(1);

    const childNotifications = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_user_created", (q) => q.eq("userId", canonical))
        .collect(),
    );
    expect(childNotifications).toHaveLength(1);

    // biomarker_curation_queue — resolvedByUserId reassigned
    const curationRows = await t.run((ctx) =>
      ctx.db
        .query("biomarker_curation_queue")
        .filter((q) => q.eq(q.field("resolvedByUserId"), canonical))
        .collect(),
    );
    expect(curationRows).toHaveLength(1);
    expect(curationRows[0].resolvedByUserId).toBe(canonical);

    // lab_orders — orderedByUserId reassigned (the admin/doctor row, patient is canonical)
    const orderedByRows = await t.run((ctx) =>
      ctx.db
        .query("lab_orders")
        .filter((q) => q.eq(q.field("orderedByUserId"), canonical))
        .collect(),
    );
    expect(orderedByRows).toHaveLength(1);
    expect(orderedByRows[0].orderedByUserId).toBe(canonical);

    // No orphaned rows remain under legacy
    const orphanedSessions = await t.run((ctx) =>
      ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", legacy))
        .collect(),
    );
    expect(orphanedSessions).toHaveLength(0);
  });
});
