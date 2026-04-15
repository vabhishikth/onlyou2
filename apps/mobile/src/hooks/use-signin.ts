import { useAction, useMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { useAuthStore } from "../stores/auth-store";
import { useDevScenarioStore } from "../stores/dev-scenario-store";

export function useSignIn() {
  const sendOtpAction = useAction(api.auth.otp.sendOtp);
  const verifyOtpAction = useAction(api.auth.otp.verifyOtp);
  const signOutMutation = useMutation(api.auth.sessions.signOut);
  const setToken = useAuthStore((s) => s.setToken);
  const clearToken = useAuthStore((s) => s.clearToken);

  async function sendOtp(phone: string) {
    return sendOtpAction({ phone });
  }

  async function verifyOtp(phone: string, otp: string) {
    const result = await verifyOtpAction({ phone, otp });
    await setToken(result.token);
    // Reset the persisted dev scenario so fresh logins always start on the
    // `new` patient state, regardless of whatever the previous user left
    // in AsyncStorage.
    useDevScenarioStore.getState().resetScenario();
    return result;
  }

  async function signOut() {
    const token = useAuthStore.getState().token;
    if (token) {
      try {
        await signOutMutation({ token });
      } catch {
        // Best-effort — clear local storage even if server call fails
      }
    }
    await clearToken();
    useDevScenarioStore.getState().resetScenario();
  }

  return { sendOtp, verifyOtp, signOut };
}
