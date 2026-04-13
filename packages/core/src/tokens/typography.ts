export const fontFamilies = {
  serif: 'Playfair Display',
  sans: 'Plus Jakarta Sans',
} as const

export const fontWeights = {
  regular: 400, medium: 500, semibold: 600, bold: 700, black: 900,
} as const

export const fontSizes = {
  xs: 11, sm: 13, base: 15, md: 16, lg: 18, xl: 20,
  '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 36, '6xl': 48, '7xl': 56, '8xl': 72, logo: 36,
} as const

export const lineHeights = {
  tight: 1.1, snug: 1.2, normal: 1.5, relaxed: 1.6, loose: 1.8,
} as const

export const letterSpacing = {
  tighter: -1.5, tight: -0.5, normal: 0, wide: 0.5, wider: 1, widest: 2,
} as const

export type FontFamily = keyof typeof fontFamilies
export type FontWeight = keyof typeof fontWeights
export type FontSize = keyof typeof fontSizes
