import { router } from "expo-router";
import { useEffect } from "react";
import { View, Animated, Pressable, Text } from "react-native";

import { Logo } from "../src/components/ui/Logo";
import { ScreenWrapper } from "../src/components/ui/ScreenWrapper";
import { colors } from "../src/theme/colors";

export default function Index() {
  const opacity = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <ScreenWrapper scroll={false}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        <Animated.View style={{ opacity, alignItems: "center" }}>
          <Logo size={56} />
        </Animated.View>
        <Pressable
          onPress={() => router.push("/design")}
          style={{ paddingVertical: 12, paddingHorizontal: 20 }}
        >
          <Text
            style={{
              fontSize: 14,
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Tap to explore design system
          </Text>
        </Pressable>
      </View>
    </ScreenWrapper>
  );
}
