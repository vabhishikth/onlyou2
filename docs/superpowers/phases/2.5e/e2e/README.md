# Phase 2.5E — Live E2E record

**Deployment:** `aromatic-labrador-938` (dev)
**Date:** 2026-04-24, 12:58–13:02 IST
**Device:** Android (founder-provided test handset)
**Verdict:** **PASS_WITH_NOTES** — all wired functionality validated; one cosmetic deferral logged.

## Seed state

Cleared prior Arjun data and seeded 4-report history via `seedArjunHistory`:

```bash
npx convex run seed/devBiomarkerReport:clearArjunReports
npx convex run seed/devBiomarkerReport:seedArjunHistory '{"reports":4,"spacingDays":60}'
```

Resulting data: 4 `biomarker_reports` at `2025-10-26`, `2025-12-25`, `2026-02-23`, `2026-04-24`. 5 markers each — `ldl_cholesterol` / `hdl_cholesterol` / `triglycerides` / `vitamin_d` / `hba1c`. Drifting values per the `seedArjunHistory` pattern.

## Mobile env

`apps/mobile/.env.local`:

```
EXPO_PUBLIC_CONVEX_URL=https://aromatic-labrador-938.convex.cloud
EXPO_PUBLIC_USE_MOCK_BIOMARKERS=0
```

## Sign-in

- Phone: `+91 99999 00001`
- OTP: `000000`

## Home screen (`home.png`)

- `onlyou` wordmark + `AS` avatar in header — PASS
- `Thanks for submitting, Arjun.` — greeting on name PASS
- `NEW REPORT · JUST NOW Apex Diagnostics · Panel #4207` banner present — PASS
- `UNDER REVIEW · A doctor is reviewing your Hair Loss case · Submitted 4h ago · SLA 24h` card present — PASS
- Bottom tab bar (Home · Explore · Activity · Messages) — PASS

## Dashboard (`dashboard.png`)

| Check              | Expected                                                                             | Result                                                                            |
| ------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Greeting           | `Good afternoon, Arjun`                                                              | ✅ PASS — IST helper returned `afternoon` at 12:59 IST                            |
| Date line          | `FRIDAY · 24 APRIL`                                                                  | ✅ PASS                                                                           |
| Avatar letter      | `A` (circle right of greeting)                                                       | ✅ PASS — displayed as `A` in honey circle                                        |
| Summary counts     | `5 biomarkers · 2 in range · 3 to watch`                                             | ✅ PASS — HDL + HbA1c optimal, LDL + TG + Vit D sub-optimal                       |
| Category pills     | All / Metabolic / Lipids / Hormones / Inflammation / Vitamin                         | ✅ PASS                                                                           |
| LDL card           | 125 mg/dL · delta `+8.7%` · sparkline 4 points rising · tick inside sub-optimal band | ✅ PASS                                                                           |
| HDL card           | 52 mg/dL · `IN RANGE` · delta `-3.7%` · sparkline 4 points descending                | ✅ PASS                                                                           |
| Triglycerides card | 155 mg/dL · `WATCH` · delta `+10.7%` · sparkline rising                              | ✅ PASS                                                                           |
| Vitamin D card     | 23 ng/mL · `WATCH` · delta `-11.5%` · sparkline descending                           | ✅ PASS                                                                           |
| HbA1c card         | 5.5% · `IN RANGE` · delta `+1.9%` · sparkline slight rise                            | ✅ PASS                                                                           |
| Explainer fallback | Zero cards show "outside our reference database" copy                                | ✅ PASS — all 5 resolved via canonical-id aliases (I-2 fix + alias fix `2c03e94`) |

## Detail screen — LDL Cholesterol (`detail-ldl.png`)

- Header: `LIPIDS` section label, back chevron, ellipsis — PASS
- Dial: 125 value, `WATCH` label, honey arc nearly full — PASS
- `vs. last test ∧ +8.7% (115 → 125)` — PASS (real `prev`)
- Trend chart: 4 points ascending 95 → 105 → 115 → 125 — PASS
- Reference: Optimal `50 – 99 mg/dL`, Clinical `30 – 159 mg/dL`, Your Value `125 mg/dL`, range-bar tick inside sub-optimal band — PASS
- Explainer: `"LDL cholesterol is the particle that carries cholesterol into artery walls, where it can contribute to plaque buildup over time."` (base) + `"Slightly elevated. Prioritize soluble fibre (oats, apples, lentils), olive oil over butter, and retest in 90 days."` (watch branch) — PASS (status-aware composition working)

## Detail — HDL Cholesterol (`detail-hdl.png`)

- Italic serif title `HDL Cholesterol` — PASS
- Dial: 52 value, `IN RANGE`, sage arc — PASS
- `vs. last test ∨ -3.7% (54 → 52)` — PASS
- Trend chart: 4 points descending 58 → 56 → 54 → 52 — PASS
- Reference: Optimal `50 – 95`, Clinical `35 – 110`, range-bar tick inside optimal band; honey peach on left (actionBelow 35 boundary), sage in optimal window — PASS
- Explainer: `"HDL cholesterol is the 'good' cholesterol that helps clear excess cholesterol from circulation back to the liver."` (base) + `"Your HDL is in the protective band. Keep up resistance training..."` (optimal branch) — PASS

## Detail — Triglycerides (`detail-tg.png`)

- Italic serif title `Triglycerides` under `LIPIDS` — PASS
- Dial: 155 value, `WATCH`, honey arc — PASS
- `vs. last test ∧ +10.7% (140 → 155)` — PASS
- Trend chart: 4 points ascending 110 → 125 → 140 → 155 — PASS
- Reference: Optimal `40 – 149`, Clinical `20 – 199`, tick just past optimal (155 vs 149 upper) — PASS
- Explainer: `"Triglycerides are the main fat circulating in your blood — they rise with refined carbs, sugar, and alcohol."` (base) + watch branch — PASS — canonical alias `triglycerides` resolved

## Detail — Vitamin D (`detail-vitd.png`)

- Italic serif title `Vitamin D (25-OH)` under `VITAMINS` — PASS
- Dial: 23 value, `WATCH`, honey arc mostly empty (reflects 23 in 0–100 scale) — PASS
- `vs. last test ∨ -11.5% (26 → 23)` — PASS
- Trend chart: 4 points descending 32 → 29 → 26 → 23 — PASS
- Reference: Optimal `30 – 100 ng/mL`, Clinical `20 – 150 ng/mL`, range-bar tick on LEFT (below optimal) — PASS
- Explainer: `"Vitamin D supports bone health, immune function, mood, and muscle strength — deficiency is common even in sunny climates..."` — PASS — canonical alias `vitamin_d` resolved

## Detail — HbA1c (`detail-hba1c.png`)

- Italic serif title `HbA1c` under `METABOLIC` — PASS
- Dial: 5.5 value, `IN RANGE`, sage arc — PASS
- `vs. last test ∧ +1.9% (5.4 → 5.5)` — PASS
- Trend chart: 4 points slight rise 5.2 → 5.3 → 5.4 → 5.5 — PASS
- Reference: Optimal `4 – 5.6 %`, Clinical `3.5 – 6.4 %`, tick inside optimal band near upper edge — PASS
- Explainer: `"HbA1c estimates your average blood sugar over the past 2–3 months — a slower, more reliable metabolic marker than a single fasting value..."` — PASS — canonical id `hba1c` (entry added in alias fix `2c03e94`)

## Byline (all detail screens)

Detail screens show `— Your care team` byline below explainer when visible. ✅ PASS (T14 `eea1a60`).

## Notes

1. **Trend range toggle (1M / 3M / 6M / 1Y) is cosmetic — tapping does not filter the trend chart.** Confirmed by founder during this E2E. Code comment at `apps/mobile/app/lab-results/[id].tsx:65` documents this is intended 2.5D behaviour carried into 2.5E. Logged in `docs/DEFERRED.md` with destination Phase 8. Non-blocking for demo — the single chart shows full seeded history (6 months).
2. **Canonical-id alias fix** was applied mid-E2E (commit `2c03e94`). Seed produces long-form canonical ids (`ldl_cholesterol`, `hdl_cholesterol`, `triglycerides`, `vitamin_d`, `hba1c`) but the W4 explainer map originally keyed only short-form mock ids (`ldl`, `hdl`, `trig`, `vitd`) and had no `hba1c` entry at all. The fix aliases every seed canonical id to its existing short-form Explainer object and adds 6 new full entries (hba1c, mcv, free_t3, free_t4, iron_serum, vitamin_b12). Without this, 4 of 5 demo markers would have shown the generic fallback copy.
3. **Convex codegen** was regenerated after the I-3 fix introduced `biomarker/lib/normalizeCollectionDate.ts`. Commit `865643e`.
4. **Host machine** Mac-blocked for iOS parity screenshots — re-deferred to Phase 3 approval gate.

## Verdict

**PASS_WITH_NOTES** — Phase 2.5E headline deliverables (real-data join, trend, prev, range direction, personalization, status-aware explainer) all validated on physical Android against seeded 4-report history. One cosmetic deferral (range toggle) logged. Alias fix and codegen regen tracked. Ready for merge pending founder approval.
