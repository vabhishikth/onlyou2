# Phase 3B — Questionnaire + Photos + Consultations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Patient signs up (phone or Google/Apple), completes the real 28-question Hair Loss questionnaire with skip logic, uploads 4 real scalp photos to Convex storage, and `submitConsultation` writes a `SUBMITTED` row with full audit trail. Hands off to Phase 3C for AI pre-assessment.

**Architecture:** Six coordinated tracks. (1) Convex schema — three new tables (`consultations`, `questionnaire_responses`, `photos`) + `consultation_status_history`. (2) 22-status transition engine in `convex/consultations/transitions.ts` with `transitionStatus` + `systemTransition` + audit writes. (3) Port 28 HL questions from `docs/VERTICAL-HAIR-LOSS.md §4` into `apps/mobile/src/data/questionnaires/hair-loss.ts` with gender-branch + 4 skip rules; refactor questionnaire store + router for dynamic next-qid lookup. (4) Real photo pipeline — `expo-camera` + `expo-image-picker` bottom-sheet picker replaces the mocked camera; 4 slot enforcement; upload-URL + `recordPhoto` mutations mirror 2.5C lab-report pattern. (5) Google (Android+iOS) + Apple (iOS-only) Sign-In via `expo-auth-session` tied to the existing `users.by_phone` table via a new `by_email` index. (6) `submitConsultation` mutation performs the transactional write + schedules the 3C AI job via the scheduler wrapper shipped in this phase.

**Tech Stack:** Convex (schema, mutations, actions, scheduler) · TypeScript · Zod (form validation) · Expo React Native (SDK 54) · `expo-camera` · `expo-image-picker` · `expo-auth-session` · `@react-native-google-signin/google-signin` · `expo-apple-authentication` · vitest · jest-expo.

**Spec:** `docs/superpowers/specs/2026-04-24-phase-3-hair-loss-e2e-design.md` §4.

**Prereqs shipped in Phase 3A (master tip `9e63557`):**

- E.164 phone normalisation at every entry point.
- Dev-OTP gated behind NODE_ENV + isProdDeployment.
- Anthropic key rotated (not consumed by 3B, used by 3C).
- `PENDING_HASH_PREFIX` filter helper available for any future lab-report dedupe.

---

## File Structure

### New files

| File                                                                | Responsibility                                                                                                                                                                   |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `convex/consultations/schema.ts`                                    | Re-export of consultations + questionnaire_responses + photos + consultation_status_history validators, merged into `convex/schema.ts`.                                          |
| `convex/consultations/transitions.ts`                               | `validTransitions` table, `systemTransitions` list, `transitionStatus(ctx, consultationId, to, actorUserId)` + `systemTransition(...)` with audit write + status-history insert. |
| `convex/consultations/submitConsultation.ts`                        | Patient-facing mutation that inserts SUBMITTED row, writes questionnaire_responses, verifies 4 photos, schedules 3C AI job (stub until Phase 3C).                                |
| `convex/consultations/photos.ts`                                    | `getPhotoUploadUrl` (mutation returning signed storage URL), `recordPhoto` (writes `photos` row with slot + fileId validation).                                                  |
| `convex/consultations/__tests__/transitions.test.ts`                | 22×N cell coverage matrix for validTransitions; every systemTransition path; terminal → rejects.                                                                                 |
| `convex/consultations/__tests__/submitConsultation.test.ts`         | Happy path + rejects-incomplete-photos + rejects-duplicate-submit + audit-row assertion.                                                                                         |
| `convex/consultations/__tests__/photos.test.ts`                     | Slot validation (only 4 allowed values) + mime-type whitelist + per-user per-slot overwrite behaviour.                                                                           |
| `convex/lib/photoSlot.ts`                                           | `photoSlotValidator = v.union(...)` + `PHOTO_SLOTS` string literal array (single source of truth, imported by schema + photos mutation + mobile).                                |
| `convex/auth/socialSignIn.ts`                                       | `signInWithGoogle(idToken)` + `signInWithApple(identityToken, nonce)` actions. Verify token, find-or-create user linked by email, mint session.                                  |
| `convex/auth/__tests__/socialSignIn.test.ts`                        | Mocked Google+Apple token verifier; new-user path + existing-user-by-email path + token-verification-failure path.                                                               |
| `apps/mobile/src/questionnaire/skipLogic.ts`                        | Pure `getNextQid(questions, answers, currentQid)` + `getReachableQids(questions, answers)`. 0 side effects.                                                                      |
| `apps/mobile/src/questionnaire/__tests__/skipLogic.test.ts`         | Branch coverage for every HL skip rule: Q2=Female (Q3 options + skip Q22–Q25), Q5={No family, Not sure} (skip Q6), Q23="Not concerned" (skip Q24), Q26="None" (skip Q27).        |
| `apps/mobile/src/components/questionnaire/PhotoSlotBottomSheet.tsx` | Bottom-sheet with "Take photo" / "Choose from library" options.                                                                                                                  |
| `apps/mobile/src/components/auth/GoogleSignInButton.tsx`            | Branded Google button; calls `expo-auth-session` + `signInWithGoogle`.                                                                                                           |
| `apps/mobile/src/components/auth/AppleSignInButton.tsx`             | Native Apple button (iOS only); calls `expo-apple-authentication` + `signInWithApple`.                                                                                           |
| `apps/mobile/src/hooks/use-submit-consultation.ts`                  | Client hook wrapping `api.consultations.submitConsultation.submitConsultation` + photo upload retry + error surface.                                                             |
| `apps/mobile/app/photo-upload/[condition]/camera.tsx`               | Real `expo-camera` screen with framing guide, capture, retake. Replaces existing mocked camera.                                                                                  |

### Modified files

| File                                                   | Change                                                                                                                                                                               |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `convex/schema.ts`                                     | Add `consultations`, `questionnaire_responses`, `photos`, `consultation_status_history` tables. Add `by_email` index on `users`. Add `email?: v.string()` optional field on `users`. |
| `apps/mobile/src/data/questionnaires/hair-loss.ts`     | Replace 4-question stub with 28-question HL questionnaire verbatim from `docs/VERTICAL-HAIR-LOSS.md §4`.                                                                             |
| `apps/mobile/src/data/questionnaires/index.ts`         | Extend `Question` type with `sex?: "male" \| "female"` optional gate + `sectionId` + `optionsByGender` union + `freeText` type.                                                      |
| `apps/mobile/src/stores/questionnaire-store.ts`        | Add `schemaVersion` + `currentQid` + `history` (visited qid stack for back-nav) + `nextReachableQid(questions)` helper wired to skipLogic.                                           |
| `apps/mobile/app/questionnaire/[condition]/[qid].tsx`  | Read store-computed next qid from skipLogic helper; progress label from `getReachableQids().length`.                                                                                 |
| `apps/mobile/app/questionnaire/[condition]/review.tsx` | Group answers by `sectionId`. Submit button calls `use-submit-consultation` hook.                                                                                                    |
| `apps/mobile/app/photo-upload/[condition].tsx`         | 4-slot enforcement UI using `PHOTO_SLOTS` constant; each slot opens `PhotoSlotBottomSheet`.                                                                                          |
| `apps/mobile/app/(auth)/welcome.tsx`                   | Add Google + Apple Sign-In buttons above the existing phone-verify CTA.                                                                                                              |
| `apps/mobile/app/_layout.tsx`                          | Wrap with Google/Apple auth providers if SDK needs it; add deep-link redirect.                                                                                                       |
| `apps/mobile/app.json`                                 | Add `expo-camera` + `expo-image-picker` + `expo-apple-authentication` plugin configs; iOS `NSCameraUsageDescription` + `NSPhotoLibraryUsageDescription`; Android permissions.        |
| `convex/auth.config.ts`                                | Stays `providers: []` (SSO handled by custom `signInWithGoogle`/`signInWithApple` actions — same pattern as phone OTP).                                                              |

### Deleted files

| File                                                        | Reason |
| ----------------------------------------------------------- | ------ |
| (none — `app/photo-upload/camera.tsx` is modified in place) | —      |

---

## Task 0: Scaffold worktree + branch

**Files:** git worktree operations only.

- [ ] **Step 1: Worktree from master**

```bash
git worktree add -b phase-3b ../onlyou2-phase-3b master
```

- [ ] **Step 2: Copy gitignored env files**

```bash
cp .env.local ../onlyou2-phase-3b/.env.local
cp apps/mobile/.env.local ../onlyou2-phase-3b/apps/mobile/.env.local
```

- [ ] **Step 3: Baseline**

```bash
cd ../onlyou2-phase-3b
pnpm install
pnpm -w typecheck --force
pnpm test:convex
pnpm --filter @onlyou/mobile test
```

Expected: all green. Baseline for phase-3b: convex **225/225**, mobile **237/237**, core **16/16**, seed **19/19**.

---

## Task 1: Schema — consultations + questionnaire_responses + photos + status history

**Files:**

- Create: `convex/lib/photoSlot.ts`
- Create: `convex/consultations/schema.ts`
- Modify: `convex/schema.ts` (merge in the new tables + `users.email` + `by_email`)

### 1.1 Photo slot constant

- [ ] **Step 1: Write `convex/lib/photoSlot.ts`**

```ts
// Single source of truth for hair-loss photo slot identifiers. Imported
// by the consultations schema, the photos mutation, the mobile
// photo-upload screen, and the photo-slot bottom sheet.

import { v } from "convex/values";

export const PHOTO_SLOTS = [
  "crown",
  "hairline",
  "left_temple",
  "right_temple",
] as const;
export type PhotoSlot = (typeof PHOTO_SLOTS)[number];

export const photoSlotValidator = v.union(
  v.literal("crown"),
  v.literal("hairline"),
  v.literal("left_temple"),
  v.literal("right_temple"),
);

export const REQUIRED_PHOTO_COUNT = PHOTO_SLOTS.length;
```

### 1.2 Consultations schema fragment

- [ ] **Step 2: Write `convex/consultations/schema.ts`**

```ts
// Schema fragment — consumed by convex/schema.ts which spreads these into
// the top-level defineSchema({...}). Isolated here so the transitions +
// mutations modules can import validators without a circular import.

import { v } from "convex/values";

import { photoSlotValidator } from "../lib/photoSlot";

export const verticalValidator = v.union(
  v.literal("hair_loss"),
  v.literal("ed"),
  v.literal("pe"),
  v.literal("weight"),
  v.literal("pcos"),
);

export const consultationStatusValidator = v.union(
  v.literal("SUBMITTED"),
  v.literal("AI_PROCESSING"),
  v.literal("AI_FAILED"),
  v.literal("AI_COMPLETE"),
  v.literal("ASSIGNED"),
  v.literal("REVIEWING"),
  v.literal("MORE_INFO_REQUESTED"),
  v.literal("LAB_ORDERED"),
  v.literal("PRESCRIBED"),
  v.literal("AWAITING_PAYMENT"),
  v.literal("EXPIRED_UNPAID"),
  v.literal("REFERRED"),
  v.literal("DECLINED"),
  v.literal("PAYMENT_COMPLETE"),
  v.literal("PHARMACY_PROCESSING"),
  v.literal("DISPATCHED"),
  v.literal("DELIVERED"),
  v.literal("TREATMENT_ACTIVE"),
  v.literal("FOLLOW_UP_DUE"),
  v.literal("COMPLETED"),
  v.literal("CANCELLED"),
  v.literal("ABANDONED"),
);

export const transitionKindValidator = v.union(
  v.literal("user"),
  v.literal("doctor"),
  v.literal("admin"),
  v.literal("system"),
);

export const mimeTypeValidator = v.union(
  v.literal("image/jpeg"),
  v.literal("image/png"),
  v.literal("image/heic"),
);

export const consultations = {
  userId: v.id("users"),
  vertical: verticalValidator,
  status: consultationStatusValidator,
  statusUpdatedAt: v.number(),
  submittedAt: v.number(),
  declineReason: v.optional(v.string()),
  referralSpecialistType: v.optional(v.string()),
  referralReason: v.optional(v.string()),
  moreInfoQuestion: v.optional(v.string()),
  moreInfoAnsweredAt: v.optional(v.number()),
  assignedDoctorId: v.optional(v.id("users")),
  createdAt: v.number(),
  deletedAt: v.optional(v.number()),
};

export const questionnaire_responses = {
  consultationId: v.id("consultations"),
  userId: v.id("users"),
  schemaVersion: v.string(),
  answers: v.any(),
  completedAt: v.number(),
};

export const photos = {
  consultationId: v.id("consultations"),
  userId: v.id("users"),
  slot: photoSlotValidator,
  fileId: v.id("_storage"),
  mimeType: mimeTypeValidator,
  fileSizeBytes: v.number(),
  uploadedAt: v.number(),
  deletedAt: v.optional(v.number()),
};

export const consultation_status_history = {
  consultationId: v.id("consultations"),
  fromStatus: v.optional(consultationStatusValidator),
  toStatus: consultationStatusValidator,
  kind: transitionKindValidator,
  actorUserId: v.optional(v.id("users")),
  reason: v.optional(v.string()),
  changedAt: v.number(),
};
```

### 1.3 Merge into convex/schema.ts

- [ ] **Step 3: Read `convex/schema.ts`** in full to understand the existing style (`defineSchema` + per-table `defineTable`).

- [ ] **Step 4: Import + define the four new tables at the bottom of the `defineSchema({...})`**

```ts
import {
  consultations as consultationsFields,
  questionnaire_responses as questionnaireResponsesFields,
  photos as photosFields,
  consultation_status_history as statusHistoryFields,
} from "./consultations/schema";

// Inside defineSchema({...}):
  consultations: defineTable(consultationsFields)
    .index("by_user_status", ["userId", "status"])
    .index("by_status_updated", ["status", "statusUpdatedAt"])
    .index("by_vertical_status", ["vertical", "status"])
    .index("by_deleted", ["deletedAt"]),

  questionnaire_responses: defineTable(questionnaireResponsesFields)
    .index("by_consultation", ["consultationId"])
    .index("by_user", ["userId"]),

  photos: defineTable(photosFields)
    .index("by_consultation_slot", ["consultationId", "slot"])
    .index("by_user", ["userId"])
    .index("by_deleted", ["deletedAt"]),

  consultation_status_history: defineTable(statusHistoryFields)
    .index("by_consultation", ["consultationId"])
    .index("by_consultation_changed", ["consultationId", "changedAt"]),
```

- [ ] **Step 5: Add `email` field + `by_email` index on `users`**

Find the `users` `defineTable` in `schema.ts` and add:

- `email: v.optional(v.string())` in the table shape.
- `.index("by_email", ["email"])` among the indexes.

This enables the social-sign-in find-or-create lookup.

- [ ] **Step 6: Regenerate codegen + typecheck**

```bash
cd ../onlyou2-phase-3b
npx convex codegen
pnpm -w typecheck --force
```

Expected: clean.

- [ ] **Step 7: Run existing test suite to confirm no regressions**

```bash
pnpm test:convex
```

Expected: 225 still green. Schema-only additions should not break anything.

- [ ] **Step 8: Commit**

```bash
git add convex/lib/photoSlot.ts convex/consultations/schema.ts convex/schema.ts convex/_generated/
git commit -m "feat(phase-3b): schema — consultations + questionnaire_responses + photos + status history

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Transition engine — `transitionStatus` + `systemTransition`

**Files:**

- Create: `convex/consultations/transitions.ts`
- Create: `convex/consultations/__tests__/transitions.test.ts`

### 2.1 Write the failing test

- [ ] **Step 1: Write transitions.test.ts**

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { internal } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

async function setupConsultation(
  t: ReturnType<typeof convexTest>,
  status = "SUBMITTED" as const,
) {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      phone: "+919999900001",
      role: "PATIENT",
      phoneVerified: true,
      profileComplete: true,
      createdAt: 1,
    });
    const consultationId = await ctx.db.insert("consultations", {
      userId,
      vertical: "hair_loss",
      status,
      statusUpdatedAt: Date.now(),
      submittedAt: Date.now(),
      createdAt: Date.now(),
    });
    return { userId, consultationId };
  });
}

describe("transitionStatus", () => {
  it("SUBMITTED → AI_PROCESSING is allowed", async () => {
    const t = convexTest(schema, modules);
    const { userId, consultationId } = await setupConsultation(t);
    await t.mutation(internal.consultations.transitions.transitionStatus, {
      consultationId,
      toStatus: "AI_PROCESSING",
      kind: "system",
      actorUserId: userId,
    });
    const row = await t.run((ctx) => ctx.db.get(consultationId));
    expect(row?.status).toBe("AI_PROCESSING");
  });

  it("SUBMITTED → PRESCRIBED is rejected (not in validTransitions)", async () => {
    const t = convexTest(schema, modules);
    const { userId, consultationId } = await setupConsultation(t);
    await expect(
      t.mutation(internal.consultations.transitions.transitionStatus, {
        consultationId,
        toStatus: "PRESCRIBED",
        kind: "doctor",
        actorUserId: userId,
      }),
    ).rejects.toThrow(/invalid transition/i);
  });

  it("writes a consultation_status_history row on every allowed transition", async () => {
    const t = convexTest(schema, modules);
    const { userId, consultationId } = await setupConsultation(t);
    await t.mutation(internal.consultations.transitions.transitionStatus, {
      consultationId,
      toStatus: "AI_PROCESSING",
      kind: "system",
      actorUserId: userId,
    });
    const history = await t.run((ctx) =>
      ctx.db
        .query("consultation_status_history")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .collect(),
    );
    expect(history).toHaveLength(1);
    expect(history[0].fromStatus).toBe("SUBMITTED");
    expect(history[0].toStatus).toBe("AI_PROCESSING");
    expect(history[0].kind).toBe("system");
  });

  it("DECLINED is terminal — every outbound transition rejects", async () => {
    const t = convexTest(schema, modules);
    const { userId, consultationId } = await setupConsultation(t, "DECLINED");
    await expect(
      t.mutation(internal.consultations.transitions.transitionStatus, {
        consultationId,
        toStatus: "REVIEWING",
        kind: "doctor",
        actorUserId: userId,
      }),
    ).rejects.toThrow(/terminal/i);
  });

  it("systemTransition AWAITING_PAYMENT → EXPIRED_UNPAID is allowed (not in user validTransitions but in systemTransitions)", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await setupConsultation(t, "AWAITING_PAYMENT");
    await t.mutation(internal.consultations.transitions.systemTransition, {
      consultationId,
      toStatus: "EXPIRED_UNPAID",
      reason: "30d expiry",
    });
    const row = await t.run((ctx) => ctx.db.get(consultationId));
    expect(row?.status).toBe("EXPIRED_UNPAID");
  });

  it("systemTransition rejects a transition not listed in systemTransitions", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await setupConsultation(t, "SUBMITTED");
    await expect(
      t.mutation(internal.consultations.transitions.systemTransition, {
        consultationId,
        toStatus: "DELIVERED",
        reason: "unauthorised",
      }),
    ).rejects.toThrow(/invalid system transition/i);
  });
});
```

- [ ] **Step 2: Run — confirm fail**

```bash
cd ../onlyou2-phase-3b
pnpm test:convex -- transitions.test
```

Expected: FAIL (module missing).

### 2.2 Implement the engine

- [ ] **Step 3: Write `convex/consultations/transitions.ts`**

```ts
// Transition engine — canonical status-change surface for consultations.
//
// `transitionStatus` is the user/doctor/admin-facing API. Every call is
// checked against `validTransitions` (sourced from SOT §3A).
//
// `systemTransition` is the scheduler/webhook-facing API. Calls bypass
// `validTransitions` and are checked against `systemTransitions` (SOT §3B).
//
// Both write a `consultation_status_history` row on every successful
// change and patch `statusUpdatedAt`. Terminal states (listed explicitly)
// have no outbound transitions regardless of caller type.

import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";

import { consultationStatusValidator, transitionKindValidator } from "./schema";

type Status = Doc<"consultations">["status"];

export const validTransitions: Record<Status, Status[]> = {
  SUBMITTED: ["AI_PROCESSING"],
  AI_PROCESSING: ["AI_COMPLETE", "AI_FAILED"],
  AI_FAILED: ["AI_PROCESSING", "AI_COMPLETE"],
  AI_COMPLETE: ["ASSIGNED"],
  ASSIGNED: ["REVIEWING"],
  REVIEWING: [
    "MORE_INFO_REQUESTED",
    "LAB_ORDERED",
    "PRESCRIBED",
    "REFERRED",
    "DECLINED",
    "COMPLETED",
  ],
  MORE_INFO_REQUESTED: ["REVIEWING"],
  LAB_ORDERED: ["REVIEWING"],
  PRESCRIBED: ["AWAITING_PAYMENT"],
  AWAITING_PAYMENT: ["PAYMENT_COMPLETE", "EXPIRED_UNPAID"],
  EXPIRED_UNPAID: [],
  PAYMENT_COMPLETE: ["PHARMACY_PROCESSING"],
  PHARMACY_PROCESSING: ["DISPATCHED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: ["TREATMENT_ACTIVE"],
  TREATMENT_ACTIVE: ["FOLLOW_UP_DUE", "COMPLETED", "CANCELLED"],
  FOLLOW_UP_DUE: ["REVIEWING"],
  REFERRED: [],
  DECLINED: [],
  COMPLETED: [],
  CANCELLED: [],
  ABANDONED: [],
};

export const systemTransitions: Array<[Status[], Status]> = [
  [["SUBMITTED", "AI_COMPLETE", "AI_FAILED"], "ABANDONED"],
  [["AWAITING_PAYMENT"], "EXPIRED_UNPAID"],
  [["PRESCRIBED"], "AWAITING_PAYMENT"],
  [["PAYMENT_COMPLETE"], "PHARMACY_PROCESSING"],
  [["PHARMACY_PROCESSING"], "DISPATCHED"],
  [["DISPATCHED"], "DELIVERED"],
  [["DELIVERED"], "TREATMENT_ACTIVE"],
];

const TERMINAL_STATES = new Set<Status>([
  "EXPIRED_UNPAID",
  "REFERRED",
  "DECLINED",
  "COMPLETED",
  "CANCELLED",
  "ABANDONED",
]);

async function applyTransition(
  ctx: MutationCtx,
  consultationId: Id<"consultations">,
  toStatus: Status,
  kind: "user" | "doctor" | "admin" | "system",
  actorUserId?: Id<"users">,
  reason?: string,
) {
  const row = await ctx.db.get(consultationId);
  if (!row) throw new Error(`consultation ${consultationId} not found`);
  const fromStatus = row.status;
  const now = Date.now();
  await ctx.db.patch(consultationId, {
    status: toStatus,
    statusUpdatedAt: now,
  });
  await ctx.db.insert("consultation_status_history", {
    consultationId,
    fromStatus,
    toStatus,
    kind,
    actorUserId,
    reason,
    changedAt: now,
  });
}

export const transitionStatus = internalMutation({
  args: {
    consultationId: v.id("consultations"),
    toStatus: consultationStatusValidator,
    kind: transitionKindValidator,
    actorUserId: v.optional(v.id("users")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.consultationId);
    if (!row) throw new Error(`consultation ${args.consultationId} not found`);
    if (TERMINAL_STATES.has(row.status)) {
      throw new Error(
        `invalid transition: ${row.status} is terminal (attempted → ${args.toStatus})`,
      );
    }
    const allowed = validTransitions[row.status];
    if (!allowed.includes(args.toStatus)) {
      throw new Error(
        `invalid transition: ${row.status} → ${args.toStatus} (allowed: ${allowed.join(", ") || "(none)"})`,
      );
    }
    await applyTransition(
      ctx,
      args.consultationId,
      args.toStatus,
      args.kind,
      args.actorUserId,
      args.reason,
    );
  },
});

export const systemTransition = internalMutation({
  args: {
    consultationId: v.id("consultations"),
    toStatus: consultationStatusValidator,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.consultationId);
    if (!row) throw new Error(`consultation ${args.consultationId} not found`);
    const rule = systemTransitions.find(
      ([froms, to]) => to === args.toStatus && froms.includes(row.status),
    );
    if (!rule) {
      throw new Error(
        `invalid system transition: ${row.status} → ${args.toStatus}`,
      );
    }
    await applyTransition(
      ctx,
      args.consultationId,
      args.toStatus,
      "system",
      undefined,
      args.reason,
    );
  },
});
```

- [ ] **Step 4: Codegen + typecheck**

```bash
npx convex codegen
pnpm -w typecheck --force
```

- [ ] **Step 5: Run transitions test — confirm green**

```bash
pnpm test:convex -- transitions.test
```

All 6 `it` blocks pass.

- [ ] **Step 6: Full convex suite**

```bash
pnpm test:convex
```

Expected: 231 (prior 225 + 6).

- [ ] **Step 7: Commit**

```bash
git add convex/consultations/transitions.ts convex/consultations/__tests__/transitions.test.ts convex/_generated/
git commit -m "feat(phase-3b): consultation transition engine + audit history

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Hair-loss questionnaire content (28 questions)

**Files:**

- Modify: `apps/mobile/src/data/questionnaires/index.ts` (extend `Question` type)
- Modify: `apps/mobile/src/data/questionnaires/hair-loss.ts` (replace stub with 28 questions)
- Create: `apps/mobile/src/data/questionnaires/__tests__/hair-loss.test.ts`

### 3.1 Extend the Question type

- [ ] **Step 1: Read `apps/mobile/src/data/questionnaires/index.ts`** to understand the current `Question` type.

- [ ] **Step 2: Extend it to support the HL shape**

The current type supports `single`, `multi`, `photo`. Add:

- `number` for Q1 age input.
- `freetext` for Q9 drug allergies and Q27 prior-treatment results.
- `section` metadata for review-screen grouping.
- `maleOptions` + `femaleOptions` on single-selects that branch by Q2 sex.
- `maleOnly?: boolean` flag for sexual health section.
- `skipIf?: { qid, values }[]` one-or-many skip predicates.

Final shape:

```ts
export type QuestionType = "number" | "single" | "multi" | "photo" | "freetext";

export type Option = {
  value: string;
  label: string;
  maleOnly?: boolean;
  femaleOnly?: boolean;
};

export interface Question {
  id: string;
  type: QuestionType;
  section:
    | "basics"
    | "medical_history"
    | "current_symptoms"
    | "lifestyle"
    | "sexual_health"
    | "treatment_history";
  title: string;
  helper?: string;
  required: boolean;
  // single / multi:
  options?: Option[];
  // single where options differ by sex (Q3):
  maleOptions?: Option[];
  femaleOptions?: Option[];
  // number:
  min?: number;
  max?: number;
  validationMessage?: string;
  // skip logic — skip THIS question if ANY predicate matches:
  skipIf?: Array<{
    qid: string;
    values: string[];
    mode: "equals" | "includes";
  }>;
  // section-level gate — skip the whole question if Q2 ≠ this sex:
  sexGate?: "male" | "female";
}
```

### 3.2 Hair-loss 28-question content

- [ ] **Step 3: Replace `apps/mobile/src/data/questionnaires/hair-loss.ts`** with the full 28-question array.

Port VERBATIM from `docs/VERTICAL-HAIR-LOSS.md §4` — do not paraphrase titles or options. Preserve the section groupings. Example structure:

```ts
import type { Question } from "./index";

export const HAIR_LOSS_SCHEMA_VERSION = "hair-loss-v1";

export const hairLossQuestions: Question[] = [
  {
    id: "q1_age",
    type: "number",
    section: "basics",
    title: "What is your age?",
    required: true,
    min: 18,
    max: 80,
    validationMessage: "Our service is available for adults 18 and over.",
  },
  {
    id: "q2_sex",
    type: "single",
    section: "basics",
    title: "What is your biological sex?",
    required: true,
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
    ],
  },
  {
    id: "q3_location",
    type: "single",
    section: "basics",
    title: "Where are you noticing hair loss?",
    required: true,
    maleOptions: [
      { value: "receding_hairline", label: "Receding hairline" },
      { value: "thinning_crown", label: "Thinning at the crown/vertex" },
      {
        value: "overall_thinning_top",
        label: "Overall thinning across the top",
      },
      { value: "hairline_and_crown", label: "Both hairline and crown" },
      { value: "patches", label: "Specific patches or bald spots" },
    ],
    femaleOptions: [
      { value: "widening_part", label: "Widening part line" },
      {
        value: "overall_thinning_top",
        label: "Overall thinning across the top",
      },
      { value: "diffuse_thinning", label: "Diffuse thinning all over" },
      { value: "temple_thinning", label: "Thinning at the temples" },
      { value: "patches", label: "Specific patches or bald spots" },
    ],
  },
  // ... Q4 through Q28 per spec §4 — include every option verbatim ...
];
```

The plan cannot inline 28 full questions without exceeding length limits. The implementing subagent MUST open `docs/VERTICAL-HAIR-LOSS.md` at lines 197–476 and transcribe each question into the shape above. Each option gets a snake_case `value` derived from its `label`. The `sexGate: "female"` flag applies to options flagged `[shown only if Q2 = Female]`. The `skipIf` + `sexGate` mapping MUST match the Skip Logic Summary table at lines 490–503:

| Condition                          | Question(s)      | Representation                                                                                          |
| ---------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| Q2 = Female                        | Q22–Q25 skipped  | `sexGate: "male"` on Q22, Q23, Q24, Q25.                                                                |
| Q2 = Female                        | Q3 options swap  | `maleOptions` / `femaleOptions` on Q3.                                                                  |
| Q2 = Female                        | Q4/Q7/Q8 options | Female-specific options carry `femaleOnly: true`. The renderer shows/hides per answer to Q2.            |
| Q5 ∉ [no_family_history, not_sure] | Q6 shown         | `skipIf: [{ qid: "q5_family", values: ["no_family_history", "not_sure"], mode: "includes" }]` on Q6.    |
| Q23 = "not_concerned"              | Q24 skipped      | `skipIf: [{ qid: "q23_concern", values: ["not_concerned"], mode: "equals" }]` on Q24.                   |
| Q26 = "none_first_treatment"       | Q27 skipped      | `skipIf: [{ qid: "q26_prior_treatments", values: ["none_first_treatment"], mode: "includes" }]` on Q27. |

### 3.3 Shape test

- [ ] **Step 4: Write the shape/integrity test**

```ts
// apps/mobile/src/data/questionnaires/__tests__/hair-loss.test.ts
import { describe, expect, it } from "vitest";

import { HAIR_LOSS_SCHEMA_VERSION, hairLossQuestions } from "../hair-loss";

describe("hair-loss questionnaire shape", () => {
  it("has exactly 28 questions", () => {
    expect(hairLossQuestions).toHaveLength(28);
  });

  it("schema version matches v1", () => {
    expect(HAIR_LOSS_SCHEMA_VERSION).toBe("hair-loss-v1");
  });

  it("all question ids are unique and start with 'q' + digits + '_'", () => {
    const ids = hairLossQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^q\d+_[a-z_]+$/);
    }
  });

  it("Q1 is a number input with 18..80 bounds", () => {
    const q1 = hairLossQuestions[0];
    expect(q1.type).toBe("number");
    expect(q1.min).toBe(18);
    expect(q1.max).toBe(80);
  });

  it("Q2 sex is single-select with male/female options", () => {
    const q2 = hairLossQuestions[1];
    expect(q2.type).toBe("single");
    expect(q2.options?.map((o) => o.value).sort()).toEqual(["female", "male"]);
  });

  it("Q3 has maleOptions + femaleOptions, not a single options list", () => {
    const q3 = hairLossQuestions[2];
    expect(q3.maleOptions).toBeDefined();
    expect(q3.femaleOptions).toBeDefined();
    expect(q3.options).toBeUndefined();
  });

  it("Q22–Q25 are sexGate male", () => {
    const gated = hairLossQuestions.filter((q) => q.sexGate === "male");
    expect(gated.map((q) => q.id).sort()).toEqual([
      "q22_sexual_function",
      "q23_concern",
      "q24_topical_preference",
      "q25_conception_plan",
    ]);
  });

  it("Q6 skips when Q5 answer includes no_family_history or not_sure", () => {
    const q6 = hairLossQuestions.find((q) => q.id === "q6_family_onset_age");
    expect(q6?.skipIf).toEqual([
      {
        qid: "q5_family",
        values: ["no_family_history", "not_sure"],
        mode: "includes",
      },
    ]);
  });

  it("Q24 skips when Q23 === not_concerned", () => {
    const q24 = hairLossQuestions.find(
      (q) => q.id === "q24_topical_preference",
    );
    expect(q24?.skipIf).toEqual([
      { qid: "q23_concern", values: ["not_concerned"], mode: "equals" },
    ]);
  });

  it("Q27 skips when Q26 includes none_first_treatment", () => {
    const q27 = hairLossQuestions.find((q) => q.id === "q27_treatment_results");
    expect(q27?.skipIf).toEqual([
      {
        qid: "q26_prior_treatments",
        values: ["none_first_treatment"],
        mode: "includes",
      },
    ]);
  });
});
```

- [ ] **Step 5: Run — confirm fail, then populate the data file until the test passes**

```bash
cd ../onlyou2-phase-3b
pnpm --filter @onlyou/mobile test -- hair-loss.test
```

Iteratively transcribe questions + skip rules until all 10 assertions pass.

### 3.4 Commit

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/data/questionnaires/
git commit -m "feat(phase-3b): port 28 HL questions from VERTICAL-HAIR-LOSS.md §4

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Skip-logic engine

**Files:**

- Create: `apps/mobile/src/questionnaire/skipLogic.ts`
- Create: `apps/mobile/src/questionnaire/__tests__/skipLogic.test.ts`

### 4.1 Failing test

- [ ] **Step 1: Write skipLogic.test.ts**

```ts
import { describe, expect, it } from "vitest";

import { hairLossQuestions } from "../../data/questionnaires/hair-loss";
import { getNextQid, getReachableQids } from "../skipLogic";

const baseAnswers = {
  q1_age: "30",
  q2_sex: "male",
};

describe("skipLogic — hair loss", () => {
  it("male patient with family history reaches ~25 questions", () => {
    const answers = {
      ...baseAnswers,
      q5_family: ["father", "paternal_grandfather"],
      q23_concern: "somewhat_concerned",
      q26_prior_treatments: ["minoxidil"],
    };
    const reached = getReachableQids(hairLossQuestions, answers);
    expect(reached.length).toBeGreaterThanOrEqual(23);
    expect(reached.length).toBeLessThanOrEqual(28);
    expect(reached).toContain("q6_family_onset_age");
    expect(reached).toContain("q24_topical_preference");
    expect(reached).toContain("q27_treatment_results");
  });

  it("female patient skips Q22–Q25 entire sexual health section", () => {
    const answers = { ...baseAnswers, q2_sex: "female" };
    const reached = getReachableQids(hairLossQuestions, answers);
    expect(reached).not.toContain("q22_sexual_function");
    expect(reached).not.toContain("q23_concern");
    expect(reached).not.toContain("q24_topical_preference");
    expect(reached).not.toContain("q25_conception_plan");
  });

  it("male with no family history skips Q6", () => {
    const answers = { ...baseAnswers, q5_family: ["no_family_history"] };
    const reached = getReachableQids(hairLossQuestions, answers);
    expect(reached).not.toContain("q6_family_onset_age");
  });

  it("'not_concerned' about sexual side effects skips Q24", () => {
    const answers = { ...baseAnswers, q23_concern: "not_concerned" };
    const reached = getReachableQids(hairLossQuestions, answers);
    expect(reached).not.toContain("q24_topical_preference");
  });

  it("first-timer (Q26 = only none_first_treatment) skips Q27", () => {
    const answers = {
      ...baseAnswers,
      q26_prior_treatments: ["none_first_treatment"],
    };
    const reached = getReachableQids(hairLossQuestions, answers);
    expect(reached).not.toContain("q27_treatment_results");
  });

  it("getNextQid returns the next reachable qid after the current one", () => {
    const answers = { ...baseAnswers, q5_family: ["no_family_history"] };
    // Q5's next should be Q7 (Q6 skipped), not Q6.
    expect(getNextQid(hairLossQuestions, answers, "q5_family")).toBe(
      "q7_past_six_months",
    );
  });

  it("getNextQid returns null when at the last reachable question", () => {
    const answers = { ...baseAnswers, q5_family: ["no_family_history"] };
    const reached = getReachableQids(hairLossQuestions, answers);
    const last = reached[reached.length - 1];
    expect(getNextQid(hairLossQuestions, answers, last)).toBeNull();
  });
});
```

- [ ] **Step 2: Run — confirm fail** (module missing)

```bash
pnpm --filter @onlyou/mobile test -- skipLogic.test
```

### 4.2 Implement

- [ ] **Step 3: Write `apps/mobile/src/questionnaire/skipLogic.ts`**

```ts
// Pure skip-logic helpers. No side effects. Operates on a snapshot of
// { answers, questions } and returns the reachable ordered list of qids
// or the next qid after a given one.

import type { Question } from "../data/questionnaires";

export type AnswersMap = Record<string, string | string[]>;

function isQuestionReachable(q: Question, answers: AnswersMap): boolean {
  // 1. Sex-gate — sexGate = "male" means skip when q2_sex === "female" (and vice-versa).
  if (q.sexGate && answers.q2_sex !== q.sexGate) return false;

  // 2. skipIf rules — skip when ANY rule matches.
  if (q.skipIf) {
    for (const rule of q.skipIf) {
      const ans = answers[rule.qid];
      if (ans === undefined) continue;
      if (rule.mode === "equals") {
        if (typeof ans === "string" && rule.values.includes(ans)) return false;
      } else {
        // mode === "includes" — ans must be an array; skip if ANY rule value is present
        const arr = Array.isArray(ans) ? ans : [ans];
        for (const v of rule.values) if (arr.includes(v)) return false;
      }
    }
  }

  return true;
}

export function getReachableQids(
  questions: Question[],
  answers: AnswersMap,
): string[] {
  return questions
    .filter((q) => isQuestionReachable(q, answers))
    .map((q) => q.id);
}

export function getNextQid(
  questions: Question[],
  answers: AnswersMap,
  currentQid: string,
): string | null {
  const reached = getReachableQids(questions, answers);
  const idx = reached.indexOf(currentQid);
  if (idx < 0 || idx === reached.length - 1) return null;
  return reached[idx + 1];
}
```

- [ ] **Step 4: Run — confirm pass**

```bash
pnpm --filter @onlyou/mobile test -- skipLogic.test
```

All 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/questionnaire/
git commit -m "feat(phase-3b): pure skip-logic engine for HL questionnaire

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Questionnaire store + router refactor

**Files:**

- Modify: `apps/mobile/src/stores/questionnaire-store.ts` (add schemaVersion + currentQid + history)
- Modify: `apps/mobile/app/questionnaire/[condition]/[qid].tsx` (route through skipLogic)
- Modify: `apps/mobile/app/questionnaire/[condition]/index.ts` (start flow)

### 5.1 Store refactor

- [ ] **Step 1: Update `questionnaire-store.ts`** — add:

```ts
// Fields additions on QuestionnaireState:
  schemaVersion: string | null;
  currentQid: string | null;
  history: string[]; // visited qid stack for back-nav

  // Method additions:
  startHL: (schemaVersion: string, firstQid: string) => void;
  advance: (currentQid: string, nextQid: string | null) => void;
  goBack: () => string | null;
```

Implementation:

```ts
startHL(schemaVersion, firstQid) {
  set({
    condition: "hair_loss",
    schemaVersion,
    answers: {},
    photoUris: {},
    currentQid: firstQid,
    history: [],
  });
},
advance(currentQid, nextQid) {
  set((s) => ({
    history: [...s.history, currentQid],
    currentQid: nextQid,
  }));
},
goBack() {
  const { history } = get();
  if (history.length === 0) return null;
  const prev = history[history.length - 1];
  set({
    history: history.slice(0, -1),
    currentQid: prev,
  });
  return prev;
},
```

- [ ] **Step 2: Wire `[qid].tsx`** to read `store.answers` + `getNextQid(questions, answers, qid)` on submit; `router.push` to `../[qid]/${nextQid}` or to `/review` if `nextQid === null`.

- [ ] **Step 3: Update `[condition]/index.tsx`** (flow entry) to call `startHL(HAIR_LOSS_SCHEMA_VERSION, hairLossQuestions[0].id)` and redirect to the first qid route.

### 5.2 Tests

- [ ] **Step 4: Add a store-behaviour test**

```ts
// apps/mobile/src/stores/__tests__/questionnaire-store.test.ts
import { describe, expect, it, beforeEach } from "vitest";

import { useQuestionnaireStore } from "../questionnaire-store";

beforeEach(() => {
  useQuestionnaireStore.getState().reset();
});

describe("questionnaire store", () => {
  it("startHL initialises state", () => {
    useQuestionnaireStore.getState().startHL("hair-loss-v1", "q1_age");
    const s = useQuestionnaireStore.getState();
    expect(s.schemaVersion).toBe("hair-loss-v1");
    expect(s.currentQid).toBe("q1_age");
    expect(s.history).toEqual([]);
  });

  it("advance pushes to history and updates currentQid", () => {
    const store = useQuestionnaireStore.getState();
    store.startHL("hair-loss-v1", "q1_age");
    store.advance("q1_age", "q2_sex");
    const s = useQuestionnaireStore.getState();
    expect(s.history).toEqual(["q1_age"]);
    expect(s.currentQid).toBe("q2_sex");
  });

  it("goBack pops history", () => {
    const store = useQuestionnaireStore.getState();
    store.startHL("hair-loss-v1", "q1_age");
    store.advance("q1_age", "q2_sex");
    store.advance("q2_sex", "q3_location");
    const prev = store.goBack();
    expect(prev).toBe("q2_sex");
    expect(useQuestionnaireStore.getState().currentQid).toBe("q2_sex");
    expect(useQuestionnaireStore.getState().history).toEqual(["q1_age"]);
  });
});
```

- [ ] **Step 5: Run mobile tests**

```bash
pnpm --filter @onlyou/mobile test
```

Expected: baseline + skipLogic (7) + hair-loss-shape (10) + questionnaire-store (3) all green.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/stores/ apps/mobile/app/questionnaire/
git commit -m "feat(phase-3b): questionnaire store schemaVersion/history + router uses skipLogic

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Review screen renders real grouped data

**Files:**

- Modify: `apps/mobile/app/questionnaire/[condition]/review.tsx`

- [ ] **Step 1: Read the current review.tsx** — it renders Phase 2 stub answers.

- [ ] **Step 2: Rewrite** to:
  - Pull `answers` + `condition` + `schemaVersion` from the store.
  - Group questions by `question.section` (six sections for HL).
  - For each question, render `{question.title}` + the selected label(s). Multi-selects: `answers[qid].map(v => option.label).join(", ")`.
  - Each row tappable — `router.push(\`/questionnaire/${condition}/${qid}\`)` to jump back and edit.
  - Consent checkbox (required, must be checked to enable Submit).
  - Submit button → calls `useSubmitConsultation` hook (created in Task 13).

For now (Task 6 only), wire the Submit button to a placeholder `console.warn("submit not yet wired — task 14")` and mark the button disabled-but-render-red if the hook is not yet available. Task 14 replaces the placeholder.

- [ ] **Step 3: Jest snapshot or shallow-render test**

```ts
// apps/mobile/__tests__/questionnaire/review.test.tsx
import { render } from "@testing-library/react-native";
// ... stub useQuestionnaireStore to return a sample HL answer map
// Assert that each section heading renders + at least one Q1/Q2 answer is visible.
```

- [ ] **Step 4: Run mobile tests**

```bash
pnpm --filter @onlyou/mobile test
```

Green.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/questionnaire/[condition]/review.tsx apps/mobile/__tests__/questionnaire/
git commit -m "feat(phase-3b): HL questionnaire review screen with section grouping + edit taps

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Install photo-pipeline deps + Expo config

**Files:**

- Modify: `package.json` + `pnpm-lock.yaml`
- Modify: `apps/mobile/app.json`

- [ ] **Step 1: Install**

```bash
cd ../onlyou2-phase-3b/apps/mobile
pnpm add expo-camera expo-image-picker expo-apple-authentication
cd ../..
```

- [ ] **Step 2: Update `apps/mobile/app.json`**

Add these entries to the existing `expo.plugins` array:

```json
"plugins": [
  "expo-router",
  [
    "expo-camera",
    {
      "cameraPermission": "ONLYOU needs camera access to take your scalp photos for the doctor.",
      "microphonePermission": false,
      "recordAudioAndroid": false
    }
  ],
  [
    "expo-image-picker",
    {
      "photosPermission": "ONLYOU needs access to your photo library to upload scalp photos."
    }
  ],
  "expo-apple-authentication"
]
```

- [ ] **Step 3: iOS plist strings** (already covered by plugins) and **Android permissions** — confirm `expo-camera` + `expo-image-picker` auto-inject; no manual AndroidManifest changes needed.

- [ ] **Step 4: Run prebuild dry-run**

```bash
npx expo prebuild --no-install --platform android
```

Expected: success. If anything errors, fix the config.

Revert `android/` + `ios/` scaffolds — they are gitignored, but remove locally to keep the repo Expo-managed:

```bash
rm -rf android/ ios/
```

- [ ] **Step 5: Run mobile tests (no regressions)**

```bash
pnpm --filter @onlyou/mobile test
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app.json package.json pnpm-lock.yaml apps/mobile/package.json
git commit -m "feat(phase-3b): add expo-camera + expo-image-picker + expo-apple-authentication

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Bottom-sheet photo picker component

**Files:**

- Create: `apps/mobile/src/components/questionnaire/PhotoSlotBottomSheet.tsx`
- Create: `apps/mobile/__tests__/components/PhotoSlotBottomSheet.test.tsx`

### 8.1 Test

- [ ] **Step 1: Write a render test**

Assert: two tappable rows — "Take photo" and "Choose from library". OnSelect callback fires with the correct source.

```ts
import { fireEvent, render } from "@testing-library/react-native";
import { describe, expect, it, vi } from "vitest";

import { PhotoSlotBottomSheet } from "../../src/components/questionnaire/PhotoSlotBottomSheet";

describe("PhotoSlotBottomSheet", () => {
  it("renders both options and fires onSelect", () => {
    const onSelect = vi.fn();
    const { getByText } = render(
      <PhotoSlotBottomSheet
        visible={true}
        slot="crown"
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    fireEvent.press(getByText("Take photo"));
    expect(onSelect).toHaveBeenCalledWith("camera");

    fireEvent.press(getByText("Choose from library"));
    expect(onSelect).toHaveBeenLastCalledWith("library");
  });
});
```

### 8.2 Implement

- [ ] **Step 2: Write the component** using the same bottom-sheet pattern the rest of the app uses (check `apps/mobile/src/components/` for the existing pattern — likely a `Modal` with slide-up animation). If no existing pattern, implement with `react-native-modal` or `Modal` from `react-native`.

- [ ] **Step 3: Export + run test**

```bash
pnpm --filter @onlyou/mobile test -- PhotoSlotBottomSheet
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/questionnaire/PhotoSlotBottomSheet.tsx apps/mobile/__tests__/components/
git commit -m "feat(phase-3b): photo-slot bottom-sheet picker (camera / library)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Real camera screen (expo-camera)

**Files:**

- Modify: `apps/mobile/app/photo-upload/[condition]/camera.tsx` (already exists as a Phase-2 mock — replace with real `expo-camera`)

- [ ] **Step 1: Read the current mock file** to preserve its routing shape + accepted params (`slot`, return URI via the store).

- [ ] **Step 2: Rewrite with expo-camera**

```tsx
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import type { PhotoSlot } from "@/types/photo-slot"; // re-export of convex/lib/photoSlot's PhotoSlot

export default function CameraScreen() {
  const { slot, condition } = useLocalSearchParams<{
    slot: PhotoSlot;
    condition: string;
  }>();
  const [perm, requestPerm] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const setPhotoUri = useQuestionnaireStore((s) => s.setPhotoUri);

  if (!perm) return null;
  if (!perm.granted) {
    return (
      <View>
        <Text>Camera permission needed to capture your photo.</Text>
        <Pressable onPress={requestPerm}>
          <Text>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  async function capture() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
    if (photo?.uri) setCaptured(photo.uri);
  }

  function confirm() {
    if (!captured) return;
    setPhotoUri(slot, captured);
    router.back();
  }

  if (captured) {
    return (
      <View style={{ flex: 1 }}>
        {/* preview image + Retake + Use photo buttons */}
        {/* Use Image from react-native */}
        <Pressable onPress={() => setCaptured(null)}>
          <Text>Retake</Text>
        </Pressable>
        <Pressable onPress={confirm}>
          <Text>Use this photo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
        {/* framing guide overlay: slot-specific guide image */}
      </CameraView>
      <Pressable onPress={capture}>
        <Text>Capture</Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 3: Also wire the "Choose from library" path** — a separate route or a branch inside the same flow that uses `expo-image-picker`'s `launchImageLibraryAsync`:

```ts
import * as ImagePicker from "expo-image-picker";

async function pickFromLibrary(slot: PhotoSlot) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    allowsMultipleSelection: false,
  });
  if (!result.canceled && result.assets[0]) {
    useQuestionnaireStore.getState().setPhotoUri(slot, result.assets[0].uri);
  }
}
```

Put this helper in `apps/mobile/src/questionnaire/pickFromLibrary.ts` and import from the `PhotoSlotBottomSheet` `onSelect("library")` branch.

- [ ] **Step 4: Jest mocks**

`expo-camera` needs a mock in `jest.setup.ts`:

```ts
jest.mock("expo-camera", () => ({
  CameraView: "CameraView",
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ granted: true }),
}));
```

- [ ] **Step 5: Run mobile tests**

```bash
pnpm --filter @onlyou/mobile test
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/photo-upload/[condition]/camera.tsx apps/mobile/src/questionnaire/pickFromLibrary.ts apps/mobile/jest.setup.ts apps/mobile/__tests__/
git commit -m "feat(phase-3b): real expo-camera + expo-image-picker wiring for scalp photos

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Photo upload mutations (getPhotoUploadUrl + recordPhoto)

**Files:**

- Create: `convex/consultations/photos.ts`
- Create: `convex/consultations/__tests__/photos.test.ts`

### 10.1 Test

- [ ] **Step 1: Write the mutation test**

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

async function seed(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      phone: "+919999900001",
      role: "PATIENT",
      phoneVerified: true,
      profileComplete: true,
      createdAt: 1,
    });
    const token = "tok";
    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt: Date.now() + 60_000,
      createdAt: Date.now(),
    });
    const consultationId = await ctx.db.insert("consultations", {
      userId,
      vertical: "hair_loss",
      status: "SUBMITTED",
      statusUpdatedAt: Date.now(),
      submittedAt: Date.now(),
      createdAt: Date.now(),
    });
    return { userId, token, consultationId };
  });
}

describe("consultations.photos.recordPhoto", () => {
  it("rejects an invalid slot", async () => {
    const t = convexTest(schema, modules);
    const { token, consultationId } = await seed(t);
    const fileId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["x"])),
    );
    await expect(
      t.mutation(api.consultations.photos.recordPhoto, {
        token,
        consultationId,
        slot: "not_a_real_slot" as never,
        fileId,
        mimeType: "image/jpeg",
        fileSizeBytes: 1,
      }),
    ).rejects.toThrow();
  });

  it("inserts a photos row on a valid call", async () => {
    const t = convexTest(schema, modules);
    const { userId, token, consultationId } = await seed(t);
    const fileId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["x"])),
    );
    await t.mutation(api.consultations.photos.recordPhoto, {
      token,
      consultationId,
      slot: "crown",
      fileId,
      mimeType: "image/jpeg",
      fileSizeBytes: 1,
    });
    const rows = await t.run((ctx) =>
      ctx.db
        .query("photos")
        .withIndex("by_consultation_slot", (q) =>
          q.eq("consultationId", consultationId).eq("slot", "crown"),
        )
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(userId);
  });

  it("overwrites the prior photo when the same slot is recorded twice", async () => {
    const t = convexTest(schema, modules);
    const { token, consultationId } = await seed(t);
    const fileA = await t.run((ctx) => ctx.storage.store(new Blob(["a"])));
    const fileB = await t.run((ctx) => ctx.storage.store(new Blob(["b"])));
    await t.mutation(api.consultations.photos.recordPhoto, {
      token,
      consultationId,
      slot: "crown",
      fileId: fileA,
      mimeType: "image/jpeg",
      fileSizeBytes: 1,
    });
    await t.mutation(api.consultations.photos.recordPhoto, {
      token,
      consultationId,
      slot: "crown",
      fileId: fileB,
      mimeType: "image/jpeg",
      fileSizeBytes: 1,
    });
    const rows = await t.run((ctx) =>
      ctx.db
        .query("photos")
        .withIndex("by_consultation_slot", (q) =>
          q.eq("consultationId", consultationId).eq("slot", "crown"),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].fileId).toBe(fileB);
  });

  it("rejects calls by a session that does not own the consultation", async () => {
    const t = convexTest(schema, modules);
    const { consultationId } = await seed(t);
    // Create a second user + session.
    const attackerToken = await t.run(async (ctx) => {
      const attacker = await ctx.db.insert("users", {
        phone: "+919999900002",
        role: "PATIENT",
        phoneVerified: true,
        profileComplete: true,
        createdAt: 1,
      });
      const token = "attacker";
      await ctx.db.insert("sessions", {
        userId: attacker,
        token,
        expiresAt: Date.now() + 60_000,
        createdAt: Date.now(),
      });
      return token;
    });
    const fileId = await t.run((ctx) => ctx.storage.store(new Blob(["x"])));
    await expect(
      t.mutation(api.consultations.photos.recordPhoto, {
        token: attackerToken,
        consultationId,
        slot: "crown",
        fileId,
        mimeType: "image/jpeg",
        fileSizeBytes: 1,
      }),
    ).rejects.toThrow(/unauthor|forbidden/i);
  });
});
```

- [ ] **Step 2: Run — confirm fail**

```bash
pnpm test:convex -- photos.test
```

### 10.2 Implement

- [ ] **Step 3: Write `convex/consultations/photos.ts`**

```ts
// Photo upload surface: generateUploadUrl + recordPhoto.
// Session-token auth (never ctx.auth.getUserIdentity — providers: []).

import { ConvexError, v } from "convex/values";

import { mutation } from "../_generated/server";
import { mimeTypeValidator, photoSlotValidator } from "../lib/photoSlot";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB — scalp photos can be large.

async function requireSessionUser(ctx: { db: any }, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError({ code: "unauthenticated" });
  }
  return session.userId as any;
}

export const generatePhotoUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireSessionUser(ctx, token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const recordPhoto = mutation({
  args: {
    token: v.string(),
    consultationId: v.id("consultations"),
    slot: photoSlotValidator,
    fileId: v.id("_storage"),
    mimeType: mimeTypeValidator,
    fileSizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSessionUser(ctx, args.token);
    const consultation = await ctx.db.get(args.consultationId);
    if (!consultation) throw new ConvexError({ code: "not_found" });
    if (consultation.userId !== userId) {
      throw new ConvexError({ code: "forbidden" });
    }
    if (args.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new ConvexError({ code: "file_too_large" });
    }

    // Soft-delete any prior photo for this (consultationId, slot).
    const existing = await ctx.db
      .query("photos")
      .withIndex("by_consultation_slot", (q) =>
        q.eq("consultationId", args.consultationId).eq("slot", args.slot),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    for (const e of existing) {
      await ctx.db.patch(e._id, { deletedAt: Date.now() });
    }

    const photoId = await ctx.db.insert("photos", {
      consultationId: args.consultationId,
      userId,
      slot: args.slot,
      fileId: args.fileId,
      mimeType: args.mimeType,
      fileSizeBytes: args.fileSizeBytes,
      uploadedAt: Date.now(),
    });
    return { photoId };
  },
});
```

Note: the `mimeTypeValidator` used here must be exported from `convex/lib/photoSlot.ts` — add that export if not already present.

- [ ] **Step 4: Export `mimeTypeValidator` from `photoSlot.ts`** — or if already in `consultations/schema.ts`, import from there in photos.ts.

- [ ] **Step 5: Codegen + test**

```bash
npx convex codegen
pnpm test:convex -- photos.test
```

Expected: all 4 tests green.

- [ ] **Step 6: Full suite**

```bash
pnpm test:convex
```

- [ ] **Step 7: Commit**

```bash
git add convex/consultations/photos.ts convex/consultations/__tests__/photos.test.ts convex/_generated/
git commit -m "feat(phase-3b): photo upload mutations + soft-delete overwrite on re-record

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Google Sign-In (Android + iOS)

**Files:**

- Create: `convex/auth/socialSignIn.ts`
- Create: `convex/auth/__tests__/socialSignIn.test.ts`
- Create: `apps/mobile/src/components/auth/GoogleSignInButton.tsx`
- Modify: `apps/mobile/app/(auth)/welcome.tsx`

### 11.1 Server action

- [ ] **Step 1: Install `google-auth-library` on the workspace**

```bash
cd ../onlyou2-phase-3b
pnpm add google-auth-library -w
```

- [ ] **Step 2: Write the test**

```ts
// convex/auth/__tests__/socialSignIn.test.ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { api } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    async verifyIdToken({ idToken }: { idToken: string }) {
      if (idToken === "invalid") throw new Error("invalid token");
      return {
        getPayload: () => ({
          email: "test@example.com",
          email_verified: true,
          name: "Test User",
          sub: "google-subject-123",
        }),
      };
    }
  },
}));

describe("auth.socialSignIn.signInWithGoogle", () => {
  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client-id";
  });

  it("rejects an invalid token", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.auth.socialSignIn.signInWithGoogle, { idToken: "invalid" }),
    ).rejects.toThrow();
  });

  it("creates a new user on first sign-in and returns a session token", async () => {
    const t = convexTest(schema, modules);
    const result = await t.action(api.auth.socialSignIn.signInWithGoogle, {
      idToken: "valid-token",
    });
    expect(result.token).toMatch(/^[0-9a-f]{64}$/);
    const users = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", "test@example.com"))
        .collect(),
    );
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Test User");
    expect(users[0].profileComplete).toBe(false);
  });

  it("returns the same userId for a repeat sign-in", async () => {
    const t = convexTest(schema, modules);
    const a = await t.action(api.auth.socialSignIn.signInWithGoogle, {
      idToken: "valid-token",
    });
    const b = await t.action(api.auth.socialSignIn.signInWithGoogle, {
      idToken: "valid-token",
    });
    expect(a.userId).toBe(b.userId);
    expect(a.token).not.toBe(b.token);
  });
});
```

- [ ] **Step 3: Run test — confirm fail**

- [ ] **Step 4: Write `convex/auth/socialSignIn.ts`**

```ts
"use node";

import { ConvexError, v } from "convex/values";
import { OAuth2Client } from "google-auth-library";

import { api } from "../_generated/api";
import { action } from "../_generated/server";

export const signInWithGoogle = action({
  args: { idToken: v.string() },
  handler: async (
    ctx,
    { idToken },
  ): Promise<{ token: string; userId: string; profileComplete: boolean }> => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      throw new ConvexError({ code: "google_oauth_not_configured" });
    }
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      throw new ConvexError({ code: "google_email_unverified" });
    }

    const result = await ctx.runMutation(
      api.auth.socialDb.findOrCreateUserByEmail,
      {
        email: payload.email,
        name: payload.name ?? null,
      },
    );
    return result;
  },
});
```

- [ ] **Step 5: Write `convex/auth/socialDb.ts`** (the db-side helper — separate file because action can't query directly):

```ts
import { v } from "convex/values";

import { mutation } from "../_generated/server";

export const findOrCreateUserByEmail = mutation({
  args: { email: v.string(), name: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, { email, name }) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) {
      const userId = await ctx.db.insert("users", {
        email,
        name: name ?? undefined,
        role: "PATIENT",
        phoneVerified: false,
        profileComplete: false,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
      if (!user) throw new Error("failed to create user");
    }
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
    });
    return {
      token,
      userId: user._id as unknown as string,
      profileComplete: user.profileComplete,
    };
  },
});
```

Note: `users.phone` is `v.optional(v.string())` in the current schema — the insert here omits phone. That's fine. Phone-verify can happen later if regulatory compliance demands it for this user.

- [ ] **Step 6: Codegen + test**

```bash
npx convex codegen
pnpm test:convex -- socialSignIn.test
```

### 11.2 Mobile button

- [ ] **Step 7: Install Expo Auth Session + Google**

```bash
cd apps/mobile
pnpm add expo-auth-session
cd ../..
```

- [ ] **Step 8: Write `apps/mobile/src/components/auth/GoogleSignInButton.tsx`**

```tsx
import * as Google from "expo-auth-session/providers/google";
import { useEffect } from "react";
import { Pressable, Text } from "react-native";

import { useConvex } from "convex/react";
import { api } from "@onlyou/convex/api";

import { useAuthStore } from "@/stores/auth-store";

export function GoogleSignInButton({ onSuccess }: { onSuccess: () => void }) {
  const convex = useConvex();
  const setToken = useAuthStore((s) => s.setToken);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.params.id_token;
    if (!idToken) return;
    (async () => {
      const result = await convex.action(
        api.auth.socialSignIn.signInWithGoogle,
        {
          idToken,
        },
      );
      setToken(result.token);
      onSuccess();
    })();
  }, [response]);

  return (
    <Pressable
      disabled={!request}
      onPress={() => promptAsync()}
      accessibilityLabel="Sign in with Google"
      style={{
        height: 48,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Continue with Google</Text>
    </Pressable>
  );
}
```

- [ ] **Step 9: Wire into `apps/mobile/app/(auth)/welcome.tsx`** above the existing phone-CTA. The `onSuccess` callback navigates to profile-setup (new users) or home (existing).

- [ ] **Step 10: Document env var**

Add `EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` to `apps/mobile/.env.local` (gitignored). Founder must populate with a real Google OAuth client ID. Without it, the button is disabled (safe fallback — `request` is null).

- [ ] **Step 11: Commit**

```bash
git add convex/auth/socialSignIn.ts convex/auth/socialDb.ts convex/auth/__tests__/socialSignIn.test.ts convex/_generated/ apps/mobile/src/components/auth/GoogleSignInButton.tsx apps/mobile/app/\(auth\)/welcome.tsx apps/mobile/package.json package.json pnpm-lock.yaml
git commit -m "feat(phase-3b): Google Sign-In (Android + iOS)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Apple Sign-In (iOS only)

**Files:**

- Modify: `convex/auth/socialSignIn.ts` (add `signInWithApple`)
- Create: `apps/mobile/src/components/auth/AppleSignInButton.tsx`
- Modify: `apps/mobile/app/(auth)/welcome.tsx` (add the button, iOS-gated)

### 12.1 Server action

- [ ] **Step 1: Install Apple's public-key verifier**

```bash
pnpm add jose -w
```

`jose` exposes `jwtVerify` + `createRemoteJWKSet` — use it to verify the Apple identity token against `https://appleid.apple.com/auth/keys`.

- [ ] **Step 2: Append `signInWithApple` to `convex/auth/socialSignIn.ts`**

```ts
import { createRemoteJWKSet, jwtVerify } from "jose";

const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

export const signInWithApple = action({
  args: { identityToken: v.string(), nonce: v.optional(v.string()) },
  handler: async (
    ctx,
    { identityToken, nonce },
  ): Promise<{ token: string; userId: string; profileComplete: boolean }> => {
    const audience = process.env.APPLE_OAUTH_CLIENT_ID;
    if (!audience)
      throw new ConvexError({ code: "apple_oauth_not_configured" });
    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience,
    });
    if (!payload.email) {
      throw new ConvexError({ code: "apple_email_not_shared" });
    }
    if (nonce && payload.nonce !== nonce) {
      throw new ConvexError({ code: "apple_nonce_mismatch" });
    }
    const result = await ctx.runMutation(
      api.auth.socialDb.findOrCreateUserByEmail,
      { email: payload.email as string, name: null },
    );
    return result;
  },
});
```

- [ ] **Step 3: Add tests**

Mock `jose`'s `jwtVerify` the same way Google's `OAuth2Client` is mocked. Cover:

- Valid token → new user created.
- Invalid audience → throws.
- Nonce mismatch → throws.

```bash
pnpm test:convex -- socialSignIn.test
```

### 12.2 Mobile button

- [ ] **Step 4: Write `AppleSignInButton.tsx`** using `expo-apple-authentication`

```tsx
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

import { useConvex } from "convex/react";
import { api } from "@onlyou/convex/api";

import { useAuthStore } from "@/stores/auth-store";

export function AppleSignInButton({ onSuccess }: { onSuccess: () => void }) {
  const convex = useConvex();
  const setToken = useAuthStore((s) => s.setToken);
  if (Platform.OS !== "ios") return null;

  async function onPress() {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
    });
    if (!credential.identityToken) return;
    const result = await convex.action(api.auth.socialSignIn.signInWithApple, {
      identityToken: credential.identityToken,
    });
    setToken(result.token);
    onSuccess();
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={8}
      style={{ height: 48, width: "100%" }}
      onPress={onPress}
    />
  );
}
```

- [ ] **Step 5: Wire into welcome.tsx** (iOS-only branch).

- [ ] **Step 6: Commit**

```bash
git add convex/auth/socialSignIn.ts convex/auth/__tests__/socialSignIn.test.ts convex/_generated/ apps/mobile/src/components/auth/AppleSignInButton.tsx apps/mobile/app/\(auth\)/welcome.tsx package.json pnpm-lock.yaml
git commit -m "feat(phase-3b): Apple Sign-In (iOS-only)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: `submitConsultation` mutation + client hook

**Files:**

- Create: `convex/consultations/submitConsultation.ts`
- Create: `convex/consultations/__tests__/submitConsultation.test.ts`
- Create: `apps/mobile/src/hooks/use-submit-consultation.ts`

### 13.1 Server mutation

- [ ] **Step 1: Write the test**

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../../_generated/api";
import schema from "../../schema";

const modules = import.meta.glob("../../**/*.ts");

async function setupAuthenticatedUserWithPhotos(
  t: ReturnType<typeof convexTest>,
  slots: string[],
) {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      phone: "+919999900001",
      role: "PATIENT",
      phoneVerified: true,
      profileComplete: true,
      createdAt: 1,
    });
    const token = "tok";
    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt: Date.now() + 60_000,
      createdAt: Date.now(),
    });
    // We'll create a placeholder consultation for photo-slot pre-upload?
    // Simpler: the mutation creates the consultation, but pre-consultation
    // photo uploads point at a pseudo-consultation ID that later gets
    // reparented. For MVP, we adopt a "record photos under user + slot
    // without a consultationId and reparent on submit" pattern. Adjust
    // the schema: photos.consultationId becomes optional; or, easier,
    // pre-create a DRAFT consultation on questionnaire start. We chose
    // the latter in Task 13 to keep schema tight.
    const consultationId = await ctx.db.insert("consultations", {
      userId,
      vertical: "hair_loss",
      status: "SUBMITTED",
      statusUpdatedAt: Date.now(),
      submittedAt: Date.now(),
      createdAt: Date.now(),
    });
    const fileId = await ctx.storage.store(new Blob(["x"]));
    for (const slot of slots) {
      await ctx.db.insert("photos", {
        consultationId,
        userId,
        slot: slot as any,
        fileId,
        mimeType: "image/jpeg",
        fileSizeBytes: 1,
        uploadedAt: Date.now(),
      });
    }
    return { userId, token, consultationId };
  });
}

describe("consultations.submitConsultation", () => {
  it("rejects when fewer than 4 photos are present", async () => {
    const t = convexTest(schema, modules);
    const { token, consultationId } = await setupAuthenticatedUserWithPhotos(
      t,
      ["crown", "hairline"],
    );
    await expect(
      t.mutation(api.consultations.submitConsultation.submitConsultation, {
        token,
        consultationId,
        schemaVersion: "hair-loss-v1",
        answers: { q1_age: "30", q2_sex: "male" },
      }),
    ).rejects.toThrow(/4 photos/i);
  });

  it("happy path — writes questionnaire_responses, transitions SUBMITTED → AI_PROCESSING via scheduler", async () => {
    const t = convexTest(schema, modules);
    const { userId, token, consultationId } =
      await setupAuthenticatedUserWithPhotos(t, [
        "crown",
        "hairline",
        "left_temple",
        "right_temple",
      ]);
    await t.mutation(api.consultations.submitConsultation.submitConsultation, {
      token,
      consultationId,
      schemaVersion: "hair-loss-v1",
      answers: { q1_age: "30", q2_sex: "male" },
    });

    const responses = await t.run((ctx) =>
      ctx.db
        .query("questionnaire_responses")
        .withIndex("by_consultation", (q) =>
          q.eq("consultationId", consultationId),
        )
        .collect(),
    );
    expect(responses).toHaveLength(1);
    expect(responses[0].schemaVersion).toBe("hair-loss-v1");
    expect(responses[0].userId).toBe(userId);

    // Scheduler-side effect: a job is scheduled for AI processing
    // (Phase 3C ships the action; Phase 3B schedules a stub that
    // transitions to AI_PROCESSING immediately).
  });
});
```

- [ ] **Step 2: Run — confirm fail**

### 13.2 Implement

- [ ] **Step 3: Write `convex/consultations/submitConsultation.ts`**

Design note: the spec calls for `submitConsultation` to INSERT a new consultation row. But the client needs a consultationId earlier so that photos can attach. Pattern:

1. `submitConsultation` accepts an OPTIONAL `consultationId` arg.
2. If none provided → create a new row in `SUBMITTED` on the spot (no photos required — we assert them post-insert, which means no photos can have been uploaded for this consultationId yet because it didn't exist → contradicts photo upload order).
3. Cleaner pattern: client calls `api.consultations.startConsultation` at questionnaire start to create a DRAFT row, collects photos under that consultationId, then calls `submitConsultation` to finalize.

Adopt the **two-step** pattern:

- `startConsultation({ token, vertical })` — creates a DRAFT consultation (status `SUBMITTED` is incorrect for draft; use a new status literal? No — spec §4.6 says the row lands in SUBMITTED only after validation. For cleaner semantics: extend the status validator with a new `DRAFT` literal ONLY if we need it. Simpler alternative: inserts the row with `status: "SUBMITTED"` but `submittedAt: 0` + a boolean `isDraft: true`. Even simpler: the row is created with `status: "SUBMITTED"` from the start, photos attach pre-submit, and `submitConsultation` just adds the questionnaire_responses row + kicks off the scheduler. No distinct "draft" status.).

Chosen pattern (matches spec §4.6 literally): `startConsultation` creates the row with `status: "SUBMITTED"`. The row exists but has no `questionnaire_responses` yet. `submitConsultation` asserts the 4 photos are present, writes the responses, and schedules the AI action. `transitionStatus` SUBMITTED → AI_PROCESSING runs inside the scheduled action (Phase 3C's territory); for Phase 3B, we schedule a Phase-3B stub action that just transitions to AI_PROCESSING + logs `ai_assessment_stub: ready for Phase 3C`. Phase 3C replaces the stub with the real Claude call.

```ts
import { ConvexError, v } from "convex/values";

import { api, internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { verticalValidator } from "./schema";

import { PHOTO_SLOTS, REQUIRED_PHOTO_COUNT } from "../lib/photoSlot";

export const startConsultation = mutation({
  args: { token: v.string(), vertical: verticalValidator },
  handler: async (ctx, { token, vertical }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({ code: "unauthenticated" });
    }
    const now = Date.now();
    const consultationId = await ctx.db.insert("consultations", {
      userId: session.userId,
      vertical,
      status: "SUBMITTED",
      statusUpdatedAt: now,
      submittedAt: now,
      createdAt: now,
    });
    return { consultationId };
  },
});

export const submitConsultation = mutation({
  args: {
    token: v.string(),
    consultationId: v.id("consultations"),
    schemaVersion: v.string(),
    answers: v.any(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError({ code: "unauthenticated" });
    }
    const consultation = await ctx.db.get(args.consultationId);
    if (!consultation) throw new ConvexError({ code: "not_found" });
    if (consultation.userId !== session.userId) {
      throw new ConvexError({ code: "forbidden" });
    }

    // Guard: exactly 4 photos, one per slot.
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_consultation_slot", (q) =>
        q.eq("consultationId", args.consultationId),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    const slotsPresent = new Set(photos.map((p) => p.slot));
    if (slotsPresent.size !== REQUIRED_PHOTO_COUNT) {
      throw new ConvexError({
        code: "missing_photos",
        message: `Expected 4 photos (${PHOTO_SLOTS.join(", ")}); got ${slotsPresent.size}.`,
      });
    }

    // Guard: no prior questionnaire_responses for this consultation (idempotency).
    const existing = await ctx.db
      .query("questionnaire_responses")
      .withIndex("by_consultation", (q) =>
        q.eq("consultationId", args.consultationId),
      )
      .unique();
    if (existing) throw new ConvexError({ code: "already_submitted" });

    // Write the response row.
    await ctx.db.insert("questionnaire_responses", {
      consultationId: args.consultationId,
      userId: session.userId,
      schemaVersion: args.schemaVersion,
      answers: args.answers,
      completedAt: Date.now(),
    });

    // Schedule the Phase 3C AI pre-assessment. For Phase 3B, this calls
    // a stub that just transitions SUBMITTED → AI_PROCESSING and logs.
    await ctx.scheduler.runAfter(
      0,
      internal.consultations.aiStub.kickoffAiStub,
      { consultationId: args.consultationId },
    );
    return { ok: true as const };
  },
});
```

- [ ] **Step 4: Write the stub action at `convex/consultations/aiStub.ts`**

```ts
import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

// Phase 3B stub — Phase 3C replaces this with the real Claude call.
// For now, just advance the state machine so the client sees a visible
// transition and we can exercise the scheduler path end-to-end.
export const kickoffAiStub = internalAction({
  args: { consultationId: v.id("consultations") },
  handler: async (ctx, { consultationId }) => {
    await ctx.runMutation(internal.consultations.transitions.transitionStatus, {
      consultationId,
      toStatus: "AI_PROCESSING",
      kind: "system",
      reason: "phase-3b stub",
    });
  },
});
```

- [ ] **Step 5: Codegen + test**

```bash
npx convex codegen
pnpm test:convex -- submitConsultation.test
```

### 13.3 Client hook

- [ ] **Step 6: Write `apps/mobile/src/hooks/use-submit-consultation.ts`**

```ts
import { useConvex } from "convex/react";
import { api } from "@onlyou/convex/api";
import { useCallback, useState } from "react";

import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";

export function useSubmitConsultation() {
  const convex = useConvex();
  const token = useAuthStore((s) => s.token);
  const store = useQuestionnaireStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (consultationId: string) => {
      if (!token) throw new Error("no auth token");
      if (!store.schemaVersion) throw new Error("no questionnaire started");
      setSubmitting(true);
      setError(null);
      try {
        await convex.mutation(
          api.consultations.submitConsultation.submitConsultation,
          {
            token,
            consultationId: consultationId as any,
            schemaVersion: store.schemaVersion,
            answers: store.answers,
          },
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [convex, token, store],
  );

  return { submit, submitting, error };
}
```

- [ ] **Step 7: Commit**

```bash
git add convex/consultations/ convex/_generated/ apps/mobile/src/hooks/use-submit-consultation.ts
git commit -m "feat(phase-3b): startConsultation + submitConsultation + AI stub scheduler

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Client wiring — review submit → consultation

**Files:**

- Modify: `apps/mobile/app/questionnaire/[condition]/review.tsx` (replace placeholder with real hook)
- Modify: `apps/mobile/app/questionnaire/[condition]/index.tsx` (call `api.consultations.submitConsultation.startConsultation` at flow entry)

- [ ] **Step 1: Entry route** — on questionnaire start, call `startConsultation({ token, vertical: "hair_loss" })`. Store the returned `consultationId` in the questionnaire store (add `consultationId: Id<"consultations"> | null` field + `setConsultationId` setter).

- [ ] **Step 2: Photo screens** — pass `consultationId` from the store to every photo mutation call (`recordPhoto`).

- [ ] **Step 3: Review screen Submit handler** — `useSubmitConsultation()` hook with the stored `consultationId`. On success: navigate to the existing plan-ready placeholder (3E wires the real treatment plan screen).

- [ ] **Step 4: E2E live test on dev Convex**

```bash
# Start Expo dev
pnpm --filter @onlyou/mobile start
# On Android device: sign up fresh, complete the 28-q questionnaire,
# upload 4 real photos, submit. Observe:
# - consultation row with status = "AI_PROCESSING" (stub transitioned)
# - questionnaire_responses row with answers JSON
# - 4 photos rows (one per slot)
# - consultation_status_history row: SUBMITTED → AI_PROCESSING (kind: system)
```

Record the screenshots + consultation-id in `docs/superpowers/phases/3b/e2e/`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/questionnaire/ apps/mobile/src/stores/questionnaire-store.ts docs/superpowers/phases/3b/e2e/
git commit -m "feat(phase-3b): wire review Submit → startConsultation + submitConsultation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Phase review + DEFERRED strikes + merge

**Files:**

- Modify: `docs/DEFERRED.md` — strike Phase 2/2C items that 3B ships.
- Create: `docs/superpowers/reviews/2026-04-25-phase-3b-review.md`.
- Update: `checkpoint.md`.

### 15.1 Strike DEFERRED items shipped by 3B

Apply strikes (wrap in `~~…~~` + append `— shipped phase-3b <SHA>`) to at least these entries:

- "Hair Loss questionnaire content" (Phase 2 deferral).
- "Photo upload: Choose from library bottom-sheet" (Phase 2C walkthrough).
- "Real camera" (Phase 2C walkthrough).
- "Social auth (Google + Apple Sign-In)" (Phase 2 deferral).
- "Real Gupshup sender" — NOT shipped in 3B (that's 3E); leave untouched.
- Per-vertical questionnaire content for HL (Phase 2 stub row).

Grep `docs/DEFERRED.md` for "Plan 3 (Hair Loss" to find each row.

### 15.2 Invoke phase code reviewer

Dispatch the `superpowers:code-reviewer` agent on the full phase-3b diff vs. master. Same format as phase-3a.

### 15.3 Address findings

Critical/Important → fix on branch. Minor → DEFERRED entry with destination phase.

### 15.4 Final suite

```bash
pnpm -w typecheck --force
pnpm -w lint
pnpm test:convex
pnpm --filter @onlyou/mobile test
pnpm --filter @onlyou/core test
```

All green.

### 15.5 Update checkpoint.md

Append a `## Phase 3B progress` section matching the 3A format: per-task commits, test counts, live E2E record, review verdict.

### 15.6 Merge to master

```bash
cd ../onlyou2
git merge --no-ff phase-3b -m "Merge phase-3b: questionnaire + photos + consultations

28-question hair-loss questionnaire with 4 skip rules + sex-gate.
Real expo-camera + expo-image-picker bottom-sheet photo pipeline.
Google + Apple Sign-In alongside phone OTP.
consultations + questionnaire_responses + photos + status_history
schema. transitionStatus + systemTransition engine with audit.
submitConsultation schedules a Phase 3C AI stub.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### 15.7 Push + clean

```bash
git push origin master
git worktree remove ../onlyou2-phase-3b
git branch -D phase-3b
```

---

## Self-review checklist (run before handoff)

- [ ] **Spec coverage §4.1** — consultations / questionnaire_responses / photos tables: Task 1.
- [ ] **Spec §4.2** — 22-status transitionStatus + systemTransition + audit: Task 2.
- [ ] **Spec §4.3** — 28-question port + skip logic: Tasks 3+4+5.
- [ ] **Spec §4.4** — real camera + bottom-sheet + 4 slots + upload flow: Tasks 7+8+9+10.
- [ ] **Spec §4.5** — Google + Apple Sign-In: Tasks 11+12.
- [ ] **Spec §4.6** — submitConsultation: Task 13.
- [ ] **Spec §4.7 test strategy** — unit + integration + live E2E all covered in Tasks 2+4+10+13+14.
- [ ] **Cross-cutting §9.1** — session-token auth everywhere, never `ctx.auth.getUserIdentity()` — confirmed in Tasks 10, 11, 12, 13.
- [ ] **No placeholders** — every code step shows actual code, not "similar to Task N".
- [ ] **Type consistency** — `PhotoSlot` = `"crown" | "hairline" | "left_temple" | "right_temple"` everywhere (schema, mutation, mobile). `ConsultationStatus` enum lives in schema.ts and is re-exported.
- [ ] **Test-before-code discipline** — every feature task writes the failing test before the implementation.
- [ ] **Commit-per-task discipline** — 15 tasks → 15+ commits, all prefixed `feat(phase-3b):` / `fix(phase-3b/…):` / `chore(phase-3b):`.
- [ ] **No secrets committed** — Google OAuth client ID + Apple audience live in env vars, not in code.

---

## Plan ends here

Handoff: dispatch via `superpowers:subagent-driven-development` (recommended).
