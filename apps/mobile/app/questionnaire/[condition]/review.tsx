import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PremiumButton } from "@/components/ui/PremiumButton";
import type { Option, Question } from "@/data/questionnaires";
import { QUESTION_BANKS } from "@/data/questionnaires";
import type { Vertical } from "@/fixtures/patient-states";
import { getReachableQids } from "@/questionnaire/skipLogic";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { colors } from "@/theme/colors";

const SECTION_TITLES: Record<Question["section"], string> = {
  basics: "Basics",
  medical_history: "Medical history",
  current_symptoms: "Current symptoms",
  lifestyle: "Lifestyle",
  sexual_health: "Sexual health",
  treatment_history: "Treatment history",
};

const SECTION_ORDER: Question["section"][] = [
  "basics",
  "medical_history",
  "current_symptoms",
  "lifestyle",
  "sexual_health",
  "treatment_history",
];

function labelForAnswer(
  question: Question,
  value: string,
  sex: string | null,
): string {
  let opts: Option[] | undefined = question.options;
  if (!opts) {
    opts = sex === "female" ? question.femaleOptions : question.maleOptions;
  }
  return opts?.find((o) => o.value === value)?.label ?? value;
}

export default function QuestionnaireReview() {
  const insets = useSafeAreaInsets();
  const { condition } = useLocalSearchParams<{ condition: Vertical }>();
  const questions = QUESTION_BANKS[condition] ?? [];
  const answers = useQuestionnaireStore((s) => s.answers);
  // TODO(phase-3b/Task 14): read schemaVersion from store and include in
  // submission payload when wiring the real Convex mutation.
  const reset = useQuestionnaireStore((s) => s.reset);
  const [consent, setConsent] = useState(false);

  const sex =
    typeof answers.q2_sex === "string" ? (answers.q2_sex as string) : null;

  const reachableSet = useMemo(() => {
    return new Set(getReachableQids(questions, answers));
  }, [questions, answers]);

  const grouped = useMemo(() => {
    const out: Array<{ section: Question["section"]; questions: Question[] }> =
      [];
    for (const section of SECTION_ORDER) {
      const qs = questions.filter(
        (q) => q.section === section && reachableSet.has(q.id),
      );
      if (qs.length > 0) out.push({ section, questions: qs });
    }
    return out;
  }, [questions, reachableSet]);

  function onSubmit() {
    if (!consent) return;
    // TODO(phase-3b/Task 14): replace placeholder with real Convex submission
    // mutation that posts answers + schemaVersion and creates the consultation.
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
          Tap any answer to edit. Submit when you&apos;re ready — our doctor
          will review within 24 hours.
        </Text>

        {grouped.map(({ section, questions: qs }) => (
          <View key={section} style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: "PlayfairDisplay_900Black",
                fontSize: 18,
                color: colors.textPrimary,
                marginBottom: 8,
                letterSpacing: -0.3,
              }}
            >
              {SECTION_TITLES[section]}
            </Text>
            {qs.map((q) => {
              const value = answers[q.id];
              let display = "—";
              if (typeof value === "string" && value.length > 0) {
                display = labelForAnswer(q, value, sex);
              } else if (Array.isArray(value) && value.length > 0) {
                display = value
                  .map((v) => labelForAnswer(q, v, sex))
                  .join(", ");
              } else if (q.type === "photo") {
                display = "Photos to upload";
              }
              return (
                <Pressable
                  key={q.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${q.title}`}
                  onPress={() =>
                    router.push(`/questionnaire/${condition}/${q.id}`)
                  }
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
                </Pressable>
              );
            })}
          </View>
        ))}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="I confirm the answers are accurate"
          accessibilityState={{ checked: consent }}
          onPress={() => setConsent((c) => !c)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: consent ? colors.accentWarm : colors.borderLight,
              backgroundColor: consent ? colors.accentWarm : "transparent",
              marginRight: 12,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {consent ? (
              <Text style={{ color: "white", fontSize: 14 }}>✓</Text>
            ) : null}
          </View>
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              color: colors.textSecondary,
              lineHeight: 18,
            }}
          >
            I confirm the answers above are accurate and I consent to a doctor
            reviewing my information.
          </Text>
        </Pressable>
      </ScrollView>

      <View
        style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}
      >
        <PremiumButton
          variant="warm"
          label="Submit assessment"
          onPress={onSubmit}
          disabled={!consent}
        />
      </View>
    </View>
  );
}
