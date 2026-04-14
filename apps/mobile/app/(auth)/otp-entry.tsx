import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OtpBoxes } from "@/components/auth/OtpBoxes";
import { useSignIn } from "@/hooks/use-signin";
import { colors } from "@/theme/colors";

const RESEND_SECONDS = 30;

export default function OtpEntry() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { sendOtp, verifyOtp } = useSignIn();
  const [error, setError] = useState<string | undefined>();
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [otpResetSignal, setOtpResetSignal] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Use a single token that bumps each time we want to (re)start the
  // countdown. Initial mount + taps on "Resend" bump this. The effect
  // owns one interval per bump and clears it on unmount or when the
  // countdown hits 0 — no leaked intervals, no background drift.
  const [countdownToken, setCountdownToken] = useState(0);
  useEffect(() => {
    setResendIn(RESEND_SECONDS);
    const id = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    timer.current = id;
    return () => {
      clearInterval(id);
      if (timer.current === id) timer.current = null;
    };
  }, [countdownToken]);

  async function onComplete(otp: string) {
    setError(undefined);
    try {
      const result = await verifyOtp(phone, otp);
      if (!result.profileComplete) {
        router.replace("/(auth)/profile-setup" as never);
      } else {
        router.replace("/(tabs)/home" as never);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Incorrect code");
      // Clear the 6 stale digits so the user can retype immediately.
      setOtpResetSignal((n) => n + 1);
    }
  }

  async function onResend() {
    if (resendIn > 0) return;
    await sendOtp(phone);
    // Bump the token — the effect reseeds `resendIn` and starts a fresh
    // interval, guaranteeing we never have two running at once.
    setCountdownToken((n) => n + 1);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 44,
            height: 44,
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
        </Pressable>

        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 32,
            color: colors.textPrimary,
            lineHeight: 36,
            letterSpacing: -0.8,
            marginBottom: 8,
          }}
        >
          Enter the code
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginBottom: 24,
          }}
        >
          Sent to {phone}
        </Text>

        <OtpBoxes onComplete={onComplete} resetSignal={otpResetSignal} />

        {error ? (
          <Text style={{ fontSize: 13, color: colors.error, marginTop: 16 }}>
            {error}
          </Text>
        ) : null}

        <View style={{ flex: 1 }} />

        <Pressable onPress={onResend} disabled={resendIn > 0}>
          <Text
            style={{
              textAlign: "center",
              fontSize: 13,
              color: resendIn > 0 ? colors.textTertiary : colors.accent,
              fontWeight: "600",
            }}
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
