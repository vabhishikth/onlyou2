# Expo SDK strategy + dev client adoption

**Date:** 2026-04-14
**Phase:** Phase 2B (auth + shell skeleton) → Plan 2C onward
**Status:** Active

## TL;DR

We are switching from **Expo Go (App Store)** to a **custom dev client built via EAS Build**. We temporarily downgraded Expo SDK from 55 → 54 to unblock the founder's first device walkthrough, and will bump back to the latest SDK once the dev client is live on the founder's iPhone.

## What happened

During the Phase 2B founder walkthrough (the first time anyone tried to actually open the app on a real device), Expo Go on the iPhone refused to load the bundle:

> Project is incompatible with this version of Expo Go.
> The project you requested requires a newer version of Expo Go.

**Root cause:** Phase 1 picked Expo SDK 55, the absolute latest. Apple's App Store version of Expo Go (the public, free pre-built client) lags newer Expo SDKs by 2–6 weeks because Apple has to re-approve every release. As of 2026-04-14, App Store Expo Go supports up to SDK 54.

This will keep happening every single time we bump Expo to a new SDK — and we will keep bumping, because Phase 1 set "always use latest stable" as a project rule.

## Decision

### Short-term (2026-04-14)

- Downgrade `apps/mobile` from Expo SDK 55 → 54 (commits `5f1bbf1`, `f664e70`).
- This unblocks Expo Go scanning today.
- All 40 unit tests still pass; Metro boots clean.
- Tracked: `react@19.1.0`, `react-native@0.81.5`, `react-dom@19.1.0`, `expo-router@6.0.23`, `jest-expo@54.0.17`.

### Long-term (next session, before Plan 2C kickoff)

- Add `expo-dev-client` to `apps/mobile`.
- Use **EAS Build** (Expo's cloud build service) to build a custom iOS dev client `.ipa`.
- Install that `.ipa` on the founder's iPhone via TestFlight or direct install.
- After that point: `npx expo start` from the dev machine + open the dev client app on the iPhone = same hot-reload workflow as Expo Go, but **completely decoupled from Apple's App Store update cycle**.

Once the dev client is live, we can bump Expo SDK 54 → 55 (or 56, or whatever ships next) at any time without breaking the founder's ability to test on-device. The dev client bundles whatever Expo runtime the project pins.

## Why this is the right answer for ONLYOU specifically

| Constraint                                           | Why it matters                                                                                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Founder is on **Windows**                            | Can't use Xcode → can't build iOS locally → must use cloud build (EAS)                                                             |
| Founder owns an **Apple Developer account** ($99/yr) | EAS Build can sign and ship to TestFlight without paying anything extra                                                            |
| Founder is **non-technical**                         | Ongoing breakage from "latest SDK" rolling forward in front of App Store Go is a recurring trap. Solve it once, never hit it again |
| Project rule: **always latest stable** (CLAUDE.md)   | Conflicts with Expo Go's release cadence. Dev client resolves the conflict permanently                                             |
| Visual-companion-mandatory rule (CLAUDE.md)          | Founder approves visually. Anything that prevents getting the app onto a real screen is a critical blocker                         |

## Trade-offs we accepted

- **Setup cost:** 30–60 min one-time to wire EAS, configure credentials, and run the first build. Future builds are roughly 10–15 min wall-clock and run in the background.
- **Cost:** Free tier of EAS Build is 30 builds/month. We will not approach that limit during a single founder.
- **Re-builds on native dep changes:** Adding any package with native code (e.g., a new `expo-*` module that touches iOS) requires a fresh dev-client build. Pure JS/TS changes hot-reload as before. This is the same cost as Expo Go.

## Why we did NOT pick the other options

| Option                                       | Reason rejected                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Wait for App Store Expo Go to support SDK 55 | Days to weeks of unknown lag. Will recur on every future SDK bump. Permanent fragility.                    |
| Stay on SDK 54 forever                       | Violates project rule. Falls behind on bug fixes, RN improvements, new APIs.                               |
| Android emulator on Windows                  | Founder is on **iPhone**. Android emulator only validates Android, not iOS. Doesn't reflect real hardware. |
| Xcode + iOS Simulator                        | Requires a Mac. Founder is on Windows.                                                                     |
| Pay for "Expo Go Preview" SDK channel        | Not a thing.                                                                                               |

## Action items

- [x] Downgrade SDK 55 → 54 (done — `5f1bbf1`, `f664e70`)
- [ ] Run founder walkthrough on Expo Go SDK 54 to validate Phase 2B visually
- [ ] Plan 2C pre-task: install `expo-dev-client`, configure EAS, run first iOS build, install on iPhone
- [ ] After dev client confirmed working: bump SDK 54 → latest stable (track in Plan 2C closing tasks)
- [ ] Add an entry to `docs/DEFERRED.md` for the SDK bump-back so it doesn't get forgotten

## References

- Expo dev client docs: <https://docs.expo.dev/develop/development-builds/introduction/>
- EAS Build (cloud builds): <https://docs.expo.dev/build/introduction/>
- This pattern is the **recommended** Expo workflow for any project past prototype stage. Expo Go is for first-day exploration; dev client is for everyone else.
