# Anthropic API key rotation — dev

**Date added:** 2026-04-24 (Phase 3A)
**Reason:** The current dev `ANTHROPIC_API_KEY` was pasted into chat transcripts during Phase 2.5C (ledgered in `docs/DEFERRED.md`) and re-exposed in `npx convex env list` output on 2026-04-22. Rotate before the first real Claude call in Phase 3C.

## Procedure

1. **Generate a replacement key** in the Anthropic console (https://console.anthropic.com/settings/keys). Label it `onlyou-dev-2026Q2`.

2. **Set it on the Convex dev deployment:**

   ```bash
   npx convex env set ANTHROPIC_API_KEY sk-ant-…
   ```

   Confirm via `npx convex env list` — the value is redacted; verify by key name + last-4 chars.

3. **Verify with the offline suite:**

   ```bash
   pnpm test:convex
   ```

   Expected: `convex/__tests__/lib/claude.test.ts` passes with the mock key.

4. **Verify with the live suite:**

   ```bash
   pnpm test:claude
   ```

   Expected: 8/8 synthetic fixtures pass (Phase 2.5B baseline ~80–130s, ~$0.25 per full run).

5. **Verify via the end-to-end driver:**

   ```bash
   pnpm e2e:manual
   ```

   Expected: `lab_report.status → ready` within ~35–40s on `aromatic-labrador-938`.

6. **Revoke the old key** in the Anthropic console. Revocation IS the rotation — do not keep it as a backup.

7. **Record the rotation** in `checkpoint.md` under Phase 3A Task 7 with the key label + ISO timestamp.

## On failure

If `pnpm test:claude` fails after rotation, most likely causes:

- **Wrong env-var scope.** Deployment-scoped vs project-scoped. `npx convex env list` shows the deployment-scoped set.
- **Billing lapse on the new key.** Anthropic console → Usage tab.
- **Model-ID drift.** Current contract: `ANTHROPIC_MODEL` env var, never hardcoded (Phase 2.5B decision).

## Scope

Key rotation applies to the **dev** deployment only in Phase 3A. Staging + prod key provisioning is covered by the Phase 8 launch runbook.
