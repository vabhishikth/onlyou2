import { Text, View } from "react-native";

import { colors } from "../../theme/colors";

interface Props {
  current: number;
  total: number;
}

export function ProgressCounter({ current, total }: Props) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.max(0, Math.min(1, current / safeTotal));
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          fontWeight: "700",
          color: colors.textTertiary,
        }}
      >
        {current} of {total}
      </Text>
      <View
        style={{
          height: 3,
          backgroundColor: colors.borderLight,
          borderRadius: 999,
          marginTop: 8,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${ratio * 100}%`,
            height: "100%",
            backgroundColor: colors.accent,
          }}
        />
      </View>
    </View>
  );
}
