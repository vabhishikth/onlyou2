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

  it("renders one tile per required shot for hair-loss", () => {
    mockParams.condition = "hair-loss";
    const { getByLabelText } = render(
      <TestProvider scenario="new">
        <PhotoUploadContainer />
      </TestProvider>,
    );
    expect(getByLabelText("Capture Top of head")).toBeTruthy();
    expect(getByLabelText("Capture Hairline")).toBeTruthy();
    expect(getByLabelText("Capture Crown")).toBeTruthy();
    expect(getByLabelText("Capture Problem areas")).toBeTruthy();
  });

  it("pushes to camera with the slot when a tile is tapped", () => {
    mockParams.condition = "hair-loss";
    const { getByLabelText } = render(
      <TestProvider scenario="new">
        <PhotoUploadContainer />
      </TestProvider>,
    );
    fireEvent.press(getByLabelText("Capture Top of head"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/photo-upload/camera",
      params: { slot: "Top of head" },
    });
  });

  it("disables Done until every required shot is captured, then routes to review", () => {
    mockParams.condition = "hair-loss";
    // Pre-populate three of four slots — still disabled.
    const store = useQuestionnaireStore.getState();
    store.setPhotoUri("Top of head", "file:///mock-photo-top-of-head.jpg");
    store.setPhotoUri("Hairline", "file:///mock-photo-hairline.jpg");
    store.setPhotoUri("Crown", "file:///mock-photo-crown.jpg");

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
      .setPhotoUri("Problem areas", "file:///mock-photo-problem-areas.jpg");
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
