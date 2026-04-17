import { colors } from "@onlyou/core/tokens/colors";

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
    tintHex: colors.verticalTintHairLoss,
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
    tintHex: colors.verticalTintEd,
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
    tintHex: colors.verticalTintPe,
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
    tintHex: colors.verticalTintWeight,
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
    tintHex: colors.verticalTintPcos,
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
