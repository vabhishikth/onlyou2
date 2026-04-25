// Local mirror of convex/lib/photoSlot.ts's PhotoSlot union. The Convex
// module is the authoritative source; this file exists because mobile and
// convex are separate TS projects and a 4-string union is cheaper to
// duplicate than to plumb through @onlyou/core.
//
// Keep in sync with convex/lib/photoSlot.ts → PHOTO_SLOTS.
export type PhotoSlot = "crown" | "hairline" | "left_temple" | "right_temple";
