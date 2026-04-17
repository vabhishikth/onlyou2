import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { useDisplayUser } from "@/hooks/use-display-user";
import { useSignIn } from "@/hooks/use-signin";
import { colors } from "@/theme/colors";

export default function ProfileIndex() {
  const insets = useSafeAreaInsets();
  const user = useDisplayUser();
  const { signOut } = useSignIn();

  async function onSignOut() {
    await signOut();
    router.replace("/(auth)/welcome" as never);
  }

  const rows = [
    { title: "Personal info", phase: "Plan 2D" },
    { title: "Subscriptions", phase: "Plan 2D" },
    { title: "Prescriptions", phase: "Plan 2D" },
    { title: "Orders", phase: "Plan 2D" },
    { title: "Lab results", phase: "Plan 2D" },
    { title: "Addresses", phase: "Plan 2D" },
    { title: "Payment methods", phase: "Plan 2D" },
    { title: "Notifications", phase: "Plan 2D" },
    { title: "Wallet", phase: "Phase 3" },
    ...(user?.gender === "female"
      ? [{ title: "Period tracker", phase: "PCOS phase" }]
      : []),
    { title: "Legal", phase: "Phase 8" },
    { title: "Help & support", phase: "Phase 8" },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 24,
      }}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          letterSpacing: -0.6,
          marginBottom: 24,
        }}
      >
        Account
      </Text>

      {user ? (
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            {user.name ?? "Unknown"}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.textTertiary,
              marginTop: 2,
            }}
          >
            {user.phone} · {user.gender ?? "—"}
          </Text>
        </View>
      ) : null}

      {rows.map((row) => (
        <Pressable
          key={row.title}
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              color: colors.textPrimary,
              fontWeight: "600",
            }}
          >
            {row.title}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: colors.textTertiary,
              fontWeight: "700",
            }}
          >
            {row.phase} →
          </Text>
        </Pressable>
      ))}

      <View style={{ marginTop: 32 }}>
        <PremiumButton
          label="Sign out"
          variant="secondary"
          onPress={onSignOut}
        />
      </View>
    </ScrollView>
  );
}
