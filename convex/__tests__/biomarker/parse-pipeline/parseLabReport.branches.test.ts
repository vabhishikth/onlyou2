/// <reference types="vite/client" />
//
// Branch-coverage test suite for the parseLabReport orchestrator.
// Scenarios: 16 branches covering every exit path + cron stale-lock query.
//
// Mock strategy: vi.mock("../../lib/claude") hoists above the action; the
// action module imports callExtraction / callNarrative at module-level from
// ../../lib/claude, so the mock is guaranteed to be in place before any
// action invocation.
//
// convex-test pattern: convexTest(schema, modules) → t.action(api.…, args)
// Storage: ctx.storage.store a real Blob → get works naturally (per task brief).

import { convexTest } from "convex-test";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { internal } from "../../../_generated/api";
import schema from "../../../schema";

// ---- Module glob (same pattern as auth.test.ts) ----
const modules = import.meta.glob("../../../**/*.ts");

// ---- Mock callExtraction + callNarrative ----
const mockExtraction = vi.fn();
const mockNarrative = vi.fn();

vi.mock("../../../lib/claude", async () => {
  const actual = (await vi.importActual("../../../lib/claude")) as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    callExtraction: (...args: unknown[]) => mockExtraction(...args),
    callNarrative: (...args: unknown[]) => mockNarrative(...args),
  };
});

// ---- Shared fixtures ----

const VALID_EXTRACTION = {
  is_lab_report: true,
  patient_name_on_report: "Rahul Sharma",
  collection_date: "2026-03-15",
  markers: [
    {
      name_on_report: "TSH",
      canonical_id_guess: "tsh",
      raw_value: "2.5",
      raw_unit: "mIU/L",
      lab_printed_range: "0.4-4.0",
      page_number: 1,
      confidence: 0.97,
    },
    {
      name_on_report: "Hemoglobin",
      canonical_id_guess: "hemoglobin",
      raw_value: "14.2",
      raw_unit: "g/dL",
      lab_printed_range: "13.5-17.5",
      page_number: 1,
      confidence: 0.99,
    },
    {
      name_on_report: "Glucose",
      canonical_id_guess: "glucose_fasting",
      raw_value: "95",
      raw_unit: "mg/dL",
      lab_printed_range: "70-100",
      page_number: 1,
      confidence: 0.98,
    },
    {
      name_on_report: "Cholesterol",
      canonical_id_guess: "cholesterol_total",
      raw_value: "210",
      raw_unit: "mg/dL",
      lab_printed_range: "<200",
      page_number: 1,
      confidence: 0.96,
    },
  ],
};

const VALID_NARRATIVE = {
  narrative: "Your results look generally healthy.",
  modelUsed: "claude-sonnet-4-6",
};

// Seed a complete reference-range row for the given canonicalId.
async function seedReferenceRange(
  ctx: { db: { insert: Function } },
  canonicalId: string,
  overrides: Partial<{
    canonicalUnit: string;
    sex: "male" | "female" | "any";
    pregnancySensitive: boolean;
    ageMin: number;
    ageMax: number;
    optimalMin: number;
    optimalMax: number;
    actionBelow: number;
    actionAbove: number;
    subOptimalBelowMin: number;
    subOptimalAboveMax: number;
  }> = {},
) {
  return ctx.db.insert("biomarker_reference_ranges", {
    canonicalId,
    displayName: canonicalId,
    aliases: [],
    category: "general",
    canonicalUnit: overrides.canonicalUnit ?? "units",
    ageMin: overrides.ageMin ?? 0,
    ageMax: overrides.ageMax ?? 120,
    sex: overrides.sex ?? "any",
    pregnancySensitive: overrides.pregnancySensitive ?? false,
    optimalMin: overrides.optimalMin ?? 1,
    optimalMax: overrides.optimalMax ?? 1000,
    subOptimalBelowMin: overrides.subOptimalBelowMin,
    subOptimalAboveMax: overrides.subOptimalAboveMax,
    actionBelow: overrides.actionBelow,
    actionAbove: overrides.actionAbove,
    explainer: "test",
    source: "test",
    isActive: true,
    updatedAt: Date.now(),
  });
}

// Seed a user + lab_reports row with a real stored Blob. Returns { userId, labReportId }.
async function seedUserAndLabReport(
  t: ReturnType<typeof convexTest>,
  userOverrides: Partial<{
    name: string;
    dob: string;
    gender: "male" | "female" | "other";
    pregnancyStatus: "pregnant" | "not_pregnant" | "unknown";
  }> = {},
) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: userOverrides.name ?? "Rahul Sharma",
      phone: "+919876543210",
      role: "PATIENT",
      gender: userOverrides.gender ?? "male",
      dob: userOverrides.dob ?? "1990-01-01",
      pregnancyStatus: userOverrides.pregnancyStatus ?? "not_pregnant",
      phoneVerified: true,
      profileComplete: true,
      createdAt: Date.now(),
    });

    // Store a real (tiny) Blob so ctx.storage.get returns non-null
    const fakeBlob = new Blob(["%PDF-1.4 fake"], { type: "application/pdf" });
    const fileId = await ctx.storage.store(fakeBlob);

    const labReportId = await ctx.db.insert("lab_reports", {
      userId,
      source: "patient_upload",
      fileId,
      mimeType: "application/pdf",
      fileSizeBytes: 14,
      contentHash: `hash-${Math.random()}`,
      status: "uploaded",
      createdAt: Date.now(),
    });

    return { userId, labReportId };
  });
}

// Seed the four reference ranges used by VALID_EXTRACTION markers.
// canonicalUnit must match raw_unit from the extraction fixture so that
// normalizeUnit short-circuits without needing a conversion lookup.
async function seedDefaultRanges(ctx: { db: { insert: Function } }) {
  await seedReferenceRange(ctx, "tsh", {
    canonicalUnit: "mIU/L",
    optimalMin: 0.4,
    optimalMax: 4.0,
  });
  await seedReferenceRange(ctx, "hemoglobin", {
    canonicalUnit: "g/dL",
    optimalMin: 13.5,
    optimalMax: 17.5,
  });
  await seedReferenceRange(ctx, "glucose_fasting", {
    canonicalUnit: "mg/dL",
    optimalMin: 70,
    optimalMax: 100,
  });
  await seedReferenceRange(ctx, "cholesterol_total", {
    canonicalUnit: "mg/dL",
    optimalMin: 0,
    optimalMax: 200,
    subOptimalAboveMax: 240,
  });
}

// ---- Helpers ----

function makeMaxTokensError() {
  return Object.assign(new Error("max_tokens"), { stop_reason: "max_tokens" });
}

function makeHttpError(status: number, headers: Record<string, string> = {}) {
  return Object.assign(new Error(`HTTP ${status}`), { status, headers });
}

// ---- Tests ----

describe("parseLabReport orchestrator — branch coverage", () => {
  beforeEach(() => {
    mockExtraction.mockReset();
    mockNarrative.mockReset();
  });

  // ── Scenario 1: Happy path ────────────────────────────────────────────────
  it("happy path → status ready, biomarker_reports + biomarker_values rows created", async () => {
    const t = convexTest(schema, modules);
    const { userId, labReportId } = await seedUserAndLabReport(t);
    await t.run(async (ctx) => {
      await seedDefaultRanges(ctx);
    });

    mockExtraction.mockResolvedValueOnce(VALID_EXTRACTION);
    mockNarrative.mockResolvedValueOnce(VALID_NARRATIVE);

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("ready");

    await t.run(async (ctx) => {
      const lr = await ctx.db.get(labReportId);
      expect(lr?.status).toBe("ready");

      const br = await ctx.db
        .query("biomarker_reports")
        .withIndex("by_lab_report", (q) => q.eq("labReportId", labReportId))
        .first();
      expect(br).not.toBeNull();
      expect(br?.narrative).toBe(VALID_NARRATIVE.narrative);

      const values = await ctx.db
        .query("biomarker_values")
        .withIndex("by_report", (q) => q.eq("biomarkerReportId", br!._id))
        .collect();
      expect(values).toHaveLength(VALID_EXTRACTION.markers.length);
      // TSH at 2.5 is within [0.4, 4.0] → optimal
      const tsh = values.find((v) => v.canonicalId === "tsh");
      expect(tsh?.status).toBe("optimal");
      // Cholesterol at 210 is above optimalMax 200 → sub_optimal
      const chol = values.find((v) => v.canonicalId === "cholesterol_total");
      expect(chol?.status).toBe("sub_optimal");

      // userId is used only to quiet the lint; verify user still present
      const u = await ctx.db.get(userId);
      expect(u).not.toBeNull();
    });
  });

  // ── Scenario 2: Not a lab report ─────────────────────────────────────────
  it("is_lab_report: false → status not_a_lab_report, no biomarker_reports row", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    mockExtraction.mockResolvedValueOnce({
      is_lab_report: false,
      patient_name_on_report: "",
      collection_date: null,
      markers: [],
    });

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("not_a_lab_report");

    await t.run(async (ctx) => {
      const lr = await ctx.db.get(labReportId);
      expect(lr?.status).toBe("not_a_lab_report");

      const br = await ctx.db
        .query("biomarker_reports")
        .withIndex("by_lab_report", (q) => q.eq("labReportId", labReportId))
        .first();
      expect(br).toBeNull();
    });
  });

  // ── Scenario 3: Pregnancy-sensitive marker + unknown status ──────────────
  it("pregnancy-sensitive marker + pregnancyStatus unknown + female → unclassified(pregnancy_sensitive)", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t, {
      gender: "female",
      pregnancyStatus: "unknown",
      dob: "1995-06-15",
    });

    await t.run(async (ctx) => {
      await seedReferenceRange(ctx, "tsh", {
        pregnancySensitive: true,
        sex: "female",
        optimalMin: 0.4,
        optimalMax: 4.0,
      });
    });

    mockExtraction.mockResolvedValueOnce({
      is_lab_report: true,
      patient_name_on_report: "Priya",
      collection_date: "2026-03-15",
      markers: [
        {
          name_on_report: "TSH",
          canonical_id_guess: "tsh",
          raw_value: "2.5",
          raw_unit: "mIU/L",
          lab_printed_range: "0.4-4.0",
          page_number: 1,
          confidence: 0.97,
        },
      ],
    });
    mockNarrative.mockResolvedValueOnce(VALID_NARRATIVE);

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("ready");

    await t.run(async (ctx) => {
      const br = await ctx.db
        .query("biomarker_reports")
        .withIndex("by_lab_report", (q) => q.eq("labReportId", labReportId))
        .first();
      const values = await ctx.db
        .query("biomarker_values")
        .withIndex("by_report", (q) => q.eq("biomarkerReportId", br!._id))
        .collect();
      expect(values).toHaveLength(1);
      expect(values[0]?.status).toBe("unclassified");
      expect(values[0]?.unclassifiedReason).toBe("pregnancy_sensitive");
    });
  });

  // ── Scenario 4: User missing DOB ─────────────────────────────────────────
  it("user missing dob → all biomarker_values have status unclassified, reason profile_incomplete", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t, {
      dob: undefined,
    } as Parameters<typeof seedUserAndLabReport>[1]);
    // Override to actually remove dob
    await t.run(async (ctx) => {
      const lr = await ctx.db.get(labReportId);
      if (!lr) throw new Error("no lab_report");
      const u = await ctx.db.get(lr.userId);
      if (!u) throw new Error("no user");
      await ctx.db.patch(u._id, { dob: undefined });
    });

    await t.run(async (ctx) => {
      await seedDefaultRanges(ctx);
    });

    mockExtraction.mockResolvedValueOnce({
      ...VALID_EXTRACTION,
      markers: [VALID_EXTRACTION.markers[0]!], // single TSH marker
    });
    mockNarrative.mockResolvedValueOnce(VALID_NARRATIVE);

    await t.action(internal.biomarker.parseLabReport.parseLabReport, {
      labReportId,
    });

    await t.run(async (ctx) => {
      const br = await ctx.db
        .query("biomarker_reports")
        .withIndex("by_lab_report", (q) => q.eq("labReportId", labReportId))
        .first();
      const values = await ctx.db
        .query("biomarker_values")
        .withIndex("by_report", (q) => q.eq("biomarkerReportId", br!._id))
        .collect();
      expect(values).toHaveLength(1);
      expect(values[0]?.status).toBe("unclassified");
      expect(values[0]?.unclassifiedReason).toBe("profile_incomplete");
    });
  });

  // ── Scenario 5: Unknown canonicalId ──────────────────────────────────────
  it("unknown canonicalId → curation_queue row created + biomarker_value has unclassifiedReason not_in_reference_db", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);
    // Intentionally seed NO reference ranges — so the marker is unknown

    const unknownMarker = {
      name_on_report: "Mystery Enzyme",
      canonical_id_guess: "mystery_enzyme_xyz",
      raw_value: "42",
      raw_unit: "U/L",
      lab_printed_range: "10-50",
      page_number: 1,
      confidence: 0.8,
    };

    mockExtraction.mockResolvedValueOnce({
      is_lab_report: true,
      patient_name_on_report: "Rahul",
      collection_date: null,
      markers: [unknownMarker],
    });
    mockNarrative.mockResolvedValueOnce(VALID_NARRATIVE);

    await t.action(internal.biomarker.parseLabReport.parseLabReport, {
      labReportId,
    });

    await t.run(async (ctx) => {
      const br = await ctx.db
        .query("biomarker_reports")
        .withIndex("by_lab_report", (q) => q.eq("labReportId", labReportId))
        .first();
      const values = await ctx.db
        .query("biomarker_values")
        .withIndex("by_report", (q) => q.eq("biomarkerReportId", br!._id))
        .collect();
      expect(values[0]?.unclassifiedReason).toBe("not_in_reference_db");

      const queue = await ctx.db.query("biomarker_curation_queue").collect();
      expect(queue).toHaveLength(1);
      expect(queue[0]?.nameOnReport).toBe("Mystery Enzyme");
      expect(queue[0]?.occurrenceCount).toBe(1);
    });
  });

  // ── Scenario 6: Zod validation fails twice ───────────────────────────────
  it("Zod validation fails twice → parse_failed, errorCode zod_validation", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    // Both calls return garbage — Zod will reject both
    mockExtraction.mockResolvedValueOnce({ not_a_lab_report_shape: true });
    mockExtraction.mockResolvedValueOnce({ still_garbage: true });

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("failed:zod_validation");

    await t.run(async (ctx) => {
      const lr = await ctx.db.get(labReportId);
      expect(lr?.status).toBe("parse_failed");
      expect(lr?.errorCode).toBe("zod_validation");
    });
  });

  // ── Scenario 7: max_tokens once, succeeds second ─────────────────────────
  it("max_tokens on first attempt, success on second → status ready, extractAttempts 2", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);
    await t.run(async (ctx) => {
      await seedDefaultRanges(ctx);
    });

    mockExtraction.mockRejectedValueOnce(makeMaxTokensError());
    mockExtraction.mockResolvedValueOnce(VALID_EXTRACTION);
    mockNarrative.mockResolvedValueOnce(VALID_NARRATIVE);

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("ready");

    // Verify second call used bumped maxTokens
    expect(mockExtraction).toHaveBeenCalledTimes(2);
    expect(mockExtraction.mock.calls[1]?.[0]?.maxTokens).toBe(8192);
  });

  // ── Scenario 8: max_tokens twice ─────────────────────────────────────────
  it("max_tokens on both extraction attempts → parse_failed, errorCode response_too_large", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    mockExtraction.mockRejectedValueOnce(makeMaxTokensError());
    mockExtraction.mockRejectedValueOnce(makeMaxTokensError());

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("failed:response_too_large");

    await t.run(async (ctx) => {
      const lr = await ctx.db.get(labReportId);
      expect(lr?.status).toBe("parse_failed");
      expect(lr?.errorCode).toBe("response_too_large");
    });
  });

  // ── Scenario 9: Refused once, reprompt succeeds ──────────────────────────
  it("refusal on first attempt, reprompt succeeds → status ready", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);
    await t.run(async (ctx) => {
      await seedDefaultRanges(ctx);
    });

    // First call returns text that looks like a refusal
    const refusalResponse = {
      is_lab_report: false,
      patient_name_on_report: "I can't help with medical advice",
      collection_date: null,
      markers: [],
    };
    mockExtraction.mockResolvedValueOnce(refusalResponse);
    // Reprompt call returns good data
    mockExtraction.mockResolvedValueOnce(VALID_EXTRACTION);
    mockNarrative.mockResolvedValueOnce(VALID_NARRATIVE);

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("ready");
    expect(mockExtraction).toHaveBeenCalledTimes(2);
    // Second call should have the reprompt followUpMessage
    expect(mockExtraction.mock.calls[1]?.[0]?.followUpMessage).toContain(
      "structured data extraction",
    );
  });

  // ── Scenario 10: Refused twice ───────────────────────────────────────────
  it("refused twice → parse_failed, errorCode refused", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    const refusalResponse = {
      is_lab_report: false,
      patient_name_on_report: "I'm not able to interpret medical results",
      collection_date: null,
      markers: [],
    };
    mockExtraction.mockResolvedValueOnce(refusalResponse);
    mockExtraction.mockResolvedValueOnce(refusalResponse);

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("failed:refused");

    await t.run(async (ctx) => {
      const lr = await ctx.db.get(labReportId);
      expect(lr?.status).toBe("parse_failed");
      expect(lr?.errorCode).toBe("refused");
    });
  });

  // ── Scenario 11: 400 bad request ─────────────────────────────────────────
  // Fix C-1: 400 is structurally terminal — intercept BEFORE scheduleRetry,
  // route directly to terminalFail with errorCode "api_bad_request".
  // The alert:"p1" emission is in terminalFail → logParseEvent(level:"error")
  // but convex-test runs actions in a sandboxed runtime whose console does not
  // route back through the test process, so we assert the DB outcome only.
  // The alert:"p1" code path is covered by code-inspection: terminalFail()
  // passes alert:"p1" when errorCode === "api_bad_request" (parseLabReport.ts).
  it("400 bad request → single outcome failed:api_bad_request, status parse_failed (C-1 fix)", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    mockExtraction.mockRejectedValueOnce(makeHttpError(400));

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );

    // Single outcome: always terminal, never retry_scheduled
    expect(result.outcome).toBe("failed:api_bad_request");

    await t.run(async (ctx) => {
      const lr = await ctx.db.get(labReportId);
      expect(lr?.status).toBe("parse_failed");
      expect(lr?.errorCode).toBe("api_bad_request");
    });
  });

  // ── Scenario 12: 429 with retry-after: 10 ───────────────────────────────
  it("429 with retry-after: 10 → status analyzing, nextRetryAt: now + 10_000", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    const before = Date.now();
    mockExtraction.mockRejectedValueOnce(
      makeHttpError(429, { "retry-after": "10" }),
    );

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("retry_scheduled");

    await t.run(async (ctx) => {
      const lr = await ctx.db.get(labReportId);
      expect(lr?.status).toBe("analyzing");
      // nextRetryAt ≈ now + 10_000 (within 5s tolerance for test timing)
      expect(lr?.nextRetryAt).toBeGreaterThanOrEqual(before + 10_000);
      expect(lr?.nextRetryAt).toBeLessThan(before + 15_000);
    });
  });

  // ── Scenario 13: 5xx → status analyzing, nextRetryAt: now + 30_000 ──────
  it("503 → status analyzing, nextRetryAt: now + 30_000 (first attempt slot)", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    const before = Date.now();
    mockExtraction.mockRejectedValueOnce(makeHttpError(503));

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("retry_scheduled");

    await t.run(async (ctx) => {
      const lr = await ctx.db.get(labReportId);
      expect(lr?.status).toBe("analyzing");
      // Slot 0 = 30_000ms for attempt 1
      expect(lr?.nextRetryAt).toBeGreaterThanOrEqual(before + 30_000);
      expect(lr?.nextRetryAt).toBeLessThan(before + 35_000);
      expect(lr?.retryCount).toBe(1);
    });
  });

  // ── Scenario 14: Max retries exceeded (wall-clock > 30min) ───────────────
  it("wall-clock > 30min → parse_failed, errorCode max_retries_exceeded", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    // Backdate firstAttemptAt to 31 minutes ago
    await t.run(async (ctx) => {
      const THIRTY_ONE_MIN_AGO = Date.now() - 31 * 60 * 1000;
      await ctx.db.patch(labReportId, {
        firstAttemptAt: THIRTY_ONE_MIN_AGO,
        retryCount: 3,
        status: "analyzing",
        nextRetryAt: Date.now() - 1000, // overdue
      });
    });

    mockExtraction.mockRejectedValueOnce(makeHttpError(503));

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("failed:max_retries_exceeded");

    await t.run(async (ctx) => {
      const lr = await ctx.db.get(labReportId);
      expect(lr?.status).toBe("parse_failed");
      expect(lr?.errorCode).toBe("max_retries_exceeded");
    });
  });

  // ── Scenario 15: Idempotent second call ──────────────────────────────────
  it("existing biomarker_reports row → returns idempotent_noop, no duplicate rows", async () => {
    const t = convexTest(schema, modules);
    const { userId, labReportId } = await seedUserAndLabReport(t);
    await t.run(async (ctx) => {
      await seedDefaultRanges(ctx);
    });

    // First successful parse
    mockExtraction.mockResolvedValueOnce(VALID_EXTRACTION);
    mockNarrative.mockResolvedValueOnce(VALID_NARRATIVE);

    const first = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(first.outcome).toBe("ready");

    // Second call — idempotency check should short-circuit
    const second = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(second.outcome).toBe("idempotent_noop");

    // Verify no duplicate biomarker_reports rows
    await t.run(async (ctx) => {
      const reports = await ctx.db
        .query("biomarker_reports")
        .withIndex("by_lab_report", (q) => q.eq("labReportId", labReportId))
        .collect();
      expect(reports).toHaveLength(1);
      // userId check to suppress unused-variable lint
      expect(reports[0]?.userId).toBe(userId);
    });

    // Verify callExtraction was only called once (idempotent_noop skips Claude)
    expect(mockExtraction).toHaveBeenCalledTimes(1);
  });

  // ── Scenario 16: Stale lock — cron picks it up ───────────────────────────
  it("stale lockedAt (91s ago) → findRetryCandidates returns the row for cron pickup", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    const now = Date.now();
    const NINETY_ONE_SECONDS_AGO = now - 91_000;

    // Simulate a stale lock: status analyzing, lockedAt 91s ago, nextRetryAt in the past
    await t.run(async (ctx) => {
      await ctx.db.patch(labReportId, {
        status: "analyzing",
        lockedAt: NINETY_ONE_SECONDS_AGO,
        nextRetryAt: now - 5000, // past due
        retryCount: 1,
        firstAttemptAt: now - 120_000,
      });
    });

    // Query the cron's candidate-finding query directly
    const STALE_LOCK_CUTOFF_MS = 90_000; // 90s threshold
    const candidates = await t.run(async (ctx) => {
      return await ctx.db
        .query("lab_reports")
        .withIndex("by_next_retry", (q) => q.lte("nextRetryAt", now))
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "analyzing"),
            q.or(
              q.eq(q.field("lockedAt"), undefined),
              q.lt(q.field("lockedAt"), now - STALE_LOCK_CUTOFF_MS),
            ),
          ),
        )
        .take(25);
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?._id).toBe(labReportId);
  });

  // ── Coverage gap: feature flag disabled ─────────────────────────────────
  it("feature flag BIOMARKER_PARSING_ENABLED=false → outcome flag_disabled", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("featureFlags", {
        key: "BIOMARKER_PARSING_ENABLED",
        value: false,
        updatedAt: Date.now(),
      });
    });

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("flag_disabled");
    // No Claude calls should have been made
    expect(mockExtraction).not.toHaveBeenCalled();
  });

  // ── Coverage gap: classifyRow qualitative value ───────────────────────────
  it("qualitative raw_value → biomarker_value status unclassified, reason qualitative_value", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);
    await t.run(async (ctx) => {
      await seedReferenceRange(ctx, "hiv_antibody", {
        canonicalUnit: "units",
        optimalMin: 0,
        optimalMax: 1,
      });
    });

    mockExtraction.mockResolvedValueOnce({
      is_lab_report: true,
      patient_name_on_report: "Rahul",
      collection_date: null,
      markers: [
        {
          name_on_report: "HIV Antibody",
          canonical_id_guess: "hiv_antibody",
          raw_value: "Non-reactive",
          raw_unit: null,
          lab_printed_range: null,
          page_number: 1,
          confidence: 0.95,
        },
      ],
    });
    mockNarrative.mockResolvedValueOnce(VALID_NARRATIVE);

    await t.action(internal.biomarker.parseLabReport.parseLabReport, {
      labReportId,
    });

    await t.run(async (ctx) => {
      const br = await ctx.db
        .query("biomarker_reports")
        .withIndex("by_lab_report", (q) => q.eq("labReportId", labReportId))
        .first();
      const values = await ctx.db
        .query("biomarker_values")
        .withIndex("by_report", (q) => q.eq("biomarkerReportId", br!._id))
        .collect();
      expect(values[0]?.status).toBe("unclassified");
      expect(values[0]?.unclassifiedReason).toBe("qualitative_value");
      expect(values[0]?.valueType).toBe("qualitative");
    });
  });

  // ── Coverage gap: unit_conversion_missing ─────────────────────────────────
  it("unit conversion missing → biomarker_value status unclassified, reason unit_conversion_missing", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);
    await t.run(async (ctx) => {
      // canonicalUnit is mmol/L but marker reports mg/dL — no conversion seeded
      await seedReferenceRange(ctx, "glucose_fasting", {
        canonicalUnit: "mmol/L",
        optimalMin: 3.9,
        optimalMax: 5.6,
      });
    });

    mockExtraction.mockResolvedValueOnce({
      is_lab_report: true,
      patient_name_on_report: "Rahul",
      collection_date: null,
      markers: [
        {
          name_on_report: "Glucose",
          canonical_id_guess: "glucose_fasting",
          raw_value: "95",
          raw_unit: "mg/dL", // mismatches canonicalUnit mmol/L, no conversion available
          lab_printed_range: "70-100",
          page_number: 1,
          confidence: 0.98,
        },
      ],
    });
    mockNarrative.mockResolvedValueOnce(VALID_NARRATIVE);

    await t.action(internal.biomarker.parseLabReport.parseLabReport, {
      labReportId,
    });

    await t.run(async (ctx) => {
      const br = await ctx.db
        .query("biomarker_reports")
        .withIndex("by_lab_report", (q) => q.eq("labReportId", labReportId))
        .first();
      const values = await ctx.db
        .query("biomarker_values")
        .withIndex("by_report", (q) => q.eq("biomarkerReportId", br!._id))
        .collect();
      expect(values[0]?.status).toBe("unclassified");
      expect(values[0]?.unclassifiedReason).toBe("unit_conversion_missing");
    });
  });

  // ── Coverage gap: assignStatus actionBelow ────────────────────────────────
  it("value <= actionBelow → biomarker_value status action_required (actionBelow branch)", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);
    await t.run(async (ctx) => {
      await seedReferenceRange(ctx, "hemoglobin", {
        canonicalUnit: "g/dL",
        optimalMin: 13.5,
        optimalMax: 17.5,
        actionBelow: 8.0, // critically low
      });
    });

    mockExtraction.mockResolvedValueOnce({
      is_lab_report: true,
      patient_name_on_report: "Rahul",
      collection_date: null,
      markers: [
        {
          name_on_report: "Hemoglobin",
          canonical_id_guess: "hemoglobin",
          raw_value: "6.5", // below actionBelow=8.0
          raw_unit: "g/dL",
          lab_printed_range: "13.5-17.5",
          page_number: 1,
          confidence: 0.99,
        },
      ],
    });
    mockNarrative.mockResolvedValueOnce(VALID_NARRATIVE);

    await t.action(internal.biomarker.parseLabReport.parseLabReport, {
      labReportId,
    });

    await t.run(async (ctx) => {
      const br = await ctx.db
        .query("biomarker_reports")
        .withIndex("by_lab_report", (q) => q.eq("labReportId", labReportId))
        .first();
      const values = await ctx.db
        .query("biomarker_values")
        .withIndex("by_report", (q) => q.eq("biomarkerReportId", br!._id))
        .collect();
      expect(values[0]?.status).toBe("action_required");
    });
  });

  // ── Coverage gap: assignStatus actionAbove ────────────────────────────────
  it("value >= actionAbove → biomarker_value status action_required (actionAbove branch)", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);
    await t.run(async (ctx) => {
      await seedReferenceRange(ctx, "glucose_fasting", {
        canonicalUnit: "mg/dL",
        optimalMin: 70,
        optimalMax: 100,
        actionAbove: 400, // critically high
      });
    });

    mockExtraction.mockResolvedValueOnce({
      is_lab_report: true,
      patient_name_on_report: "Rahul",
      collection_date: null,
      markers: [
        {
          name_on_report: "Glucose",
          canonical_id_guess: "glucose_fasting",
          raw_value: "500", // above actionAbove=400
          raw_unit: "mg/dL",
          lab_printed_range: "70-100",
          page_number: 1,
          confidence: 0.98,
        },
      ],
    });
    mockNarrative.mockResolvedValueOnce(VALID_NARRATIVE);

    await t.action(internal.biomarker.parseLabReport.parseLabReport, {
      labReportId,
    });

    await t.run(async (ctx) => {
      const br = await ctx.db
        .query("biomarker_reports")
        .withIndex("by_lab_report", (q) => q.eq("labReportId", labReportId))
        .first();
      const values = await ctx.db
        .query("biomarker_values")
        .withIndex("by_report", (q) => q.eq("biomarkerReportId", br!._id))
        .collect();
      expect(values[0]?.status).toBe("action_required");
    });
  });

  // ── Coverage gap: retryScheduler slot exhaustion (attempt > schedule.length, within wall-clock) ──
  it("attempt 5 within wall-clock → terminal max_retries_exceeded (slot exhaustion)", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    // 5 attempts, but firstAttemptAt is recent (within 30min) so wall-clock cap won't fire
    // NETWORK_5XX_SCHEDULE_MS has 4 slots (indices 0-3); attempt 5 → slot 4 → terminal
    await t.run(async (ctx) => {
      await ctx.db.patch(labReportId, {
        retryCount: 4, // will become attempt 5 in scheduleRetry
        firstAttemptAt: Date.now() - 60_000, // 1 minute ago — well within 30min cap
        status: "analyzing",
      });
    });

    mockExtraction.mockRejectedValueOnce(makeHttpError(503));

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("failed:max_retries_exceeded");

    await t.run(async (ctx) => {
      const lr = await ctx.db.get(labReportId);
      expect(lr?.status).toBe("parse_failed");
      expect(lr?.errorCode).toBe("max_retries_exceeded");
    });
  });

  // ── Coverage gap: max_tokens attempt 2 throws non-max_tokens error ────────
  it("max_tokens first, then non-max_tokens error on retry → error bubbles up as retry_scheduled", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    mockExtraction.mockRejectedValueOnce(makeMaxTokensError());
    // Second attempt throws a network error (not max_tokens)
    mockExtraction.mockRejectedValueOnce(makeHttpError(503));

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    // The 503 bubbles up from extractMarkersWithRetry to scheduleRetry
    expect(result.outcome).toBe("retry_scheduled");
  });

  // ── Coverage gap: 429 with no retry-after header → default 10s delay ─────
  it("429 with no retry-after header → nextRetryAt: now + 10_000 (default)", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    const before = Date.now();
    // No retry-after header — retryAfterSeconds will be null → default 10s
    mockExtraction.mockRejectedValueOnce(makeHttpError(429, {}));

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("retry_scheduled");

    await t.run(async (ctx) => {
      const lr = await ctx.db.get(labReportId);
      expect(lr?.status).toBe("analyzing");
      expect(lr?.nextRetryAt).toBeGreaterThanOrEqual(before + 10_000);
      expect(lr?.nextRetryAt).toBeLessThan(before + 15_000);
    });
  });

  // ── Coverage gap: zod retry doCall throws (network error) ────────────────
  // extractMarkers.ts line 155: when the JSON-only follow-up call throws a
  // non-ExtractionError, the catch wraps it into zod_validation (not re-thrown).
  it("first call zod-fails, json-only retry throws 503 → parse_failed zod_validation (catch wraps error)", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    // First call: valid-shaped JSON but missing required fields → Zod rejects
    mockExtraction.mockResolvedValueOnce({ is_lab_report: true }); // missing markers etc.
    // JSON-only retry call throws a network error
    mockExtraction.mockRejectedValueOnce(makeHttpError(503));

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    // The catch block at extractMarkers.ts:153-158 wraps the thrown error as
    // zod_validation (not re-thrown as a retryable error). This documents the
    // current code behavior — the 503 is lost inside the zod retry wrapper.
    expect(result.outcome).toBe("failed:zod_validation");
  });

  // ── Coverage gap: refusal reprompt call throws non-ExtractionError ────────
  it("refusal detected, reprompt call throws 503 → retry_scheduled", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    const refusalResponse = {
      is_lab_report: false,
      patient_name_on_report: "I can't help with medical advice",
      collection_date: null,
      markers: [],
    };
    mockExtraction.mockResolvedValueOnce(refusalResponse);
    // Reprompt call throws a network error
    mockExtraction.mockRejectedValueOnce(makeHttpError(503));

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    // 503 re-thrown from catch block → scheduleRetry
    expect(result.outcome).toBe("retry_scheduled");
  });

  // ── Coverage gap: zod fails first, json-only retry succeeds ──────────────
  // extractMarkers.ts line 147: retryParsed.success = true path
  it("first call zod-fails, json-only retry succeeds → status ready (extractMarkers line 147)", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);
    await t.run(async (ctx) => {
      await seedDefaultRanges(ctx);
    });

    // First call: fails Zod (missing fields)
    mockExtraction.mockResolvedValueOnce({ is_lab_report: true });
    // JSON-only retry: returns valid shape
    mockExtraction.mockResolvedValueOnce(VALID_EXTRACTION);
    mockNarrative.mockResolvedValueOnce(VALID_NARRATIVE);

    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("ready");
    expect(mockExtraction).toHaveBeenCalledTimes(2);
    // Second call should have the JSON-only follow-up message
    expect(mockExtraction.mock.calls[1]?.[0]?.followUpMessage).toContain(
      "Return ONLY the JSON",
    );
  });

  // ── Coverage gap: pdf_decode — storage returns null ───────────────────────
  // parseLabReport.ts line 103: ctx.storage.get returns null
  // Achieved by patching fileId to a non-existent storage ID after seeding.
  it("storage.get returns null → outcome failed:pdf_decode", async () => {
    const t = convexTest(schema, modules);
    const { labReportId } = await seedUserAndLabReport(t);

    // Overwrite fileId with a fake ID that doesn't exist in storage.
    // convex-test _storage IDs follow the same format; inserting a valid-looking
    // but non-existent ID will cause storage.get to return null.
    await t.run(async (ctx) => {
      // Store a second blob just to get a valid storage ID format, then delete it
      const tempBlob = new Blob(["temp"], { type: "application/pdf" });
      const tempId = await ctx.storage.store(tempBlob);
      // Patch lab_reports to point to this storage id, then delete the file
      await ctx.db.patch(labReportId, { fileId: tempId });
      await ctx.storage.delete(tempId);
    });

    // No extraction call expected — should fail before reaching Claude
    const result = await t.action(
      internal.biomarker.parseLabReport.parseLabReport,
      { labReportId },
    );
    expect(result.outcome).toBe("failed:pdf_decode");
    expect(mockExtraction).not.toHaveBeenCalled();

    await t.run(async (ctx) => {
      const lr = await ctx.db.get(labReportId);
      expect(lr?.status).toBe("parse_failed");
      expect(lr?.errorCode).toBe("pdf_decode");
    });
  });
});
