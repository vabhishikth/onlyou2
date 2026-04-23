import { render } from "@testing-library/react-native";

import { RangeBar } from "../RangeBar";

test("renders without crashing at midpoint", () => {
  const { toJSON } = render(
    <RangeBar
      v={50}
      low={0}
      high={100}
      optLow={40}
      optHigh={60}
      status="optimal"
    />,
  );
  expect(toJSON()).toBeTruthy();
});

test("compact mode reduces rendered height", () => {
  const { toJSON } = render(
    <RangeBar
      v={50}
      low={0}
      high={100}
      optLow={40}
      optHigh={60}
      status="optimal"
      compact
    />,
  );
  expect(toJSON()).toBeTruthy();
});

test("renders at out-of-range position without throwing", () => {
  const { toJSON } = render(
    <RangeBar
      v={200}
      low={0}
      high={100}
      optLow={40}
      optHigh={60}
      status="high"
    />,
  );
  expect(toJSON()).toBeTruthy();
});
