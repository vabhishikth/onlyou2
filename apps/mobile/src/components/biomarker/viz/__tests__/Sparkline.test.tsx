import { render } from "@testing-library/react-native";

import { Sparkline } from "../Sparkline";

test("renders path for 7-point series", () => {
  const { toJSON } = render(<Sparkline data={[1, 2, 3, 4, 5, 6, 7]} />);
  expect(toJSON()).toBeTruthy();
});

test("handles flat series without NaN", () => {
  const { toJSON } = render(<Sparkline data={[5, 5, 5, 5]} />);
  expect(toJSON()).toBeTruthy();
});

test("renders single-point series without divide-by-zero", () => {
  const { toJSON } = render(<Sparkline data={[42]} />);
  expect(toJSON()).toBeTruthy();
});

test("empty data returns null without throwing", () => {
  const { toJSON } = render(<Sparkline data={[]} />);
  expect(toJSON()).toBeNull();
});

test("respects showDot=false", () => {
  const { toJSON: withDot } = render(<Sparkline data={[1, 2, 3]} showDot />);
  const { toJSON: noDot } = render(
    <Sparkline data={[1, 2, 3]} showDot={false} />,
  );
  expect(JSON.stringify(withDot())).not.toBe(JSON.stringify(noDot()));
});
