export const FEATURE_FLAGS = [
  'VIDEO_CONSULTATION_ENABLED', 'THIRD_PARTY_LAB_APIS', 'SHIPROCKET_DELHIVERY',
  'COLD_CHAIN_TRACKING', 'FACE_MATCH_VERIFICATION', 'ABHA_INTEGRATION', 'GPS_CHECKIN_NURSES',
] as const
export type FeatureFlag = (typeof FEATURE_FLAGS)[number]
export const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  VIDEO_CONSULTATION_ENABLED: false,
  THIRD_PARTY_LAB_APIS: false,
  SHIPROCKET_DELHIVERY: false,
  COLD_CHAIN_TRACKING: false,
  FACE_MATCH_VERIFICATION: false,
  ABHA_INTEGRATION: false,
  GPS_CHECKIN_NURSES: false,
}
export function isEnabled(flags: Record<FeatureFlag, boolean>, flag: FeatureFlag): boolean {
  return flags[flag] === true
}
