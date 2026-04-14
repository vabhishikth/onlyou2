import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/colors";

export interface PlaceholderScreenProps {
  title: string;
  phase: string;
  reason?: string;
}

export function PlaceholderScreen({
  title,
  phase,
  reason,
}: PlaceholderScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 16,
        paddingHorizontal: 24,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 999,
          backgroundColor: colors.accentLight,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 32, color: colors.accent }}>◌</Text>
      </View>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.accent,
          fontWeight: "700",
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        Coming in {phase}
      </Text>
      {reason ? (
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
            lineHeight: 20,
            maxWidth: 280,
          }}
        >
          {reason}
        </Text>
      ) : null}
    </View>
  );
}
