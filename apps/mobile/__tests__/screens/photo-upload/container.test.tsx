import { fireEvent, render } from "@testing-library/react-native";

import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { TestProvider } from "@/test-utils";

const mockParams: { condition: string } = { condition: "hair-loss" };

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

const PhotoUploadContainer =
  require("../../../app/photo-upload/[condition]").default;

describe("Photo upload container", () => {
  beforeEach(() => {
    (router.push as jest.Mock).mockClear();
    (router.dismissAll as jest.Mock).mockClear();
    useQuestionnaireStore.getState().reset();
  });

  it("renders one tile per canonical slot for hair-loss", () => {
    mockParams.condition = "hair-loss";
    const { getByLabelText } = render(
      <TestProvider scenario="new">
        <PhotoUploadContainer />
      </TestProvider>,
    );
    expect(getByLabelText("Capture Crown")).toBeTruthy();
    expect(getByLabelText("Capture Hairline")).toBeTruthy();
    expect(getByLabelText("Capture Left temple")).toBeTruthy();
    expect(getByLabelText("Capture Right temple")).toBeTruthy();
  });

  it("opens the bottom sheet when a tile is tapped, then routes to camera with the canonical slot id", () => {
    mockParams.condition = "hair-loss";
    const { getByLabelText } = render(
      <TestProvider scenario="new">
        <PhotoUploadContainer />
      </TestProvider>,
    );
    fireEvent.press(getByLabelText("Capture Crown"));
    // Sheet rows render the source labels.
    fireEvent.press(getByLabelText("Take photo"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/photo-upload/camera",
      params: { slot: "crown" },
    });
  });

  it("disables Done until every canonical slot is captured, then routes to review", () => {
    mockParams.condition = "hair-loss";
    // Pre-populate three of four canonical slots — still disabled.
    const store = useQuestionnaireStore.getState();
    store.setPhotoUri("crown", "file:///mock-photo-crown.jpg");
    store.setPhotoUri("hairline", "file:///mock-photo-hairline.jpg");
    store.setPhotoUri("left_temple", "file:///mock-photo-left-temple.jpg");

    const { getByText, rerender } = render(
      <TestProvider scenario="new">
        <PhotoUploadContainer />
      </TestProvider>,
    );
    fireEvent.press(getByText("Done"));
    expect(router.push).not.toHaveBeenCalled();

    // Capture the last photo and re-render.
    useQuestionnaireStore
      .getState()
      .setPhotoUri("right_temple", "file:///mock-photo-right-temple.jpg");
    rerender(
      <TestProvider scenario="new">
        <PhotoUploadContainer />
      </TestProvider>,
    );
    fireEvent.press(getByText("Done"));
    expect(router.dismissAll).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith("/questionnaire/hair-loss/review");
  });
});
