// convex/biomarker/internal/matchPatientName.ts
//
// Fuzzy match of extracted patient name against the user's stored name.
// Returns one of "match" | "mismatch" | "unknown".
//
// Intentionally conservative: returns "unknown" rather than guessing when
// inputs are missing. The UI (2.5D) surfaces mismatch with a "this might
// not be your report" banner; false positives there erode trust, so we
// prefer false-negative "unknown" flags.

const HONORIFICS = new Set([
  "mr",
  "mr.",
  "ms",
  "ms.",
  "mrs",
  "mrs.",
  "miss",
  "dr",
  "dr.",
  "shri",
  "smt",
]);

export function matchPatientName(
  extracted: string | null | undefined,
  stored: string | null | undefined,
): "match" | "mismatch" | "unknown" {
  if (!extracted?.trim() || !stored?.trim()) return "unknown";

  const ae = tokenize(extracted);
  const as = tokenize(stored);
  if (ae.length === 0 || as.length === 0) return "unknown";

  // Direct token-set match (handles reversed order)
  const setA = new Set(ae);
  const setB = new Set(as);
  const intersection = [...setA].filter((t) => setB.has(t));
  if (intersection.length >= Math.min(setA.size, setB.size)) return "match";

  // Initials match (e.g. ["a", "sharma"] vs ["anand", "sharma"])
  if (initialsMatch(ae, as) || initialsMatch(as, ae)) return "match";

  return "mismatch";
}

function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[.,]/g, ""))
    .filter((t) => t.length > 0 && !HONORIFICS.has(t));
}

function initialsMatch(shortForm: string[], longForm: string[]): boolean {
  if (shortForm.length !== longForm.length) return false;
  return shortForm.every((short, idx) => {
    const long = longForm[idx];
    if (!long) return false;
    if (short === long) return true;
    if (short.length === 1 && long.startsWith(short)) return true;
    return false;
  });
}
