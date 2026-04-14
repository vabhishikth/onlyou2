import { Pressable, Text, View } from "react-native";

import type { VerticalInfo } from "../../fixtures/verticals";
import { colors } from "../../theme/colors";

interface Props {
  info: VerticalInfo;
  isActive: boolean;
  onPress: () => void;
}

export function ConditionCard({ info, isActive, onPress }: Props) {
  const available = info.availableInPhase2;

  return (
    <Pressable
      onPress={available ? onPress : undefined}
      style={{
        flex: 1,
        minHeight: 120,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: isActive ? colors.textPrimary : colors.border,
        backgroundColor: info.tintHex,
        padding: 14,
        justifyContent: "space-between",
        opacity: available ? 1 : 0.55,
      }}
    >
      <View>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "800",
            color: colors.textPrimary,
          }}
        >
          {info.displayName}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: colors.textTertiary,
            marginTop: 2,
            fontWeight: "600",
          }}
        >
          {isActive ? "Active" : available ? info.category : "Coming soon"}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 10,
          color: colors.textTertiary,
          fontWeight: "700",
          letterSpacing: 0.3,
        }}
      >
        {available ? "Start →" : "—"}
      </Text>
    </Pressable>
  );
}
