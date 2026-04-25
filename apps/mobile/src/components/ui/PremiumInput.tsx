import { useEffect, useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "../../theme/colors";

const INPUT_HEIGHT = 60;
const LABEL_REST_TOP = 20;
const LABEL_REST_FONT = 14;
const LABEL_FLOAT_TOP = 10;
const LABEL_FLOAT_FONT = 11;
const BORDER_RADIUS = 14;
const HORIZONTAL_PADDING = 16;

export interface PremiumInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function PremiumInput({
  label,
  error,
  value,
  defaultValue,
  onFocus,
  onBlur,
  editable = true,
  testID,
  ...rest
}: PremiumInputProps) {
  const [focused, setFocused] = useState(false);
  const [innerValue, setInnerValue] = useState(defaultValue ?? "");
  const currentValue = value ?? innerValue;
  const shouldFloat = focused || currentValue.length > 0;

  const labelTop = useSharedValue(
    shouldFloat ? LABEL_FLOAT_TOP : LABEL_REST_TOP,
  );
  const labelFont = useSharedValue(
    shouldFloat ? LABEL_FLOAT_FONT : LABEL_REST_FONT,
  );

  useEffect(() => {
    const config = { duration: 200, easing: Easing.out(Easing.ease) };
    labelTop.value = withTiming(
      shouldFloat ? LABEL_FLOAT_TOP : LABEL_REST_TOP,
      config,
    );
    labelFont.value = withTiming(
      shouldFloat ? LABEL_FLOAT_FONT : LABEL_REST_FONT,
      config,
    );
  }, [shouldFloat, labelTop, labelFont]);

  const labelStyle = useAnimatedStyle(() => ({
    top: labelTop.value,
    fontSize: labelFont.value,
  }));

  const borderColor = error
    ? colors.error
    : focused
      ? colors.borderFocus
      : colors.border;

  const labelColor = error
    ? colors.error
    : focused
      ? colors.accent
      : colors.textTertiary;

  return (
    <View>
      <View
        style={{
          height: INPUT_HEIGHT,
          borderRadius: BORDER_RADIUS,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: editable ? colors.white : colors.offWhite,
          paddingHorizontal: HORIZONTAL_PADDING,
          justifyContent: "center",
        }}
      >
        <Animated.Text
          style={[
            {
              position: "absolute",
              left: HORIZONTAL_PADDING,
              color: labelColor,
              fontWeight: "500",
            },
            labelStyle,
          ]}
        >
          {label}
        </Animated.Text>
        <TextInput
          testID={testID}
          editable={editable}
          value={value}
          defaultValue={defaultValue}
          onChangeText={(t) => {
            setInnerValue(t);
            rest.onChangeText?.(t);
          }}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.textMuted}
          style={{
            color: editable ? colors.textPrimary : colors.textMuted,
            fontSize: 16,
            fontWeight: "500",
            paddingTop: 22,
            // Note: floated label sits at top:10 with fontSize:11 (≈y=21).
            // TextInput needs paddingTop≥22 to keep digits clear of the label.
          }}
          {...rest}
        />
      </View>
      {error ? (
        <View style={{ marginTop: 4, paddingHorizontal: HORIZONTAL_PADDING }}>
          <Animated.Text
            style={{ color: colors.error, fontSize: 12, fontWeight: "500" }}
          >
            {error}
          </Animated.Text>
        </View>
      ) : null}
    </View>
  );
}
