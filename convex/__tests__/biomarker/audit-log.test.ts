/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

describe("writeAuditLog", () => {
  it("records action + targetId + before/after", async () => {
    const t = convexTest(schema, modules);
    const adminUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        role: "ADMIN",
        phoneVerified: true,
        profileComplete: true,
        createdAt: Date.now(),
      });
    });

    const res = await t.mutation(
      internal.biomarker.internalMutations.writeAuditLog,
      {
        adminUserId,
        action: "range_update",
        targetTable: "biomarker_reference_ranges",
        targetId: "range-abc",
        before: { optimalMax: 4.5 },
        after: { optimalMax: 5.0 },
        now: 1_700_000_000_000,
      },
    );
    expect(res).toEqual({ written: true });

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("admin_audit_log").collect();
      expect(rows.length).toBe(1);
      const row = rows[0];
      expect(row.adminUserId).toBe(adminUserId);
      expect(row.action).toBe("range_update");
      expect(row.targetTable).toBe("biomarker_reference_ranges");
      expect(row.targetId).toBe("range-abc");
      expect(row.before).toEqual({ optimalMax: 4.5 });
      expect(row.after).toEqual({ optimalMax: 5.0 });
      expect(row.timestamp).toBe(1_700_000_000_000);
    });
  });

  it("system-triggered (adminUserId: null) uses sentinel admin when one exists", async () => {
    const t = convexTest(schema, modules);
    const adminUserId = await t.run(async (ctx) => {
      // Seed an unrelated patient first so the .first() query must
      // actually filter on role to find the admin.
      await ctx.db.insert("users", {
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        createdAt: Date.now(),
      });
      return await ctx.db.insert("users", {
        role: "ADMIN",
        phoneVerified: true,
        profileComplete: true,
        createdAt: Date.now(),
      });
    });

    const res = await t.mutation(
      internal.biomarker.internalMutations.writeAuditLog,
      {
        adminUserId: null,
        action: "reclassify_all_commit",
        targetTable: "biomarker_reference_ranges",
        targetId: "*",
        before: null,
        after: { changedValuesCount: 3 },
        now: 1_700_000_000_000,
      },
    );
    expect(res).toEqual({ written: true });

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("admin_audit_log").collect();
      expect(rows.length).toBe(1);
      expect(rows[0].adminUserId).toBe(adminUserId);
      expect(rows[0].action).toBe("reclassify_all_commit");
    });
  });

  it("system-triggered (adminUserId: null) skips write when no admin user exists", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      // Only a patient — no admin.
      await ctx.db.insert("users", {
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        createdAt: Date.now(),
      });
    });

    const res = await t.mutation(
      internal.biomarker.internalMutations.writeAuditLog,
      {
        adminUserId: null,
        action: "reclassify_all_preview",
        targetTable: "biomarker_reference_ranges",
        targetId: "*",
        before: null,
        after: { wouldChange: 0 },
        now: 1_700_000_000_000,
      },
    );
    expect(res).toEqual({ skipped: true });

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("admin_audit_log").collect();
      expect(rows.length).toBe(0);
    });
  });
});
