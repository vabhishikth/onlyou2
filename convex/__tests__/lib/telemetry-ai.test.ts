import { afterEach, describe, expect, it, vi } from "vitest";

import { logAiAssessmentEvent } from "../../lib/telemetry";

describe("logAiAssessmentEvent", () => {
  const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
  const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => {
    consoleLog.mockClear();
    consoleWarn.mockClear();
    consoleError.mockClear();
  });

  it("level=info routes to console.log with serialized JSON", () => {
    logAiAssessmentEvent({
      level: "info",
      event: "ai_assessment_started",
      consultationId: "c123",
      attempt: 1,
    });
    expect(consoleLog).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(consoleLog.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      level: "info",
      event: "ai_assessment_started",
      consultationId: "c123",
      attempt: 1,
    });
    expect(payload.ts).toBeTypeOf("number");
  });

  it("level=warn routes to console.warn (terminal_skip case)", () => {
    logAiAssessmentEvent({
      level: "warn",
      event: "ai_assessment_terminal_skip",
      consultationId: "c123",
      totalAttempts: 3,
    });
    expect(consoleWarn).toHaveBeenCalledTimes(1);
  });

  it("level=error routes to console.error (failure case)", () => {
    logAiAssessmentEvent({
      level: "error",
      event: "ai_assessment_failed",
      consultationId: "c123",
      attempt: 2,
      failureClass: "rate_limit",
      errorMessage: "429 Too Many Requests",
    });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it("hashes userId when present", () => {
    logAiAssessmentEvent({
      level: "info",
      event: "ai_assessment_succeeded",
      consultationId: "c123",
      userId: "user-abc",
      attempt: 1,
      durationMs: 12_400,
    });
    const payload = JSON.parse(consoleLog.mock.calls[0][0] as string);
    expect(payload.userId).toBeUndefined();
    expect(payload.hashedUserId).toBeTypeOf("string");
    expect(payload.hashedUserId).toHaveLength(12);
  });

  it("strips PHI fields if accidentally passed", () => {
    logAiAssessmentEvent({
      level: "info",
      event: "ai_assessment_succeeded",
      consultationId: "c123",
      // @ts-expect-error — narrative/patientName are not on AiAssessmentLogFields; tests the runtime PHI guard
      narrative: "should be dropped",
      patientName: "should be dropped",
    });
    const payload = JSON.parse(consoleLog.mock.calls[0][0] as string);
    expect(payload).not.toHaveProperty("narrative");
    expect(payload).not.toHaveProperty("patientName");
  });
});
