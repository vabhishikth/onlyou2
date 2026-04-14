import { colors } from '@onlyou/core/tokens/colors'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        background: colors.background,
        'off-white': colors.offWhite,
        'text-primary': colors.textPrimary,
        'text-secondary': colors.textSecondary,
        'text-tertiary': colors.textTertiary,
        'text-muted': colors.textMuted,
        accent: colors.accent,
        'accent-light': colors.accentLight,
        warm: colors.warm,
        border: colors.border,
        success: colors.success,
        'success-bg': colors.successBg,
        warning: colors.warning,
        'warning-bg': colors.warningBg,
        error: colors.error,
        'error-bg': colors.errorBg,
        info: colors.info,
        'info-bg': colors.infoBg,
      },
      fontFamily: {
        serif: ['PlayfairDisplay_700Bold'],
        'serif-black': ['PlayfairDisplay_900Black'],
        sans: ['PlusJakartaSans_400Regular'],
        'sans-semibold': ['PlusJakartaSans_600SemiBold'],
      },
    },
  },
  plugins: [],
}
