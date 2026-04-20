// convex/lib/telemetry.ts
//
// Structured log helpers for the biomarker parse pipeline.
// Rules:
//   - Never log PDF content, marker values, patient names, DOBs, phones.
//   - Always log labReportId + hashedUserId (SHA-256 prefix) + event + timings.
//   - ERROR-level logs with `alert: "p1"` tag surface on grep; hosted pager
//     integration is Phase 8 polish.

// Pure-JS hash — avoids node:crypto so this file runs in the Convex runtime.
// Uses a salted FNV-1a (64-bit via two 32-bit halves) expanded to 12 hex chars.
const USER_HASH_SALT = "onlyou-biomarker-telemetry-v1";

export function hashUserId(userId: string): string {
  const input = USER_HASH_SALT + "\0" + userId;
  // FNV-1a constants (32-bit)
  const FNV_PRIME = 0x01000193;
  let h0 = 0x811c9dc5; // FNV offset basis
  let h1 = 0x84222325; // second independent hash for 64-bit width

  for (let i = 0; i < input.length; i++) {
    const byte = input.charCodeAt(i) & 0xff;
    h0 ^= byte;
    h0 = Math.imul(h0, FNV_PRIME) >>> 0;
    h1 ^= byte ^ (i & 0xff);
    h1 = Math.imul(h1, FNV_PRIME) >>> 0;
  }

  const hex0 = h0.toString(16).padStart(8, "0");
  const hex1 = h1.toString(16).padStart(8, "0");
  return (hex0 + hex1).slice(0, 12);
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
  | "classify_row"
  | "intake_uploaded"
  | "intake_retried";

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
