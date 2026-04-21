/// <reference types="vite/client" />
//
// Tests for reclassify_locks acquire/release mutations (Phase 2.5C, Task 20).

import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

describe("reclassify locks", () => {
  it("first caller acquires; second caller on same canonical fails", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(
      internal.biomarker.internalMutations.acquireReclassifyLock,
      {
        canonicalId: "hba1c",
        action: "reclassifyForCanonicalId",
        ttlMs: 300_000,
      },
    );
    expect(first.acquired).toBe(true);
    expect(first.ownerToken).toBeTruthy();

    const second = await t.mutation(
      internal.biomarker.internalMutations.acquireReclassifyLock,
      {
        canonicalId: "hba1c",
        action: "reclassifyForCanonicalId",
        ttlMs: 300_000,
      },
    );
    expect(second.acquired).toBe(false);
  });

  it("global lock blocks per-canonical acquisition", async () => {
    const t = convexTest(schema, modules);
    const global = await t.mutation(
      internal.biomarker.internalMutations.acquireReclassifyLock,
      {
        canonicalId: "*",
        action: "reclassifyAllReportsCommit",
        ttlMs: 300_000,
      },
    );
    expect(global.acquired).toBe(true);
    const perCanonical = await t.mutation(
      internal.biomarker.internalMutations.acquireReclassifyLock,
      {
        canonicalId: "hba1c",
        action: "reclassifyForCanonicalId",
        ttlMs: 300_000,
      },
    );
    expect(perCanonical.acquired).toBe(false);
  });

  it("per-canonical lock blocks global acquisition", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(
      internal.biomarker.internalMutations.acquireReclassifyLock,
      {
        canonicalId: "hba1c",
        action: "reclassifyForCanonicalId",
        ttlMs: 300_000,
      },
    );
    const global = await t.mutation(
      internal.biomarker.internalMutations.acquireReclassifyLock,
      {
        canonicalId: "*",
        action: "reclassifyAllReportsCommit",
        ttlMs: 300_000,
      },
    );
    expect(global.acquired).toBe(false);
  });

  it("release by matching token removes the lock", async () => {
    const t = convexTest(schema, modules);
    const acquired = await t.mutation(
      internal.biomarker.internalMutations.acquireReclassifyLock,
      {
        canonicalId: "tsh",
        action: "reclassifyForCanonicalId",
        ttlMs: 300_000,
      },
    );
    expect(acquired.acquired).toBe(true);
    await t.mutation(
      internal.biomarker.internalMutations.releaseReclassifyLock,
      { canonicalId: "tsh", ownerToken: acquired.ownerToken! },
    );
    const reacquire = await t.mutation(
      internal.biomarker.internalMutations.acquireReclassifyLock,
      {
        canonicalId: "tsh",
        action: "reclassifyForCanonicalId",
        ttlMs: 300_000,
      },
    );
    expect(reacquire.acquired).toBe(true);
  });

  it("release with wrong token does NOT remove the lock", async () => {
    const t = convexTest(schema, modules);
    const acquired = await t.mutation(
      internal.biomarker.internalMutations.acquireReclassifyLock,
      {
        canonicalId: "tsh",
        action: "reclassifyForCanonicalId",
        ttlMs: 300_000,
      },
    );
    await t.mutation(
      internal.biomarker.internalMutations.releaseReclassifyLock,
      { canonicalId: "tsh", ownerToken: "wrong-token" },
    );
    const reacquire = await t.mutation(
      internal.biomarker.internalMutations.acquireReclassifyLock,
      {
        canonicalId: "tsh",
        action: "reclassifyForCanonicalId",
        ttlMs: 300_000,
      },
    );
    expect(reacquire.acquired).toBe(false);
    // Silence unused var warning — existence of `acquired` above is the setup.
    expect(acquired.acquired).toBe(true);
  });

  it("expired lock is overwritable (stale-lock safety net)", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("reclassify_locks", {
        canonicalId: "hba1c",
        ownerToken: "ghost",
        acquiredAt: Date.now() - 600_000,
        expiresAt: Date.now() - 1000,
        action: "reclassifyForCanonicalId",
      });
    });
    const result = await t.mutation(
      internal.biomarker.internalMutations.acquireReclassifyLock,
      {
        canonicalId: "hba1c",
        action: "reclassifyForCanonicalId",
        ttlMs: 300_000,
      },
    );
    expect(result.acquired).toBe(true);
  });
});
