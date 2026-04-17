import { router } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { useDevScenarioStore } from "@/stores/dev-scenario-store";
import { colors } from "@/theme/colors";

export default function SubscriptionConfirmed() {
  const insets = useSafeAreaInsets();
  const setScenario = useDevScenarioStore((s) => s.setScenario);

  function onDone() {
    // Flip to `active` so home reflects the active subscription state
    // after the mocked purchase. `source: "flow"` keeps the greeting on
    // the real user's name; the vertical override persisted at submit
    // time carries through without being changed here.
    setScenario("active", { source: "flow" });
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
          backgroundColor: colors.warmBg,
          borderWidth: 2,
          borderColor: colors.accentWarm,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 36 }}>🎉</Text>
      </View>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 30,
          color: colors.textPrimary,
          textAlign: "center",
          marginBottom: 12,
          letterSpacing: -0.6,
        }}
      >
        You&apos;re all set
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 22,
          maxWidth: 320,
        }}
      >
        We&apos;re preparing your first medication kit. Delivery in 2–4 business
        days. You can message your doctor any time.
      </Text>

      <View style={{ flex: 1 }} />

      <View style={{ width: "100%" }}>
        <PremiumButton variant="warm" label="Go to home" onPress={onDone} />
      </View>
    </View>
  );
}
