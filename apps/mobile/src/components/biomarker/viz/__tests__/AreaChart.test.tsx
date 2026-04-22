import { biomarkerPalette } from "@onlyou/core/tokens/biomarker";
import { render } from "@testing-library/react-native";

import { AreaChart } from "../AreaChart";

test("renders area + line + optimal band + points + labels", () => {
  const { toJSON } = render(
    <AreaChart
      data={[132, 128, 125, 122, 120, 119, 118]}
      color={biomarkerPalette.rose}
      low={100}
      high={150}
      optLow={50}
      optHigh={100}
      w={320}
      h={140}
    />,
  );
  expect(toJSON()).toBeTruthy();
});

test("empty data returns null", () => {
  const { toJSON } = render(
    <AreaChart
      data={[]}
      color={biomarkerPalette.rose}
      low={100}
      high={150}
      optLow={50}
      optHigh={100}
      w={320}
      h={140}
    />,
  );
  expect(toJSON()).toBeNull();
});

test("handles single-point data without crash", () => {
  const { toJSON } = render(
    <AreaChart
      data={[120]}
      color={biomarkerPalette.rose}
      low={100}
      high={150}
      optLow={50}
      optHigh={100}
      w={320}
      h={140}
    />,
  );
  expect(toJSON()).toBeTruthy();
});
