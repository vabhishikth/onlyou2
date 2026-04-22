/**
 * DetailHero — TDD tests (Phase 2.5D / Wave 3, Task 3.1)
 *
 * Four cases:
 *  1. Renders biomarker name.
 *  2. Renders value and unit.
 *  3. Renders "VS. LAST TEST" label and delta percent text.
 *  4. Uses custom `lab` prop when provided.
 */

import { render } from "@testing-library/react-native";
import React from "react";

import {
  BIOMARKERS_MOCK,
  type BiomarkerMock,
} from "../../../data/biomarker-mock";
import { DetailHero } from "../DetailHero";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** ldl: value=118, prev=125, status="high" */
const ldlRow = BIOMARKERS_MOCK.find((b) => b.id === "ldl") as BiomarkerMock;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("1. renders biomarker name", () => {
  const { getByText } = render(<DetailHero b={ldlRow} />);
  expect(getByText("LDL Cholesterol")).toBeTruthy();
});

test("2. renders value and unit", () => {
  const { getByTestId } = render(<DetailHero b={ldlRow} />);
  expect(getByTestId("detail-hero-value")).toBeTruthy();
  expect(getByTestId("detail-hero-unit")).toBeTruthy();
  // Validate text content
  expect(getByTestId("detail-hero-value").props.children).toBe(ldlRow.value);
  expect(getByTestId("detail-hero-unit").props.children).toBe(ldlRow.unit);
});

test("3. renders VS. LAST TEST label and delta percent", () => {
  const { getByTestId, getByText } = render(<DetailHero b={ldlRow} />);
  expect(getByText("VS. LAST TEST")).toBeTruthy();
  // delta percent text element is present
  expect(getByTestId("detail-hero-delta")).toBeTruthy();
});

test("4. uses custom lab prop when provided", () => {
  const { getByText } = render(<DetailHero b={ldlRow} lab="Thyrocare" />);
  expect(getByText(/Thyrocare/)).toBeTruthy();
});
