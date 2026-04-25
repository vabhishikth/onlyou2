import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { TestProvider } from "@/test-utils";

const mockParams: { slot?: string } = { slot: "crown" };

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    dismissAll: jest.fn(),
  },
  useLocalSearchParams: () => mockParams,
}));

// Override the global expo-camera mock so we can stub takePictureAsync.
jest.mock("expo-camera", () => {
  const React = require("react");
  return {
    CameraView: React.forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({
        takePictureAsync: jest
          .fn()
          .mockResolvedValue({ uri: "file:///captured-photo.jpg" }),
      }));
      return null;
    }),
    useCameraPermissions: () => [
      { granted: true, status: "granted" },
      jest.fn(),
    ],
  };
});

const { router } = require("expo-router");

const CameraScreen = require("../../../app/photo-upload/camera").default;

describe("Photo upload camera screen (real expo-camera)", () => {
  beforeEach(() => {
    (router.back as jest.Mock).mockClear();
    useQuestionnaireStore.getState().reset();
  });

  it("captures, then writes URI to store and pops back on confirm", async () => {
    mockParams.slot = "crown";
    const { getByText } = render(
      <TestProvider scenario="new">
        <CameraScreen />
      </TestProvider>,
    );
    fireEvent.press(getByText("Capture"));

    // Wait for the captured-state preview to appear.
    await waitFor(() => getByText("Use this photo"));
    fireEvent.press(getByText("Use this photo"));

    const uris = useQuestionnaireStore.getState().photoUris;
    expect(uris["crown"]).toBe("file:///captured-photo.jpg");
    expect(router.back).toHaveBeenCalled();
  });

  it("retake clears the captured preview without writing to store", async () => {
    mockParams.slot = "hairline";
    const { getByText, queryByText } = render(
      <TestProvider scenario="new">
        <CameraScreen />
      </TestProvider>,
    );
    fireEvent.press(getByText("Capture"));
    await waitFor(() => getByText("Retake"));
    fireEvent.press(getByText("Retake"));

    expect(queryByText("Use this photo")).toBeNull();
    expect(Object.keys(useQuestionnaireStore.getState().photoUris).length).toBe(
      0,
    );
  });
});
