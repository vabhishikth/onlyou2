// IST (Indian Standard Time) = UTC+5:30. These helpers format calendar
// buckets and compute the next bucket-rollover in IST without pulling a
// TZ library. Convex runs on V8 with limited Intl — we compute directly.

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function toIST(ms: number): Date {
  return new Date(ms + IST_OFFSET_MS);
}

function fromIST(istMs: number): number {
  return istMs - IST_OFFSET_MS;
}

export function istDayBucket(nowMs: number): string {
  const d = toIST(nowMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function istMonthBucket(nowMs: number): string {
  const d = toIST(nowMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function nextMidnightIST(nowMs: number): number {
  const d = toIST(nowMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  // Midnight IST of the NEXT day
  const nextIstMidnight = Date.UTC(y, m, day + 1, 0, 0, 0, 0);
  return fromIST(nextIstMidnight);
}

export function nextFirstOfMonthIST(nowMs: number): number {
  const d = toIST(nowMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  // First of NEXT month at 00:00 IST
  const nextIstMonthStart = Date.UTC(y, m + 1, 1, 0, 0, 0, 0);
  return fromIST(nextIstMonthStart);
}

export const DAILY_UPLOAD_LIMIT = 5;
export const MONTHLY_UPLOAD_LIMIT = 50;
