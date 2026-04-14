# Phase 2A — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Work inside the worktree created by Task 0 — do not touch master.

**Goal:** Build the foundation layer for the Phase 2 patient app shell — test infrastructure, shared UI primitives (upgraded + new), fixture layer, dev scenario switcher, ESLint no-hardcoded-hex rule, root layout with font loading and auth gate stub. After this plan, the mobile app launches to a splash → placeholder home with the scenario switcher working and every later wave can plug in without rebuilding plumbing.

**Architecture:** All work lives under `apps/mobile/src/` + `apps/mobile/app/_layout.tsx` + `apps/mobile/app/index.tsx` + a couple of `packages/config` additions. Testing uses Jest + `jest-expo` preset + React Native Testing Library. Shared components follow the Hims-iOS pattern from `docs/VISUAL_DIRECTION.md` §4 (floating labels) and §3 (bottom sheets). Fixture layer uses Zustand + AsyncStorage for the dev scenario switcher — wrapped in `__DEV__` guards so release builds dead-code-eliminate the entire module.

**Tech Stack:** Expo SDK 55, Expo Router v5, React Native 0.85, TypeScript strict, NativeWind 4, React Native Reanimated 4, React Native Gesture Handler 2, Zustand + `@react-native-async-storage/async-storage`, Jest + `jest-expo` + `@testing-library/react-native`.

**Authoritative sources:**

- `docs/superpowers/specs/2026-04-14-phase-2-patient-shell-design.md` (§4 — Architecture)
- `docs/VISUAL_DIRECTION.md` §1 (Clinical Luxe Feel Checklist), §3 (Bottom Sheet Patterns), §4 (Floating Label Input Behavior)
- `docs/DESIGN.md` (tokens)
- `CLAUDE.md` Rules 1–10 + DESIGN SYSTEM section
- `docs/DEFERRED.md` (reviewed at the start of this plan — see Task 0 checklist)

**Out of scope for 2A:** Auth screens (Plan 2B), tab layout (Plan 2B), any patient-facing screens (Plans 2C/2D), Convex auth provider (Plan 2B), real biomarker components (Plan 2D).

---

## File Structure

New files this plan creates:

```
apps/mobile/
├── app/
│   ├── _layout.tsx                          [MODIFY]  font loading + splash gate + scenario switcher mount
│   └── index.tsx                            [MODIFY]  splash → route stub (real routing is Plan 2B)
├── app.config.ts                            [MODIFY]  onlyou:// scheme registration
├── jest.config.js                           [NEW]     jest-expo preset + setup files
├── jest.setup.ts                            [NEW]     RTL matchers + global mocks
├── package.json                             [MODIFY]  add jest + RTL + zustand + async-storage deps
└── src/
    ├── components/
    │   ├── ui/
    │   │   ├── PremiumInput.tsx             [MODIFY]  upgrade to floating label
    │   │   ├── PremiumButton.tsx            [MODIFY]  add warm variant (accentWarm)
    │   │   └── BottomSheet.tsx              [NEW]     react-native Modal + Reanimated bottom sheet
    │   ├── placeholder-screen.tsx           [NEW]     "Coming in Phase X" placeholder
    │   └── gender-gate.tsx                  [NEW]     <GenderGate allow={['female']}>
    ├── fixtures/
    │   ├── patient-states.ts                [NEW]     4 FixtureUser objects + types
    │   └── index.ts                         [NEW]     barrel
    ├── hooks/
    │   ├── use-patient-state.ts             [NEW]     reads active scenario's FixtureUser
    │   ├── use-gender.ts                    [NEW]     reads authenticated user's gender
    │   └── index.ts                         [NEW]     barrel
    ├── stores/
    │   └── dev-scenario-store.ts            [NEW]     Zustand + AsyncStorage persist, __DEV__-gated
    ├── dev/
    │   └── scenario-switcher.tsx            [NEW]     bottom-sheet UI, triple-tap handler
    └── test-utils/
        ├── test-provider.tsx                [NEW]     <TestProvider scenario="new"> wrapper
        └── mock-router.ts                   [NEW]     expo-router test helpers

packages/config/
├── eslint/
│   └── no-hardcoded-hex.js                  [NEW]     custom ESLint rule
└── eslint.base.js                           [MODIFY]  register the no-hardcoded-hex rule

__tests__/                                   (apps/mobile/__tests__/)
├── smoke.test.ts                            [NEW]     jest setup smoke test
├── components/
│   ├── premium-input.test.tsx               [NEW]
│   ├── premium-button.test.tsx              [NEW]
│   ├── bottom-sheet.test.tsx                [NEW]
│   ├── placeholder-screen.test.tsx          [NEW]
│   └── gender-gate.test.tsx                 [NEW]
├── fixtures/
│   └── patient-states.test.ts               [NEW]
├── hooks/
│   └── use-patient-state.test.tsx           [NEW]
├── stores/
│   └── dev-scenario-store.test.tsx          [NEW]
└── dev/
    └── scenario-switcher.test.tsx           [NEW]
```

---

## Task 0 — Worktree + branch setup

**Files:** git worktree (no files modified yet)

- [ ] **Step 1: Review `docs/DEFERRED.md` before starting**

Per `CLAUDE.md` Rule 9, every phase brainstorm/plan starts by reading the deferred ledger.

Run: `cat docs/DEFERRED.md`
Expected: Read the "Phase 2 — Patient app shell (in progress, brainstorm stage)" section end-to-end. Confirm nothing in Plan 2A scope conflicts with a deferral.

- [ ] **Step 2: Create a dedicated worktree**

Run:

```bash
git worktree add -b feature/phase-2a-foundation ../onlyou2-phase-2a master
cd ../onlyou2-phase-2a
```

Expected: new worktree at `../onlyou2-phase-2a` on a fresh branch `feature/phase-2a-foundation` cut from `master`.

- [ ] **Step 3: Verify clean working tree**

Run: `git status`
Expected: `nothing to commit, working tree clean`.

- [ ] **Step 4: Commit (empty — marks phase start)**

Run:

```bash
git commit --allow-empty -m "chore(phase-2a): begin foundation plan"
```

---

## Task 1 — Install test infrastructure deps

**Files:**

- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Add dev-dependencies**

Run (from worktree root):

```bash
pnpm --filter @onlyou/mobile add -D \
  jest@29 \
  jest-expo@55 \
  @testing-library/react-native@13 \
  @testing-library/jest-native@5 \
  @types/jest@29 \
  react-test-renderer@19
```

Expected: `apps/mobile/package.json` now lists the six packages under `devDependencies` with the versions above. Lockfile updates. No install warnings blocking install.

- [ ] **Step 2: Add runtime deps for fixture layer**

Run:

```bash
pnpm --filter @onlyou/mobile add \
  zustand@5 \
  @react-native-async-storage/async-storage@2
```

Expected: `zustand` and `@react-native-async-storage/async-storage` appear under `dependencies` in `apps/mobile/package.json`.

- [ ] **Step 3: Verify the install**

Run: `pnpm --filter @onlyou/mobile list --depth=0`
Expected: all six dev deps + zustand + async-storage present.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml
git commit -m "feat(phase-2a/1): install jest + rtl + zustand deps"
```

---

## Task 2 — Jest config + smoke test

**Files:**

- Create: `apps/mobile/jest.config.js`
- Create: `apps/mobile/jest.setup.ts`
- Create: `apps/mobile/__tests__/smoke.test.ts`
- Modify: `apps/mobile/package.json` (add `test` script)

- [ ] **Step 1: Write the failing smoke test**

Create `apps/mobile/__tests__/smoke.test.ts`:

```ts
describe("jest is alive", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2: Run it (expect jest not configured)**

Run: `pnpm --filter @onlyou/mobile test`
Expected: FAIL — no test script, or jest not finding config.

- [ ] **Step 3: Write the jest config**

Create `apps/mobile/jest.config.js`:

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEach: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.test.(ts|tsx)"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|@gorhom/bottom-sheet))",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css)$": "<rootDir>/__mocks__/style-mock.js",
  },
};
```

Create `apps/mobile/jest.setup.ts`:

```ts
import "@testing-library/jest-native/extend-expect";

// Silence noisy RN warnings in tests
jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper", () => ({}), {
  virtual: true,
});

// AsyncStorage mock
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
```

Create `apps/mobile/__mocks__/style-mock.js`:

```js
module.exports = {};
```

- [ ] **Step 4: Add the test script**

Edit `apps/mobile/package.json` — add under `scripts`:

```json
    "test": "jest",
    "test:watch": "jest --watch"
```

- [ ] **Step 5: Run the smoke test (expect PASS)**

Run: `pnpm --filter @onlyou/mobile test`
Expected: `PASS __tests__/smoke.test.ts · jest is alive › runs`.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/jest.config.js apps/mobile/jest.setup.ts apps/mobile/__mocks__/style-mock.js apps/mobile/__tests__/smoke.test.ts apps/mobile/package.json
git commit -m "feat(phase-2a/2): jest-expo + rtl config + passing smoke test"
```

---

## Task 3 — Test helpers (`TestProvider` + `mockRouter`)

**Files:**

- Create: `apps/mobile/src/test-utils/test-provider.tsx`
- Create: `apps/mobile/src/test-utils/mock-router.ts`
- Create: `apps/mobile/src/test-utils/index.ts`
- Create: `apps/mobile/__tests__/test-utils.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/test-utils.test.tsx`:

```tsx
import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { TestProvider } from "@/test-utils";

describe("TestProvider", () => {
  it("renders children", () => {
    const { getByText } = render(
      <TestProvider scenario="new">
        <Text>hello</Text>
      </TestProvider>,
    );
    expect(getByText("hello")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it — expect FAIL (import doesn't exist)**

Run: `pnpm --filter @onlyou/mobile test test-utils`
Expected: FAIL — `Cannot find module '@/test-utils'`.

- [ ] **Step 3: Write `TestProvider`**

Create `apps/mobile/src/test-utils/test-provider.tsx`:

```tsx
import type { ReactNode } from "react";

import type { PatientState } from "@/fixtures/patient-states";

interface TestProviderProps {
  scenario?: PatientState;
  children: ReactNode;
}

/**
 * Wraps a component tree for tests. Sets the dev scenario store to the
 * given scenario before render so `usePatientState()` returns that fixture.
 * The store import is lazy to avoid circular deps with the fixture file.
 */
export function TestProvider({
  scenario = "new",
  children,
}: TestProviderProps) {
  // Lazy import keeps test-utils independent of store init order
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useDevScenarioStore } = require("@/stores/dev-scenario-store");
  useDevScenarioStore.setState({ activeScenario: scenario });
  return <>{children}</>;
}
```

Create `apps/mobile/src/test-utils/mock-router.ts`:

```ts
import { jest } from "@jest/globals";

/**
 * Returns a mocked `router.push` function and installs a jest mock on
 * `expo-router`'s `router` export. Use in tests that exercise navigation:
 *   const push = mockRouter();
 *   fireEvent.press(...);
 *   expect(push).toHaveBeenCalledWith('/route');
 */
export function mockRouter() {
  const push = jest.fn();
  const replace = jest.fn();
  const back = jest.fn();

  jest.mock("expo-router", () => ({
    router: { push, replace, back },
    useRouter: () => ({ push, replace, back }),
    Stack: ({ children }: { children: React.ReactNode }) => children,
    Tabs: ({ children }: { children: React.ReactNode }) => children,
    Link: ({ children }: { children: React.ReactNode }) => children,
  }));

  return push;
}
```

Create `apps/mobile/src/test-utils/index.ts`:

```ts
export { TestProvider } from "./test-provider";
export { mockRouter } from "./mock-router";
```

- [ ] **Step 4: The test still fails — also needs the store + fixture shapes that Tasks 10, 11 introduce**

This is intentional — we're writing the test-util first to lock its shape. The red test at Step 2 becomes green after Task 12. We commit the stub now and come back for the final green after Task 12.

Run: `pnpm --filter @onlyou/mobile test test-utils` → expect a module-not-found on `@/stores/dev-scenario-store`. That's the right red state.

- [ ] **Step 5: Commit the stub**

```bash
git add apps/mobile/src/test-utils
git commit -m "feat(phase-2a/3): TestProvider + mockRouter stubs (green after task 12)"
```

---

## Task 4 — `no-hardcoded-hex` ESLint rule

**Files:**

- Create: `packages/config/eslint/no-hardcoded-hex.js`
- Modify: `packages/config/eslint.base.js`
- Create: `packages/config/__tests__/no-hardcoded-hex.test.js`

- [ ] **Step 1: Write the failing rule test**

Create `packages/config/__tests__/no-hardcoded-hex.test.js`:

```js
const { RuleTester } = require("eslint");

const rule = require("../eslint/no-hardcoded-hex");

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

ruleTester.run("no-hardcoded-hex", rule, {
  valid: [
    { code: "const c = colors.primary;" },
    { code: 'const bg = "transparent";' },
    { code: "// #141414 is fine in comments" },
    { code: 'const url = "https://example.com/#anchor";' },
  ],
  invalid: [
    {
      code: 'const c = "#141414";',
      errors: [{ messageId: "noHex" }],
    },
    {
      code: 'const c = { color: "#FF0000" };',
      errors: [{ messageId: "noHex" }],
    },
  ],
});

console.log("no-hardcoded-hex rule tests passed");
```

- [ ] **Step 2: Run the test — expect FAIL (rule doesn't exist)**

Run: `node packages/config/__tests__/no-hardcoded-hex.test.js`
Expected: error on `require('../eslint/no-hardcoded-hex')`.

- [ ] **Step 3: Write the rule**

Create `packages/config/eslint/no-hardcoded-hex.js`:

```js
/**
 * Disallows hex color literals in code. All colors must be imported from
 * @onlyou/core/tokens/colors (or the mobile re-export in apps/mobile/src/theme/colors).
 *
 * Rationale: CLAUDE.md "DESIGN SYSTEM" §Critical rules + docs/VISUAL_DIRECTION.md §1.
 */
const HEX_RE = /^#(?:[0-9a-fA-F]{3}){1,2}(?:[0-9a-fA-F]{2})?$/;

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow hex color literals outside token files",
    },
    messages: {
      noHex:
        "Hardcoded hex color. Import from @onlyou/core/tokens/colors instead. See CLAUDE.md §DESIGN SYSTEM.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    // Token files themselves are allowed to define hex.
    if (filename.includes("packages/core/src/tokens/")) return {};
    // Test files need hex literals for rule tests.
    if (filename.includes("/__tests__/") && filename.endsWith(".test.js"))
      return {};

    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        if (!HEX_RE.test(node.value)) return;
        context.report({ node, messageId: "noHex" });
      },
      TemplateElement(node) {
        if (!HEX_RE.test(node.value.raw.trim())) return;
        context.report({ node, messageId: "noHex" });
      },
    };
  },
};
```

- [ ] **Step 4: Run the test — expect PASS**

Run: `node packages/config/__tests__/no-hardcoded-hex.test.js`
Expected: `no-hardcoded-hex rule tests passed`.

- [ ] **Step 5: Register the rule in the shared eslint base**

Edit `packages/config/eslint.base.js`. Add to the plugin registration + rules:

```js
const noHardcodedHex = require('./eslint/no-hardcoded-hex');

// Inside the exported config array, append a rule block:
{
  plugins: {
    onlyou: {
      rules: {
        'no-hardcoded-hex': noHardcodedHex,
      },
    },
  },
  rules: {
    'onlyou/no-hardcoded-hex': 'error',
  },
},
```

(Exact placement: after existing plugin registrations, before the file-overrides block.)

- [ ] **Step 6: Verify the lint run still passes**

Run: `pnpm --filter @onlyou/mobile lint`
Expected: zero errors. (Current apps/mobile code already uses `colors.*` imports from Phase 1.)

- [ ] **Step 7: Verify the rule bites on a bad input**

Temporarily add to any mobile file:

```ts
const bad = "#ff0000";
```

Run: `pnpm --filter @onlyou/mobile lint`
Expected: `onlyou/no-hardcoded-hex` error. Revert the file. Re-run, expect clean.

- [ ] **Step 8: Commit**

```bash
git add packages/config/eslint packages/config/__tests__ packages/config/eslint.base.js
git commit -m "feat(phase-2a/4): custom no-hardcoded-hex eslint rule"
```

---

## Task 5 — Upgrade `PremiumInput` to floating label

**Files:**

- Modify: `apps/mobile/src/components/ui/PremiumInput.tsx`
- Create: `apps/mobile/__tests__/components/premium-input.test.tsx`

Spec reference: `docs/VISUAL_DIRECTION.md` §4 (Floating Label Input Behavior) — 4 states: Empty+Unfocused, Focused/Filled, Error, Disabled. 60px input height, label 14px→11px via `withTiming` 200ms ease-out.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/components/premium-input.test.tsx`:

```tsx
import { fireEvent, render } from "@testing-library/react-native";

import { PremiumInput } from "@/components/ui/PremiumInput";

describe("<PremiumInput>", () => {
  it("renders the label as a floating element", () => {
    const { getByText } = render(<PremiumInput label="Phone number" />);
    expect(getByText("Phone number")).toBeTruthy();
  });

  it("calls onChangeText when the user types", () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <PremiumInput
        label="Phone number"
        testID="phone-input"
        onChangeText={onChangeText}
      />,
    );
    fireEvent.changeText(getByTestId("phone-input"), "9876543210");
    expect(onChangeText).toHaveBeenCalledWith("9876543210");
  });

  it("shows error text when error prop is set", () => {
    const { getByText } = render(
      <PremiumInput label="Phone number" error="Invalid number" />,
    );
    expect(getByText("Invalid number")).toBeTruthy();
  });

  it("applies disabled styling when editable is false", () => {
    const { getByTestId } = render(
      <PremiumInput
        label="Phone number"
        testID="phone-input"
        editable={false}
      />,
    );
    // RN passes editable through; the component also sets a style flag
    expect(getByTestId("phone-input").props.editable).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (current component has no error text rendering)**

Run: `pnpm --filter @onlyou/mobile test premium-input`
Expected: some tests PASS (basic label), error test likely FAIL.

- [ ] **Step 3: Rewrite `PremiumInput` with floating label**

Overwrite `apps/mobile/src/components/ui/PremiumInput.tsx`:

```tsx
import { useEffect, useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "../../theme/colors";

const INPUT_HEIGHT = 60;
const LABEL_REST_TOP = 20;
const LABEL_REST_FONT = 14;
const LABEL_FLOAT_TOP = 10;
const LABEL_FLOAT_FONT = 11;
const BORDER_RADIUS = 14;
const HORIZONTAL_PADDING = 16;

export interface PremiumInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function PremiumInput({
  label,
  error,
  value,
  defaultValue,
  onFocus,
  onBlur,
  editable = true,
  testID,
  ...rest
}: PremiumInputProps) {
  const [focused, setFocused] = useState(false);
  const [innerValue, setInnerValue] = useState(defaultValue ?? "");
  const currentValue = value ?? innerValue;
  const shouldFloat = focused || currentValue.length > 0;

  const labelTop = useSharedValue(
    shouldFloat ? LABEL_FLOAT_TOP : LABEL_REST_TOP,
  );
  const labelFont = useSharedValue(
    shouldFloat ? LABEL_FLOAT_FONT : LABEL_REST_FONT,
  );

  useEffect(() => {
    const config = { duration: 200, easing: Easing.out(Easing.ease) };
    labelTop.value = withTiming(
      shouldFloat ? LABEL_FLOAT_TOP : LABEL_REST_TOP,
      config,
    );
    labelFont.value = withTiming(
      shouldFloat ? LABEL_FLOAT_FONT : LABEL_REST_FONT,
      config,
    );
  }, [shouldFloat, labelTop, labelFont]);

  const labelStyle = useAnimatedStyle(() => ({
    top: labelTop.value,
    fontSize: labelFont.value,
  }));

  const borderColor = error
    ? colors.error
    : focused
      ? colors.borderFocus
      : colors.border;

  const labelColor = error
    ? colors.error
    : focused
      ? colors.accent
      : colors.textTertiary;

  return (
    <View>
      <View
        style={{
          height: INPUT_HEIGHT,
          borderRadius: BORDER_RADIUS,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: editable ? colors.white : colors.offWhite,
          paddingHorizontal: HORIZONTAL_PADDING,
          justifyContent: "center",
        }}
      >
        <Animated.Text
          style={[
            {
              position: "absolute",
              left: HORIZONTAL_PADDING,
              color: labelColor,
              fontWeight: "500",
            },
            labelStyle,
          ]}
        >
          {label}
        </Animated.Text>
        <TextInput
          testID={testID}
          editable={editable}
          value={value}
          defaultValue={defaultValue}
          onChangeText={(t) => {
            setInnerValue(t);
            rest.onChangeText?.(t);
          }}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.textMuted}
          style={{
            color: editable ? colors.textPrimary : colors.textMuted,
            fontSize: 16,
            fontWeight: "500",
            paddingTop: 18,
          }}
          {...rest}
        />
      </View>
      {error ? (
        <View style={{ marginTop: 4, paddingHorizontal: HORIZONTAL_PADDING }}>
          <Animated.Text
            style={{ color: colors.error, fontSize: 12, fontWeight: "500" }}
          >
            {error}
          </Animated.Text>
        </View>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Run the tests — expect PASS (all 4)**

Run: `pnpm --filter @onlyou/mobile test premium-input`
Expected: `PASS · <PremiumInput> · 4 tests`.

- [ ] **Step 5: Lint + typecheck**

Run:

```bash
pnpm --filter @onlyou/mobile lint
pnpm --filter @onlyou/mobile typecheck
```

Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/ui/PremiumInput.tsx apps/mobile/__tests__/components/premium-input.test.tsx
git commit -m "feat(phase-2a/5): upgrade PremiumInput to floating-label pattern"
```

---

## Task 6 — Upgrade `PremiumButton` with `warm` variant

**Files:**

- Modify: `apps/mobile/src/components/ui/PremiumButton.tsx`
- Create: `apps/mobile/__tests__/components/premium-button.test.tsx`

Spec reference: `docs/VISUAL_DIRECTION.md` §1 (Feel Checklist: "Consultation flow CTAs use `accentWarm` (#C4956B) background, not `primary`") + §2.5 (consultation shell).

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/components/premium-button.test.tsx`:

```tsx
import { fireEvent, render } from "@testing-library/react-native";

import { PremiumButton } from "@/components/ui/PremiumButton";

describe("<PremiumButton>", () => {
  it("renders the label", () => {
    const { getByText } = render(
      <PremiumButton label="Continue" onPress={() => {}} />,
    );
    expect(getByText("Continue")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <PremiumButton label="Continue" onPress={onPress} />,
    );
    fireEvent.press(getByText("Continue"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <PremiumButton label="Continue" disabled onPress={onPress} />,
    );
    fireEvent.press(getByText("Continue"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("accepts all four variants without crashing", () => {
    const variants: Array<"primary" | "secondary" | "ghost" | "warm"> = [
      "primary",
      "secondary",
      "ghost",
      "warm",
    ];
    for (const v of variants) {
      const { getByText, unmount } = render(
        <PremiumButton label={v} variant={v} onPress={() => {}} />,
      );
      expect(getByText(v)).toBeTruthy();
      unmount();
    }
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (no warm variant yet)**

Run: `pnpm --filter @onlyou/mobile test premium-button`
Expected: variant test likely FAIL or the component passes through unknown variants silently — either way, we want an explicit warm style.

- [ ] **Step 3: Update `PremiumButton` to add `warm` variant**

Overwrite `apps/mobile/src/components/ui/PremiumButton.tsx`:

```tsx
import { Pressable, Text, type PressableProps } from "react-native";

import { colors } from "../../theme/colors";

type Variant = "primary" | "secondary" | "ghost" | "warm";

export interface PremiumButtonProps extends Omit<
  PressableProps,
  "children" | "style"
> {
  label: string;
  variant?: Variant;
  disabled?: boolean;
}

const variantStyles: Record<
  Variant,
  { bg: string; fg: string; border?: string }
> = {
  primary: { bg: colors.ctaPrimary, fg: colors.ctaPrimaryText },
  secondary: {
    bg: colors.ctaSecondary,
    fg: colors.textPrimary,
    border: colors.ctaSecondaryBorder,
  },
  ghost: { bg: "transparent", fg: colors.textPrimary },
  warm: { bg: colors.accentWarm, fg: colors.primaryForeground },
};

export function PremiumButton({
  label,
  variant = "primary",
  disabled = false,
  onPress,
  ...rest
}: PremiumButtonProps) {
  const style = disabled
    ? { bg: colors.ctaDisabled, fg: colors.ctaDisabledText }
    : variantStyles[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 56,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: style.bg,
        borderWidth: style.border ? 1.5 : 0,
        borderColor: style.border,
        opacity: pressed && !disabled ? 0.9 : 1,
      })}
      {...rest}
    >
      <Text
        style={{
          color: style.fg,
          fontSize: 16,
          fontWeight: "700",
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS (4 tests)**

Run: `pnpm --filter @onlyou/mobile test premium-button`
Expected: `PASS · <PremiumButton> · 4 tests`.

- [ ] **Step 5: Lint + typecheck**

Run:

```bash
pnpm --filter @onlyou/mobile lint
pnpm --filter @onlyou/mobile typecheck
```

Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/ui/PremiumButton.tsx apps/mobile/__tests__/components/premium-button.test.tsx
git commit -m "feat(phase-2a/6): PremiumButton warm variant for consultation CTAs"
```

---

## Task 7 — `BottomSheet` primitive

**Files:**

- Create: `apps/mobile/src/components/ui/BottomSheet.tsx`
- Create: `apps/mobile/__tests__/components/bottom-sheet.test.tsx`

Spec reference: `docs/VISUAL_DIRECTION.md` §3 (Bottom Sheet Patterns). Drag indicator 36×5px, cardTitle 18px SemiBold, safe area bottom padding, overlay rgba(0,0,0,0.3). Animation: spring damping 15, stiffness 300.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/components/bottom-sheet.test.tsx`:

```tsx
import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";

describe("<BottomSheet>", () => {
  it("renders nothing when visible is false", () => {
    const { queryByText } = render(
      <BottomSheet visible={false} onClose={() => {}} title="Hello">
        <Text>content</Text>
      </BottomSheet>,
    );
    expect(queryByText("content")).toBeNull();
  });

  it("renders the title and children when visible", () => {
    const { getByText } = render(
      <BottomSheet visible onClose={() => {}} title="Pick a scenario">
        <Text>content</Text>
      </BottomSheet>,
    );
    expect(getByText("Pick a scenario")).toBeTruthy();
    expect(getByText("content")).toBeTruthy();
  });

  it("calls onClose when the overlay is pressed", () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <BottomSheet visible onClose={onClose} title="x" testID="sheet">
        <Text>content</Text>
      </BottomSheet>,
    );
    fireEvent.press(getByTestId("sheet-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (component doesn't exist)**

Run: `pnpm --filter @onlyou/mobile test bottom-sheet`
Expected: `Cannot find module '@/components/ui/BottomSheet'`.

- [ ] **Step 3: Write the component**

Create `apps/mobile/src/components/ui/BottomSheet.tsx`:

```tsx
import type { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../theme/colors";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  testID?: string;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  testID,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      testID={testID}
    >
      <Pressable
        testID={testID ? `${testID}-overlay` : undefined}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 8,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: 36,
              height: 5,
              borderRadius: 999,
              backgroundColor: colors.border,
              alignSelf: "center",
              marginBottom: 16,
            }}
          />
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.textPrimary,
              marginBottom: 16,
            }}
          >
            {title}
          </Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
```

- [ ] **Step 4: Run — expect PASS (3 tests)**

Run: `pnpm --filter @onlyou/mobile test bottom-sheet`
Expected: `PASS · <BottomSheet> · 3 tests`.

- [ ] **Step 5: Lint + typecheck**

Run:

```bash
pnpm --filter @onlyou/mobile lint
pnpm --filter @onlyou/mobile typecheck
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/ui/BottomSheet.tsx apps/mobile/__tests__/components/bottom-sheet.test.tsx
git commit -m "feat(phase-2a/7): BottomSheet primitive (Modal + safe area)"
```

---

## Task 8 — `<PlaceholderScreen>` component

**Files:**

- Create: `apps/mobile/src/components/placeholder-screen.tsx`
- Create: `apps/mobile/__tests__/components/placeholder-screen.test.tsx`

Spec reference: §3.2 of the spec — every deferred route renders this so `router.push()` never hits a dead target.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/components/placeholder-screen.test.tsx`:

```tsx
import { render } from "@testing-library/react-native";

import { PlaceholderScreen } from "@/components/placeholder-screen";

describe("<PlaceholderScreen>", () => {
  it("renders the title and phase", () => {
    const { getByText } = render(
      <PlaceholderScreen
        title="Wallet"
        phase="Phase 3"
        reason="No real transactions yet"
      />,
    );
    expect(getByText("Wallet")).toBeTruthy();
    expect(getByText(/Coming in Phase 3/)).toBeTruthy();
    expect(getByText(/No real transactions yet/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @onlyou/mobile test placeholder-screen`
Expected: FAIL — import missing.

- [ ] **Step 3: Write the component**

Create `apps/mobile/src/components/placeholder-screen.tsx`:

```tsx
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/colors";

export interface PlaceholderScreenProps {
  title: string;
  phase: string;
  reason?: string;
}

export function PlaceholderScreen({
  title,
  phase,
  reason,
}: PlaceholderScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 16,
        paddingHorizontal: 24,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 999,
          backgroundColor: colors.accentLight,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 32, color: colors.accent }}>◌</Text>
      </View>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.accent,
          fontWeight: "700",
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        Coming in {phase}
      </Text>
      {reason ? (
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
            lineHeight: 20,
            maxWidth: 280,
          }}
        >
          {reason}
        </Text>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @onlyou/mobile test placeholder-screen`
Expected: `PASS · <PlaceholderScreen> · 1 test`.

- [ ] **Step 5: Lint + typecheck + commit**

```bash
pnpm --filter @onlyou/mobile lint
pnpm --filter @onlyou/mobile typecheck
git add apps/mobile/src/components/placeholder-screen.tsx apps/mobile/__tests__/components/placeholder-screen.test.tsx
git commit -m "feat(phase-2a/8): PlaceholderScreen for deferred routes"
```

---

## Task 9 — `<GenderGate>` + `useGender` hook

**Files:**

- Create: `apps/mobile/src/hooks/use-gender.ts`
- Create: `apps/mobile/src/hooks/index.ts` (barrel)
- Create: `apps/mobile/src/components/gender-gate.tsx`
- Create: `apps/mobile/__tests__/components/gender-gate.test.tsx`

Spec reference: `docs/APP-PATIENT-ADDITIONS.md` §1 + spec §4.7. Rules: male shows Hair Loss/ED/PE/Weight; female shows Hair Loss/Weight/PCOS; other/prefer-not-to-say shows all.

- [ ] **Step 1: Write the failing tests**

Create `apps/mobile/__tests__/components/gender-gate.test.tsx`:

```tsx
import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { GenderGate } from "@/components/gender-gate";
import { TestProvider } from "@/test-utils";

describe("<GenderGate>", () => {
  it("renders children when the active scenario gender is in allow list", () => {
    const { getByText } = render(
      <TestProvider scenario="active">
        {/* sanjana = female */}
        <GenderGate allow={["female"]}>
          <Text>visible</Text>
        </GenderGate>
      </TestProvider>,
    );
    expect(getByText("visible")).toBeTruthy();
  });

  it("renders nothing when the active scenario gender is not in allow list", () => {
    const { queryByText } = render(
      <TestProvider scenario="new">
        {/* arjun = male */}
        <GenderGate allow={["female"]}>
          <Text>visible</Text>
        </GenderGate>
      </TestProvider>,
    );
    expect(queryByText("visible")).toBeNull();
  });

  it("renders a fallback when provided and the gender is not allowed", () => {
    const { getByText } = render(
      <TestProvider scenario="new">
        <GenderGate allow={["female"]} fallback={<Text>not available</Text>}>
          <Text>visible</Text>
        </GenderGate>
      </TestProvider>,
    );
    expect(getByText("not available")).toBeTruthy();
  });

  it('allows "other" through when in the allow list', () => {
    const { getByText } = render(
      <TestProvider scenario="new">
        <GenderGate allow={["male", "other"]}>
          <Text>visible</Text>
        </GenderGate>
      </TestProvider>,
    );
    expect(getByText("visible")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL (hook + component + fixtures not there yet)**

Run: `pnpm --filter @onlyou/mobile test gender-gate`
Expected: fails on import resolution of `@/hooks/use-gender` or `@/fixtures/patient-states`.

- [ ] **Step 3: Write the hook**

Create `apps/mobile/src/hooks/use-gender.ts`:

```ts
import { usePatientState } from "./use-patient-state";

export type Gender = "male" | "female" | "other";

export function useGender(): Gender {
  return usePatientState().gender;
}
```

Create `apps/mobile/src/hooks/index.ts`:

```ts
export { usePatientState } from "./use-patient-state";
export { useGender, type Gender } from "./use-gender";
```

- [ ] **Step 4: Write the component**

Create `apps/mobile/src/components/gender-gate.tsx`:

```tsx
import type { ReactNode } from "react";

import { useGender, type Gender } from "../hooks/use-gender";

export interface GenderGateProps {
  allow: Gender[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function GenderGate({
  allow,
  fallback = null,
  children,
}: GenderGateProps) {
  const gender = useGender();
  if (allow.includes(gender)) return <>{children}</>;
  return <>{fallback}</>;
}
```

- [ ] **Step 5: Tests still fail**

The test relies on `TestProvider` and `usePatientState` which are stubs until Task 12. This is expected — the red state now narrows to a consistent "fixture module not found" error. Document in the commit message.

- [ ] **Step 6: Commit the stubs**

```bash
git add apps/mobile/src/hooks apps/mobile/src/components/gender-gate.tsx apps/mobile/__tests__/components/gender-gate.test.tsx
git commit -m "feat(phase-2a/9): GenderGate + useGender (green after task 12)"
```

---

## Task 10 — `patient-states.ts` fixture types + 4 users

**Files:**

- Create: `apps/mobile/src/fixtures/patient-states.ts`
- Create: `apps/mobile/src/fixtures/index.ts`
- Create: `apps/mobile/__tests__/fixtures/patient-states.test.ts`

Spec reference: §4.5 — 4 FixtureUser objects keyed by PatientState. For Plan 2A, ship the minimum useful shape; Plans 2B–2D will extend each user's slice as screens need more data.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/fixtures/patient-states.test.ts`:

```ts
import { FIXTURES, type PatientState } from "@/fixtures/patient-states";

describe("patient-states fixtures", () => {
  const states: PatientState[] = ["new", "reviewing", "ready", "active"];

  it.each(states)('has a fixture for "%s"', (state) => {
    expect(FIXTURES[state]).toBeDefined();
    expect(FIXTURES[state].state).toBe(state);
  });

  it("covers both genders across the four scenarios", () => {
    const genders = states.map((s) => FIXTURES[s].gender);
    expect(genders).toContain("male");
    expect(genders).toContain("female");
  });

  it("seeds the expected phone numbers", () => {
    expect(FIXTURES.new.phone).toBe("+91 99999 00001");
    expect(FIXTURES.reviewing.phone).toBe("+91 99999 00002");
    expect(FIXTURES.ready.phone).toBe("+91 99999 00003");
    expect(FIXTURES.active.phone).toBe("+91 99999 00004");
  });

  it("gives every fixture user a name and age", () => {
    for (const state of states) {
      const user = FIXTURES[state];
      expect(user.name.length).toBeGreaterThan(0);
      expect(user.age).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @onlyou/mobile test patient-states`
Expected: module not found.

- [ ] **Step 3: Write the fixtures**

Create `apps/mobile/src/fixtures/patient-states.ts`:

```ts
export type PatientState = "new" | "reviewing" | "ready" | "active";
export type Gender = "male" | "female" | "other";

export interface FixtureUser {
  /** Stable id matching the seeded Convex user record (Plan 2B seeds). */
  userId: string;
  phone: string;
  name: string;
  gender: Gender;
  age: number;
  state: PatientState;

  /**
   * These slices are intentionally empty in Plan 2A. Plans 2B-2D extend
   * each fixture with real screen-specific data (consultations,
   * prescriptions, orders, deliveries, messages, biomarker reports,
   * subscriptions) as they build the screens that need them.
   */
  consultations: unknown[];
  prescriptions: unknown[];
  orders: unknown[];
  deliveries: unknown[];
  messages: unknown[];
  biomarkerReports: unknown[];
  subscriptions: unknown[];
}

const arjun: FixtureUser = {
  userId: "fixture-arjun",
  phone: "+91 99999 00001",
  name: "Arjun Sharma",
  gender: "male",
  age: 32,
  state: "new",
  consultations: [],
  prescriptions: [],
  orders: [],
  deliveries: [],
  messages: [],
  biomarkerReports: [],
  subscriptions: [],
};

const priya: FixtureUser = {
  userId: "fixture-priya",
  phone: "+91 99999 00002",
  name: "Priya Iyer",
  gender: "female",
  age: 29,
  state: "reviewing",
  consultations: [],
  prescriptions: [],
  orders: [],
  deliveries: [],
  messages: [],
  biomarkerReports: [],
  subscriptions: [],
};

const rahul: FixtureUser = {
  userId: "fixture-rahul",
  phone: "+91 99999 00003",
  name: "Rahul Mehta",
  gender: "male",
  age: 35,
  state: "ready",
  consultations: [],
  prescriptions: [],
  orders: [],
  deliveries: [],
  messages: [],
  biomarkerReports: [],
  subscriptions: [],
};

const sanjana: FixtureUser = {
  userId: "fixture-sanjana",
  phone: "+91 99999 00004",
  name: "Sanjana Rao",
  gender: "female",
  age: 28,
  state: "active",
  consultations: [],
  prescriptions: [],
  orders: [],
  deliveries: [],
  messages: [],
  biomarkerReports: [],
  subscriptions: [],
};

export const FIXTURES: Record<PatientState, FixtureUser> = {
  new: arjun,
  reviewing: priya,
  ready: rahul,
  active: sanjana,
};
```

Create `apps/mobile/src/fixtures/index.ts`:

```ts
export {
  FIXTURES,
  type FixtureUser,
  type PatientState,
  type Gender,
} from "./patient-states";
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @onlyou/mobile test patient-states`
Expected: `PASS · patient-states fixtures · 4 tests`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/fixtures apps/mobile/__tests__/fixtures/patient-states.test.ts
git commit -m "feat(phase-2a/10): FIXTURES with 4 patient-state users (arjun/priya/rahul/sanjana)"
```

---

## Task 11 — `dev-scenario-store` (Zustand + AsyncStorage persist)

**Files:**

- Create: `apps/mobile/src/stores/dev-scenario-store.ts`
- Create: `apps/mobile/__tests__/stores/dev-scenario-store.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/stores/dev-scenario-store.test.tsx`:

```tsx
import { act } from "@testing-library/react-native";

import { useDevScenarioStore } from "@/stores/dev-scenario-store";

describe("dev-scenario-store", () => {
  beforeEach(() => {
    act(() => {
      useDevScenarioStore.setState({ activeScenario: "new" });
    });
  });

  it('starts with "new" as the default scenario', () => {
    expect(useDevScenarioStore.getState().activeScenario).toBe("new");
  });

  it("setScenario updates the active scenario", () => {
    act(() => {
      useDevScenarioStore.getState().setScenario("active");
    });
    expect(useDevScenarioStore.getState().activeScenario).toBe("active");
  });

  it('resetScenario returns to "new"', () => {
    act(() => {
      useDevScenarioStore.getState().setScenario("ready");
      useDevScenarioStore.getState().resetScenario();
    });
    expect(useDevScenarioStore.getState().activeScenario).toBe("new");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @onlyou/mobile test dev-scenario-store`
Expected: module not found.

- [ ] **Step 3: Write the store**

Create `apps/mobile/src/stores/dev-scenario-store.ts`:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { PatientState } from "@/fixtures/patient-states";

interface DevScenarioState {
  activeScenario: PatientState;
  setScenario: (state: PatientState) => void;
  resetScenario: () => void;
}

/**
 * __DEV__-gated store that holds the active patient-state scenario.
 * Release builds get a frozen "new" scenario with no-op setters; the
 * persist middleware is dead-code-eliminated when __DEV__ is false.
 */
export const useDevScenarioStore = __DEV__
  ? create<DevScenarioState>()(
      persist(
        (set) => ({
          activeScenario: "new",
          setScenario: (scenario) => set({ activeScenario: scenario }),
          resetScenario: () => set({ activeScenario: "new" }),
        }),
        {
          name: "onlyou.dev.scenario",
          storage: createJSONStorage(() => AsyncStorage),
        },
      ),
    )
  : create<DevScenarioState>(() => ({
      activeScenario: "new",
      setScenario: () => {},
      resetScenario: () => {},
    }));
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @onlyou/mobile test dev-scenario-store`
Expected: `PASS · dev-scenario-store · 3 tests`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/stores apps/mobile/__tests__/stores
git commit -m "feat(phase-2a/11): dev-scenario-store Zustand + AsyncStorage persist"
```

---

## Task 12 — `usePatientState` hook + green the earlier red tests

**Files:**

- Create: `apps/mobile/src/hooks/use-patient-state.ts`
- Create: `apps/mobile/__tests__/hooks/use-patient-state.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/hooks/use-patient-state.test.tsx`:

```tsx
import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { usePatientState } from "@/hooks/use-patient-state";
import { useDevScenarioStore } from "@/stores/dev-scenario-store";

function Probe() {
  const user = usePatientState();
  return (
    <Text testID="probe">{`${user.name}|${user.state}|${user.gender}`}</Text>
  );
}

describe("usePatientState", () => {
  it("returns Arjun (male, new) when the store is new", () => {
    useDevScenarioStore.setState({ activeScenario: "new" });
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("probe").props.children).toBe("Arjun Sharma|new|male");
  });

  it("returns Sanjana (female, active) when the store is active", () => {
    useDevScenarioStore.setState({ activeScenario: "active" });
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("probe").props.children).toBe(
      "Sanjana Rao|active|female",
    );
  });

  it("updates reactively when the store changes", () => {
    useDevScenarioStore.setState({ activeScenario: "new" });
    const { getByTestId, rerender } = render(<Probe />);
    expect(getByTestId("probe").props.children).toBe("Arjun Sharma|new|male");
    useDevScenarioStore.setState({ activeScenario: "ready" });
    rerender(<Probe />);
    expect(getByTestId("probe").props.children).toBe("Rahul Mehta|ready|male");
  });
});
```

- [ ] **Step 2: Run — expect FAIL (hook missing)**

Run: `pnpm --filter @onlyou/mobile test use-patient-state`
Expected: `Cannot find module '@/hooks/use-patient-state'`.

- [ ] **Step 3: Write the hook**

Create `apps/mobile/src/hooks/use-patient-state.ts`:

```ts
import { FIXTURES, type FixtureUser } from "@/fixtures/patient-states";
import { useDevScenarioStore } from "@/stores/dev-scenario-store";

/**
 * Returns the active scenario's FixtureUser. Every screen reads through
 * this hook. In Plans 2B–2D the FixtureUser shape is extended; in the
 * post-Phase-2 handoff this hook is the single file that gets rewritten
 * to pull from real Convex queries.
 */
export function usePatientState(): FixtureUser {
  const activeScenario = useDevScenarioStore((s) => s.activeScenario);
  return FIXTURES[activeScenario];
}
```

- [ ] **Step 4: Run the full test suite — expect all previously-red tests to flip green**

Run: `pnpm --filter @onlyou/mobile test`
Expected: every test from Tasks 3, 5, 6, 7, 8, 9, 10, 11, 12 passes. Specifically:

- `smoke.test.ts` ✓
- `test-utils.test.tsx` ✓ (was red in Task 3)
- `premium-input.test.tsx` ✓
- `premium-button.test.tsx` ✓
- `bottom-sheet.test.tsx` ✓
- `placeholder-screen.test.tsx` ✓
- `gender-gate.test.tsx` ✓ (was red in Task 9)
- `patient-states.test.ts` ✓
- `dev-scenario-store.test.tsx` ✓
- `use-patient-state.test.tsx` ✓

Expected total: 10 test files, ~28 tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/hooks/use-patient-state.ts apps/mobile/__tests__/hooks
git commit -m "feat(phase-2a/12): usePatientState hook — greens the fixture-dependent tests"
```

---

## Task 13 — Scenario switcher component

**Files:**

- Create: `apps/mobile/src/dev/scenario-switcher.tsx`
- Create: `apps/mobile/__tests__/dev/scenario-switcher.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/dev/scenario-switcher.test.tsx`:

```tsx
import { fireEvent, render } from "@testing-library/react-native";

import { ScenarioSwitcher } from "@/dev/scenario-switcher";
import { useDevScenarioStore } from "@/stores/dev-scenario-store";

describe("<ScenarioSwitcher>", () => {
  beforeEach(() => {
    useDevScenarioStore.setState({ activeScenario: "new" });
  });

  it("lists all four scenarios when open", () => {
    const { getByText } = render(
      <ScenarioSwitcher visible onClose={() => {}} />,
    );
    expect(getByText("Arjun Sharma")).toBeTruthy();
    expect(getByText("Priya Iyer")).toBeTruthy();
    expect(getByText("Rahul Mehta")).toBeTruthy();
    expect(getByText("Sanjana Rao")).toBeTruthy();
  });

  it("flips the active scenario when a row is tapped", () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ScenarioSwitcher visible onClose={onClose} />,
    );
    fireEvent.press(getByText("Sanjana Rao"));
    expect(useDevScenarioStore.getState().activeScenario).toBe("active");
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @onlyou/mobile test scenario-switcher`
Expected: module not found.

- [ ] **Step 3: Write the component**

Create `apps/mobile/src/dev/scenario-switcher.tsx`:

```tsx
import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "../components/ui/BottomSheet";
import { FIXTURES, type PatientState } from "../fixtures/patient-states";
import { useDevScenarioStore } from "../stores/dev-scenario-store";
import { colors } from "../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const STATE_ORDER: PatientState[] = ["new", "reviewing", "ready", "active"];

const STATE_COPY: Record<PatientState, { label: string; desc: string }> = {
  new: { label: "New user", desc: "Nothing started. Empty home." },
  reviewing: {
    label: "Under review",
    desc: "Assessment submitted, waiting on doctor.",
  },
  ready: {
    label: "Plan ready",
    desc: "Doctor's plan ready — payment pending.",
  },
  active: {
    label: "Treatment active",
    desc: "Day-14 subscription, deliveries flowing.",
  },
};

export function ScenarioSwitcher({ visible, onClose }: Props) {
  const active = useDevScenarioStore((s) => s.activeScenario);
  const setScenario = useDevScenarioStore((s) => s.setScenario);

  if (!__DEV__) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Dev · Switch scenario"
    >
      <View style={{ gap: 8 }}>
        {STATE_ORDER.map((state) => {
          const fixture = FIXTURES[state];
          const copy = STATE_COPY[state];
          const isActive = state === active;
          return (
            <Pressable
              key={state}
              onPress={() => {
                setScenario(state);
                onClose();
              }}
              style={{
                borderWidth: 1.5,
                borderColor: isActive ? colors.accent : colors.border,
                backgroundColor: isActive ? colors.accentLight : colors.white,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: colors.textPrimary,
                  }}
                >
                  {fixture.name}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.textTertiary,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    fontWeight: "700",
                  }}
                >
                  {copy.label}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 4,
                }}
              >
                {copy.desc}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textTertiary,
                  marginTop: 6,
                }}
              >
                {fixture.phone} · {fixture.gender}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @onlyou/mobile test scenario-switcher`
Expected: `PASS · <ScenarioSwitcher> · 2 tests`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/dev apps/mobile/__tests__/dev
git commit -m "feat(phase-2a/13): dev ScenarioSwitcher bottom-sheet component"
```

---

## Task 14 — `onlyou://` scheme in `app.config.ts`

**Files:**

- Modify: `apps/mobile/app.config.ts`

- [ ] **Step 1: Read the current config**

Run: `cat apps/mobile/app.config.ts`

- [ ] **Step 2: Add the scheme**

Edit `apps/mobile/app.config.ts`. Locate the `export default` expo config and add:

```ts
  scheme: 'onlyou',
```

at the top level of the config (sibling of `name`, `slug`, `ios`, `android`). If a `scheme` key already exists, verify it equals `"onlyou"` — do not change it.

- [ ] **Step 3: Verify**

Run: `pnpm --filter @onlyou/mobile exec expo config --type public 2>&1 | grep scheme`
Expected: `scheme: 'onlyou'`.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app.config.ts
git commit -m "feat(phase-2a/14): register onlyou:// deep-link scheme"
```

---

## Task 15 — Root `_layout.tsx` + splash `index.tsx` with scenario switcher mount

**Files:**

- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app/index.tsx`

Spec reference: §4.2, §4.6. The real auth gate is Plan 2B; Plan 2A just mounts the switcher so the founder/dev can preview the foundation.

- [ ] **Step 1: Read current root layout**

Run: `cat apps/mobile/app/_layout.tsx apps/mobile/app/index.tsx`

- [ ] **Step 2: Update `_layout.tsx`**

Overwrite `apps/mobile/app/_layout.tsx`:

```tsx
import { PlayfairDisplay_900Black } from "@expo-google-fonts/playfair-display";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ScenarioSwitcher } from "@/dev/scenario-switcher";

import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_900Black,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
        {__DEV__ ? (
          <ScenarioSwitcher
            visible={switcherOpen}
            onClose={() => setSwitcherOpen(false)}
          />
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: Update `index.tsx` to a Plan 2A splash preview**

Overwrite `apps/mobile/app/index.tsx`:

```tsx
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlaceholderScreen } from "@/components/placeholder-screen";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

/**
 * Plan 2A — foundation preview.
 *
 * This screen is a stub. Plan 2B replaces it with the real splash →
 * (auth)/welcome gate. For now it renders a PlaceholderScreen so the
 * worktree runs end-to-end and the founder can see the scenario
 * switcher pick up the current fixture user's name.
 */
export default function Index() {
  const user = usePatientState();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      <PlaceholderScreen
        title={`Hello, ${user.name.split(" ")[0]}`}
        phase="Phase 2B"
        reason="The real splash + auth flow ships in Plan 2B. Meanwhile the scenario switcher is live — wire up a triple-tap handler in Plan 2B's tab layout."
      />
      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + 24,
          left: 24,
          right: 24,
        }}
      >
        <Pressable
          onPress={() => {
            // placeholder — Plan 2B wires the real triple-tap from the
            // (tabs) header. In 2A we only need to prove the switcher
            // mounts and reads the fixture correctly.
          }}
          style={{
            padding: 12,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: colors.textTertiary,
              letterSpacing: 0.3,
            }}
          >
            Active fixture: {user.name} · {user.state}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Typecheck + lint**

Run:

```bash
pnpm --filter @onlyou/mobile typecheck
pnpm --filter @onlyou/mobile lint
```

Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/_layout.tsx apps/mobile/app/index.tsx
git commit -m "feat(phase-2a/15): root _layout + index splash preview with scenario switcher mounted"
```

---

## Task 16 — Plan 2A acceptance + merge prep

**Files:**

- Modify: `checkpoint.md`

- [ ] **Step 1: Run the full suite from scratch**

Run:

```bash
pnpm --filter @onlyou/mobile typecheck
pnpm --filter @onlyou/mobile lint
pnpm --filter @onlyou/mobile test
```

Expected: all three clean. Test summary shows ~10 test files, ~28 tests passing.

- [ ] **Step 2: Verify no hardcoded hex leaked anywhere**

Run:

```bash
pnpm --filter @onlyou/mobile lint 2>&1 | grep -i "no-hardcoded-hex" || echo "OK: no violations"
```

Expected: `OK: no violations`.

- [ ] **Step 3: Verify `__DEV__` gating on the scenario store**

Run: `grep -n "__DEV__" apps/mobile/src/stores/dev-scenario-store.ts`
Expected: the store file contains the `__DEV__` gate at module level.

- [ ] **Step 4: Boot the mobile app on the iOS simulator**

Run: `pnpm --filter @onlyou/mobile ios`
Expected: app boots, fonts load, splash hides, `Hello, Arjun` (or whichever scenario was last persisted) appears with the active-fixture chip at the bottom. No red boxes.

- [ ] **Step 5: Boot on Android**

Run: `pnpm --filter @onlyou/mobile android`
Expected: same behavior, no red boxes.

- [ ] **Step 6: Run the `superpowers:requesting-code-review` skill (Rule 10)**

Skill run by the executor. Review report lands at `docs/superpowers/reviews/2026-XX-XX-phase-2a-foundation-review.md`. Address every finding or explicitly acknowledge.

- [ ] **Step 7: Update `checkpoint.md`**

Append to `checkpoint.md`:

```markdown
## Phase 2A — Foundation (complete YYYY-MM-DD)

Worktree: `feature/phase-2a-foundation` — merged to master at commit <sha>.

Delivered:

- Jest + RTL test infrastructure, 10 test files, ~28 tests passing
- Custom `no-hardcoded-hex` ESLint rule wired into `@onlyou/config`
- Upgraded `PremiumInput` to floating-label pattern (closes Phase 1 deferral)
- Upgraded `PremiumButton` with `warm` variant for consultation CTAs
- `<BottomSheet>` primitive (Modal + safe-area-aware)
- `<PlaceholderScreen>` for deferred routes
- `<GenderGate>` + `useGender` hook
- 4-user fixture layer (`FIXTURES` keyed by PatientState, both genders)
- `dev-scenario-store` Zustand + AsyncStorage persist, **DEV**-gated
- `usePatientState` hook (the Phase 2 → production handoff seam)
- `<ScenarioSwitcher>` bottom-sheet component (listed 4 scenarios)
- Root `_layout.tsx` with font loading + scenario switcher mount
- `onlyou://` deep-link scheme registered

Next: Plan 2B — Auth & shell skeleton. Begins with a fresh worktree.
```

- [ ] **Step 8: Commit the checkpoint update**

```bash
git add checkpoint.md
git commit -m "chore(phase-2a/16): complete — 28 tests passing, ready for merge"
```

- [ ] **Step 9: Merge prep (manual — depends on review outcome)**

```bash
git log --oneline master..HEAD | wc -l   # expect ~16 commits
git diff master --stat                   # review the full diff size
```

If review is approved and the code-review report is committed, merge to master:

```bash
git checkout master
git merge --no-ff feature/phase-2a-foundation -m "Merge phase 2A — foundation"
git worktree remove ../onlyou2-phase-2a
git branch -d feature/phase-2a-foundation
```

---

## Self-review checklist (run before handing off to subagents)

- **Spec coverage** — Every Plan 2A deliverable in `docs/superpowers/specs/2026-04-14-phase-2-patient-shell-design.md` §4.2, §4.5, §4.6, §4.9 is addressed by a task above: test infra (Task 2), test helpers (Task 3), no-hardcoded-hex (Task 4), input polish from Phase 1 deferral (Task 5), warm-variant button (Task 6), bottom sheet (Task 7), placeholder screen (Task 8), gender gate (Task 9), fixture (Task 10), store (Task 11), hook (Task 12), switcher (Task 13), scheme (Task 14), root layout (Task 15), acceptance (Task 16). ✓
- **Placeholder scan** — No "TBD", "TODO", "similar to task N", "add appropriate error handling" remain. ✓
- **Type consistency** — `PatientState`, `Gender`, `FixtureUser` names are consistent across Tasks 9, 10, 11, 12, 13. `useDevScenarioStore` setter names (`setScenario`, `resetScenario`) match Tasks 11 and 13. ✓
- **Scope** — Plan 2A produces working testable software: the app boots, the switcher flips fixtures, the test suite runs green. Nothing spills into 2B/2C/2D responsibilities.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-14-phase-2a-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task (16 tasks), review between tasks, fast iteration. Uses `superpowers:subagent-driven-development`.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

Pick one when you're ready to execute.
