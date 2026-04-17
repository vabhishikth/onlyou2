import { act, fireEvent, render } from "@testing-library/react-native";

import { useDevScenarioStore } from "@/stores/dev-scenario-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { TestProvider } from "@/test-utils";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const { router } = require("expo-router");

const Confirmation = require("../../../app/treatment/confirmation").default;

describe("Treatment confirmation screen", () => {
  beforeEach(() => {
    (router.replace as jest.Mock).mockClear();
    act(() => {
      useDevScenarioStore.getState().resetScenario();
      useQuestionnaireStore.getState().reset();
    });
  });

  it("renders the submitted-for-review headline and routes home on CTA", () => {
    const { getByText } = render(
      <TestProvider scenario="reviewing">
        <Confirmation />
      </TestProvider>,
    );
    expect(getByText("Submitted for review")).toBeTruthy();
    expect(
      getByText(/A doctor will review your case within 24 hours/),
    ).toBeTruthy();
    fireEvent.press(getByText("Back to home"));
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/home");
  });

  it("carries the selected vertical into the dev store as a flow update", () => {
    act(() => {
      useDevScenarioStore.getState().setActiveUser("user-arjun");
      useQuestionnaireStore.getState().start("ed");
    });
    const { getByText } = render(
      <TestProvider scenario="new">
        <Confirmation />
      </TestProvider>,
    );
    fireEvent.press(getByText("Back to home"));
    const state = useDevScenarioStore.getState();
    expect(state.activeScenario).toBe("reviewing");
    expect(state.lastSource).toBe("flow");
    expect(state.verticalsByUser["user-arjun"]).toBe("ed");
  });
});
