import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { CategoryFilterPills } from "../CategoryFilterPills";

const CATS = [
  { id: "hormones", label: "Hormones" },
  { id: "metabolic", label: "Metabolic" },
  { id: "vitamins", label: "Vitamins" },
];

test("renders All pill", () => {
  const { getByText } = render(
    <CategoryFilterPills value="All" onChange={jest.fn()} categories={CATS} />,
  );
  expect(getByText("All")).toBeTruthy();
});

test("renders all category label pills", () => {
  const { getByText } = render(
    <CategoryFilterPills value="All" onChange={jest.fn()} categories={CATS} />,
  );
  expect(getByText("Hormones")).toBeTruthy();
  expect(getByText("Metabolic")).toBeTruthy();
  expect(getByText("Vitamins")).toBeTruthy();
});

test("tapping a category pill fires onChange with its id", () => {
  const onChange = jest.fn();
  const { getByText } = render(
    <CategoryFilterPills value="All" onChange={onChange} categories={CATS} />,
  );
  fireEvent.press(getByText("Metabolic"));
  expect(onChange).toHaveBeenCalledWith("metabolic");
});

test("tapping All pill fires onChange with 'All'", () => {
  const onChange = jest.fn();
  const { getByText } = render(
    <CategoryFilterPills
      value="hormones"
      onChange={onChange}
      categories={CATS}
    />,
  );
  fireEvent.press(getByText("All"));
  expect(onChange).toHaveBeenCalledWith("All");
});

test("active pill has ink background style", () => {
  const { getByTestId } = render(
    <CategoryFilterPills
      value="metabolic"
      onChange={jest.fn()}
      categories={CATS}
    />,
  );
  // Active pill testId is pill-<id>
  const activePill = getByTestId("pill-metabolic");
  // style is an array (base pill + active override); flatten to check backgroundColor
  const flatStyle = Array.isArray(activePill.props.style)
    ? Object.assign({}, ...activePill.props.style)
    : activePill.props.style;
  expect(flatStyle).toEqual(
    expect.objectContaining({ backgroundColor: expect.any(String) }),
  );
});
