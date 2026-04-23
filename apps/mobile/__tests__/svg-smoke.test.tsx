import { render } from "@testing-library/react-native";
import { Svg, Circle } from "react-native-svg";
test("svg smoke", () => {
  render(
    <Svg width={10} height={10}>
      <Circle cx={5} cy={5} r={3} />
    </Svg>,
  );
});
