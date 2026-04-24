# Phase 3A — Pre-flight Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the five security/data unblockers that must land before Phase 3B accepts real users — phone E.164 normalization + migration, dev-OTP prod gate, Anthropic key rotation, PENDING_HASH filter guard, and 45 DRAFT reference ranges → `reviewed`.

**Architecture:** Five independent hardening tracks, all small. Phone E.164 is the biggest — pure helper + Convex migration + mobile caller update + fixture/seed sweep + test update. Dev-OTP gate reuses the existing `isProdDeployment()` plus a new `NODE_ENV !== "production"` check (defense in depth). Anthropic key rotation is an ops runbook + live E2E re-run. PENDING_HASH is a `findLabReportByContentHash()` helper + a vitest guard that fails if raw `withIndex("by_user_hash", …)` appears outside it. DRAFT→reviewed is a clinical-advisor signoff packet + seed JSON update + schema-level audit assertion.

**Tech Stack:** TypeScript · Convex (actions, mutations, migrations) · vitest · bcryptjs · Expo React Native (phone-verify screen) · Anthropic SDK (E2E live re-verify).

**Spec:** `docs/superpowers/specs/2026-04-24-phase-3-hair-loss-e2e-design.md` §3 (3A scope).

---

## File Structure

### New files

| File                                                    | Responsibility                                                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/phone/e164.ts`                       | Pure E.164 normalizer + formatter + tests. Accepts `"+91 99999 00001"`, `"9999900001"`, `"+919999900001"`, `"+91-99999-00001"` → `"+919999900001"`. |
| `packages/core/src/phone/e164.test.ts`                  | Vitest unit tests for all accepted and rejected input shapes.                                                                                       |
| `convex/migrations/phase3a/normalizePhones.ts`          | One-shot internal migration. Rewrites `users.phone` + `otpAttempts.phone` to E.164. Idempotent.                                                     |
| `convex/migrations/phase3a/_README.md`                  | Migration invocation + rollback notes.                                                                                                              |
| `convex/biomarker/lib/findByContentHash.ts`             | Shared helper `findLabReportByContentHash(ctx, userId, hash)` that filters `PENDING_HASH_PREFIX` before returning.                                  |
| `convex/__tests__/biomarker/content-hash-guard.test.ts` | Vitest guard — greps the Convex src tree and fails if any raw `withIndex("by_user_hash",` occurs outside `findByContentHash.ts`.                    |
| `docs/runbooks/3A-anthropic-key-rotation.md`            | Step-by-step key rotation procedure (console → env → verify via `pnpm test:claude` or `pnpm e2e:manual`).                                           |
| `docs/decisions/2026-04-24-phase-3a-dev-otp-gate.md`    | Decision record — why NODE_ENV **and** isProdDeployment (defense in depth) vs either alone.                                                         |

### Modified files

| File                                                         | Change                                                                                                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `convex/auth/otp.ts`                                         | `DEV_BYPASS_PREFIX` changes to E.164 (`"+9199999000"`). New helper `isDevBypassAllowed()` returns `false` if prod. Lines 20, 67–69, 82. |
| `convex/auth/otpDb.ts`                                       | Normalize `phone` inputs on entry (all four mutations/queries) via the new helper. Lines 28–32, 46–52, 56–64, 73–79, 95–99.             |
| `convex/users.ts`                                            | Normalize `phone` in `getUserByPhone` + `createUser`. Lines 59–84.                                                                      |
| `apps/mobile/app/(auth)/phone-verify.tsx:32`                 | Build E.164 (`+91${digits}`) instead of spaced format.                                                                                  |
| `apps/mobile/src/fixtures/patient-states.ts:108,123,165,234` | Fixture phones → E.164.                                                                                                                 |
| `convex/seed/fakeUsers.ts`                                   | Seed phones → E.164 (pre-normalize at write time).                                                                                      |
| `convex/seed/devBiomarkerReport.ts`                          | `ARJUN_PHONE` → E.164.                                                                                                                  |
| `convex/__tests__/auth.test.ts:102–117`                      | Flip the existing "works regardless of NODE_ENV" lock-in test to expect rejection on `NODE_ENV=production`.                             |
| `convex/__tests__/auth.test.ts:21,49,72,104,123,161`         | All test phones updated to E.164.                                                                                                       |
| `convex/__tests__/users.test.ts:39,58,82,…`                  | Same — test phones to E.164.                                                                                                            |
| `packages/core/seeds/biomarker-ranges.json`                  | All 45 rows: `clinicalReviewer` → signoff name (TBD from advisor); `reviewedAt` → Unix-ms timestamp. Bulk edit once advisor replies.    |
| `convex/__tests__/biomarker/seed-validation.test.ts`         | Add assertion: **every** row has `clinicalReviewer !== "DRAFT — pending review"` and `reviewedAt !== null`. This gates any regression.  |
| `checkpoint.md`                                              | Append Phase 3A progress.                                                                                                               |
| `docs/DEFERRED.md`                                           | Strike-through entries for lock-in test flip (line 231), Anthropic key rotation, 45 DRAFT ranges, PENDING_HASH guard.                   |

---

## Task 0: Scaffold worktree + branch

**Files:** git worktree operations only.

- [ ] **Step 1: Create worktree and branch off master**

```bash
git worktree add -b phase-3a ../onlyou2-phase-3a master
cd ../onlyou2-phase-3a
```

- [ ] **Step 2: Copy gitignored env files**

```bash
cp ../onlyou2/.env.local ./.env.local
cp ../onlyou2/apps/mobile/.env.local ./apps/mobile/.env.local
```

(From user memory: `EXPO_PUBLIC_CONVEX_URL` is gitignored and Expo crashes without it.)

- [ ] **Step 3: Install deps + baseline typecheck + test**

```bash
pnpm install
pnpm -w typecheck --force
pnpm test:convex
pnpm --filter @onlyou/mobile test
```

Expected: all green. Capture baseline counts — **convex 218/218, mobile 237/237**, seed 19/19 per checkpoint.

---

## Task 1: E.164 normalizer helper

**Files:**

- Create: `packages/core/src/phone/e164.ts`
- Create: `packages/core/src/phone/e164.test.ts`
- Modify: `packages/core/src/index.ts` (add export)

### 1.1 Write the failing tests

- [ ] **Step 1: Write the full test file**

```ts
// packages/core/src/phone/e164.test.ts
import { describe, it, expect } from "vitest";

import { normalizePhoneE164, isValidE164 } from "./e164";

describe("normalizePhoneE164", () => {
  it.each([
    ["+91 99999 00001", "+919999900001"],
    ["+919999900001", "+919999900001"],
    ["9999900001", "+919999900001"],
    ["09999900001", "+919999900001"],
    ["+91-99999-00001", "+919999900001"],
    ["  +91 99999 00001  ", "+919999900001"],
    ["+91 (99999) 00001", "+919999900001"],
  ])("normalises %s → %s", (input, expected) => {
    expect(normalizePhoneE164(input)).toBe(expected);
  });

  it.each([
    [""],
    ["abcd"],
    ["99999"], // too short
    ["+9199999000012345"], // too long
    ["+1 202 555 0100"], // non-IN country code — we only accept +91 in MVP
    ["+91 00000 00001"], // invalid IN mobile prefix (must start 6–9)
  ])("rejects %s", (input) => {
    expect(() => normalizePhoneE164(input)).toThrow(/invalid phone/i);
  });
});

describe("isValidE164", () => {
  it("accepts a normalised Indian mobile", () => {
    expect(isValidE164("+919999900001")).toBe(true);
  });

  it("rejects a spaced format", () => {
    expect(isValidE164("+91 99999 00001")).toBe(false);
  });

  it("rejects non-+91 numbers", () => {
    expect(isValidE164("+12025550100")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it — confirm it fails (module not defined)**

```bash
pnpm --filter @onlyou/core test -- e164
```

Expected: FAIL — `Cannot find module './e164'`.

### 1.2 Implement

- [ ] **Step 3: Write the implementation**

```ts
// packages/core/src/phone/e164.ts
//
// India-only E.164 normaliser. MVP scope is IN mobile numbers; extending to
// other country codes means widening INDIAN_MOBILE_E164 and relaxing the
// strip step. The goal is a single canonical representation so
// users.by_phone and otpAttempts.by_phone never split one human across
// multiple rows.

const INDIAN_MOBILE_E164 = /^\+91[6-9]\d{9}$/;

/**
 * Canonicalise any user-entered Indian mobile to +91XXXXXXXXXX.
 * Throws if the input can't be coerced to a valid IN mobile.
 */
export function normalizePhoneE164(input: string): string {
  if (typeof input !== "string") {
    throw new Error("invalid phone: not a string");
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error("invalid phone: empty");
  }

  // Strip everything except digits and a single leading +.
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  let candidate: string;
  if (hasPlus) {
    if (digits.startsWith("91")) {
      candidate = `+${digits}`;
    } else {
      throw new Error(`invalid phone: non-+91 country code (${input})`);
    }
  } else if (digits.length === 10) {
    candidate = `+91${digits}`;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    // "09999900001" — domestic trunk prefix.
    candidate = `+91${digits.slice(1)}`;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    candidate = `+${digits}`;
  } else {
    throw new Error(`invalid phone: ambiguous length (${input})`);
  }

  if (!INDIAN_MOBILE_E164.test(candidate)) {
    throw new Error(`invalid phone: not a valid IN mobile (${input})`);
  }
  return candidate;
}

export function isValidE164(input: string): boolean {
  return INDIAN_MOBILE_E164.test(input);
}
```

- [ ] **Step 4: Add export**

Modify `packages/core/src/index.ts` — add:

```ts
export * from "./phone/e164";
```

- [ ] **Step 5: Run tests — confirm pass**

```bash
pnpm --filter @onlyou/core test -- e164
```

Expected: PASS — all `it.each` rows green.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/phone/ packages/core/src/index.ts
git commit -m "feat(phase-3a): E.164 phone normaliser in @onlyou/core"
```

---

## Task 2: Wire normalizer into Convex auth + users

**Files:**

- Modify: `convex/users.ts:59–85`
- Modify: `convex/auth/otpDb.ts` (all five mutations/queries that accept `phone`)

### 2.1 Tests first

- [ ] **Step 1: Add normalizer test to auth.test.ts (append a new describe block)**

```ts
// convex/__tests__/auth.test.ts — append at end
describe("auth.otp — phone normalisation", () => {
  it("spaced and unspaced callers resolve to the same user row", async () => {
    const t = convexTest(schema, modules);
    const spaced = "+91 99999 00050";
    const e164 = "+919999900050";

    await t.action(api.auth.otp.sendOtp, { phone: spaced });
    const a = await t.action(api.auth.otp.verifyOtp, {
      phone: spaced,
      otp: "000000",
    });

    await t.action(api.auth.otp.sendOtp, { phone: e164 });
    const b = await t.action(api.auth.otp.verifyOtp, {
      phone: e164,
      otp: "000000",
    });

    expect(a.userId).toBe(b.userId);

    const users = await t.run(async (ctx) =>
      ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", e164))
        .collect(),
    );
    expect(users).toHaveLength(1);
    expect(users[0].phone).toBe(e164);
  });
});
```

- [ ] **Step 2: Run — confirm fail**

```bash
pnpm test:convex -- auth.test
```

Expected: FAIL — current code stores `"+91 99999 00050"` and `"+919999900050"` as two separate rows.

### 2.2 Implement the normalisation

- [ ] **Step 3: Update `convex/auth/otpDb.ts`**

At the top of the file, add:

```ts
import { normalizePhoneE164 } from "../../packages/core/src/phone/e164";
```

Then normalise `phone` at entry in every handler that accepts it. Example for `upsertOtpAttempt`:

```ts
export const upsertOtpAttempt = mutation({
  args: {
    phone: v.string(),
    hashedOtp: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const phone = normalizePhoneE164(args.phone);
    const existing = await ctx.db
      .query("otpAttempts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    await ctx.db.insert("otpAttempts", {
      phone,
      hashedOtp: args.hashedOtp,
      expiresAt: args.expiresAt,
      attempts: 0,
      createdAt: Date.now(),
    });
  },
});
```

Apply the same pattern to `getAttempt`, `incrementAttempt`, and `finalizeSignIn` — each rebinds `phone = normalizePhoneE164(input)` before any `withIndex("by_phone", …)` or `insert("users", { phone, … })`.

- [ ] **Step 4: Update `convex/users.ts`**

```ts
import { normalizePhoneE164 } from "../packages/core/src/phone/e164";

export const getUserByPhone = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const normalized = normalizePhoneE164(phone);
    return await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", normalized))
      .unique();
  },
});

export const createUser = internalMutation({
  args: {
    phone: v.string(),
    role: roleValidator,
    phoneVerified: v.boolean(),
    profileComplete: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      phone: normalizePhoneE164(args.phone),
      role: args.role,
      phoneVerified: args.phoneVerified,
      profileComplete: args.profileComplete,
      createdAt: Date.now(),
    });
  },
});
```

- [ ] **Step 5: Update `convex/auth/otp.ts` — normalise on entry of both actions**

```ts
// convex/auth/otp.ts (action file, "use node")
import { normalizePhoneE164 } from "../../packages/core/src/phone/e164";

// inside sendOtp handler, before randomSixDigit():
const phone = normalizePhoneE164(rawPhone);
// use `phone` throughout.

// inside verifyOtp handler, same:
const phone = normalizePhoneE164(rawPhone);
```

Rename handler params to `rawPhone` to avoid shadowing.

- [ ] **Step 6: Run the new test — confirm pass**

```bash
pnpm test:convex -- auth.test
```

Expected: PASS — both callers resolve to one row.

- [ ] **Step 7: Commit**

```bash
git add convex/auth/ convex/users.ts convex/__tests__/auth.test.ts
git commit -m "feat(phase-3a): normalise phones to E.164 at every auth entry point"
```

---

## Task 3: users + otpAttempts migration (phone → E.164)

**Files:**

- Create: `convex/migrations/phase3a/normalizePhones.ts`
- Create: `convex/migrations/phase3a/_README.md`
- Create: `convex/__tests__/migrations/normalizePhones.test.ts`

### 3.1 Write the migration test

- [ ] **Step 1: Write the test**

```ts
// convex/__tests__/migrations/normalizePhones.test.ts
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

    await t.run(async (ctx) => {
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

    // Sessions from the legacy row are reassigned to the canonical row.
    const sessions = await t.run((ctx) => ctx.db.query("sessions").collect());
    expect(sessions).toHaveLength(1);
    expect(sessions[0].userId).toBe(users[0]._id);
  });
});
```

- [ ] **Step 2: Run — confirm fail (module missing)**

```bash
pnpm test:convex -- normalizePhones
```

Expected: FAIL with `Cannot find module`.

### 3.2 Implement the migration

- [ ] **Step 3: Write `convex/migrations/phase3a/normalizePhones.ts`**

```ts
// One-shot migration. Invoked once per deployment via
//   npx convex run migrations/phase3a/normalizePhones:run
// Idempotent: re-running after success reports 0 updates.
//
// Strategy:
//   1. Scan users. For each row whose phone !== normalizePhoneE164(phone):
//      - If no row exists at the canonical phone: patch in place.
//      - Else: merge — reassign child rows to the canonical user, delete
//        the legacy row.
//   2. Scan otpAttempts. Normalise phone in place (no merge needed; OTPs
//      are 5-minute windows, collisions are transient).

import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { normalizePhoneE164 } from "../../../packages/core/src/phone/e164";

type MigrationResult = {
  usersUpdated: number;
  usersAlreadyCanonical: number;
  usersDeleted: number;
  otpAttemptsUpdated: number;
};

export const run = internalMutation({
  args: {},
  handler: async (ctx): Promise<MigrationResult> => {
    let usersUpdated = 0;
    let usersAlreadyCanonical = 0;
    let usersDeleted = 0;
    let otpAttemptsUpdated = 0;

    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      let normalized: string;
      try {
        normalized = normalizePhoneE164(u.phone);
      } catch {
        // Skip users with malformed phones; logged for manual review.
        console.warn(
          `[phase3a] skipping user ${u._id} — unparseable phone ${u.phone}`,
        );
        continue;
      }

      if (normalized === u.phone) {
        usersAlreadyCanonical++;
        continue;
      }

      const canonical = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", normalized))
        .unique();

      if (!canonical) {
        await ctx.db.patch(u._id, { phone: normalized });
        usersUpdated++;
        continue;
      }

      // Merge: reassign sessions, delete legacy user.
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .collect();
      for (const s of sessions) {
        await ctx.db.patch(s._id, { userId: canonical._id });
      }
      await ctx.db.delete(u._id);
      usersDeleted++;
    }

    const attempts = await ctx.db.query("otpAttempts").collect();
    for (const a of attempts) {
      let normalized: string;
      try {
        normalized = normalizePhoneE164(a.phone);
      } catch {
        await ctx.db.delete(a._id);
        continue;
      }
      if (normalized !== a.phone) {
        // Drop existing canonical-row (if any) to avoid unique-phone violation.
        const dupe = await ctx.db
          .query("otpAttempts")
          .withIndex("by_phone", (q) => q.eq("phone", normalized))
          .unique();
        if (dupe) await ctx.db.delete(dupe._id);
        await ctx.db.patch(a._id, { phone: normalized });
        otpAttemptsUpdated++;
      }
    }

    return {
      usersUpdated,
      usersAlreadyCanonical,
      usersDeleted,
      otpAttemptsUpdated,
    };
  },
});
```

- [ ] **Step 4: Write the runbook**

`convex/migrations/phase3a/_README.md`:

````markdown
# Phase 3A — phone E.164 migration

**Date added:** 2026-04-24

## Run on dev

```bash
npx convex run migrations/phase3a/normalizePhones:run
```
````

Expected result on first run: `{ usersUpdated: N, usersAlreadyCanonical: M, usersDeleted: K, otpAttemptsUpdated: P }`.

Re-run to confirm idempotency — `usersUpdated` and `otpAttemptsUpdated` must be 0 on the second run.

## Rollback

None. The migration strips spaces and prefixes; there is no canonical
"un-normalised" form to restore to. If merge behaviour causes a bad row
collapse, restore from Convex's built-in snapshot (`convex snapshot list` /
`convex snapshot import`).

## Invocation in production

Run **once**, after the code containing this file is deployed. Logs any
skipped rows (unparseable phones) for manual review.

````

- [ ] **Step 5: Run the migration test — confirm pass**

```bash
pnpm test:convex -- normalizePhones
````

Expected: PASS — both idempotency and merge paths green.

- [ ] **Step 6: Regenerate Convex codegen**

```bash
npx convex codegen
```

- [ ] **Step 7: Run the migration against dev**

```bash
npx convex run migrations/phase3a/normalizePhones:run
```

Record the result counts in `checkpoint.md` under Phase 3A Task 3.

- [ ] **Step 8: Commit**

```bash
git add convex/migrations/phase3a/ convex/__tests__/migrations/ convex/_generated/
git commit -m "feat(phase-3a): users + otpAttempts phone E.164 migration"
```

---

## Task 4: Mobile phone-verify emits E.164

**Files:**

- Modify: `apps/mobile/app/(auth)/phone-verify.tsx:32`
- Modify: `apps/mobile/src/fixtures/patient-states.ts:108,123,165,234`

- [ ] **Step 1: Update `phone-verify.tsx` line 32**

Replace:

```ts
const phone = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
```

with:

```ts
const phone = `+91${digits}`;
```

- [ ] **Step 2: Update the four fixture phones**

In `apps/mobile/src/fixtures/patient-states.ts`:

```ts
// line 108
phone: "+919999900001",
// line 123
phone: "+919999900002",
// line 165
phone: "+919999900003",
// line 234
phone: "+919999900004",
```

- [ ] **Step 3: Run mobile tests**

```bash
pnpm --filter @onlyou/mobile test
```

Expected: 237/237 pass (fixtures only feed display code — no string-format assertion today).

- [ ] **Step 4: Manual smoke — rebuild and log in**

Start Expo dev, log in with a test number. Convex logs should show `[OTP] +919999900001 → NNNNNN` (no spaces).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/
git commit -m "feat(phase-3a): mobile phone-verify emits E.164"
```

---

## Task 5: Dev-OTP prod gate (double-check: NODE_ENV + isProdDeployment)

**Files:**

- Modify: `convex/auth/otp.ts:20,67–69`
- Create: `docs/decisions/2026-04-24-phase-3a-dev-otp-gate.md`

### 5.1 Decision record

- [ ] **Step 1: Write the decision**

```markdown
# Dev-OTP bypass: double-gated in Phase 3A

**Date:** 2026-04-24
**Status:** Decided

## Context

Phase 2 shipped `DEV_BYPASS_PREFIX = "+91 99999 000"` + `DEV_BYPASS_OTP = "000000"` — any number matching the prefix skips bcrypt compare. There was no environment gate: prod would accept the bypass.

Spec 2026-04-24-phase-3-hair-loss-e2e §3A requires gating behind `NODE_ENV !== "production"`.

## Decision

Gate the bypass behind **both** checks:

1. `process.env.NODE_ENV !== "production"` (Node convention; trivially spoofable on a compromised host but standard defence-in-depth).
2. `!isProdDeployment(process.env.CONVEX_DEPLOYMENT ?? "")` — the same helper `admin.ts` uses for `assertNotProd()`.

Both must pass. If either is unset or ambiguous, default-deny.

## Why both

- `NODE_ENV` alone: Convex Node actions inherit `NODE_ENV` but dashboard-triggered actions don't reliably have it set; an operator who forgets to set it on a staging-as-prod environment would leave the bypass open.
- `isProdDeployment` alone: works because Convex always sets `CONVEX_DEPLOYMENT`, but ties the gate to deployment naming convention. If someone names a new prod deployment outside `PROD_DEPLOYMENT_PATTERNS`, the bypass re-opens.
- Both together: either axis failing closes the gate. Adding a non-prod-conforming deployment name is a separate guard-regression from forgetting `NODE_ENV`.

## Consequences

- Test `auth.test.ts:102` flips from "works regardless of NODE_ENV" (lock-in) to "refuses when NODE_ENV=production" (guard). This is the intentional red→green flip mentioned in `checkpoint.md:20`.
- `scripts/run-manual-e2e.ts` already runs against dev deployments matching `aromatic-labrador-938` (non-prod per `PROD_DEPLOYMENT_PATTERNS`); no change needed.
- Production `verifyOtp` calls on a `+91 99999 000XX` number will run the real bcrypt compare — the attempt will fail because no `otpAttempts` row is ever created by the real sender for those numbers, but that's the correct failure mode.
```

### 5.2 Implement

- [ ] **Step 2: Update `convex/auth/otp.ts`**

```ts
// convex/auth/otp.ts — top of file after imports
import { isProdDeployment } from "../lib/envGuards";
import { normalizePhoneE164 } from "../../packages/core/src/phone/e164";

// ... existing constants ...
const DEV_BYPASS_PREFIX = "+9199999000"; // E.164; matches +919999900000..99 range
const DEV_BYPASS_OTP = "000000";

function isDevBypassAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (isProdDeployment(process.env.CONVEX_DEPLOYMENT ?? "")) return false;
  return true;
}
```

Then in `verifyOtp` handler replace the `isDevBypass` line:

```ts
const isDevBypass =
  isDevBypassAllowed() &&
  phone.startsWith(DEV_BYPASS_PREFIX) &&
  otp === DEV_BYPASS_OTP;
```

(`phone` is the normalised E.164 value bound earlier in Task 2 Step 5.)

### 5.3 Flip the lock-in test

- [ ] **Step 3: Rewrite `convex/__tests__/auth.test.ts:97–118`**

Replace the entire `"works regardless of NODE_ENV (documents current lack of gate)"` block with:

```ts
// Post-Phase-3A: the dev bypass is gated behind NODE_ENV !== "production"
// AND !isProdDeployment(CONVEX_DEPLOYMENT). This test locks in the guard.
it("refuses dev bypass when NODE_ENV=production", async () => {
  const t = convexTest(schema, modules);
  const phone = "+919999900002";
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    await t.action(api.auth.otp.sendOtp, { phone });
    await expect(
      t.action(api.auth.otp.verifyOtp, { phone, otp: "000000" }),
    ).rejects.toThrow(/Incorrect OTP|No OTP in progress/);
  } finally {
    process.env.NODE_ENV = prev;
  }
});

it("refuses dev bypass when CONVEX_DEPLOYMENT looks prod", async () => {
  const t = convexTest(schema, modules);
  const phone = "+919999900005";
  const prev = process.env.CONVEX_DEPLOYMENT;
  process.env.CONVEX_DEPLOYMENT = "prod:onlyou-prod-abc";
  try {
    await t.action(api.auth.otp.sendOtp, { phone });
    await expect(
      t.action(api.auth.otp.verifyOtp, { phone, otp: "000000" }),
    ).rejects.toThrow(/Incorrect OTP|No OTP in progress/);
  } finally {
    process.env.CONVEX_DEPLOYMENT = prev;
  }
});
```

Also update all remaining test phones in this file (lines 21, 49, 72, 104, 123, 161 per baseline grep) to E.164 form — e.g. `"+91 98765 43210"` → `"+919876543210"`.

- [ ] **Step 4: Run tests**

```bash
pnpm test:convex -- auth.test
```

Expected: PASS — original dev-bypass happy path still works, both new guard tests green.

- [ ] **Step 5: Commit**

```bash
git add convex/auth/otp.ts convex/__tests__/auth.test.ts docs/decisions/2026-04-24-phase-3a-dev-otp-gate.md
git commit -m "feat(phase-3a): gate dev-OTP bypass behind NODE_ENV + deployment check"
```

---

## Task 6: Sweep fixtures, seeds, and remaining test phones

**Files:**

- Modify: `convex/seed/fakeUsers.ts` (phones passed to `insert("users", …)`)
- Modify: `convex/seed/devBiomarkerReport.ts:135,405` (`ARJUN_PHONE` constant)
- Modify: `convex/__tests__/users.test.ts:39,58,82,…` (all helper-signIn phones)
- Modify: any remaining `+91 99999` occurrences

- [ ] **Step 1: Find every remaining occurrence**

```bash
grep -rn "+91 99999\|+91 98765" convex/ apps/ packages/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 2: Rewrite each to E.164**

Mechanical rewrite — e.g. `"+91 99999 00020"` → `"+919999900020"`. Use the test file's surrounding helper (`signIn`, `sendOtp`) to decide if the string is an input (normalised at entry, so both forms work) vs a stored-row assertion (must be E.164).

- [ ] **Step 3: Update `ARJUN_PHONE` in `convex/seed/devBiomarkerReport.ts`**

Find the constant declaration and change it to `"+919999900001"` (or whichever E.164 Arjun uses — match the fixture on line 108 of `patient-states.ts`).

- [ ] **Step 4: Run the full suite**

```bash
pnpm test:convex
pnpm --filter @onlyou/mobile test
pnpm --filter @onlyou/core test
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add convex/ apps/ packages/
git commit -m "chore(phase-3a): migrate all fixture/seed/test phones to E.164"
```

---

## Task 7: Anthropic key rotation runbook + verification

**Files:**

- Create: `docs/runbooks/3A-anthropic-key-rotation.md`

- [ ] **Step 1: Write the runbook**

````markdown
# Anthropic API key rotation — dev

**Date added:** 2026-04-24 (Phase 3A)
**Reason:** The current dev `ANTHROPIC_API_KEY` was pasted into chat transcripts during Phase 2.5C (ledgered in `docs/DEFERRED.md`). Rotate before the first real Claude call in Phase 3C.

## Procedure

1. **Generate a replacement key** in the Anthropic console (https://console.anthropic.com/settings/keys). Label it `onlyou-dev-2026Q2`.
2. **Set it on the Convex dev deployment:**

   ```bash
   npx convex env set ANTHROPIC_API_KEY sk-ant-…
   ```
````

Confirm via `npx convex env list` (the value itself is redacted — confirm by key name + the last 4 chars in the list).

3. **Verify with the offline suite:**

   ```bash
   pnpm test:convex
   ```

   Expected: `convex/__tests__/lib/claude.test.ts` passes with the mock key.

4. **Verify with the live suite:**

   ```bash
   pnpm test:claude
   ```

   Expected: 8/8 synthetic fixtures pass (per Phase 2.5B baseline, ~80–130s, ~$0.25/run).

5. **Verify via the end-to-end driver:**

   ```bash
   pnpm e2e:manual
   ```

   Expected: `lab_report.status → ready` within ~35–40s on `aromatic-labrador-938`.

6. **Revoke the old key** in the console. Do not keep it as a "just in case" backup — revocation is the rotation.

7. **Record the rotation** in `checkpoint.md` under Phase 3A Task 7 with the key label + timestamp.

## On failure

If `test:claude` fails after the rotation, most likely causes:

- Wrong env-var set (e.g. project-scoped vs deployment-scoped). `npx convex env list` shows the deployment-scoped set.
- Billing lapse on the new key. Anthropic console → usage tab.
- The key is valid but the model ID in `convex/lib/claude.ts` has drifted. Current spec: `ANTHROPIC_MODEL` env var, never hardcoded (2.5B decision).

````

- [ ] **Step 2: Actually rotate the key**

Operator step — executed interactively by the human founder. After `npx convex env set`, run:

```bash
pnpm test:convex
pnpm test:claude
pnpm e2e:manual
````

All three must be green. Capture `test:claude` duration + `e2e:manual` status into `checkpoint.md`.

- [ ] **Step 3: Commit**

```bash
git add docs/runbooks/3A-anthropic-key-rotation.md
git commit -m "docs(phase-3a): Anthropic key rotation runbook"
```

(Do **not** commit the key value itself — Convex env vars are off-repo.)

---

## Task 8: PENDING_HASH filter guard helper

**Files:**

- Create: `convex/biomarker/lib/findByContentHash.ts`
- Create: `convex/__tests__/biomarker/content-hash-guard.test.ts`

### 8.1 Audit first

- [ ] **Step 1: Document the current state**

```bash
grep -rn "withIndex(\"by_user_hash" convex/ --include="*.ts"
```

Expected: **0 consumers** today. The 3A task is preventive — Phase 3B+ will add real dedupe consumers once parseLabReport's computed SHA-256 lands; this guard stops the first consumer from forgetting the filter.

Record the finding in `checkpoint.md` under Phase 3A Task 8: "Audited — 0 current consumers; guard installed before first consumer lands in 3C retry dedupe."

### 8.2 Write the helper test

- [ ] **Step 2: Write `convex/__tests__/biomarker/content-hash-guard.test.ts`**

```ts
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import fg from "fast-glob";
import path from "node:path";

import { convexTest } from "convex-test";

import schema from "../../schema";
import { internal } from "../../_generated/api";

const modules = import.meta.glob("../../**/*.ts");

describe("PENDING_HASH filter guard", () => {
  it("helper filters pending-prefix rows and returns only real matches", async () => {
    const t = convexTest(schema, modules);

    const { userId, realHashRowId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        phone: "+919999900001",
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: false,
        createdAt: 1,
      });
      await ctx.db.insert("lab_reports", {
        userId,
        contentHash: "pending:abc",
        source: "patient_upload",
        status: "analyzing",
        mimeType: "application/pdf",
        fileId: "kg2" as any,
        fileSizeBytes: 1,
        createdAt: 1,
      });
      const realHashRowId = await ctx.db.insert("lab_reports", {
        userId,
        contentHash: "deadbeef".repeat(8),
        source: "patient_upload",
        status: "ready",
        mimeType: "application/pdf",
        fileId: "kg3" as any,
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

  it("no production convex file uses withIndex('by_user_hash') outside the helper", async () => {
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
    expect(
      offenders,
      `Raw by_user_hash consumers must go through findLabReportByContentHash: ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});
```

- [ ] **Step 3: Run — confirm fail (helper missing)**

```bash
pnpm test:convex -- content-hash-guard
```

Expected: FAIL — `Cannot find module` on `findByContentHash`.

### 8.3 Implement the helper

- [ ] **Step 4: Write `convex/biomarker/lib/findByContentHash.ts`**

```ts
// Shared accessor for lab_reports.by_user_hash. Every consumer in the
// codebase MUST go through this helper — the content-hash-guard test
// fails CI if any other file touches the index directly.
//
// Why: intakeUpload + labUploadResult write placeholder contentHash values
// of the form "pending:<fileId>" before parseLabReport computes the real
// SHA-256. A raw by_user_hash consumer would false-match those placeholders
// during the insert→parse window. This helper filters PENDING_HASH_PREFIX
// out unconditionally.

import { v } from "convex/values";

import type { QueryCtx } from "../../_generated/server";
import { internalQuery } from "../../_generated/server";

import { PENDING_HASH_PREFIX } from "./createLabReport";

export async function findLabReportByContentHash(
  ctx: QueryCtx,
  userId: string,
  contentHash: string,
) {
  if (contentHash.startsWith(PENDING_HASH_PREFIX)) return null;

  const rows = await ctx.db
    .query("lab_reports")
    .withIndex("by_user_hash", (q) =>
      q.eq("userId", userId as any).eq("contentHash", contentHash),
    )
    .collect();

  for (const r of rows) {
    if (!r.contentHash.startsWith(PENDING_HASH_PREFIX)) return r;
  }
  return null;
}

// Thin query wrapper so tests can reach the helper via the Convex RPC layer.
// Application code should import `findLabReportByContentHash` directly.
export const findLabReportByContentHashQuery = internalQuery({
  args: { userId: v.id("users"), contentHash: v.string() },
  handler: async (ctx, args) =>
    findLabReportByContentHash(ctx, args.userId, args.contentHash),
});
```

- [ ] **Step 5: Regenerate codegen + run tests**

```bash
npx convex codegen
pnpm test:convex -- content-hash-guard
```

Expected: both tests green. The guard test should continue to find zero offenders.

- [ ] **Step 6: Install fast-glob (only dep added)**

```bash
pnpm add -D -w fast-glob
```

- [ ] **Step 7: Full suite re-run**

```bash
pnpm test:convex
pnpm -w typecheck --force
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add convex/biomarker/lib/findByContentHash.ts convex/__tests__/biomarker/content-hash-guard.test.ts convex/_generated/ package.json pnpm-lock.yaml
git commit -m "feat(phase-3a): PENDING_HASH filter helper + raw-index guard test"
```

---

## Task 9: Clinical-advisor signoff on 45 DRAFT ranges

**Files:**

- Modify: `packages/core/seeds/biomarker-ranges.json` (all 45 rows)
- Modify: `convex/__tests__/biomarker/seed-validation.test.ts`
- Create: `docs/decisions/2026-04-24-phase-3a-clinical-signoff.md`

### 9.1 Signoff packet (operator step)

- [ ] **Step 1: Generate the review packet**

```bash
pnpm ts-node scripts/print-ranges-for-review.ts > /tmp/ranges-packet.md
```

(If `scripts/print-ranges-for-review.ts` does not yet exist, create it — a 20-line script that reads `packages/core/seeds/biomarker-ranges.json` and prints a human-readable table of `displayName | optimal range | sub-optimal range | action thresholds | source` per row. Single responsibility, ship it in this commit.)

- [ ] **Step 2: Hand the packet to the clinical advisor.** Expected return: advisor name + date + per-row accept/edit list.

- [ ] **Step 3: Apply edits to `packages/core/seeds/biomarker-ranges.json`** (any per-row changes the advisor requests).

- [ ] **Step 4: Stamp all 45 rows** — `clinicalReviewer` → advisor's full name (e.g. `"Dr. <Name>, MBBS MD — reviewed 2026-04-24"`), `reviewedAt` → Unix-ms at review-session end.

Script it for consistency:

```bash
node -e '
const fs = require("fs");
const path = "packages/core/seeds/biomarker-ranges.json";
const rows = JSON.parse(fs.readFileSync(path, "utf8"));
const reviewer = process.env.REVIEWER_NAME;
const ts = Date.parse(process.env.REVIEWED_AT_ISO);
if (!reviewer || !Number.isFinite(ts)) throw new Error("set REVIEWER_NAME + REVIEWED_AT_ISO");
for (const r of rows) { r.clinicalReviewer = reviewer; r.reviewedAt = ts; }
fs.writeFileSync(path, JSON.stringify(rows, null, 2) + "\n");
console.log(`updated ${rows.length} rows`);
'
```

Run:

```bash
REVIEWER_NAME="Dr. Full Name, MBBS MD — reviewed 2026-04-24" \
REVIEWED_AT_ISO="2026-04-24T12:00:00+05:30" \
node -e '…'
```

### 9.2 Lock the invariant

- [ ] **Step 5: Update `convex/__tests__/biomarker/seed-validation.test.ts`**

Append to the existing test suite:

```ts
it("no row carries DRAFT status or null reviewedAt (Phase 3A signoff gate)", () => {
  for (const row of rows) {
    expect(
      row.clinicalReviewer,
      `row ${row.canonicalId} still DRAFT`,
    ).not.toMatch(/^DRAFT/);
    expect(
      row.reviewedAt,
      `row ${row.canonicalId} reviewedAt is null`,
    ).toBeTypeOf("number");
  }
});
```

- [ ] **Step 6: Run seed validation**

```bash
pnpm test:convex -- seed-validation
```

Expected: PASS — zero DRAFTs, all 45 rows stamped.

### 9.3 Decision + commit

- [ ] **Step 7: Write the decision record**

```markdown
# Clinical sign-off — 45 Phase 2.5A seeded reference ranges

**Date:** 2026-04-24
**Reviewer:** Dr. <Name>, MBBS MD
**Scope:** All 45 rows in `packages/core/seeds/biomarker-ranges.json`
**Status:** Approved (see per-row edits in commit)

## Summary

Advisor reviewed every row for:

- Threshold ordering (actionBelow ≤ subOptimalBelowMin ≤ optimalMin ≤ optimalMax ≤ subOptimalAboveMax ≤ actionAbove).
- Age/sex cohort correctness.
- Units match Indian lab conventions.
- Source citation still current.

<List of any rows the advisor edited, with the diff.>

## Audit trail

All 45 rows now carry `clinicalReviewer = "<signoff string>"` and `reviewedAt = 2026-04-24T…`. The seed-validation test (`convex/__tests__/biomarker/seed-validation.test.ts`) fails CI if any future commit re-introduces a DRAFT row or nulls `reviewedAt`.
```

- [ ] **Step 8: Commit**

```bash
git add packages/core/seeds/biomarker-ranges.json convex/__tests__/biomarker/seed-validation.test.ts docs/decisions/2026-04-24-phase-3a-clinical-signoff.md scripts/print-ranges-for-review.ts
git commit -m "feat(phase-3a): clinical sign-off on 45 reference ranges (DRAFT → reviewed)"
```

---

## Task 10: Live E2E re-verify on Phase 2.5E flow

**Files:** none (operator step + checkpoint update).

- [ ] **Step 1: Run manual E2E driver against rotated key + normalised phones**

```bash
pnpm e2e:manual
```

Expected: `lab_report.status → ready` in ~35–40s. Same output shape as Phase 2.5C baseline.

- [ ] **Step 2: Run on-device mobile smoke**

- Log in with `+91 99999 00001` via the dev drawer on Android.
- Confirm the OTP bypass still works on dev.
- Confirm the Dashboard greeting + lab-results flow still render (per Phase 2.5E memory — uses `useDisplayUser` + real Convex join).

- [ ] **Step 3: Update `checkpoint.md`**

Append a `Phase 3A progress` section with, per task: commit SHA, test counts, live-E2E duration + status.

- [ ] **Step 4: Commit the checkpoint**

```bash
git add checkpoint.md
git commit -m "docs(phase-3a): live E2E record + task completion log"
```

---

## Task 11: DEFERRED strikes + phase code review

**Files:**

- Modify: `docs/DEFERRED.md` (strike lines 231, Anthropic key rotation entry, DRAFT-ranges entry, PENDING_HASH guard entry).
- Create: `docs/superpowers/reviews/2026-04-24-phase-3a-review.md` (generated by reviewer agent).

- [ ] **Step 1: Strike DEFERRED entries**

In `docs/DEFERRED.md`, wrap every now-shipped row in `~~…~~` and append `— shipped phase-3a <commit SHA>`.

Specifically:

- The lock-in-test-flip entry (line ~231).
- The Anthropic key rotation entry.
- The 45 DRAFT ranges entry (under "Phase 2.5C" carry-forward).
- The PENDING_HASH-filter-audit entry (if present; if not, add a post-facto shipped-entry under 3A).

- [ ] **Step 2: Commit the strikes**

```bash
git add docs/DEFERRED.md
git commit -m "docs(phase-3a): strike shipped deferrals"
```

- [ ] **Step 3: Invoke `superpowers:requesting-code-review`**

Per `CLAUDE.md` rule 10 (mandatory post-phase review). Reviewer reads the full phase-3a diff against this plan + spec §3 + `docs/DESIGN.md`. Report writes to `docs/superpowers/reviews/2026-04-24-phase-3a-review.md`.

- [ ] **Step 4: Address every review finding**

Critical + Important findings → fix commits on this branch before merge. Minor findings → defer entries in `docs/DEFERRED.md` with destination phase.

- [ ] **Step 5: Final suite run**

```bash
pnpm -w typecheck --force
pnpm -w lint
pnpm test:convex
pnpm --filter @onlyou/mobile test
pnpm --filter @onlyou/core test
```

All green required.

- [ ] **Step 6: Commit the review**

```bash
git add docs/superpowers/reviews/2026-04-24-phase-3a-review.md
git commit -m "docs(phase-3a): code review report"
```

---

## Task 12: Merge to master

**Files:** git merge only.

- [ ] **Step 1: Rebase onto latest master**

```bash
cd ../onlyou2
git fetch
cd ../onlyou2-phase-3a
git rebase master
```

Resolve any conflicts.

- [ ] **Step 2: `--no-ff` merge**

```bash
cd ../onlyou2
git merge --no-ff phase-3a -m "Merge phase-3a: pre-flight hardening (E.164 + OTP gate + PENDING_HASH guard + clinical signoff + key rotation)"
```

- [ ] **Step 3: Smoke run on master**

```bash
pnpm -w typecheck --force
pnpm test:convex
```

Expected: green.

- [ ] **Step 4: Run the phone migration against dev Convex from master**

```bash
npx convex run migrations/phase3a/normalizePhones:run
```

Expected: `{ usersUpdated: 0, usersAlreadyCanonical: N, usersDeleted: 0, otpAttemptsUpdated: 0 }` (Task 3 already ran this; re-run confirms idempotency).

- [ ] **Step 5: Push**

```bash
git push origin master
```

(Per checkpoint: master is 60+ commits ahead of origin as of Phase 2.5E merge — this push publishes everything.)

- [ ] **Step 6: Clean up the worktree**

```bash
git worktree remove ../onlyou2-phase-3a
git branch -D phase-3a
```

---

## Self-review checklist (run before handoff)

- [ ] Spec §3 5-item scope (phone E.164, dev-OTP gate, Anthropic rotate, PENDING_HASH filter, 45 DRAFT ranges) all have tasks — Tasks 1–3+4+6, 5, 7, 8, 9.
- [ ] Out-of-scope items (Gupshup, Google+Apple, iOS screenshots) have no tasks — correct.
- [ ] Every code step shows the actual code. No "similar to…" placeholders.
- [ ] Type consistency: `normalizePhoneE164` signature (`string → string`, throws) identical in core, otp.ts, otpDb.ts, users.ts, migration.
- [ ] Test phones all updated to E.164 where they are stored-row assertions, left alone where they are normalisation-entry smoke tests.
- [ ] `findLabReportByContentHash` signature stays `(ctx, userId, contentHash) → Promise<LabReport | null>` across helper + test + future consumers.
- [ ] Migration test covers idempotency (two sequential runs) + merge (two rows collapse into one).
- [ ] Guard test reaches the filesystem via `fast-glob`, excludes `_generated` and `__tests__`, and fails loud on raw `withIndex("by_user_hash"`.

---

## Plan ends here

Handoff: dispatch via `superpowers:subagent-driven-development` (recommended) or execute inline via `superpowers:executing-plans`.
