import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { ActiveTreatmentCard } from "@/components/home/ActiveTreatmentCard";
import { DeliveryTrackingBanner } from "@/components/home/DeliveryTrackingBanner";
import { MedicationReminder } from "@/components/home/MedicationReminder";
import { PlanReadyCard } from "@/components/home/PlanReadyCard";
import { UnderReviewCard } from "@/components/home/UnderReviewCard";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function HomeIndex() {
  const user = usePatientState();
  const currentUser = useCurrentUser();

  // Prefer the signed-in user's real name; fall back to the fixture when
  // signed out or while the query is loading. Phase 3 replaces the whole
  // fixture layer with real Convex queries.
  const displayName = currentUser?.name ?? user.name;
  const firstName = displayName.split(" ")[0];
  const consultation = user.consultations[0];
  const prescription = user.prescriptions[0];
  const delivery = user.deliveries[0];
  const activeSub = user.subscriptions[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          lineHeight: 32,
          letterSpacing: -0.6,
          marginTop: 8,
          marginBottom: 4,
        }}
      >
        {greetingFor(user.state)}, {firstName}.
      </Text>
      <Text
        style={{ fontSize: 13, color: colors.textTertiary, marginBottom: 20 }}
      >
        {subtitleFor(
          user.state,
          activeSub?.vertical,
          dayCount(activeSub?.startedAt),
        )}
      </Text>

      {user.state === "new" && (
        <View
          style={{
            alignItems: "center",
            paddingVertical: 40,
          }}
        >
          <Text style={{ fontSize: 48, color: colors.accent, marginBottom: 8 }}>
            ◌
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            No treatments yet
          </Text>
          <View style={{ width: "100%", gap: 10 }}>
            <PremiumButton
              label="Start your first assessment"
              onPress={() => router.push("/(tabs)/explore")}
            />
            <PremiumButton
              label="How it works"
              variant="ghost"
              onPress={() => router.push("/(tabs)/explore")}
            />
          </View>
        </View>
      )}

      {user.state === "reviewing" && consultation && (
        <UnderReviewCard
          vertical={consultation.vertical}
          hoursAgo={Math.max(
            1,
            Math.floor((Date.now() - consultation.submittedAt) / 3600000),
          )}
        />
      )}

      {user.state === "ready" && consultation && prescription && (
        <>
          <PlanReadyCard
            vertical={consultation.vertical}
            doctorName={prescription.doctorName}
            onPress={() => router.push("/treatment/plan-ready")}
          />
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.white,
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: colors.textTertiary,
                fontWeight: "800",
                marginBottom: 6,
              }}
            >
              Plan valid
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              28 days remaining. After 30 days the plan expires and a new review
              is required.
            </Text>
          </View>
        </>
      )}

      {user.state === "active" && activeSub && consultation && prescription && (
        <>
          <ActiveTreatmentCard
            vertical={activeSub.vertical}
            dayCount={dayCount(activeSub.startedAt)}
          />
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.white,
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: colors.textTertiary,
                fontWeight: "800",
                marginBottom: 10,
              }}
            >
              Today&apos;s medications
            </Text>
            {prescription.items.map((item, idx) => (
              <MedicationReminder
                key={item.name}
                name={item.name}
                schedule={item.schedule}
                done={idx === 0}
              />
            ))}
          </View>
          {delivery && (
            <DeliveryTrackingBanner
              status={delivery.status}
              onPress={() =>
                router.push(`/(tabs)/home/tracking/${delivery.orderId}`)
              }
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

function greetingFor(state: string): string {
  if (state === "new") return "Welcome";
  if (state === "reviewing") return "Thanks for submitting";
  if (state === "ready") return "Great news";
  return "Good morning";
}

function subtitleFor(
  state: string,
  vertical: string | undefined,
  day: number,
): string {
  if (state === "new") return "Private care, on your terms.";
  if (state === "reviewing") return "Your case is in review.";
  if (state === "ready") return "Your plan is ready.";
  return `Day ${day} · ${vertical ?? "—"}`;
}

function dayCount(startedAt: number | undefined): number {
  if (!startedAt) return 0;
  return Math.max(1, Math.floor((Date.now() - startedAt) / 86400000));
}
