import { biomarkerPalette } from "@onlyou/core/tokens/biomarker";
import { render } from "@testing-library/react-native";
import React from "react";

import { SummaryStat } from "../SummaryStat";

test("renders label text", () => {
  const { getByText } = render(<SummaryStat label="IN RANGE" value="12" />);
  expect(getByText("IN RANGE")).toBeTruthy();
});

test("renders value text", () => {
  const { getByText } = render(<SummaryStat label="OUT OF RANGE" value="3" />);
  expect(getByText("3")).toBeTruthy();
});

test("applies custom accent color to value", () => {
  const { getByTestId } = render(
    <SummaryStat label="HIGH" value="2" accent={biomarkerPalette.rose} />,
  );
  const valueEl = getByTestId("summary-stat-value");
  // style may be an array (base styles + inline override); flatten to check color
  const flatStyle = Array.isArray(valueEl.props.style)
    ? Object.assign({}, ...valueEl.props.style)
    : valueEl.props.style;
  expect(flatStyle).toEqual(
    expect.objectContaining({ color: biomarkerPalette.rose }),
  );
});

test("defaults accent to ink when not provided", () => {
  const { getByTestId } = render(<SummaryStat label="TOTAL" value="15" />);
  const valueEl = getByTestId("summary-stat-value");
  // style may be an array (base styles + inline override); flatten to check color
  const flatStyle = Array.isArray(valueEl.props.style)
    ? Object.assign({}, ...valueEl.props.style)
    : valueEl.props.style;
  expect(flatStyle).toEqual(
    expect.objectContaining({ color: biomarkerPalette.ink }),
  );
});
