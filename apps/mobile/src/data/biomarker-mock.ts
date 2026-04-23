/**
 * Mock dataset: 24 biomarkers × 7 categories.
 *
 * Category `color` values are the original prototype dark-mode hex strings.
 * They are used only as tiny decorative category-dot identifiers, so they
 * read acceptably in both light and dark contexts. Keeping them verbatim
 * preserves visual fidelity with the prototype.
 *
 * The `onlyou/no-hardcoded-hex` rule applies to this file because it lives
 * in `src/data/`, which is outside the biomarker-surface whitelist. Each hex
 * literal below is suppressed with a targeted disable comment because the
 * colors are intentionally kept as data constants (not UI tokens) — they are
 * never fed into StyleSheet or NativeWind; they only drive SVG dot fills.
 */

import { BiomarkerStatus } from "../components/biomarker/status-helpers";

export type CategoryId =
  | "Metabolic"
  | "Lipids"
  | "Hormones"
  | "Inflammation"
  | "Vitamins"
  | "Organ"
  | "Blood";

export type BiomarkerMock = {
  id: string;
  name: string;
  cat: CategoryId;
  unit: string;
  value: number;
  low: number;
  high: number;
  optLow: number;
  optHigh: number;
  trend: number[];
  status: BiomarkerStatus;
  prev: number;
};

export type Category = {
  id: CategoryId;
  label: string;
  color: string;
};

export const BIOMARKERS_MOCK: BiomarkerMock[] = [
  // Metabolic
  {
    id: "glucose",
    name: "Glucose",
    cat: "Metabolic",
    unit: "mg/dL",
    value: 92,
    low: 70,
    high: 99,
    optLow: 82,
    optHigh: 92,
    trend: [88, 91, 94, 90, 89, 92, 92],
    status: "optimal",
    prev: 94,
  },
  {
    id: "hba1c",
    name: "HbA1c",
    cat: "Metabolic",
    unit: "%",
    value: 5.3,
    low: 4.0,
    high: 5.6,
    optLow: 4.8,
    optHigh: 5.3,
    trend: [5.5, 5.4, 5.4, 5.3, 5.3, 5.2, 5.3],
    status: "optimal",
    prev: 5.4,
  },
  {
    id: "insulin",
    name: "Insulin (fasting)",
    cat: "Metabolic",
    unit: "μIU/mL",
    value: 7.2,
    low: 2.6,
    high: 24.9,
    optLow: 3,
    optHigh: 8,
    trend: [9.1, 8.4, 7.9, 7.6, 7.3, 7.1, 7.2],
    status: "optimal",
    prev: 7.5,
  },

  // Lipids
  {
    id: "ldl",
    name: "LDL Cholesterol",
    cat: "Lipids",
    unit: "mg/dL",
    value: 118,
    low: 0,
    high: 100,
    optLow: 50,
    optHigh: 100,
    trend: [132, 128, 125, 122, 120, 119, 118],
    status: "high",
    prev: 125,
  },
  {
    id: "hdl",
    name: "HDL Cholesterol",
    cat: "Lipids",
    unit: "mg/dL",
    value: 58,
    low: 40,
    high: 200,
    optLow: 60,
    optHigh: 100,
    trend: [52, 54, 55, 56, 57, 57, 58],
    status: "watch",
    prev: 56,
  },
  {
    id: "trig",
    name: "Triglycerides",
    cat: "Lipids",
    unit: "mg/dL",
    value: 88,
    low: 0,
    high: 150,
    optLow: 50,
    optHigh: 100,
    trend: [102, 98, 95, 92, 90, 89, 88],
    status: "optimal",
    prev: 92,
  },
  {
    id: "apob",
    name: "ApoB",
    cat: "Lipids",
    unit: "mg/dL",
    value: 84,
    low: 0,
    high: 100,
    optLow: 60,
    optHigh: 80,
    trend: [92, 90, 88, 87, 86, 85, 84],
    status: "watch",
    prev: 86,
  },

  // Hormones
  {
    id: "testo",
    name: "Testosterone",
    cat: "Hormones",
    unit: "ng/dL",
    value: 612,
    low: 264,
    high: 916,
    optLow: 500,
    optHigh: 800,
    trend: [540, 560, 580, 590, 600, 605, 612],
    status: "optimal",
    prev: 598,
  },
  {
    id: "cortisol",
    name: "Cortisol (AM)",
    cat: "Hormones",
    unit: "μg/dL",
    value: 14.8,
    low: 6.2,
    high: 19.4,
    optLow: 8,
    optHigh: 15,
    trend: [16.1, 15.8, 15.4, 15.1, 14.9, 14.8, 14.8],
    status: "optimal",
    prev: 15.1,
  },
  {
    id: "tsh",
    name: "TSH",
    cat: "Hormones",
    unit: "mIU/L",
    value: 2.4,
    low: 0.4,
    high: 4.5,
    optLow: 1.0,
    optHigh: 2.5,
    trend: [2.8, 2.7, 2.6, 2.5, 2.5, 2.4, 2.4],
    status: "optimal",
    prev: 2.5,
  },
  {
    id: "dhea",
    name: "DHEA-S",
    cat: "Hormones",
    unit: "μg/dL",
    value: 342,
    low: 138,
    high: 475,
    optLow: 280,
    optHigh: 420,
    trend: [310, 320, 328, 334, 338, 340, 342],
    status: "optimal",
    prev: 335,
  },

  // Inflammation
  {
    id: "hscrp",
    name: "hs-CRP",
    cat: "Inflammation",
    unit: "mg/L",
    value: 0.8,
    low: 0,
    high: 3.0,
    optLow: 0,
    optHigh: 1.0,
    trend: [1.4, 1.2, 1.1, 0.9, 0.9, 0.8, 0.8],
    status: "optimal",
    prev: 0.9,
  },
  {
    id: "homo",
    name: "Homocysteine",
    cat: "Inflammation",
    unit: "μmol/L",
    value: 9.4,
    low: 4.0,
    high: 15.0,
    optLow: 5,
    optHigh: 8,
    trend: [10.2, 10.0, 9.8, 9.6, 9.5, 9.4, 9.4],
    status: "watch",
    prev: 9.6,
  },

  // Vitamins
  {
    id: "vitd",
    name: "Vitamin D",
    cat: "Vitamins",
    unit: "ng/mL",
    value: 38,
    low: 30,
    high: 100,
    optLow: 50,
    optHigh: 80,
    trend: [28, 31, 33, 35, 36, 37, 38],
    status: "watch",
    prev: 35,
  },
  {
    id: "b12",
    name: "Vitamin B12",
    cat: "Vitamins",
    unit: "pg/mL",
    value: 612,
    low: 232,
    high: 1245,
    optLow: 500,
    optHigh: 900,
    trend: [580, 590, 598, 605, 609, 610, 612],
    status: "optimal",
    prev: 608,
  },
  {
    id: "folate",
    name: "Folate",
    cat: "Vitamins",
    unit: "ng/mL",
    value: 14.2,
    low: 3.0,
    high: 20.0,
    optLow: 10,
    optHigh: 18,
    trend: [12.8, 13.1, 13.4, 13.7, 13.9, 14.0, 14.2],
    status: "optimal",
    prev: 13.8,
  },
  {
    id: "ferritin",
    name: "Ferritin",
    cat: "Vitamins",
    unit: "ng/mL",
    value: 142,
    low: 30,
    high: 400,
    optLow: 80,
    optHigh: 200,
    trend: [128, 132, 135, 138, 140, 141, 142],
    status: "optimal",
    prev: 138,
  },

  // Kidney & Liver
  {
    id: "creat",
    name: "Creatinine",
    cat: "Organ",
    unit: "mg/dL",
    value: 0.98,
    low: 0.74,
    high: 1.35,
    optLow: 0.8,
    optHigh: 1.1,
    trend: [1.02, 1.01, 1.0, 0.99, 0.99, 0.98, 0.98],
    status: "optimal",
    prev: 0.99,
  },
  {
    id: "alt",
    name: "ALT",
    cat: "Organ",
    unit: "U/L",
    value: 22,
    low: 7,
    high: 56,
    optLow: 10,
    optHigh: 25,
    trend: [28, 26, 25, 24, 23, 22, 22],
    status: "optimal",
    prev: 24,
  },
  {
    id: "ast",
    name: "AST",
    cat: "Organ",
    unit: "U/L",
    value: 20,
    low: 10,
    high: 40,
    optLow: 12,
    optHigh: 22,
    trend: [24, 23, 22, 21, 21, 20, 20],
    status: "optimal",
    prev: 22,
  },

  // Blood
  {
    id: "hgb",
    name: "Hemoglobin",
    cat: "Blood",
    unit: "g/dL",
    value: 15.1,
    low: 13.2,
    high: 16.6,
    optLow: 14.0,
    optHigh: 15.5,
    trend: [14.6, 14.7, 14.8, 14.9, 15.0, 15.0, 15.1],
    status: "optimal",
    prev: 14.9,
  },
  {
    id: "rbc",
    name: "RBC",
    cat: "Blood",
    unit: "M/μL",
    value: 5.1,
    low: 4.35,
    high: 5.65,
    optLow: 4.6,
    optHigh: 5.2,
    trend: [5.0, 5.0, 5.1, 5.1, 5.1, 5.1, 5.1],
    status: "optimal",
    prev: 5.1,
  },
  {
    id: "wbc",
    name: "WBC",
    cat: "Blood",
    unit: "K/μL",
    value: 6.2,
    low: 3.4,
    high: 10.8,
    optLow: 4.5,
    optHigh: 7.0,
    trend: [6.8, 6.6, 6.5, 6.4, 6.3, 6.2, 6.2],
    status: "optimal",
    prev: 6.4,
  },
  {
    id: "plt",
    name: "Platelets",
    cat: "Blood",
    unit: "K/μL",
    value: 248,
    low: 150,
    high: 379,
    optLow: 200,
    optHigh: 300,
    trend: [242, 244, 245, 246, 247, 248, 248],
    status: "optimal",
    prev: 246,
  },
];

// Category color values are the original prototype dark-mode hex strings kept
// verbatim for visual fidelity. These are purely decorative dot fills (SVG),
// never fed into StyleSheet or NativeWind. They read acceptably in light mode.
export const CATEGORIES: Category[] = [
  // eslint-disable-next-line onlyou/no-hardcoded-hex
  { id: "Metabolic", label: "Metabolic", color: "#E8A04C" },
  // eslint-disable-next-line onlyou/no-hardcoded-hex
  { id: "Lipids", label: "Lipids", color: "#C87934" },
  // eslint-disable-next-line onlyou/no-hardcoded-hex
  { id: "Hormones", label: "Hormones", color: "#D4A05C" },
  // eslint-disable-next-line onlyou/no-hardcoded-hex
  { id: "Inflammation", label: "Inflammation", color: "#C86B5A" },
  // eslint-disable-next-line onlyou/no-hardcoded-hex
  { id: "Vitamins", label: "Vitamins", color: "#B89968" },
  // eslint-disable-next-line onlyou/no-hardcoded-hex
  { id: "Organ", label: "Kidney · Liver", color: "#9E8163" },
  // eslint-disable-next-line onlyou/no-hardcoded-hex
  { id: "Blood", label: "Blood Count", color: "#A87A4E" },
];
