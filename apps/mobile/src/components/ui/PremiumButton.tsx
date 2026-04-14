import { Pressable, Text, View, type PressableProps } from "react-native";

import { colors } from "../../theme/colors";

type Variant = "primary" | "secondary" | "ghost" | "warm";

export interface PremiumButtonProps extends Omit<
  PressableProps,
  "children" | "style"
> {
  label: string;
  variant?: Variant;
  disabled?: boolean;
}

interface Tokens {
  bg: string;
  fg: string;
  border?: string;
}

function resolveTokens(variant: Variant, disabled: boolean): Tokens {
  if (disabled) {
    return { bg: colors.ctaDisabled, fg: colors.ctaDisabledText };
  }
  switch (variant) {
    case "primary":
      return { bg: colors.ctaPrimary, fg: colors.ctaPrimaryText };
    case "secondary":
      return {
        bg: colors.ctaSecondary,
        fg: colors.textPrimary,
        border: colors.ctaSecondaryBorder,
      };
    case "ghost":
      return { bg: "transparent", fg: colors.textPrimary };
    case "warm":
      return { bg: colors.accentWarm, fg: colors.primaryForeground };
  }
}

export function PremiumButton({
  label,
  variant = "primary",
  disabled = false,
  onPress,
  ...rest
}: PremiumButtonProps) {
  const tokens = resolveTokens(variant, disabled);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      {...rest}
    >
      {({ pressed }) => (
        <View
          style={{
            height: 56,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: tokens.bg,
            borderWidth: tokens.border ? 1.5 : 0,
            borderColor: tokens.border ?? "transparent",
            opacity: pressed && !disabled ? 0.9 : 1,
          }}
        >
          <Text
            style={{
              color: tokens.fg,
              fontSize: 16,
              fontWeight: "700",
              letterSpacing: 0.2,
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
