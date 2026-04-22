import { biomarkerPalette } from "@onlyou/core/tokens/biomarker";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

export default function LabResultsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: biomarkerPalette.bg }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: biomarkerPalette.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="[id]" />
      </Stack>
    </View>
  );
}
