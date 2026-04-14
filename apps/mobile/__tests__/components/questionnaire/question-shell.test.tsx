import { fireEvent, render } from "@testing-library/react-native";
import { Alert } from "react-native";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissAll: jest.fn(),
  },
  Stack: ({ children }: { children: React.ReactNode }) => children,
}));

import { Text } from "react-native";
import { router } from "expo-router";

import { QuestionShell } from "@/components/questionnaire/QuestionShell";

const mockBack = router.back as jest.Mock;
const mockDismissAll = (router as unknown as { dismissAll: jest.Mock })
  .dismissAll;

describe("<QuestionShell>", () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockDismissAll.mockClear();
  });

  it("renders title, helper, progress and children", () => {
    const { getByText } = render(
      <QuestionShell
        current={1}
        total={4}
        title="How would you describe your hair loss?"
        helper="Pick the closest match."
        canProceed={false}
        onNext={() => {}}
      >
        <Text>slot</Text>
      </QuestionShell>,
    );
    expect(getByText("How would you describe your hair loss?")).toBeTruthy();
    expect(getByText("Pick the closest match.")).toBeTruthy();
    expect(getByText("1 of 4")).toBeTruthy();
    expect(getByText("slot")).toBeTruthy();
    expect(getByText("Consultation")).toBeTruthy();
    expect(getByText("Next")).toBeTruthy();
  });

  it("disables Next until canProceed is true", () => {
    const onNext = jest.fn();
    const blocked = render(
      <QuestionShell
        current={1}
        total={3}
        title="Question"
        canProceed={false}
        onNext={onNext}
      >
        <Text>slot</Text>
      </QuestionShell>,
    );
    fireEvent.press(blocked.getByText("Next"));
    expect(onNext).not.toHaveBeenCalled();
    blocked.unmount();

    const allowed = render(
      <QuestionShell
        current={1}
        total={3}
        title="Question"
        canProceed
        onNext={onNext}
      >
        <Text>slot</Text>
      </QuestionShell>,
    );
    fireEvent.press(allowed.getByText("Next"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("navigates back when the back button is tapped", () => {
    const { getByLabelText } = render(
      <QuestionShell
        current={2}
        total={3}
        title="Question"
        canProceed
        onNext={() => {}}
      >
        <Text>slot</Text>
      </QuestionShell>,
    );
    fireEvent.press(getByLabelText("Back"));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("prompts an exit confirmation when close is tapped", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByLabelText } = render(
      <QuestionShell
        current={2}
        total={3}
        title="Question"
        canProceed
        onNext={() => {}}
      >
        <Text>slot</Text>
      </QuestionShell>,
    );
    fireEvent.press(getByLabelText("Close"));
    expect(alertSpy).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });
});
