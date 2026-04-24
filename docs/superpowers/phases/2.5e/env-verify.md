# Phase 2.5E — Production env verification

`EXPO_PUBLIC_USE_MOCK_BIOMARKERS` defaults to `__DEV__`-mock in `apps/mobile/src/hooks/use-biomarker-reports.ts` (see hook body). Production builds must set this flag to `"0"` explicitly — otherwise real patients would see the demo mock rows.

## Verification checklist (merge gate)

- [ ] `eas.json` — `production` profile `env` contains `EXPO_PUBLIC_USE_MOCK_BIOMARKERS: "0"`.
- [ ] `eas.json` — `preview` profile either sets `"0"` (recommended for TestFlight) or omits the flag (defaults to mock, matching dev).
- [ ] First production build manually verified to show "no reports yet" empty state when the signed-in user has no seeded reports.

This check runs once per merge window. Sign off below before closing Phase 2.5E.
