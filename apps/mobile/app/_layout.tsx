import { PlayfairDisplay_900Black } from "@expo-google-fonts/playfair-display";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ScenarioSwitcher } from "@/dev/scenario-switcher";

import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_900Black,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
        {__DEV__ ? (
          <ScenarioSwitcher
            visible={switcherOpen}
            onClose={() => setSwitcherOpen(false)}
          />
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
