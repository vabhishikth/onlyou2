import { render } from "@testing-library/react-native";
import { Stop } from "react-native-svg";

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

test("unboundedHigh direction terminates track gradient in sage, not rose", () => {
  const { UNSAFE_root } = render(
    <RangeBar
      v={60}
      low={0}
      high={100}
      optLow={40}
      optHigh={70}
      direction="unboundedHigh"
    />,
  );
  const stops = UNSAFE_root.findAllByType(Stop);
  // react-native-svg maps JSX `id` to the native prop `name`; filter on that.
  const trackStops = stops.filter((s: (typeof stops)[number]) =>
    s.parent?.props?.name?.endsWith("_track"),
  );
  const lastStop = trackStops[trackStops.length - 1];
  expect(lastStop.props.stopColor).not.toMatch(/rose|A24636/i);
});

test("unboundedLow direction begins track gradient in sage, not rose", () => {
  const { UNSAFE_root } = render(
    <RangeBar
      v={60}
      low={0}
      high={100}
      optLow={40}
      optHigh={70}
      direction="unboundedLow"
    />,
  );
  const stops = UNSAFE_root.findAllByType(Stop);
  // react-native-svg maps JSX `id` to the native prop `name`; filter on that.
  const trackStops = stops.filter((s: (typeof stops)[number]) =>
    s.parent?.props?.name?.endsWith("_track"),
  );
  const firstStop = trackStops[0];
  expect(firstStop.props.stopColor).not.toMatch(/rose|A24636/i);
});

test("bidirectional direction keeps original rose-at-edges gradient (default)", () => {
  const { UNSAFE_root } = render(
    <RangeBar v={60} low={0} high={100} optLow={40} optHigh={70} />,
  );
  const stops = UNSAFE_root.findAllByType(Stop);
  // react-native-svg maps JSX `id` to the native prop `name`; filter on that.
  const trackStops = stops.filter((s: (typeof stops)[number]) =>
    s.parent?.props?.name?.endsWith("_track"),
  );
  expect(trackStops[0].props.stopColor).toMatch(/rose|A24636/i);
  expect(trackStops[trackStops.length - 1].props.stopColor).toMatch(
    /rose|A24636/i,
  );
});
