import { Redirect } from "expo-router";
import { useEffect } from "react";

import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuthStore } from "@/stores/auth-store";

export default function Index() {
  const token = useAuthStore((s) => s.token);
  const clearToken = useAuthStore((s) => s.clearToken);
  const user = useCurrentUser();

  useEffect(() => {
    if (token && user === null) {
      clearToken();
    }
  }, [token, user, clearToken]);

  if (!token) {
    return <Redirect href={"/(auth)/welcome" as never} />;
  }

  if (user === undefined) return null;

  if (user === null) {
    return <Redirect href={"/(auth)/welcome" as never} />;
  }

  if (!user.profileComplete) {
    return <Redirect href={"/(auth)/profile-setup" as never} />;
  }

  return <Redirect href={"/(tabs)/home" as never} />;
}
