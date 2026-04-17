import { render } from "@testing-library/react-native";

import { ActiveTreatmentCard } from "@/components/home/ActiveTreatmentCard";
import { DeliveryTrackingBanner } from "@/components/home/DeliveryTrackingBanner";
import { MedicationReminder } from "@/components/home/MedicationReminder";
import { PlanReadyCard } from "@/components/home/PlanReadyCard";
import { UnderReviewCard } from "@/components/home/UnderReviewCard";

describe("home cards", () => {
  it("UnderReviewCard shows the vertical + wait time", () => {
    const { getByText } = render(
      <UnderReviewCard vertical="pcos" hoursAgo={4} />,
    );
    expect(getByText(/Under Review/i)).toBeTruthy();
    expect(getByText(/PCOS/i)).toBeTruthy();
  });

  it("PlanReadyCard shows doctor name + CTA", () => {
    const { getByText } = render(
      <PlanReadyCard
        doctorName="Dr. Priya Sharma"
        vertical="hair-loss"
        onPress={() => {}}
      />,
    );
    expect(getByText("Dr. Priya Sharma")).toBeTruthy();
    expect(getByText(/View plan/i)).toBeTruthy();
  });

  it("ActiveTreatmentCard shows the day count", () => {
    const { getByText } = render(
      <ActiveTreatmentCard vertical="pcos" dayCount={14} />,
    );
    expect(getByText(/Day 14/)).toBeTruthy();
  });

  it("MedicationReminder shows name + schedule", () => {
    const { getByText } = render(
      <MedicationReminder
        name="Metformin 500mg"
        schedule="Twice daily"
        done={false}
      />,
    );
    expect(getByText("Metformin 500mg")).toBeTruthy();
    expect(getByText(/Twice daily/)).toBeTruthy();
  });

  it("DeliveryTrackingBanner shows status", () => {
    const { getByText } = render(
      <DeliveryTrackingBanner status="out-for-delivery" onPress={() => {}} />,
    );
    expect(getByText(/Out for delivery/i)).toBeTruthy();
  });
});
