import { render } from "@testing-library/react-native";

jest.mock("expo-router", () => {
  const { Text } = require("react-native");
  return {
    Stack: ({ screenOptions }: { screenOptions: object }) => {
      (globalThis as unknown as { __stackOptions: object }).__stackOptions =
        screenOptions;
      return <Text>stack</Text>;
    },
  };
});

describe("Questionnaire modal stack layout", () => {
  it("renders a Stack with modal presentation and hidden header", () => {
    const Layout = require("../../../app/questionnaire/_layout").default;
    const { getByText } = render(<Layout />);
    expect(getByText("stack")).toBeTruthy();
    const options = (
      globalThis as unknown as {
        __stackOptions: { presentation: string; headerShown: boolean };
      }
    ).__stackOptions;
    expect(options.presentation).toBe("modal");
    expect(options.headerShown).toBe(false);
  });
});
