// scripts/run-manual-e2e.ts
//
// One-shot end-to-end driver for Phase 2.5C Wave 6 Task 32.
// - Uploads a fixture PDF to dev Convex storage
// - Calls admin.simulateLabUpload to kick off the parse pipeline
// - Polls admin.getE2EStatus until the lab_report reaches a terminal state
// - Prints observed state for paste into checkpoint.md
//
// Prod guard: hard-fails on any CONVEX_DEPLOYMENT matching the prod pattern.
//
// `generateUploadUrl` and `getE2EStatus` are `internalMutation`/`internalQuery`
// — not callable from ConvexHttpClient. We shell out to `npx convex run`,
// which authenticates via the admin deploy key baked into the local dev env.
// `simulateLabUpload` stays as a public `action` (gated server-side by
// `assertNotProd()` + `assertPortalEnabled("LAB", ...)`) and is still invoked
// via ConvexHttpClient.
//
// Run: `pnpm e2e:manual` (package.json script uses tsx --env-file=.env.local).

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { isProdDeployment } from "../packages/core/src/deployment/prod-patterns";

const TERMINAL_STATUSES = new Set([
  "ready",
  "parse_failed",
  "rejected",
  "not_a_lab_report",
]);

/**
 * Shells out to `npx convex run <functionRef> <jsonArgs>` and parses the
 * JSON result. Used because internal mutations/queries aren't callable from
 * ConvexHttpClient — the CLI authenticates via the admin deploy key.
 *
 * The CLI pretty-prints objects across multiple lines, so we concatenate
 * from the first JSON-token line through end-of-output, skipping leading
 * npm/cli noise.
 */
function convexRun<T>(functionRef: string, args: unknown): T {
  // Quote the JSON arg so cmd.exe (shell: true on Windows) preserves inner
  // double quotes. On POSIX, spawn without shell — no quoting dance needed.
  const jsonArg = JSON.stringify(args);
  const isWin = process.platform === "win32";
  const argv = isWin
    ? ["convex", "run", functionRef, `"${jsonArg.replace(/"/g, '\\"')}"`]
    : ["convex", "run", functionRef, jsonArg];
  const proc = spawnSync("npx", argv, {
    encoding: "utf8",
    env: { ...process.env },
    shell: isWin,
  });
  if (proc.status !== 0) {
    process.stderr.write(proc.stderr ?? "");
    throw new Error(
      `convex run ${functionRef} exited with status ${proc.status}`,
    );
  }
  const stdout = proc.stdout ?? "";
  const lines = stdout.split(/\r?\n/);
  const startIdx = lines.findIndex((l) =>
    /^\s*(?:[{\[]|"|-?\d|true\b|false\b|null\b)/.test(l),
  );
  if (startIdx === -1) {
    throw new Error(
      `convex run ${functionRef} produced no JSON stdout; stderr: ${proc.stderr ?? ""}`,
    );
  }
  const jsonText = lines.slice(startIdx).join("\n").trim();
  try {
    return JSON.parse(jsonText) as T;
  } catch (err) {
    throw new Error(
      `convex run ${functionRef} stdout not valid JSON: ${jsonText}\ncause: ${String(err)}`,
    );
  }
}

async function main(): Promise<void> {
  const deployment = process.env.CONVEX_DEPLOYMENT ?? "";
  if (isProdDeployment(deployment)) {
    console.error("run-manual-e2e is dev-only; refuse to run against prod");
    process.exit(1);
  }
  const url = process.env.CONVEX_URL;
  if (!url) {
    throw new Error("CONVEX_URL must be set in env (see .env.local)");
  }

  const userId = (process.env.E2E_USER_ID ??
    "j97d9t2x395bb63hncyjsspcss850kzd") as Id<"users">;
  const fixturePath =
    process.env.E2E_FIXTURE ??
    resolve(
      "convex/__tests__/biomarker/fixtures/lab-reports/01-lal-pathlabs-cbc-happy.pdf",
    );

  const bytes = readFileSync(fixturePath);
  console.log(`deployment: ${deployment}`);
  console.log(`convex url: ${url}`);
  console.log(`userId:     ${userId}`);
  console.log(`fixture:    ${fixturePath} (${bytes.length} bytes)`);

  const client = new ConvexHttpClient(url);
  const startMs = Date.now();

  // Step 1: upload URL (internal mutation — shell out to `convex run`)
  console.log("\n[1/4] requesting upload URL (internal mutation)...");
  const uploadUrl = convexRun<string>("admin:generateUploadUrl", {});
  console.log("      got upload URL");

  // Step 2: upload bytes (presigned URL; no auth needed)
  console.log("[2/4] uploading bytes to Convex storage...");
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: bytes,
  });
  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new Error(`upload failed: ${uploadRes.status} ${body}`);
  }
  const { storageId } = (await uploadRes.json()) as { storageId: string };
  console.log(`      uploaded. storageId=${storageId}`);

  // Step 3: kick off parse via simulateLabUpload (still public action)
  console.log("[3/4] calling admin.simulateLabUpload (source=lab_upload)...");
  const sim = (await client.action(api.admin.simulateLabUpload, {
    userId,
    fileId: storageId as Id<"_storage">,
    mimeType: "application/pdf",
    fileSizeBytes: bytes.length,
    source: "lab_upload",
  })) as { labReportId: Id<"lab_reports"> };
  const labReportId = sim.labReportId;
  console.log(`      simulateLabUpload returned labReportId=${labReportId}`);
  if (!labReportId) {
    throw new Error("simulateLabUpload did not return a labReportId");
  }

  // Step 4: poll getE2EStatus (internal query — shell out each tick)
  console.log("[4/4] polling getE2EStatus (2-min cap, 3s interval)...");
  const deadline = Date.now() + 120_000;
  let lastStatus = "";
  type StatusShape = {
    labReport: {
      status?: string;
      errorCode?: string | null;
      errorMessage?: string | null;
      userId: Id<"users">;
    } | null;
    biomarkerReport: unknown;
    values: unknown[];
    notifications: Array<{ kind: string }>;
  };
  let finalStatus: StatusShape | null = null;
  while (Date.now() < deadline) {
    const status = convexRun<StatusShape>("admin:getE2EStatus", {
      labReportId,
    });
    const s = status.labReport?.status ?? "missing";
    if (s !== lastStatus) {
      console.log(`      [${new Date().toISOString()}] status=${s}`);
      lastStatus = s;
    }
    if (TERMINAL_STATUSES.has(s)) {
      finalStatus = status;
      break;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  if (!finalStatus) {
    throw new Error(
      `timed out after 2 min waiting for terminal status; last observed: ${lastStatus}`,
    );
  }

  const durationMs = Date.now() - startMs;
  console.log("\n=== FINAL STATE ===");
  console.log(`duration: ${(durationMs / 1000).toFixed(1)}s`);
  console.log(
    `lab_report.status: ${finalStatus.labReport?.status ?? "<missing>"}`,
  );
  if (finalStatus.labReport?.errorCode || finalStatus.labReport?.errorMessage) {
    console.log(`lab_report.errorCode: ${finalStatus.labReport?.errorCode}`);
    console.log(
      `lab_report.errorMessage: ${finalStatus.labReport?.errorMessage}`,
    );
  }
  console.log("\nlab_report:");
  console.log(JSON.stringify(finalStatus.labReport, null, 2));
  console.log("\nbiomarker_report:");
  console.log(JSON.stringify(finalStatus.biomarkerReport, null, 2));
  console.log(`\nbiomarker_values count: ${finalStatus.values.length}`);
  console.log("first 3 biomarker_values:");
  console.log(JSON.stringify(finalStatus.values.slice(0, 3), null, 2));
  console.log(`\nnotifications for user: ${finalStatus.notifications.length}`);
  console.log(
    "notification kinds:",
    finalStatus.notifications.map((n) => n.kind),
  );
}

main().catch((err) => {
  console.error("E2E failed:", err);
  process.exit(1);
});
