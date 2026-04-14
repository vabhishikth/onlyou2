import { render } from "@testing-library/react-native";

import { PlaceholderScreen } from "@/components/placeholder-screen";

describe("<PlaceholderScreen>", () => {
  it("renders the title and phase", () => {
    const { getByText } = render(
      <PlaceholderScreen
        title="Wallet"
        phase="Phase 3"
        reason="No real transactions yet"
      />,
    );
    expect(getByText("Wallet")).toBeTruthy();
    expect(getByText(/Coming in Phase 3/)).toBeTruthy();
    expect(getByText(/No real transactions yet/)).toBeTruthy();
  });
});
