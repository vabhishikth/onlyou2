import { useConvex } from "convex/react";
import * as Google from "expo-auth-session/providers/google";
import { useEffect } from "react";
import { Pressable, Text } from "react-native";

import { api } from "../../../../../convex/_generated/api";

import { useAuthStore } from "@/stores/auth-store";
import { colors } from "@/theme/colors";

interface Props {
  onSuccess: (profileComplete: boolean) => void;
}

export function GoogleSignInButton({ onSuccess }: Props) {
  const convex = useConvex();
  const setToken = useAuthStore((s) => s.setToken);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.params.id_token;
    if (!idToken) return;
    (async () => {
      const result = await convex.action(
        api.auth.socialSignIn.signInWithGoogle,
        { idToken },
      );
      await setToken(result.token);
      onSuccess(result.profileComplete);
    })();
  }, [response, convex, setToken, onSuccess]);

  return (
    <Pressable
      disabled={!request}
      onPress={() => promptAsync()}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google"
      style={{
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.white,
        justifyContent: "center",
        alignItems: "center",
        opacity: request ? 1 : 0.4,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: colors.textPrimary,
        }}
      >
        Continue with Google
      </Text>
    </Pressable>
  );
}
