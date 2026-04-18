// convex/lib/telemetry.ts
//
// Structured log helpers for the biomarker parse pipeline.
// Rules:
//   - Never log PDF content, marker values, patient names, DOBs, phones.
//   - Always log labReportId + hashedUserId (SHA-256 prefix) + event + timings.
//   - ERROR-level logs with `alert: "p1"` tag surface on grep; hosted pager
//     integration is Phase 8 polish.

import { createHash } from "node:crypto";

const USER_HASH_SALT = "onlyou-biomarker-telemetry-v1";

export function hashUserId(userId: string): string {
  return createHash("sha256")
    .update(USER_HASH_SALT)
    .update(userId)
    .digest("hex")
    .slice(0, 12);
}

export type ParseLogLevel = "info" | "warn" | "error";

export type ParseEvent =
  | "parse_started"
  | "parse_complete"
  | "parse_retry_scheduled"
  | "parse_failed"
  | "extract_succeeded"
  | "extract_retried_json"
  | "extract_retried_max_tokens"
  | "extract_retried_refusal"
  | "classify_row";

export interface ParseLogFields {
  level: ParseLogLevel;
  labReportId: string;
  userId: string;
  event: ParseEvent;
  modelId?: string;
  retryCount?: number;
  durationMs?: number;
  markerCount?: number;
  errorCode?: string;
  contentHashPrefix?: string; // first 8 chars only
  alert?: "p1";
}

export function logParseEvent(fields: ParseLogFields): void {
  const { userId, ...rest } = fields;
  const payload = {
    ...rest,
    hashedUserId: hashUserId(userId),
    ts: Date.now(),
  };
  const serialized = JSON.stringify(payload);
  if (fields.level === "error") {
    console.error(serialized);
  } else if (fields.level === "warn") {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}
