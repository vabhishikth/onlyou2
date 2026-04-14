import { Redirect } from "expo-router";

import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuthStore } from "@/stores/auth-store";

export default function Index() {
  const token = useAuthStore((s) => s.token);
  const user = useCurrentUser();

  if (!token) {
    // TODO: remove cast once (auth)/welcome route ships in Tasks 13–18
    return <Redirect href={"/(auth)/welcome" as never} />;
  }

  if (user === undefined) return null;

  if (user === null) {
    // TODO: remove cast once (auth)/welcome route ships in Tasks 13–18
    return <Redirect href={"/(auth)/welcome" as never} />;
  }

  if (!user.profileComplete) {
    // TODO: remove cast once (auth)/profile-setup route ships in Tasks 13–18
    return <Redirect href={"/(auth)/profile-setup" as never} />;
  }

  // TODO: remove cast once (tabs)/home route ships in Tasks 13–18
  return <Redirect href={"/(tabs)/home" as never} />;
}
