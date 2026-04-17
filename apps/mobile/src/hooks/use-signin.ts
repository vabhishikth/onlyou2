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
    // Scope the dev scenario to this user. Fresh users land on "new";
    // returning users get whatever scenario they last persisted.
    useDevScenarioStore.getState().setActiveUser(result.userId);
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
    // Keep the per-user scenario map intact so a returning user re-login
    // restores their previous state — just drop the active pointer.
    useDevScenarioStore.getState().setActiveUser(null);
  }

  return { sendOtp, verifyOtp, signOut };
}
