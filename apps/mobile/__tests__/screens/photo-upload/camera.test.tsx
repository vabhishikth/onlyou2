import { fireEvent, render } from "@testing-library/react-native";

import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { TestProvider } from "@/test-utils";

const mockParams: { slot?: string } = { slot: "Top of head" };

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    dismissAll: jest.fn(),
  },
  useLocalSearchParams: () => mockParams,
}));

const { router } = require("expo-router");

const CameraScreen = require("../../../app/photo-upload/camera").default;

describe("Photo upload camera screen (simulated)", () => {
  beforeEach(() => {
    (router.back as jest.Mock).mockClear();
    useQuestionnaireStore.getState().reset();
  });

  it("writes a mock URI to the store and pops back on Capture", () => {
    mockParams.slot = "Top of head";
    const { getByText } = render(
      <TestProvider scenario="new">
        <CameraScreen />
      </TestProvider>,
    );
    fireEvent.press(getByText("Capture"));

    const uris = useQuestionnaireStore.getState().photoUris;
    expect(uris["Top of head"]).toBe("file:///mock-photo-top-of-head.jpg");
    expect(router.back).toHaveBeenCalled();
  });

  it("still pops back even when no slot param is supplied", () => {
    mockParams.slot = undefined;
    const { getByText } = render(
      <TestProvider scenario="new">
        <CameraScreen />
      </TestProvider>,
    );
    fireEvent.press(getByText("Capture"));
    expect(Object.keys(useQuestionnaireStore.getState().photoUris).length).toBe(
      0,
    );
    expect(router.back).toHaveBeenCalled();
  });
});
