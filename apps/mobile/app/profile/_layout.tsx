import { Stack } from "expo-router";

import { colors } from "@/theme/colors";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: "",
        headerBackTitle: "",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
