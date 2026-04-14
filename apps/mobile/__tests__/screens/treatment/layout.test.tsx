import { render } from "@testing-library/react-native";

jest.mock("expo-router", () => {
  const { Text } = require("react-native");
  return {
    Stack: ({ screenOptions }: { screenOptions: object }) => {
      (
        globalThis as unknown as { __treatmentStackOptions: object }
      ).__treatmentStackOptions = screenOptions;
      return <Text>stack</Text>;
    },
  };
});

describe("Treatment stack layout", () => {
  it("renders a Stack with hidden header", () => {
    const Layout = require("../../../app/treatment/_layout").default;
    const { getByText } = render(<Layout />);
    expect(getByText("stack")).toBeTruthy();
    const options = (
      globalThis as unknown as {
        __treatmentStackOptions: { headerShown: boolean };
      }
    ).__treatmentStackOptions;
    expect(options.headerShown).toBe(false);
  });
});
