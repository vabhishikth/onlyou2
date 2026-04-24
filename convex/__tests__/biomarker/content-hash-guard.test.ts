/// <reference types="vite/client" />
import { readFileSync } from "node:fs";
import path from "node:path";

import { convexTest } from "convex-test";
import fg from "fast-glob";
import { describe, expect, it } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

describe("PENDING_HASH filter guard", () => {
  it("helper returns only real-hash matches and skips pending placeholders", async () => {
    const t = convexTest(schema, modules);

    const { userId, realHashRowId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        phone: "+919999900001",
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: false,
        createdAt: 1,
      });
      const fileId = await ctx.storage.store(new Blob(["x"]));
      await ctx.db.insert("lab_reports", {
        userId,
        contentHash: "pending:abc",
        source: "patient_upload",
        status: "analyzing",
        mimeType: "application/pdf",
        fileId,
        fileSizeBytes: 1,
        createdAt: 1,
      });
      const realHashRowId = await ctx.db.insert("lab_reports", {
        userId,
        contentHash: "deadbeef".repeat(8),
        source: "patient_upload",
        status: "ready",
        mimeType: "application/pdf",
        fileId,
        fileSizeBytes: 1,
        createdAt: 2,
      });
      return { userId, realHashRowId };
    });

    const found = await t.query(
      internal.biomarker.lib.findByContentHash.findLabReportByContentHashQuery,
      { userId, contentHash: "deadbeef".repeat(8) },
    );
    expect(found?._id).toBe(realHashRowId);

    const missingOnPending = await t.query(
      internal.biomarker.lib.findByContentHash.findLabReportByContentHashQuery,
      { userId, contentHash: "pending:abc" },
    );
    expect(missingOnPending).toBeNull();
  });

  it("no production convex file uses withIndex('by_user_hash', …) outside the helper", async () => {
    const files = await fg("convex/**/*.ts", {
      ignore: [
        "convex/_generated/**",
        "convex/__tests__/**",
        "convex/biomarker/lib/findByContentHash.ts",
      ],
    });
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(path.resolve(f), "utf8");
      if (/withIndex\s*\(\s*["'`]by_user_hash/.test(src)) {
        offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });
});
