import { render } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), back: jest.fn() },
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()) }),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (_cb: () => void) => {},
}));

jest.mock("convex/react", () => ({
  useMutation: () => jest.fn(),
}));

jest.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: (s: { token: string | null }) => unknown) =>
    selector({ token: "test-token" }),
}));

jest.mock(
  "../../../convex/_generated/api",
  () => ({
    api: { users: { completeProfile: "users:completeProfile" } },
  }),
  { virtual: true },
);

const ProfileSetup = require("../../app/(auth)/profile-setup").default;

describe("<ProfileSetup> header", () => {
  it("renders the onlyou wordmark at the top of the flow", () => {
    const { getByTestId } = render(<ProfileSetup />);
    expect(getByTestId("wordmark")).toHaveTextContent("onlyou");
  });

  it("does not show a back chevron on step 1 (name)", () => {
    const { queryByTestId } = render(<ProfileSetup />);
    expect(queryByTestId("profile-setup-back")).toBeNull();
  });
});
