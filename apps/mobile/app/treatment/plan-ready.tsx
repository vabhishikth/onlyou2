import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { usePatientState } from "@/hooks/use-patient-state";
import { colors } from "@/theme/colors";

export default function PlanReady() {
  const insets = useSafeAreaInsets();
  const user = usePatientState();
  const consultation = user.consultations[0];
  const prescription = user.prescriptions[0];

  if (!consultation || !prescription) {
    return (
      <View
        style={{ flex: 1, padding: 24, backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.textSecondary }}>
          No plan in progress.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 24 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 44, height: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
      >
        <Text
          style={{
            fontSize: 10,
            color: colors.accentWarm,
            fontWeight: "800",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginTop: 16,
            marginBottom: 10,
          }}
        >
          Your Treatment Plan
        </Text>
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 32,
            color: colors.textPrimary,
            lineHeight: 36,
            letterSpacing: -0.6,
            marginBottom: 16,
          }}
        >
          {consultation.doctorName} wrote your plan
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.textTertiary,
            marginBottom: 24,
          }}
        >
          {consultation.doctorSpecialty}
        </Text>

        <SectionHeader>Diagnosis</SectionHeader>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            lineHeight: 20,
            marginBottom: 24,
          }}
        >
          {consultation.diagnosis}
        </Text>

        <SectionHeader>Medications</SectionHeader>
        {prescription.items.map((item) => (
          <View
            key={item.name}
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderLight,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: colors.textPrimary,
              }}
            >
              💊 {item.name}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.textTertiary,
                marginTop: 2,
              }}
            >
              {item.dosage} · {item.schedule}
            </Text>
          </View>
        ))}

        <SectionHeader>What to expect</SectionHeader>
        <Text
          style={{
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 19,
            marginBottom: 8,
          }}
        >
          · Reduced shedding in 1–3 months
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 19,
            marginBottom: 8,
          }}
        >
          · Visible improvement in 3–6 months
        </Text>
        <Text
          style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}
        >
          · Unlimited messaging with your doctor during treatment
        </Text>
      </ScrollView>

      <View
        style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
      >
        <PremiumButton
          variant="warm"
          label="Choose your plan →"
          onPress={() => router.push("/treatment/plan-selection")}
        />
      </View>
    </View>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 10,
        color: colors.textTertiary,
        fontWeight: "800",
        letterSpacing: 1.5,
        textTransform: "uppercase",
        marginTop: 24,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}
