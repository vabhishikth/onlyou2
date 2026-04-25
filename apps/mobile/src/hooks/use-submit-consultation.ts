import { useConvex } from "convex/react";
import { useCallback, useState } from "react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuthStore } from "../stores/auth-store";
import { useQuestionnaireStore } from "../stores/questionnaire-store";

export function useSubmitConsultation() {
  const convex = useConvex();
  const token = useAuthStore((s) => s.token);
  const schemaVersion = useQuestionnaireStore((s) => s.schemaVersion);
  const answers = useQuestionnaireStore((s) => s.answers);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (consultationId: Id<"consultations">) => {
      if (!token) throw new Error("no auth token");
      if (!schemaVersion) throw new Error("no questionnaire started");
      setSubmitting(true);
      setError(null);
      try {
        await convex.mutation(
          api.consultations.submitConsultation.submitConsultation,
          {
            token,
            consultationId,
            schemaVersion,
            answers,
          },
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [convex, token, schemaVersion, answers],
  );

  return { submit, submitting, error };
}
