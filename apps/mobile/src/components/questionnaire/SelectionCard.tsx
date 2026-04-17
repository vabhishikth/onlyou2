import { Pressable, Text, View } from "react-native";

import { colors } from "../../theme/colors";

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
}

export function SelectionCard({
  label,
  selected,
  onPress,
  multi = false,
}: Props) {
  return (
    <Pressable
      accessibilityRole={multi ? "checkbox" : "radio"}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 56,
        borderWidth: 1.5,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accentLight : colors.white,
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: "600",
          color: colors.textPrimary,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: multi ? 6 : 999,
          borderWidth: 1.5,
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? (
          <Text
            style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}
          >
            ✓
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
