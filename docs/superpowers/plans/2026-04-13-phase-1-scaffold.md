# Phase 1 — Monorepo Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the onlyou monorepo with Convex, 4 apps (mobile + landing + doctor + admin), 3 shared packages, the Clinical Luxe design system from `docs/DESIGN.md`, and enforced tooling — so every future phase builds into a working, typechecked, lint-clean foundation.

**Architecture:** Turborepo + pnpm workspace. Convex at repo root. 4 apps under `apps/` (latest Expo + 3 latest Next.js). 3 packages under `packages/`: `@onlyou/core` (framework-agnostic tokens/enums/flags/formatters), `@onlyou/ui` (branded shadcn primitives, web-only, Tailwind 4), `@onlyou/config` (TS/ESLint/Prettier bases). Mobile uses Tailwind 3 + NativeWind 4 — consumes the same token values via re-export.

**Tech Stack:** pnpm, Turborepo, TypeScript (strict), Convex, Next.js (latest), Tailwind 4, shadcn/ui (latest), Expo (latest SDK), React Native, NativeWind 4, Playfair Display + Plus Jakarta Sans (Google Fonts), ESLint, Prettier, Husky, lint-staged.

**Source spec:** `docs/superpowers/specs/2026-04-13-phase-1-scaffold-design.md`
**Decisions record:** `docs/decisions/2026-04-13-phase-1-stack-and-scaffold.md`
**Design canonical:** `docs/DESIGN.md`

**Platform note:** User is on Windows 11 + bash. Commands in this plan use forward-slash paths and bash syntax.

---

## Pre-flight — Resolve Versions

Phase 1 pins versions at "latest stable at time of execution." Before Task 1, resolve each of these to an exact version. Write them to a temporary note so every downstream task uses the same values.

- [ ] **Step 1: Query npm registry for each package's latest stable**

Run in any shell (does not modify repo):

```bash
for pkg in \
  convex \
  next react react-dom \
  tailwindcss @tailwindcss/postcss \
  expo react-native nativewind \
  @expo-google-fonts/playfair-display @expo-google-fonts/plus-jakarta-sans \
  expo-router expo-font expo-splash-screen expo-haptics expo-linear-gradient \
  react-native-safe-area-context react-native-reanimated \
  lucide-react lucide-react-native \
  clsx tailwind-merge class-variance-authority \
  turbo pnpm typescript \
  eslint prettier \
  @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  eslint-config-next eslint-plugin-import \
  husky lint-staged \
  ; do
  echo -n "$pkg: "
  npm view "$pkg" version 2>/dev/null || echo "(failed)"
done
```

Expected: Each package prints its latest version. Capture the output.

- [ ] **Step 2: Write resolved versions to a plan-local note**

Create `.planning-versions.tmp.md` at repo root (gitignored via `.tmp.md` pattern added in Phase L) with:

```markdown
# Resolved versions for Phase 1 execution (DO NOT COMMIT)

# Timestamp: <insert from date command>

convex=<version>
next=<version>
react=<version>
react-dom=<version>
...
```

Every subsequent task that writes a `package.json` reads from this file. This locks the entire plan to a consistent snapshot.

- [ ] **Step 3: Spot-check critical compatibilities**

Manually verify the following pairs are compatible (check package README / release notes if uncertain):

- `next` + `react`, `react-dom` — Next.js declares its required React range in its peerDependencies.
- `expo` + `react-native` — Expo SDK pins a specific RN version.
- `expo` + `nativewind` — NativeWind 4.x supports Expo SDK 50+. Confirm it supports the latest SDK at execution time.
- `nativewind` + `tailwindcss` — NativeWind 4.1 requires Tailwind 3.3.x–3.4.x. **Do not bump mobile's tailwindcss to 4.**
- `convex` — Convex's minimum Node version.

If any incompatibility surfaces, **stop and escalate** to the founder with options. Do not silently downgrade.

---

## Phase A — Repo Foundation (Workspace Root)

Sets up the pnpm workspace, Turborepo, shared TypeScript base, and root tooling files. Ends with a working (empty) monorepo.

### Task A1 — Back up and inspect existing repo state

**Files:**

- Inspect: `D:/onlyou2/package.json`
- Inspect: `D:/onlyou2/.env.local`
- Inspect: `D:/onlyou2/convex/_generated/`
- Inspect: `D:/onlyou2/node_modules/`

- [ ] **Step 1: Capture current `.env.local`**

```bash
cp D:/onlyou2/.env.local D:/onlyou2/.env.local.backup
cat D:/onlyou2/.env.local
```

Expected: File exists. Contents are a handful of key=value lines. **Do not modify.** The backup is our safety net.

- [ ] **Step 2: Capture current `package.json`**

```bash
cat D:/onlyou2/package.json
```

Expected: Minimal package.json with only `convex` as a dep. This file will be replaced by the workspace root package.json in Task A2.

- [ ] **Step 3: Inventory existing convex state**

```bash
ls -la D:/onlyou2/convex/
ls -la D:/onlyou2/convex/_generated/ 2>&1 | head -20
```

Expected: `convex/_generated/` exists but has no schema.ts, auth.config.ts, users.ts, or featureFlags.ts. This folder will be preserved and regenerated in Phase D.

- [ ] **Step 4: Remove stale `node_modules/` and lockfile**

```bash
rm -rf D:/onlyou2/node_modules D:/onlyou2/package-lock.json
```

Expected: Both removed cleanly. The workspace root in Task A2 will use pnpm, not npm.

- [ ] **Step 5: Commit the `.env.local` backup intent (not the file)**

Don't commit `.env.local.backup` — add it to `.gitignore` in Task A5. Skip commit for this task; changes are destructive-cleanup and roll forward into Task A2.

### Task A2 — Write root `package.json`

**Files:**

- Create (replace): `D:/onlyou2/package.json`

- [ ] **Step 1: Write the workspace root package.json**

Replace entire contents of `D:/onlyou2/package.json` with:

```json
{
  "name": "onlyou",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@<pnpm-version>",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\" --ignore-path .gitignore",
    "format:check": "prettier --check \"**/*.{ts,tsx,md,json}\" --ignore-path .gitignore",
    "clean": "turbo run clean && rm -rf node_modules .turbo",
    "prepare": "husky"
  },
  "devDependencies": {
    "turbo": "<turbo-version>",
    "typescript": "<typescript-version>",
    "prettier": "<prettier-version>",
    "husky": "<husky-version>",
    "lint-staged": "<lint-staged-version>"
  }
}
```

Replace `<pnpm-version>`, `<turbo-version>`, etc. with the exact resolved versions from `.planning-versions.tmp.md`.

- [ ] **Step 2: Verify JSON is valid**

```bash
cat D:/onlyou2/package.json | node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))" && echo OK
```

Expected: `OK`. No JSON parse errors.

### Task A3 — Write `pnpm-workspace.yaml`

**Files:**

- Create: `D:/onlyou2/pnpm-workspace.yaml`

- [ ] **Step 1: Write workspace manifest**

Create `D:/onlyou2/pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

This tells pnpm which folders contain workspace packages. `convex/` is deliberately excluded — it's not a workspace package, it's Convex's own function root.

### Task A4 — Write `.npmrc`

**Files:**

- Create: `D:/onlyou2/.npmrc`

- [ ] **Step 1: Write .npmrc**

Create `D:/onlyou2/.npmrc`:

```
node-linker=hoisted
strict-peer-dependencies=false
auto-install-peers=true
shamefully-hoist=false
```

`node-linker=hoisted` is required for React Native / Metro bundler to resolve workspace packages. Matches `ONLYOU-SOURCE-OF-TRUTH.md` §9.

### Task A5 — Update `.gitignore`

**Files:**

- Modify: `D:/onlyou2/.gitignore`

- [ ] **Step 1: Read current `.gitignore`**

```bash
cat D:/onlyou2/.gitignore
```

Expected: Contains `.env.local`, `.obsidian`, `.superpowers/`.

- [ ] **Step 2: Append monorepo entries**

Append to `D:/onlyou2/.gitignore`:

```
# Dependencies
node_modules/

# Build outputs
dist/
build/
out/
.next/
.expo/
.turbo/
*.tsbuildinfo

# Env files (beyond .env.local)
.env*.local
.env.local.backup

# Plan-local tmp notes
*.tmp.md

# Native builds (Expo prebuild)
ios/
android/

# IDE
.vscode/
.idea/
```

- [ ] **Step 3: Verify `.gitignore` total contents**

```bash
cat D:/onlyou2/.gitignore
```

Expected: Contains both the original entries (`.env.local`, `.obsidian`, `.superpowers/`) and all the new entries above.

### Task A6 — Write `tsconfig.base.json`

**Files:**

- Create: `D:/onlyou2/tsconfig.base.json`

- [ ] **Step 1: Write root TypeScript base config**

Create `D:/onlyou2/tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "jsx": "preserve",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true,
    "isolatedModules": true
  },
  "exclude": ["node_modules", "dist", "build", ".next", ".expo", ".turbo"]
}
```

This is the root base. `@onlyou/config/tsconfig/next.json` and `@onlyou/config/tsconfig/expo.json` will extend it in Phase B.

### Task A7 — Write `turbo.json`

**Files:**

- Create: `D:/onlyou2/turbo.json`

- [ ] **Step 1: Write Turborepo pipeline config**

Create `D:/onlyou2/turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "stream",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": ["*.tsbuildinfo"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

`"ui": "stream"` prefers streaming logs over the TUI — on Windows it's more reliable.

### Task A8 — Commit Phase A

- [ ] **Step 1: Stage and commit**

```bash
cd D:/onlyou2
git add package.json pnpm-workspace.yaml .npmrc .gitignore tsconfig.base.json turbo.json
git commit -m "$(cat <<'EOF'
chore(phase-1/a): workspace root — pnpm, turborepo, tsconfig base

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Verify commit**

```bash
git log -1 --stat
```

Expected: Commit exists. Files listed: `.gitignore`, `.npmrc`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `turbo.json`.

---

## Phase B — `packages/config`

Central tooling package. Every app extends these so TS/ESLint/Prettier rules live in one place.

### Task B1 — `packages/config/package.json`

**Files:**

- Create: `D:/onlyou2/packages/config/package.json`

- [ ] **Step 1: Create directory**

```bash
mkdir -p D:/onlyou2/packages/config/tsconfig D:/onlyou2/packages/config/eslint
```

- [ ] **Step 2: Write package.json**

Create `D:/onlyou2/packages/config/package.json`:

```json
{
  "name": "@onlyou/config",
  "version": "0.0.0",
  "private": true,
  "main": "index.js",
  "files": ["tsconfig", "eslint", "prettier.config.js"],
  "exports": {
    "./tsconfig/base.json": "./tsconfig/base.json",
    "./tsconfig/next.json": "./tsconfig/next.json",
    "./tsconfig/expo.json": "./tsconfig/expo.json",
    "./tsconfig/convex.json": "./tsconfig/convex.json",
    "./eslint/base": "./eslint/base.js",
    "./eslint/next": "./eslint/next.js",
    "./eslint/expo": "./eslint/expo.js",
    "./prettier.config.js": "./prettier.config.js"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "<version>",
    "@typescript-eslint/parser": "<version>",
    "eslint": "<version>",
    "eslint-config-next": "<version>",
    "eslint-plugin-import": "<version>",
    "prettier": "<version>",
    "typescript": "<version>"
  }
}
```

Substitute versions from `.planning-versions.tmp.md`.

### Task B2 — Shared TS configs

**Files:**

- Create: `D:/onlyou2/packages/config/tsconfig/base.json`
- Create: `D:/onlyou2/packages/config/tsconfig/next.json`
- Create: `D:/onlyou2/packages/config/tsconfig/expo.json`
- Create: `D:/onlyou2/packages/config/tsconfig/convex.json`

- [ ] **Step 1: Write `tsconfig/base.json`**

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "composite": false,
    "declaration": false,
    "declarationMap": false,
    "sourceMap": true
  }
}
```

Relative `extends` path goes up from `packages/config/tsconfig/` to repo root `tsconfig.base.json`. Three `../` steps.

- [ ] **Step 2: Write `tsconfig/next.json`**

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "noEmit": true,
    "jsx": "preserve",
    "plugins": [{ "name": "next" }]
  }
}
```

- [ ] **Step 3: Write `tsconfig/expo.json`**

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["esnext"],
    "jsx": "react-native",
    "moduleResolution": "bundler",
    "noEmit": true,
    "types": ["expo", "react-native"]
  }
}
```

- [ ] **Step 4: Write `tsconfig/convex.json`**

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "jsx": "preserve"
  }
}
```

### Task B3 — Shared ESLint configs (flat config)

**Files:**

- Create: `D:/onlyou2/packages/config/eslint/base.js`
- Create: `D:/onlyou2/packages/config/eslint/next.js`
- Create: `D:/onlyou2/packages/config/eslint/expo.js`

- [ ] **Step 1: Write `eslint/base.js`**

```js
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";

export default [
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-expect-error": "allow-with-description",
          minimumDescriptionLength: 10,
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/.expo/**",
      "**/.turbo/**",
      "**/_generated/**",
    ],
  },
];
```

- [ ] **Step 2: Write `eslint/next.js`**

```js
import base from "./base.js";

export default [
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Next-specific tightening can go here
    },
  },
];
```

(Note: `eslint-config-next` is FlatCompat-only at time of writing. Keeping this config minimal and letting `next lint` handle Next.js-specific rules in CI is fine for Phase 1.)

- [ ] **Step 3: Write `eslint/expo.js`**

```js
import base from "./base.js";

export default [
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Expo/RN-specific rules can go here
    },
  },
];
```

### Task B4 — Shared Prettier config

**Files:**

- Create: `D:/onlyou2/packages/config/prettier.config.js`

- [ ] **Step 1: Write Prettier config**

```js
export default {
  semi: true,
  singleQuote: true,
  trailingComma: "all",
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  bracketSpacing: true,
  arrowParens: "always",
  endOfLine: "lf",
};
```

`endOfLine: 'lf'` normalizes line endings on Windows checkouts.

### Task B5 — Commit Phase B

- [ ] **Step 1: Stage and commit**

```bash
cd D:/onlyou2
git add packages/config
git commit -m "$(cat <<'EOF'
chore(phase-1/b): packages/config — shared ts/eslint/prettier bases

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase C — `packages/core`

Framework-agnostic shared code: design tokens, enums, feature flags, formatters. No React, no RN, no DOM types.

### Task C1 — Package manifest and tsconfig

**Files:**

- Create: `D:/onlyou2/packages/core/package.json`
- Create: `D:/onlyou2/packages/core/tsconfig.json`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p D:/onlyou2/packages/core/src/tokens \
         D:/onlyou2/packages/core/src/enums \
         D:/onlyou2/packages/core/src/flags \
         D:/onlyou2/packages/core/src/formatters
```

- [ ] **Step 2: Write package.json**

```json
{
  "name": "@onlyou/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./tokens": "./src/tokens/index.ts",
    "./tokens/colors": "./src/tokens/colors.ts",
    "./tokens/typography": "./src/tokens/typography.ts",
    "./tokens/spacing": "./src/tokens/spacing.ts",
    "./tokens/radii": "./src/tokens/radii.ts",
    "./tokens/shadows": "./src/tokens/shadows.ts",
    "./tokens/animations": "./src/tokens/animations.ts",
    "./tokens/z-index": "./src/tokens/z-index.ts",
    "./enums": "./src/enums/index.ts",
    "./flags": "./src/flags/index.ts",
    "./formatters": "./src/formatters/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "clean": "rm -rf .turbo *.tsbuildinfo"
  },
  "devDependencies": {
    "@onlyou/config": "workspace:*",
    "typescript": "<version>"
  }
}
```

- [ ] **Step 3: Write tsconfig.json**

```json
{
  "extends": "@onlyou/config/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2022"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### Task C2 — `tokens/colors.ts`

**Files:**

- Create: `D:/onlyou2/packages/core/src/tokens/colors.ts`

- [ ] **Step 1: Write colors file**

Translate DESIGN.md §2 verbatim. This file is the canonical source for every color value in the project.

```ts
export const colors = {
  // Core palette (DESIGN.md §2.1)
  primary: "#141414",
  primaryForeground: "#FFFFFF",
  secondary: "#F8F8F6",
  offWhite: "#F8F8F6",
  background: "#FAFAF8",
  surface: "#FAFAF8",
  white: "#FFFFFF",

  // Primary scale — warm grays (§2.2)
  primaryScale: {
    50: "#F5F5F5",
    100: "#E8E8E8",
    200: "#D1D1D1",
    300: "#ABABAB",
    400: "#8A8A8A",
    500: "#5C5C5C",
    600: "#3D3D3D",
    700: "#2A2A2A",
    800: "#1A1A1A",
    900: "#141414",
  },

  // Text hierarchy (§2.3)
  textPrimary: "#141414",
  textSecondary: "#5C5C5C",
  textTertiary: "#8A8A8A",
  textMuted: "#ABABAB",
  textInverse: "#FFFFFF",

  // Interactive / CTA (§2.4)
  ctaPrimary: "#141414",
  ctaPrimaryText: "#FFFFFF",
  ctaDisabled: "#E0E0E0",
  ctaDisabledText: "#ABABAB",
  ctaSecondary: "#FFFFFF",
  ctaSecondaryBorder: "#DCDCDC",

  // Accent (§2.5)
  accent: "#9B8EC4",
  accentLight: "#F0EDF7",
  accentWarm: "#C4956B",
  warm: "#C4956B",

  // Accent scale (§2.5)
  accentScale: {
    50: "#F0EDF7",
    100: "#E4DFF0",
    200: "#D0C8E4",
    300: "#BDB2D8",
    400: "#9B8EC4",
    500: "#8577B0",
    600: "#6F619C",
    700: "#5A4E80",
    800: "#453C63",
    900: "#302A46",
  },

  // Borders (§2.6)
  border: "#EBEBEB",
  borderLight: "#F2F2F2",
  borderFocus: "#9B8EC4",
  input: "#EBEBEB",
  ring: "#9B8EC4",

  // Semantic / Status (§2.7)
  success: "#2D9F5D",
  successBg: "#F0F9F3",
  warning: "#D4880F",
  warningBg: "#FFF8ED",
  error: "#CC3333",
  errorBg: "#FDF2F2",
  info: "#0284C7",
  infoBg: "#E0F2FE",

  // Chart (§2.8)
  chart1: "#9B8EC4",
  chart2: "#C4956B",
  chart3: "#2D9F5D",
  chart4: "#7E86AD",
  chart5: "#AD7E8E",
} as const;

export type Colors = typeof colors;
```

### Task C3 — `tokens/typography.ts`

**Files:**

- Create: `D:/onlyou2/packages/core/src/tokens/typography.ts`

- [ ] **Step 1: Write typography file**

```ts
export const fontFamilies = {
  serif: "Playfair Display",
  sans: "Plus Jakarta Sans",
} as const;

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 900,
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  "5xl": 36,
  "6xl": 48,
  "7xl": 56,
  "8xl": 72,
  logo: 36,
} as const;

export const lineHeights = {
  tight: 1.1,
  snug: 1.2,
  normal: 1.5,
  relaxed: 1.6,
  loose: 1.8,
} as const;

export const letterSpacing = {
  tighter: -1.5,
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const;

export type FontFamily = keyof typeof fontFamilies;
export type FontWeight = keyof typeof fontWeights;
export type FontSize = keyof typeof fontSizes;
```

### Task C4 — `tokens/spacing.ts`

**Files:**

- Create: `D:/onlyou2/packages/core/src/tokens/spacing.ts`

- [ ] **Step 1: Write spacing file**

```ts
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
} as const;

export type Spacing = keyof typeof spacing;
```

### Task C5 — `tokens/radii.ts`

**Files:**

- Create: `D:/onlyou2/packages/core/src/tokens/radii.ts`

- [ ] **Step 1: Write radii file**

```ts
export const radii = {
  none: 0,
  sm: 6,
  md: 8,
  base: 10,
  lg: 12,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  full: 9999,
} as const;

export type Radius = keyof typeof radii;
```

### Task C6 — `tokens/shadows.ts`

**Files:**

- Create: `D:/onlyou2/packages/core/src/tokens/shadows.ts`

- [ ] **Step 1: Write shadows file**

```ts
type WebShadow = string;
type NativeShadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

type Shadow = { web: WebShadow; native: NativeShadow };

export const shadows: Record<
  "none" | "xs" | "sm" | "md" | "lg" | "xl",
  Shadow
> = {
  none: {
    web: "none",
    native: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
  },
  xs: {
    web: "0 1px 2px rgba(0, 0, 0, 0.04)",
    native: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
  },
  sm: {
    web: "0 1px 3px rgba(0, 0, 0, 0.06)",
    native: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
  },
  md: {
    web: "0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)",
    native: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
  },
  lg: {
    web: "0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
    native: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
      elevation: 8,
    },
  },
  xl: {
    web: "0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06)",
    native: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.12,
      shadowRadius: 48,
      elevation: 16,
    },
  },
};

export type ShadowKey = keyof typeof shadows;
```

### Task C7 — `tokens/animations.ts` and `tokens/z-index.ts`

**Files:**

- Create: `D:/onlyou2/packages/core/src/tokens/animations.ts`
- Create: `D:/onlyou2/packages/core/src/tokens/z-index.ts`

- [ ] **Step 1: Write animations file**

```ts
export const durations = {
  instant: 0,
  fast: 150,
  base: 200,
  slow: 300,
  slower: 500,
} as const;

export const easings = {
  linear: "linear",
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
} as const;

export type Duration = keyof typeof durations;
export type Easing = keyof typeof easings;
```

- [ ] **Step 2: Write z-index file**

```ts
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  overlay: 1200,
  modal: 1300,
  popover: 1400,
  toast: 1500,
  tooltip: 1600,
} as const;

export type ZIndex = keyof typeof zIndex;
```

### Task C8 — `tokens/index.ts`

**Files:**

- Create: `D:/onlyou2/packages/core/src/tokens/index.ts`

- [ ] **Step 1: Write barrel export**

```ts
export * from "./colors";
export * from "./typography";
export * from "./spacing";
export * from "./radii";
export * from "./shadows";
export * from "./animations";
export * from "./z-index";
```

### Task C9 — `enums/` — all enums from SOURCE-OF-TRUTH §2-4, §12

**Files:**

- Create: `D:/onlyou2/packages/core/src/enums/consultation-status.ts`
- Create: `D:/onlyou2/packages/core/src/enums/roles.ts`
- Create: `D:/onlyou2/packages/core/src/enums/subscription.ts`
- Create: `D:/onlyou2/packages/core/src/enums/order-status.ts`
- Create: `D:/onlyou2/packages/core/src/enums/lab-order-status.ts`
- Create: `D:/onlyou2/packages/core/src/enums/nurse-visit-status.ts`
- Create: `D:/onlyou2/packages/core/src/enums/prescription-status.ts`
- Create: `D:/onlyou2/packages/core/src/enums/payment-status.ts`
- Create: `D:/onlyou2/packages/core/src/enums/refund.ts`
- Create: `D:/onlyou2/packages/core/src/enums/consent-purpose.ts`
- Create: `D:/onlyou2/packages/core/src/enums/condition.ts`
- Create: `D:/onlyou2/packages/core/src/enums/index.ts`

- [ ] **Step 1: Write `consultation-status.ts`**

Values copied verbatim from `ONLYOU-SOURCE-OF-TRUTH.md` §2 (22 statuses). No renames. No additions.

```ts
export const CONSULTATION_STATUSES = [
  "SUBMITTED",
  "AI_PROCESSING",
  "AI_FAILED",
  "AI_COMPLETE",
  "ASSIGNED",
  "REVIEWING",
  "MORE_INFO_REQUESTED",
  "LAB_ORDERED",
  "PRESCRIBED",
  "AWAITING_PAYMENT",
  "EXPIRED_UNPAID",
  "REFERRED",
  "DECLINED",
  "PAYMENT_COMPLETE",
  "PHARMACY_PROCESSING",
  "DISPATCHED",
  "DELIVERED",
  "TREATMENT_ACTIVE",
  "FOLLOW_UP_DUE",
  "COMPLETED",
  "CANCELLED",
  "ABANDONED",
] as const;

export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];
```

- [ ] **Step 2: Write `roles.ts`**

```ts
export const ROLES = [
  "PATIENT",
  "DOCTOR",
  "ADMIN",
  "NURSE",
  "LAB_TECH",
  "PHARMACY_STAFF",
] as const;
export type Role = (typeof ROLES)[number];
```

- [ ] **Step 3: Write `subscription.ts`**

```ts
export const SUBSCRIPTION_PLANS = [
  "MONTHLY",
  "QUARTERLY",
  "SIX_MONTH",
] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_STATUSES = [
  "CREATED",
  "ACTIVE",
  "PAUSED",
  "HALTED",
  "CANCELLED",
  "EXPIRED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
```

- [ ] **Step 4: Write `order-status.ts`**

```ts
export const ORDER_STATUSES = [
  "CREATED",
  "SENT_TO_PHARMACY",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "PHARMACY_ISSUE",
  "DELIVERY_FAILED",
  "REASSIGNED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
```

- [ ] **Step 5: Write `lab-order-status.ts`**

```ts
export const LAB_ORDER_STATUSES = [
  "ORDERED",
  "SLOT_BOOKED",
  "NURSE_ASSIGNED",
  "NURSE_EN_ROUTE",
  "NURSE_ARRIVED",
  "SAMPLE_COLLECTED",
  "AT_LAB",
  "SAMPLE_RECEIVED",
  "PROCESSING",
  "RESULTS_UPLOADED",
  "RESULTS_READY",
  "DOCTOR_REVIEWED",
  "CLOSED",
  "COLLECTION_FAILED",
  "SAMPLE_ISSUE",
  "RECOLLECTION_NEEDED",
  "CANCELLED",
] as const;

export type LabOrderStatus = (typeof LAB_ORDER_STATUSES)[number];

export const LAB_PAYMENT_STATUSES = [
  "PENDING",
  "WAIVED_INITIAL",
  "INCLUDED",
  "PAID",
] as const;
export type LabPaymentStatus = (typeof LAB_PAYMENT_STATUSES)[number];
```

- [ ] **Step 6: Write `nurse-visit-status.ts`**

```ts
export const NURSE_VISIT_STATUSES = [
  "SCHEDULED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type NurseVisitStatus = (typeof NURSE_VISIT_STATUSES)[number];
```

- [ ] **Step 7: Write `prescription-status.ts`**

```ts
export const PRESCRIPTION_STATUSES = [
  "CREATED",
  "SIGNED",
  "SENT_TO_PHARMACY",
  "FULFILLED",
  "EXPIRED",
  "CANCELLED",
] as const;

export type PrescriptionStatus = (typeof PRESCRIPTION_STATUSES)[number];
```

- [ ] **Step 8: Write `payment-status.ts`**

```ts
export const PAYMENT_STATUSES = [
  "CREATED",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
```

- [ ] **Step 9: Write `refund.ts`**

```ts
export const REFUND_SOURCES = [
  "DOCTOR_INITIATED",
  "PATIENT_CANCELLATION",
  "PLATFORM_FAULT",
] as const;
export type RefundSource = (typeof REFUND_SOURCES)[number];

export const REFUND_DESTINATIONS = ["WALLET", "ORIGINAL_PAYMENT"] as const;
export type RefundDestination = (typeof REFUND_DESTINATIONS)[number];

export const REFUND_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "PROCESSING",
  "COMPLETED",
] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];
```

- [ ] **Step 10: Write `consent-purpose.ts`**

Values from SOURCE-OF-TRUTH §12 (6 purposes, not 4).

```ts
export const CONSENT_PURPOSES = [
  "TELECONSULTATION",
  "PRESCRIPTION_PHARMACY",
  "LAB_PROCESSING",
  "HEALTH_DATA_ANALYTICS",
  "MARKETING_COMMUNICATIONS",
  "PHOTO_AI_PROCESSING",
] as const;

export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];
```

- [ ] **Step 11: Write `condition.ts`**

```ts
export const CONDITIONS = ["HAIR_LOSS", "ED", "PE", "WEIGHT", "PCOS"] as const;
export type Condition = (typeof CONDITIONS)[number];
```

- [ ] **Step 12: Write `enums/index.ts`**

```ts
export * from "./consultation-status";
export * from "./roles";
export * from "./subscription";
export * from "./order-status";
export * from "./lab-order-status";
export * from "./nurse-visit-status";
export * from "./prescription-status";
export * from "./payment-status";
export * from "./refund";
export * from "./consent-purpose";
export * from "./condition";
```

### Task C10 — `flags/`

**Files:**

- Create: `D:/onlyou2/packages/core/src/flags/index.ts`

- [ ] **Step 1: Write feature flags file**

Values from SOURCE-OF-TRUTH §16 (all 7, all `false` at MVP).

```ts
export const FEATURE_FLAGS = [
  "VIDEO_CONSULTATION_ENABLED",
  "THIRD_PARTY_LAB_APIS",
  "SHIPROCKET_DELHIVERY",
  "COLD_CHAIN_TRACKING",
  "FACE_MATCH_VERIFICATION",
  "ABHA_INTEGRATION",
  "GPS_CHECKIN_NURSES",
] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  VIDEO_CONSULTATION_ENABLED: false,
  THIRD_PARTY_LAB_APIS: false,
  SHIPROCKET_DELHIVERY: false,
  COLD_CHAIN_TRACKING: false,
  FACE_MATCH_VERIFICATION: false,
  ABHA_INTEGRATION: false,
  GPS_CHECKIN_NURSES: false,
};

export function isEnabled(
  flags: Record<FeatureFlag, boolean>,
  flag: FeatureFlag,
): boolean {
  return flags[flag] === true;
}
```

### Task C11 — `formatters/`

**Files:**

- Create: `D:/onlyou2/packages/core/src/formatters/rupees.ts`
- Create: `D:/onlyou2/packages/core/src/formatters/date.ts`
- Create: `D:/onlyou2/packages/core/src/formatters/phone.ts`
- Create: `D:/onlyou2/packages/core/src/formatters/ids.ts`
- Create: `D:/onlyou2/packages/core/src/formatters/index.ts`

- [ ] **Step 1: Write `rupees.ts`**

```ts
/**
 * Format a paise amount as an Indian Rupee string.
 * SOURCE-OF-TRUTH §5: all amounts stored in paise (integer). Never rupees. Never floats.
 */
export function formatRupees(paise: number): string {
  if (!Number.isFinite(paise) || !Number.isInteger(paise)) {
    throw new Error("formatRupees expects an integer paise value");
  }
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}
```

- [ ] **Step 2: Write `date.ts`**

```ts
/**
 * Format a timestamp (ms since epoch) in Indian Standard Time.
 * Default format: "12 Apr 2026, 3:45 PM"
 */
export function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(ms));
}

export function formatDateShort(ms: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(ms));
}
```

- [ ] **Step 3: Write `phone.ts`**

```ts
/**
 * Format an Indian mobile number as "+91 98xxx xxxxx".
 * Accepts 10-digit or +91-prefixed input.
 */
export function formatPhoneIN(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    const ten = digits.slice(2);
    return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
  }
  return raw;
}
```

- [ ] **Step 4: Write `ids.ts`**

Values from SOURCE-OF-TRUTH §15.

```ts
/**
 * Format a sample ID for display to lab techs.
 * Pattern: ONY-{YEAR}-{SEQ_4_DIGIT} → ONY-2026-0042
 */
export function formatSampleId(year: number, seq: number): string {
  return `ONY-${year}-${seq.toString().padStart(4, "0")}`;
}

/**
 * Format an order ID for display to pharmacy staff.
 * Pattern: ORD-{SEQ_6_DIGIT} → ORD-001234
 */
export function formatOrderId(seq: number): string {
  return `ORD-${seq.toString().padStart(6, "0")}`;
}

/**
 * Format an anonymous patient ID for display to pharmacy staff.
 * Pattern: ONY-P-{SEQ} → ONY-P-0045
 */
export function formatPatientId(seq: number): string {
  return `ONY-P-${seq.toString().padStart(4, "0")}`;
}
```

- [ ] **Step 5: Write `formatters/index.ts`**

```ts
export * from "./rupees";
export * from "./date";
export * from "./phone";
export * from "./ids";
```

### Task C12 — Root `src/index.ts`

**Files:**

- Create: `D:/onlyou2/packages/core/src/index.ts`

- [ ] **Step 1: Write barrel**

```ts
export * from "./tokens";
export * from "./enums";
export * from "./flags";
export * from "./formatters";
```

### Task C13 — Commit Phase C

- [ ] **Step 1: Stage and commit**

```bash
cd D:/onlyou2
git add packages/core
git commit -m "$(cat <<'EOF'
feat(phase-1/c): packages/core — tokens, enums, flags, formatters

Translates DESIGN.md color/typography/spacing/shadow/radius tokens to TS
constants. Enums match ONLYOU-SOURCE-OF-TRUTH §2-4, §12. Feature flags
seeded from §16. Formatters for rupees (paise), dates (IST), phone,
sample/order/patient IDs.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase D — Convex Backend

Upgrade the existing bare `convex/` folder and add the minimal Phase 1 schema.

### Task D1 — Upgrade convex dependency and initialize dev deployment

**Files:**

- Modify: `D:/onlyou2/package.json` (add convex dev dep — or keep in convex/ package? Convex CLI expects it at root.)

- [ ] **Step 1: Add `convex` to root package.json**

Edit `D:/onlyou2/package.json` and add to `devDependencies`:

```json
"convex": "<convex-version>"
```

Resolved version from `.planning-versions.tmp.md`.

- [ ] **Step 2: Delete stale `_generated/` folder**

The spec §9 Q2 identified this as an open decision. Decision: delete and let `convex dev` regenerate against the new schema.

```bash
rm -rf D:/onlyou2/convex/_generated
```

- [ ] **Step 3: Do NOT run `pnpm install` yet**

Installs happen once at the end of Phase E (after packages/ui is set up) to avoid resolver churn. For now, just write files.

### Task D2 — `convex/schema.ts`

**Files:**

- Create: `D:/onlyou2/convex/schema.ts`

- [ ] **Step 1: Write schema**

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { ROLES } from "../packages/core/src/enums/roles";

const roleValidator = v.union(...ROLES.map((r) => v.literal(r)));

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    role: roleValidator,
    createdAt: v.number(),
  }).index("by_phone", ["phone"]),

  featureFlags: defineTable({
    key: v.string(),
    value: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
```

Note the **relative import** from `../packages/core/src/enums/roles`. Convex does not resolve workspace-package aliases during function bundling; it resolves file paths. This is a known Convex quirk. Future phases may add a convex-specific import shim if this becomes painful.

- [ ] **Step 2: Create `convex/tsconfig.json`**

Create `D:/onlyou2/convex/tsconfig.json`:

```json
{
  "extends": "@onlyou/config/tsconfig/convex.json",
  "compilerOptions": {
    "outDir": "_generated"
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules", "_generated"]
}
```

### Task D3 — `convex/auth.config.ts` (empty placeholder)

**Files:**

- Create: `D:/onlyou2/convex/auth.config.ts`

- [ ] **Step 1: Write placeholder**

```ts
/**
 * Auth providers will be wired in Phase 2 (patient app shell — login screen).
 * For Phase 1, this file exists so Convex knows the project structure supports
 * auth configuration. No providers are active.
 */
export default {
  providers: [],
};
```

### Task D4 — `convex/users.ts`

**Files:**

- Create: `D:/onlyou2/convex/users.ts`

- [ ] **Step 1: Write users module**

```ts
import { query } from "./_generated/server";

/**
 * Returns the current authenticated user, or null.
 * Phase 1 returns null unconditionally (auth not wired until Phase 2).
 */
export const getCurrentUser = query({
  args: {},
  handler: async () => {
    return null;
  },
});
```

Note: This imports from `./_generated/server` which doesn't exist yet — it will be created when `convex dev` runs for the first time in Task D6.

### Task D5 — `convex/featureFlags.ts`

**Files:**

- Create: `D:/onlyou2/convex/featureFlags.ts`

- [ ] **Step 1: Write feature flags module**

```ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  FEATURE_FLAGS,
  DEFAULT_FLAGS,
  type FeatureFlag,
} from "../packages/core/src/flags";

/**
 * Returns all feature flags as a Record<flag, boolean>.
 * Reads from the featureFlags table; falls back to DEFAULT_FLAGS for any missing.
 */
export const getFlags = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("featureFlags").collect();
    const result: Record<string, boolean> = { ...DEFAULT_FLAGS };
    for (const row of rows) {
      if (FEATURE_FLAGS.includes(row.key as FeatureFlag)) {
        result[row.key] = row.value;
      }
    }
    return result;
  },
});

/**
 * Seed all 7 flags with their default values. Idempotent — skips flags that already exist.
 * Called manually from the Convex dashboard after first deploy.
 */
export const seedFlags = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    for (const key of FEATURE_FLAGS) {
      const existing = await ctx.db
        .query("featureFlags")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (!existing) {
        await ctx.db.insert("featureFlags", {
          key,
          value: DEFAULT_FLAGS[key],
          updatedAt: now,
        });
      }
    }
    return { seeded: FEATURE_FLAGS.length };
  },
});
```

### Task D6 — Run Convex dev to generate `_generated/` (deferred to Phase K)

Convex requires network auth for `npx convex dev` first run. This is the first task that needs the founder's hands-on involvement. Deferred to the Phase K verification pass, where we walk through it interactively.

Leave the files written; they'll typecheck-fail until `_generated/` is regenerated in Phase K. Acknowledge this in the commit message.

### Task D7 — Commit Phase D

- [ ] **Step 1: Stage and commit**

```bash
cd D:/onlyou2
git add convex package.json
git commit -m "$(cat <<'EOF'
feat(phase-1/d): convex — schema, users, featureFlags, auth placeholder

Minimal Phase 1 schema: users (role-gated) + featureFlags. Seeds 7 MVP
flags from SOURCE-OF-TRUTH §16, all false. Auth config is an empty
placeholder — Phase 2 wires Gupshup phone OTP.

Note: _generated/ will be regenerated in Phase K verification pass
(requires npx convex dev first-run auth).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase E — `packages/ui` (Tailwind 4 + branded shadcn primitives)

### Task E1 — Package manifest

**Files:**

- Create: `D:/onlyou2/packages/ui/package.json`
- Create: `D:/onlyou2/packages/ui/tsconfig.json`

- [ ] **Step 1: Create directories**

```bash
mkdir -p D:/onlyou2/packages/ui/src/styles \
         D:/onlyou2/packages/ui/src/components \
         D:/onlyou2/packages/ui/src/components/onlyou \
         D:/onlyou2/packages/ui/src/lib
```

- [ ] **Step 2: Write package.json**

```json
{
  "name": "@onlyou/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./globals.css": "./src/styles/globals.css",
    "./button": "./src/components/button.tsx",
    "./input": "./src/components/input.tsx",
    "./card": "./src/components/card.tsx",
    "./badge": "./src/components/badge.tsx",
    "./dialog": "./src/components/dialog.tsx",
    "./toast": "./src/components/toast.tsx",
    "./otp-input": "./src/components/otp-input.tsx",
    "./skeleton": "./src/components/skeleton.tsx",
    "./empty-state": "./src/components/empty-state.tsx",
    "./error-state": "./src/components/error-state.tsx",
    "./logo": "./src/components/onlyou/logo.tsx",
    "./lib/cn": "./src/lib/cn.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "clean": "rm -rf .turbo *.tsbuildinfo"
  },
  "dependencies": {
    "@onlyou/core": "workspace:*",
    "class-variance-authority": "<version>",
    "clsx": "<version>",
    "lucide-react": "<version>",
    "tailwind-merge": "<version>"
  },
  "devDependencies": {
    "@onlyou/config": "workspace:*",
    "@types/react": "<version>",
    "@types/react-dom": "<version>",
    "react": "<version>",
    "react-dom": "<version>",
    "tailwindcss": "<version>",
    "typescript": "<version>"
  },
  "peerDependencies": {
    "react": "<version>",
    "react-dom": "<version>"
  }
}
```

- [ ] **Step 3: Write tsconfig.json**

```json
{
  "extends": "@onlyou/config/tsconfig/next.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["dom", "dom.iterable", "esnext"],
    "types": ["react", "react-dom"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### Task E2 — `lib/cn.ts`

**Files:**

- Create: `D:/onlyou2/packages/ui/src/lib/cn.ts`

- [ ] **Step 1: Write cn helper**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

### Task E3 — `styles/globals.css` (Tailwind 4 `@theme` block)

**Files:**

- Create: `D:/onlyou2/packages/ui/src/styles/globals.css`

- [ ] **Step 1: Write Tailwind 4 CSS with `@theme`**

Translates `@onlyou/core` tokens into Tailwind 4 CSS custom properties. Any Next.js app that imports this gets the full design token set as Tailwind utilities (`bg-primary`, `text-accent`, etc.) and raw CSS variables.

```css
@import "tailwindcss";

@theme {
  /* Colors — core palette (DESIGN.md §2.1) */
  --color-primary: #141414;
  --color-primary-foreground: #ffffff;
  --color-background: #fafaf8;
  --color-surface: #fafaf8;
  --color-off-white: #f8f8f6;

  /* Primary scale (§2.2) */
  --color-primary-50: #f5f5f5;
  --color-primary-100: #e8e8e8;
  --color-primary-200: #d1d1d1;
  --color-primary-300: #ababab;
  --color-primary-400: #8a8a8a;
  --color-primary-500: #5c5c5c;
  --color-primary-600: #3d3d3d;
  --color-primary-700: #2a2a2a;
  --color-primary-800: #1a1a1a;
  --color-primary-900: #141414;

  /* Text (§2.3) */
  --color-text-primary: #141414;
  --color-text-secondary: #5c5c5c;
  --color-text-tertiary: #8a8a8a;
  --color-text-muted: #ababab;
  --color-text-inverse: #ffffff;

  /* Accent (§2.5) */
  --color-accent: #9b8ec4;
  --color-accent-light: #f0edf7;
  --color-accent-50: #f0edf7;
  --color-accent-100: #e4dff0;
  --color-accent-200: #d0c8e4;
  --color-accent-300: #bdb2d8;
  --color-accent-400: #9b8ec4;
  --color-accent-500: #8577b0;
  --color-accent-600: #6f619c;
  --color-accent-700: #5a4e80;
  --color-accent-800: #453c63;
  --color-accent-900: #302a46;
  --color-warm: #c4956b;

  /* Borders (§2.6) */
  --color-border: #ebebeb;
  --color-border-light: #f2f2f2;
  --color-border-focus: #9b8ec4;
  --color-ring: #9b8ec4;

  /* Semantic (§2.7) */
  --color-success: #2d9f5d;
  --color-success-bg: #f0f9f3;
  --color-warning: #d4880f;
  --color-warning-bg: #fff8ed;
  --color-error: #cc3333;
  --color-error-bg: #fdf2f2;
  --color-info: #0284c7;
  --color-info-bg: #e0f2fe;

  /* Fonts */
  --font-serif: "Playfair Display", Georgia, serif;
  --font-sans: "Plus Jakarta Sans", -apple-system, sans-serif;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-base: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-3xl: 24px;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06);
}

/* Base styles */
@layer base {
  html {
    font-family: var(--font-sans);
    color: var(--color-text-primary);
    background: var(--color-background);
    -webkit-font-smoothing: antialiased;
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: var(--font-serif);
    letter-spacing: -0.5px;
  }
  body {
    background: var(--color-background);
    color: var(--color-text-primary);
  }
}
```

### Task E4 — `components/button.tsx`

**Files:**

- Create: `D:/onlyou2/packages/ui/src/components/button.tsx`

- [ ] **Step 1: Write Button component**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] hover:bg-[color:var(--color-primary-700)]",
        secondary:
          "bg-white text-[color:var(--color-primary)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-primary-50)]",
        ghost:
          "bg-transparent text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-50)]",
        accent:
          "bg-[color:var(--color-accent)] text-white hover:bg-[color:var(--color-accent-500)]",
        destructive:
          "bg-[color:var(--color-error)] text-white hover:bg-[color:var(--color-error)]/90",
        outline:
          "border border-[color:var(--color-primary)] text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)] hover:text-white",
        link: "text-[color:var(--color-accent)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-[8px]",
        md: "h-11 px-5 text-base rounded-[10px]",
        lg: "h-13 px-7 text-base rounded-[12px]",
        xl: "h-14 px-8 text-lg rounded-[12px]",
        icon: "h-11 w-11 rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading, disabled, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? <span className="animate-pulse">…</span> : children}
      </button>
    );
  },
);
Button.displayName = "Button";
```

### Task E5 — `components/input.tsx`

**Files:**

- Create: `D:/onlyou2/packages/ui/src/components/input.tsx`

- [ ] **Step 1: Write Input component**

```tsx
import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-[10px] border bg-white px-4 py-3 text-base transition-colors",
          "placeholder:text-[color:var(--color-text-muted)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-0 focus-visible:border-[color:var(--color-border-focus)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-[color:var(--color-error)] focus-visible:ring-[color:var(--color-error)]"
            : "border-[color:var(--color-border)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
```

### Task E6 — `components/card.tsx`

**Files:**

- Create: `D:/onlyou2/packages/ui/src/components/card.tsx`

- [ ] **Step 1: Write Card component**

```tsx
import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "../lib/cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[16px] border border-[color:var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)]",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mb-4 flex flex-col gap-1.5", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-[family-name:var(--font-serif)] text-2xl font-semibold text-[color:var(--color-text-primary)]",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-[color:var(--color-text-secondary)]",
      className,
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "CardContent";
```

### Task E7 — `components/badge.tsx`

**Files:**

- Create: `D:/onlyou2/packages/ui/src/components/badge.tsx`

- [ ] **Step 1: Write Badge component**

```tsx
import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--color-primary-50)] text-[color:var(--color-primary)]",
        success:
          "bg-[color:var(--color-success-bg)] text-[color:var(--color-success)]",
        warning:
          "bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning)]",
        error:
          "bg-[color:var(--color-error-bg)] text-[color:var(--color-error)]",
        info: "bg-[color:var(--color-info-bg)] text-[color:var(--color-info)]",
        accent:
          "bg-[color:var(--color-accent-light)] text-[color:var(--color-accent)]",
        gold: "bg-[#FAF3E8] text-[color:var(--color-warm)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
```

### Task E8 — `components/dialog.tsx` (minimal native-dialog version)

**Files:**

- Create: `D:/onlyou2/packages/ui/src/components/dialog.tsx`

- [ ] **Step 1: Write Dialog component**

Use the native `<dialog>` element for Phase 1 — avoids pulling in Radix as a dep before we need it. Phase 2+ can migrate to Radix if we need richer a11y semantics.

```tsx
"use client";
import {
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn";

export interface DialogProps extends HTMLAttributes<HTMLDialogElement> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(
  ({ open, onOpenChange, children, className, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      if (open && !el.open) el.showModal();
      if (!open && el.open) el.close();
    }, [open]);

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      const handleClose = () => onOpenChange(false);
      el.addEventListener("close", handleClose);
      return () => el.removeEventListener("close", handleClose);
    }, [onOpenChange]);

    return (
      <dialog
        ref={(node) => {
          innerRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        className={cn(
          "rounded-[16px] border border-[color:var(--color-border)] bg-white p-6 shadow-[var(--shadow-xl)] backdrop:bg-black/50 backdrop:backdrop-blur-sm",
          className,
        )}
        {...props}
      >
        {children}
      </dialog>
    );
  },
);
Dialog.displayName = "Dialog";

export function DialogTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "mb-2 font-[family-name:var(--font-serif)] text-2xl font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "mb-4 text-sm text-[color:var(--color-text-secondary)]",
        className,
      )}
      {...props}
    />
  );
}
```

### Task E9 — `components/toast.tsx` (minimal provider)

**Files:**

- Create: `D:/onlyou2/packages/ui/src/components/toast.tsx`

- [ ] **Step 1: Write Toast provider**

```tsx
"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn";

type ToastVariant = "default" | "success" | "warning" | "error" | "info";
type Toast = { id: number; message: string; variant: ToastVariant };

const ToastContext = createContext<{
  show: (message: string, variant?: ToastVariant) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback(
    (message: string, variant: ToastVariant = "default") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[1500] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "min-w-[260px] rounded-[12px] border px-4 py-3 text-sm font-medium shadow-[var(--shadow-lg)]",
              t.variant === "success" &&
                "border-[color:var(--color-success)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success)]",
              t.variant === "warning" &&
                "border-[color:var(--color-warning)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning)]",
              t.variant === "error" &&
                "border-[color:var(--color-error)] bg-[color:var(--color-error-bg)] text-[color:var(--color-error)]",
              t.variant === "info" &&
                "border-[color:var(--color-info)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info)]",
              t.variant === "default" &&
                "border-[color:var(--color-border)] bg-white text-[color:var(--color-text-primary)]",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
```

### Task E10 — `components/otp-input.tsx`

**Files:**

- Create: `D:/onlyou2/packages/ui/src/components/otp-input.tsx`

- [ ] **Step 1: Write OTP Input**

```tsx
"use client";
import {
  useRef,
  useState,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";

import { cn } from "../lib/cn";

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled,
  error,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));

  useEffect(() => {
    const chars = value.split("").slice(0, length);
    const padded = [...chars, ...Array(length - chars.length).fill("")];
    setDigits(padded);
  }, [value, length]);

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    onChange(next.join(""));
    if (v && index < length - 1) inputsRef.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  return (
    <div className="flex gap-3">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={cn(
            "h-14 w-12 rounded-[10px] border bg-white text-center text-2xl font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)]",
            error
              ? "border-[color:var(--color-error)]"
              : "border-[color:var(--color-border)] focus-visible:border-[color:var(--color-border-focus)]",
          )}
        />
      ))}
    </div>
  );
}
```

### Task E11 — `components/skeleton.tsx`

**Files:**

- Create: `D:/onlyou2/packages/ui/src/components/skeleton.tsx`

- [ ] **Step 1: Write Skeleton**

```tsx
import { type HTMLAttributes } from "react";

import { cn } from "../lib/cn";

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[8px] bg-[color:var(--color-primary-100)]",
        className,
      )}
      {...props}
    />
  );
}
```

### Task E12 — `components/empty-state.tsx`

**Files:**

- Create: `D:/onlyou2/packages/ui/src/components/empty-state.tsx`

- [ ] **Step 1: Write EmptyState**

```tsx
import { type ReactNode } from "react";
import { Inbox, Search, Filter } from "lucide-react";

import { cn } from "../lib/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 p-12 text-center",
        className,
      )}
    >
      <div className="text-[color:var(--color-text-muted)]">
        {icon || <Inbox className="h-12 w-12" />}
      </div>
      <h3 className="font-[family-name:var(--font-serif)] text-xl font-semibold text-[color:var(--color-text-primary)]">
        {title}
      </h3>
      {description && (
        <p className="max-w-sm text-sm text-[color:var(--color-text-secondary)]">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

export function SearchEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12" />}
      title="No results"
      description={`No matches for "${query}". Try a different search.`}
    />
  );
}

export function FilterEmptyState() {
  return (
    <EmptyState
      icon={<Filter className="h-12 w-12" />}
      title="Nothing matches these filters"
      description="Adjust the filters above to see more results."
    />
  );
}
```

### Task E13 — `components/error-state.tsx`

**Files:**

- Create: `D:/onlyou2/packages/ui/src/components/error-state.tsx`

- [ ] **Step 1: Write ErrorState**

```tsx
import { type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { cn } from "../lib/cn";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again. If the problem persists, contact support.",
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 p-12 text-center",
        className,
      )}
    >
      <div className="text-[color:var(--color-error)]">
        <AlertTriangle className="h-12 w-12" />
      </div>
      <h3 className="font-[family-name:var(--font-serif)] text-xl font-semibold">
        {title}
      </h3>
      <p className="max-w-sm text-sm text-[color:var(--color-text-secondary)]">
        {description}
      </p>
      {action}
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return <p className="text-sm text-[color:var(--color-error)]">{message}</p>;
}

export function ErrorBoundaryFallback({ error }: { error: Error }) {
  return <ErrorState title="Application error" description={error.message} />;
}
```

### Task E14 — `components/onlyou/logo.tsx`

**Files:**

- Create: `D:/onlyou2/packages/ui/src/components/onlyou/logo.tsx`

- [ ] **Step 1: Write Logo component**

```tsx
import { type HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

export interface LogoProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number;
  inverse?: boolean;
}

/**
 * onlyou wordmark. Always lowercase. Always Playfair Display Black.
 * DESIGN.md §1.1: the logo is text-only, never an image or SVG.
 */
export function Logo({
  size = 36,
  inverse,
  className,
  style,
  ...props
}: LogoProps) {
  return (
    <span
      className={cn(
        "inline-block font-[family-name:var(--font-serif)] font-[900] leading-[1.2] tracking-[-0.5px]",
        inverse ? "text-white" : "text-[color:var(--color-primary)]",
        className,
      )}
      style={{ fontSize: `${size}px`, ...style }}
      {...props}
    >
      onlyou
    </span>
  );
}
```

### Task E15 — `src/index.ts` barrel

**Files:**

- Create: `D:/onlyou2/packages/ui/src/index.ts`

- [ ] **Step 1: Write barrel**

```ts
export { Button, type ButtonProps } from "./components/button";
export { Input, type InputProps } from "./components/input";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/card";
export { Badge, type BadgeProps } from "./components/badge";
export {
  Dialog,
  DialogTitle,
  DialogDescription,
  type DialogProps,
} from "./components/dialog";
export { ToastProvider, useToast } from "./components/toast";
export { OtpInput, type OtpInputProps } from "./components/otp-input";
export { Skeleton } from "./components/skeleton";
export {
  EmptyState,
  SearchEmptyState,
  FilterEmptyState,
  type EmptyStateProps,
} from "./components/empty-state";
export {
  ErrorState,
  InlineError,
  ErrorBoundaryFallback,
  type ErrorStateProps,
} from "./components/error-state";
export { Logo, type LogoProps } from "./components/onlyou/logo";
export { cn } from "./lib/cn";
```

### Task E16 — Install dependencies and typecheck packages

- [ ] **Step 1: Run first `pnpm install`**

```bash
cd D:/onlyou2
pnpm install
```

Expected: pnpm creates `node_modules/`, `pnpm-lock.yaml`, and symlinks `@onlyou/core`, `@onlyou/ui`, `@onlyou/config` into each other's `node_modules/`. No errors.

- [ ] **Step 2: Typecheck all packages**

```bash
cd D:/onlyou2
pnpm -r --filter "./packages/*" exec tsc --noEmit
```

Expected: No errors in `packages/core`, `packages/ui`, `packages/config`.

If errors appear in `packages/ui` related to Tailwind 4 CSS imports, those are fine — CSS isn't typechecked. The error must be in `.ts` or `.tsx` to block.

- [ ] **Step 3: Commit Phase E**

```bash
cd D:/onlyou2
git add packages/ui package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(phase-1/e): packages/ui — branded shadcn primitives + globals.css

Ten primitive components mapped to DESIGN.md tokens via Tailwind 4
@theme block. Native <dialog> element used for modal to avoid Radix
dep until needed. Logo is the onlyou text wordmark per DESIGN.md §1.1.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase F — `apps/landing` (Next.js)

First Next.js app. Every later Next.js app (doctor, admin) uses the same scaffolding — with its own home page content. The plan repeats tasks verbatim per the "No placeholders / no similar-to-task-N" rule.

### Task F1 — Create app with Next.js scaffold

**Files:**

- Create: `D:/onlyou2/apps/landing/` (many files)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p D:/onlyou2/apps/landing/app/design D:/onlyou2/apps/landing/public
```

- [ ] **Step 2: Write `apps/landing/package.json`**

```json
{
  "name": "@onlyou/landing",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf .next .turbo *.tsbuildinfo"
  },
  "dependencies": {
    "@onlyou/core": "workspace:*",
    "@onlyou/ui": "workspace:*",
    "next": "<version>",
    "react": "<version>",
    "react-dom": "<version>",
    "convex": "<version>"
  },
  "devDependencies": {
    "@onlyou/config": "workspace:*",
    "@tailwindcss/postcss": "<version>",
    "@types/node": "<version>",
    "@types/react": "<version>",
    "@types/react-dom": "<version>",
    "tailwindcss": "<version>",
    "typescript": "<version>"
  }
}
```

- [ ] **Step 3: Write `apps/landing/tsconfig.json`**

```json
{
  "extends": "@onlyou/config/tsconfig/next.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `apps/landing/next.config.ts`**

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@onlyou/core", "@onlyou/ui"],
  reactStrictMode: true,
};

export default config;
```

- [ ] **Step 5: Write `apps/landing/postcss.config.mjs`**

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 6: Write `apps/landing/.env.local`**

```
NEXT_PUBLIC_CONVEX_URL=
```

Leave empty for now. Phase K will populate it after running `npx convex dev`.

- [ ] **Step 7: Write `apps/landing/.gitignore`**

```
.next/
out/
*.tsbuildinfo
next-env.d.ts
```

### Task F2 — Write root layout with fonts and Tailwind

**Files:**

- Create: `D:/onlyou2/apps/landing/app/layout.tsx`
- Create: `D:/onlyou2/apps/landing/app/globals.css`

- [ ] **Step 1: Write `app/globals.css`**

```css
@import "@onlyou/ui/globals.css";
```

- [ ] **Step 2: Write `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-serif",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "onlyou — care, privately",
  description: "Indian telehealth for stigmatized chronic conditions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

### Task F3 — Write landing home page

**Files:**

- Create: `D:/onlyou2/apps/landing/app/page.tsx`

- [ ] **Step 1: Write the real-ish home page**

```tsx
import { Logo, Input, Button } from "@onlyou/ui";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[color:var(--color-background)]">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <Logo size={72} className="mb-6" />
        <p className="mb-12 text-sm uppercase tracking-[0.2em] text-[color:var(--color-text-tertiary)]">
          Care, privately — coming soon
        </p>
        <h1 className="mb-6 font-[family-name:var(--font-serif)] text-5xl font-bold leading-tight text-[color:var(--color-text-primary)] md:text-6xl">
          Your care, in private.
        </h1>
        <p className="mb-10 max-w-md text-lg leading-relaxed text-[color:var(--color-text-secondary)]">
          A specialist doctor reviews your case and writes a treatment plan. You
          only pay if they prescribe.
        </p>
        <form className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <Input placeholder="you@example.in" disabled className="flex-1" />
          <Button disabled>Join waitlist</Button>
        </form>
        <p className="mt-12 text-xs text-[color:var(--color-text-tertiary)]">
          <a href="/design" className="underline-offset-4 hover:underline">
            View design system →
          </a>
        </p>
      </div>
    </main>
  );
}
```

### Task F4 — Write `/design` showcase route

**Files:**

- Create: `D:/onlyou2/apps/landing/app/design/page.tsx`

- [ ] **Step 1: Write the design showcase page**

This is a long file (~350 lines of JSX). It renders every primitive from `@onlyou/ui` so the founder can visually verify the design system is wired correctly.

```tsx
"use client";
import { useState } from "react";

import {
  Logo,
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Dialog,
  DialogTitle,
  DialogDescription,
  ToastProvider,
  useToast,
  OtpInput,
  Skeleton,
  EmptyState,
  SearchEmptyState,
  FilterEmptyState,
  ErrorState,
  InlineError,
} from "@onlyou/ui";

export default function DesignPage() {
  return (
    <ToastProvider>
      <DesignContent />
    </ToastProvider>
  );
}

function DesignContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const toast = useToast();

  return (
    <main className="min-h-screen bg-[color:var(--color-background)] px-6 py-16 md:px-12">
      <div className="mx-auto max-w-5xl">
        <Logo size={56} className="mb-4" />
        <p className="mb-16 text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-tertiary)]">
          Design system — @onlyou/landing
        </p>

        <Section title="Typography">
          <TypeRow label="H1 / Serif 700">
            <h1 className="font-[family-name:var(--font-serif)] text-5xl font-bold leading-[1.05]">
              Your care, private
            </h1>
          </TypeRow>
          <TypeRow label="H2 / Serif 600">
            <h2 className="font-[family-name:var(--font-serif)] text-4xl font-semibold leading-[1.15]">
              Treatment that fits you
            </h2>
          </TypeRow>
          <TypeRow label="H3 / Serif 600">
            <h3 className="font-[family-name:var(--font-serif)] text-2xl font-semibold leading-[1.3]">
              Book a free consultation
            </h3>
          </TypeRow>
          <TypeRow label="Body / Sans 400">
            <p className="text-base leading-[1.6]">
              A board-certified doctor reviews your case and creates a
              personalized plan — you only pay if they prescribe.
            </p>
          </TypeRow>
          <TypeRow label="Body Secondary">
            <p className="text-base leading-[1.6] text-[color:var(--color-text-secondary)]">
              Takes about 5 minutes. Your answers stay private.
            </p>
          </TypeRow>
          <TypeRow label="Small / Tertiary">
            <p className="text-xs text-[color:var(--color-text-tertiary)]">
              Reviewed within 24 hours · Free · No card required
            </p>
          </TypeRow>
        </Section>

        <Section title="Core Palette">
          <SwatchGrid
            swatches={[
              { name: "Primary", hex: "#141414" },
              { name: "Background", hex: "#FAFAF8" },
              { name: "Off-White", hex: "#F8F8F6" },
              { name: "Lavender", hex: "#9B8EC4" },
              { name: "Warm Gold", hex: "#C4956B" },
            ]}
          />
        </Section>

        <Section title="Status Colors">
          <SwatchGrid
            swatches={[
              { name: "Success", hex: "#2D9F5D" },
              { name: "Warning", hex: "#D4880F" },
              { name: "Error", hex: "#CC3333" },
              { name: "Info", hex: "#0284C7" },
              { name: "Neutral", hex: "#F5F5F5" },
            ]}
          />
        </Section>

        <Section title="Buttons — 7 variants">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Continue</Button>
            <Button variant="secondary">Back</Button>
            <Button variant="ghost">Skip</Button>
            <Button variant="accent">Start free consultation</Button>
            <Button variant="outline">Learn more</Button>
            <Button variant="destructive">Delete account</Button>
            <Button variant="link">Read more</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra large</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="max-w-md space-y-3">
            <Input placeholder="Default state — enter your phone" />
            <Input placeholder="Focused (click me)" />
            <Input placeholder="Error state" error />
            <Input placeholder="Disabled" disabled />
            <InlineError message="This number is not valid." />
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-[color:var(--color-text-tertiary)]">
                OTP input
              </p>
              <OtpInput value={otp} onChange={setOtp} />
            </div>
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">DEFAULT</Badge>
            <Badge variant="success">COMPLETED</Badge>
            <Badge variant="warning">AWAITING REVIEW</Badge>
            <Badge variant="error">URGENT</Badge>
            <Badge variant="info">IN PROGRESS</Badge>
            <Badge variant="accent">NEW</Badge>
            <Badge variant="gold">PREMIUM</Badge>
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Hair Loss</CardTitle>
                <CardDescription>
                  Personalized treatment backed by evidence. Starts at
                  ₹999/month.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="primary" size="sm">
                  Learn more
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Weight Management</CardTitle>
                <CardDescription>
                  Doctor-led program with medication, nutrition, and check-ins.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="primary" size="sm">
                  Learn more
                </Button>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Dialog & Toast">
          <div className="flex gap-3">
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              Open dialog
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.show("Saved successfully", "success")}
            >
              Show toast
            </Button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTitle>Dialog example</DialogTitle>
            <DialogDescription>
              This is a native dialog element styled with onlyou tokens. Press
              Esc or click backdrop to close.
            </DialogDescription>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setDialogOpen(false)}>
                Confirm
              </Button>
            </div>
          </Dialog>
        </Section>

        <Section title="Skeleton">
          <div className="space-y-3">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-4 w-80" />
          </div>
        </Section>

        <Section title="Empty State">
          <EmptyState
            title="No consultations yet"
            description="Your consultation history will appear here."
          />
          <div className="mt-6">
            <SearchEmptyState query="hairlss" />
          </div>
          <div className="mt-6">
            <FilterEmptyState />
          </div>
        </Section>

        <Section title="Error State">
          <ErrorState
            title="Unable to load"
            description="We couldn't load your consultations. Try again in a moment."
            action={
              <Button variant="primary" size="sm">
                Retry
              </Button>
            }
          />
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const anchor = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <section
      id={anchor}
      className="mb-16 border-t border-[color:var(--color-border)] pt-12"
    >
      <h2 className="mb-6 font-[family-name:var(--font-serif)] text-3xl font-semibold">
        <a
          href={`#${anchor}`}
          className="hover:text-[color:var(--color-accent)]"
        >
          {title}
        </a>
      </h2>
      {children}
    </section>
  );
}

function TypeRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-baseline gap-6 border-b border-[color:var(--color-border)] py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-tertiary)]">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

function SwatchGrid({
  swatches,
}: {
  swatches: { name: string; hex: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {swatches.map((s) => (
        <div
          key={s.hex}
          className="overflow-hidden rounded-[14px] border border-[color:var(--color-border)] bg-white"
        >
          <div className="h-20" style={{ background: s.hex }} />
          <div className="p-3">
            <div className="text-xs font-semibold">{s.name}</div>
            <div className="mt-1 font-mono text-[11px] text-[color:var(--color-text-tertiary)]">
              {s.hex}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Task F5 — ESLint config

**Files:**

- Create: `D:/onlyou2/apps/landing/eslint.config.js`

- [ ] **Step 1: Write eslint config**

```js
import base from "@onlyou/config/eslint/next";

export default base;
```

### Task F6 — Commit Phase F

- [ ] **Step 1: Install new deps**

```bash
cd D:/onlyou2
pnpm install
```

Expected: pnpm picks up the new `apps/landing/package.json` and adds Next.js etc. to node_modules. No errors.

- [ ] **Step 2: Typecheck landing**

```bash
cd D:/onlyou2
pnpm --filter @onlyou/landing typecheck
```

Expected: No errors.

- [ ] **Step 3: Stage and commit**

```bash
cd D:/onlyou2
git add apps/landing package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(phase-1/f): apps/landing — Next.js scaffold + /design showcase

Real-ish home page with logo, tagline, and waitlist form (disabled).
/design route renders every @onlyou/ui primitive for visual verification.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase G — `apps/doctor` (Next.js)

Same Next.js scaffold as landing, different home page, port 3002.

### Task G1 — Create app scaffold files

**Files:**

- Create: `D:/onlyou2/apps/doctor/` (many files)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p D:/onlyou2/apps/doctor/app/design D:/onlyou2/apps/doctor/public
```

- [ ] **Step 2: Write `apps/doctor/package.json`** (identical to landing but name/port)

```json
{
  "name": "@onlyou/doctor",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start -p 3002",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf .next .turbo *.tsbuildinfo"
  },
  "dependencies": {
    "@onlyou/core": "workspace:*",
    "@onlyou/ui": "workspace:*",
    "next": "<version>",
    "react": "<version>",
    "react-dom": "<version>",
    "convex": "<version>"
  },
  "devDependencies": {
    "@onlyou/config": "workspace:*",
    "@tailwindcss/postcss": "<version>",
    "@types/node": "<version>",
    "@types/react": "<version>",
    "@types/react-dom": "<version>",
    "tailwindcss": "<version>",
    "typescript": "<version>"
  }
}
```

- [ ] **Step 3: Write `apps/doctor/tsconfig.json`**

```json
{
  "extends": "@onlyou/config/tsconfig/next.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `apps/doctor/next.config.ts`**

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@onlyou/core", "@onlyou/ui"],
  reactStrictMode: true,
};

export default config;
```

- [ ] **Step 5: Write `apps/doctor/postcss.config.mjs`**

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 6: Write `apps/doctor/.env.local`**

```
NEXT_PUBLIC_CONVEX_URL=
```

- [ ] **Step 7: Write `apps/doctor/.gitignore`**

```
.next/
out/
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 8: Write `apps/doctor/eslint.config.js`**

```js
import base from "@onlyou/config/eslint/next";

export default base;
```

### Task G2 — Write doctor layout and globals

**Files:**

- Create: `D:/onlyou2/apps/doctor/app/layout.tsx`
- Create: `D:/onlyou2/apps/doctor/app/globals.css`

- [ ] **Step 1: Write `app/globals.css`**

```css
@import "@onlyou/ui/globals.css";
```

- [ ] **Step 2: Write `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-serif",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "onlyou — doctor portal",
  description: "Doctor portal for onlyou — review cases and prescribe.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

### Task G3 — Doctor home page (scaffold placeholder)

**Files:**

- Create: `D:/onlyou2/apps/doctor/app/page.tsx`

- [ ] **Step 1: Write placeholder home**

```tsx
import { Logo } from "@onlyou/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-background)] px-6">
      <div className="text-center">
        <Logo size={56} className="mb-4" />
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[color:var(--color-text-tertiary)]">
          Doctor portal
        </p>
        <h1 className="mb-4 font-[family-name:var(--font-serif)] text-4xl font-semibold">
          Phase 1 scaffold
        </h1>
        <p className="mb-6 text-[color:var(--color-text-secondary)]">
          Real doctor portal features land in Phase 4.
        </p>
        <a href="/design" className="underline-offset-4 hover:underline">
          View design system →
        </a>
      </div>
    </main>
  );
}
```

### Task G4 — Doctor `/design` showcase

**Files:**

- Create: `D:/onlyou2/apps/doctor/app/design/page.tsx`

- [ ] **Step 1: Write design page — identical content to landing's**

The `/design` route's content is identical across Next.js apps. Copy the full file from `apps/landing/app/design/page.tsx` — **do not import it**; apps stay independent. The header label in the copy changes from `@onlyou/landing` to `@onlyou/doctor`.

Copy the entire contents of `D:/onlyou2/apps/landing/app/design/page.tsx` into `D:/onlyou2/apps/doctor/app/design/page.tsx`, then change the header paragraph:

```diff
-      Design system — @onlyou/landing
+      Design system — @onlyou/doctor
```

### Task G5 — Install, typecheck, commit

- [ ] **Step 1: Install**

```bash
cd D:/onlyou2
pnpm install
```

- [ ] **Step 2: Typecheck**

```bash
cd D:/onlyou2
pnpm --filter @onlyou/doctor typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd D:/onlyou2
git add apps/doctor pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(phase-1/g): apps/doctor — Next.js scaffold + /design showcase

Port 3002. Placeholder home page. Full design system showcase at /design.
Real features come in Phase 4 (approval gate).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase H — `apps/admin` (Next.js)

Same shape as doctor, port 3003.

### Task H1 — Create admin app scaffold

**Files:**

- Create: `D:/onlyou2/apps/admin/` (many files)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p D:/onlyou2/apps/admin/app/design D:/onlyou2/apps/admin/public
```

- [ ] **Step 2: Write `apps/admin/package.json`**

```json
{
  "name": "@onlyou/admin",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3003",
    "build": "next build",
    "start": "next start -p 3003",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf .next .turbo *.tsbuildinfo"
  },
  "dependencies": {
    "@onlyou/core": "workspace:*",
    "@onlyou/ui": "workspace:*",
    "next": "<version>",
    "react": "<version>",
    "react-dom": "<version>",
    "convex": "<version>"
  },
  "devDependencies": {
    "@onlyou/config": "workspace:*",
    "@tailwindcss/postcss": "<version>",
    "@types/node": "<version>",
    "@types/react": "<version>",
    "@types/react-dom": "<version>",
    "tailwindcss": "<version>",
    "typescript": "<version>"
  }
}
```

- [ ] **Step 3: Write `apps/admin/tsconfig.json`**

```json
{
  "extends": "@onlyou/config/tsconfig/next.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `apps/admin/next.config.ts`**

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@onlyou/core", "@onlyou/ui"],
  reactStrictMode: true,
};

export default config;
```

- [ ] **Step 5: Write `apps/admin/postcss.config.mjs`**

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 6: Write `apps/admin/.env.local`**

```
NEXT_PUBLIC_CONVEX_URL=
```

- [ ] **Step 7: Write `apps/admin/.gitignore`**

```
.next/
out/
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 8: Write `apps/admin/eslint.config.js`**

```js
import base from "@onlyou/config/eslint/next";

export default base;
```

### Task H2 — Admin layout + globals

**Files:**

- Create: `D:/onlyou2/apps/admin/app/globals.css`
- Create: `D:/onlyou2/apps/admin/app/layout.tsx`

- [ ] **Step 1: Write `globals.css`**

```css
@import "@onlyou/ui/globals.css";
```

- [ ] **Step 2: Write `layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-serif",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "onlyou — admin portal",
  description: "Admin portal for onlyou — coordinator operations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

### Task H3 — Admin home page

**Files:**

- Create: `D:/onlyou2/apps/admin/app/page.tsx`

- [ ] **Step 1: Write placeholder home**

```tsx
import { Logo } from "@onlyou/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-background)] px-6">
      <div className="text-center">
        <Logo size={56} className="mb-4" />
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[color:var(--color-text-tertiary)]">
          Admin portal
        </p>
        <h1 className="mb-4 font-[family-name:var(--font-serif)] text-4xl font-semibold">
          Phase 1 scaffold
        </h1>
        <p className="mb-6 text-[color:var(--color-text-secondary)]">
          Real admin features land in Phase 5.
        </p>
        <a href="/design" className="underline-offset-4 hover:underline">
          View design system →
        </a>
      </div>
    </main>
  );
}
```

### Task H4 — Admin `/design` showcase

**Files:**

- Create: `D:/onlyou2/apps/admin/app/design/page.tsx`

- [ ] **Step 1: Copy design page from landing and change header label**

Copy the entire contents of `D:/onlyou2/apps/landing/app/design/page.tsx` into `D:/onlyou2/apps/admin/app/design/page.tsx`, then change the header:

```diff
-      Design system — @onlyou/landing
+      Design system — @onlyou/admin
```

### Task H5 — Install, typecheck, commit

- [ ] **Step 1: Install**

```bash
cd D:/onlyou2
pnpm install
```

- [ ] **Step 2: Typecheck**

```bash
cd D:/onlyou2
pnpm --filter @onlyou/admin typecheck
```

- [ ] **Step 3: Commit**

```bash
cd D:/onlyou2
git add apps/admin pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(phase-1/h): apps/admin — Next.js scaffold + /design showcase

Port 3003. Placeholder home. Full design system at /design.
Real admin features land in Phase 5.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase I — `apps/mobile` (Expo + NativeWind)

### Task I1 — Create mobile app package

**Files:**

- Create: `D:/onlyou2/apps/mobile/` (many files)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p D:/onlyou2/apps/mobile/app \
         D:/onlyou2/apps/mobile/src/theme \
         D:/onlyou2/apps/mobile/src/components/ui \
         D:/onlyou2/apps/mobile/assets
```

- [ ] **Step 2: Write `apps/mobile/package.json`**

```json
{
  "name": "@onlyou/mobile",
  "version": "0.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build": "echo 'Use EAS Build for native builds'",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf .expo .turbo *.tsbuildinfo"
  },
  "dependencies": {
    "@onlyou/core": "workspace:*",
    "expo": "<version>",
    "expo-router": "<version>",
    "expo-font": "<version>",
    "expo-splash-screen": "<version>",
    "expo-haptics": "<version>",
    "expo-linear-gradient": "<version>",
    "expo-linking": "<version>",
    "expo-status-bar": "<version>",
    "react": "<version>",
    "react-native": "<version>",
    "react-native-safe-area-context": "<version>",
    "react-native-screens": "<version>",
    "react-native-reanimated": "<version>",
    "react-native-gesture-handler": "<version>",
    "nativewind": "<version>",
    "tailwindcss": "3.4.16",
    "@expo-google-fonts/playfair-display": "<version>",
    "@expo-google-fonts/plus-jakarta-sans": "<version>",
    "lucide-react-native": "<version>",
    "convex": "<version>"
  },
  "devDependencies": {
    "@onlyou/config": "workspace:*",
    "@babel/core": "<version>",
    "@types/react": "<version>",
    "typescript": "<version>"
  }
}
```

**Critical:** `tailwindcss` is pinned to `3.4.16` for mobile only — NativeWind 4 does not yet support Tailwind 4.

- [ ] **Step 3: Write `apps/mobile/tsconfig.json`**

```json
{
  "extends": "@onlyou/config/tsconfig/expo.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `apps/mobile/eslint.config.js`**

```js
import base from "@onlyou/config/eslint/expo";

export default base;
```

- [ ] **Step 5: Write `apps/mobile/.gitignore`**

```
.expo/
*.jks
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
```

### Task I2 — Expo config (`app.config.ts`)

**Files:**

- Create: `D:/onlyou2/apps/mobile/app.config.ts`

- [ ] **Step 1: Write Expo config**

```ts
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "onlyou",
  slug: "onlyou",
  version: "0.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "onlyou",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#FAFAF8",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.onlyou.app",
  },
  android: {
    package: "com.onlyou.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FAFAF8",
    },
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png",
  },
  plugins: ["expo-router", "expo-font", "expo-splash-screen"],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
```

**Note:** Icon/splash PNG files do not exist yet. Expo will complain on first `expo start`. Before that, copy placeholder PNGs or use Expo's default. Task I10 addresses this.

### Task I3 — Tailwind + NativeWind + Metro config

**Files:**

- Create: `D:/onlyou2/apps/mobile/tailwind.config.js`
- Create: `D:/onlyou2/apps/mobile/babel.config.js`
- Create: `D:/onlyou2/apps/mobile/metro.config.js`
- Create: `D:/onlyou2/apps/mobile/global.css`

- [ ] **Step 1: Write `tailwind.config.js`**

```js
import { colors } from "@onlyou/core/src/tokens/colors";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        background: colors.background,
        "off-white": colors.offWhite,
        "text-primary": colors.textPrimary,
        "text-secondary": colors.textSecondary,
        "text-tertiary": colors.textTertiary,
        "text-muted": colors.textMuted,
        accent: colors.accent,
        "accent-light": colors.accentLight,
        warm: colors.warm,
        border: colors.border,
        success: colors.success,
        "success-bg": colors.successBg,
        warning: colors.warning,
        "warning-bg": colors.warningBg,
        error: colors.error,
        "error-bg": colors.errorBg,
        info: colors.info,
        "info-bg": colors.infoBg,
      },
      fontFamily: {
        serif: ["PlayfairDisplay_700Bold"],
        "serif-black": ["PlayfairDisplay_900Black"],
        sans: ["PlusJakartaSans_400Regular"],
        "sans-semibold": ["PlusJakartaSans_600SemiBold"],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Write `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

- [ ] **Step 3: Write `metro.config.js`**

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: watch the whole workspace so Metro sees workspace packages
config.watchFolders = [workspaceRoot];

// Resolve node_modules from app + workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Disable hierarchical resolution so hoisted deps resolve cleanly
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: "./global.css" });
```

- [ ] **Step 4: Write `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Task I4 — Mobile theme layer

**Files:**

- Create: `D:/onlyou2/apps/mobile/src/theme/colors.ts`
- Create: `D:/onlyou2/apps/mobile/src/theme/typography.ts`
- Create: `D:/onlyou2/apps/mobile/src/theme/spacing.ts`
- Create: `D:/onlyou2/apps/mobile/src/theme/shadows.ts`
- Create: `D:/onlyou2/apps/mobile/src/theme/fonts.ts`
- Create: `D:/onlyou2/apps/mobile/src/theme/index.ts`

- [ ] **Step 1: Write `colors.ts`**

```ts
export { colors } from "@onlyou/core/tokens/colors";
```

- [ ] **Step 2: Write `typography.ts`**

```ts
import {
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
} from "@onlyou/core/tokens/typography";

export { fontSizes, fontWeights, lineHeights, letterSpacing };

export const fontFamilies = {
  serifBlack: "PlayfairDisplay_900Black",
  serifBold: "PlayfairDisplay_700Bold",
  serifSemibold: "PlayfairDisplay_600SemiBold",
  serifRegular: "PlayfairDisplay_400Regular",
  sansBold: "PlusJakartaSans_700Bold",
  sansSemibold: "PlusJakartaSans_600SemiBold",
  sansMedium: "PlusJakartaSans_500Medium",
  sansRegular: "PlusJakartaSans_400Regular",
} as const;

export const textStyles = {
  logo: {
    fontFamily: fontFamilies.serifBlack,
    fontSize: fontSizes.logo,
    lineHeight: fontSizes.logo * lineHeights.snug,
    letterSpacing: letterSpacing.tight,
  },
  h1: {
    fontFamily: fontFamilies.serifBold,
    fontSize: fontSizes["6xl"],
    lineHeight: fontSizes["6xl"] * lineHeights.tight,
  },
  h2: {
    fontFamily: fontFamilies.serifSemibold,
    fontSize: fontSizes["5xl"],
    lineHeight: fontSizes["5xl"] * lineHeights.snug,
  },
  h3: {
    fontFamily: fontFamilies.serifSemibold,
    fontSize: fontSizes["3xl"],
    lineHeight: fontSizes["3xl"] * lineHeights.normal,
  },
  body: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.relaxed,
  },
  bodySecondary: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.relaxed,
  },
  small: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
  },
} as const;
```

- [ ] **Step 3: Write `spacing.ts`**

```ts
export { spacing } from "@onlyou/core/tokens/spacing";
export { radii } from "@onlyou/core/tokens/radii";
```

- [ ] **Step 4: Write `shadows.ts`**

```ts
import { shadows } from "@onlyou/core/tokens/shadows";

export const nativeShadows = {
  none: shadows.none.native,
  xs: shadows.xs.native,
  sm: shadows.sm.native,
  md: shadows.md.native,
  lg: shadows.lg.native,
  xl: shadows.xl.native,
} as const;

export type NativeShadow = keyof typeof nativeShadows;
```

- [ ] **Step 5: Write `fonts.ts`**

```ts
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_900Black,
} from "@expo-google-fonts/playfair-display";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";

export function useOnlyouFonts() {
  return useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_900Black,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
}
```

- [ ] **Step 6: Write `index.ts`**

```ts
export * from "./colors";
export * from "./typography";
export * from "./spacing";
export * from "./shadows";
export * from "./fonts";
```

### Task I5 — Mobile UI components

**Files:**

- Create: `D:/onlyou2/apps/mobile/src/components/ui/Logo.tsx`
- Create: `D:/onlyou2/apps/mobile/src/components/ui/PremiumButton.tsx`
- Create: `D:/onlyou2/apps/mobile/src/components/ui/PremiumInput.tsx`
- Create: `D:/onlyou2/apps/mobile/src/components/ui/ScreenWrapper.tsx`

- [ ] **Step 1: Write `Logo.tsx`**

```tsx
import { Text, type TextStyle } from "react-native";

import { colors } from "../../theme/colors";
import { textStyles } from "../../theme/typography";

export interface LogoProps {
  size?: number;
  inverse?: boolean;
  style?: TextStyle;
}

export function Logo({ size = 36, inverse, style }: LogoProps) {
  return (
    <Text
      style={[
        textStyles.logo,
        {
          fontSize: size,
          lineHeight: size * 1.2,
          color: inverse ? "#FFFFFF" : colors.textPrimary,
        },
        style,
      ]}
    >
      onlyou
    </Text>
  );
}
```

- [ ] **Step 2: Write `PremiumButton.tsx`**

```tsx
import { useRef } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  Animated,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";

import { colors } from "../../theme/colors";
import { radii } from "../../theme/spacing";

export type PremiumButtonVariant = "primary" | "secondary" | "ghost";

export interface PremiumButtonProps {
  label: string;
  onPress?: () => void;
  variant?: PremiumButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PremiumButton({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
}: PremiumButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      damping: 10,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
    if (!isDisabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      damping: 10,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }

  const bg =
    variant === "primary"
      ? isDisabled
        ? colors.ctaDisabled
        : colors.ctaPrimary
      : variant === "secondary"
        ? colors.ctaSecondary
        : "transparent";
  const fg =
    variant === "primary"
      ? isDisabled
        ? colors.ctaDisabledText
        : colors.ctaPrimaryText
      : colors.textPrimary;
  const borderColor =
    variant === "secondary" ? colors.ctaSecondaryBorder : "transparent";

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={{
          backgroundColor: bg,
          borderRadius: radii.base,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor,
          paddingVertical: 14,
          paddingHorizontal: 24,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 52,
        }}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <Text
            style={{
              color: fg,
              fontSize: 16,
              fontFamily: "PlusJakartaSans_600SemiBold",
            }}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
```

- [ ] **Step 3: Write `PremiumInput.tsx`**

```tsx
import { useState } from "react";
import { TextInput, View, Text, type TextInputProps } from "react-native";

import { colors } from "../../theme/colors";
import { radii } from "../../theme/spacing";

export interface PremiumInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function PremiumInput({
  label,
  error,
  onFocus,
  onBlur,
  style,
  ...props
}: PremiumInputProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? colors.error
    : focused
      ? colors.borderFocus
      : colors.border;

  return (
    <View>
      {label && (
        <Text
          style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}
        >
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            backgroundColor: colors.white,
            borderWidth: 1,
            borderColor,
            borderRadius: radii.base,
            paddingVertical: 14,
            paddingHorizontal: 16,
            fontSize: 16,
            color: colors.textPrimary,
            fontFamily: "PlusJakartaSans_400Regular",
          },
          style,
        ]}
        {...props}
      />
      {error && (
        <Text style={{ fontSize: 13, color: colors.error, marginTop: 4 }}>
          {error}
        </Text>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Write `ScreenWrapper.tsx`**

```tsx
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View, type ViewStyle } from "react-native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

export interface ScreenWrapperProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}

export function ScreenWrapper({
  children,
  scroll = true,
  style,
}: ScreenWrapperProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={{
        padding: spacing[6],
        paddingBottom: spacing[16],
      }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: spacing[6] }}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={["top"]}
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
    >
      {content}
    </SafeAreaView>
  );
}
```

### Task I6 — Root layout with font loading

**Files:**

- Create: `D:/onlyou2/apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Write `_layout.tsx`**

```tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";

import "../global.css";
import { useOnlyouFonts } from "../src/theme/fonts";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useOnlyouFonts();

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="design" />
      </Stack>
    </SafeAreaProvider>
  );
}
```

### Task I7 — Splash / home screen

**Files:**

- Create: `D:/onlyou2/apps/mobile/app/index.tsx`

- [ ] **Step 1: Write splash screen**

```tsx
import { useEffect } from "react";
import { View, Animated, Pressable, Text } from "react-native";
import { router } from "expo-router";

import { ScreenWrapper } from "../src/components/ui/ScreenWrapper";
import { Logo } from "../src/components/ui/Logo";
import { colors } from "../src/theme/colors";

export default function Index() {
  const opacity = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <ScreenWrapper scroll={false}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        <Animated.View style={{ opacity, alignItems: "center" }}>
          <Logo size={56} />
        </Animated.View>
        <Pressable
          onPress={() => router.push("/design")}
          style={{ paddingVertical: 12, paddingHorizontal: 20 }}
        >
          <Text
            style={{
              fontSize: 14,
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Tap to explore design system
          </Text>
        </Pressable>
      </View>
    </ScreenWrapper>
  );
}
```

### Task I8 — Mobile `/design` showcase

**Files:**

- Create: `D:/onlyou2/apps/mobile/app/design.tsx`

- [ ] **Step 1: Write design showcase screen**

```tsx
import { View, Text, ScrollView } from "react-native";

import { ScreenWrapper } from "../src/components/ui/ScreenWrapper";
import { Logo } from "../src/components/ui/Logo";
import { PremiumButton } from "../src/components/ui/PremiumButton";
import { PremiumInput } from "../src/components/ui/PremiumInput";
import { colors } from "../src/theme/colors";
import { textStyles } from "../src/theme/typography";

export default function DesignScreen() {
  return (
    <ScreenWrapper>
      <Logo size={48} />
      <Text
        style={{
          fontSize: 11,
          color: colors.textTertiary,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginTop: 8,
          marginBottom: 32,
        }}
      >
        Design system — @onlyou/mobile
      </Text>

      <Section title="Typography">
        <Text style={textStyles.h1}>Your care, private</Text>
        <Text style={[textStyles.h2, { marginTop: 12 }]}>
          Treatment that fits you
        </Text>
        <Text style={[textStyles.h3, { marginTop: 12 }]}>
          Book a free consultation
        </Text>
        <Text style={[textStyles.body, { marginTop: 16 }]}>
          A board-certified doctor reviews your case and creates a personalized
          plan — you only pay if they prescribe.
        </Text>
        <Text
          style={[
            textStyles.bodySecondary,
            { color: colors.textSecondary, marginTop: 8 },
          ]}
        >
          Takes about 5 minutes. Your answers stay private.
        </Text>
        <Text
          style={[
            textStyles.small,
            { color: colors.textTertiary, marginTop: 8 },
          ]}
        >
          Reviewed within 24 hours · Free · No card required
        </Text>
      </Section>

      <Section title="Core Palette">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Swatch name="Primary" hex="#141414" />
          <Swatch name="Background" hex="#FAFAF8" />
          <Swatch name="Off-White" hex="#F8F8F6" />
          <Swatch name="Lavender" hex="#9B8EC4" />
          <Swatch name="Warm Gold" hex="#C4956B" />
        </ScrollView>
      </Section>

      <Section title="Status Colors">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Swatch name="Success" hex="#2D9F5D" />
          <Swatch name="Warning" hex="#D4880F" />
          <Swatch name="Error" hex="#CC3333" />
          <Swatch name="Info" hex="#0284C7" />
        </ScrollView>
      </Section>

      <Section title="PremiumButton">
        <View style={{ gap: 12 }}>
          <PremiumButton label="Continue" variant="primary" />
          <PremiumButton label="Back" variant="secondary" />
          <PremiumButton label="Skip for now" variant="ghost" />
          <PremiumButton label="Loading" variant="primary" loading />
          <PremiumButton label="Disabled" variant="primary" disabled />
        </View>
      </Section>

      <Section title="PremiumInput">
        <View style={{ gap: 16 }}>
          <PremiumInput label="Phone number" placeholder="+91 98xxx xxxxx" />
          <PremiumInput
            label="Email"
            placeholder="you@example.in"
            error="This email is not valid"
          />
        </View>
      </Section>

      <Section title="Status Badges">
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Chip
            label="COMPLETED"
            color={colors.success}
            bg={colors.successBg}
          />
          <Chip
            label="AWAITING REVIEW"
            color={colors.warning}
            bg={colors.warningBg}
          />
          <Chip label="URGENT" color={colors.error} bg={colors.errorBg} />
          <Chip label="IN PROGRESS" color={colors.info} bg={colors.infoBg} />
          <Chip label="NEW" color={colors.accent} bg={colors.accentLight} />
        </View>
      </Section>
    </ScreenWrapper>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay_700Bold",
          fontSize: 24,
          marginBottom: 16,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <View style={{ marginRight: 12, width: 100 }}>
      <View
        style={{
          height: 80,
          borderRadius: 12,
          backgroundColor: hex,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      />
      <Text
        style={{
          fontSize: 12,
          fontFamily: "PlusJakartaSans_600SemiBold",
          marginTop: 8,
        }}
      >
        {name}
      </Text>
      <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }}>
        {hex}
      </Text>
    </View>
  );
}

function Chip({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
      }}
    >
      <Text
        style={{ color, fontSize: 11, fontFamily: "PlusJakartaSans_700Bold" }}
      >
        {label}
      </Text>
    </View>
  );
}
```

### Task I9 — App entry `expo-env.d.ts`

**Files:**

- Create: `D:/onlyou2/apps/mobile/expo-env.d.ts`

- [ ] **Step 1: Write expo env declaration**

```ts
/// <reference types="expo/types" />
/// <reference types="nativewind/types" />
```

### Task I10 — Placeholder assets

**Files:**

- Create: `D:/onlyou2/apps/mobile/assets/icon.png` (placeholder)
- Create: `D:/onlyou2/apps/mobile/assets/splash.png` (placeholder)
- Create: `D:/onlyou2/apps/mobile/assets/adaptive-icon.png` (placeholder)
- Create: `D:/onlyou2/apps/mobile/assets/favicon.png` (placeholder)

- [ ] **Step 1: Copy Expo's default icons as placeholders**

```bash
mkdir -p D:/onlyou2/apps/mobile/assets
# Use Expo's default icon set as a temporary placeholder
npx create-expo-app --template blank@latest D:/tmp/onlyou-asset-source
cp D:/tmp/onlyou-asset-source/assets/*.png D:/onlyou2/apps/mobile/assets/
rm -rf D:/tmp/onlyou-asset-source
```

These are placeholders. Phase 8 (polish) will replace them with real brand assets.

### Task I11 — Install, typecheck, commit

- [ ] **Step 1: Install**

```bash
cd D:/onlyou2
pnpm install
```

Expected: pnpm resolves Expo + RN + NativeWind deps. May print Expo-version-mismatch warnings — if so, run `pnpm --filter @onlyou/mobile exec expo install --check` to fix.

- [ ] **Step 2: Typecheck**

```bash
cd D:/onlyou2
pnpm --filter @onlyou/mobile typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd D:/onlyou2
git add apps/mobile pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(phase-1/i): apps/mobile — Expo + NativeWind scaffold + /design

Expo Router, NativeWind 4, Playfair Display + Plus Jakarta Sans via
@expo-google-fonts. Theme layer re-exports @onlyou/core tokens.
PremiumButton with haptic feedback + spring scale. Splash screen fades
logo in, taps through to /design showcase screen.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase J — Tooling: Husky + lint-staged

### Task J1 — Configure Husky

- [ ] **Step 1: Initialize Husky**

```bash
cd D:/onlyou2
pnpm exec husky init
```

Expected: Creates `.husky/pre-commit` with a default `pnpm test` line.

- [ ] **Step 2: Replace `.husky/pre-commit` contents**

Write to `D:/onlyou2/.husky/pre-commit`:

```sh
pnpm exec lint-staged
pnpm -r typecheck
```

`lint-staged` handles eslint + prettier on staged files. `pnpm -r typecheck` runs typecheck across the workspace (fast after first run due to Turbo cache).

### Task J2 — Configure lint-staged

**Files:**

- Modify: `D:/onlyou2/package.json` (add `lint-staged` key)

- [ ] **Step 1: Add lint-staged config to root package.json**

Append to `D:/onlyou2/package.json` (inside the top-level object, before the closing `}`):

```json
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{md,json,css}": [
      "prettier --write"
    ]
  }
```

- [ ] **Step 2: Verify JSON validity**

```bash
cat D:/onlyou2/package.json | node -e "JSON.parse(require('fs').readFileSync(0,'utf8'))" && echo OK
```

Expected: `OK`.

### Task J3 — Verify hook fires

- [ ] **Step 1: Deliberately introduce a TS error**

Edit `D:/onlyou2/packages/core/src/tokens/colors.ts` and add a line with a type error:

```ts
const broken: number = "not a number";
```

- [ ] **Step 2: Attempt a commit**

```bash
cd D:/onlyou2
git add packages/core/src/tokens/colors.ts
git commit -m "test: should be blocked"
```

Expected: Commit is blocked. Output shows typecheck failure.

- [ ] **Step 3: Remove the error and verify commit works**

Remove the broken line from `colors.ts`. Then:

```bash
cd D:/onlyou2
git add packages/core/src/tokens/colors.ts
git status
```

Expected: `nothing to commit, working tree clean` (the edit → revert left no net change).

### Task J4 — Commit tooling

- [ ] **Step 1: Stage and commit**

```bash
cd D:/onlyou2
git add .husky package.json
git commit -m "$(cat <<'EOF'
chore(phase-1/j): husky + lint-staged pre-commit hook

Blocks commits on lint or typecheck failure per CLAUDE.md rule #6.
Runs eslint --fix + prettier --write on staged files, then typechecks
the full workspace.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase K — End-to-End Verification

Run everything. Get Convex deployed. Confirm every acceptance criterion from spec §10.

### Task K1 — First Convex deployment (founder-assisted)

- [ ] **Step 1: Run `npx convex dev` interactively**

```bash
cd D:/onlyou2
npx convex dev
```

Expected flow:

1. Prompts to log in to Convex (browser opens)
2. Prompts to create a new project or link existing
3. Creates `convex/_generated/` with types matching the Phase 1 schema
4. Prints `CONVEX_DEPLOYMENT` and deployment URL
5. Watches for function changes

**Founder action required:** This is the first step that needs the founder's Convex account. Pause execution here and walk them through the login.

- [ ] **Step 2: Capture deployment URL**

From the `convex dev` output, copy the public URL (e.g., `https://<slug>.convex.cloud`). Update:

- `apps/landing/.env.local` — `NEXT_PUBLIC_CONVEX_URL=<url>`
- `apps/doctor/.env.local` — `NEXT_PUBLIC_CONVEX_URL=<url>`
- `apps/admin/.env.local` — `NEXT_PUBLIC_CONVEX_URL=<url>`
- `apps/mobile/.env.local` — `EXPO_PUBLIC_CONVEX_URL=<url>`

- [ ] **Step 3: Run seed mutation from Convex dashboard**

Open the Convex dashboard URL. Navigate to Functions → `featureFlags:seedFlags`. Click "Run". Expected response: `{ seeded: 7 }`.

Verify: Data tab → `featureFlags` table shows 7 rows, all with `value: false`.

### Task K2 — Typecheck and lint full workspace

- [ ] **Step 1: Typecheck all**

```bash
cd D:/onlyou2
pnpm typecheck
```

Expected: Zero errors across all packages and apps.

- [ ] **Step 2: Lint all**

```bash
cd D:/onlyou2
pnpm lint
```

Expected: Zero errors.

### Task K3 — Start dev server and verify each app

- [ ] **Step 1: Run `pnpm dev` at repo root**

```bash
cd D:/onlyou2
pnpm dev
```

Expected: Turborepo starts Convex, landing, doctor, admin, mobile in parallel. Colored logs stream from each.

- [ ] **Step 2: Verify landing — home page**

Open `http://localhost:3001/` in a browser.

Expected:

- `onlyou` logo renders in Playfair Display Black
- "Care, privately — coming soon" uppercase tracking
- "Your care, in private." headline in Playfair Display
- Waitlist input + Join waitlist button (both disabled)
- Fonts loaded (not fallback system fonts)
- "View design system →" link

- [ ] **Step 3: Verify landing — /design route**

Open `http://localhost:3001/design` in a browser.

Expected: All 10 showcase sections render correctly:

1. Typography (6 type rows, serif headings visible)
2. Core palette (5 swatches with hex)
3. Status colors (5 swatches)
4. Buttons (7 variants + 6 sizes/states)
5. Inputs (default, focus, error, disabled, OTP)
6. Badges (7 variants)
7. Cards (2 vertical-themed cards)
8. Dialog + Toast (both functional — click buttons to test)
9. Skeleton loaders
10. Empty state + Error state

No console errors. No missing fonts. Colors match DESIGN.md.

- [ ] **Step 4: Verify doctor — both routes**

Open `http://localhost:3002/` — expect placeholder home.
Open `http://localhost:3002/design` — expect identical showcase, header labeled `@onlyou/doctor`.

- [ ] **Step 5: Verify admin — both routes**

Open `http://localhost:3003/` — expect placeholder home.
Open `http://localhost:3003/design` — expect identical showcase, header labeled `@onlyou/admin`.

- [ ] **Step 6: Verify mobile — splash + design**

From the Expo terminal output, note the QR code. Open Expo Go on a phone (or an Android emulator / iOS simulator). Scan the QR.

Expected:

- Splash: logo fades in
- Tap through → design screen scrollable with 6 sections
- Tap PremiumButton — feel haptic feedback
- Input focus turns border lavender

### Task K4 — Visual parity check (mobile vs. web)

- [ ] **Step 1: Open landing's `/design` and mobile's `design.tsx` side by side**

Expected: Same colors (sample the background in both — both are `#FAFAF8`). Same fonts (serif looks identical, sans looks identical). Same button primary color. Same focus glow color on inputs.

If any color looks different, the token pipeline has a bug — stop and investigate before proceeding.

### Task K5 — Write `checkpoint.md`

**Files:**

- Create: `D:/onlyou2/checkpoint.md`

- [ ] **Step 1: Write checkpoint file**

```markdown
# Checkpoint

**Current phase:** Phase 1 — Monorepo scaffold + Convex + design system
**Status:** complete — awaiting founder approval gate

## Last session

Scaffolded the Turborepo + pnpm monorepo with Convex (minimal schema + seeded
feature flags), 3 shared packages (core, ui, config), and 4 apps
(mobile, landing, doctor, admin). Every app has a `/design` showcase
route rendering the Clinical Luxe design system from DESIGN.md. Husky
pre-commit hook enforces zero lint/TS errors. Founder to visually
verify each app's `/design` route and approve before Phase 2 begins.

## Next session

Phase 2 — Patient app shell (all screens). Starts with brainstorming
the screen tree against APP-PATIENT.md and APP-PATIENT-CHANGES.md.
Auth (Convex Auth + Gupshup phone OTP provider) is wired up as part
of Phase 2 since the login screen is part of the shell.
```

- [ ] **Step 2: Commit checkpoint**

```bash
cd D:/onlyou2
git add checkpoint.md apps/*/.env.local
git commit -m "$(cat <<'EOF'
chore(phase-1/k): checkpoint + convex env URLs after first deploy

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Note on `.env.local`:** These files should be in `.gitignore` per spec §7.6. Double-check — if they are, SKIP committing them and update the checkpoint commit to only include `checkpoint.md`.

### Task K6 — Acceptance criteria verification

Walk through each acceptance criterion from spec §10 and check it off. If any fail, the phase is not complete.

- [ ] **Criterion 1:** `pnpm install` at repo root succeeds with no errors or warnings.
- [ ] **Criterion 2:** `pnpm typecheck` reports zero errors across all packages and apps.
- [ ] **Criterion 3:** `pnpm lint` reports zero errors across all packages and apps.
- [ ] **Criterion 4:** `pnpm dev` brings up Convex + mobile + landing + doctor + admin concurrently without errors.
- [ ] **Criterion 5:** Convex dashboard shows `users` and `featureFlags` tables; `featureFlags` contains 7 seeded flags with `value: false`.
- [ ] **Criterion 6:** Mobile splash renders `onlyou` logo in Playfair Display Black and transitions to design showcase.
- [ ] **Criterion 7:** Each Next.js app's `/design` route renders all 10 sections with no missing fonts or console errors.
- [ ] **Criterion 8:** Mobile `/design` screen renders all 6 sections.
- [ ] **Criterion 9:** Creating a commit with a deliberate TypeScript error is blocked by pre-commit hook (verified in Task J3).
- [ ] **Criterion 10:** `checkpoint.md` exists and reflects Phase 1 status.
- [ ] **Criterion 11:** Founder visually verifies the showcase on each app and explicitly approves before Phase 2 begins.

If all 11 are green, Phase 1 is complete. Present the work to the founder for the approval gate.

---

## Phase L — Cleanup

### Task L1 — Delete plan-local version tmp file

- [ ] **Step 1: Remove `.planning-versions.tmp.md`**

```bash
rm -f D:/onlyou2/.planning-versions.tmp.md
```

Already gitignored via `*.tmp.md` pattern — no commit needed.

### Task L2 — Delete `.env.local.backup`

- [ ] **Step 1: If the backup from Task A1 is still needed, keep it. Otherwise remove**

```bash
rm -f D:/onlyou2/.env.local.backup
```

### Task L3 — Final commit (if any stragglers)

- [ ] **Step 1: Check for any untracked or uncommitted files**

```bash
cd D:/onlyou2
git status
```

Expected: Clean working tree. If anything is stray, review and decide per file whether to commit or ignore.

---

## Completion

At this point:

- The repo has `apps/{mobile,landing,doctor,admin}` scaffolded.
- `packages/{core,ui,config}` hold all shared code.
- `convex/` has minimal schema + seeded flags + placeholder auth config.
- `pnpm dev` brings up everything.
- Every `/design` route passes visual verification.
- Husky blocks broken commits.
- `checkpoint.md` is written.
- All 11 acceptance criteria are green.

Phase 1 ends here. The founder approves or rejects visually (approval gate). On approval, Phase 2 (Patient app shell) begins — a separate brainstorming session with its own spec and plan.
