---
date: "2026-04-19"
phase: 2.5b
status: accepted
tags:
  - architecture
  - claude-api
  - anthropic-sdk
  - phase-2.5b
  - post-merge-fix
---

# Per-request beta features go through `client.beta.messages.create`, not `client.messages.create`

**Context:** Phase 2.5B shipped with `callExtraction` passing `betas: [BETA_HEADER_EXTENDED_CACHE]` as a top-level body param on `client.messages.create`. The mocked test suite accepted it (the mock didn't validate unknown body fields). The first live `pnpm test:claude` run on 2026-04-19 — after wiring `ANTHROPIC_API_KEY` — failed all 8 fixtures with:

```
400 invalid_request_error
{"error":{"message":"betas: Extra inputs are not permitted"}}
```

## Decision

Route extraction calls through `client.beta.messages.create(...)` and keep the `betas: [...]` body param there. Narrative calls stay on `client.messages.create` (no beta features).

```ts
// Before — 400 rejected
await client.messages.create({
  model,
  max_tokens,
  system,
  messages,
  betas: [BETA_HEADER_EXTENDED_CACHE],
});

// After — accepted
await client.beta.messages.create({
  model,
  max_tokens,
  system,
  messages,
  betas: [BETA_HEADER_EXTENDED_CACHE],
});
```

## Why

1. **The `betas` body field is only defined on the beta surface.** In `@anthropic-ai/sdk ^0.90`, the `messages.create` TypeScript signature does not declare `betas` — that's why the original code needed a `as unknown as Parameters<...>[0]` cast to suppress the type error. The server mirrors the SDK: extra body keys are rejected with `"Extra inputs are not permitted"`. `client.beta.messages.create` has `betas` in its declared schema.

2. **Per-request beta features are exactly what the beta namespace is for.** Anthropic's SDK separates stable and beta request shapes at the namespace level. `anthropic-beta` as an HTTP `defaultHeaders` entry on the client is an alternate pattern, but that applies the beta globally to every request from that client instance — including the narrative call, which doesn't need it. Namespace routing keeps the beta feature scoped to the extraction call where it's actually used.

3. **The cast was a warning sign we missed.** `as unknown as Parameters<typeof client.messages.create>[0]` is exactly the shape TypeScript produces when the types disagree with runtime. Mocked tests passed, live didn't. **Lesson:** `as unknown as` on an SDK call signature is a deferred runtime failure — treat it as a live-test-required item before merge.

## Consequences

- **`convex/lib/claude.ts`** switched to `client.beta.messages.create` for `callExtraction`. The type cast still exists (the beta namespace also has subtle shape differences around `cache_control` on system blocks) but now resolves correctly at runtime.
- **`convex/__tests__/lib/claude.test.ts`** mock now exposes BOTH `this.messages.create` and `this.beta.messages.create` on the Anthropic mock class, wired to the same `vi.fn`. Tests for both call paths assert against the same `__createMock`.
- **`convex/__tests__/.../parseLabReport.live.test.ts`** switched from calling `callExtraction` directly to calling `extractMarkersWithRetry`. This is a parallel improvement surfaced by the live run: multipage wellness panels (e.g. fixture 03 with 35+ markers) exceed 4096 output tokens and need the 8192 retry. Calling the raw SDK wrapper bypassed that production path; calling the retry wrapper exercises it and mirrors what the orchestrator does.
- **`convex/__tests__/biomarker/vitest.claude.config.ts`** `testTimeout` 60s → 180s. A max_tokens retry is two sequential 30–40s vision calls; 60s wasn't enough budget.
- **Live results**: 8/8 fixtures pass in ~128s (~$0.25 per full run at current Sonnet 4.6 vision pricing).

## Pattern for future AI integrations

When adding any Anthropic SDK feature that's gated behind `anthropic-beta`:

1. Check whether the feature is a request-body parameter (`betas: [...]`, tool shapes on the beta endpoint, etc.) or a header-only feature.
2. If body-param: use `client.beta.messages.create` and keep the call scoped to the functions that need it. Do NOT plumb the beta header on the client-level `defaultHeaders` unless every call from that client wants it.
3. **Mocked tests must expose both `messages.create` and `beta.messages.create`** on the Anthropic mock, otherwise callers get silent false positives in unit tests and explode on first live call.
4. **Any `as unknown as` cast on a `*.create` call is a smoke signal** — fix the types properly or write a live test that proves the shape works before merging.

## References

- `convex/lib/claude.ts:callExtraction` — the corrected implementation.
- `convex/__tests__/lib/claude.test.ts` — mock wiring both namespaces to the same spy.
- `convex/__tests__/biomarker/parse-pipeline/parseLabReport.live.test.ts` — live fixture coverage via `extractMarkersWithRetry`.
- Master commit `54ea1ad` — post-merge fix shipped 2026-04-19.
- Anthropic SDK: [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) beta namespace.
