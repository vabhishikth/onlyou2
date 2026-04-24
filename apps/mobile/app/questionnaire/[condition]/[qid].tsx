import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { QuestionShell } from "@/components/questionnaire/QuestionShell";
import { SelectionCard } from "@/components/questionnaire/SelectionCard";
import { PremiumInput } from "@/components/ui/PremiumInput";
import {
  type Option,
  type Question,
  QUESTION_BANKS,
} from "@/data/questionnaires";
import type { Vertical } from "@/fixtures/patient-states";
import { type AnswersMap, getNextQid } from "@/questionnaire/skipLogic";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { colors } from "@/theme/colors";

function resolveOptions(q: Question, answers: AnswersMap): Option[] {
  const sex = typeof answers.q2_sex === "string" ? answers.q2_sex : null;
  let opts: Option[] | undefined = q.options;
  if (!opts) {
    opts = sex === "female" ? q.femaleOptions : q.maleOptions;
  }
  if (!opts) return [];
  return opts.filter((o) => {
    if (o.maleOnly && sex !== "male") return false;
    if (o.femaleOnly && sex !== "female") return false;
    return true;
  });
}

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
  const advance = useQuestionnaireStore((s) => s.advance);
  const storeAnswers = useQuestionnaireStore((s) => s.answers);
  const existing = useQuestionnaireStore((s) => s.answers[qid]);

  const [single, setSingle] = useState<string | undefined>(
    typeof existing === "string" ? existing : undefined,
  );
  const [multi, setMulti] = useState<Set<string>>(
    new Set(Array.isArray(existing) ? existing : []),
  );
  const [text, setText] = useState<string>(
    typeof existing === "string" ? existing : "",
  );
  const [num, setNum] = useState<string>(
    typeof existing === "string" ? existing : "",
  );

  if (!question) {
    return (
      <View style={{ flex: 1, padding: 24 }}>
        <Text style={{ color: colors.textSecondary }}>Question not found.</Text>
      </View>
    );
  }

  const parsedNum = Number.parseInt(num, 10);
  const numValid =
    Number.isInteger(parsedNum) &&
    parsedNum >= (question.min ?? Number.NEGATIVE_INFINITY) &&
    parsedNum <= (question.max ?? Number.POSITIVE_INFINITY);

  const canProceed =
    question.type === "number"
      ? numValid
      : question.type === "single"
        ? !!single
        : question.type === "multi"
          ? multi.size > 0
          : question.type === "freetext"
            ? !question.required || text.trim().length > 0
            : question.type === "photo"
              ? true
              : false;

  const resolvedOptions = resolveOptions(question, storeAnswers);

  function onNext() {
    if (!question) return;

    let justSetValue: string | string[] | undefined;
    if (question.type === "number" && numValid) {
      justSetValue = String(parsedNum);
      setAnswer(question.id, justSetValue);
    } else if (question.type === "single" && single) {
      justSetValue = single;
      setAnswer(question.id, single);
    } else if (question.type === "multi") {
      justSetValue = Array.from(multi);
      setAnswer(question.id, justSetValue);
    } else if (question.type === "freetext") {
      justSetValue = text;
      setAnswer(question.id, text);
    }

    if (question.type === "photo") {
      // Hand off to the dedicated photo-upload stack. That stack owns the
      // review-screen handoff once every required photo is captured.
      router.push(`/photo-upload/${condition}`);
      return;
    }

    const newAnswers: AnswersMap =
      justSetValue !== undefined
        ? { ...storeAnswers, [question.id]: justSetValue }
        : storeAnswers;
    const next = getNextQid(questions, newAnswers, question.id);
    advance(question.id, next);
    if (next === null) {
      router.push(`/questionnaire/${condition}/review`);
    } else {
      router.push(`/questionnaire/${condition}/${next}`);
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
      {question.type === "number" && (
        <PremiumInput
          label={question.title}
          value={num}
          onChangeText={setNum}
          keyboardType="number-pad"
        />
      )}

      {question.type === "single" && (
        <View>
          {resolvedOptions.map((opt) => (
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
          {resolvedOptions.map((opt) => (
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

      {question.type === "freetext" && (
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
