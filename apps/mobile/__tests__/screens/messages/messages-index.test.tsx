import { render } from "@testing-library/react-native";

import { TestProvider } from "@/test-utils";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const MessagesIndex = require("../../../app/(tabs)/messages/index").default;

describe("Messages tab — index", () => {
  it("shows sanjana's conversation with Dr. Priya Sharma", () => {
    const { getByText } = render(
      <TestProvider scenario="active">
        <MessagesIndex />
      </TestProvider>,
    );
    expect(getByText("Messages")).toBeTruthy();
    expect(getByText("Dr. Priya Sharma")).toBeTruthy();
    expect(getByText(/Dermatologist · hair loss/)).toBeTruthy();
    expect(getByText(/nightly minoxidil/)).toBeTruthy();
  });

  it("renders empty state when the user has no conversations", () => {
    const { getByText } = render(
      <TestProvider scenario="new">
        <MessagesIndex />
      </TestProvider>,
    );
    expect(getByText(/No messages yet/)).toBeTruthy();
  });

  it("renders an unread badge for rahul's conversation", () => {
    const { getByText } = render(
      <TestProvider scenario="ready">
        <MessagesIndex />
      </TestProvider>,
    );
    expect(getByText("Dr. Priya Sharma")).toBeTruthy();
    expect(getByText("1")).toBeTruthy();
  });
});
