import { Text, View } from "react-native";

import type { Vertical } from "../../fixtures/patient-states";
import { VERTICALS } from "../../fixtures/verticals";
import { colors } from "../../theme/colors";

interface Props {
  vertical: Vertical;
  hoursAgo: number;
}

export function UnderReviewCard({ vertical, hoursAgo }: Props) {
  const info = VERTICALS[vertical];
  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: colors.accent,
        backgroundColor: colors.accentLight,
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
          color: colors.accent,
          fontWeight: "800",
          marginBottom: 6,
        }}
      >
        Under Review
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: colors.textPrimary,
          marginBottom: 4,
        }}
      >
        A doctor is reviewing your {info.displayName} case
      </Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
        Submitted {hoursAgo}h ago · SLA 24h
      </Text>
    </View>
  );
}
