/**
 * Compute a person's completed-years age from an ISO date string.
 *
 * @param isoDate Birth date in `YYYY-MM-DD` form (UTC-interpreted).
 * @param now     Reference "current" time in ms-since-epoch. Defaults to `Date.now()`.
 * @returns       Whole completed years. Returns `NaN` when `isoDate` is malformed
 *                or not a real calendar date.
 *
 * Behaviour notes:
 * - Uses UTC components so server (Convex) and client (RN) agree regardless of
 *   the device timezone.
 * - A Feb 29 birthday reaches its "next" age on Feb 28 of common (non-leap)
 *   years, and on Feb 29 of leap years — matching Indian legal convention.
 * - Exactly-18 on the reference day counts as 18. The day before the 18th
 *   birthday counts as 17.
 */
export function computeAgeYears(
  isoDate: string,
  now: number = Date.now(),
): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return Number.NaN;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Reject impossible calendar dates (e.g. 2025-02-30, 2025-13-01).
  const asDate = new Date(Date.UTC(year, month - 1, day));
  if (
    asDate.getUTCFullYear() !== year ||
    asDate.getUTCMonth() !== month - 1 ||
    asDate.getUTCDate() !== day
  ) {
    return Number.NaN;
  }

  const today = new Date(now);
  const ty = today.getUTCFullYear();
  const tm = today.getUTCMonth() + 1; // 1..12
  const td = today.getUTCDate();

  let age = ty - year;
  // Subtract one if the birthday has not yet occurred this year.
  if (tm < month || (tm === month && td < day)) {
    age -= 1;
  }
  return age;
}

/** Minimum age required to use ONLYOU. */
export const MIN_AGE_YEARS = 18;

/** Convenience wrapper mirroring the 18+ gate used by auth + consultation flows. */
export function isAtLeastMinAge(
  isoDate: string,
  now: number = Date.now(),
): boolean {
  const age = computeAgeYears(isoDate, now);
  return Number.isFinite(age) && age >= MIN_AGE_YEARS;
}
