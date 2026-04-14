import { fireEvent, render } from "@testing-library/react-native";

import { OtpBoxes } from "@/components/auth/OtpBoxes";

describe("<OtpBoxes>", () => {
  it("renders 6 cells", () => {
    const { getAllByTestId } = render(<OtpBoxes onComplete={() => {}} />);
    expect(getAllByTestId(/otp-cell-/)).toHaveLength(6);
  });

  it("fires onComplete when 6 digits are entered", () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<OtpBoxes onComplete={onComplete} />);
    fireEvent.changeText(getByTestId("otp-input"), "000000");
    expect(onComplete).toHaveBeenCalledWith("000000");
  });
});
