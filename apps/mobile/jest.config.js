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
  },
};
