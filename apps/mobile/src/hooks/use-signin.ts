import { useAction } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { useAuthStore } from "../stores/auth-store";

export function useSignIn() {
  const sendOtpAction = useAction(api.auth.otp.sendOtp);
  const verifyOtpAction = useAction(api.auth.otp.verifyOtp);
  const setToken = useAuthStore((s) => s.setToken);
  const clearToken = useAuthStore((s) => s.clearToken);

  async function sendOtp(phone: string) {
    return sendOtpAction({ phone });
  }

  async function verifyOtp(phone: string, otp: string) {
    const result = await verifyOtpAction({ phone, otp });
    await setToken(result.token);
    return result;
  }

  async function signOut() {
    await clearToken();
  }

  return { sendOtp, verifyOtp, signOut };
}
