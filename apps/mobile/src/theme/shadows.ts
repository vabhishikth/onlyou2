import { shadows } from '@onlyou/core/tokens/shadows'

export const nativeShadows = {
  none: shadows.none.native,
  xs: shadows.xs.native,
  sm: shadows.sm.native,
  md: shadows.md.native,
  lg: shadows.lg.native,
  xl: shadows.xl.native,
} as const

export type NativeShadow = keyof typeof nativeShadows
