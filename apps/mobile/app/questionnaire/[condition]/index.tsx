import { useConvex } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../../../../convex/_generated/api";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { QUESTION_BANKS } from "@/data/questionnaires";
import { HAIR_LOSS_SCHEMA_VERSION } from "@/data/questionnaires/hair-loss";
import type { Vertical } from "@/fixtures/patient-states";
import { VERTICALS } from "@/fixtures/verticals";
import { useGender } from "@/hooks/use-gender";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { colors } from "@/theme/colors";

export default function QuestionnaireEntry() {
  const insets = useSafeAreaInsets();
  const { condition } = useLocalSearchParams<{ condition: Vertical }>();
  const info = VERTICALS[condition];
  const questions = QUESTION_BANKS[condition] ?? [];
  const gender = useGender();

  // Hair-loss for female patients is Plan 4+ scope. Show a "not available" state.
  const hairLossFemaleBlocked =
    condition === "hair-loss" && gender === "female";

  const startHL = useQuestionnaireStore((s) => s.startHL);
  const startGeneric = useQuestionnaireStore((s) => s.start);
  const setConsultationId = useQuestionnaireStore((s) => s.setConsultationId);
  const convex = useConvex();
  const token = useAuthStore((s) => s.token);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    if (starting) return;
    const firstId = questions[0]?.id;
    if (!firstId) return;
    setStarting(true);
    try {
      if (condition === "hair-loss") {
        if (!token) return;
        startHL(HAIR_LOSS_SCHEMA_VERSION, firstId);
        const { consultationId } = await convex.mutation(
          api.consultations.submitConsultation.startConsultation,
          { token, vertical: "hair_loss" },
        );
        setConsultationId(consultationId);
      } else {
        startGeneric(condition);
      }
      router.push(`/questionnaire/${condition}/${firstId}`);
    } finally {
      setStarting(false);
    }
  };

  if (hairLossFemaleBlocked) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            color: colors.accent,
            fontWeight: "800",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Coming soon
        </Text>
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 28,
            color: colors.textPrimary,
            lineHeight: 32,
            letterSpacing: -0.6,
            marginBottom: 16,
          }}
        >
          Women&apos;s hair care is on the way
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            lineHeight: 20,
          }}
        >
          Our female hair care programme is being curated by specialists and
          will open soon. In the meantime, explore our other offerings.
        </Text>
        <View style={{ flex: 1 }} />
        <PremiumButton
          variant="warm"
          label="Back to explore"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          color: colors.accent,
          fontWeight: "800",
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {info?.category ?? "Assessment"}
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
        Your {info?.displayName ?? "care"} assessment
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          marginBottom: 8,
          lineHeight: 20,
        }}
      >
        {questions.length} questions · about 3 minutes. A specialist reviews
        within 24 hours. Completely free.
      </Text>
      <Text
        style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 32 }}
      >
        You can stop any time and resume later.
      </Text>

      <View style={{ flex: 1 }} />

      <PremiumButton
        variant="warm"
        label={starting ? "Starting…" : "Start assessment"}
        onPress={start}
        disabled={starting}
      />
    </View>
  );
}
