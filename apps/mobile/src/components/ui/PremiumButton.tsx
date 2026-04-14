import * as Haptics from "expo-haptics";
import { useRef } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  Animated,
  type ViewStyle,
} from "react-native";

import { colors } from "../../theme/colors";
import { radii } from "../../theme/spacing";

export type PremiumButtonVariant = "primary" | "secondary" | "ghost";

export interface PremiumButtonProps {
  label: string;
  onPress?: () => void;
  variant?: PremiumButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PremiumButton({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
}: PremiumButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      damping: 10,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
    if (!isDisabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      damping: 10,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }

  const bg =
    variant === "primary"
      ? isDisabled
        ? colors.ctaDisabled
        : colors.ctaPrimary
      : variant === "secondary"
        ? colors.ctaSecondary
        : "transparent";
  const fg =
    variant === "primary"
      ? isDisabled
        ? colors.ctaDisabledText
        : colors.ctaPrimaryText
      : colors.textPrimary;
  const borderColor =
    variant === "secondary" ? colors.ctaSecondaryBorder : "transparent";

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={{
          backgroundColor: bg,
          borderRadius: radii.base,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor,
          paddingVertical: 14,
          paddingHorizontal: 24,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 52,
        }}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <Text
            style={{
              color: fg,
              fontSize: 16,
              fontFamily: "PlusJakartaSans_600SemiBold",
            }}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
