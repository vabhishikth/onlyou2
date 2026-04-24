// Single source of truth for hair-loss photo slot identifiers. Imported
// by the consultations schema, the photos mutation, the mobile
// photo-upload screen, and the photo-slot bottom sheet.

import { v } from "convex/values";

export const PHOTO_SLOTS = [
  "crown",
  "hairline",
  "left_temple",
  "right_temple",
] as const;
export type PhotoSlot = (typeof PHOTO_SLOTS)[number];

export const photoSlotValidator = v.union(
  v.literal("crown"),
  v.literal("hairline"),
  v.literal("left_temple"),
  v.literal("right_temple"),
);

export const REQUIRED_PHOTO_COUNT = PHOTO_SLOTS.length;
