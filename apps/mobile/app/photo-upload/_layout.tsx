import { Stack } from "expo-router";

export default function PhotoUploadLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: "modal" }} />
  );
}
