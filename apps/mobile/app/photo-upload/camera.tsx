import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { colors } from "@/theme/colors";

/**
 * Phase 2 shell camera — simulated. Phase 3 wires expo-camera for real.
 * For now we render a dark full-screen surface with a framing guide and a
 * Capture button that fakes a capture by writing a mock file URI to the
 * questionnaire store under the passed `slot` label, then pops back.
 */
export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { slot } = useLocalSearchParams<{ slot?: string }>();
  const setPhotoUri = useQuestionnaireStore((s) => s.setPhotoUri);

  function onCapture() {
    if (slot) {
      const safeSlot = slot.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      setPhotoUri(slot, `file:///mock-photo-${safeSlot}.jpg`);
    }
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.textPrimary }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 24 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={{ width: 44, height: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 24, color: colors.white }}>‹</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View
          accessibilityLabel="Camera framing guide"
          style={{
            width: 260,
            height: 260,
            borderWidth: 2,
            borderColor: colors.white,
            borderRadius: 16,
          }}
        />
        <Text
          style={{
            fontSize: 12,
            color: colors.white,
            marginTop: 24,
            textAlign: "center",
          }}
        >
          {slot ? `${slot} · ` : ""}Center within the frame · good lighting · no
          filters
        </Text>
      </View>

      <View
        style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
      >
        <PremiumButton label="Capture" onPress={onCapture} />
      </View>
    </View>
  );
}
