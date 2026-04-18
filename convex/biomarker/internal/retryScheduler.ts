// convex/biomarker/internal/retryScheduler.ts
//
// Per-class retry backoff. Pure function; returns nextRetryAt or terminal.

export const WALL_CLOCK_CAP_MS = 30 * 60 * 1000; // 30 minutes

export type RetryClass =
  | { kind: "network_or_5xx" }
  | { kind: "rate_limit"; retryAfterSeconds: number | null };

export interface RetryInput {
  cls: RetryClass;
  attempt: number; // 1-based
  firstAttemptAt: number; // unix-ms
  now: number; // unix-ms
}

export interface RetryResult {
  terminal: boolean;
  nextRetryAt: number;
  errorCode?: "max_retries_exceeded";
}

const NETWORK_5XX_SCHEDULE_MS = [30_000, 120_000, 300_000, 900_000]; // 30s, 2m, 5m, 15m

export function computeNextRetry(input: RetryInput): RetryResult {
  const { cls, attempt, firstAttemptAt, now } = input;

  // Wall-clock cap applies to both classes
  if (now - firstAttemptAt > WALL_CLOCK_CAP_MS) {
    return {
      terminal: true,
      nextRetryAt: 0,
      errorCode: "max_retries_exceeded",
    };
  }

  if (cls.kind === "network_or_5xx") {
    // 1-indexed attempt → 0-indexed schedule slot
    const slot = attempt - 1;
    if (slot >= NETWORK_5XX_SCHEDULE_MS.length) {
      return {
        terminal: true,
        nextRetryAt: 0,
        errorCode: "max_retries_exceeded",
      };
    }
    return {
      terminal: false,
      nextRetryAt: now + NETWORK_5XX_SCHEDULE_MS[slot]!,
    };
  }

  // rate_limit: use retry-after header; default 10s
  const delayMs = (cls.retryAfterSeconds ?? 10) * 1000;
  return { terminal: false, nextRetryAt: now + delayMs };
}
