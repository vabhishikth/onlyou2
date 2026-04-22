// Shared normalization used by both the curation queue upsert AND the
// biomarker_values row insert. A queue row and its contributing value
// rows MUST resolve to the same normalizedKey for Phase 5's
// "5-most-recent-extractions" query to be a direct index lookup.

export function normalizeKey(name: string, unit: string | undefined): string {
  const n = name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const u = (unit ?? "none")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9/%_.-]/g, "");
  return `${n}|${u}`;
}
