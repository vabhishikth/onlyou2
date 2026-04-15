import { router, Tabs } from "expo-router";
import { Activity, Compass, Home, MessageCircle } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScenarioSwitcher } from "@/dev/scenario-switcher";
import { useCurrentUser } from "@/hooks/use-current-user";
import { colors } from "@/theme/colors";

/**
 * 4 tabs + profile avatar in the header. Profile stack is NOT a tab —
 * it's accessed via the avatar push. Triple-tap the `onlyou` wordmark
 * in __DEV__ to open the scenario switcher.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const user = useCurrentUser();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const tripleTap = Gesture.Tap()
    .numberOfTaps(3)
    .runOnJS(true)
    .onEnd(() => {
      if (__DEV__) setSwitcherOpen(true);
    });

  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((s) => s[0])
        .join("")
        .toUpperCase()
    : "•";

  return (
    <>
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 24,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.background,
        }}
      >
        <GestureDetector gesture={tripleTap}>
          <Text
            style={{
              fontFamily: "PlayfairDisplay_900Black",
              fontSize: 22,
              letterSpacing: -0.8,
              color: colors.textPrimary,
            }}
          >
            onlyou
          </Text>
        </GestureDetector>
        <Pressable
          onPress={() => router.push("/profile" as never)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: colors.textPrimary,
            backgroundColor: colors.accentLight,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "800",
              color: colors.textPrimary,
            }}
          >
            {initials}
          </Text>
        </Pressable>
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            height: 78,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.white,
          },
          tabBarActiveTintColor: colors.textPrimary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <Home color={color} size={22} strokeWidth={1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ color }) => (
              <Compass color={color} size={22} strokeWidth={1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: "Activity",
            tabBarIcon: ({ color }) => (
              <Activity color={color} size={22} strokeWidth={1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: "Messages",
            tabBarIcon: ({ color }) => (
              <MessageCircle color={color} size={22} strokeWidth={1.75} />
            ),
          }}
        />
      </Tabs>

      {__DEV__ ? (
        <ScenarioSwitcher
          visible={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
        />
      ) : null}
    </>
  );
}
