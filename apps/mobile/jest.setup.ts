import "@testing-library/jest-native/extend-expect";

// React Native sets __DEV__ = true in dev builds. Jest runs as dev.
(global as unknown as Record<string, unknown>).__DEV__ = true;

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

// Modal mock is wired via moduleNameMapper in jest.config.js to avoid
// babel-preset-expo codegen crashes in the react-native Modal module tree.

jest.mock("expo-camera", () => ({
  CameraView: "CameraView",
  useCameraPermissions: () => [{ granted: true, status: "granted" }, jest.fn()],
}));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  requestMediaLibraryPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ granted: true, status: "granted" }),
  MediaTypeOptions: { Images: "Images" },
}));
