/**
 * BiomarkerCard — TDD tests (Phase 2.5D / Wave 2, Task 2.3)
 *
 * Five cases:
 *  1. Renders name + value + unit.
 *  2. Tap fires onPress.
 *  3. downIsGood biomarker (ldl) value DOWN from prev → delta color = sage.
 *  4. downIsGood biomarker (ldl) value UP from prev   → delta color = honey.
 *  5. upIsGood biomarker   (hdl) value UP from prev   → delta color = sage.
 */

import { biomarkerPalette } from "@onlyou/core/tokens/biomarker";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import {
  BIOMARKERS_MOCK,
  type BiomarkerMock,
} from "../../../data/biomarker-mock";
import { BiomarkerCard } from "../BiomarkerCard";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** ldl: value=118, prev=125 → value < prev → DOWN (good for downIsGood). */
const ldlRow = BIOMARKERS_MOCK.find((b) => b.id === "ldl") as BiomarkerMock;

/** Synthetic: ldl but value=130, prev=125 → value > prev → UP (bad for downIsGood). */
const ldlUpRow: BiomarkerMock = { ...ldlRow, value: 130, prev: 125 };

/** hdl: value=58, prev=56 → value > prev → UP (good, upIsGood). */
const hdlRow = BIOMARKERS_MOCK.find((b) => b.id === "hdl") as BiomarkerMock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flatten style arrays (as TRTN does) and return a single style object. */
function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  return (style ?? {}) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("1. renders name, value, and unit", () => {
  const { getByText } = render(
    <BiomarkerCard b={ldlRow} onPress={jest.fn()} />,
  );
  // Name
  expect(getByText("LDL Cholesterol")).toBeTruthy();
  // Value (rendered as string)
  expect(getByText(String(ldlRow.value))).toBeTruthy();
  // Unit
  expect(getByText(ldlRow.unit)).toBeTruthy();
});

test("2. tap fires onPress", () => {
  const onPress = jest.fn();
  const { getByTestId } = render(
    <BiomarkerCard b={ldlRow} onPress={onPress} />,
  );
  fireEvent.press(getByTestId("biomarker-card"));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("3. downIsGood + value DOWN from prev → delta text is sage (good trend)", () => {
  // ldlRow: value=118 < prev=125 → good trend for ldl
  const { getByTestId } = render(
    <BiomarkerCard b={ldlRow} onPress={jest.fn()} />,
  );
  const deltaEl = getByTestId("biomarker-delta");
  const style = flattenStyle(deltaEl.props.style);
  expect(style.color).toBe(biomarkerPalette.sage);
});

test("4. downIsGood + value UP from prev → delta text is honey (bad trend)", () => {
  // ldlUpRow: value=130 > prev=125 → bad trend for ldl (downIsGood)
  const { getByTestId } = render(
    <BiomarkerCard b={ldlUpRow} onPress={jest.fn()} />,
  );
  const deltaEl = getByTestId("biomarker-delta");
  const style = flattenStyle(deltaEl.props.style);
  expect(style.color).toBe(biomarkerPalette.honey);
});

test("5. upIsGood + value UP from prev → delta text is sage (good trend)", () => {
  // hdlRow: value=58 > prev=56 → good trend for hdl (not in downIsGood list)
  const { getByTestId } = render(
    <BiomarkerCard b={hdlRow} onPress={jest.fn()} />,
  );
  const deltaEl = getByTestId("biomarker-delta");
  const style = flattenStyle(deltaEl.props.style);
  expect(style.color).toBe(biomarkerPalette.sage);
});
