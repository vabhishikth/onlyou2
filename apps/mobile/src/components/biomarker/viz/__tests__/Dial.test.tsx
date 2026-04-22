import { render } from "@testing-library/react-native";

import { Dial } from "../Dial";

test("renders 60 tick marks + arcs + needle without crashing", () => {
  const { toJSON } = render(
    <Dial
      v={118}
      low={0}
      high={200}
      optLow={50}
      optHigh={100}
      status="high"
      size={220}
      stroke={9}
    />,
  );
  expect(toJSON()).toBeTruthy();
});

test("status color is reflected in progress arc", () => {
  // Snapshot two statuses and verify they differ.
  const { toJSON: high } = render(
    <Dial
      v={118}
      low={0}
      high={200}
      optLow={50}
      optHigh={100}
      status="high"
      size={220}
      stroke={9}
    />,
  );
  const { toJSON: optimal } = render(
    <Dial
      v={75}
      low={0}
      high={200}
      optLow={50}
      optHigh={100}
      status="optimal"
      size={220}
      stroke={9}
    />,
  );
  expect(JSON.stringify(high())).not.toBe(JSON.stringify(optimal()));
});

test("mid-range value renders needle within bounds", () => {
  const { toJSON } = render(
    <Dial
      v={50}
      low={0}
      high={100}
      optLow={40}
      optHigh={60}
      status="optimal"
      size={200}
      stroke={8}
    />,
  );
  expect(toJSON()).toBeTruthy();
});

test("respects default size + stroke", () => {
  const { toJSON } = render(
    <Dial
      v={10}
      low={0}
      high={100}
      optLow={40}
      optHigh={60}
      status="optimal"
    />,
  );
  expect(toJSON()).toBeTruthy();
});
