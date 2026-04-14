import { router } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { colors } from "@/theme/colors";

export default function Confirmation() {
  const insets = useSafeAreaInsets();

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
          marginBottom: 8,
        }}
      >
        A doctor will review your case within 24 hours — completely free.
        We&apos;ll notify you when your plan is ready.
      </Text>

      <View style={{ flex: 1 }} />

      <View style={{ width: "100%" }}>
        <PremiumButton
          label="Back to home"
          onPress={() => router.replace("/(tabs)/home")}
        />
      </View>
    </View>
  );
}
