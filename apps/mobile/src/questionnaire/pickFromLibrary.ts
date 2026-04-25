import type { ConvexReactClient } from "convex/react";
import * as ImagePicker from "expo-image-picker";

import type { Id } from "../../../../convex/_generated/dataModel";

import { uploadAndRecordPhoto } from "@/questionnaire/uploadPhoto";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import type { PhotoSlot } from "@/types/photo-slot";

export type PickDeps = {
  convex: ConvexReactClient;
  token: string;
  consultationId: Id<"consultations">;
};

/**
 * Request media-library permission, open the system picker, upload the
 * chosen asset to Convex storage, record it on the consultation, and then
 * write the local URI to the questionnaire store under `slot`. Returns
 * `true` on success, `false` on denied permission or user cancellation so
 * the caller can decide whether to surface a toast.
 */
export async function pickFromLibrary(
  slot: PhotoSlot,
  deps: PickDeps,
): Promise<boolean> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return false;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    allowsMultipleSelection: false,
  });
  if (result.canceled || !result.assets?.[0]) return false;

  const asset = result.assets[0];
  await uploadAndRecordPhoto(deps, slot, asset.uri);
  useQuestionnaireStore.getState().setPhotoUri(slot, asset.uri);
  return true;
}
