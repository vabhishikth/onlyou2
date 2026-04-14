import { Text, View } from "react-native";

import type { Vertical } from "../../fixtures/patient-states";
import { VERTICALS } from "../../fixtures/verticals";
import { colors } from "../../theme/colors";

interface Props {
  vertical: Vertical;
  dayCount: number;
}

export function ActiveTreatmentCard({ vertical, dayCount }: Props) {
  const info = VERTICALS[vertical];
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.white,
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
          color: colors.textTertiary,
          fontWeight: "800",
          marginBottom: 6,
        }}
      >
        Treatment Active
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: 2,
        }}
      >
        Day {dayCount} — {info.displayName}
      </Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
        Your subscription is running. Keep logging your progress.
      </Text>
    </View>
  );
}
