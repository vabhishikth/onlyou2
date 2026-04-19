// scripts/export-ranges-for-review.ts
//
// Produces a doctor-friendly CSV + cover letter for clinical sign-off of the
// 45 reference ranges in packages/core/seeds/biomarker-ranges.json.
//
// Run: pnpm tsx scripts/export-ranges-for-review.ts
//
// Outputs (overwrites each run):
//   docs/clinical-review/biomarker-ranges-for-review.csv
//   docs/clinical-review/README-for-reviewer.md
//
// The CSV has no technical fields (canonicalId etc). Instead it has
// three blank columns for the doctor to fill in:
//   - Approve as-is? (Y/N)
//   - Corrected values (if any)
//   - Notes
//
// The doctor can either:
//   A. Upload CSV to Google Sheets (File → Import → Upload), fill in the
//      three columns, and send back.
//   B. Paste/import into a Notion database (CSV import) and do the same.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Row = {
  canonicalId: string;
  displayName: string;
  aliases: string[];
  category: string;
  canonicalUnit: string;
  ageMin: number;
  ageMax: number;
  sex: "any" | "male" | "female";
  pregnancySensitive: boolean;
  optimalMin: number | null;
  optimalMax: number | null;
  subOptimalBelowMin: number | null;
  subOptimalAboveMax: number | null;
  actionBelow: number | null;
  actionAbove: number | null;
  explainer: string;
  source: string;
  clinicalReviewer: string;
  reviewedAt: string | null;
  isActive: boolean;
};

const ROOT = join(__dirname, "..");
const SEED_PATH = join(ROOT, "packages/core/seeds/biomarker-ranges.json");
const OUT_DIR = join(ROOT, "docs/clinical-review");
const CSV_PATH = join(OUT_DIR, "biomarker-ranges-for-review.csv");
const README_PATH = join(OUT_DIR, "README-for-reviewer.md");

function appliesTo(r: Row): string {
  const parts: string[] = [];
  if (r.sex === "any") parts.push("Adults (any sex)");
  else parts.push(r.sex === "male" ? "Adult men" : "Adult women");
  if (r.ageMin !== 18 || r.ageMax !== 120) {
    parts.push(`age ${r.ageMin}–${r.ageMax}`);
  }
  // Pregnancy caveat only applies to rows that could be used on a pregnant
  // patient (female or any). Male rows are never applied to pregnant patients
  // by the classifier, so the flag is noise on them.
  if (r.pregnancySensitive && r.sex !== "male") {
    parts.push("(pregnancy-sensitive)");
  }
  return parts.join(", ");
}

function csvCell(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  const str = String(s);
  // RFC 4180: wrap in quotes and double any internal quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}

function main() {
  const raw = readFileSync(SEED_PATH, "utf8");
  const rows = JSON.parse(raw) as Row[];

  mkdirSync(OUT_DIR, { recursive: true });

  // ---- CSV ----
  const header = [
    "#",
    "Biomarker",
    "Category",
    "Applies to",
    "Unit",
    "Optimal range",
    "Sub-optimal (below)",
    "Sub-optimal (above)",
    "Action required (below)",
    "Action required (above)",
    "Our explainer (patient-facing)",
    "Our source",
    "Approve as-is? (Y/N)",
    "Corrected values (if any)",
    "Notes",
  ];

  const lines: string[] = [toCsvRow(header)];

  rows.forEach((r, i) => {
    const optimal =
      r.optimalMin !== null && r.optimalMax !== null
        ? `${r.optimalMin}–${r.optimalMax}`
        : "qualitative";
    const subBelow =
      r.subOptimalBelowMin !== null ? `< ${r.subOptimalBelowMin}` : "—";
    const subAbove =
      r.subOptimalAboveMax !== null ? `> ${r.subOptimalAboveMax}` : "—";
    const actBelow = r.actionBelow !== null ? `< ${r.actionBelow}` : "—";
    const actAbove = r.actionAbove !== null ? `> ${r.actionAbove}` : "—";

    lines.push(
      toCsvRow([
        i + 1,
        r.displayName,
        r.category,
        appliesTo(r),
        r.canonicalUnit,
        optimal,
        subBelow,
        subAbove,
        actBelow,
        actAbove,
        r.explainer,
        r.source,
        "", // Approve
        "", // Corrected
        "", // Notes
      ]),
    );
  });

  writeFileSync(CSV_PATH, lines.join("\n") + "\n", "utf8");

  // ---- Cover letter ----
  const cats = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {}),
  );

  const readme = `# Reference range review — ONLYOU biomarker module

**What we need from you:** sign-off (or corrections) on the ${rows.length} reference ranges the ONLYOU app uses to classify patient lab results as **optimal / sub-optimal / action required**.

**Your time commitment:** ~2–4 hours, at your pace. No meetings required.

---

## Context

ONLYOU is an India-first telehealth platform for stigmatized chronic conditions. When a patient uploads a lab report PDF, we extract each biomarker (TSH, Vitamin D, HbA1c, etc.) and classify the value against a reference range. The classification drives:

- a coloured status badge the patient sees in the app (🟢 optimal / 🟡 sub-optimal / 🔴 action required),
- a plain-English explainer shown alongside the number,
- whether the value is flagged for the doctor in the next consultation.

**Wrong thresholds = wrong advice + potential harm.** Before any of this reaches real patients, a licensed clinician needs to vet each range.

---

## What's in the CSV

${rows.length} rows across ${cats.length} categories:

${cats.map(([c, n]) => `- **${c}** — ${n} rows`).join("\n")}

${rows.filter((r) => r.sex !== "any").length} rows are sex-specific (separate male/female rows for the same marker). ${rows.filter((r) => r.pregnancySensitive).length} rows are marked pregnancy-sensitive and should not be applied to pregnant patients (the app auto-skips classification for those).

## Columns you fill in

Each row has three empty columns at the right:

1. **Approve as-is? (Y/N)** — Y if our numbers are fine for the Indian adult population. N if any number needs to change.
2. **Corrected values (if any)** — e.g. "Optimal 30–100 → 25–80; sub-optimal below 25; action below 20."
3. **Notes** — anything you want us to know. Population caveats ("only for non-diabetic adults"), source you prefer over ours, edge cases.

## How to open the CSV

- **Google Sheets:** File → Import → Upload → the CSV → "Replace spreadsheet" → Import.
- **Excel:** just open it.
- **Notion:** create a new database → "..." → Merge with CSV.

## What happens after you send it back

1. We update each approved row's \`clinicalReviewer\` field to your name and stamp \`reviewedAt\` with the date.
2. Rows you corrected get the new numbers applied before the stamp.
3. Only signed-off rows get loaded into the production database. Unreviewed rows stay in dev.

## Context you might want

- Patient population: Indian adults aged 18+, both sexes.
- Stigmatized chronic conditions in scope: hair loss, erectile dysfunction, premature ejaculation, weight management, PCOS.
- Most patients will be bringing lab reports from Dr Lal, Metropolis, Thyrocare, SRL, or Apollo Diagnostics.
- Our sources (listed in column "Our source") are international — we specifically want Indian-context corrections where relevant (e.g. Vitamin D and B12 references differ for South Asian populations).

## Questions?

Contact: ${process.env.REVIEWER_CONTACT ?? "v.abhishikth@gmail.com"}

---

*File generated: ${new Date().toISOString().slice(0, 10)}. Regenerated from \`packages/core/seeds/biomarker-ranges.json\` — if you see a different row count, the source of truth has drifted; re-run \`pnpm tsx scripts/export-ranges-for-review.ts\`.*
`;

  writeFileSync(README_PATH, readme, "utf8");

  console.warn(`✅ Wrote ${rows.length} rows to:`);

  console.warn(`   ${CSV_PATH}`);

  console.warn(`   ${README_PATH}`);
}

main();
