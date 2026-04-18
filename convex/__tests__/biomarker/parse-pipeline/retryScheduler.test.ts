import { describe, it, expect } from "vitest";

import {
  computeNextRetry,
  WALL_CLOCK_CAP_MS,
  type RetryClass,
} from "../../../biomarker/internal/retryScheduler";

describe("retryScheduler.computeNextRetry", () => {
  const now = 1_700_000_000_000;

  describe("5xx / network class", () => {
    const cls: RetryClass = { kind: "network_or_5xx" };
    it("first retry → +30s", () => {
      const r = computeNextRetry({ cls, attempt: 1, firstAttemptAt: now, now });
      expect(r.nextRetryAt).toBe(now + 30_000);
      expect(r.terminal).toBe(false);
    });
    it("second retry → +2min", () => {
      const r = computeNextRetry({ cls, attempt: 2, firstAttemptAt: now, now });
      expect(r.nextRetryAt).toBe(now + 120_000);
    });
    it("third retry → +5min", () => {
      const r = computeNextRetry({ cls, attempt: 3, firstAttemptAt: now, now });
      expect(r.nextRetryAt).toBe(now + 300_000);
    });
    it("fourth retry → +15min", () => {
      const r = computeNextRetry({ cls, attempt: 4, firstAttemptAt: now, now });
      expect(r.nextRetryAt).toBe(now + 900_000);
    });
    it("fifth retry → terminal (4-attempt cap)", () => {
      const r = computeNextRetry({ cls, attempt: 5, firstAttemptAt: now, now });
      expect(r.terminal).toBe(true);
      expect(r.errorCode).toBe("max_retries_exceeded");
    });
  });

  describe("429 class — honors retry-after", () => {
    it("uses retryAfterSeconds header if present", () => {
      const r = computeNextRetry({
        cls: { kind: "rate_limit", retryAfterSeconds: 45 },
        attempt: 1,
        firstAttemptAt: now,
        now,
      });
      expect(r.nextRetryAt).toBe(now + 45_000);
      expect(r.terminal).toBe(false);
    });
    it("defaults to 10s if retryAfterSeconds missing", () => {
      const r = computeNextRetry({
        cls: { kind: "rate_limit", retryAfterSeconds: null },
        attempt: 1,
        firstAttemptAt: now,
        now,
      });
      expect(r.nextRetryAt).toBe(now + 10_000);
    });
    it("terminal when cumulative wall-clock exceeds 30min", () => {
      const r = computeNextRetry({
        cls: { kind: "rate_limit", retryAfterSeconds: 60 },
        attempt: 50,
        firstAttemptAt: now - (WALL_CLOCK_CAP_MS + 1_000),
        now,
      });
      expect(r.terminal).toBe(true);
    });
  });

  describe("wall-clock cap", () => {
    it("terminal when firstAttemptAt was > 30min ago even on retryable class", () => {
      const r = computeNextRetry({
        cls: { kind: "network_or_5xx" },
        attempt: 2,
        firstAttemptAt: now - (WALL_CLOCK_CAP_MS + 1_000),
        now,
      });
      expect(r.terminal).toBe(true);
      expect(r.errorCode).toBe("max_retries_exceeded");
    });
  });
});
