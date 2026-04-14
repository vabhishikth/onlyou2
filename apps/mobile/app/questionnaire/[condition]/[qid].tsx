import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { QuestionShell } from "@/components/questionnaire/QuestionShell";
import { SelectionCard } from "@/components/questionnaire/SelectionCard";
import { PremiumInput } from "@/components/ui/PremiumInput";
import { QUESTION_BANKS } from "@/data/questionnaires";
import type { Vertical } from "@/fixtures/patient-states";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { colors } from "@/theme/colors";

export default function QuestionScreen() {
  const { condition, qid } = useLocalSearchParams<{
    condition: Vertical;
    qid: string;
  }>();
  const questions = QUESTION_BANKS[condition] ?? [];

  const index = useMemo(
    () => questions.findIndex((q) => q.id === qid),
    [questions, qid],
  );
  const question = questions[index];

  const setAnswer = useQuestionnaireStore((s) => s.setAnswer);
  const storedCondition = useQuestionnaireStore((s) => s.condition);
  const start = useQuestionnaireStore((s) => s.start);
  const existing = useQuestionnaireStore((s) => s.answers[qid]);

  // Ensure the store's active condition matches this route.
  useEffect(() => {
    if (storedCondition !== condition) {
      start(condition);
    }
  }, [condition, storedCondition, start]);

  const [single, setSingle] = useState<string | undefined>(
    typeof existing === "string" ? existing : undefined,
  );
  const [multi, setMulti] = useState<Set<string>>(
    new Set(Array.isArray(existing) ? existing : []),
  );
  const [text, setText] = useState<string>(
    typeof existing === "string" ? existing : "",
  );

  if (!question) {
    return (
      <View style={{ flex: 1, padding: 24 }}>
        <Text style={{ color: colors.textSecondary }}>Question not found.</Text>
      </View>
    );
  }

  const canProceed =
    question.type === "single"
      ? !!single
      : question.type === "multi"
        ? multi.size > 0
        : question.type === "text"
          ? !question.required || text.trim().length > 0
          : question.type === "photo"
            ? true
            : false;

  function onNext() {
    if (!question) return;
    // Persist this question's answer to the store.
    if (question.type === "single" && single) {
      setAnswer(question.id, single);
    } else if (question.type === "multi") {
      setAnswer(question.id, Array.from(multi));
    } else if (question.type === "text") {
      setAnswer(question.id, text);
    }

    const nextQ = questions[index + 1];
    if (question.type === "photo") {
      // Photo upload stack is built in Task 14. For now, skip straight ahead.
      if (nextQ) {
        router.push(`/questionnaire/${condition}/${nextQ.id}`);
      } else {
        router.push(`/questionnaire/${condition}/review`);
      }
      return;
    }
    if (nextQ) {
      router.push(`/questionnaire/${condition}/${nextQ.id}`);
    } else {
      router.push(`/questionnaire/${condition}/review`);
    }
  }

  return (
    <QuestionShell
      current={index + 1}
      total={questions.length}
      title={question.title}
      helper={question.helper}
      canProceed={canProceed}
      onNext={onNext}
    >
      {question.type === "single" && (
        <View>
          {question.options?.map((opt) => (
            <SelectionCard
              key={opt.value}
              label={opt.label}
              selected={single === opt.value}
              onPress={() => setSingle(opt.value)}
            />
          ))}
        </View>
      )}

      {question.type === "multi" && (
        <View>
          {question.options?.map((opt) => (
            <SelectionCard
              key={opt.value}
              multi
              label={opt.label}
              selected={multi.has(opt.value)}
              onPress={() => {
                const next = new Set(multi);
                if (next.has(opt.value)) next.delete(opt.value);
                else next.add(opt.value);
                setMulti(next);
              }}
            />
          ))}
        </View>
      )}

      {question.type === "text" && (
        <PremiumInput
          label={question.title}
          value={text}
          onChangeText={setText}
        />
      )}

      {question.type === "photo" && (
        <Text
          style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20 }}
        >
          The next screen opens the camera. Tap Next to continue.
        </Text>
      )}
    </QuestionShell>
  );
}
