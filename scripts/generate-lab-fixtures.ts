// scripts/generate-lab-fixtures.ts
//
// Generate the 8 synthetic lab-report fixture PDFs from HTML templates.
// Uses puppeteer (headless Chrome) for rendering. Deterministic output:
// re-running produces byte-identical PDFs given the same template.
//
// Run: `pnpm tsx scripts/generate-lab-fixtures.ts`

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import puppeteer from "puppeteer";

const TEMPLATES_DIR = join(process.cwd(), "scripts/lab-fixture-templates");
const OUT_DIR = join(
  process.cwd(),
  "convex/__tests__/biomarker/fixtures/lab-reports",
);

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const files = (await readdir(TEMPLATES_DIR))
    .filter((f) => f.endsWith(".html"))
    .sort();

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
  } catch (launchErr) {
    console.error("Failed to launch puppeteer:", launchErr);
    console.error(
      "Try: npx puppeteer browsers install chrome  — then re-run this script.",
    );
    process.exit(1);
  }

  try {
    for (const file of files) {
      const html = await readFile(join(TEMPLATES_DIR, file), "utf8");
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
      });
      const outName = file.replace(/\.html$/, ".pdf");
      await writeFile(join(OUT_DIR, outName), pdf);
      await page.close();
      console.log(`Wrote ${outName} (${pdf.byteLength} bytes)`);
    }
  } finally {
    await browser.close();
  }
  console.log(`\nDone. ${files.length} PDFs written to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
