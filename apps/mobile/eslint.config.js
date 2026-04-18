import base from '@onlyou/config/eslint/expo'

export default [
  ...base,
  // Block biomarker-register tokens outside biomarker-surface files
  {
    files: [
      "src/**/*.{ts,tsx}",
      "app/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@onlyou/core/tokens",
              importNames: ["biomarkerPalette", "biomarkerFonts"],
              message:
                "biomarkerPalette/biomarkerFonts are only allowed in biomarker-surface files: apps/mobile/app/lab-results/**, apps/mobile/app/lab-booking/upload-results*, apps/mobile/src/components/biomarker/**. See docs/decisions/2026-04-17-biomarker-design-register.md.",
            },
            {
              name: "@onlyou/core",
              importNames: ["biomarkerPalette", "biomarkerFonts"],
              message:
                "biomarkerPalette/biomarkerFonts are only allowed in biomarker-surface files (barrel import path). See docs/decisions/2026-04-17-biomarker-design-register.md.",
            },
          ],
        },
      ],
    },
  },
  // Allow biomarker imports within biomarker-surface paths only
  {
    files: [
      "app/lab-results/**/*.{ts,tsx}",
      "app/lab-booking/upload-results*.{ts,tsx}",
      "src/components/biomarker/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@onlyou/core/tokens",
              importNames: ["colors"],
              message:
                "Clinical Luxe `colors` is not allowed in biomarker-surface files; use `biomarkerPalette` instead. See docs/decisions/2026-04-17-biomarker-design-register.md.",
            },
            {
              name: "@onlyou/core",
              importNames: ["colors"],
              message:
                "Clinical Luxe `colors` is not allowed in biomarker-surface files; use `biomarkerPalette` instead (barrel import path). See docs/decisions/2026-04-17-biomarker-design-register.md.",
            },
          ],
        },
      ],
    },
  },
]
