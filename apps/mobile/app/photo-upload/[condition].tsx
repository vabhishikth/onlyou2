import { router, useLocalSearchParams } from "expo-router";
import { Camera, Check } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PhotoSlotBottomSheet } from "@/components/questionnaire/PhotoSlotBottomSheet";
import { PremiumButton } from "@/components/ui/PremiumButton";
import type { Vertical } from "@/fixtures/patient-states";
import { pickFromLibrary } from "@/questionnaire/pickFromLibrary";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { colors } from "@/theme/colors";
import { PHOTO_SLOTS, type PhotoSlot } from "@/types/photo-slot";

const SLOT_LABELS: Record<PhotoSlot, string> = {
  crown: "Crown",
  hairline: "Hairline",
  left_temple: "Left temple",
  right_temple: "Right temple",
};

// Phase 3B locks the canonical 4-slot vocabulary for hair-loss. Other
// verticals (weight etc.) are out of scope until their own questionnaires
// land — drop them rather than keeping placeholder labels.
const SLOTS_BY_CONDITION: Partial<Record<Vertical, readonly PhotoSlot[]>> = {
  "hair-loss": PHOTO_SLOTS,
};

export default function PhotoUploadContainer() {
  const insets = useSafeAreaInsets();
  const { condition } = useLocalSearchParams<{ condition: Vertical }>();
  const slots = SLOTS_BY_CONDITION[condition] ?? [];
  const photoUris = useQuestionnaireStore((s) => s.photoUris);
  const [activeSlot, setActiveSlot] = useState<PhotoSlot | null>(null);

  const allCaptured = slots.length > 0 && slots.every((s) => !!photoUris[s]);

  function onDone() {
    // Pop the photo-upload modal stack and hand off to the review screen.
    // The questionnaire flow lives behind this stack — dismiss it too so the
    // founder lands on review without a back button back into the camera.
    router.dismissAll();
    if (condition) {
      router.push(`/questionnaire/${condition}/review`);
    }
  }

  function handleSelect(source: "camera" | "library") {
    const slot = activeSlot;
    if (!slot) return;
    setActiveSlot(null);
    if (source === "camera") {
      router.push({
        pathname: "/photo-upload/camera",
        params: { slot },
      });
    } else {
      // Fire-and-forget: caller stays on the list; the row updates via the
      // store subscription once the picker resolves.
      void pickFromLibrary(slot);
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 16,
        paddingHorizontal: 24,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        style={{ width: 44, height: 44, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
      </Pressable>

      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 28,
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 4,
          letterSpacing: -0.6,
        }}
      >
        Photos for your review
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: colors.textSecondary,
          marginBottom: 24,
          lineHeight: 19,
        }}
      >
        Good lighting, no filters. These help your doctor make an accurate
        diagnosis.
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {slots.map((slot) => {
          const captured = !!photoUris[slot];
          const label = SLOT_LABELS[slot];
          return (
            <Pressable
              key={slot}
              accessibilityRole="button"
              accessibilityLabel={`Capture ${label}`}
              onPress={() => setActiveSlot(slot)}
              style={{
                flexBasis: "48%",
                flexGrow: 1,
                aspectRatio: 1,
                borderRadius: 14,
                backgroundColor: captured ? colors.accentLight : colors.white,
                borderWidth: 1.5,
                borderColor: captured ? colors.accent : colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {captured ? (
                <Check size={28} color={colors.accent} strokeWidth={2.5} />
              ) : (
                <Camera
                  size={28}
                  color={colors.textSecondary}
                  strokeWidth={1.75}
                />
              )}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.textPrimary,
                  marginTop: 8,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      <PremiumButton
        variant="warm"
        label="Done"
        disabled={!allCaptured}
        onPress={onDone}
      />

      {activeSlot ? (
        <PhotoSlotBottomSheet
          visible={activeSlot !== null}
          slot={activeSlot}
          onSelect={handleSelect}
          onClose={() => setActiveSlot(null)}
        />
      ) : null}
    </View>
  );
}
