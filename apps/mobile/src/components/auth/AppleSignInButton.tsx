import { useConvex } from "convex/react";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

import { api } from "../../../../../convex/_generated/api";

import { useAuthStore } from "@/stores/auth-store";

interface Props {
  onSuccess: (profileComplete: boolean) => void;
}

export function AppleSignInButton({ onSuccess }: Props) {
  const convex = useConvex();
  const setToken = useAuthStore((s) => s.setToken);

  if (Platform.OS !== "ios") return null;

  async function onPress() {
    try {
      // TODO(phase-8): generate + pass nonce — server validates but client
      // doesn't supply. See docs/DEFERRED.md "Apple Sign-In nonce wiring".
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });
      if (!credential.identityToken) return;
      const result = await convex.action(
        api.auth.socialSignIn.signInWithApple,
        { identityToken: credential.identityToken },
      );
      await setToken(result.token);
      onSuccess(result.profileComplete);
    } catch {
      // ERR_CANCELED is the user-initiated dismissal — silent.
      // Other errors fall through silently for now; toast wiring is out of scope.
    }
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={12}
      style={{ height: 48, width: "100%" }}
      onPress={onPress}
    />
  );
}
