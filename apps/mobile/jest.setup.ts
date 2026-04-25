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

jest.mock("expo-auth-session/providers/google", () => ({
  useIdTokenAuthRequest: () => [
    {}, // request: truthy so the button is enabled
    null, // response: null until user signs in
    jest.fn(), // promptAsync
  ],
}));

// Phase 3B: screens now call convex.mutation during interactions
// (startConsultation, submitConsultation, generatePhotoUploadUrl, recordPhoto).
// Provide a permissive default so existing UI tests render without crashing.
// Per-test files can still override via their own `jest.mock("convex/react", …)`.
jest.mock("convex/react", () => {
  const actual = jest.requireActual("convex/react");
  return {
    ...actual,
    useConvex: () => ({
      mutation: jest.fn().mockResolvedValue({
        ok: true,
        consultationId: "test-consultation-id",
        storageId: "test-storage-id",
        photoId: "test-photo-id",
      }),
      action: jest.fn().mockResolvedValue({
        token: "test-tok",
        userId: "test-user",
        profileComplete: false,
      }),
    }),
  };
});

jest.mock("expo-apple-authentication", () => ({
  AppleAuthenticationScope: { EMAIL: "EMAIL", FULL_NAME: "FULL_NAME" },
  AppleAuthenticationButtonType: { SIGN_IN: "SIGN_IN" },
  AppleAuthenticationButtonStyle: { BLACK: "BLACK" },
  AppleAuthenticationButton: "AppleAuthenticationButton",
  signInAsync: jest.fn().mockResolvedValue({ identityToken: null }),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));
