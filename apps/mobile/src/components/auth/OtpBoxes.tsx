import { useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { colors } from "../../theme/colors";

interface Props {
  onComplete: (otp: string) => void;
  /**
   * Parent-controlled reset signal. When `resetSignal` changes to a new
   * numeric value, the component clears the 6 digits and refocuses the
   * hidden input so the user can immediately retype — handy after a
   * failed verify attempt.
   */
  resetSignal?: number;
}

export function OtpBoxes({ onComplete, resetSignal }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<TextInput>(null);

  // Reset + refocus whenever the parent bumps `resetSignal`. We skip the
  // initial mount so the field isn't wiped on first render.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (resetSignal === undefined) return;
    setValue("");
    inputRef.current?.focus();
  }, [resetSignal]);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 6);
    setValue(digits);
    if (digits.length === 6) {
      onComplete(digits);
    }
  };

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => {
          const filled = value[i] ?? "";
          const isActive = value.length === i;
          return (
            <View
              key={i}
              testID={`otp-cell-${i}`}
              style={{
                flex: 1,
                height: 60,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: isActive ? colors.accent : colors.border,
                backgroundColor: colors.white,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                {filled}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        testID="otp-input"
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        style={{
          position: "absolute",
          opacity: 0,
          width: 1,
          height: 1,
        }}
      />
    </View>
  );
}
