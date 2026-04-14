# Phase 2C — Tab Content + Consultation Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`. Depends on Plans 2A and 2B merged to master. Create a fresh worktree (Task 0).

**Goal:** Replace the placeholder tab stubs from Plan 2B with real screens. Build the full consultation journey end-to-end: Explore grid → condition detail → questionnaire engine → photo upload → treatment confirmation → plan-ready → plan-selection → payment (mocked) → subscription-confirmed. Ship the four tab roots (Home in 4 states, Explore with gender filter, Activity list + detail, Messages list + chat). By the end of 2C the founder can walk a full patient journey from Explore to "treatment active" against fixtures — the whole consultation feel is there even though Convex content is still fake.

**Architecture:** Fixture layer extends. `apps/mobile/src/fixtures/patient-states.ts` gains typed slices for `consultations`, `prescriptions`, `orders`, `deliveries`, `messages`, `subscriptions`. New `apps/mobile/src/data/verticals.ts` holds the 5-vertical metadata (display name, category, photo requirement, gender filter, pricing tiers). Questionnaire engine reads from `apps/mobile/src/data/questionnaires/<vertical>.ts` — stub question sets for Hair Loss + ED, "Coming Soon" for the other three verticals. All consultation-flow CTAs use `PremiumButton variant="warm"` per the Clinical Luxe rule.

**Tech Stack:** Plan 2A foundation + Plan 2B auth + all existing Expo SDK 55 stack. No new runtime deps.

**CRO skills required at implementation time** (per `docs/APP-PATIENT-ADDITIONS.md` §3):

- `onboarding-cro` → Task 5 (home empty state for new user), Task 11 (questionnaire entry)
- `app-onboarding-questionnaire` → Tasks 11, 12, 13 (questionnaire engine + per-question + review)
- `paywall-upgrade-cro` + `pricing-strategy` → Task 20 (plan-selection)
- `paywall-upgrade-cro` → Task 21 (payment)

**Authoritative sources:**

- `docs/superpowers/specs/2026-04-14-phase-2-patient-shell-design.md` §3.1, §4.7, §4.8, §4.10, §4.12
- `docs/VISUAL_DIRECTION.md` §2.4 (home), §2.5 (consultation), §2.6 (plan selection), §2.7 (payment), §2.8 (chat), §2.12 (orders)
- `docs/APP-PATIENT-ADDITIONS.md` §1 (gender-aware visibility)
- `docs/VERTICAL-HAIR-LOSS.md`, `docs/VERTICAL-ED.md` — source for real questionnaire content (only shape; words are stubs in 2C)
- `docs/DEFERRED.md` (reviewed at Task 0)

**Out of scope for 2C:** Profile sub-screens (Plan 2D), lab booking (Plan 2D), Visual Biomarker Report components (Plan 2D), real Razorpay, real questionnaire content for PE/Weight/PCOS, gender-aware opt-in link for "other".

---

## File Structure

```
apps/mobile/
├── app/(tabs)/
│   ├── home/
│   │   ├── index.tsx                  [MODIFY]  4-state daily centre (reads usePatientState)
│   │   └── tracking/[id].tsx          [NEW]     lab or delivery stepper detail
│   ├── explore/
│   │   ├── index.tsx                  [MODIFY]  5-condition grid + gender filter
│   │   └── [condition].tsx            [NEW]     condition detail (Hair Loss, ED real; teasers for 3)
│   ├── activity/
│   │   ├── index.tsx                  [MODIFY]  active + completed list
│   │   └── [orderId].tsx              [NEW]     order/lab detail stepper
│   └── messages/
│       ├── index.tsx                  [MODIFY]  conversation list
│       └── [conversationId].tsx       [NEW]     chat screen (input disabled)
├── app/questionnaire/
│   ├── _layout.tsx                    [NEW]     modal stack, warm CTA
│   └── [condition]/
│       ├── index.tsx                  [NEW]     entry (gender branch for Hair Loss)
│       ├── [qid].tsx                  [NEW]     one question per screen
│       └── review.tsx                 [NEW]     review answers + submit
├── app/photo-upload/
│   ├── _layout.tsx                    [NEW]     modal stack
│   ├── [condition].tsx                [NEW]     photo upload container
│   └── camera.tsx                     [NEW]     camera overlay
├── app/treatment/
│   ├── _layout.tsx                    [NEW]     modal stack, warm CTA
│   ├── confirmation.tsx               [NEW]     "submitted — free"
│   ├── plan-ready.tsx                 [NEW]     dr name + diagnosis + meds
│   ├── plan-selection.tsx             [NEW]     Monthly / Quarterly / 6-month
│   ├── payment.tsx                    [NEW]     Razorpay sheet (mocked)
│   └── subscription-confirmed.tsx     [NEW]     success + "preparing medication"
└── src/
    ├── fixtures/
    │   ├── patient-states.ts          [MODIFY]  extend with consultation/prescription/order/delivery/message/subscription slices
    │   └── verticals.ts               [NEW]     5-vertical metadata
    ├── data/
    │   └── questionnaires/
    │       ├── hair-loss.ts           [NEW]     stub questions
    │       ├── ed.ts                  [NEW]     stub questions
    │       └── index.ts               [NEW]     barrel
    └── components/
        ├── home/
        │   ├── ActiveTreatmentCard.tsx     [NEW]
        │   ├── UnderReviewCard.tsx         [NEW]
        │   ├── PlanReadyCard.tsx           [NEW]
        │   ├── MedicationReminder.tsx      [NEW]
        │   └── DeliveryTrackingBanner.tsx  [NEW]
        ├── explore/
        │   └── ConditionCard.tsx           [NEW]
        ├── activity/
        │   └── StepperList.tsx             [NEW]
        └── questionnaire/
            ├── ProgressCounter.tsx         [NEW]
            ├── SelectionCard.tsx           [NEW]
            └── QuestionShell.tsx           [NEW]
```

---

## Task 0 — Worktree + DEFERRED review + prerequisite check

- [ ] **Step 1: Verify Plans 2A and 2B shipped**

```bash
git log master --oneline | grep -iE "phase-2a|phase-2b" | head
```

Expected: at least 16 phase-2a commits + 20 phase-2b commits visible in master history.

- [ ] **Step 2: Read `docs/DEFERRED.md` Phase 2 section**

Run: `cat docs/DEFERRED.md`
Expected: confirm no Plan 2C scope conflicts.

- [ ] **Step 3: Create worktree**

```bash
git worktree add -b feature/phase-2c-tab-content ../onlyou2-phase-2c master
cd ../onlyou2-phase-2c
git status
```

- [ ] **Step 4: Empty marker commit**

```bash
git commit --allow-empty -m "chore(phase-2c): begin tab content + consultation plan"
```

---

## Task 1 — Extend `FixtureUser` types with real slices

**Files:**

- Modify: `apps/mobile/src/fixtures/patient-states.ts`
- Modify: `apps/mobile/__tests__/fixtures/patient-states.test.ts`

- [ ] **Step 1: Update the types + extend each of the 4 fixture users with populated slices for their state**

Overwrite `apps/mobile/src/fixtures/patient-states.ts`:

```ts
export type PatientState = "new" | "reviewing" | "ready" | "active";
export type Gender = "male" | "female" | "other";
export type Vertical = "hair-loss" | "ed" | "pe" | "weight" | "pcos";
export type ConsultationStatus =
  | "submitted"
  | "under-review"
  | "plan-ready"
  | "paid"
  | "active";
export type OrderStatus =
  | "preparing"
  | "dispatched"
  | "out-for-delivery"
  | "delivered"
  | "cancelled";

export interface Consultation {
  id: string;
  vertical: Vertical;
  status: ConsultationStatus;
  submittedAt: number;
  doctorName?: string;
  doctorSpecialty?: string;
  diagnosis?: string;
}

export interface Prescription {
  id: string;
  consultationId: string;
  vertical: Vertical;
  items: Array<{ name: string; dosage: string; schedule: string }>;
  issuedAt: number;
  doctorName: string;
  pdfUrl?: string;
}

export interface Order {
  id: string;
  prescriptionId: string;
  vertical: Vertical;
  status: OrderStatus;
  itemCount: number;
  totalPaise: number;
  placedAt: number;
  expectedDelivery?: number;
}

export interface Delivery {
  orderId: string;
  status: OrderStatus;
  progress: Array<{ label: string; at: number; done: boolean }>;
}

export interface Message {
  id: string;
  conversationId: string;
  fromPatient: boolean;
  text: string;
  sentAt: number;
}

export interface Conversation {
  id: string;
  vertical: Vertical;
  doctorName: string;
  doctorSpecialty: string;
  unreadCount: number;
  lastMessagePreview: string;
  lastMessageAt: number;
  messages: Message[];
}

export interface Subscription {
  id: string;
  vertical: Vertical;
  plan: "monthly" | "quarterly" | "six-month";
  priceMonthlyPaise: number;
  nextBillingAt?: number;
  startedAt: number;
}

export interface FixtureUser {
  userId: string;
  phone: string;
  name: string;
  gender: Gender;
  age: number;
  state: PatientState;
  consultations: Consultation[];
  prescriptions: Prescription[];
  orders: Order[];
  deliveries: Delivery[];
  conversations: Conversation[];
  subscriptions: Subscription[];
}

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

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
  conversations: [],
  subscriptions: [],
};

const priya: FixtureUser = {
  userId: "fixture-priya",
  phone: "+91 99999 00002",
  name: "Priya Iyer",
  gender: "female",
  age: 29,
  state: "reviewing",
  consultations: [
    {
      id: "c-priya-1",
      vertical: "pcos",
      status: "under-review",
      submittedAt: now - 4 * 60 * 60 * 1000,
    },
  ],
  prescriptions: [],
  orders: [],
  deliveries: [],
  conversations: [
    {
      id: "conv-priya-1",
      vertical: "pcos",
      doctorName: "Dr. Neha Kapoor",
      doctorSpecialty: "Endocrinologist",
      unreadCount: 0,
      lastMessagePreview:
        "Your doctor will respond once your case is reviewed.",
      lastMessageAt: now - 4 * 60 * 60 * 1000,
      messages: [
        {
          id: "m-1",
          conversationId: "conv-priya-1",
          fromPatient: false,
          text: "Your doctor will respond once your case is reviewed.",
          sentAt: now - 4 * 60 * 60 * 1000,
        },
      ],
    },
  ],
  subscriptions: [],
};

const rahul: FixtureUser = {
  userId: "fixture-rahul",
  phone: "+91 99999 00003",
  name: "Rahul Mehta",
  gender: "male",
  age: 35,
  state: "ready",
  consultations: [
    {
      id: "c-rahul-1",
      vertical: "hair-loss",
      status: "plan-ready",
      submittedAt: now - 2 * DAY,
      doctorName: "Dr. Priya Sharma",
      doctorSpecialty: "Dermatologist",
      diagnosis: "Male pattern hair loss (Norwood Type III) — Moderate",
    },
  ],
  prescriptions: [
    {
      id: "rx-rahul-1",
      consultationId: "c-rahul-1",
      vertical: "hair-loss",
      items: [
        {
          name: "Finasteride 1mg",
          dosage: "1 tablet",
          schedule: "Once daily after breakfast",
        },
        {
          name: "Minoxidil 5%",
          dosage: "1 ml",
          schedule: "Apply to scalp at bedtime",
        },
        {
          name: "Biotin 10,000mcg",
          dosage: "1 capsule",
          schedule: "Once daily",
        },
      ],
      issuedAt: now - 2 * 60 * 60 * 1000,
      doctorName: "Dr. Priya Sharma",
    },
  ],
  orders: [],
  deliveries: [],
  conversations: [
    {
      id: "conv-rahul-1",
      vertical: "hair-loss",
      doctorName: "Dr. Priya Sharma",
      doctorSpecialty: "Dermatologist",
      unreadCount: 1,
      lastMessagePreview: "Your treatment plan is ready. Tap to review.",
      lastMessageAt: now - 2 * 60 * 60 * 1000,
      messages: [
        {
          id: "m-1",
          conversationId: "conv-rahul-1",
          fromPatient: false,
          text: "Based on your assessment I recommend Finasteride + Minoxidil. Your plan is ready to view.",
          sentAt: now - 2 * 60 * 60 * 1000,
        },
      ],
    },
  ],
  subscriptions: [],
};

const sanjana: FixtureUser = {
  userId: "fixture-sanjana",
  phone: "+91 99999 00004",
  name: "Sanjana Rao",
  gender: "female",
  age: 28,
  state: "active",
  consultations: [
    {
      id: "c-sanjana-1",
      vertical: "pcos",
      status: "active",
      submittedAt: now - 14 * DAY,
      doctorName: "Dr. Neha Kapoor",
      doctorSpecialty: "Endocrinologist",
      diagnosis: "PCOS — irregular cycle, mild insulin resistance",
    },
  ],
  prescriptions: [
    {
      id: "rx-sanjana-1",
      consultationId: "c-sanjana-1",
      vertical: "pcos",
      items: [
        {
          name: "Metformin 500mg",
          dosage: "1 tablet",
          schedule: "Twice daily with meals",
        },
        {
          name: "Inositol 2g",
          dosage: "1 scoop",
          schedule: "Once daily with water",
        },
      ],
      issuedAt: now - 12 * DAY,
      doctorName: "Dr. Neha Kapoor",
    },
  ],
  orders: [
    {
      id: "o-sanjana-1",
      prescriptionId: "rx-sanjana-1",
      vertical: "pcos",
      status: "out-for-delivery",
      itemCount: 2,
      totalPaise: 99900,
      placedAt: now - 12 * DAY,
      expectedDelivery: now + 4 * 60 * 60 * 1000,
    },
  ],
  deliveries: [
    {
      orderId: "o-sanjana-1",
      status: "out-for-delivery",
      progress: [
        { label: "Preparing", at: now - 12 * DAY, done: true },
        { label: "Dispatched", at: now - 10 * DAY, done: true },
        { label: "Out for delivery", at: now - 2 * 60 * 60 * 1000, done: true },
        { label: "Delivered", at: 0, done: false },
      ],
    },
  ],
  conversations: [
    {
      id: "conv-sanjana-1",
      vertical: "pcos",
      doctorName: "Dr. Neha Kapoor",
      doctorSpecialty: "Endocrinologist",
      unreadCount: 0,
      lastMessagePreview: "Day 14 going well — keep tracking your cycle.",
      lastMessageAt: now - DAY,
      messages: [
        {
          id: "m-1",
          conversationId: "conv-sanjana-1",
          fromPatient: false,
          text: "Based on your labs, starting Metformin + Inositol for cycle regulation.",
          sentAt: now - 12 * DAY,
        },
        {
          id: "m-2",
          conversationId: "conv-sanjana-1",
          fromPatient: true,
          text: "Thank you doctor — how long until I see changes?",
          sentAt: now - 11 * DAY,
        },
        {
          id: "m-3",
          conversationId: "conv-sanjana-1",
          fromPatient: false,
          text: "Cycle regulation usually takes 3 months. Keep logging your cycle in the app.",
          sentAt: now - DAY,
        },
      ],
    },
  ],
  subscriptions: [
    {
      id: "s-sanjana-1",
      vertical: "pcos",
      plan: "quarterly",
      priceMonthlyPaise: 83300,
      nextBillingAt: now + 60 * DAY,
      startedAt: now - 12 * DAY,
    },
  ],
};

export const FIXTURES: Record<PatientState, FixtureUser> = {
  new: arjun,
  reviewing: priya,
  ready: rahul,
  active: sanjana,
};
```

- [ ] **Step 2: Update the fixture test to cover the new slices**

Append to `apps/mobile/__tests__/fixtures/patient-states.test.ts`:

```ts
describe("FixtureUser state-appropriate slices", () => {
  it("new user has no consultations", () => {
    expect(FIXTURES.new.consultations).toHaveLength(0);
  });

  it("reviewing user has one under-review consultation", () => {
    expect(FIXTURES.reviewing.consultations).toHaveLength(1);
    expect(FIXTURES.reviewing.consultations[0]?.status).toBe("under-review");
  });

  it("ready user has a plan-ready consultation + matching prescription", () => {
    expect(FIXTURES.ready.consultations[0]?.status).toBe("plan-ready");
    expect(FIXTURES.ready.prescriptions).toHaveLength(1);
    expect(FIXTURES.ready.prescriptions[0]?.items).toHaveLength(3);
  });

  it("active user has subscription + order + delivery + messages", () => {
    expect(FIXTURES.active.subscriptions).toHaveLength(1);
    expect(FIXTURES.active.orders).toHaveLength(1);
    expect(FIXTURES.active.deliveries).toHaveLength(1);
    expect(FIXTURES.active.conversations[0]?.messages.length).toBeGreaterThan(
      1,
    );
  });
});
```

- [ ] **Step 3: Run — expect PASS**

Run: `pnpm --filter @onlyou/mobile test patient-states`
Expected: `PASS · 8 tests` (4 from Plan 2A + 4 new).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/fixtures/patient-states.ts apps/mobile/__tests__/fixtures/patient-states.test.ts
git commit -m "feat(phase-2c/1): extend FixtureUser slices for all 4 scenarios"
```

---

## Task 2 — Vertical metadata

**Files:**

- Create: `apps/mobile/src/fixtures/verticals.ts`
- Create: `apps/mobile/__tests__/fixtures/verticals.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/fixtures/verticals.test.ts`:

```ts
import { VERTICALS, visibleFor, type VerticalInfo } from "@/fixtures/verticals";

describe("verticals metadata", () => {
  it("has all 5 verticals", () => {
    expect(Object.keys(VERTICALS)).toHaveLength(5);
    expect(VERTICALS["hair-loss"]).toBeDefined();
    expect(VERTICALS.ed).toBeDefined();
    expect(VERTICALS.pe).toBeDefined();
    expect(VERTICALS.weight).toBeDefined();
    expect(VERTICALS.pcos).toBeDefined();
  });

  it("male patients see hair-loss, ed, pe, weight (not pcos)", () => {
    const visible = visibleFor("male").map((v) => v.id);
    expect(visible).toContain("hair-loss");
    expect(visible).toContain("ed");
    expect(visible).toContain("pe");
    expect(visible).toContain("weight");
    expect(visible).not.toContain("pcos");
  });

  it("female patients see hair-loss, weight, pcos (not ed, pe)", () => {
    const visible = visibleFor("female").map((v) => v.id);
    expect(visible).toContain("hair-loss");
    expect(visible).toContain("weight");
    expect(visible).toContain("pcos");
    expect(visible).not.toContain("ed");
    expect(visible).not.toContain("pe");
  });

  it("other sees neutral verticals by default", () => {
    const visible = visibleFor("other").map((v) => v.id);
    expect(visible).toContain("hair-loss");
    expect(visible).toContain("weight");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @onlyou/mobile test verticals`
Expected: module not found.

- [ ] **Step 3: Write the metadata**

Create `apps/mobile/src/fixtures/verticals.ts`:

```ts
import type { Gender, Vertical } from "./patient-states";

export interface VerticalInfo {
  id: Vertical;
  displayName: string;
  category: string;
  tagline: string;
  tintHex: string;
  requiresPhotos: boolean;
  availableFor: Array<Gender>;
  availableInPhase2: boolean;
  pricing: {
    monthlyPaise: number;
    quarterlyTotalPaise: number;
    sixMonthTotalPaise: number;
  };
}

export const VERTICALS: Record<Vertical, VerticalInfo> = {
  "hair-loss": {
    id: "hair-loss",
    displayName: "Hair Loss",
    category: "Hair & Scalp",
    tagline: "Finasteride, minoxidil, biotin — dermatologist-led.",
    tintHex: "#FAF7F2",
    requiresPhotos: true,
    availableFor: ["male", "female", "other"],
    availableInPhase2: true,
    pricing: {
      monthlyPaise: 99900,
      quarterlyTotalPaise: 249900,
      sixMonthTotalPaise: 449900,
    },
  },
  ed: {
    id: "ed",
    displayName: "ED",
    category: "Sexual Health",
    tagline: "Personalised ED care, fully private.",
    tintHex: "#F7F8FA",
    requiresPhotos: false,
    availableFor: ["male", "other"],
    availableInPhase2: true,
    pricing: {
      monthlyPaise: 149900,
      quarterlyTotalPaise: 389900,
      sixMonthTotalPaise: 699900,
    },
  },
  pe: {
    id: "pe",
    displayName: "PE",
    category: "Sexual Health",
    tagline: "Evidence-based premature ejaculation care.",
    tintHex: "#F7F8FA",
    requiresPhotos: false,
    availableFor: ["male", "other"],
    availableInPhase2: false,
    pricing: {
      monthlyPaise: 129900,
      quarterlyTotalPaise: 339900,
      sixMonthTotalPaise: 599900,
    },
  },
  weight: {
    id: "weight",
    displayName: "Weight",
    category: "Metabolic Health",
    tagline: "Personalised plans for sustainable weight care.",
    tintHex: "#F6FAF6",
    requiresPhotos: true,
    availableFor: ["male", "female", "other"],
    availableInPhase2: false,
    pricing: {
      monthlyPaise: 299900,
      quarterlyTotalPaise: 799900,
      sixMonthTotalPaise: 1499900,
    },
  },
  pcos: {
    id: "pcos",
    displayName: "PCOS",
    category: "Hormonal Health",
    tagline: "Cycle, insulin, hormones — curated by specialists.",
    tintHex: "#FAF6F8",
    requiresPhotos: false,
    availableFor: ["female", "other"],
    availableInPhase2: false,
    pricing: {
      monthlyPaise: 199900,
      quarterlyTotalPaise: 539900,
      sixMonthTotalPaise: 999900,
    },
  },
};

const NEUTRAL_FOR_OTHER: Vertical[] = ["hair-loss", "weight"];

export function visibleFor(gender: Gender): VerticalInfo[] {
  if (gender === "other") {
    return NEUTRAL_FOR_OTHER.map((id) => VERTICALS[id]);
  }
  return Object.values(VERTICALS).filter((v) =>
    v.availableFor.includes(gender),
  );
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @onlyou/mobile test verticals`
Expected: `PASS · 4 tests`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/fixtures/verticals.ts apps/mobile/__tests__/fixtures/verticals.test.ts
git commit -m "feat(phase-2c/2): 5-vertical metadata + gender-aware visibleFor() helper"
```

---

## Task 3 — Home state-aware components

**Files:**

- Create: `apps/mobile/src/components/home/UnderReviewCard.tsx`
- Create: `apps/mobile/src/components/home/PlanReadyCard.tsx`
- Create: `apps/mobile/src/components/home/ActiveTreatmentCard.tsx`
- Create: `apps/mobile/src/components/home/MedicationReminder.tsx`
- Create: `apps/mobile/src/components/home/DeliveryTrackingBanner.tsx`
- Create: `apps/mobile/__tests__/components/home-cards.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/components/home-cards.test.tsx`:

```tsx
import { render } from "@testing-library/react-native";

import { ActiveTreatmentCard } from "@/components/home/ActiveTreatmentCard";
import { DeliveryTrackingBanner } from "@/components/home/DeliveryTrackingBanner";
import { MedicationReminder } from "@/components/home/MedicationReminder";
import { PlanReadyCard } from "@/components/home/PlanReadyCard";
import { UnderReviewCard } from "@/components/home/UnderReviewCard";

describe("home cards", () => {
  it("UnderReviewCard shows the vertical + wait time", () => {
    const { getByText } = render(
      <UnderReviewCard vertical="pcos" hoursAgo={4} />,
    );
    expect(getByText(/Under Review/i)).toBeTruthy();
    expect(getByText(/PCOS/i)).toBeTruthy();
  });

  it("PlanReadyCard shows doctor name + CTA", () => {
    const { getByText } = render(
      <PlanReadyCard
        doctorName="Dr. Priya Sharma"
        vertical="hair-loss"
        onPress={() => {}}
      />,
    );
    expect(getByText("Dr. Priya Sharma")).toBeTruthy();
    expect(getByText(/View plan/i)).toBeTruthy();
  });

  it("ActiveTreatmentCard shows the day count", () => {
    const { getByText } = render(
      <ActiveTreatmentCard vertical="pcos" dayCount={14} />,
    );
    expect(getByText(/Day 14/)).toBeTruthy();
  });

  it("MedicationReminder shows name + schedule", () => {
    const { getByText } = render(
      <MedicationReminder
        name="Metformin 500mg"
        schedule="Twice daily"
        done={false}
      />,
    );
    expect(getByText("Metformin 500mg")).toBeTruthy();
    expect(getByText(/Twice daily/)).toBeTruthy();
  });

  it("DeliveryTrackingBanner shows status", () => {
    const { getByText } = render(
      <DeliveryTrackingBanner status="out-for-delivery" onPress={() => {}} />,
    );
    expect(getByText(/Out for delivery/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @onlyou/mobile test home-cards`
Expected: modules not found.

- [ ] **Step 3: Write `UnderReviewCard.tsx`**

```tsx
import { Text, View } from "react-native";

import { VERTICALS } from "../../fixtures/verticals";
import type { Vertical } from "../../fixtures/patient-states";
import { colors } from "../../theme/colors";

interface Props {
  vertical: Vertical;
  hoursAgo: number;
}

export function UnderReviewCard({ vertical, hoursAgo }: Props) {
  const info = VERTICALS[vertical];
  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: colors.accent,
        backgroundColor: colors.accentLight,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: colors.accent,
          fontWeight: "800",
          marginBottom: 6,
        }}
      >
        Under Review
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: 4,
        }}
      >
        A doctor is reviewing your {info.displayName} case
      </Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
        Submitted {hoursAgo}h ago · SLA 24h
      </Text>
    </View>
  );
}
```

- [ ] **Step 4: Write `PlanReadyCard.tsx`**

```tsx
import { Pressable, Text, View } from "react-native";

import { VERTICALS } from "../../fixtures/verticals";
import type { Vertical } from "../../fixtures/patient-states";
import { colors } from "../../theme/colors";

interface Props {
  vertical: Vertical;
  doctorName: string;
  onPress: () => void;
}

export function PlanReadyCard({ vertical, doctorName, onPress }: Props) {
  const info = VERTICALS[vertical];
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1.5,
        borderColor: colors.accentWarm,
        backgroundColor: colors.warmBg ?? "#FDF9F3",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: colors.accentWarm,
          fontWeight: "800",
          marginBottom: 6,
        }}
      >
        Treatment Plan Ready
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: 2,
        }}
      >
        {doctorName} reviewed your case
      </Text>
      <Text
        style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}
      >
        {info.displayName} · tap to view your personalised plan
      </Text>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "800",
          color: colors.accentWarm,
          letterSpacing: 0.5,
        }}
      >
        View plan →
      </Text>
    </Pressable>
  );
}
```

Note: `colors.warmBg` may not exist as a token. If the ESLint rule fires on `'#FDF9F3'`, add `warmBg: '#FDF9F3'` to `packages/core/src/tokens/colors.ts`. This is an allowed token extension.

- [ ] **Step 5: Write `ActiveTreatmentCard.tsx`**

```tsx
import { Text, View } from "react-native";

import { VERTICALS } from "../../fixtures/verticals";
import type { Vertical } from "../../fixtures/patient-states";
import { colors } from "../../theme/colors";

interface Props {
  vertical: Vertical;
  dayCount: number;
}

export function ActiveTreatmentCard({ vertical, dayCount }: Props) {
  const info = VERTICALS[vertical];
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: colors.textTertiary,
          fontWeight: "800",
          marginBottom: 6,
        }}
      >
        Treatment Active
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: 2,
        }}
      >
        Day {dayCount} — {info.displayName}
      </Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
        Your subscription is running. Keep logging your progress.
      </Text>
    </View>
  );
}
```

- [ ] **Step 6: Write `MedicationReminder.tsx`**

```tsx
import { Text, View } from "react-native";

import { colors } from "../../theme/colors";

interface Props {
  name: string;
  schedule: string;
  done: boolean;
}

export function MedicationReminder({ name, schedule, done }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: done ? colors.textPrimary : colors.border,
          backgroundColor: done ? colors.textPrimary : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done ? (
          <Text style={{ color: colors.white, fontSize: 11 }}>✓</Text>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary }}
        >
          {name}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textTertiary }}>
          {schedule}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 7: Write `DeliveryTrackingBanner.tsx`**

```tsx
import { Pressable, Text, View } from "react-native";

import type { OrderStatus } from "../../fixtures/patient-states";
import { colors } from "../../theme/colors";

interface Props {
  status: OrderStatus;
  onPress: () => void;
}

const LABELS: Record<OrderStatus, string> = {
  preparing: "Preparing your order",
  dispatched: "Dispatched",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function DeliveryTrackingBanner({ status, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: colors.textTertiary,
          fontWeight: "800",
          marginBottom: 6,
        }}
      >
        Delivery
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: 2,
        }}
      >
        {LABELS[status]}
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: colors.accent,
          letterSpacing: 0.3,
        }}
      >
        Track order →
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 8: Run — expect PASS**

Run: `pnpm --filter @onlyou/mobile test home-cards`
Expected: `PASS · 5 tests`.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/src/components/home apps/mobile/__tests__/components/home-cards.test.tsx
git commit -m "feat(phase-2c/3): home tab state-aware card components"
```

---

## Task 4 — Home tab index with 4-state rendering

**Files:**

- Modify: `apps/mobile/app/(tabs)/home/index.tsx`
- Create: `apps/mobile/__tests__/screens/home-index.test.tsx`

**CRO skill:** Invoke `onboarding-cro` for the new-user empty state before writing this task.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/screens/home-index.test.tsx`:

```tsx
import { render } from "@testing-library/react-native";

import HomeIndex from "@/app/(tabs)/home/index";
import { TestProvider } from "@/test-utils";

describe("Home tab — 4 states", () => {
  it("new user shows the empty-state CTA", () => {
    const { getByText } = render(
      <TestProvider scenario="new">
        <HomeIndex />
      </TestProvider>,
    );
    expect(getByText(/Start your first assessment/i)).toBeTruthy();
  });

  it("reviewing user shows UnderReviewCard", () => {
    const { getByText } = render(
      <TestProvider scenario="reviewing">
        <HomeIndex />
      </TestProvider>,
    );
    expect(getByText(/Under Review/i)).toBeTruthy();
  });

  it("ready user shows PlanReadyCard with doctor name", () => {
    const { getByText } = render(
      <TestProvider scenario="ready">
        <HomeIndex />
      </TestProvider>,
    );
    expect(getByText(/Dr. Priya Sharma/)).toBeTruthy();
  });

  it("active user shows ActiveTreatmentCard + medication reminders", () => {
    const { getByText } = render(
      <TestProvider scenario="active">
        <HomeIndex />
      </TestProvider>,
    );
    expect(getByText(/Day 14/)).toBeTruthy();
    expect(getByText("Metformin 500mg")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @onlyou/mobile test home-index`
Expected: FAIL — current home/index.tsx is a PlaceholderScreen.

- [ ] **Step 3: Overwrite `apps/mobile/app/(tabs)/home/index.tsx`**

```tsx
import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { ActiveTreatmentCard } from "@/components/home/ActiveTreatmentCard";
import { DeliveryTrackingBanner } from "@/components/home/DeliveryTrackingBanner";
import { MedicationReminder } from "@/components/home/MedicationReminder";
import { PlanReadyCard } from "@/components/home/PlanReadyCard";
import { UnderReviewCard } from "@/components/home/UnderReviewCard";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function HomeIndex() {
  const user = usePatientState();

  const firstName = user.name.split(" ")[0];
  const consultation = user.consultations[0];
  const prescription = user.prescriptions[0];
  const delivery = user.deliveries[0];
  const activeSub = user.subscriptions[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          lineHeight: 32,
          letterSpacing: -0.6,
          marginTop: 8,
          marginBottom: 4,
        }}
      >
        {greetingFor(user.state)}, {firstName}.
      </Text>
      <Text
        style={{ fontSize: 13, color: colors.textTertiary, marginBottom: 20 }}
      >
        {subtitleFor(
          user.state,
          activeSub?.vertical,
          dayCount(activeSub?.startedAt),
        )}
      </Text>

      {user.state === "new" && (
        <View
          style={{
            alignItems: "center",
            paddingVertical: 40,
          }}
        >
          <Text style={{ fontSize: 48, color: colors.accent, marginBottom: 8 }}>
            ◌
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            No treatments yet
          </Text>
          <View style={{ width: "100%", gap: 10 }}>
            <PremiumButton
              label="Start your first assessment"
              onPress={() => router.push("/(tabs)/explore")}
            />
            <PremiumButton
              label="How it works"
              variant="ghost"
              onPress={() => router.push("/(tabs)/explore")}
            />
          </View>
        </View>
      )}

      {user.state === "reviewing" && consultation && (
        <UnderReviewCard
          vertical={consultation.vertical}
          hoursAgo={Math.max(
            1,
            Math.floor((Date.now() - consultation.submittedAt) / 3600000),
          )}
        />
      )}

      {user.state === "ready" && consultation && prescription && (
        <>
          <PlanReadyCard
            vertical={consultation.vertical}
            doctorName={prescription.doctorName}
            onPress={() => router.push("/treatment/plan-ready")}
          />
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.white,
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: colors.textTertiary,
                fontWeight: "800",
                marginBottom: 6,
              }}
            >
              Plan valid
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              28 days remaining. After 30 days the plan expires and a new review
              is required.
            </Text>
          </View>
        </>
      )}

      {user.state === "active" && activeSub && consultation && prescription && (
        <>
          <ActiveTreatmentCard
            vertical={activeSub.vertical}
            dayCount={dayCount(activeSub.startedAt)}
          />
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.white,
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: colors.textTertiary,
                fontWeight: "800",
                marginBottom: 10,
              }}
            >
              Today&apos;s medications
            </Text>
            {prescription.items.map((item, idx) => (
              <MedicationReminder
                key={item.name}
                name={item.name}
                schedule={item.schedule}
                done={idx === 0}
              />
            ))}
          </View>
          {delivery && (
            <DeliveryTrackingBanner
              status={delivery.status}
              onPress={() =>
                router.push(`/(tabs)/home/tracking/${delivery.orderId}`)
              }
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

function greetingFor(state: string): string {
  if (state === "new") return "Welcome";
  if (state === "reviewing") return "Thanks for submitting";
  if (state === "ready") return "Great news";
  return "Good morning";
}

function subtitleFor(
  state: string,
  vertical: string | undefined,
  day: number,
): string {
  if (state === "new") return "Private care, on your terms.";
  if (state === "reviewing") return "Your case is in review.";
  if (state === "ready") return "Your plan is ready.";
  return `Day ${day} · ${vertical ?? "—"}`;
}

function dayCount(startedAt: number | undefined): number {
  if (!startedAt) return 0;
  return Math.max(1, Math.floor((Date.now() - startedAt) / 86400000));
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @onlyou/mobile test home-index`
Expected: `PASS · 4 tests`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(tabs\)/home/index.tsx apps/mobile/__tests__/screens/home-index.test.tsx
git commit -m "feat(phase-2c/4): home tab renders 4 patient states (onboarding-cro applied)"
```

---

## Task 5 — Home tracking detail

**Files:**

- Create: `apps/mobile/app/(tabs)/home/tracking/[id].tsx`

- [ ] **Step 1: Write the screen (no test — displays fixture delivery stepper)**

Create `apps/mobile/app/(tabs)/home/tracking/[id].tsx`:

```tsx
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function TrackingDetail() {
  const user = usePatientState();
  const { id } = useLocalSearchParams<{ id: string }>();

  const delivery = user.deliveries.find((d) => d.orderId === id);
  const order = user.orders.find((o) => o.id === id);

  if (!delivery || !order) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}
      >
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
          Order not found.
        </Text>
      </View>
    );
  }

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
          marginBottom: 4,
        }}
      >
        Delivery tracking
      </Text>
      <Text
        style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 24 }}
      >
        Order {order.id} · {order.itemCount} items · ₹
        {(order.totalPaise / 100).toFixed(0)}
      </Text>

      {delivery.progress.map((step) => (
        <View
          key={step.label}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 18,
          }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              borderWidth: 2,
              borderColor: step.done ? colors.accent : colors.border,
              backgroundColor: step.done ? colors.accent : colors.white,
              marginRight: 14,
              marginTop: 2,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: step.done ? colors.textPrimary : colors.textTertiary,
              }}
            >
              {step.label}
            </Text>
            {step.done && step.at > 0 ? (
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textTertiary,
                  marginTop: 2,
                }}
              >
                {new Date(step.at).toLocaleDateString("en-IN")}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @onlyou/mobile typecheck
git add apps/mobile/app/\(tabs\)/home/tracking
git commit -m "feat(phase-2c/5): home tracking detail stepper"
```

---

## Task 6 — Explore grid with gender filter + ConditionCard

**Files:**

- Create: `apps/mobile/src/components/explore/ConditionCard.tsx`
- Modify: `apps/mobile/app/(tabs)/explore/index.tsx`
- Create: `apps/mobile/__tests__/screens/explore-index.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/__tests__/screens/explore-index.test.tsx`:

```tsx
import { render } from "@testing-library/react-native";

import ExploreIndex from "@/app/(tabs)/explore/index";
import { TestProvider } from "@/test-utils";

describe("Explore tab — gender filter", () => {
  it("male user sees Hair Loss, ED, PE, Weight (no PCOS)", () => {
    const { queryByText } = render(
      <TestProvider scenario="new">
        <ExploreIndex />
      </TestProvider>,
    );
    expect(queryByText("Hair Loss")).toBeTruthy();
    expect(queryByText("ED")).toBeTruthy();
    expect(queryByText("PE")).toBeTruthy();
    expect(queryByText("Weight")).toBeTruthy();
    expect(queryByText("PCOS")).toBeNull();
  });

  it("female user sees Hair Loss, Weight, PCOS (no ED, PE)", () => {
    const { queryByText } = render(
      <TestProvider scenario="active">
        <ExploreIndex />
      </TestProvider>,
    );
    expect(queryByText("Hair Loss")).toBeTruthy();
    expect(queryByText("Weight")).toBeTruthy();
    expect(queryByText("PCOS")).toBeTruthy();
    expect(queryByText("ED")).toBeNull();
    expect(queryByText("PE")).toBeNull();
  });
});
```

- [ ] **Step 2: Write `ConditionCard.tsx`**

Create `apps/mobile/src/components/explore/ConditionCard.tsx`:

```tsx
import { Pressable, Text, View } from "react-native";

import type { VerticalInfo } from "../../fixtures/verticals";
import { colors } from "../../theme/colors";

interface Props {
  info: VerticalInfo;
  isActive: boolean;
  onPress: () => void;
}

export function ConditionCard({ info, isActive, onPress }: Props) {
  const available = info.availableInPhase2;

  return (
    <Pressable
      onPress={available ? onPress : undefined}
      style={{
        flex: 1,
        minHeight: 120,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: isActive ? colors.textPrimary : colors.border,
        backgroundColor: info.tintHex,
        padding: 14,
        justifyContent: "space-between",
        opacity: available ? 1 : 0.55,
      }}
    >
      <View>
        <Text
          style={{ fontSize: 14, fontWeight: "800", color: colors.textPrimary }}
        >
          {info.displayName}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: colors.textTertiary,
            marginTop: 2,
            fontWeight: "600",
          }}
        >
          {isActive ? "Active" : available ? info.category : "Coming soon"}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 10,
          color: colors.textTertiary,
          fontWeight: "700",
          letterSpacing: 0.3,
        }}
      >
        {available ? "Start →" : "—"}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 3: Overwrite `apps/mobile/app/(tabs)/explore/index.tsx`**

```tsx
import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { ConditionCard } from "@/components/explore/ConditionCard";
import { visibleFor } from "@/fixtures/verticals";
import { useGender } from "@/hooks/use-gender";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function ExploreIndex() {
  const gender = useGender();
  const user = usePatientState();
  const verticals = visibleFor(gender);
  const activeVerticals = new Set(user.subscriptions.map((s) => s.vertical));

  // Pair up verticals 2 per row
  const rows: (typeof verticals)[] = [];
  for (let i = 0; i < verticals.length; i += 2) {
    rows.push(verticals.slice(i, i + 2));
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 34,
          color: colors.textPrimary,
          lineHeight: 36,
          letterSpacing: -0.8,
          marginBottom: 6,
        }}
      >
        Explore care
      </Text>
      <Text
        style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20 }}
      >
        Private specialists. Free first review.
      </Text>

      {rows.map((row, rowIdx) => (
        <View
          key={rowIdx}
          style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}
        >
          {row.map((info) => (
            <ConditionCard
              key={info.id}
              info={info}
              isActive={activeVerticals.has(info.id)}
              onPress={() => router.push(`/(tabs)/explore/${info.id}`)}
            />
          ))}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm --filter @onlyou/mobile test explore-index`
Expected: `PASS · 2 tests`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/explore apps/mobile/app/\(tabs\)/explore/index.tsx apps/mobile/__tests__/screens/explore-index.test.tsx
git commit -m "feat(phase-2c/6): explore grid with gender filter + ConditionCard"
```

---

## Task 7 — Condition detail `[condition].tsx`

**Files:**

- Create: `apps/mobile/app/(tabs)/explore/[condition].tsx`

- [ ] **Step 1: Write the screen**

Create `apps/mobile/app/(tabs)/explore/[condition].tsx`:

```tsx
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { VERTICALS } from "@/fixtures/verticals";
import type { Vertical } from "@/fixtures/patient-states";
import { colors } from "@/theme/colors";

export default function ConditionDetail() {
  const { condition } = useLocalSearchParams<{ condition: Vertical }>();
  const info = VERTICALS[condition];

  if (!info) {
    return (
      <View
        style={{ flex: 1, padding: 24, backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.textSecondary }}>Unknown condition.</Text>
      </View>
    );
  }

  if (!info.availableInPhase2) {
    return (
      <View
        style={{
          flex: 1,
          padding: 24,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            width: 44,
            height: 44,
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
        </Pressable>
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 32,
            color: colors.textPrimary,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          {info.displayName}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: colors.accent,
            fontWeight: "800",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Coming soon
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
            maxWidth: 280,
          }}
        >
          {info.displayName} launches in a later phase. We&apos;ll notify you
          when it&apos;s available.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>

      <Text
        style={{
          fontSize: 10,
          color: colors.accent,
          fontWeight: "800",
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginTop: 24,
          marginBottom: 8,
        }}
      >
        {info.category}
      </Text>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 36,
          color: colors.textPrimary,
          lineHeight: 40,
          letterSpacing: -0.8,
          marginBottom: 12,
        }}
      >
        {info.displayName}
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: colors.textSecondary,
          lineHeight: 22,
          marginBottom: 32,
        }}
      >
        {info.tagline}
      </Text>

      <SectionHeader>How it works</SectionHeader>
      <Step
        number={1}
        title="Free review"
        body="Answer a short assessment. A specialist reviews within 24 hours."
      />
      <Step
        number={2}
        title="Your plan"
        body="If treatment makes sense, your doctor writes a personalised plan."
      />
      <Step
        number={3}
        title="Pay & ship"
        body="Only when you like the plan. Delivered in 2–4 days."
      />

      <SectionHeader>Pricing</SectionHeader>
      <PriceRow
        label="Monthly"
        value={info.pricing.monthlyPaise}
        suffix="/month"
      />
      <PriceRow
        label="Quarterly"
        value={Math.round(info.pricing.quarterlyTotalPaise / 3)}
        suffix="/month (billed quarterly)"
      />
      <PriceRow
        label="6-month"
        value={Math.round(info.pricing.sixMonthTotalPaise / 6)}
        suffix="/month (best value)"
      />

      <SectionHeader>FAQ</SectionHeader>
      <Faq
        q="Is my consultation free?"
        a="Yes. A doctor reviews your case for free. You only pay if you subscribe after seeing your plan."
      />
      <Faq
        q="How does shipping work?"
        a="Standard delivery in 2–4 business days across metro cities."
      />
      <Faq
        q="Can I cancel anytime?"
        a="Yes. Cancel from your Subscriptions screen any time before the next billing date."
      />

      <View style={{ marginTop: 24 }}>
        <PremiumButton
          variant="warm"
          label="Start your free review"
          onPress={() => router.push(`/questionnaire/${info.id}`)}
        />
      </View>
    </ScrollView>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 10,
        color: colors.textTertiary,
        fontWeight: "800",
        letterSpacing: 1.5,
        textTransform: "uppercase",
        marginTop: 32,
        marginBottom: 12,
      }}
    >
      {children}
    </Text>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: number;
  title: string;
  body: string;
}) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 14 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          backgroundColor: colors.textPrimary,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>
          {number}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: colors.textPrimary,
            marginBottom: 2,
          }}
        >
          {title}
        </Text>
        <Text
          style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}
        >
          {body}
        </Text>
      </View>
    </View>
  );
}

function PriceRow({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}
    >
      <Text
        style={{ fontSize: 13, fontWeight: "700", color: colors.textPrimary }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
        ₹{(value / 100).toFixed(0)}
        <Text style={{ color: colors.textTertiary }}>{suffix}</Text>
      </Text>
    </View>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <View
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: 4,
        }}
      >
        {q}
      </Text>
      <Text
        style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}
      >
        {a}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @onlyou/mobile typecheck
git add apps/mobile/app/\(tabs\)/explore/\[condition\].tsx
git commit -m "feat(phase-2c/7): condition detail — real for Hair Loss/ED, teaser for PE/Weight/PCOS"
```

---

## Task 8 — Stub questionnaire data

**Files:**

- Create: `apps/mobile/src/data/questionnaires/hair-loss.ts`
- Create: `apps/mobile/src/data/questionnaires/ed.ts`
- Create: `apps/mobile/src/data/questionnaires/index.ts`

- [ ] **Step 1: Write the types + question banks**

Create `apps/mobile/src/data/questionnaires/index.ts`:

```ts
import type { Vertical } from "../../fixtures/patient-states";

import { edQuestions } from "./ed";
import { hairLossQuestions } from "./hair-loss";

export type QuestionType = "single" | "multi" | "text" | "photo";

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  helper?: string;
  options?: Array<{ value: string; label: string }>;
  required: boolean;
}

export const QUESTION_BANKS: Partial<Record<Vertical, Question[]>> = {
  "hair-loss": hairLossQuestions,
  ed: edQuestions,
};
```

Create `apps/mobile/src/data/questionnaires/hair-loss.ts`:

```ts
import type { Question } from "./index";

export const hairLossQuestions: Question[] = [
  {
    id: "gender",
    type: "single",
    title: "How do you identify?",
    helper: "Some treatments are gender-specific.",
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "other", label: "Other / prefer not to say" },
    ],
    required: true,
  },
  {
    id: "duration",
    type: "single",
    title: "How long has your hair been thinning?",
    options: [
      { value: "lt-6", label: "Less than 6 months" },
      { value: "6-12", label: "6–12 months" },
      { value: "1-3", label: "1–3 years" },
      { value: "3+", label: "More than 3 years" },
    ],
    required: true,
  },
  {
    id: "areas",
    type: "multi",
    title: "Where are you noticing the most thinning?",
    helper: "Select all that apply.",
    options: [
      { value: "temples", label: "Temples / receding hairline" },
      { value: "crown", label: "Crown" },
      { value: "top", label: "Top of scalp" },
      { value: "all-over", label: "All over" },
    ],
    required: true,
  },
  {
    id: "photos",
    type: "photo",
    title: "Upload 4 photos of your scalp",
    helper: "Top of head · Hairline · Crown · Problem areas",
    required: true,
  },
];
```

Create `apps/mobile/src/data/questionnaires/ed.ts`:

```ts
import type { Question } from "./index";

export const edQuestions: Question[] = [
  {
    id: "age-gate",
    type: "single",
    title: "Are you 18 or older?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    required: true,
  },
  {
    id: "iief-1",
    type: "single",
    title: "How often were you able to maintain an erection?",
    helper: "Over the last 4 weeks.",
    options: [
      { value: "always", label: "Almost always or always" },
      { value: "most", label: "Most times" },
      { value: "sometimes", label: "Sometimes" },
      { value: "rarely", label: "A few times or never" },
    ],
    required: true,
  },
  {
    id: "medications",
    type: "text",
    title: "Any medications you currently take?",
    helper: "Include dosage if you remember.",
    required: false,
  },
  {
    id: "health",
    type: "multi",
    title: "Do any of these apply to you?",
    options: [
      { value: "diabetes", label: "Diabetes" },
      { value: "hbp", label: "High blood pressure" },
      { value: "heart", label: "Heart condition" },
      { value: "none", label: "None of the above" },
    ],
    required: true,
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/data/questionnaires
git commit -m "feat(phase-2c/8): stub questionnaire banks for hair-loss + ed"
```

---

## Task 9 — Questionnaire shell components (progress, selection, shell)

**Files:**

- Create: `apps/mobile/src/components/questionnaire/ProgressCounter.tsx`
- Create: `apps/mobile/src/components/questionnaire/SelectionCard.tsx`
- Create: `apps/mobile/src/components/questionnaire/QuestionShell.tsx`

- [ ] **Step 1: Write `ProgressCounter.tsx`**

```tsx
import { Text, View } from "react-native";

import { colors } from "../../theme/colors";

interface Props {
  current: number;
  total: number;
}

export function ProgressCounter({ current, total }: Props) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          fontWeight: "700",
          color: colors.textTertiary,
        }}
      >
        {current} of {total}
      </Text>
      <View
        style={{
          height: 3,
          backgroundColor: colors.borderLight,
          borderRadius: 999,
          marginTop: 8,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${(current / total) * 100}%`,
            height: "100%",
            backgroundColor: colors.accent,
          }}
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Write `SelectionCard.tsx`**

```tsx
import { Pressable, Text, View } from "react-native";

import { colors } from "../../theme/colors";

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
}

export function SelectionCard({
  label,
  selected,
  onPress,
  multi = false,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 56,
        borderWidth: 1.5,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accentLight : colors.white,
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: "600",
          color: colors.textPrimary,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          width: multi ? 22 : 22,
          height: 22,
          borderRadius: multi ? 6 : 999,
          borderWidth: 1.5,
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? (
          <Text
            style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}
          >
            ✓
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 3: Write `QuestionShell.tsx`**

```tsx
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "../ui/PremiumButton";
import { colors } from "../../theme/colors";

import { ProgressCounter } from "./ProgressCounter";

interface Props {
  current: number;
  total: number;
  title: string;
  helper?: string;
  canProceed: boolean;
  onNext: () => void;
  children: React.ReactNode;
}

export function QuestionShell({
  current,
  total,
  title,
  helper,
  canProceed,
  onNext,
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  function onExit() {
    Alert.alert(
      "Leave this assessment?",
      "Your answers will be saved for next time.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => router.dismissAll(),
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
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
            fontSize: 13,
            fontWeight: "700",
            color: colors.textPrimary,
          }}
        >
          Consultation
        </Text>
        <Pressable
          onPress={onExit}
          style={{
            width: 44,
            height: 44,
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 18, color: colors.textPrimary }}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
      >
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 18,
            color: colors.textPrimary,
            marginTop: 8,
            marginBottom: 20,
          }}
        >
          onlyou
        </Text>

        <ProgressCounter current={current} total={total} />

        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 24,
            color: colors.textPrimary,
            lineHeight: 28,
            letterSpacing: -0.4,
            marginBottom: helper ? 6 : 24,
          }}
        >
          {title}
        </Text>
        {helper ? (
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              marginBottom: 24,
              lineHeight: 18,
            }}
          >
            {helper}
          </Text>
        ) : null}

        {children}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.background,
        }}
      >
        <PremiumButton
          variant="warm"
          label="Next"
          disabled={!canProceed}
          onPress={onNext}
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter @onlyou/mobile typecheck
git add apps/mobile/src/components/questionnaire
git commit -m "feat(phase-2c/9): questionnaire shell components — ProgressCounter/SelectionCard/QuestionShell"
```

---

## Task 10 — Questionnaire stack layout

**Files:**

- Create: `apps/mobile/app/questionnaire/_layout.tsx`

- [ ] **Step 1: Write**

```tsx
import { Stack } from "expo-router";

export default function QuestionnaireLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: "modal" }} />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/questionnaire/_layout.tsx
git commit -m "feat(phase-2c/10): questionnaire modal stack layout"
```

---

## Task 11 — Questionnaire entry screen

**Files:**

- Create: `apps/mobile/app/questionnaire/[condition]/index.tsx`

**CRO skills:** Invoke `onboarding-cro` + `app-onboarding-questionnaire` before writing this screen.

- [ ] **Step 1: Write the screen**

```tsx
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { QUESTION_BANKS } from "@/data/questionnaires";
import { VERTICALS } from "@/fixtures/verticals";
import type { Vertical } from "@/fixtures/patient-states";
import { colors } from "@/theme/colors";

export default function QuestionnaireEntry() {
  const insets = useSafeAreaInsets();
  const { condition } = useLocalSearchParams<{ condition: Vertical }>();
  const info = VERTICALS[condition];
  const questions = QUESTION_BANKS[condition] ?? [];

  const start = () => {
    const firstId = questions[0]?.id;
    if (!firstId) return;
    router.push(`/questionnaire/${condition}/${firstId}`);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          color: colors.accent,
          fontWeight: "800",
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {info?.category ?? "Assessment"}
      </Text>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 32,
          color: colors.textPrimary,
          lineHeight: 36,
          letterSpacing: -0.6,
          marginBottom: 16,
        }}
      >
        Your {info?.displayName ?? "care"} assessment
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          marginBottom: 8,
          lineHeight: 20,
        }}
      >
        {questions.length} questions · about 3 minutes. A specialist reviews
        within 24 hours. Completely free.
      </Text>
      <Text
        style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 32 }}
      >
        You can stop any time and resume later.
      </Text>

      <View style={{ flex: 1 }} />

      <PremiumButton variant="warm" label="Start assessment" onPress={start} />
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/questionnaire/\[condition\]/index.tsx
git commit -m "feat(phase-2c/11): questionnaire entry screen (onboarding-cro + app-onboarding-questionnaire)"
```

---

## Task 12 — Per-question screen `[qid].tsx`

**Files:**

- Create: `apps/mobile/app/questionnaire/[condition]/[qid].tsx`

**CRO skill:** `app-onboarding-questionnaire`.

- [ ] **Step 1: Write the screen**

```tsx
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { PremiumInput } from "@/components/ui/PremiumInput";
import { QuestionShell } from "@/components/questionnaire/QuestionShell";
import { SelectionCard } from "@/components/questionnaire/SelectionCard";
import { QUESTION_BANKS } from "@/data/questionnaires";
import type { Vertical } from "@/fixtures/patient-states";
import { colors } from "@/theme/colors";

export default function QuestionScreen() {
  const { condition, qid } = useLocalSearchParams<{
    condition: Vertical;
    qid: string;
  }>();
  const questions = QUESTION_BANKS[condition] ?? [];

  const index = useMemo(
    () => questions.findIndex((q) => q.id === qid),
    [questions, qid],
  );
  const question = questions[index];

  const [single, setSingle] = useState<string | undefined>();
  const [multi, setMulti] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");

  if (!question) {
    return (
      <View style={{ flex: 1, padding: 24 }}>
        <Text style={{ color: colors.textSecondary }}>Question not found.</Text>
      </View>
    );
  }

  const canProceed =
    question.type === "single"
      ? !!single
      : question.type === "multi"
        ? multi.size > 0
        : question.type === "text"
          ? !question.required || text.trim().length > 0
          : question.type === "photo"
            ? true // photo step is handled in the photo-upload stack
            : false;

  function onNext() {
    const nextQ = questions[index + 1];
    if (question.type === "photo") {
      router.push(`/photo-upload/${condition}`);
      return;
    }
    if (nextQ) {
      router.push(`/questionnaire/${condition}/${nextQ.id}`);
    } else {
      router.push(`/questionnaire/${condition}/review`);
    }
  }

  return (
    <QuestionShell
      current={index + 1}
      total={questions.length}
      title={question.title}
      helper={question.helper}
      canProceed={canProceed}
      onNext={onNext}
    >
      {question.type === "single" && (
        <View>
          {question.options?.map((opt) => (
            <SelectionCard
              key={opt.value}
              label={opt.label}
              selected={single === opt.value}
              onPress={() => setSingle(opt.value)}
            />
          ))}
        </View>
      )}

      {question.type === "multi" && (
        <View>
          {question.options?.map((opt) => (
            <SelectionCard
              key={opt.value}
              multi
              label={opt.label}
              selected={multi.has(opt.value)}
              onPress={() => {
                const next = new Set(multi);
                if (next.has(opt.value)) next.delete(opt.value);
                else next.add(opt.value);
                setMulti(next);
              }}
            />
          ))}
        </View>
      )}

      {question.type === "text" && (
        <PremiumInput
          label={question.title}
          value={text}
          onChangeText={setText}
        />
      )}

      {question.type === "photo" && (
        <Text
          style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}
        >
          The next screen opens the camera. Tap Next to continue.
        </Text>
      )}
    </QuestionShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/questionnaire/\[condition\]/\[qid\].tsx
git commit -m "feat(phase-2c/12): per-question screen (app-onboarding-questionnaire)"
```

---

## Task 13 — Questionnaire review screen

**Files:**

- Create: `apps/mobile/app/questionnaire/[condition]/review.tsx`

- [ ] **Step 1: Write**

```tsx
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { QUESTION_BANKS } from "@/data/questionnaires";
import type { Vertical } from "@/fixtures/patient-states";
import { colors } from "@/theme/colors";

export default function QuestionnaireReview() {
  const insets = useSafeAreaInsets();
  const { condition } = useLocalSearchParams<{ condition: Vertical }>();
  const questions = QUESTION_BANKS[condition] ?? [];

  function onSubmit() {
    router.dismissAll();
    router.push("/treatment/confirmation");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          marginBottom: 8,
        }}
      >
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
            fontSize: 28,
            color: colors.textPrimary,
            marginBottom: 4,
            letterSpacing: -0.6,
          }}
        >
          Review your answers
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.textSecondary,
            marginBottom: 24,
          }}
        >
          {questions.length} questions answered. Tap Submit when you&apos;re
          ready — our doctor will review within 24 hours.
        </Text>

        {questions.map((q) => (
          <View
            key={q.id}
            style={{
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderLight,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: colors.textTertiary,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              {q.title}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textPrimary }}>
              {/* Real answer values aren't persisted across screens in Phase 2 shell.
                 Plan 2C shows the question label only — real answers flow in Phase 3. */}
              —
            </Text>
          </View>
        ))}
      </ScrollView>

      <View
        style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
      >
        <PremiumButton
          variant="warm"
          label="Submit assessment"
          onPress={onSubmit}
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/questionnaire/\[condition\]/review.tsx
git commit -m "feat(phase-2c/13): questionnaire review screen"
```

---

## Task 14 — Photo upload stack (container + camera overlay)

**Files:**

- Create: `apps/mobile/app/photo-upload/_layout.tsx`
- Create: `apps/mobile/app/photo-upload/[condition].tsx`
- Create: `apps/mobile/app/photo-upload/camera.tsx`

- [ ] **Step 1: Layout**

Create `apps/mobile/app/photo-upload/_layout.tsx`:

```tsx
import { Stack } from "expo-router";

export default function PhotoUploadLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: "modal" }} />
  );
}
```

- [ ] **Step 2: Upload container**

Create `apps/mobile/app/photo-upload/[condition].tsx`:

```tsx
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import type { Vertical } from "@/fixtures/patient-states";
import { colors } from "@/theme/colors";

const PHOTOS_BY_CONDITION: Partial<Record<Vertical, string[]>> = {
  "hair-loss": ["Top of head", "Hairline", "Crown", "Problem areas"],
  weight: ["Full body front", "Full body side"],
};

export default function PhotoUploadContainer() {
  const insets = useSafeAreaInsets();
  const { condition } = useLocalSearchParams<{ condition: Vertical }>();
  const shots = PHOTOS_BY_CONDITION[condition] ?? [];
  const [captured, setCaptured] = useState<Record<string, boolean>>({});

  const allCaptured = shots.every((s) => captured[s]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 16,
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
          fontSize: 28,
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 4,
        }}
      >
        Photos for your review
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: colors.textSecondary,
          marginBottom: 24,
          lineHeight: 19,
        }}
      >
        Good lighting, no filters. These help your doctor make an accurate
        diagnosis.
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {shots.map((shot) => (
          <Pressable
            key={shot}
            onPress={() => {
              setCaptured({ ...captured, [shot]: true });
              router.push("/photo-upload/camera");
            }}
            style={{
              width: "48%",
              aspectRatio: 1,
              borderRadius: 14,
              backgroundColor: captured[shot]
                ? colors.accentLight
                : colors.white,
              borderWidth: 1.5,
              borderColor: captured[shot] ? colors.accent : colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 28, marginBottom: 4 }}>
              {captured[shot] ? "✓" : "📷"}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.textPrimary,
              }}
            >
              {shot}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <PremiumButton
        variant="warm"
        label="Done"
        disabled={!allCaptured}
        onPress={() => router.back()}
      />
    </View>
  );
}
```

- [ ] **Step 3: Camera overlay stub**

Create `apps/mobile/app/photo-upload/camera.tsx`:

```tsx
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { colors } from "@/theme/colors";

/**
 * Phase 2 shell camera — simulated. Plan 3 wires expo-camera. For now
 * we render a dark screen, a framing guide, and a "capture" button that
 * fakes a 1s flash and pops back.
 */
export default function CameraScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.textPrimary }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 24 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 44, height: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 24, color: colors.white }}>‹</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View
          style={{
            width: 260,
            height: 260,
            borderWidth: 2,
            borderColor: colors.white,
            borderRadius: 16,
          }}
        />
        <Text style={{ fontSize: 12, color: colors.white, marginTop: 24 }}>
          Center within the frame · good lighting · no filters
        </Text>
      </View>

      <View
        style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
      >
        <PremiumButton label="Capture" onPress={() => router.back()} />
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm --filter @onlyou/mobile typecheck
git add apps/mobile/app/photo-upload
git commit -m "feat(phase-2c/14): photo-upload container + simulated camera"
```

---

## Task 15 — Treatment stack layout + confirmation screen

**Files:**

- Create: `apps/mobile/app/treatment/_layout.tsx`
- Create: `apps/mobile/app/treatment/confirmation.tsx`

- [ ] **Step 1: Layout**

```tsx
import { Stack } from "expo-router";

export default function TreatmentLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Confirmation screen**

```tsx
import { router } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { colors } from "@/theme/colors";

export default function Confirmation() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 80,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 999,
          backgroundColor: colors.accentLight,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 40 }}>✓</Text>
      </View>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 30,
          color: colors.textPrimary,
          textAlign: "center",
          lineHeight: 34,
          letterSpacing: -0.6,
          marginBottom: 12,
        }}
      >
        Submitted for review
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 22,
          maxWidth: 320,
          marginBottom: 8,
        }}
      >
        A doctor will review your case within 24 hours — completely free.
        We&apos;ll notify you when your plan is ready.
      </Text>

      <View style={{ flex: 1 }} />

      <View style={{ width: "100%" }}>
        <PremiumButton
          label="Back to home"
          onPress={() => router.replace("/(tabs)/home")}
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/treatment/_layout.tsx apps/mobile/app/treatment/confirmation.tsx
git commit -m "feat(phase-2c/15): treatment stack layout + confirmation screen"
```

---

## Task 16 — Treatment plan-ready screen

**Files:**

- Create: `apps/mobile/app/treatment/plan-ready.tsx`

- [ ] **Step 1: Write**

```tsx
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function PlanReady() {
  const insets = useSafeAreaInsets();
  const user = usePatientState();
  const consultation = user.consultations[0];
  const prescription = user.prescriptions[0];

  if (!consultation || !prescription) {
    return (
      <View
        style={{ flex: 1, padding: 24, backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.textSecondary }}>
          No plan in progress.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 24 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 44, height: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
      >
        <Text
          style={{
            fontSize: 10,
            color: colors.accentWarm,
            fontWeight: "800",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginTop: 16,
            marginBottom: 10,
          }}
        >
          Your Treatment Plan
        </Text>
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 32,
            color: colors.textPrimary,
            lineHeight: 36,
            letterSpacing: -0.6,
            marginBottom: 16,
          }}
        >
          {consultation.doctorName} wrote your plan
        </Text>
        <Text
          style={{ fontSize: 13, color: colors.textTertiary, marginBottom: 24 }}
        >
          {consultation.doctorSpecialty}
        </Text>

        <SectionHeader>Diagnosis</SectionHeader>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            lineHeight: 20,
            marginBottom: 24,
          }}
        >
          {consultation.diagnosis}
        </Text>

        <SectionHeader>Medications</SectionHeader>
        {prescription.items.map((item) => (
          <View
            key={item.name}
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderLight,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: colors.textPrimary,
              }}
            >
              💊 {item.name}
            </Text>
            <Text
              style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}
            >
              {item.dosage} · {item.schedule}
            </Text>
          </View>
        ))}

        <SectionHeader>What to expect</SectionHeader>
        <Text
          style={{
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 19,
            marginBottom: 8,
          }}
        >
          · Reduced shedding in 1–3 months
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 19,
            marginBottom: 8,
          }}
        >
          · Visible improvement in 3–6 months
        </Text>
        <Text
          style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}
        >
          · Unlimited messaging with your doctor during treatment
        </Text>
      </ScrollView>

      <View
        style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
      >
        <PremiumButton
          variant="warm"
          label="Choose your plan →"
          onPress={() => router.push("/treatment/plan-selection")}
        />
      </View>
    </View>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 10,
        color: colors.textTertiary,
        fontWeight: "800",
        letterSpacing: 1.5,
        textTransform: "uppercase",
        marginTop: 24,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/treatment/plan-ready.tsx
git commit -m "feat(phase-2c/16): treatment plan-ready screen with diagnosis + meds"
```

---

## Task 17 — Plan selection screen

**Files:**

- Create: `apps/mobile/app/treatment/plan-selection.tsx`

**CRO skills:** Invoke `paywall-upgrade-cro` + `pricing-strategy` before writing this screen.

- [ ] **Step 1: Write**

```tsx
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { VERTICALS } from "@/fixtures/verticals";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

type PlanId = "monthly" | "quarterly" | "six-month";

export default function PlanSelection() {
  const insets = useSafeAreaInsets();
  const user = usePatientState();
  const consultation = user.consultations[0];
  const [selected, setSelected] = useState<PlanId>("quarterly");

  if (!consultation) return null;
  const info = VERTICALS[consultation.vertical];

  const plans: Array<{
    id: PlanId;
    label: string;
    monthlyPaise: number;
    totalPaise: number;
    badge?: string;
  }> = [
    {
      id: "six-month",
      label: "6-month",
      monthlyPaise: Math.round(info.pricing.sixMonthTotalPaise / 6),
      totalPaise: info.pricing.sixMonthTotalPaise,
      badge: "Best value",
    },
    {
      id: "quarterly",
      label: "Quarterly",
      monthlyPaise: Math.round(info.pricing.quarterlyTotalPaise / 3),
      totalPaise: info.pricing.quarterlyTotalPaise,
      badge: "Popular",
    },
    {
      id: "monthly",
      label: "Monthly",
      monthlyPaise: info.pricing.monthlyPaise,
      totalPaise: info.pricing.monthlyPaise,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 24 }}>
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
            fontSize: 30,
            color: colors.textPrimary,
            marginTop: 16,
            marginBottom: 8,
            letterSpacing: -0.6,
          }}
        >
          Choose your plan
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.textSecondary,
            marginBottom: 24,
            lineHeight: 19,
          }}
        >
          Includes: {info.displayName} medication · monthly delivery · unlimited
          messaging · follow-ups
        </Text>

        {plans.map((plan) => {
          const isSelected = selected === plan.id;
          return (
            <Pressable
              key={plan.id}
              onPress={() => setSelected(plan.id)}
              style={{
                borderWidth: 2,
                borderColor: isSelected ? colors.accentWarm : colors.border,
                backgroundColor: isSelected
                  ? (colors.warmBg ?? "#FDF9F3")
                  : colors.white,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: colors.textPrimary,
                    }}
                  >
                    {plan.label}
                  </Text>
                  {plan.badge ? (
                    <Text
                      style={{
                        fontSize: 10,
                        color: colors.accentWarm,
                        fontWeight: "800",
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        marginTop: 4,
                      }}
                    >
                      {plan.badge}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "800",
                      color: colors.textPrimary,
                    }}
                  >
                    ₹{Math.round(plan.monthlyPaise / 100)}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                    per month
                  </Text>
                </View>
              </View>
              {plan.id !== "monthly" ? (
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textTertiary,
                    marginTop: 8,
                  }}
                >
                  ₹{(plan.totalPaise / 100).toFixed(0)} billed{" "}
                  {plan.id === "quarterly" ? "quarterly" : "once for 6 months"}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
      >
        <PremiumButton
          variant="warm"
          label="Continue to payment"
          onPress={() => router.push("/treatment/payment")}
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/treatment/plan-selection.tsx
git commit -m "feat(phase-2c/17): plan-selection screen (paywall-upgrade-cro + pricing-strategy)"
```

---

## Task 18 — Payment screen (mocked)

**Files:**

- Create: `apps/mobile/app/treatment/payment.tsx`

**CRO skill:** `paywall-upgrade-cro`.

- [ ] **Step 1: Write**

```tsx
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { colors } from "@/theme/colors";

export default function Payment() {
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [processing, setProcessing] = useState(false);

  async function onPay() {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1500)); // mocked Razorpay
    setProcessing(false);
    router.replace("/treatment/subscription-confirmed");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 24 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 44, height: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 30,
            color: colors.textPrimary,
            marginTop: 16,
            marginBottom: 24,
            letterSpacing: -0.6,
          }}
        >
          Payment
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
          {(["upi", "card"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMethod(m)}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: method === m ? colors.accentWarm : colors.border,
                backgroundColor:
                  method === m ? (colors.warmBg ?? "#FDF9F3") : colors.white,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                {m === "upi" ? "UPI" : "Card"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View
          style={{
            padding: 16,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.white,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: colors.textTertiary,
              fontWeight: "700",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Order summary
          </Text>
          <Row label="Quarterly plan" value="₹2,499" />
          <Row label="Wallet credit" value="−₹200" />
          <View
            style={{
              height: 1,
              backgroundColor: colors.borderLight,
              marginVertical: 8,
            }}
          />
          <Row label="Total" value="₹2,299" bold />
        </View>

        <Text
          style={{ fontSize: 11, color: colors.textTertiary, lineHeight: 16 }}
        >
          By tapping Pay you agree to onlyou&apos;s subscription terms. Cancel
          any time. 256-bit TLS · secured by Razorpay.
        </Text>
      </View>

      <View
        style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
      >
        <PremiumButton
          variant="warm"
          label={processing ? "Processing…" : "Pay ₹2,299"}
          disabled={processing}
          onPress={onPay}
        />
        {processing ? (
          <View style={{ marginTop: 12, alignItems: "center" }}>
            <ActivityIndicator color={colors.accentWarm} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
      <Text
        style={{
          fontSize: bold ? 15 : 13,
          fontWeight: bold ? "800" : "500",
          color: colors.textPrimary,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/treatment/payment.tsx
git commit -m "feat(phase-2c/18): payment screen — mocked Razorpay (paywall-upgrade-cro)"
```

---

## Task 19 — Subscription confirmed screen

**Files:**

- Create: `apps/mobile/app/treatment/subscription-confirmed.tsx`

- [ ] **Step 1: Write**

```tsx
import { router } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { colors } from "@/theme/colors";

export default function SubscriptionConfirmed() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 80,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 999,
          backgroundColor: colors.warmBg ?? "#FDF9F3",
          borderWidth: 2,
          borderColor: colors.accentWarm,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 36 }}>🎉</Text>
      </View>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 30,
          color: colors.textPrimary,
          textAlign: "center",
          marginBottom: 12,
          letterSpacing: -0.6,
        }}
      >
        You&apos;re all set
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 22,
          maxWidth: 320,
        }}
      >
        We&apos;re preparing your first medication kit. Delivery in 2–4 business
        days. You can message your doctor any time.
      </Text>

      <View style={{ flex: 1 }} />

      <View style={{ width: "100%" }}>
        <PremiumButton
          label="Go to home"
          onPress={() => router.replace("/(tabs)/home")}
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/treatment/subscription-confirmed.tsx
git commit -m "feat(phase-2c/19): subscription-confirmed success screen"
```

---

## Task 20 — Activity tab index + detail

**Files:**

- Create: `apps/mobile/src/components/activity/StepperList.tsx`
- Modify: `apps/mobile/app/(tabs)/activity/index.tsx`
- Create: `apps/mobile/app/(tabs)/activity/[orderId].tsx`

- [ ] **Step 1: Write `StepperList.tsx`**

```tsx
import { Pressable, Text, View } from "react-native";

import type { Order, OrderStatus } from "../../fixtures/patient-states";
import { colors } from "../../theme/colors";

const STATUS_LABELS: Record<OrderStatus, string> = {
  preparing: "Preparing",
  dispatched: "Dispatched",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

interface Props {
  orders: Order[];
  onSelect: (id: string) => void;
}

export function StepperList({ orders, onSelect }: Props) {
  if (orders.length === 0) {
    return (
      <View style={{ paddingVertical: 40, alignItems: "center" }}>
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
          No orders yet.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {orders.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => onSelect(o.id)}
          style={{
            padding: 16,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.white,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: colors.textTertiary,
              fontWeight: "800",
              marginBottom: 6,
            }}
          >
            {STATUS_LABELS[o.status]}
          </Text>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: colors.textPrimary,
              marginBottom: 2,
            }}
          >
            {o.vertical.replace("-", " ")} · {o.itemCount} items
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            ₹{(o.totalPaise / 100).toFixed(0)} · placed{" "}
            {new Date(o.placedAt).toLocaleDateString("en-IN")}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Overwrite `activity/index.tsx`**

```tsx
import { router } from "expo-router";
import { ScrollView, Text } from "react-native";

import { StepperList } from "@/components/activity/StepperList";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function ActivityIndex() {
  const user = usePatientState();
  const active = user.orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  );
  const completed = user.orders.filter(
    (o) => o.status === "delivered" || o.status === "cancelled",
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 30,
          color: colors.textPrimary,
          marginBottom: 16,
          letterSpacing: -0.6,
        }}
      >
        Activity
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
        Active
      </Text>
      <StepperList
        orders={active}
        onSelect={(id) => router.push(`/(tabs)/activity/${id}`)}
      />

      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: colors.textTertiary,
          fontWeight: "800",
          marginTop: 24,
          marginBottom: 10,
        }}
      >
        Completed
      </Text>
      <StepperList
        orders={completed}
        onSelect={(id) => router.push(`/(tabs)/activity/${id}`)}
      />
    </ScrollView>
  );
}
```

- [ ] **Step 3: Activity detail `[orderId].tsx`**

```tsx
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function ActivityDetail() {
  const user = usePatientState();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const order = user.orders.find((o) => o.id === orderId);
  const delivery = user.deliveries.find((d) => d.orderId === orderId);

  if (!order) {
    return (
      <View
        style={{ flex: 1, padding: 24, backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.textSecondary }}>Order not found.</Text>
      </View>
    );
  }

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
          marginBottom: 8,
          letterSpacing: -0.6,
        }}
      >
        Order {order.id}
      </Text>
      <Text
        style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 24 }}
      >
        {order.vertical.replace("-", " ")} · ₹
        {(order.totalPaise / 100).toFixed(0)}
      </Text>

      {delivery?.progress.map((step) => (
        <View
          key={step.label}
          style={{ flexDirection: "row", marginBottom: 16 }}
        >
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              borderWidth: 2,
              borderColor: step.done ? colors.accent : colors.border,
              backgroundColor: step.done ? colors.accent : colors.white,
              marginRight: 12,
              marginTop: 2,
            }}
          />
          <Text
            style={{
              fontSize: 14,
              color: step.done ? colors.textPrimary : colors.textTertiary,
              fontWeight: "600",
            }}
          >
            {step.label}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/activity apps/mobile/app/\(tabs\)/activity
git commit -m "feat(phase-2c/20): activity tab list + order detail stepper"
```

---

## Task 21 — Messages tab (list + chat screen)

**Files:**

- Modify: `apps/mobile/app/(tabs)/messages/index.tsx`
- Create: `apps/mobile/app/(tabs)/messages/[conversationId].tsx`

- [ ] **Step 1: Overwrite `messages/index.tsx`**

```tsx
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function MessagesIndex() {
  const user = usePatientState();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24 }}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 30,
          color: colors.textPrimary,
          marginBottom: 16,
          letterSpacing: -0.6,
        }}
      >
        Messages
      </Text>

      {user.conversations.length === 0 ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            No messages yet. Your provider will reach out after your
            consultation.
          </Text>
        </View>
      ) : (
        user.conversations.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push(`/(tabs)/messages/${c.id}`)}
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderLight,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                {c.doctorName}
              </Text>
              {c.unreadCount > 0 ? (
                <View
                  style={{
                    minWidth: 20,
                    height: 20,
                    borderRadius: 999,
                    backgroundColor: colors.accent,
                    paddingHorizontal: 6,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: colors.white,
                    }}
                  >
                    {c.unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={{
                fontSize: 11,
                color: colors.textTertiary,
                marginBottom: 4,
              }}
            >
              {c.doctorSpecialty} · {c.vertical.replace("-", " ")}
            </Text>
            <Text
              style={{ fontSize: 13, color: colors.textSecondary }}
              numberOfLines={1}
            >
              {c.lastMessagePreview}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Chat screen**

```tsx
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumInput } from "@/components/ui/PremiumInput";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function ChatScreen() {
  const user = usePatientState();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const conv = user.conversations.find((c) => c.id === conversationId);
  const insets = useSafeAreaInsets();

  if (!conv) {
    return (
      <View
        style={{ flex: 1, padding: 24, backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.textSecondary }}>
          Conversation not found.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
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
            fontSize: 15,
            fontWeight: "700",
            color: colors.textPrimary,
            marginTop: 4,
          }}
        >
          {conv.doctorName}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textTertiary }}>
          {conv.doctorSpecialty}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {conv.messages.map((m) => (
          <View
            key={m.id}
            style={{
              alignSelf: m.fromPatient ? "flex-end" : "flex-start",
              maxWidth: "75%",
              marginBottom: 10,
              padding: 12,
              borderRadius: 14,
              backgroundColor: m.fromPatient
                ? colors.textPrimary
                : colors.offWhite,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: m.fromPatient ? colors.white : colors.textPrimary,
                lineHeight: 19,
              }}
            >
              {m.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <PremiumInput label="Message (disabled in shell)" editable={false} />
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/messages
git commit -m "feat(phase-2c/21): messages list + chat screen (input disabled)"
```

---

## Task 22 — Final acceptance + code review + merge prep

**Files:**

- Modify: `checkpoint.md`

- [ ] **Step 1: Full suite**

```bash
pnpm --filter @onlyou/mobile typecheck
pnpm --filter @onlyou/mobile lint
pnpm --filter @onlyou/mobile test
```

Expected: clean. Test count increases over 2A+2B baseline by roughly 15.

- [ ] **Step 2: iOS + Android manual walkthrough — all 4 scenarios**

For each of `new`, `reviewing`, `ready`, `active` (via triple-tap scenario switcher):

1. Home tab renders the correct state card(s).
2. Explore tab shows only the gender-appropriate conditions.
3. Tap Hair Loss (if visible) → condition detail page loads with pricing + FAQ + "Start your free review" warm CTA.
4. Tap Start → questionnaire entry → next → each question screen → review → submit → confirmation.
5. (ready only) tap the Plan Ready card → plan-ready → plan-selection → payment (1.5s) → subscription-confirmed.
6. Activity tab loads (active = shows delivery stepper, others = empty).
7. Messages tab loads (active + reviewing = conversations visible).
8. All consultation CTAs are warm (#C4956B); all non-consultation CTAs are primary (black).

- [ ] **Step 3: Run the feel-checklist from VISUAL_DIRECTION.md §1**

For every new screen in 2C, run through the 14-item checklist. Any fail → fix and re-run.

- [ ] **Step 4: Run `superpowers:requesting-code-review` (Rule 10)**

Record review at `docs/superpowers/reviews/<date>-phase-2c-tab-content-review.md`. Address every finding.

- [ ] **Step 5: Update checkpoint + commit**

```bash
# append a "Phase 2C — complete" block to checkpoint.md matching the 2A/2B format
git add checkpoint.md
git commit -m "chore(phase-2c/22): complete — all 4 tabs + consultation journey shipped"
```

- [ ] **Step 6: Merge**

```bash
git checkout master
git merge --no-ff feature/phase-2c-tab-content -m "Merge phase 2C — tab content + consultation journey"
git worktree remove ../onlyou2-phase-2c
git branch -d feature/phase-2c-tab-content
```

---

## Self-review

- **Spec coverage:** §3.1 tab contents (Tasks 3–7, 20, 21), §4.7 gender gate (Task 6 + extends 2A's `<GenderGate>`), §4.10 CRO (Tasks 4, 11, 12, 17, 18), §4.12 visual quality gate (all screens use warm consultation CTAs, floating labels, bottom sheets already shipped in 2A).
- **Placeholder scan:** no stubs, all tasks have complete code.
- **Type consistency:** `Vertical`, `FixtureUser`, `Question`, plan IDs, order status labels all consistent across tasks.
- **Scope:** no spillover into Plan 2D — profile sub-screens + lab booking + biomarker report are explicitly left for Plan 2D.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-14-phase-2c-tab-content-consultation.md`. Execute via `superpowers:subagent-driven-development` (recommended — 22 tasks) or `superpowers:executing-plans`.
