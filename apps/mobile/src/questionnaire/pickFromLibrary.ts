import * as ImagePicker from "expo-image-picker";

import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import type { PhotoSlot } from "@/types/photo-slot";

/**
 * Request media-library permission, open the system picker, and write the
 * chosen image's URI into the questionnaire store under `slot`. Returns
 * `true` on success, `false` on denied permission or user cancellation so
 * the caller can decide whether to surface a toast.
 */
export async function pickFromLibrary(slot: PhotoSlot): Promise<boolean> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return false;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    allowsMultipleSelection: false,
  });
  if (result.canceled || !result.assets?.[0]) return false;

  useQuestionnaireStore.getState().setPhotoUri(slot, result.assets[0].uri);
  return true;
}
