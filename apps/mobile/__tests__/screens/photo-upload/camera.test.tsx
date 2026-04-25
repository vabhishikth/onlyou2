import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { Id } from "../../../../../convex/_generated/dataModel";

import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { TestProvider } from "@/test-utils";

const TEST_CONSULT_ID = "test-consultation-id" as Id<"consultations">;

const mockParams: { slot?: string } = { slot: "crown" };

// Phase 3B: confirm() now uploads via fetch before writing to the store.
// Stub global fetch with a permissive response shape that matches both
// `fetch(localUri).blob()` and `fetch(uploadUrl, ...).json() → {storageId}`.
const originalFetch = global.fetch;
beforeAll(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    blob: jest.fn().mockResolvedValue({ size: 1024, type: "image/jpeg" }),
    json: jest.fn().mockResolvedValue({ storageId: "test-storage-id" }),
  }) as unknown as typeof fetch;
});
afterAll(() => {
  global.fetch = originalFetch;
});

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
    useQuestionnaireStore.getState().setConsultationId(TEST_CONSULT_ID);
    useAuthStore.setState({ token: "test-token", hydrated: true });
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

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    const uris = useQuestionnaireStore.getState().photoUris;
    expect(uris["crown"]).toBe("file:///captured-photo.jpg");
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
