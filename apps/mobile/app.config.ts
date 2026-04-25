/* eslint-disable onlyou/no-hardcoded-hex -- Expo build config consumes raw hex strings as part of its API surface; tokens aren't available at config-load time. */
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig & { newArchEnabled?: boolean } = {
  name: "onlyou",
  slug: "onlyou",
  version: "0.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "onlyou",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#FAFAF8",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.onlyou.app",
  },
  android: {
    package: "com.onlyou.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FAFAF8",
    },
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-splash-screen",
    [
      "expo-camera",
      {
        cameraPermission:
          "ONLYOU needs camera access to take your scalp photos for the doctor.",
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "ONLYOU needs access to your photo library to upload scalp photos.",
      },
    ],
    "expo-apple-authentication",
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
