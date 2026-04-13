# Phase 1 — Monorepo Scaffold + Convex + Design System

**Date:** 2026-04-13
**Status:** Design approved by founder, ready for planning
**Phase:** 1 of 8 (per CLAUDE.md build order)
**Approval gate:** Design system must be visually verifiable in every scaffolded app before Phase 2 begins.

---

## 1. Goal

Establish the project skeleton that every future phase builds into:

1. Turborepo + pnpm monorepo with 4 apps and 3 shared packages.
2. Convex backend installed, configured, with a minimal placeholder schema.
3. The "Clinical Luxe" design system from `docs/DESIGN.md` translated into code and rendered on a `/design` showcase route in every app.
4. Shared tooling (TypeScript, ESLint, Prettier) configured once in a central package and consumed by every app via 2-line config files.
5. `pnpm dev` brings up Convex, the mobile app, and three Next.js apps concurrently, each displaying the onlyou logo and linking to their `/design` showcase.

**Non-goals (explicitly):**
- No authentication flows. (Phase 2.)
- No business-logic tables — no consultations, prescriptions, orders, payments, lab orders. (Phase 3+.)
- No routing beyond `/` and `/design`. (Phase 2.)
- No tests. No CI. No Storybook. No PWA manifests. No i18n.
- No nurse/lab/pharmacy portal apps. (Phase 6.)

---

## 2. Scope Decisions (Approved During Brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Breadth of apps scaffolded | **4 apps**: mobile, landing, doctor, admin | Matches build order phases 1–5. Nurse/lab/pharmacy deferred to Phase 6 to avoid dead scaffolding. |
| Tailwind version (web) | **Tailwind 4** | Latest shadcn/ui defaults. CSS-first config via `@theme`. |
| Tailwind version (mobile) | **Tailwind 3 + NativeWind 4.1** | NativeWind does not yet support Tailwind 4. Contained split — the *values* live in `@onlyou/core/tokens`, both platforms consume the same TS constants. |
| `packages/ui` model | **Hybrid** — shared branded shadcn primitives in `packages/ui`; apps may still install app-specific shadcn components locally | DESIGN.md §9 specifies custom variants (7 button variants, branded badges, OTP input, etc.). Centralizing avoids duplication across 3 Next.js apps. |
| Definition of Done | **Design system provable** — every app has a `/design` route that renders the full palette, typography, and component library | Non-technical founder approves visually. `/design` route = acceptance surface in lieu of Storybook. |
| Convex Auth timing | **Deferred to Phase 2** | CLAUDE.md Phase 2 = "Patient app shell (all screens)" which includes the login screen; auth belongs there. Phase 1 leaves `convex/auth.config.ts` as an empty placeholder. |
| Aesthetic direction | **Option A — Clinical Luxe** (matches current DESIGN.md) | Selected after visual comparison with alternative "Apothecary Noir" direction. DESIGN.md remains the source of truth for all visual values. |
| `packages/types` from SOURCE-OF-TRUTH v1 layout | **Dropped** | Convex auto-generates API types from `convex/schema.ts`. A separate shared-types package is the pattern for tRPC/REST stacks; with Convex it creates a second place where types can drift. |
| Package renamed from v1 layout | `packages/tokens` → **`packages/core`** | Holds more than design tokens — also enums, feature flags, and formatters. `core` is more accurate. |

---

## 3. Workspace Layout

```
onlyou2/
├── convex/                          # Convex backend at repo root (Convex convention)
│   ├── schema.ts
│   ├── auth.config.ts               # Empty placeholder, Phase 2 wires this up
│   ├── users.ts
│   ├── featureFlags.ts
│   ├── constants.ts
│   ├── _generated/                  # Auto-generated
│   └── tsconfig.json
├── apps/
│   ├── mobile/                      # Expo (latest SDK) + NativeWind 4
│   ├── landing/                     # Next.js (latest) — marketing site
│   ├── doctor/                      # Next.js — doctor portal
│   └── admin/                       # Next.js — admin portal
├── packages/
│   ├── core/                        # Framework-agnostic shared code
│   │   ├── tokens/                  # Design tokens (colors, spacing, typography, shadows, radii, z-index, animations)
│   │   ├── enums/                   # Role, ConsultationStatus, SubscriptionPlan, OrderStatus,
│   │   │                            # LabOrderStatus, NurseVisitStatus, PrescriptionStatus,
│   │   │                            # PaymentStatus, SubscriptionStatus, RefundStatus,
│   │   │                            # ConsentPurpose, Condition
│   │   ├── flags/                   # 7 feature flag constants + typed helper
│   │   ├── formatters/              # formatRupees(paise), formatDate (IST), formatPhoneIN,
│   │   │                            # formatSampleId, formatOrderId, formatPatientId
│   │   └── index.ts
│   ├── ui/                          # React components (web only)
│   │   ├── src/
│   │   │   ├── styles/
│   │   │   │   └── globals.css      # @theme block mapping @onlyou/core/tokens to Tailwind 4 CSS vars
│   │   │   ├── components/          # Branded shadcn primitives
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   ├── otp-input.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── empty-state.tsx
│   │   │   │   └── error-state.tsx
│   │   │   ├── components/onlyou/   # Non-shadcn shared: Logo, StatusBadge, VerticalBadge, PremiumBadge
│   │   │   └── lib/cn.ts            # clsx + tailwind-merge
│   │   ├── tailwind.preset.ts
│   │   └── package.json
│   └── config/                      # Shared tooling bases
│       ├── tsconfig/
│       │   ├── base.json
│       │   ├── next.json
│       │   ├── expo.json
│       │   └── convex.json
│       ├── eslint/
│       │   ├── base.js
│       │   ├── next.js
│       │   └── expo.js
│       └── prettier.config.js
├── docs/                            # Existing — unchanged
├── checkpoint.md                    # Session handoff file (new, per CLAUDE.md Rule #5)
├── package.json                     # Workspace root, private
├── pnpm-workspace.yaml
├── turbo.json
├── .npmrc                           # node-linker=hoisted
├── tsconfig.base.json
└── .gitignore
```

**Package names:** `@onlyou/core`, `@onlyou/ui`, `@onlyou/config`.

---

## 4. Design System Translation

### 4.1 Source of values

`docs/DESIGN.md` is the canonical specification. Phase 1 is pure translation — no value invented, nothing edited in DESIGN.md.

### 4.2 Single source: `packages/core/tokens/`

Plain TypeScript constants. No framework dependencies. All hex codes, font families, spacing values, radii, shadows, animations, and z-index values from DESIGN.md §2–§7 and §17 live here.

```
packages/core/tokens/
├── colors.ts       # DESIGN.md §2 (core palette, primary scale, text hierarchy,
│                   # CTAs, accents, borders, semantic/status, chart slots)
├── typography.ts   # DESIGN.md §3 (font families, sizes, weights, line heights, letter spacing)
├── spacing.ts      # DESIGN.md §4 (4px-based scale)
├── radii.ts        # DESIGN.md §5
├── shadows.ts      # DESIGN.md §6 — exports both web (box-shadow strings) and native (RN objects) forms
├── animations.ts   # DESIGN.md §7 (durations, easings)
├── z-index.ts      # DESIGN.md §17
└── index.ts
```

**Shadow asymmetry handling:** `shadows.ts` exports each shadow token as `{ web: string, native: object }`. Web imports `.web`, mobile imports `.native`. This is the only cross-platform seam.

### 4.3 Web consumption — `packages/ui/`

Tailwind 4, CSS-first. `packages/ui/src/styles/globals.css` contains an `@theme` block that imports values from `@onlyou/core/tokens` and exposes them as Tailwind 4 CSS custom properties (`--color-primary`, `--radius-card`, etc.). shadcn components in `packages/ui/src/components/` are built against these properties.

Each Next.js app's root layout imports once: `import '@onlyou/ui/globals.css'`.

Branded primitives from `packages/ui` are imported per-component: `import { Button } from '@onlyou/ui/button'`.

### 4.4 Mobile consumption — `apps/mobile/src/theme/`

Tailwind 3 + NativeWind 4.1. A thin theme layer in `apps/mobile/src/theme/` re-exports values from `@onlyou/core/tokens` into the shapes React Native and NativeWind need:

```
apps/mobile/src/theme/
├── colors.ts       # Re-exports from @onlyou/core/tokens/colors
├── typography.ts   # Combines @onlyou/core fonts with RN textStyles objects
├── spacing.ts      # Re-exports
├── shadows.ts      # Picks the .native variant from @onlyou/core
├── fonts.ts        # useFonts() hook loading Playfair Display + Plus Jakarta Sans
│                   # via @expo-google-fonts
└── index.ts
```

Mobile's `tailwind.config.js` extends `theme` by importing from `@onlyou/core/tokens`, so NativeWind utility classes (`bg-primary`, `text-accent`) resolve correctly.

### 4.5 Font loading

- **Web**: `next/font/google` in each Next.js app's root layout loads `Playfair Display` (400, 600, 700, 900) and `Plus Jakarta Sans` (400, 500, 600, 700). CSS variables `--font-serif` and `--font-sans` are set on `<html>`.
- **Mobile**: `@expo-google-fonts/playfair-display` and `@expo-google-fonts/plus-jakarta-sans`. `useFonts()` hook blocks initial render until fonts are ready; splash screen stays visible during load.

### 4.6 Components in `packages/ui/src/components/`

Branded versions of these shadcn primitives (per DESIGN.md §9):

- `button.tsx` — 7 variants, 5 sizes, loading state
- `input.tsx` — default + error state
- `card.tsx`
- `badge.tsx` — base + specialized: `ConsultationStatusBadge`, `OrderStatusBadge`, `LabOrderStatusBadge`, `PriorityBadge`, `VerticalBadge`
- `dialog.tsx`
- `toast.tsx` — provider + hook
- `otp-input.tsx`
- `skeleton.tsx`
- `empty-state.tsx` — base + `SearchEmptyState`, `FilterEmptyState`
- `error-state.tsx` — base + `InlineError`, `ErrorBoundaryFallback`

Non-shadcn shared components in `packages/ui/src/components/onlyou/`:

- `Logo.tsx` — text-only wordmark, Playfair Display 900 (DESIGN.md §1.1)
- `StatusBadge.tsx` — abstraction over the status badge variants
- `PremiumBadge.tsx` — gold badge reserved for premium tier

---

## 5. Convex Setup

### 5.1 Minimal schema

Only two tables are created in Phase 1. Every other table from the business domain is deferred to the phase that needs it.

**`users` table:**
```
{
  name: string (optional),
  phone: string (optional),
  email: string (optional),
  role: v.union(PATIENT, DOCTOR, ADMIN, NURSE, LAB_TECH, PHARMACY_STAFF),
  createdAt: number
}
```
Role values come from `@onlyou/core/enums/roles` (the constants are the single source of truth; Convex's validator is derived from them).

**`featureFlags` table:**
```
{
  key: string,
  value: boolean,
  updatedAt: number
}
```
Seeded with the 7 MVP flags from `docs/ONLYOU-SOURCE-OF-TRUTH.md` §16, all `false`:
- `VIDEO_CONSULTATION_ENABLED`
- `THIRD_PARTY_LAB_APIS`
- `SHIPROCKET_DELHIVERY`
- `COLD_CHAIN_TRACKING`
- `FACE_MATCH_VERIFICATION`
- `ABHA_INTEGRATION`
- `GPS_CHECKIN_NURSES`

### 5.2 Minimal functions

- `convex/users.ts` — `getCurrentUser` query. Returns `null` in Phase 1 (auth not yet wired).
- `convex/featureFlags.ts` — `getFlags` query. Returns all flags as `Record<string, boolean>`.
- `convex/auth.config.ts` — empty placeholder file. No providers. Phase 2 adds Gupshup phone OTP provider.

### 5.3 Boundary: Convex ↔ `@onlyou/core`

- **Enum values** (the string literals): owned by `@onlyou/core/enums`.
- **Schema validators**: `convex/schema.ts` imports from `@onlyou/core/enums` and constructs validators (`v.union(...ROLES.map(v.literal))`).
- **Generated types**: `convex/_generated/api` is the public type surface for clients. Apps import types from here.
- **Runtime constants and formatters**: apps import from `@onlyou/core` directly.
- **Rule**: client apps never import from `convex/schema.ts`. They consume `_generated/api` types + `@onlyou/core` constants.

### 5.4 Environment variables

- `CONVEX_DEPLOYMENT` — set by `npx convex dev` during setup.
- `NEXT_PUBLIC_CONVEX_URL` — public URL for Next.js apps (each app has its own `.env.local`).
- `EXPO_PUBLIC_CONVEX_URL` — public URL for the mobile app (Expo convention).

Existing root `.env.local` is preserved. Phase 1 inspects it before writing.

---

## 6. Per-App Scaffolding

### 6.1 Next.js apps (landing, doctor, admin)

Identical shape. Each app has:

```
apps/<app>/
├── app/
│   ├── layout.tsx          # Imports @onlyou/ui globals.css, loads fonts via next/font
│   ├── page.tsx            # Home
│   └── design/
│       └── page.tsx        # Design showcase route
├── next.config.ts          # transpilePackages: ['@onlyou/ui', '@onlyou/core']
├── tailwind.config.ts      # Extends @onlyou/ui preset
├── tsconfig.json           # 2 lines — extends @onlyou/config/tsconfig/next.json
├── eslint.config.js        # 3 lines — re-exports @onlyou/config/eslint/next
├── .env.local              # NEXT_PUBLIC_CONVEX_URL
└── package.json
```

**Home pages:**
- `landing/` — real-ish home: `onlyou` logo, "Coming soon" headline, disabled email-capture input. This app is the only one a founder might casually screenshot; it should look like something.
- `doctor/` and `admin/` — placeholder home: logo + "Phase 1 scaffold — see /design for the design system".

**`/design` showcase** (identical on every Next.js app), renders in order:

1. Logo
2. Typography scale — H1, H2, H3, body, body secondary, small, with labels
3. Core palette — swatches + hex codes
4. Status colors — success, warning, error, info
5. Buttons — 7 variants × 5 sizes + loading state
6. Inputs — default, focused, error, disabled, OTP input
7. Badges — every status type (consultation, order, lab, priority, vertical, premium)
8. Cards — basic + vertical-themed
9. Dialog and Toast — live triggers
10. Skeleton, EmptyState, ErrorState

Each section heading has a "copy link to section" anchor affordance.

### 6.2 Mobile app (Expo)

```
apps/mobile/
├── app/
│   ├── _layout.tsx         # Root layout — fonts, SafeAreaProvider, ConvexProvider
│   ├── index.tsx           # Splash — logo fades in, taps through to design.tsx
│   └── design.tsx          # Mobile design showcase
├── src/
│   ├── theme/              # See §4.4
│   └── components/ui/      # PremiumButton, PremiumInput, ScreenWrapper, SelectionCard, etc.
├── global.css              # NativeWind entry
├── tailwind.config.js      # Tailwind 3 + NativeWind preset, extends @onlyou/core/tokens
├── metro.config.js         # Workspace symlink support
├── babel.config.js         # NativeWind plugin
├── app.config.ts
├── tsconfig.json           # Extends @onlyou/config/tsconfig/expo.json
└── package.json
```

**Mobile `/design` screen** renders, on a single scrollable screen:

1. Logo (Playfair Display 900, 36px, opacity fade-in)
2. Typography scale
3. Color palette (horizontal scroll)
4. PremiumButton — 3 variants with press feedback + haptic
5. PremiumInput — default, focused, error
6. SelectionCard, TreatmentCard
7. Status badges
8. ScreenWrapper demo (the standard screen shell)

No navigation graph beyond splash → design. Phase 2 builds out the real screen tree.

### 6.3 Phase 1 Done State

Running `pnpm dev` at repo root produces:

1. Convex dashboard URL printed in terminal; dashboard shows empty `users` and `featureFlags` tables (flags seeded).
2. Mobile app on `http://localhost:8081`; scanning with Expo Go shows logo fade-in → tap → design showcase.
3. Landing on `http://localhost:3001`; home shows "Coming soon" with logo; `/design` shows full showcase.
4. Doctor on `http://localhost:3002`; home shows scaffold placeholder; `/design` shows showcase.
5. Admin on `http://localhost:3003`; same shape as doctor.

Every `/design` route visually matches on both web and mobile. Founder clicks through each and approves before Phase 2 begins.

---

## 7. Tooling and Dev Workflow

### 7.1 Root `package.json` scripts

```
dev          → turbo run dev
build        → turbo run build
lint         → turbo run lint
typecheck    → turbo run typecheck
format       → prettier --write "**/*.{ts,tsx,md,json}"
clean        → turbo run clean && rm -rf node_modules
```

### 7.2 `turbo.json` pipeline

- `dev` — persistent, no cache, runs everything in parallel.
- `build` — depends on `^build` (upstream packages build first).
- `lint` — cached per-package.
- `typecheck` — cached, depends on `^build`.
- `clean` — no cache.

### 7.3 `packages/config/`

- **TypeScript**: `base.json` (strict, ES2022, moduleResolution `bundler`), with `next.json` / `expo.json` / `convex.json` extensions. Every app's `tsconfig.json` is 2 lines (`extends` + `include`).
- **ESLint**: `base.js` (typescript-eslint, import/order, no-unused-vars: error, no-explicit-any: error, ban `@ts-ignore` in favor of `@ts-expect-error` with description) + framework extensions. Every app's `eslint.config.js` is 3 lines.
- **Prettier**: single `prettier.config.js` — 2 spaces, semicolons, single quotes, trailing comma all.

### 7.4 `.npmrc`

```
node-linker=hoisted
strict-peer-dependencies=false
auto-install-peers=true
```

`node-linker=hoisted` is required for React Native / Expo to resolve workspace packages. Matches `docs/ONLYOU-SOURCE-OF-TRUTH.md` §9.

### 7.5 CLAUDE.md Rule #6 enforcement

**Pre-commit hook** via Husky + lint-staged:
- `eslint --fix` on staged `*.{ts,tsx}` files
- `prettier --write` on staged `*.{ts,tsx,md,json}` files
- `tsc --noEmit` on the full workspace (via `turbo run typecheck`)
- Commit is blocked if any step fails.

No editor-only enforcement. VSCode settings stay out of the repo.

### 7.6 `.gitignore` additions

```
.env.local
.env*.local
node_modules/
.turbo/
.next/
.expo/
dist/
build/
*.tsbuildinfo
.superpowers/
ios/
android/
```

### 7.7 `checkpoint.md`

Created at repo root. Updated at the end of every session. Format:

```markdown
# Checkpoint

**Current phase:** Phase 1 — Monorepo scaffold + Convex + design system
**Status:** <in progress | blocked on X | complete — awaiting approval gate>

## Last session
<2-3 sentences on what was done>

## Next session
<what picks up first>
```

### 7.8 Explicitly NOT in Phase 1

- No Vitest / Jest / Playwright / test runners. No tests to run yet.
- No Storybook. `/design` routes replace it.
- No CI (GitHub Actions, etc.). Phase 8.
- No Dependabot / Renovate. Phase 8.
- No commitlint / conventional commits hooks. Phase 8.
- No pre-push or commit-msg Husky hooks beyond pre-commit.

---

## 8. Dependency Versions

All versions are "latest stable at time of Phase 1 execution, pinned exact." No version is pre-committed in this spec — the implementation plan resolves them against the registry at execution time. Per CLAUDE.md: "Always use latest stable versions. Pin exact. Never downgrade."

Key packages the plan will pin:

- `convex` — latest
- `next` — latest (expected ≥16 at time of execution)
- `react`, `react-dom` — latest matching Next.js
- `tailwindcss` — 4.x (web); 3.4.x (mobile only, for NativeWind)
- `@tailwindcss/postcss` — 4.x
- `expo` — latest SDK
- `react-native` — version matching Expo SDK
- `nativewind` — latest supporting the Expo SDK
- `@expo-google-fonts/playfair-display`, `@expo-google-fonts/plus-jakarta-sans` — latest
- shadcn/ui CLI — latest, used to bootstrap `packages/ui/src/components/`
- `lucide-react`, `lucide-react-native` — latest
- `clsx`, `tailwind-merge`, `class-variance-authority` — latest
- `turbo` — latest
- `pnpm` — latest
- `typescript` — latest
- `@typescript-eslint/*`, `eslint`, `prettier`, `eslint-plugin-import` — latest
- `husky`, `lint-staged` — latest

---

## 9. Open Questions for the Implementation Plan

These are resolved during `writing-plans`, not here:

1. **Landing app port numbering** — the spec assumes 3001/3002/3003. The plan should confirm none of these conflict with existing services on the user's machine.
2. **Existing `convex/` folder handling** — the repo already has `convex/_generated/`. The plan must decide whether to delete and regenerate or preserve and upgrade in place.
3. **Existing root `.env.local`** — already exists. The plan must read it first to avoid clobbering anything the user has set.
4. **Existing root `package.json`** — already exists with a lone `convex` dep. The plan must decide whether to rewrite it as the workspace root or preserve its history somehow (likely: rewrite, since it was initial setup).
5. **Husky install compatibility on Windows** — the user's environment is Windows 11 + bash. The plan must verify Husky hooks work in that shell.

---

## 10. Acceptance Criteria

Phase 1 is complete when **all** of the following are true:

- [ ] `pnpm install` at repo root succeeds with no errors or warnings.
- [ ] `pnpm typecheck` at repo root reports zero errors across all packages and apps.
- [ ] `pnpm lint` at repo root reports zero errors across all packages and apps.
- [ ] `pnpm dev` at repo root brings up Convex, mobile, landing, doctor, and admin concurrently without errors.
- [ ] The Convex dashboard shows `users` and `featureFlags` tables; `featureFlags` contains all 7 seeded flags with `value: false`.
- [ ] The mobile app splash screen renders the `onlyou` logo in Playfair Display Black and transitions to the design showcase.
- [ ] Each Next.js app's `/design` route renders all 10 showcase sections listed in §6.1 with no missing fonts, missing styles, or console errors.
- [ ] The mobile `/design` screen renders all 8 sections listed in §6.2.
- [ ] Creating a commit with a deliberate TypeScript error is blocked by the pre-commit hook.
- [ ] `checkpoint.md` exists at repo root and reflects Phase 1 status.
- [ ] Founder visually verifies the showcase on each app and explicitly approves before Phase 2 begins (approval gate per CLAUDE.md).

---

## 11. Reference Documents

Authoritative sources consulted for this spec:

- `CLAUDE.md` — project methodology, stack, rules, build order
- `docs/ONLYOU-SOURCE-OF-TRUTH.md` §9 (tech stack), §10 (monorepo), §12 (consent purposes), §15 (ID formats), §16 (feature flags)
- `docs/DESIGN.md` — complete design system specification
