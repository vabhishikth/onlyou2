import type { ConvexReactClient } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

import type { PhotoSlot } from "@/types/photo-slot";

export type UploadDeps = {
  convex: ConvexReactClient;
  token: string;
  consultationId: Id<"consultations">;
};

type SupportedMime = "image/jpeg" | "image/png" | "image/heic";

function narrowMime(raw: string | undefined): SupportedMime {
  if (raw === "image/png" || raw === "image/heic") return raw;
  return "image/jpeg";
}

/**
 * Upload a local photo to Convex storage and record it on the consultation.
 *
 * Flow (Phase 3B Task 14):
 *   1. mutation `generatePhotoUploadUrl({token})` → presigned upload URL
 *   2. POST raw bytes to that URL → `{ storageId }`
 *   3. mutation `recordPhoto({...})` → soft-overwrites prior photo for slot
 */
export async function uploadAndRecordPhoto(
  deps: UploadDeps,
  slot: PhotoSlot,
  localUri: string,
): Promise<{ photoId: Id<"photos"> }> {
  const uploadUrl = (await deps.convex.mutation(
    api.consultations.photos.generatePhotoUploadUrl,
    { token: deps.token },
  )) as string;

  // RN/Expo: fetch on a `file://` URI returns a Blob with the asset bytes.
  const fileResponse = await fetch(localUri);
  const blob = await fileResponse.blob();
  const mimeType = narrowMime(blob.type);

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: blob,
  });
  if (!uploadResponse.ok) {
    throw new Error(`upload failed: ${uploadResponse.status}`);
  }
  const { storageId } = (await uploadResponse.json()) as {
    storageId: Id<"_storage">;
  };

  const fileSizeBytes = blob.size;

  return await deps.convex.mutation(api.consultations.photos.recordPhoto, {
    token: deps.token,
    consultationId: deps.consultationId,
    slot,
    fileId: storageId,
    mimeType,
    fileSizeBytes,
  });
}
