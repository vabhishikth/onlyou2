import { PlayfairDisplay_900Black } from "@expo-google-fonts/playfair-display";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { ConvexProvider } from "convex/react";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { convex } from "@/convex/client";
import { useAuthStore } from "@/stores/auth-store";

import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);

  const pendingLinkRef = useRef<string | null>(null);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_900Black,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    InstrumentSerif_400Regular: require("../assets/fonts/InstrumentSerif-Regular.ttf"),
    InstrumentSerif_400Regular_Italic: require("../assets/fonts/InstrumentSerif-Italic.ttf"),
    JetBrainsMono_400Regular: require("../assets/fonts/JetBrainsMono-Regular.ttf"),
    JetBrainsMono_500Medium: require("../assets/fonts/JetBrainsMono-Medium.ttf"),
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (fontsLoaded && hydrated) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hydrated]);

  // Deep-link handler: onlyou://lab-results and onlyou://lab-results/<id>
  useEffect(() => {
    const handle = (url: string | null) => {
      if (!url) return;
      const { path } = Linking.parse(url);
      if (!path) return;
      // Only /lab-results and /lab-results/<id> are valid deep-link targets in
      // Phase 2.5D. Any other path (including path-traversal like
      // "lab-results/../profile") is silently ignored — quieter failure mode
      // than routing to an unknown route and avoids trusting raw URL input.
      const isAllowed =
        path === "lab-results" || /^lab-results\/[A-Za-z0-9_-]+$/.test(path);
      if (!isAllowed) return;
      if (hydrated) {
        router.push(`/${path}` as never);
      } else {
        pendingLinkRef.current = path;
      }
    };

    const sub = Linking.addEventListener("url", ({ url }) => handle(url));
    Linking.getInitialURL().then(handle);

    return () => sub.remove();
  }, [hydrated]);

  // Flush queued link once auth hydrates
  useEffect(() => {
    if (hydrated && pendingLinkRef.current) {
      router.push(`/${pendingLinkRef.current}` as never);
      pendingLinkRef.current = null;
    }
  }, [hydrated]);

  if (!fontsLoaded || !hydrated) return null;

  return (
    <ConvexProvider client={convex}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="profile" options={{ presentation: "modal" }} />
            <Stack.Screen
              name="photo-upload"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen name="lab-results" />
          </Stack>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ConvexProvider>
  );
}
