import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { colors } from "@/theme/colors";
import type { PhotoSlot } from "@/types/photo-slot";

const SOURCE_ROWS: Array<{ source: "camera" | "library"; label: string }> = [
  { source: "camera", label: "Take photo" },
  { source: "library", label: "Choose from library" },
];

const SLOT_LABELS: Record<PhotoSlot, string> = {
  crown: "Crown",
  hairline: "Hairline",
  left_temple: "Left temple",
  right_temple: "Right temple",
};

interface Props {
  visible: boolean;
  slot: PhotoSlot;
  onSelect: (source: "camera" | "library") => void;
  onClose: () => void;
}

export function PhotoSlotBottomSheet({
  visible,
  slot,
  onSelect,
  onClose,
}: Props) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`${SLOT_LABELS[slot]} photo`}
      testID="photo-slot-sheet"
    >
      <View>
        {SOURCE_ROWS.map((row, idx) => (
          <Pressable
            key={row.source}
            accessibilityRole="button"
            accessibilityLabel={row.label}
            onPress={() => onSelect(row.source)}
            style={{
              paddingVertical: 16,
              borderBottomWidth: idx === SOURCE_ROWS.length - 1 ? 0 : 1,
              borderBottomColor: colors.borderLight,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                color: colors.textPrimary,
                fontWeight: "500",
              }}
            >
              {row.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}
