import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { colors } from "@/theme/colors";
import type { PhotoSlot } from "@/types/photo-slot";

/**
 * Real expo-camera capture screen for scalp photos. Phase 3B Task 9 —
 * replaces the Phase 2 mock that wrote a fake `file:///mock-photo-*` URI.
 *
 * Flow:
 *   1. If permission unknown → render nothing while resolving.
 *   2. If permission denied → render explainer + Grant CTA.
 *   3. If granted → live camera preview + Capture.
 *   4. After capture → preview the photo with Retake / Use this photo.
 */
export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { slot } = useLocalSearchParams<{ slot?: PhotoSlot }>();
  const [perm, requestPerm] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const setPhotoUri = useQuestionnaireStore((s) => s.setPhotoUri);

  if (!perm) {
    return <View style={{ flex: 1, backgroundColor: colors.textPrimary }} />;
  }

  if (!perm.granted) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          padding: 24,
          paddingTop: insets.top + 24,
        }}
      >
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 24,
            color: colors.textPrimary,
            marginBottom: 12,
          }}
        >
          Camera permission needed
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 20,
            marginBottom: 24,
          }}
        >
          ONLYOU needs access to your camera to capture your scalp photos for
          the doctor.
        </Text>
        <PremiumButton
          variant="warm"
          label="Grant permission"
          onPress={requestPerm}
        />
      </View>
    );
  }

  async function capture() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
    if (photo?.uri) setCaptured(photo.uri);
  }

  function confirm() {
    if (!captured || !slot) return;
    setPhotoUri(slot, captured);
    router.back();
  }

  if (captured) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.textPrimary }}>
        <Image
          source={{ uri: captured }}
          style={{ flex: 1 }}
          resizeMode="contain"
          accessibilityLabel="Captured photo preview"
        />
        <View
          style={{
            flexDirection: "row",
            padding: 16,
            gap: 12,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <PremiumButton
              variant="ghost"
              label="Retake"
              onPress={() => setCaptured(null)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PremiumButton
              variant="warm"
              label="Use this photo"
              onPress={confirm}
            />
          </View>
        </View>
      </View>
    );
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
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 16,
          paddingTop: 16,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: colors.white,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Center within the frame · good lighting · no filters
        </Text>
        <PremiumButton variant="warm" label="Capture" onPress={capture} />
      </View>
    </View>
  );
}
