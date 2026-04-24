/**
 * Smoke test: lab-results Dashboard screen.
 *
 * Verifies:
 *   1. Screen renders without crashing.
 *   2. Greeting text is visible.
 *   3. NewReportBanner is present.
 *   4. At least one BiomarkerCard is rendered.
 */

import { render } from "@testing-library/react-native";

// Mock expo-router so router.push doesn't throw during render.
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

// Mock expo-status-bar — no native module needed in tests.
jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

// Mock convex/react — dashboard's hook calls useQuery unconditionally and
// then short-circuits via the __DEV__ mock branch, but useQuery still needs
// to resolve without a ConvexProvider in the test tree.
jest.mock("convex/react", () => ({
  useQuery: () => undefined,
}));

// Mock display user so greeting is deterministic regardless of signed-in state.
jest.mock("@/hooks/use-display-user", () => ({
  useDisplayUser: () => ({ name: "Arjun Mehta", phone: null, gender: null }),
}));

// SafeAreaContext insets — provide defaults so SafeAreaView renders correctly.
jest.mock("react-native-safe-area-context", () => {
  const RN = require("react-native");
  return {
    SafeAreaView: RN.View,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

const LabResultsDashboard = require("../../../app/lab-results/index").default;

describe("Lab-Results Dashboard screen", () => {
  it("renders without crashing", () => {
    expect(() => render(<LabResultsDashboard />)).not.toThrow();
  });

  it("displays the greeting", () => {
    const { getByText } = render(<LabResultsDashboard />);
    // Greeting is time-of-day dependent (IST); match any valid variant.
    expect(getByText(/Good (morning|afternoon|evening), /i)).toBeTruthy();
  });

  it("renders the NewReportBanner", () => {
    const { getByTestId } = render(<LabResultsDashboard />);
    expect(getByTestId("new-report-banner")).toBeTruthy();
  });

  it("renders at least one BiomarkerCard", () => {
    const { getAllByTestId } = render(<LabResultsDashboard />);
    const cards = getAllByTestId("biomarker-card");
    expect(cards.length).toBeGreaterThan(0);
  });
});
