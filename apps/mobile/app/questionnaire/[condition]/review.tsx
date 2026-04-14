import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import { QUESTION_BANKS } from "@/data/questionnaires";
import type { Vertical } from "@/fixtures/patient-states";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { colors } from "@/theme/colors";

function labelForAnswer(
  question: { options?: Array<{ value: string; label: string }> },
  value: string,
): string {
  return question.options?.find((o) => o.value === value)?.label ?? value;
}

export default function QuestionnaireReview() {
  const insets = useSafeAreaInsets();
  const { condition } = useLocalSearchParams<{ condition: Vertical }>();
  const questions = QUESTION_BANKS[condition] ?? [];
  const answers = useQuestionnaireStore((s) => s.answers);
  const reset = useQuestionnaireStore((s) => s.reset);

  function onSubmit() {
    // Clear transient state so the next questionnaire starts clean.
    reset();
    router.dismissAll();
    router.push("/treatment/confirmation");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          marginBottom: 8,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={{ width: 44, height: 44, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>‹</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
      >
        <Text
          style={{
            fontFamily: "PlayfairDisplay_900Black",
            fontSize: 28,
            color: colors.textPrimary,
            marginBottom: 4,
            letterSpacing: -0.6,
          }}
        >
          Review your answers
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.textSecondary,
            marginBottom: 24,
          }}
        >
          {questions.length} questions answered. Tap Submit when you&apos;re
          ready — our doctor will review within 24 hours.
        </Text>

        {questions.map((q) => {
          const value = answers[q.id];
          let display = "—";
          if (typeof value === "string" && value.length > 0) {
            display = labelForAnswer(q, value);
          } else if (Array.isArray(value) && value.length > 0) {
            display = value.map((v) => labelForAnswer(q, v)).join(", ");
          } else if (q.type === "photo") {
            display = "Photos to upload";
          }
          return (
            <View
              key={q.id}
              style={{
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderLight,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: colors.textTertiary,
                  fontWeight: "700",
                  marginBottom: 4,
                }}
              >
                {q.title}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textPrimary }}>
                {display}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View
        style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
      >
        <PremiumButton
          variant="warm"
          label="Submit assessment"
          onPress={onSubmit}
        />
      </View>
    </View>
  );
}
