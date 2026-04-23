import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { NewReportBanner } from "../NewReportBanner";

test("renders title text", () => {
  const { getByText } = render(
    <NewReportBanner
      title="Apex Diagnostics · Panel #4207"
      subtitle="New Report · Just Now"
      onPress={jest.fn()}
    />,
  );
  expect(getByText("Apex Diagnostics · Panel #4207")).toBeTruthy();
});

test("renders subtitle text", () => {
  const { getByText } = render(
    <NewReportBanner
      title="City Labs · CBC Panel"
      subtitle="New Report · 2 min ago"
      onPress={jest.fn()}
    />,
  );
  expect(getByText("New Report · 2 min ago")).toBeTruthy();
});

test("fires onPress when tapped", () => {
  const onPress = jest.fn();
  const { getByTestId } = render(
    <NewReportBanner
      title="Apex Diagnostics · Panel #4207"
      subtitle="New Report · Just Now"
      onPress={onPress}
    />,
  );
  fireEvent.press(getByTestId("new-report-banner"));
  expect(onPress).toHaveBeenCalledTimes(1);
});
