// packages/core/src/tokens/biomarker.ts
//
// Biomarker Editorial palette + fonts. Second of two design registers in
// the Onlyou patient app. Must ONLY be imported from biomarker-surface
// paths (see eslint.config.js no-restricted-imports rule).
//
// See docs/decisions/2026-04-17-biomarker-design-register.md.
// Light palette only in Phase 2.5; dark vars documented below but
// intentionally not exported.

export const biomarkerPalette = {
  // Surface
  pageBg: "#EFE5D4",
  bg: "#F6F1E9",
  bg2: "#EFE8DC",
  bg3: "#E7DFD0",
  bg4: "#DDD3C0",

  // Lines + ink
  line: "rgba(40,26,14,0.08)",
  line2: "rgba(40,26,14,0.16)",
  ink: "#1C1612",
  ink2: "#3A2F24",
  muted: "#7A6A57",
  muted2: "#A69581",

  // Accent
  amber: "#B4641F",
  amber2: "#8A4A14",
  honey: "#B57A2F",

  // Status
  sage: "#5C6E4A",
  rose: "#A24636",
  lavender: "#7B6E9C",
  grey: "#9A8F80",
} as const;

export type BiomarkerPaletteKey = keyof typeof biomarkerPalette;

export const biomarkerFonts = {
  display: "InstrumentSerif_400Regular",
  displayItalic: "InstrumentSerif_400Regular_Italic",
  mono: "JetBrainsMono_400Regular",
  monoMed: "JetBrainsMono_500Medium",
  sans: "Inter_400Regular",
  sansMed: "Inter_500Medium",
  sansSemibold: "Inter_600SemiBold",
} as const;

export type BiomarkerFontKey = keyof typeof biomarkerFonts;

// Dark-mode reference values (NOT exported — defined here for future dark
// mode wiring; commented so they do not accidentally land in light mode):
//   pageBg: '#0A0806', bg: '#13100D', bg2: '#1A1612', bg3: '#211C17',
//   bg4: '#2A231C', line: 'rgba(230,210,190,0.08)', ...
// See docs/DEFERRED.md Phase 2.5 section "Dark mode wiring → post-foundation".
