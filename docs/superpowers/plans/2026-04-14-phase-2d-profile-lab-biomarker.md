# Phase 2D — Profile Stack + Lab Booking + Visual Biomarker Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`. Depends on Plans 2A, 2B, 2C merged to master. Create a fresh worktree (Task 0). **This is the final plan that closes Phase 2 — Task 21 is the Phase 2 approval-gate acceptance run, not just a Plan 2D acceptance.**

**Goal:** Build the profile stack out with real sub-screens (replacing the 2B placeholder), the lab booking flow end-to-end, the full Visual Biomarker Report component tree + fixture, and the four deferred-route placeholders (wallet, period-tracker, legal, help). When 2D merges, Phase 2 is complete and ready for founder approval.

**Architecture:** Biomarker components live in `apps/mobile/src/components/biomarker/` and are self-contained — they compose the Hims-style editorial layout (hero narrative + per-marker card + range bar + sparkline + trend + status badge) against fixture data. `apps/mobile/src/fixtures/biomarker-fixture.ts` ships one reference lab report with 8 markers spanning all three states (optimal, sub-optimal, action). Every profile sub-screen reads from `usePatientState()` so flipping the scenario switcher updates them all at once. Lab booking reuses `<PremiumButton>`, `<PremiumInput>`, `<BottomSheet>` from 2A. Upload-results triggers a 3-second simulated "analyzing" state then transitions to the fixture biomarker report.

**Tech Stack:** Plan 2A foundation + Plan 2B auth + Plan 2C tab content. No new runtime deps. Biomarker rendering uses plain React Native `<View>` + `<Text>` + `<Svg>` from `react-native-svg` for the sparkline + gradient range bar. (`react-native-svg` ships with Expo SDK 55 — already transitively installed.)

**Authoritative sources:**

- `docs/superpowers/specs/2026-04-14-phase-2-patient-shell-design.md` §3 (scope), §4.8 (biomarker), §6 (acceptance criteria)
- `docs/FEATURE-BIOMARKER-TRACKING.md`
- `docs/VISUAL_DIRECTION.md` §2.11 (subscription management), §2.12 (order history), §2.13 (profile account)
- `docs/biomarker-reference.png` — the editorial direction
- `.superpowers/brainstorm/2538-*/content/06-biomarker-report-v2.html` — the v2 mockup reviewed with founder
- `docs/APP-PATIENT-ADDITIONS.md` §1 (gender-aware period-tracker)
- `docs/DEFERRED.md` (reviewed at Task 0)

**Out of scope for 2D:** Real OCR/parsing (Phase 2.5), real lab API integrations (Phase 8+), doctor-ordered lab auto-population (Phase 2.5), multi-report trend chart (post Phase 2.5), subscription pause/cancel/change-plan flows (Phase 3 tail), real Razorpay payment method management (Phase 3).

---

## File Structure

```
apps/mobile/
├── app/
│   ├── profile/
│   │   ├── index.tsx                    [MODIFY]  real list (replaces 2B placeholder) — 12 rows, 8 real + 4 placeholders
│   │   ├── personal-info.tsx            [NEW]
│   │   ├── subscriptions.tsx            [NEW]     list only
│   │   ├── prescriptions.tsx            [NEW]
│   │   ├── orders.tsx                   [NEW]
│   │   ├── lab-results/
│   │   │   ├── index.tsx                [NEW]     list of reports
│   │   │   └── [id].tsx                 [NEW]     Visual Biomarker Report
│   │   ├── addresses.tsx                [NEW]
│   │   ├── payment-methods.tsx          [NEW]     list only
│   │   ├── notifications.tsx            [NEW]     settings only (not inbox)
│   │   ├── wallet.tsx                   [NEW]     <PlaceholderScreen> → Phase 3
│   │   ├── period-tracker.tsx           [NEW]     <PlaceholderScreen> → PCOS phase
│   │   ├── legal.tsx                    [NEW]     <PlaceholderScreen> → Phase 8
│   │   └── help.tsx                     [NEW]     <PlaceholderScreen> → Phase 8+
│   └── lab-booking/
│       ├── _layout.tsx                  [NEW]     modal stack, warm CTA
│       ├── index.tsx                    [NEW]     book collection OR upload own
│       ├── slot-selection.tsx           [NEW]     date/time picker
│       ├── address-confirm.tsx          [NEW]
│       └── upload-results.tsx           [NEW]     3-sec simulated analyzing → fixture report
└── src/
    ├── fixtures/
    │   └── biomarker-fixture.ts         [NEW]     8 markers across all 3 states
    └── components/
        └── biomarker/
            ├── StatusBadge.tsx          [NEW]
            ├── RangeBar.tsx             [NEW]
            ├── Sparkline.tsx            [NEW]
            ├── MarkerCard.tsx           [NEW]
            ├── NarrativeHero.tsx        [NEW]
            ├── VisualBiomarkerReport.tsx [NEW]
            └── index.ts                 [NEW]     barrel

__tests__/ (new test files per task)
```

---

## Task 0 — Worktree + prerequisite checks + DEFERRED review

- [ ] **Step 1: Verify Plans 2A, 2B, 2C shipped**

```bash
git log master --oneline | grep -iE "phase-2a|phase-2b|phase-2c" | head -50
```

Expected: all three plans' commits present.

- [ ] **Step 2: Read `docs/DEFERRED.md` Phase 2 section + the biomarker deferrals table**

Run: `cat docs/DEFERRED.md`
Expected: confirm OCR/parsing/reference-range seeding/real-upload-wiring all point to **Phase 2.5 (Biomarker foundation)**, not Plan 2D. 2D ships the UI only.

- [ ] **Step 3: Verify `react-native-svg` is installed**

Run: `pnpm --filter @onlyou/mobile list react-native-svg`
Expected: a version (transitively via Expo). If missing:

```bash
pnpm --filter @onlyou/mobile add react-native-svg@15
```

- [ ] **Step 4: Create worktree**

```bash
git worktree add -b feature/phase-2d-profile-lab-biomarker ../onlyou2-phase-2d master
cd ../onlyou2-phase-2d
git commit --allow-empty -m "chore(phase-2d): begin profile + lab + biomarker plan"
```

---

## Task 1 — Biomarker fixture data

**Files:**

- Create: `apps/mobile/src/fixtures/biomarker-fixture.ts`
- Create: `apps/mobile/__tests__/fixtures/biomarker-fixture.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/fixtures/biomarker-fixture.test.ts`:

```ts
import { BIOMARKER_FIXTURE } from "@/fixtures/biomarker-fixture";

describe("biomarker fixture", () => {
  it("has exactly 8 markers", () => {
    expect(BIOMARKER_FIXTURE.markers).toHaveLength(8);
  });

  it("covers all 3 status states", () => {
    const statuses = new Set(BIOMARKER_FIXTURE.markers.map((m) => m.status));
    expect(statuses.has("optimal")).toBe(true);
    expect(statuses.has("sub-optimal")).toBe(true);
    expect(statuses.has("action-required")).toBe(true);
  });

  it("every marker has a reference range + value + trend", () => {
    for (const m of BIOMARKER_FIXTURE.markers) {
      expect(m.value).toBeGreaterThan(0);
      expect(m.unit).toBeTruthy();
      expect(m.referenceRange.optimalMin).toBeGreaterThan(0);
      expect(m.referenceRange.optimalMax).toBeGreaterThan(
        m.referenceRange.optimalMin,
      );
      expect(typeof m.trendPercent).toBe("number");
    }
  });

  it("has a narrative paragraph and a curator byline", () => {
    expect(BIOMARKER_FIXTURE.narrative.length).toBeGreaterThan(20);
    expect(BIOMARKER_FIXTURE.curatorName).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @onlyou/mobile test biomarker-fixture`
Expected: module not found.

- [ ] **Step 3: Write the fixture**

Create `apps/mobile/src/fixtures/biomarker-fixture.ts`:

```ts
export type MarkerStatus = "optimal" | "sub-optimal" | "action-required";

export interface BiomarkerMarker {
  id: string;
  name: string;
  category: string;
  value: number;
  unit: string;
  status: MarkerStatus;
  trendPercent: number; // +/- % vs previous report
  sparklineSeries: number[]; // last 6 readings (most recent last), normalized 0-100
  previousValue: number;
  referenceRange: {
    min: number;
    max: number;
    optimalMin: number;
    optimalMax: number;
  };
  explainer: string;
}

export interface BiomarkerReport {
  id: string;
  reportTitle: string;
  collectedAt: number;
  reviewedAt: number;
  curatorName: string;
  curatorSpecialty: string;
  narrative: string;
  markers: BiomarkerMarker[];
}

const DAY = 24 * 60 * 60 * 1000;

export const BIOMARKER_FIXTURE: BiomarkerReport = {
  id: "bm-report-1",
  reportTitle: "Comprehensive Metabolic Panel",
  collectedAt: Date.now() - 6 * DAY,
  reviewedAt: Date.now() - 4 * DAY,
  curatorName: "Dr. Priya Sharma",
  curatorSpecialty: "Endocrinologist",
  narrative:
    "Your metabolic health is trending in the right direction. Hormonal balance has improved since January, though cortisol and testosterone still need attention.",
  markers: [
    {
      id: "vitamin-d",
      name: "Vitamin D",
      category: "Nutrient · Metabolism",
      value: 42,
      unit: "ng/mL",
      status: "optimal",
      trendPercent: 18,
      sparklineSeries: [30, 32, 34, 36, 38, 42],
      previousValue: 35.6,
      referenceRange: { min: 20, max: 80, optimalMin: 30, optimalMax: 60 },
      explainer:
        "Vitamin D is essential for bone health, immune function, and hormone regulation. Optimal levels support mood, energy, and muscle recovery.",
    },
    {
      id: "total-testosterone",
      name: "Total Testosterone",
      category: "Hormonal · Balance",
      value: 340,
      unit: "ng/dL",
      status: "sub-optimal",
      trendPercent: 6,
      sparklineSeries: [320, 322, 328, 330, 335, 340],
      previousValue: 320,
      referenceRange: { min: 200, max: 1100, optimalMin: 400, optimalMax: 900 },
      explainer:
        "Testosterone affects muscle mass, energy, libido, and mood. Sub-optimal ranges respond well to sleep, strength training, and stress reduction.",
    },
    {
      id: "cortisol-am",
      name: "Cortisol (AM)",
      category: "Stress · Recuperation",
      value: 24.8,
      unit: "μg/dL",
      status: "action-required",
      trendPercent: -12,
      sparklineSeries: [28, 27, 26, 25, 24, 24.8],
      previousValue: 28.2,
      referenceRange: { min: 5, max: 28, optimalMin: 10, optimalMax: 18 },
      explainer:
        "Morning cortisol above the optimal range indicates elevated stress. Sustained high cortisol can disrupt sleep, metabolism, and hormone balance.",
    },
    {
      id: "tsh",
      name: "TSH",
      category: "Thyroid",
      value: 2.1,
      unit: "mIU/L",
      status: "optimal",
      trendPercent: 0,
      sparklineSeries: [2.1, 2.1, 2.0, 2.1, 2.2, 2.1],
      previousValue: 2.1,
      referenceRange: { min: 0.4, max: 4.0, optimalMin: 1.0, optimalMax: 2.5 },
      explainer:
        "Thyroid-stimulating hormone regulates metabolism. Optimal levels support stable energy and weight.",
    },
    {
      id: "hba1c",
      name: "HbA1c",
      category: "Glucose · Metabolism",
      value: 5.2,
      unit: "%",
      status: "optimal",
      trendPercent: -4,
      sparklineSeries: [5.4, 5.4, 5.3, 5.3, 5.2, 5.2],
      previousValue: 5.4,
      referenceRange: { min: 4.0, max: 6.5, optimalMin: 4.5, optimalMax: 5.6 },
      explainer:
        "HbA1c reflects average blood sugar over 3 months. Staying in the optimal range lowers long-term metabolic risk.",
    },
    {
      id: "ldl",
      name: "LDL Cholesterol",
      category: "Lipids · Cardiovascular",
      value: 118,
      unit: "mg/dL",
      status: "sub-optimal",
      trendPercent: -6,
      sparklineSeries: [128, 126, 124, 122, 120, 118],
      previousValue: 125,
      referenceRange: { min: 50, max: 190, optimalMin: 50, optimalMax: 100 },
      explainer:
        'LDL is the "bad" cholesterol. Trending down is good — continue with diet and exercise adjustments.',
    },
    {
      id: "ferritin",
      name: "Ferritin",
      category: "Iron · Energy",
      value: 80,
      unit: "ng/mL",
      status: "optimal",
      trendPercent: 14,
      sparklineSeries: [65, 68, 70, 72, 76, 80],
      previousValue: 70,
      referenceRange: { min: 12, max: 300, optimalMin: 50, optimalMax: 150 },
      explainer:
        "Ferritin reflects iron storage. Optimal levels support energy, focus, and endurance.",
    },
    {
      id: "b12",
      name: "Vitamin B12",
      category: "Nutrient · Neurological",
      value: 520,
      unit: "pg/mL",
      status: "optimal",
      trendPercent: 3,
      sparklineSeries: [500, 505, 510, 515, 518, 520],
      previousValue: 505,
      referenceRange: { min: 200, max: 900, optimalMin: 400, optimalMax: 700 },
      explainer:
        "B12 supports nerve function, cognition, and red blood cell production.",
    },
  ],
};
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @onlyou/mobile test biomarker-fixture`
Expected: `PASS · 4 tests`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/fixtures/biomarker-fixture.ts apps/mobile/__tests__/fixtures/biomarker-fixture.test.ts
git commit -m "feat(phase-2d/1): biomarker fixture with 8 markers across 3 states"
```

---

## Task 2 — `<StatusBadge>` component

**Files:**

- Create: `apps/mobile/src/components/biomarker/StatusBadge.tsx`
- Create: `apps/mobile/__tests__/components/status-badge.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/components/status-badge.test.tsx`:

```tsx
import { render } from "@testing-library/react-native";

import { StatusBadge } from "@/components/biomarker/StatusBadge";

describe("<StatusBadge>", () => {
  it('renders "Optimal"', () => {
    const { getByText } = render(<StatusBadge status="optimal" />);
    expect(getByText(/Optimal/i)).toBeTruthy();
  });

  it('renders "Sub-optimal"', () => {
    const { getByText } = render(<StatusBadge status="sub-optimal" />);
    expect(getByText(/Sub-optimal/i)).toBeTruthy();
  });

  it('renders "Action"', () => {
    const { getByText } = render(<StatusBadge status="action-required" />);
    expect(getByText(/Action/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @onlyou/mobile test status-badge`
Expected: module not found.

- [ ] **Step 3: Write the component**

Create `apps/mobile/src/components/biomarker/StatusBadge.tsx`:

```tsx
import { Text, View } from "react-native";

import type { MarkerStatus } from "../../fixtures/biomarker-fixture";
import { colors } from "../../theme/colors";

interface Props {
  status: MarkerStatus;
}

const STYLES: Record<
  MarkerStatus,
  { bg: string; border: string; fg: string; label: string }
> = {
  optimal: {
    bg: colors.successBg ?? "#ECF3EE",
    border: colors.success ?? "#5A8266",
    fg: colors.successDeep ?? "#2F5D3A",
    label: "Optimal",
  },
  "sub-optimal": {
    bg: colors.accentLight,
    border: colors.accent,
    fg: colors.accentDeep ?? "#5F4F8B",
    label: "Sub-optimal",
  },
  "action-required": {
    bg: colors.errorBg ?? "#FBEEE8",
    border: colors.error ?? "#B8543E",
    fg: colors.errorDeep ?? "#6E2C1C",
    label: "Action",
  },
};

export function StatusBadge({ status }: Props) {
  const s = STYLES[status];
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: s.border,
        backgroundColor: s.bg,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
      }}
    >
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: 999,
          backgroundColor: s.border,
        }}
      />
      <Text
        style={{
          fontSize: 9,
          fontWeight: "800",
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: s.fg,
        }}
      >
        {s.label}
      </Text>
    </View>
  );
}
```

Note on tokens: if `colors.successBg`, `colors.successDeep`, `colors.errorBg`, `colors.errorDeep`, `colors.accentDeep` are missing, add them to `packages/core/src/tokens/colors.ts` as explicit tokens. The ESLint rule permits hex values inside that file only.

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @onlyou/mobile test status-badge`
Expected: `PASS · 3 tests`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/biomarker/StatusBadge.tsx apps/mobile/__tests__/components/status-badge.test.tsx packages/core/src/tokens/colors.ts
git commit -m "feat(phase-2d/2): StatusBadge component + success/error token extensions"
```

---

## Task 3 — `<RangeBar>` component

**Files:**

- Create: `apps/mobile/src/components/biomarker/RangeBar.tsx`
- Create: `apps/mobile/__tests__/components/range-bar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from "@testing-library/react-native";

import { RangeBar } from "@/components/biomarker/RangeBar";

describe("<RangeBar>", () => {
  it("renders without crashing", () => {
    const { toJSON } = render(
      <RangeBar min={0} max={100} optimalMin={30} optimalMax={60} value={45} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it("renders the value and range labels", () => {
    const { getByText } = render(
      <RangeBar
        min={20}
        max={80}
        optimalMin={30}
        optimalMax={60}
        value={42}
        labelUnit="ng/mL"
      />,
    );
    expect(getByText(/30.*60/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @onlyou/mobile test range-bar`
Expected: module not found.

- [ ] **Step 3: Write the component**

Create `apps/mobile/src/components/biomarker/RangeBar.tsx`:

```tsx
import { Text, View } from "react-native";

import { colors } from "../../theme/colors";

interface Props {
  min: number;
  max: number;
  optimalMin: number;
  optimalMax: number;
  value: number;
  labelUnit?: string;
}

export function RangeBar({ min, max, optimalMin, optimalMax, value }: Props) {
  const clamp = (v: number) =>
    Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  const optLeft = clamp(optimalMin);
  const optRight = clamp(optimalMax);
  const dot = clamp(value);

  return (
    <View>
      <View
        style={{
          height: 8,
          borderRadius: 999,
          backgroundColor: colors.offWhite,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${optLeft}%`,
            width: `${optRight - optLeft}%`,
            backgroundColor: colors.successBg ?? "#ECF3EE",
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderLeftColor: colors.success ?? "#5A8266",
            borderRightColor: colors.success ?? "#5A8266",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: "50%",
            left: `${dot}%`,
            width: 14,
            height: 14,
            borderRadius: 999,
            backgroundColor: colors.textPrimary,
            borderWidth: 2,
            borderColor: colors.white,
            marginTop: -7,
            marginLeft: -7,
          }}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        <Text
          style={{ fontSize: 9, color: colors.textTertiary, fontWeight: "600" }}
        >
          {min}
        </Text>
        <Text
          style={{
            fontSize: 9,
            color: colors.successDeep ?? "#2F5D3A",
            fontWeight: "700",
          }}
        >
          {optimalMin} – {optimalMax} optimal
        </Text>
        <Text
          style={{ fontSize: 9, color: colors.textTertiary, fontWeight: "600" }}
        >
          {max}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @onlyou/mobile test range-bar`
Expected: `PASS · 2 tests`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/biomarker/RangeBar.tsx apps/mobile/__tests__/components/range-bar.test.tsx
git commit -m "feat(phase-2d/3): RangeBar component with optimal-zone fill + value dot"
```

---

## Task 4 — `<Sparkline>` component

**Files:**

- Create: `apps/mobile/src/components/biomarker/Sparkline.tsx`

- [ ] **Step 1: Write the component (no test — visual only, covered by MarkerCard snapshot test in Task 5)**

Create `apps/mobile/src/components/biomarker/Sparkline.tsx`:

```tsx
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { colors } from "../../theme/colors";
import type { MarkerStatus } from "../../fixtures/biomarker-fixture";

interface Props {
  series: number[];
  status: MarkerStatus;
  width?: number;
  height?: number;
}

const STROKE_BY_STATUS: Record<MarkerStatus, string> = {
  optimal: colors.success ?? "#5A8266",
  "sub-optimal": colors.accent,
  "action-required": colors.error ?? "#B8543E",
};

export function Sparkline({ series, status, width = 200, height = 30 }: Props) {
  if (series.length < 2) return <View style={{ height }} />;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const stepX = width / (series.length - 1);

  const points = series.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const d = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  const stroke = STROKE_BY_STATUS[status];
  const last = points[points.length - 1];

  return (
    <View style={{ width: "100%" }}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <Path
          d={d}
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx={last.x} cy={last.y} r={3} fill={stroke} />
      </Svg>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/biomarker/Sparkline.tsx
git commit -m "feat(phase-2d/4): Sparkline SVG component coloured by marker status"
```

---

## Task 5 — `<MarkerCard>` composition

**Files:**

- Create: `apps/mobile/src/components/biomarker/MarkerCard.tsx`
- Create: `apps/mobile/__tests__/components/marker-card.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from "@testing-library/react-native";

import { MarkerCard } from "@/components/biomarker/MarkerCard";
import { BIOMARKER_FIXTURE } from "@/fixtures/biomarker-fixture";

describe("<MarkerCard>", () => {
  const vitD = BIOMARKER_FIXTURE.markers.find((m) => m.id === "vitamin-d")!;
  const cortisol = BIOMARKER_FIXTURE.markers.find(
    (m) => m.id === "cortisol-am",
  )!;

  it("renders name, category, value, unit", () => {
    const { getByText } = render(<MarkerCard marker={vitD} />);
    expect(getByText("Vitamin D")).toBeTruthy();
    expect(getByText(/Nutrient/)).toBeTruthy();
    expect(getByText("42")).toBeTruthy();
    expect(getByText(/ng\/mL/)).toBeTruthy();
  });

  it("shows the status badge for action-required markers", () => {
    const { getByText } = render(<MarkerCard marker={cortisol} />);
    expect(getByText(/Action/i)).toBeTruthy();
  });

  it("renders the vs-previous baseline label", () => {
    const { getByText } = render(<MarkerCard marker={vitD} />);
    expect(getByText(/vs Jan|35\.6/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @onlyou/mobile test marker-card`
Expected: module not found.

- [ ] **Step 3: Write the component**

Create `apps/mobile/src/components/biomarker/MarkerCard.tsx`:

```tsx
import { Pressable, Text, View } from "react-native";

import type {
  BiomarkerMarker,
  MarkerStatus,
} from "../../fixtures/biomarker-fixture";
import { colors } from "../../theme/colors";

import { RangeBar } from "./RangeBar";
import { Sparkline } from "./Sparkline";
import { StatusBadge } from "./StatusBadge";

interface Props {
  marker: BiomarkerMarker;
  onLearnMore?: () => void;
}

const RAIL_COLOR: Record<MarkerStatus, string> = {
  optimal: colors.success ?? "#5A8266",
  "sub-optimal": colors.accent,
  "action-required": colors.error ?? "#B8543E",
};

const TREND_BG: Record<"up-good" | "down-bad" | "flat", string> = {
  "up-good": colors.successBg ?? "#ECF3EE",
  "down-bad": colors.errorBg ?? "#FBEEE8",
  flat: colors.offWhite,
};

export function MarkerCard({ marker, onLearnMore }: Props) {
  const trendKey =
    Math.abs(marker.trendPercent) < 3
      ? "flat"
      : marker.trendPercent > 0
        ? "up-good"
        : "down-bad";

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 16,
          bottom: 16,
          width: 3,
          borderTopRightRadius: 3,
          borderBottomRightRadius: 3,
          backgroundColor: RAIL_COLOR[marker.status],
        }}
      />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginLeft: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "PlayfairDisplay_900Black",
              fontSize: 19,
              color: colors.textPrimary,
              letterSpacing: -0.4,
            }}
          >
            {marker.name}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: colors.textTertiary,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              fontWeight: "700",
              marginTop: 2,
            }}
          >
            {marker.category}
          </Text>
        </View>
        <StatusBadge status={marker.status} />
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: 16,
          marginBottom: 10,
          marginLeft: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
          <Text
            style={{
              fontFamily: "PlayfairDisplay_900Black",
              fontSize: 36,
              color: colors.textPrimary,
              lineHeight: 36,
              letterSpacing: -1.5,
            }}
          >
            {marker.value}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: colors.textTertiary,
              fontWeight: "600",
            }}
          >
            {marker.unit}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: TREND_BG[trendKey],
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "800",
              color:
                trendKey === "up-good"
                  ? (colors.successDeep ?? "#2F5D3A")
                  : trendKey === "down-bad"
                    ? (colors.errorDeep ?? "#6E2C1C")
                    : colors.textTertiary,
            }}
          >
            {marker.trendPercent > 0
              ? "↑"
              : marker.trendPercent < 0
                ? "↓"
                : "→"}{" "}
            {Math.abs(marker.trendPercent)}%
          </Text>
        </View>
      </View>

      <View style={{ marginLeft: 12, marginBottom: 12 }}>
        <Sparkline series={marker.sparklineSeries} status={marker.status} />
      </View>

      <View style={{ marginLeft: 12 }}>
        <RangeBar
          min={marker.referenceRange.min}
          max={marker.referenceRange.max}
          optimalMin={marker.referenceRange.optimalMin}
          optimalMax={marker.referenceRange.optimalMax}
          value={marker.value}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 14,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          marginLeft: 12,
        }}
      >
        <Text
          style={{ fontSize: 9, color: colors.textTertiary, fontWeight: "600" }}
        >
          vs last report: {marker.previousValue} {marker.unit}
        </Text>
        <Pressable onPress={onLearnMore}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "800",
              color: colors.accent,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            Learn more →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @onlyou/mobile test marker-card`
Expected: `PASS · 3 tests`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/biomarker/MarkerCard.tsx apps/mobile/__tests__/components/marker-card.test.tsx
git commit -m "feat(phase-2d/5): MarkerCard composition — status rail + Playfair value + sparkline + range"
```

---

## Task 6 — `<NarrativeHero>` component

**Files:**

- Create: `apps/mobile/src/components/biomarker/NarrativeHero.tsx`

- [ ] **Step 1: Write**

```tsx
import { Text, View } from "react-native";

import { colors } from "../../theme/colors";

interface Props {
  narrative: string;
  curatorName: string;
  reviewedAt: number;
}

export function NarrativeHero({ narrative, curatorName, reviewedAt }: Props) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 18,
        marginBottom: 22,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: colors.accent,
        }}
      />
      <Text
        style={{
          fontSize: 9,
          letterSpacing: 1.8,
          textTransform: "uppercase",
          color: colors.textTertiary,
          fontWeight: "700",
          marginBottom: 8,
        }}
      >
        In summary
      </Text>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontStyle: "italic",
          fontSize: 16,
          lineHeight: 24,
          fontWeight: "500",
          color: colors.textPrimary,
          marginBottom: 14,
        }}
      >
        {narrative}
      </Text>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: colors.accent,
            }}
          />
          <Text
            style={{
              fontSize: 11,
              color: colors.textSecondary,
              fontWeight: "600",
            }}
          >
            Curated by {curatorName}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 10,
            color: colors.textTertiary,
            fontWeight: "500",
          }}
        >
          {new Date(reviewedAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/biomarker/NarrativeHero.tsx
git commit -m "feat(phase-2d/6): NarrativeHero — editorial pull-quote + curator byline"
```

---

## Task 7 — `<VisualBiomarkerReport>` composition + barrel

**Files:**

- Create: `apps/mobile/src/components/biomarker/VisualBiomarkerReport.tsx`
- Create: `apps/mobile/src/components/biomarker/index.ts`
- Create: `apps/mobile/__tests__/components/visual-biomarker-report.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from "@testing-library/react-native";

import { VisualBiomarkerReport } from "@/components/biomarker/VisualBiomarkerReport";
import { BIOMARKER_FIXTURE } from "@/fixtures/biomarker-fixture";

describe("<VisualBiomarkerReport>", () => {
  it("renders the title, narrative, and all 8 markers", () => {
    const { getByText, getAllByText } = render(
      <VisualBiomarkerReport report={BIOMARKER_FIXTURE} />,
    );
    expect(getByText(/Biomarker/)).toBeTruthy();
    expect(getByText(BIOMARKER_FIXTURE.curatorName)).toBeTruthy();
    for (const marker of BIOMARKER_FIXTURE.markers) {
      expect(getByText(marker.name)).toBeTruthy();
    }
  });

  it("renders a Download PDF CTA", () => {
    const { getByText } = render(
      <VisualBiomarkerReport report={BIOMARKER_FIXTURE} />,
    );
    expect(getByText(/Download/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Write the composition**

Create `apps/mobile/src/components/biomarker/VisualBiomarkerReport.tsx`:

```tsx
import { ScrollView, Text, View } from "react-native";

import type { BiomarkerReport } from "../../fixtures/biomarker-fixture";
import { colors } from "../../theme/colors";
import { PremiumButton } from "../ui/PremiumButton";

import { MarkerCard } from "./MarkerCard";
import { NarrativeHero } from "./NarrativeHero";

interface Props {
  report: BiomarkerReport;
  onDownloadPdf?: () => void;
  onMessageDoctor?: () => void;
}

export function VisualBiomarkerReport({
  report,
  onDownloadPdf,
  onMessageDoctor,
}: Props) {
  const dateLabel = `Collected ${new Date(
    report.collectedAt,
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })} · reviewed ${new Date(report.reviewedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
    >
      <Text
        style={{
          fontSize: 9,
          letterSpacing: 2.6,
          textTransform: "uppercase",
          color: colors.accent,
          fontWeight: "800",
          marginTop: 6,
          marginBottom: 10,
        }}
      >
        The Clinical Curator
      </Text>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 44,
          lineHeight: 42,
          color: colors.textPrimary,
          letterSpacing: -1.5,
          marginBottom: 4,
        }}
      >
        Biomarker{"\n"}Report
      </Text>
      <Text
        style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 20 }}
      >
        Panel of {report.markers.length} markers · {dateLabel}
      </Text>

      <NarrativeHero
        narrative={report.narrative}
        curatorName={report.curatorName}
        reviewedAt={report.reviewedAt}
      />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginTop: 8,
          marginBottom: 14,
        }}
      >
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 20,
            color: colors.textPrimary,
          }}
        >
          Key Markers
        </Text>
        <Text
          style={{
            fontSize: 9,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: colors.textTertiary,
            fontWeight: "700",
          }}
        >
          {report.markers.length} tracked
        </Text>
      </View>

      {report.markers.map((m) => (
        <MarkerCard key={m.id} marker={m} />
      ))}

      <View style={{ gap: 10, marginTop: 20 }}>
        <PremiumButton
          label="⬇ Download full report (PDF)"
          onPress={onDownloadPdf ?? (() => {})}
        />
        <PremiumButton
          label="Message your doctor"
          variant="secondary"
          onPress={onMessageDoctor ?? (() => {})}
        />
      </View>
    </ScrollView>
  );
}
```

Create `apps/mobile/src/components/biomarker/index.ts`:

```ts
export { StatusBadge } from "./StatusBadge";
export { RangeBar } from "./RangeBar";
export { Sparkline } from "./Sparkline";
export { MarkerCard } from "./MarkerCard";
export { NarrativeHero } from "./NarrativeHero";
export { VisualBiomarkerReport } from "./VisualBiomarkerReport";
```

- [ ] **Step 3: Run — expect PASS**

Run: `pnpm --filter @onlyou/mobile test visual-biomarker-report`
Expected: `PASS · 2 tests`.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/biomarker apps/mobile/__tests__/components/visual-biomarker-report.test.tsx
git commit -m "feat(phase-2d/7): VisualBiomarkerReport composition + barrel"
```

---

## Task 8 — Profile index (real version)

**Files:**

- Modify: `apps/mobile/app/profile/index.tsx`

- [ ] **Step 1: Overwrite profile index (replaces 2B placeholder)**

```tsx
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { usePatientState } from "@/hooks/use-patient-state";
import { useSignIn } from "@/hooks/use-signin";
import { colors } from "@/theme/colors";

interface Row {
  title: string;
  route: string;
  genderRestrict?: "female";
}

const ROWS: Row[] = [
  { title: "Personal info", route: "/profile/personal-info" },
  { title: "Subscriptions", route: "/profile/subscriptions" },
  { title: "Prescriptions", route: "/profile/prescriptions" },
  { title: "Orders", route: "/profile/orders" },
  { title: "Lab results", route: "/profile/lab-results" },
  { title: "Addresses", route: "/profile/addresses" },
  { title: "Payment methods", route: "/profile/payment-methods" },
  { title: "Notifications", route: "/profile/notifications" },
  { title: "Wallet", route: "/profile/wallet" },
  {
    title: "Period tracker",
    route: "/profile/period-tracker",
    genderRestrict: "female",
  },
  { title: "Legal", route: "/profile/legal" },
  { title: "Help & support", route: "/profile/help" },
];

export default function ProfileIndex() {
  const insets = useSafeAreaInsets();
  const user = usePatientState();
  const { signOut } = useSignIn();

  async function onSignOut() {
    await signOut();
    router.replace("/(auth)/welcome");
  }

  const visibleRows = ROWS.filter((r) => {
    if (!r.genderRestrict) return true;
    return user.gender === r.genderRestrict;
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 24,
      }}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 30,
          color: colors.textPrimary,
          letterSpacing: -0.6,
          marginTop: 8,
          marginBottom: 24,
        }}
      >
        Account
      </Text>

      <View
        style={{
          padding: 16,
          borderRadius: 14,
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 24,
        }}
      >
        <Text
          style={{ fontSize: 16, fontWeight: "800", color: colors.textPrimary }}
        >
          {user.name}
        </Text>
        <Text
          style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}
        >
          {user.phone} · {user.gender} · age {user.age}
        </Text>
      </View>

      {visibleRows.map((row) => (
        <Pressable
          key={row.title}
          onPress={() => router.push(row.route as never)}
          style={{
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: colors.textPrimary,
            }}
          >
            {row.title}
          </Text>
          <Text style={{ fontSize: 16, color: colors.textTertiary }}>›</Text>
        </Pressable>
      ))}

      <View style={{ marginTop: 32 }}>
        <PremiumButton
          label="Sign out"
          variant="secondary"
          onPress={onSignOut}
        />
      </View>

      <Text
        style={{
          fontSize: 10,
          color: colors.textMuted,
          textAlign: "center",
          marginTop: 24,
        }}
      >
        v1.0.0 (build 2026.04)
      </Text>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/profile/index.tsx
git commit -m "feat(phase-2d/8): profile index with 12 rows (8 real + 4 placeholders, gender-filtered)"
```

---

## Task 9 — Profile sub-screens (personal-info, subscriptions, prescriptions, orders)

**Files:**

- Create: `apps/mobile/app/profile/personal-info.tsx`
- Create: `apps/mobile/app/profile/subscriptions.tsx`
- Create: `apps/mobile/app/profile/prescriptions.tsx`
- Create: `apps/mobile/app/profile/orders.tsx`

- [ ] **Step 1: Write `personal-info.tsx`**

```tsx
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumInput } from "@/components/ui/PremiumInput";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function PersonalInfo() {
  const user = usePatientState();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 24,
          letterSpacing: -0.6,
        }}
      >
        Personal info
      </Text>

      <View style={{ gap: 16 }}>
        <PremiumInput label="Full name" value={user.name} editable={false} />
        <PremiumInput label="Phone" value={user.phone} editable={false} />
        <PremiumInput label="Age" value={String(user.age)} editable={false} />
        <PremiumInput label="Gender" value={user.gender} editable={false} />
      </View>

      <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 16 }}>
        Editing is disabled in the shell. Phase 3 will wire the real update
        mutations.
      </Text>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Write `subscriptions.tsx`**

```tsx
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VERTICALS } from "@/fixtures/verticals";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function Subscriptions() {
  const user = usePatientState();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 24,
          letterSpacing: -0.6,
        }}
      >
        Subscriptions
      </Text>

      {user.subscriptions.length === 0 ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            No active subscriptions.
          </Text>
        </View>
      ) : (
        user.subscriptions.map((s) => {
          const info = VERTICALS[s.vertical];
          return (
            <View
              key={s.id}
              style={{
                padding: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.white,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: colors.textPrimary,
                  marginBottom: 4,
                }}
              >
                {info.displayName} · {s.plan}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                ₹{(s.priceMonthlyPaise / 100).toFixed(0)}/month
              </Text>
              {s.nextBillingAt ? (
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textTertiary,
                    marginTop: 6,
                  }}
                >
                  Next billing:{" "}
                  {new Date(s.nextBillingAt).toLocaleDateString("en-IN")}
                </Text>
              ) : null}
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textTertiary,
                  marginTop: 12,
                  fontWeight: "700",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                Pause / cancel / change — Phase 3
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
```

- [ ] **Step 3: Write `prescriptions.tsx`**

```tsx
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VERTICALS } from "@/fixtures/verticals";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function Prescriptions() {
  const user = usePatientState();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 24,
          letterSpacing: -0.6,
        }}
      >
        Prescriptions
      </Text>

      {user.prescriptions.length === 0 ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            No prescriptions yet.
          </Text>
        </View>
      ) : (
        user.prescriptions.map((rx) => {
          const info = VERTICALS[rx.vertical];
          return (
            <View
              key={rx.id}
              style={{
                padding: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.white,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: colors.textPrimary,
                  marginBottom: 4,
                }}
              >
                {info.displayName}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginBottom: 10,
                }}
              >
                {rx.doctorName} ·{" "}
                {new Date(rx.issuedAt).toLocaleDateString("en-IN")}
              </Text>
              {rx.items.map((item) => (
                <View key={item.name} style={{ marginBottom: 6 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: colors.textPrimary,
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                    {item.dosage} · {item.schedule}
                  </Text>
                </View>
              ))}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
```

- [ ] **Step 4: Write `orders.tsx`**

```tsx
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StepperList } from "@/components/activity/StepperList";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function OrdersScreen() {
  const user = usePatientState();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 24,
          letterSpacing: -0.6,
        }}
      >
        Orders
      </Text>

      <StepperList
        orders={user.orders}
        onSelect={(id) => router.push(`/(tabs)/activity/${id}`)}
      />
    </ScrollView>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/profile/personal-info.tsx apps/mobile/app/profile/subscriptions.tsx apps/mobile/app/profile/prescriptions.tsx apps/mobile/app/profile/orders.tsx
git commit -m "feat(phase-2d/9): profile personal-info + subscriptions + prescriptions + orders"
```

---

## Task 10 — Profile lab-results (list + detail with biomarker report)

**Files:**

- Create: `apps/mobile/app/profile/lab-results/_layout.tsx`
- Create: `apps/mobile/app/profile/lab-results/index.tsx`
- Create: `apps/mobile/app/profile/lab-results/[id].tsx`

- [ ] **Step 1: Layout**

```tsx
import { Stack } from "expo-router";

export default function LabResultsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: List (always shows the fixture report)**

Create `apps/mobile/app/profile/lab-results/index.tsx`:

```tsx
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BIOMARKER_FIXTURE } from "@/fixtures/biomarker-fixture";
import { colors } from "@/theme/colors";

export default function LabResultsList() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 24,
          letterSpacing: -0.6,
        }}
      >
        Lab results
      </Text>

      <Pressable
        onPress={() =>
          router.push(`/profile/lab-results/${BIOMARKER_FIXTURE.id}`)
        }
        style={{
          padding: 16,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.white,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: colors.accent,
            fontWeight: "800",
            marginBottom: 6,
          }}
        >
          New · {BIOMARKER_FIXTURE.markers.length} markers
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: colors.textPrimary,
            marginBottom: 4,
          }}
        >
          {BIOMARKER_FIXTURE.reportTitle}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textTertiary }}>
          Reviewed{" "}
          {new Date(BIOMARKER_FIXTURE.reviewedAt).toLocaleDateString("en-IN")} ·
          by {BIOMARKER_FIXTURE.curatorName}
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "800",
            color: colors.accent,
            letterSpacing: 0.4,
            marginTop: 10,
          }}
        >
          View visual report →
        </Text>
      </Pressable>
    </ScrollView>
  );
}
```

- [ ] **Step 3: Detail (visual report)**

Create `apps/mobile/app/profile/lab-results/[id].tsx`:

```tsx
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VisualBiomarkerReport } from "@/components/biomarker";
import { BIOMARKER_FIXTURE } from "@/fixtures/biomarker-fixture";
import { colors } from "@/theme/colors";

export default function LabResultsDetail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  if (id !== BIOMARKER_FIXTURE.id) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}
      >
        <Text style={{ color: colors.textSecondary }}>Report not found.</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
      }}
    >
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 44, height: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
        </Pressable>
      </View>
      <VisualBiomarkerReport
        report={BIOMARKER_FIXTURE}
        onDownloadPdf={() => {}}
        onMessageDoctor={() => router.push("/(tabs)/messages")}
      />
    </View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/profile/lab-results
git commit -m "feat(phase-2d/10): lab-results list + detail rendering VisualBiomarkerReport"
```

---

## Task 11 — Profile addresses, payment-methods, notifications

**Files:**

- Create: `apps/mobile/app/profile/addresses.tsx`
- Create: `apps/mobile/app/profile/payment-methods.tsx`
- Create: `apps/mobile/app/profile/notifications.tsx`

- [ ] **Step 1: Write `addresses.tsx`**

```tsx
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function AddressesScreen() {
  const user = usePatientState();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 24,
          letterSpacing: -0.6,
        }}
      >
        Addresses
      </Text>

      <View
        style={{
          padding: 16,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.white,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "800",
            color: colors.textPrimary,
            marginBottom: 6,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            fontSize: 10,
          }}
        >
          Default
        </Text>
        <Text
          style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}
        >
          {user.name}
        </Text>
        <Text
          style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}
        >
          Fixture address, Bengaluru, Karnataka 560001
        </Text>
      </View>
      <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 16 }}>
        Add / edit / remove — Phase 3 wires the real mutations.
      </Text>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Write `payment-methods.tsx`**

```tsx
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

import { colors } from "@/theme/colors";

export default function PaymentMethods() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 24,
          letterSpacing: -0.6,
        }}
      >
        Payment methods
      </Text>

      <View
        style={{
          padding: 16,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.white,
          marginBottom: 12,
        }}
      >
        <Text
          style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}
        >
          UPI · @okaxis
        </Text>
        <Text
          style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}
        >
          Default · added at signup
        </Text>
      </View>
      <Text style={{ fontSize: 11, color: colors.textTertiary }}>
        Add / remove — Phase 3 wires Razorpay tokens.
      </Text>
    </ScrollView>
  );
}
```

- [ ] **Step 3: Write `notifications.tsx`**

```tsx
import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";

import { colors } from "@/theme/colors";

export default function NotificationsSettings() {
  const [medReminders, setMedReminders] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [marketing, setMarketing] = useState(false);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 24,
          letterSpacing: -0.6,
        }}
      >
        Notifications
      </Text>

      <Row
        label="Medication reminders"
        description="Daily reminders for your prescribed dosing schedule."
        value={medReminders}
        onChange={setMedReminders}
      />
      <Row
        label="Order updates"
        description="Shipping, delivery, and prescription status."
        value={orderUpdates}
        onChange={setOrderUpdates}
      />
      <Row
        label="Marketing"
        description="Occasional tips, product launches, and partner offers."
        value={marketing}
        onChange={setMarketing}
      />

      <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 20 }}>
        Inbox and push deep-link handlers ship in Phase 8.
      </Text>
    </ScrollView>
  );
}

function Row({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: colors.textPrimary,
            marginBottom: 2,
          }}
        >
          {label}
        </Text>
        <Text
          style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17 }}
        >
          {description}
        </Text>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/profile/addresses.tsx apps/mobile/app/profile/payment-methods.tsx apps/mobile/app/profile/notifications.tsx
git commit -m "feat(phase-2d/11): profile addresses + payment-methods + notifications settings"
```

---

## Task 12 — Profile placeholder sub-screens (wallet, period-tracker, legal, help)

**Files:**

- Create: `apps/mobile/app/profile/wallet.tsx`
- Create: `apps/mobile/app/profile/period-tracker.tsx`
- Create: `apps/mobile/app/profile/legal.tsx`
- Create: `apps/mobile/app/profile/help.tsx`

- [ ] **Step 1: Write `wallet.tsx`**

```tsx
import { PlaceholderScreen } from "@/components/placeholder-screen";

export default function WalletScreen() {
  return (
    <PlaceholderScreen
      title="Wallet"
      phase="Phase 3"
      reason="Wallet balance, transaction history, and refunds ship once real subscription payments flow."
    />
  );
}
```

- [ ] **Step 2: Write `period-tracker.tsx`**

```tsx
import { PlaceholderScreen } from "@/components/placeholder-screen";

export default function PeriodTrackerScreen() {
  return (
    <PlaceholderScreen
      title="Period tracker"
      phase="PCOS phase"
      reason="Cycle tracking lands alongside the PCOS vertical build. Female and other-gender patients will see it once it ships."
    />
  );
}
```

- [ ] **Step 3: Write `legal.tsx`**

```tsx
import { PlaceholderScreen } from "@/components/placeholder-screen";

export default function LegalScreen() {
  return (
    <PlaceholderScreen
      title="Legal"
      phase="Phase 8"
      reason="Terms, privacy policy, refund policy, and telehealth consent ship with launch polish."
    />
  );
}
```

- [ ] **Step 4: Write `help.tsx`**

```tsx
import { PlaceholderScreen } from "@/components/placeholder-screen";

export default function HelpScreen() {
  return (
    <PlaceholderScreen
      title="Help & support"
      phase="Phase 8+"
      reason="In-app support chat is a post-launch feature."
    />
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/profile/wallet.tsx apps/mobile/app/profile/period-tracker.tsx apps/mobile/app/profile/legal.tsx apps/mobile/app/profile/help.tsx
git commit -m "feat(phase-2d/12): profile placeholder sub-screens (wallet, period-tracker, legal, help)"
```

---

## Task 13 — Lab booking stack + index

**Files:**

- Create: `apps/mobile/app/lab-booking/_layout.tsx`
- Create: `apps/mobile/app/lab-booking/index.tsx`

- [ ] **Step 1: Layout**

```tsx
import { Stack } from "expo-router";

export default function LabBookingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: "modal" }} />
  );
}
```

- [ ] **Step 2: Index**

```tsx
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { colors } from "@/theme/colors";

export default function LabBookingIndex() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 24,
      }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 30,
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 8,
          letterSpacing: -0.6,
        }}
      >
        Lab work
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          marginBottom: 32,
          lineHeight: 20,
        }}
      >
        Book a home collection with a certified phlebotomist, or upload results
        you already have.
      </Text>

      <View style={{ gap: 12 }}>
        <PremiumButton
          variant="warm"
          label="Book home collection"
          onPress={() => router.push("/lab-booking/slot-selection")}
        />
        <PremiumButton
          variant="secondary"
          label="I already have results — upload"
          onPress={() => router.push("/lab-booking/upload-results")}
        />
      </View>

      <View style={{ flex: 1 }} />

      <Text
        style={{
          fontSize: 11,
          color: colors.textTertiary,
          textAlign: "center",
          marginTop: 16,
        }}
      >
        First panel is free as part of your consultation. Follow-ups are
        included in your subscription.
      </Text>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/lab-booking/_layout.tsx apps/mobile/app/lab-booking/index.tsx
git commit -m "feat(phase-2d/13): lab-booking stack + entry screen"
```

---

## Task 14 — Slot selection + address confirm

**Files:**

- Create: `apps/mobile/app/lab-booking/slot-selection.tsx`
- Create: `apps/mobile/app/lab-booking/address-confirm.tsx`

- [ ] **Step 1: Write `slot-selection.tsx`**

```tsx
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { colors } from "@/theme/colors";

const DAYS = ["Tue 15", "Wed 16", "Thu 17", "Fri 18", "Sat 19"];
const TIMES = ["7:00 AM", "8:30 AM", "10:00 AM", "4:30 PM", "6:00 PM"];

export default function SlotSelection() {
  const insets = useSafeAreaInsets();
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const canProceed = Boolean(day && time);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 8,
      }}
    >
      <View style={{ paddingHorizontal: 24 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 44, height: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
      >
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 26,
            color: colors.textPrimary,
            marginTop: 16,
            marginBottom: 20,
            letterSpacing: -0.5,
          }}
        >
          Pick a time
        </Text>

        <Text
          style={{
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: colors.textTertiary,
            fontWeight: "800",
            marginBottom: 10,
          }}
        >
          Day
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {DAYS.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDay(d)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: day === d ? colors.accent : colors.border,
                backgroundColor: day === d ? colors.accentLight : colors.white,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                {d}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text
          style={{
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: colors.textTertiary,
            fontWeight: "800",
            marginBottom: 10,
          }}
        >
          Time
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {TIMES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTime(t)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: time === t ? colors.accent : colors.border,
                backgroundColor: time === t ? colors.accentLight : colors.white,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View
        style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
      >
        <PremiumButton
          variant="warm"
          label="Continue"
          disabled={!canProceed}
          onPress={() => router.push("/lab-booking/address-confirm")}
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Write `address-confirm.tsx`**

```tsx
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function AddressConfirm() {
  const insets = useSafeAreaInsets();
  const user = usePatientState();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 8,
        paddingHorizontal: 24,
      }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>

      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 26,
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 20,
          letterSpacing: -0.5,
        }}
      >
        Confirm address
      </Text>

      <View
        style={{
          padding: 16,
          borderRadius: 14,
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}
        >
          {user.name}
        </Text>
        <Text
          style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}
        >
          Fixture address · Bengaluru, Karnataka 560001
        </Text>
        <Text
          style={{ fontSize: 11, color: colors.textTertiary, marginTop: 6 }}
        >
          {user.phone}
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <PremiumButton
        variant="warm"
        label="Confirm booking"
        onPress={() => {
          router.dismissAll();
        }}
      />
      <Text
        style={{
          fontSize: 11,
          color: colors.textTertiary,
          textAlign: "center",
          marginTop: 10,
          marginBottom: insets.bottom + 12,
        }}
      >
        You&apos;ll get a confirmation on WhatsApp.
      </Text>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/lab-booking/slot-selection.tsx apps/mobile/app/lab-booking/address-confirm.tsx
git commit -m "feat(phase-2d/14): lab-booking slot-selection + address-confirm"
```

---

## Task 15 — Upload results with 3-second simulated analyzing → biomarker report

**Files:**

- Create: `apps/mobile/app/lab-booking/upload-results.tsx`

- [ ] **Step 1: Write**

```tsx
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { BIOMARKER_FIXTURE } from "@/fixtures/biomarker-fixture";
import { colors } from "@/theme/colors";

type UploadState = "idle" | "analyzing";

export default function UploadResults() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<UploadState>("idle");

  useEffect(() => {
    if (state === "analyzing") {
      const t = setTimeout(() => {
        router.replace(`/profile/lab-results/${BIOMARKER_FIXTURE.id}`);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 24,
      }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>

      {state === "idle" ? (
        <>
          <Text
            style={{
              fontFamily: "PlayfairDisplay_900Black",
              fontSize: 28,
              color: colors.textPrimary,
              marginTop: 16,
              marginBottom: 8,
              letterSpacing: -0.6,
            }}
          >
            Upload your results
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 32,
              lineHeight: 20,
            }}
          >
            PDF or photo. We&apos;ll analyze the markers and show you a visual
            report.
          </Text>

          <Pressable
            onPress={() => setState("analyzing")}
            style={{
              padding: 40,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: colors.border,
              borderStyle: "dashed",
              backgroundColor: colors.white,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📄</Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: colors.textPrimary,
              }}
            >
              Tap to pick a file
            </Text>
            <Text
              style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4 }}
            >
              PDF · JPG · PNG
            </Text>
          </Pressable>

          <View style={{ flex: 1 }} />

          <PremiumButton
            variant="warm"
            label="Upload demo file"
            onPress={() => setState("analyzing")}
          />
        </>
      ) : (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={colors.accent} size="large" />
          <Text
            style={{
              fontFamily: "PlayfairDisplay_900Black",
              fontSize: 22,
              color: colors.textPrimary,
              marginTop: 20,
              textAlign: "center",
            }}
          >
            Analyzing your report…
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              marginTop: 8,
              textAlign: "center",
              maxWidth: 260,
            }}
          >
            Reading markers, classifying against reference ranges, and building
            your visual report.
          </Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/lab-booking/upload-results.tsx
git commit -m "feat(phase-2d/15): upload-results with 3-sec analyzing → biomarker report"
```

---

## Task 16 — Phase 2 final acceptance gate

**Files:**

- Modify: `checkpoint.md`
- Modify: `docs/DEFERRED.md` (strike through Phase 1 deferrals closed by Phase 2)

- [ ] **Step 1: Full test suite from scratch**

```bash
pnpm --filter @onlyou/mobile typecheck
pnpm --filter @onlyou/mobile lint
pnpm --filter @onlyou/mobile test
```

Expected: zero errors, ~150+ tests passing (2A: ~28 + 2B: ~7 + 2C: ~15 + 2D: ~12).

- [ ] **Step 2: iOS + Android manual walkthrough — full Phase 2 approval-gate checklist from spec §6**

Run the full §6 acceptance criteria from the spec:

- **§6.1 Build integrity** — typecheck, lint, tests all clean.
- **§6.2 Build artifacts** — iOS + Android dev builds run without red boxes. CI check confirms no `99999 000` in release bundle.
- **§6.3 Shell completeness** — every route in §3.1 of the spec exists; every route stub renders `<PlaceholderScreen>`; no `router.push()` hits a missing target.
- **§6.4 Auth** — first-time and returning user flows work end-to-end; dev quick-login drawer visible in dev, invisible in release.
- **§6.5 Fixture + scenario switcher** — triple-tap → sheet; all 4 scenarios flip correctly; gender visibility verified.
- **§6.6 Vertical coverage** — Hair Loss + ED full flow; PE/Weight/PCOS teasers.
- **§6.7 Visual Biomarker Report** — fixture renders v2 design; upload flow 3-sec analyzing → fixture report.
- **§6.8 CRO pass evidence** — each target screen's git log commit references the CRO skill name.
- **§6.9 Code review** — run `superpowers:requesting-code-review` on the full Plan 2D diff.
- **§6.10 Visual quality gate** — run the Clinical Luxe feel checklist on every new screen (every profile sub-screen, lab-booking screens, biomarker report).
- **§6.11 Deferral hygiene** — no stale "open decisions" in DEFERRED.md Phase 2 section; every new deferral from implementation is tracked.
- **§6.12 Founder approval gate** — founder walks every tab, flips switcher through all 4 scenarios, quick-logs into each fake user, reviews biomarker report, writes **"Phase 2 approved for Phase 2.5"** in `checkpoint.md`.

- [ ] **Step 3: Strike through Phase 1 deferrals closed by Phase 2**

Edit `docs/DEFERRED.md`. In the Phase 1 table, find "Input polish: floating labels, +91 country prefix, validation states" and strike through:

```md
| ~~Input polish: floating labels, +91 country prefix, validation states~~ | ~~Phase 2 (patient shell)~~ | ~~Primary consumer is patient auth + profile-setup forms — build the pattern when the real forms need it~~ (closed by phase-2a/5 commit <sha>) |
```

- [ ] **Step 4: Commit the DEFERRED.md update**

```bash
git add docs/DEFERRED.md
git commit -m "docs(deferred): strike phase 1 input polish — closed by phase 2a floating-label upgrade"
```

- [ ] **Step 5: Update checkpoint.md**

Append:

```markdown
## Phase 2 — Patient app shell (complete YYYY-MM-DD) ✅

All four plans (2A / 2B / 2C / 2D) merged to master.

Delivered:

- Test infrastructure: Jest + RTL, ~150 tests, ~40 screens covered
- Custom ESLint `no-hardcoded-hex` rule
- Foundation components: `<PremiumInput>` floating-label, `<PremiumButton>` warm variant, `<BottomSheet>`, `<PlaceholderScreen>`, `<GenderGate>`
- Fixture layer: 4 patient-state users (both genders), scenario switcher with triple-tap, persisted state
- Custom Convex auth: OTP mutations with dev bypass, 4 seeded fake users, sessions, getCurrentUser, signOut, completeProfile
- Mobile wiring: ConvexReactClient, auth-store (secure-store), useCurrentUser, useSignIn
- Auth screens: welcome (dev quick-login), phone-verify, otp-entry, profile-setup multi-step
- (tabs) layout: 4 tabs + profile avatar + triple-tap wordmark scenario switcher
- Home: 4 state-aware rendering (new empty / under-review / plan-ready / active + meds + delivery)
- Explore: 5-vertical grid with gender filter + condition detail (Hair Loss + ED real, 3 teasers)
- Questionnaire engine: stub banks, entry, per-question, review
- Photo upload: container + simulated camera
- Treatment journey: confirmation → plan-ready → plan-selection → mocked payment → subscription-confirmed
- Activity: list + stepper detail
- Messages: conversation list + chat (input disabled)
- Profile stack: personal-info, subscriptions, prescriptions, orders, addresses, payment-methods, notifications settings + 4 placeholder sub-screens
- Lab booking: book collection flow + upload-results with 3-sec analyzing → biomarker
- Visual Biomarker Report: full v2 composition with 8 markers, sparklines, range bars, narrative hero, curator byline
- Code review pass (Rule 10) on every plan

CRO skills applied: signup-flow-cro (auth), onboarding-cro + app-onboarding-questionnaire (profile setup + questionnaire), paywall-upgrade-cro + pricing-strategy (plan selection + payment).

Next: Phase 2.5 — Biomarker foundation. Begins with a dedicated brainstorm after founder approval.
```

- [ ] **Step 6: Commit checkpoint**

```bash
git add checkpoint.md
git commit -m "chore(phase-2d/16): phase 2 complete — all 4 plans merged, ready for approval gate"
```

- [ ] **Step 7: Merge**

After code review approval and founder sign-off:

```bash
git checkout master
git merge --no-ff feature/phase-2d-profile-lab-biomarker -m "Merge phase 2D — profile stack + lab booking + biomarker report"
git worktree remove ../onlyou2-phase-2d
git branch -d feature/phase-2d-profile-lab-biomarker
```

---

## Self-review

- **Spec coverage:** Tasks 1–7 cover §4.8 (Visual Biomarker Report), Tasks 8–12 cover §3.1 profile stack (all 12 rows), Tasks 13–15 cover lab booking + upload flow, Task 16 runs the full §6 acceptance criteria for Phase 2 overall.
- **Placeholder scan:** no "TBD" or "similar to task N" markers; every task has complete code.
- **Type consistency:** `BiomarkerMarker`, `MarkerStatus`, `FixtureUser`, `Order` types all consistent across tasks.
- **Scope:** nothing spills outside Plan 2D boundaries. Real biomarker parsing explicitly deferred to Phase 2.5 per spec + DEFERRED.md.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-14-phase-2d-profile-lab-biomarker.md`. Execute via `superpowers:subagent-driven-development` (recommended — 16 tasks, the last of which is the Phase 2 overall approval gate) or `superpowers:executing-plans`.

**After Plan 2D merges:** Phase 2 is done. Brainstorm Phase 2.5 — biomarker foundation — is the next step in the workflow.
