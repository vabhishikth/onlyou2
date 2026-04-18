import { describe, it, expect, vi } from "vitest";

import { hashUserId, logParseEvent } from "../../lib/telemetry";

describe("telemetry", () => {
  describe("hashUserId", () => {
    it("returns stable 12-char hex prefix for the same input", () => {
      const a = hashUserId("user_123");
      const b = hashUserId("user_123");
      expect(a).toBe(b);
      expect(a).toMatch(/^[0-9a-f]{12}$/);
    });

    it("returns different hashes for different inputs", () => {
      expect(hashUserId("user_1")).not.toBe(hashUserId("user_2"));
    });
  });

  describe("logParseEvent", () => {
    it("emits a structured INFO log with required fields", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      logParseEvent({
        level: "info",
        labReportId: "lab_abc",
        userId: "user_123",
        event: "parse_started",
        modelId: "claude-sonnet-4-5",
        durationMs: 123,
      });
      expect(spy).toHaveBeenCalledOnce();
      const logged = JSON.parse(spy.mock.calls[0][0] as string);
      expect(logged.level).toBe("info");
      expect(logged.event).toBe("parse_started");
      expect(logged.labReportId).toBe("lab_abc");
      expect(logged.hashedUserId).toMatch(/^[0-9a-f]{12}$/);
      expect(logged).not.toHaveProperty("userId");
      spy.mockRestore();
    });

    it("emits an ERROR log with alert:p1 tag for 400 errors", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logParseEvent({
        level: "error",
        labReportId: "lab_abc",
        userId: "user_123",
        event: "parse_failed",
        errorCode: "api_bad_request",
        alert: "p1",
      });
      expect(spy).toHaveBeenCalledOnce();
      const logged = JSON.parse(spy.mock.calls[0][0] as string);
      expect(logged.alert).toBe("p1");
      expect(logged.errorCode).toBe("api_bad_request");
      spy.mockRestore();
    });

    it("never logs marker values or PDF content", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      logParseEvent({
        level: "info",
        labReportId: "lab_abc",
        userId: "user_123",
        event: "parse_complete",
        markerCount: 12,
      });
      const logged = JSON.parse(spy.mock.calls[0][0] as string);
      expect(logged.markerCount).toBe(12);
      expect(logged).not.toHaveProperty("markers");
      expect(logged).not.toHaveProperty("pdfContent");
      expect(logged).not.toHaveProperty("extractedValues");
      spy.mockRestore();
    });
  });
});
