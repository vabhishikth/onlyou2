import { transformForTest } from "../use-biomarker-reports";

const base = {
  _id: "v1",
  canonicalId: "ldl",
  nameOnReport: "LDL",
  valueType: "numeric" as const,
  rawValue: "165",
  numericValue: 165,
  classifiedAt: 0,
  canonical: {
    _id: "r1",
    displayName: "LDL Cholesterol",
    category: "Lipids",
    canonicalUnit: "mg/dL",
  },
  range: { optimalMin: 70, optimalMax: 100, actionBelow: 40, actionAbove: 160 },
  trend: [
    { value: 130, collectionDate: "2026-01-01" },
    { value: 125, collectionDate: "2026-02-01" },
    { value: 165, collectionDate: "2026-04-01" },
  ],
  prev: { value: 125, collectionDate: "2026-02-01" },
};

test("full-range action_required (high) maps to direction-aware 'high'", () => {
  const rows = transformForTest([
    {
      report: {
        analyzedAt: 3,
        _id: "r",
        userId: "u",
        labReportId: "l",
        narrative: "",
        optimalCount: 0,
        subOptimalCount: 0,
        actionRequiredCount: 1,
        unclassifiedCount: 0,
      },
      values: [{ ...base, status: "action_required" }],
    },
  ]);
  expect(rows[0].status).toBe("high");
  expect(rows[0].low).toBe(40);
  expect(rows[0].high).toBe(160);
  expect(rows[0].optLow).toBe(70);
  expect(rows[0].optHigh).toBe(100);
  expect(rows[0].rangeDirection).toBe("bidirectional");
  expect(rows[0].prev).toBe(125);
  expect(rows[0].trend).toEqual([130, 125, 165]);
});

test("action_required with value < optimalMin maps to 'low'", () => {
  const rows = transformForTest([
    {
      report: {
        analyzedAt: 3,
        _id: "r",
        userId: "u",
        labReportId: "l",
        narrative: "",
        optimalCount: 0,
        subOptimalCount: 0,
        actionRequiredCount: 1,
        unclassifiedCount: 0,
      },
      values: [{ ...base, numericValue: 30, status: "action_required" }],
    },
  ]);
  expect(rows[0].status).toBe("low");
});

test("missing actionAbove synthesizes unbounded high", () => {
  const rows = transformForTest([
    {
      report: {
        analyzedAt: 3,
        _id: "r",
        userId: "u",
        labReportId: "l",
        narrative: "",
        optimalCount: 0,
        subOptimalCount: 0,
        actionRequiredCount: 0,
        unclassifiedCount: 0,
      },
      values: [
        {
          ...base,
          range: {
            optimalMin: 40,
            optimalMax: 60,
            actionBelow: 20,
            actionAbove: null,
          },
          numericValue: 70,
          status: "optimal",
        },
      ],
    },
  ]);
  expect(rows[0].high).toBe(60 + (60 - 40));
  expect(rows[0].rangeDirection).toBe("unboundedHigh");
});

test("missing actionBelow synthesizes unbounded low", () => {
  const rows = transformForTest([
    {
      report: {
        analyzedAt: 3,
        _id: "r",
        userId: "u",
        labReportId: "l",
        narrative: "",
        optimalCount: 0,
        subOptimalCount: 0,
        actionRequiredCount: 0,
        unclassifiedCount: 0,
      },
      values: [
        {
          ...base,
          range: {
            optimalMin: 40,
            optimalMax: 60,
            actionBelow: null,
            actionAbove: 80,
          },
          status: "optimal",
        },
      ],
    },
  ]);
  expect(rows[0].low).toBe(Math.max(0, 40 - (60 - 40)));
  expect(rows[0].rangeDirection).toBe("unboundedLow");
});

test("single-report history produces trend = [current]", () => {
  const rows = transformForTest([
    {
      report: {
        analyzedAt: 3,
        _id: "r",
        userId: "u",
        labReportId: "l",
        narrative: "",
        optimalCount: 0,
        subOptimalCount: 0,
        actionRequiredCount: 0,
        unclassifiedCount: 0,
      },
      values: [
        {
          ...base,
          trend: [{ value: 165, collectionDate: "2026-04-01" }],
          prev: null,
          status: "action_required",
        },
      ],
    },
  ]);
  expect(rows[0].trend).toEqual([165]);
  expect(rows[0].prev).toBe(165); // fallback to current
});

test("rows[0].id uses canonicalId (not Convex doc _id) when present", () => {
  const rows = transformForTest([
    {
      report: {
        analyzedAt: 3,
        _id: "r",
        userId: "u",
        labReportId: "l",
        narrative: "",
        optimalCount: 0,
        subOptimalCount: 0,
        actionRequiredCount: 1,
        unclassifiedCount: 0,
      },
      values: [{ ...base, status: "action_required" }],
    },
  ]);
  expect(rows[0].id).toBe("ldl");
});

test("unclassified + no canonical is skipped", () => {
  const rows = transformForTest([
    {
      report: {
        analyzedAt: 3,
        _id: "r",
        userId: "u",
        labReportId: "l",
        narrative: "",
        optimalCount: 0,
        subOptimalCount: 0,
        actionRequiredCount: 0,
        unclassifiedCount: 1,
      },
      values: [
        { ...base, canonical: null, range: null, status: "unclassified" },
      ],
    },
  ]);
  expect(rows).toHaveLength(0);
});
