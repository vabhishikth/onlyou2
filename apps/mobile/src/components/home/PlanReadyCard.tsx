import { Pressable, Text } from "react-native";

import type { Vertical } from "../../fixtures/patient-states";
import { VERTICALS } from "../../fixtures/verticals";
import { colors } from "../../theme/colors";

interface Props {
  vertical: Vertical;
  doctorName: string;
  onPress: () => void;
}

export function PlanReadyCard({ vertical, doctorName, onPress }: Props) {
  const info = VERTICALS[vertical];
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1.5,
        borderColor: colors.accentWarm,
        backgroundColor: colors.warmBg,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: colors.accentWarm,
          fontWeight: "800",
          marginBottom: 6,
        }}
      >
        Treatment Plan Ready
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: 2,
        }}
      >
        {doctorName}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: colors.textPrimary,
          marginBottom: 8,
        }}
      >
        reviewed your case
      </Text>
      <Text
        style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}
      >
        {info.displayName} · tap to view your personalised plan
      </Text>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "800",
          color: colors.accentWarm,
          letterSpacing: 0.5,
        }}
      >
        View plan →
      </Text>
    </Pressable>
  );
}
