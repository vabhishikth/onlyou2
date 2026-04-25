import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { FIXTURES, type PatientState } from "@/fixtures/patient-states";
import { useSignIn } from "@/hooks/use-signin";
import { colors } from "@/theme/colors";

const SCENARIOS: PatientState[] = ["new", "reviewing", "ready", "active"];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const [quickLoginOpen, setQuickLoginOpen] = useState(false);
  const { sendOtp, verifyOtp } = useSignIn();

  function onGoogleSuccess(profileComplete: boolean) {
    if (!profileComplete) {
      router.replace("/(auth)/profile-setup" as never);
    } else {
      router.replace("/(tabs)/home" as never);
    }
  }

  async function quickLoginAs(state: PatientState) {
    const fixture = FIXTURES[state];
    await sendOtp(fixture.phone);
    const result = await verifyOtp(fixture.phone, "000000");
    setQuickLoginOpen(false);
    if (!result.profileComplete) {
      router.replace("/(auth)/profile-setup" as never);
    } else {
      router.replace("/(tabs)/home" as never);
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 24,
      }}
    >
      <Text
        style={{
          fontFamily: "PlayfairDisplay_900Black",
          fontSize: 36,
          color: colors.textPrimary,
          letterSpacing: -1,
          marginBottom: 12,
        }}
      >
        onlyou
      </Text>

      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 36,
            color: colors.textPrimary,
            lineHeight: 40,
            letterSpacing: -0.8,
            marginBottom: 16,
          }}
        >
          Private care,{"\n"}delivered.
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: colors.textSecondary,
            lineHeight: 24,
            marginBottom: 24,
          }}
        >
          Start your free online visit. An Indian doctor reviews your case
          within 24 hours — no clinic, no queues.
        </Text>

        <View style={{ gap: 10, marginBottom: 8 }}>
          {[
            "Licensed Indian doctors",
            "Discreet packaging, delivered home",
            "Your details stay private",
          ].map((line) => (
            <View
              key={line}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 999,
                  backgroundColor: colors.accentWarm,
                }}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  lineHeight: 20,
                }}
              >
                {line}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <GoogleSignInButton onSuccess={onGoogleSuccess} />
        <PremiumButton
          label="Continue with phone"
          onPress={() => router.push("/(auth)/phone-verify" as never)}
        />
        <Text
          style={{
            fontSize: 11,
            color: colors.textTertiary,
            textAlign: "center",
            letterSpacing: 0.3,
          }}
        >
          Takes under a minute · No credit card
        </Text>
        {__DEV__ ? (
          <Pressable
            onPress={() => setQuickLoginOpen(true)}
            style={{ padding: 10, alignItems: "center" }}
          >
            <Text
              style={{
                fontSize: 11,
                color: colors.textTertiary,
                letterSpacing: 0.3,
                textTransform: "uppercase",
                fontWeight: "700",
              }}
            >
              Dev · Quick login
            </Text>
          </Pressable>
        ) : null}
        <Text
          style={{
            fontSize: 11,
            color: colors.textTertiary,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          By continuing you agree to our{" "}
          {/* TODO(phase-8): wire to terms screen */}
          <Text style={{ color: colors.accent }}>terms</Text>.
        </Text>
      </View>

      {__DEV__ ? (
        <BottomSheet
          visible={quickLoginOpen}
          onClose={() => setQuickLoginOpen(false)}
          title="Dev · Quick login"
        >
          <View style={{ gap: 8 }}>
            {SCENARIOS.map((state) => {
              const u = FIXTURES[state];
              return (
                <Pressable
                  key={state}
                  onPress={() => quickLoginAs(state)}
                  style={{
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    borderRadius: 14,
                    padding: 14,
                    backgroundColor: colors.white,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: colors.textPrimary,
                    }}
                  >
                    {u.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textTertiary,
                      marginTop: 2,
                    }}
                  >
                    {u.phone} · {u.gender} · {u.state}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BottomSheet>
      ) : null}
    </View>
  );
}
