import { fireEvent, render } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), back: jest.fn() },
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()) }),
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

  it("shows a back chevron after advancing past step 1 and decrements on press", () => {
    const { getByTestId, getByText, queryByTestId } = render(<ProfileSetup />);
    // Advance name -> gender
    fireEvent.changeText(getByTestId("profile-name-input"), "Aarav Kumar");
    fireEvent.press(getByText("Next"));

    // On gender step: back chevron visible
    const back = getByTestId("profile-setup-back");
    expect(back).toBeTruthy();

    // Press back -> step 1 (name) — back chevron disappears, typed name preserved
    fireEvent.press(back);
    expect(queryByTestId("profile-setup-back")).toBeNull();
  });
});
