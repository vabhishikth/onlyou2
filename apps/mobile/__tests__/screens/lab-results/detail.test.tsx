/**
 * Smoke test: lab-results Detail screen ([id].tsx).
 *
 * Verifies:
 *   1. Renders without crashing for a known biomarker id ("ldl").
 *   2. Displays the biomarker name.
 *   3. Renders both RefRows (Optimal and Clinical Range) inside the reference card.
 *   4. Renders the explainer quote text.
 */

import { render } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";

// Mock expo-router — provides useLocalSearchParams and router.back.
// useLocalSearchParams is overridden per-suite via mockReturnValue below.
jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(() => ({ id: "ldl" })),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

// Mock expo-status-bar — no native module needed in tests.
jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

// Mock convex/react — detail screen's hook calls useQuery unconditionally
// and then short-circuits via the __DEV__ mock branch, but useQuery still
// needs to resolve without a ConvexProvider in the test tree.
jest.mock("convex/react", () => ({
  useQuery: () => undefined,
}));

// SafeAreaContext insets are already globally mocked in jest.setup.ts,
// but the detail screen imports SafeAreaView directly from the package,
// so we override here to use a plain View (same as the index screen test).
jest.mock("react-native-safe-area-context", () => {
  const RN = require("react-native");
  return {
    SafeAreaView: RN.View,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

// react-native-svg is handled by transformIgnorePatterns (same as the
// index screen and svg-smoke tests) — no inline mock needed here.

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;

const BiomarkerDetail = require("../../../app/lab-results/[id]").default;

describe("Lab-Results Detail screen — known id (ldl)", () => {
  beforeEach(() => {
    mockUseLocalSearchParams.mockReturnValue({ id: "ldl" });
  });

  it("renders without crashing for a known biomarker id (ldl)", () => {
    expect(() => render(<BiomarkerDetail />)).not.toThrow();
  });

  it("displays the biomarker name", () => {
    const { getByText } = render(<BiomarkerDetail />);
    // LDL Cholesterol is the name for id="ldl" in BIOMARKERS_MOCK.
    expect(getByText("LDL Cholesterol")).toBeTruthy();
  });

  it("renders both RefRows (Optimal and Clinical Range)", () => {
    const { getAllByTestId } = render(<BiomarkerDetail />);
    // Each RefRow renders a testID="ref-row-dot" dot.
    const dots = getAllByTestId("ref-row-dot");
    // Expect at least 2: one for Optimal row, one for Clinical Range row.
    expect(dots.length).toBeGreaterThanOrEqual(2);
  });

  it("renders the explainer quote text", () => {
    const { getByTestId } = render(<BiomarkerDetail />);
    expect(getByTestId("explainer-quote")).toBeTruthy();
  });
});

describe("Lab-Results Detail screen — not-found fallback", () => {
  beforeEach(() => {
    mockUseLocalSearchParams.mockReturnValue({ id: "nonexistent-id" });
  });

  it("renders a not-found fallback rather than crashing", () => {
    const { getByTestId } = render(<BiomarkerDetail />);
    expect(getByTestId("detail-not-found")).toBeTruthy();
  });
});
