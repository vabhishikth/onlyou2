import { computeAgeYears, MIN_AGE_YEARS } from "@onlyou/core/validators/age";
import { useMutation } from "convex/react";
import { router, useFocusEffect, useNavigation } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
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

const STEPS = ["name", "gender", "dob", "address"] as const;
type Step = (typeof STEPS)[number];

function formatDob(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

/** Convert the UI's `DD-MM-YYYY` representation to the ISO `YYYY-MM-DD`
 *  form expected by the server + `computeAgeYears`. Returns `""` for
 *  incomplete input so callers can short-circuit. */
function dobToIso(dob: string): string {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(dob)) return "";
  const [dd, mm, yyyy] = dob.split("-");
  return `${yyyy}-${mm}-${dd}`;
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
  const navigation = useNavigation();
  const token = useAuthStore((s) => s.token);
  const completeProfile = useMutation(api.users.completeProfile);

  const [step, setStep] = useState<Step>("name");
  // Ref shadow of `step` so the navigation listeners (which close over a
  // stale value otherwise) always see the current step.
  const stepRef = useRef<Step>("name");
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const goBackStep = useCallback(() => {
    const idx = STEPS.indexOf(stepRef.current);
    if (idx > 0) {
      setStep(STEPS[idx - 1]);
      return true;
    }
    return false;
  }, []);

  // Android hardware-back: decrement step, or let the OS exit on step 1.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        return goBackStep();
      });
      return () => sub.remove();
    }, [goBackStep]),
  );

  // iOS swipe-back + navigation pop: intercept so back decrements the step
  // instead of dismissing the whole profile flow. When we're already on
  // step 1 we let navigation proceed normally.
  useEffect(() => {
    const unsub = navigation.addListener(
      "beforeRemove" as never,
      ((e: { preventDefault: () => void }) => {
        if (STEPS.indexOf(stepRef.current) > 0) {
          e.preventDefault();
          goBackStep();
        }
      }) as never,
    );
    return unsub;
  }, [navigation, goBackStep]);

  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(
    null,
  );
  const [dob, setDob] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [address, setAddress] = useState("");

  const dobIso = dobToIso(dob);
  const dobFormatValid = dobIso.length > 0;
  const dobAge = dobFormatValid ? computeAgeYears(dobIso) : Number.NaN;
  const dobUnderAge = dobFormatValid && dobAge < MIN_AGE_YEARS;

  async function onFinish() {
    if (!token) return;
    await completeProfile({
      token,
      name,
      dob: dobIso,
      gender: gender ?? "other",
      pincode,
      city,
      state: stateName,
      address,
    });
    router.replace("/(tabs)/home" as never);
  }

  const stepNumber = STEPS.indexOf(step) + 1;

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
          {step !== "name" ? (
            <Pressable
              testID="profile-setup-back"
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={goBackStep}
              style={{
                width: 44,
                height: 44,
                justifyContent: "center",
                marginBottom: 4,
                marginLeft: -8,
                paddingLeft: 8,
              }}
            >
              <ChevronLeft size={24} color={colors.textPrimary} />
            </Pressable>
          ) : (
            <View style={{ height: 44, marginBottom: 4 }} />
          )}

          <Text
            style={{
              fontFamily: "PlayfairDisplay_900Black",
              fontSize: 18,
              color: colors.textPrimary,
              marginBottom: 24,
            }}
            testID="wordmark"
          >
            onlyou
          </Text>

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
                testID="profile-name-input"
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
              {dobUnderAge ? (
                <Text
                  testID="dob-under-age-error"
                  style={{
                    fontSize: 12,
                    color: colors.error,
                    marginTop: 8,
                  }}
                >
                  You must be 18 or older to use ONLYOU.
                </Text>
              ) : (
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textTertiary,
                    marginTop: 8,
                  }}
                >
                  Must be 18+ to use onlyou.
                </Text>
              )}
              <View style={{ flex: 1 }} />
              <PremiumButton
                label="Next"
                disabled={!dobFormatValid || dobUnderAge}
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
