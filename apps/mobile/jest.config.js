/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.test.(ts|tsx)"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|@gorhom/bottom-sheet|react-native-reanimated|react-native-worklets))",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css)$": "<rootDir>/__mocks__/style-mock.js",
    "^react-native-reanimated$": "<rootDir>/__mocks__/react-native-reanimated.js",
    "^expo-linear-gradient$": "<rootDir>/__mocks__/expo-linear-gradient.js",
    // babel-preset-expo's codegen plugin crashes on native component specs in
    // specs_DEPRECATED (unsupported ReadonlyArray props/commands).
    //
    // Crash chain A (jest-preset mock path):
    //   requireActual('react-native/Libraries/Modal/Modal') → Modal.js
    //   → ./RCTModalHostViewNativeComponent → specs_DEPRECATED → codegen crash
    //
    // Crash chain B (BottomSheet's own import):
    //   import { Modal } from 'react-native' → react-native/index.js lazy getter
    //   → require('./Libraries/Modal/Modal') [relative!] → same crash
    //
    // Fix: intercept both the package-rooted form AND the relative form that
    // react-native/index.js uses internally.
    "^react-native/Libraries/Modal/Modal$":
      "<rootDir>/__mocks__/modal.js",
    // Relative form used by react-native/index.js's lazy getter:
    "^\\./Libraries/Modal/Modal$":
      "<rootDir>/__mocks__/modal.js",
    // Force every `react`/`react-dom` import to the hoisted workspace copy.
    // convex ships a nested node_modules/react at a newer minor (19.2.x vs the
    // Expo-pinned 19.1.x at the workspace root). When jest renders a component
    // that calls `useQuery` from `convex/react`, convex's `useMemo` resolves
    // through its own nested React while the component tree ran under the
    // top-level React — two dispatcher globals, "invalid hook call" at render.
    // Deduping here collapses both paths onto a single React instance.
    "^react$": "<rootDir>/../../node_modules/react",
    "^react/(.*)$": "<rootDir>/../../node_modules/react/$1",
  },
};
