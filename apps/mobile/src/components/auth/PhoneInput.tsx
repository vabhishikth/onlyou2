import { Text, View } from "react-native";

import { colors } from "../../theme/colors";
import { PremiumInput, type PremiumInputProps } from "../ui/PremiumInput";

export interface PhoneInputProps extends Omit<
  PremiumInputProps,
  "label" | "keyboardType" | "onChangeText"
> {
  onChangeText?: (digits: string) => void;
}

export function PhoneInput({ onChangeText, testID, ...rest }: PhoneInputProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        style={{
          height: 60,
          paddingHorizontal: 16,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.white,
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: colors.textPrimary,
          }}
        >
          +91
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <PremiumInput
          label="Phone number"
          keyboardType="number-pad"
          testID={testID}
          onChangeText={(text) => {
            const digits = text.replace(/\D/g, "").slice(0, 10);
            onChangeText?.(digits);
          }}
          {...rest}
        />
      </View>
    </View>
  );
}
