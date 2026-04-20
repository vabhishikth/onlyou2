// eslint-disable-next-line @typescript-eslint/no-unused-vars -- `it` preserved per Wave 2 Task 11 spec; filled in when Wave 4 Task 22 lands.
import { describe, it } from "vitest";

describe.todo("lab_report_updated band-change-only emission", () => {
  // These tests are implemented when reclassifyForCanonicalId lands in Wave 4
  // (Task 22). Placeholder documents the expected contract:
  //
  // 1. No-op reclassify (same status on every value) → NO notification
  // 2. At least one band flip on a report → exactly ONE notification per report
  // 3. Multiple reports affected → one notification per affected report
  // 4. Report with some-changed-some-unchanged values → one notification
  //    (the whole report counts as "updated")
});
