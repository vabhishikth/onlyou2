import { Pressable, Text, type PressableProps } from "react-native";

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

const variantStyles: Record<
  Variant,
  { bg: string; fg: string; border?: string }
> = {
  primary: { bg: colors.ctaPrimary, fg: colors.ctaPrimaryText },
  secondary: {
    bg: colors.ctaSecondary,
    fg: colors.textPrimary,
    border: colors.ctaSecondaryBorder,
  },
  ghost: { bg: "transparent", fg: colors.textPrimary },
  warm: { bg: colors.accentWarm, fg: colors.primaryForeground },
};

export function PremiumButton({
  label,
  variant = "primary",
  disabled = false,
  onPress,
  ...rest
}: PremiumButtonProps) {
  const style = disabled
    ? { bg: colors.ctaDisabled, fg: colors.ctaDisabledText }
    : variantStyles[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 56,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: style.bg,
        borderWidth: style.border ? 1.5 : 0,
        borderColor: style.border,
        opacity: pressed && !disabled ? 0.9 : 1,
      })}
      {...rest}
    >
      <Text
        style={{
          color: style.fg,
          fontSize: 16,
          fontWeight: "700",
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
