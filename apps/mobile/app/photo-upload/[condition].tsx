import { useConvex } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Camera, Check } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PhotoSlotBottomSheet } from "@/components/questionnaire/PhotoSlotBottomSheet";
import { PremiumButton } from "@/components/ui/PremiumButton";
import type { Vertical } from "@/fixtures/patient-states";
import { pickFromLibrary } from "@/questionnaire/pickFromLibrary";
import { useAuthStore } from "@/stores/auth-store";
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
  const consultationId = useQuestionnaireStore((s) => s.consultationId);
  const token = useAuthStore((s) => s.token);
  const convex = useConvex();
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
      // store subscription once the picker resolves and the upload finishes.
      if (token && consultationId) {
        pickFromLibrary(slot, { convex, token, consultationId }).catch(
          (err: unknown) => {
            Alert.alert(
              "Upload failed",
              err instanceof Error ? err.message : String(err),
            );
          },
        );
      }
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
        {slots.map((slot, idx) => {
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
                borderRadius: 16,
                backgroundColor: captured ? colors.accentLight : colors.warmBg,
                borderWidth: captured ? 2 : 1,
                borderColor: captured ? colors.accent : colors.borderLight,
                borderStyle: captured ? "solid" : "dashed",
                alignItems: "center",
                justifyContent: "center",
                padding: 12,
              }}
            >
              <Text
                style={{
                  position: "absolute",
                  top: 10,
                  left: 12,
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 1.2,
                  color: captured ? colors.accent : colors.textTertiary,
                }}
              >
                {`${idx + 1}/${slots.length}`}
              </Text>
              {captured ? (
                <Check size={36} color={colors.accent} strokeWidth={2.5} />
              ) : (
                <Camera
                  size={36}
                  color={colors.textSecondary}
                  strokeWidth={1.5}
                />
              )}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: colors.textPrimary,
                  marginTop: 10,
                  textAlign: "center",
                }}
              >
                {label}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: captured ? colors.accent : colors.textTertiary,
                  marginTop: 2,
                }}
              >
                {captured ? "Captured" : "Tap to add"}
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
