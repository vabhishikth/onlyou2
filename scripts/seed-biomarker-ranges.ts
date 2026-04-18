// scripts/seed-biomarker-ranges.ts
//
// Reads packages/core/seeds/biomarker-ranges.json, validates each row
// (shape + threshold ordering + required fields), then invokes
// convex/biomarker/internal/seedRanges:upsertRanges via the Convex CLI.
//
// Guards:
//   - Threshold ordering invariant (fails on any violation).
//   - `pregnancySensitive` MUST be an explicit boolean on every row.
//   - `source` MUST be a non-empty string.
//   - `clinicalReviewer` of "" or "DRAFT — pending review" is rejected unless
//     ALLOW_UNREVIEWED_RANGES=1.
//   - Prod deployment ALWAYS blocks unreviewed rows regardless of env flag.
//
// Usage:
//   pnpm seed:biomarker-ranges
//   ALLOW_UNREVIEWED_RANGES=1 pnpm seed:biomarker-ranges   (dev only)
//
// NOTE: upsertRanges is an internalMutation; it cannot be called via
// ConvexHttpClient from outside Convex. We invoke it through `npx convex run`
// (which uses admin access and can reach internal functions).

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

const rowSchema = z
  .object({
    canonicalId: z.string().min(1),
    displayName: z.string().min(1),
    aliases: z.array(z.string()),
    category: z.string().min(1),
    canonicalUnit: z.string().min(1),
    ageMin: z.number().int().min(0),
    ageMax: z.number().int().min(0),
    sex: z.enum(["male", "female", "any"]),
    pregnancySensitive: z.boolean(),
    optimalMin: z.number(),
    optimalMax: z.number(),
    subOptimalBelowMin: z.number().optional(),
    subOptimalAboveMax: z.number().optional(),
    actionBelow: z.number().optional(),
    actionAbove: z.number().optional(),
    explainer: z.string().min(1),
    source: z.string().min(1),
    clinicalReviewer: z.string().optional(),
    reviewedAt: z.number().nullable().optional(),
    isActive: z.boolean(),
  })
  .superRefine((row, ctx) => {
    if (row.ageMin >= row.ageMax) {
      ctx.addIssue({
        code: "custom",
        message: `ageMin (${row.ageMin}) must be < ageMax (${row.ageMax})`,
      });
    }
    if (row.optimalMin > row.optimalMax) {
      ctx.addIssue({
        code: "custom",
        message: `optimalMin (${row.optimalMin}) must be <= optimalMax (${row.optimalMax})`,
      });
    }
    if (
      row.subOptimalBelowMin !== undefined &&
      row.subOptimalBelowMin >= row.optimalMin
    ) {
      ctx.addIssue({
        code: "custom",
        message: `subOptimalBelowMin (${row.subOptimalBelowMin}) must be < optimalMin (${row.optimalMin})`,
      });
    }
    if (
      row.subOptimalAboveMax !== undefined &&
      row.subOptimalAboveMax <= row.optimalMax
    ) {
      ctx.addIssue({
        code: "custom",
        message: `subOptimalAboveMax (${row.subOptimalAboveMax}) must be > optimalMax (${row.optimalMax})`,
      });
    }
    if (row.actionBelow !== undefined && row.subOptimalBelowMin !== undefined) {
      if (row.actionBelow > row.subOptimalBelowMin) {
        ctx.addIssue({
          code: "custom",
          message: `actionBelow (${row.actionBelow}) must be <= subOptimalBelowMin (${row.subOptimalBelowMin})`,
        });
      }
    }
    if (row.actionAbove !== undefined && row.subOptimalAboveMax !== undefined) {
      if (row.actionAbove < row.subOptimalAboveMax) {
        ctx.addIssue({
          code: "custom",
          message: `actionAbove (${row.actionAbove}) must be >= subOptimalAboveMax (${row.subOptimalAboveMax})`,
        });
      }
    }
  });

type ValidatedRow = z.infer<typeof rowSchema>;

// Row type compatible with the Convex mutation (reviewedAt is optional number, not null)
type ConvexRow = Omit<ValidatedRow, "reviewedAt"> & {
  reviewedAt?: number;
};

const PROD_PATTERNS = [/^prod$/i, /prod$/i, /^production$/i];

function isUnreviewed(row: ValidatedRow): boolean {
  const r = row.clinicalReviewer;
  return !r || r === "" || r === "DRAFT — pending review";
}

function toConvexRow(row: ValidatedRow): ConvexRow {
  const { reviewedAt, ...rest } = row;
  // Convex v.optional(v.number()) does not accept null — strip null values
  if (reviewedAt == null) {
    return rest;
  }
  return { ...rest, reviewedAt };
}

async function main() {
  const seedPath = resolve(
    process.cwd(),
    "packages/core/seeds/biomarker-ranges.json",
  );
  const raw = readFileSync(seedPath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("seed file must be a top-level JSON array");
  }

  console.log(`\nValidating ${parsed.length} rows from ${seedPath}...`);

  const rows: ValidatedRow[] = parsed.map((row: unknown, i: number) => {
    const result = rowSchema.safeParse(row);
    if (!result.success) {
      const rowAny = row as Record<string, unknown>;
      console.error(
        `Row ${i} (${rowAny["canonicalId"]}/${rowAny["sex"]}) failed validation:`,
      );
      for (const issue of result.error.issues) {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      }
      process.exit(1);
      throw new Error("unreachable"); // satisfies never for the map callback
    }
    return result.data;
  });

  console.log(`✓ All ${rows.length} rows passed schema validation.`);

  const deployment = process.env.CONVEX_DEPLOYMENT ?? "";
  const isProd = PROD_PATTERNS.some((p) => p.test(deployment));
  const allowUnreviewed = process.env.ALLOW_UNREVIEWED_RANGES === "1";

  const unreviewed = rows.filter(isUnreviewed);
  if (unreviewed.length > 0) {
    if (isProd) {
      console.error(
        `\n⛔ PROD DEPLOYMENT BLOCKED: ${unreviewed.length} rows are unreviewed.`,
      );
      console.error(
        "   Every row in biomarker-ranges.json must have a real `clinicalReviewer`",
      );
      console.error(
        "   set by a named clinical advisor before deploying to production.",
      );
      process.exit(1);
    }
    if (!allowUnreviewed) {
      console.error(
        `\n⛔ ${unreviewed.length} unreviewed rows. Re-run with ALLOW_UNREVIEWED_RANGES=1 (dev only).`,
      );
      process.exit(1);
    }
    console.warn(
      `\n⚠  Loading ${unreviewed.length} unreviewed DRAFT rows (dev override).`,
    );
  }

  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) {
    throw new Error(
      "CONVEX_URL env var is required (read from .env.local or Convex dashboard)",
    );
  }

  console.log(
    `\nConnecting to Convex deployment: ${deployment || "(unknown)"}`,
  );
  console.log(`URL: ${convexUrl}`);

  const convexRows = rows.map(toConvexRow);
  const argsJson = JSON.stringify({ rows: convexRows });

  // upsertRanges is an internalMutation — must be invoked via `convex run`
  // (which has admin access) rather than ConvexHttpClient (which only reaches
  // public mutations).
  //
  // We invoke it as: node node_modules/convex/dist/cli.bundle.cjs run ...
  // This avoids two Windows pitfalls:
  //   1. spawnSync("npx", ...) — npx not in PATH inside tsx
  //   2. execSync with shell:true — CMD has an 8191-char command-line limit,
  //      and the 45-row JSON payload is ~26 KB
  const convexCli = resolve(
    process.cwd(),
    "node_modules/convex/dist/cli.bundle.cjs",
  );
  const proc = spawnSync(
    process.execPath,
    [
      convexCli,
      "run",
      "biomarker/internal/seedRanges:upsertRanges",
      argsJson,
      "--no-push",
    ],
    {
      encoding: "utf8",
      env: { ...process.env, CONVEX_URL: convexUrl },
    },
  );

  if (proc.error) throw proc.error;
  if (proc.status !== 0) {
    if (proc.stderr) process.stderr.write(proc.stderr);
    throw new Error(`convex run exited with status ${proc.status ?? "null"}`);
  }
  if (proc.stderr) process.stderr.write(proc.stderr);

  // `convex run` prints the return value as JSON on stdout
  const result = JSON.parse((proc.stdout as string).trim()) as {
    inserted: number;
    updated: number;
    total: number;
  };

  console.log(
    `\n✓ seeded: inserted=${result.inserted} updated=${result.updated} total=${result.total}`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
