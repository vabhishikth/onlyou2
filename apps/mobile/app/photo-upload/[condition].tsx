import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import type { Vertical } from "@/fixtures/patient-states";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { colors } from "@/theme/colors";

const PHOTOS_BY_CONDITION: Partial<Record<Vertical, string[]>> = {
  "hair-loss": ["Top of head", "Hairline", "Crown", "Problem areas"],
  weight: ["Full body front", "Full body side"],
};

export default function PhotoUploadContainer() {
  const insets = useSafeAreaInsets();
  const { condition } = useLocalSearchParams<{ condition: Vertical }>();
  const shots = PHOTOS_BY_CONDITION[condition] ?? [];
  const photoUris = useQuestionnaireStore((s) => s.photoUris);

  const allCaptured = shots.length > 0 && shots.every((s) => !!photoUris[s]);

  function onDone() {
    // Pop the photo-upload modal stack and hand off to the review screen.
    // The questionnaire flow lives behind this stack — dismiss it too so the
    // founder lands on review without a back button back into the camera.
    router.dismissAll();
    if (condition) {
      router.push(`/questionnaire/${condition}/review`);
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
        {shots.map((shot) => {
          const captured = !!photoUris[shot];
          return (
            <Pressable
              key={shot}
              accessibilityRole="button"
              accessibilityLabel={`Capture ${shot}`}
              onPress={() =>
                router.push({
                  pathname: "/photo-upload/camera",
                  params: { slot: shot },
                })
              }
              style={{
                width: "48%",
                aspectRatio: 1,
                borderRadius: 14,
                backgroundColor: captured ? colors.accentLight : colors.white,
                borderWidth: 1.5,
                borderColor: captured ? colors.accent : colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 28, marginBottom: 4 }}>
                {captured ? "✓" : "📷"}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: colors.textPrimary,
                }}
              >
                {shot}
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
    </View>
  );
}
