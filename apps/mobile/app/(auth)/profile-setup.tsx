import { useMutation } from "convex/react";
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

import { api } from "../../../../convex/_generated/api";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { PremiumInput } from "@/components/ui/PremiumInput";
import { useAuthStore } from "@/stores/auth-store";
import { colors } from "@/theme/colors";

type Step = "name" | "gender" | "dob" | "address";

function formatDob(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

const TITLE_STYLE = {
  fontFamily: "PlayfairDisplay_900Black" as const,
  fontSize: 28,
  color: colors.textPrimary,
  lineHeight: 32,
  letterSpacing: -0.6,
};

export default function ProfileSetup() {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const completeProfile = useMutation(api.users.completeProfile);

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(
    null,
  );
  const [dob, setDob] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [address, setAddress] = useState("");

  async function onFinish() {
    if (!token) return;
    const [dd, mm, yyyy] = dob.split("-");
    const isoDob = `${yyyy}-${mm}-${dd}`;
    await completeProfile({
      token,
      name,
      dob: isoDob,
      gender: gender ?? "other",
      pincode,
      city,
      state: stateName,
      address,
    });
    router.replace("/(tabs)/home" as never);
  }

  const stepNumber = ["name", "gender", "dob", "address"].indexOf(step) + 1;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          <Text
            style={{
              fontSize: 10,
              color: colors.textTertiary,
              letterSpacing: 1.5,
              fontWeight: "700",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            About you · {stepNumber} of 4
          </Text>

          {step === "name" && (
            <>
              <Text style={[TITLE_STYLE, { marginBottom: 24 }]}>
                {"What's your name?"}
              </Text>
              <PremiumInput
                label="Full name"
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <View style={{ flex: 1 }} />
              <PremiumButton
                label="Next"
                disabled={name.trim().length < 2}
                onPress={() => setStep("gender")}
              />
            </>
          )}

          {step === "gender" && (
            <>
              <Text style={[TITLE_STYLE, { marginBottom: 24 }]}>
                Your gender
              </Text>
              <View style={{ gap: 12 }}>
                {(["male", "female", "other"] as const).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: gender === g ? colors.accent : colors.border,
                      backgroundColor:
                        gender === g ? colors.accentLight : colors.white,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: colors.textPrimary,
                        textTransform: "capitalize",
                      }}
                    >
                      {g === "other" ? "Prefer not to say / Other" : g}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flex: 1 }} />
              <PremiumButton
                label="Next"
                disabled={!gender}
                onPress={() => setStep("dob")}
              />
            </>
          )}

          {step === "dob" && (
            <>
              <Text style={[TITLE_STYLE, { marginBottom: 24 }]}>
                Date of birth
              </Text>
              <PremiumInput
                label="DD-MM-YYYY"
                value={dob}
                onChangeText={(t) => setDob(formatDob(t))}
                autoFocus
                keyboardType="number-pad"
                maxLength={10}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textTertiary,
                  marginTop: 8,
                }}
              >
                Must be 18+ to use onlyou.
              </Text>
              <View style={{ flex: 1 }} />
              <PremiumButton
                label="Next"
                disabled={!/^\d{2}-\d{2}-\d{4}$/.test(dob)}
                onPress={() => setStep("address")}
              />
            </>
          )}

          {step === "address" && (
            <>
              <Text style={[TITLE_STYLE, { marginBottom: 24 }]}>
                Where do we deliver?
              </Text>
              <View style={{ gap: 16 }}>
                <PremiumInput
                  label="Street address"
                  value={address}
                  onChangeText={setAddress}
                />
                <PremiumInput
                  label="City"
                  value={city}
                  onChangeText={setCity}
                />
                <PremiumInput
                  label="State"
                  value={stateName}
                  onChangeText={setStateName}
                />
                <PremiumInput
                  label="Pincode"
                  value={pincode}
                  onChangeText={setPincode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <View style={{ flex: 1 }} />
              <PremiumButton
                label="Finish"
                disabled={!pincode || !city || !stateName || !address}
                onPress={onFinish}
              />
            </>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
