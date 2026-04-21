import patternsRaw from "../../../packages/core/seeds/panel-code-patterns.json";

interface Pattern {
  pattern: string;
  flags: string;
  description: string;
}

const compiled: RegExp[] = (patternsRaw as Pattern[]).map(
  (p) => new RegExp(p.pattern, p.flags),
);

export function isPanelCode(nameOnReport: string): boolean {
  const trimmed = nameOnReport.trim();
  if (trimmed.length === 0) return false;
  return compiled.some((r) => r.test(trimmed));
}

export const PANEL_CODE_PATTERNS = patternsRaw as ReadonlyArray<Pattern>;
