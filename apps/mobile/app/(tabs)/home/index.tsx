import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";

// Cross-register handoff: NewReportBanner lives in the Biomarker Editorial
// register but the home screen is its intentional entry point. This is the
// ONE permitted cross-boundary import per docs/decisions/2026-04-17-biomarker-design-register.md.
import { NewReportBanner } from "@/components/biomarker/NewReportBanner";
import { ActiveTreatmentCard } from "@/components/home/ActiveTreatmentCard";
import { DeliveryTrackingBanner } from "@/components/home/DeliveryTrackingBanner";
import { MedicationReminder } from "@/components/home/MedicationReminder";
import { PlanReadyCard } from "@/components/home/PlanReadyCard";
import { UnderReviewCard } from "@/components/home/UnderReviewCard";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { useDisplayUser } from "@/hooks/use-display-user";
import { usePatientState } from "@/hooks/use-patient-state";
import { useDevScenarioStore } from "@/stores/dev-scenario-store";
import { colors } from "@/theme/colors";

export default function HomeIndex() {
  const user = usePatientState();
  const displayUser = useDisplayUser();
  const lastSource = useDevScenarioStore((s) => s.lastSource);
  const hasUnreadReport = useDevScenarioStore((s) => s.hasUnreadReport);
  const overrideVertical = useDevScenarioStore((s) =>
    s.activeUserId ? s.verticalsByUser[s.activeUserId] : undefined,
  );

  // `useDisplayUser` swaps to the fixture identity when the dev switcher
  // flipped the scenario, so greeting / avatar / profile all read as that
  // demo user together. Phase 3 replaces the fixture layer with real
  // Convex queries.
  const useFixtureIdentity = lastSource === "dev";
  const displayName = displayUser?.name ?? user.name;
  const firstName = displayName.split(" ")[0];
  const consultation = user.consultations[0];
  const prescription = user.prescriptions[0];
  const delivery = user.deliveries[0];
  const activeSub = user.subscriptions[0];
  // Prefer the flow-submitted vertical so review/plan/active cards show
  // what the user actually picked. Dev-switcher flips ignore the override
  // and render the fixture's own vertical.
  const effectiveVertical = useFixtureIdentity
    ? consultation?.vertical
    : (overrideVertical ?? consultation?.vertical);
  const activeVertical = useFixtureIdentity
    ? activeSub?.vertical
    : (overrideVertical ?? activeSub?.vertical);

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
          activeVertical,
          dayCount(activeSub?.startedAt),
        )}
      </Text>

      {hasUnreadReport && (
        <NewReportBanner
          title="Apex Diagnostics · Panel #4207"
          subtitle="New Report · Just Now"
          onPress={() => router.push("/lab-results")}
        />
      )}

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

      {user.state === "reviewing" && consultation && effectiveVertical && (
        <UnderReviewCard
          vertical={effectiveVertical}
          hoursAgo={Math.max(
            1,
            Math.floor((Date.now() - consultation.submittedAt) / 3600000),
          )}
        />
      )}

      {user.state === "ready" &&
        consultation &&
        prescription &&
        effectiveVertical && (
          <>
            <PlanReadyCard
              vertical={effectiveVertical}
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
                28 days remaining. After 30 days the plan expires and a new
                review is required.
              </Text>
            </View>
          </>
        )}

      {user.state === "active" &&
        activeSub &&
        consultation &&
        prescription &&
        activeVertical && (
          <>
            <ActiveTreatmentCard
              vertical={activeVertical}
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
