import { router } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PhoneInput } from "@/components/auth/PhoneInput";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { useSignIn } from "@/hooks/use-signin";
import { colors } from "@/theme/colors";

export default function PhoneVerify() {
  const insets = useSafeAreaInsets();
  const { sendOtp } = useSignIn();
  const [digits, setDigits] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const valid = digits.length === 10;

  async function onSubmit() {
    setSubmitting(true);
    setError(undefined);
    try {
      const phone = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
      await sendOtp(phone);
      router.push({
        pathname: "/(auth)/otp-entry" as never,
        params: { phone },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
              fontSize: 18,
              color: colors.textPrimary,
              marginBottom: 24,
            }}
          >
            onlyou
          </Text>

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
            {"What's your\nphone number?"}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: colors.textSecondary,
              lineHeight: 22,
              marginBottom: 20,
            }}
          >
            {
              "We'll text you a 6-digit code on WhatsApp or SMS to confirm it's you."
            }
          </Text>

          <PhoneInput
            onChangeText={setDigits}
            error={error}
            testID="phone-input"
          />

          <Text
            style={{
              fontSize: 12,
              color: colors.textTertiary,
              lineHeight: 18,
              marginTop: 12,
            }}
          >
            {"We'll never share your number. No spam, no marketing calls."}
          </Text>

          <View style={{ flex: 1 }} />

          <PremiumButton
            label={submitting ? "Sending..." : "Send code"}
            disabled={!valid || submitting}
            onPress={onSubmit}
          />
          <Text
            style={{
              fontSize: 11,
              color: colors.textTertiary,
              textAlign: "center",
              marginTop: 12,
            }}
          >
            Next: enter the 6-digit code we send you.
          </Text>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
