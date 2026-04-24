// India-only E.164 normaliser. MVP scope is IN mobile numbers; extending to
// other country codes means widening INDIAN_MOBILE_E164 and relaxing the
// strip step. The goal is a single canonical representation so
// users.by_phone and otpAttempts.by_phone never split one human across
// multiple rows.

const INDIAN_MOBILE_E164 = /^\+91[6-9]\d{9}$/;

/**
 * Canonicalise any user-entered Indian mobile to +91XXXXXXXXXX.
 * Throws if the input can't be coerced to a valid IN mobile.
 */
export function normalizePhoneE164(input: string): string {
  if (typeof input !== "string") {
    throw new Error("invalid phone: not a string");
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error("invalid phone: empty");
  }

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  let candidate: string;
  if (hasPlus) {
    if (digits.startsWith("91")) {
      candidate = `+${digits}`;
    } else {
      throw new Error(`invalid phone: non-+91 country code (${input})`);
    }
  } else if (digits.length === 10) {
    candidate = `+91${digits}`;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    candidate = `+91${digits.slice(1)}`;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    candidate = `+${digits}`;
  } else {
    throw new Error(`invalid phone: ambiguous length (${input})`);
  }

  if (!INDIAN_MOBILE_E164.test(candidate)) {
    throw new Error(`invalid phone: not a valid IN mobile (${input})`);
  }
  return candidate;
}

export function isValidE164(input: string): boolean {
  return INDIAN_MOBILE_E164.test(input);
}
