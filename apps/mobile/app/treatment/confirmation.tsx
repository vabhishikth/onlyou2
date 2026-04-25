import { router } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { useDevScenarioStore } from "@/stores/dev-scenario-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { colors } from "@/theme/colors";

export default function Confirmation() {
  const insets = useSafeAreaInsets();
  const setScenario = useDevScenarioStore((s) => s.setScenario);
  const selectedVertical = useQuestionnaireStore((s) => s.condition);

  function onDone() {
    // Flip to `reviewing` so home shows UnderReviewCard. Carry the
    // user-selected vertical so the card's label matches what they
    // actually picked, even though the underlying fixture is pinned
    // to hair-loss in Phase 2C.
    setScenario("reviewing", {
      vertical: selectedVertical ?? undefined,
      source: "flow",
    });
    router.replace("/(tabs)/home");
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 80,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 999,
          backgroundColor: colors.accentLight,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 40 }}>✓</Text>
      </View>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 30,
          color: colors.textPrimary,
          textAlign: "center",
          lineHeight: 34,
          letterSpacing: -0.6,
          marginBottom: 12,
        }}
      >
        Submitted for review
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 22,
          maxWidth: 320,
          marginBottom: 16,
        }}
      >
        Our AI is preparing your case for the doctor — usually under a minute. A
        doctor will then review within 24 hours, completely free. We&apos;ll
        notify you when your plan is ready.
      </Text>

      <View
        style={{
          width: "100%",
          maxWidth: 360,
          backgroundColor: colors.warmBg,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: colors.borderLight,
          padding: 16,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              backgroundColor: colors.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{ color: colors.white, fontSize: 11, fontWeight: "900" }}
            >
              1
            </Text>
          </View>
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              color: colors.textPrimary,
              fontWeight: "600",
            }}
          >
            AI is analyzing your symptoms
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              backgroundColor: colors.borderLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 11,
                fontWeight: "900",
              }}
            >
              2
            </Text>
          </View>
          <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary }}>
            Doctor reviews your case
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              backgroundColor: colors.borderLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 11,
                fontWeight: "900",
              }}
            >
              3
            </Text>
          </View>
          <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary }}>
            Your treatment plan is ready
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ width: "100%" }}>
        <PremiumButton variant="warm" label="Back to home" onPress={onDone} />
      </View>
    </View>
  );
}
