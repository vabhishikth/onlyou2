// convex/biomarker/lib/normalizeCollectionDate.ts
//
// Normalize a raw collection_date string (from Claude extraction or lab_reports)
// to ISO-8601 date-only form (YYYY-MM-DD).
//
// Why: downstream trend projection sorts collectionDate by localeCompare,
// which is chronologically correct ONLY for lexicographically-sortable
// ISO-8601 strings. A malformed date slipping through would silently corrupt
// trend order. We normalize once at ingest (not on read).
//
// Rules:
//   - If `raw` is already YYYY-MM-DD, return unchanged.
//   - Else if Date.parse recognizes it, re-emit as YYYY-MM-DD (UTC date-only).
//   - Else return the raw string unchanged. Callers should log a structured
//     `collection_date_malformed` event upstream so the value is still
//     recoverable (we don't want to drop the marker entirely).
//   - undefined in → undefined out.
//
// NOTE: Some formats (e.g. "DD-MM-YYYY") are ambiguous under Date.parse, which
// treats "10-04-2026" as Oct 4 on some engines. Tests pin only deterministic
// formats (YYYY-MM-DD passthrough, DD/MM/YYYY, garbage, undefined).

export function normalizeCollectionDate(
  raw: string | undefined,
): string | undefined {
  if (raw === undefined) return undefined;
  // Already ISO YYYY-MM-DD — return as-is.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // Handle DD/MM/YYYY and DD-MM-YYYY explicitly (Indian-format lab reports).
  // Date.parse on V8 treats these as MM/DD/YYYY, which would silently swap
  // day and month. We interpret day-first for these two forms.
  const dmy = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(raw);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
    const iso = `${yyyy}-${mm}-${dd}`;
    // Sanity-check via Date.parse; if the assembled ISO fails, fall through.
    if (!Number.isNaN(Date.parse(iso))) return iso;
  }

  const t = Date.parse(raw);
  if (Number.isNaN(t)) return raw; // let upstream log collection_date_malformed
  return new Date(t).toISOString().slice(0, 10);
}
