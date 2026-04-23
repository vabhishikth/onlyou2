# Phase 2.5D Wave 5 — Device parity screenshots

Captured 2026-04-23 on Android against `phase-2.5d` tip `7c1625b` with real-seeded Convex data (`npx convex run seed/devBiomarkerReport:seedArjunReport` → 5 biomarkers for Arjun).

## Android (Pixel form factor)

| File                                     | Screen                                           | State                                                                                |
| ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `android-home-with-banner.png`           | Home tab                                         | `hasUnreadReport=true` — amber `NewReportBanner` entry into Dashboard                |
| `android-dashboard.png`                  | `app/lab-results/index.tsx`                      | 5 real biomarkers, summary `5 / 2 in range / 3 to watch`, `All` category pill active |
| `android-detail-optimal-cholesterol.png` | `app/lab-results/[id].tsx` (`total_cholesterol`) | Status `optimal` — green dial + `In Range` label + green marker                      |
| `android-detail-watch-vitamind.png`      | `app/lab-results/[id].tsx` (`vitamin_d`)         | Status `sub_optimal` — amber dial + `Watch` label + amber marker                     |
| `android-detail-action-ldl.png`          | `app/lab-results/[id].tsx` (`ldl_cholesterol`)   | Status `action_required` — red dial + `Out` label + red marker                       |

## iOS

Deferred to follow-up — no Mac available this session. Android-only parity closes Wave 5 contingent on iOS validation during or before 2.5E.

## Observed visual rough edges (all pre-existing DEFERRED items, not Wave 5 regressions)

- RangeBar markers visibly clip on both the Dashboard card and the Detail Reference card (e.g. cholesterol 185 and LDL 165 push past the right edge, Vitamin D 22 past the left) because the hook's real-data transform falls back to placeholder ranges `low=0, high=100, optLow=25, optHigh=75`. Both surfaces read from the same transformed row shape, so fixing at the hook/query layer resolves Dashboard + Detail simultaneously. **2.5E hard gate** — join `biomarker_reference_ranges` before external demo.
- Trend card renders a single data point because the query returns `trend: [currentValue]`. **2.5E** — historical-report join.
- Trend x-axis labels show `6mo` and `5` — the `AreaChart` label array is hardcoded to 7 slots `['6mo','5','4','3','2','1','now']` and the first / last labels print verbatim regardless of data length. **Phase 8.**
- Detail explainer text is canonical-id-keyed (`biomarker-explainers.ts`) and not status-aware, so LDL 165 still reads "within the optimal window" despite action_required status. **New finding** — filing to DEFERRED for 2.5E copy pass.
