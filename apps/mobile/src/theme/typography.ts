import { fontSizes, fontWeights, lineHeights, letterSpacing } from '@onlyou/core/tokens/typography'

export { fontSizes, fontWeights, lineHeights, letterSpacing }

export const fontFamilies = {
  serifBlack: 'PlayfairDisplay_900Black',
  serifBold: 'PlayfairDisplay_700Bold',
  serifSemibold: 'PlayfairDisplay_600SemiBold',
  serifRegular: 'PlayfairDisplay_400Regular',
  sansBold: 'PlusJakartaSans_700Bold',
  sansSemibold: 'PlusJakartaSans_600SemiBold',
  sansMedium: 'PlusJakartaSans_500Medium',
  sansRegular: 'PlusJakartaSans_400Regular',
} as const

export const textStyles = {
  logo: {
    fontFamily: fontFamilies.serifBlack,
    fontSize: fontSizes.logo,
    lineHeight: fontSizes.logo * lineHeights.snug,
    letterSpacing: letterSpacing.tight,
  },
  h1: {
    fontFamily: fontFamilies.serifBold,
    fontSize: fontSizes['6xl'],
    lineHeight: fontSizes['6xl'] * lineHeights.tight,
  },
  h2: {
    fontFamily: fontFamilies.serifSemibold,
    fontSize: fontSizes['5xl'],
    lineHeight: fontSizes['5xl'] * lineHeights.snug,
  },
  h3: {
    fontFamily: fontFamilies.serifSemibold,
    fontSize: fontSizes['3xl'],
    lineHeight: fontSizes['3xl'] * lineHeights.normal,
  },
  body: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.relaxed,
  },
  bodySecondary: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.relaxed,
  },
  small: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
  },
} as const
