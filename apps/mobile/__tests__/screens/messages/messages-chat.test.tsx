import { render } from "@testing-library/react-native";

import { TestProvider } from "@/test-utils";

const mockParams: { conversationId: string } = {
  conversationId: "conv-sanjana-1",
};

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const ChatScreen =
  require("../../../app/(tabs)/messages/[conversationId]").default;

describe("Messages tab — chat screen", () => {
  beforeEach(() => {
    mockParams.conversationId = "conv-sanjana-1";
  });

  it("renders all three messages bubbled for sanjana's conversation", () => {
    const { getByText } = render(
      <TestProvider scenario="active">
        <ChatScreen />
      </TestProvider>,
    );
    expect(getByText("Dr. Neha Kapoor")).toBeTruthy();
    expect(getByText(/Based on your labs/)).toBeTruthy();
    expect(getByText(/how long until I see changes/)).toBeTruthy();
    expect(getByText(/Cycle regulation usually takes 3 months/)).toBeTruthy();
  });

  it("renders a disabled input with the coming-soon hint", () => {
    const { getByTestId, getByText } = render(
      <TestProvider scenario="active">
        <ChatScreen />
      </TestProvider>,
    );
    const input = getByTestId("chat-input-disabled");
    expect(input.props.editable).toBe(false);
    expect(
      getByText(/Coming soon — direct chat with your doctor/),
    ).toBeTruthy();
  });

  it("renders not-found state when conversation id is unknown", () => {
    mockParams.conversationId = "does-not-exist";
    const { getByText } = render(
      <TestProvider scenario="active">
        <ChatScreen />
      </TestProvider>,
    );
    expect(getByText(/Conversation not found/)).toBeTruthy();
  });
});
