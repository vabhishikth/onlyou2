/**
 * RefRow — TDD tests (Phase 2.5D / Wave 3, Task 3.1)
 *
 * Two cases:
 *  1. Renders label, range ({from} – {to}), and unit.
 *  2. Dot view receives the correct background color from the `dot` prop.
 */

import { biomarkerPalette } from "@onlyou/core/tokens/biomarker";
import { render } from "@testing-library/react-native";
import React from "react";

import { RefRow } from "../RefRow";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("1. renders label, range, and unit", () => {
  const { getByText } = render(
    <RefRow
      label="OPTIMAL"
      from={50}
      to={100}
      unit="mg/dL"
      dot={biomarkerPalette.sage}
    />,
  );

  // Label text
  expect(getByText("OPTIMAL")).toBeTruthy();
  // Range string
  expect(getByText("50 – 100")).toBeTruthy();
  // Unit text
  expect(getByText("mg/dL")).toBeTruthy();
});

test("2. dot view receives background color from dot prop", () => {
  const dotColor = biomarkerPalette.rose;
  const { getByTestId } = render(
    <RefRow label="HIGH" from={100} to={150} unit="mg/dL" dot={dotColor} />,
  );

  const dotEl = getByTestId("ref-row-dot");
  // RN StyleSheet applies base style + inline override as an array.
  // Flatten to a single object before asserting.
  const styleArray = Array.isArray(dotEl.props.style)
    ? dotEl.props.style
    : [dotEl.props.style];
  const flatStyle = Object.assign({}, ...styleArray);
  expect(flatStyle).toMatchObject({ backgroundColor: dotColor });
});
