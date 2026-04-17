import { Text, View } from "react-native";

import { colors } from "../../theme/colors";

interface Props {
  name: string;
  schedule: string;
  done: boolean;
}

export function MedicationReminder({ name, schedule, done }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: done ? colors.textPrimary : colors.border,
          backgroundColor: done ? colors.textPrimary : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done ? (
          <Text style={{ color: colors.white, fontSize: 11 }}>✓</Text>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: colors.textPrimary,
          }}
        >
          {name}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textTertiary }}>
          {schedule}
        </Text>
      </View>
    </View>
  );
}
