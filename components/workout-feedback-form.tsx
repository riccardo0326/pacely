"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  EXTERNAL_FACTOR_LABEL,
  PLAN_DEVIATION_LABEL,
} from "@/lib/feedback/labels";
import type { FeedbackSummary } from "@/lib/feedback/summary";
import { WORKOUT_STATUS } from "@/lib/matching/constants";
import { submitWorkoutFeedback } from "@/server/actions/feedback";

type WorkoutFeedbackFormProps = {
  workoutId: string;
  status: string;
  feedback: FeedbackSummary | null;
};

export function WorkoutFeedbackForm({
  workoutId,
  status,
  feedback,
}: WorkoutFeedbackFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (status !== WORKOUT_STATUS.completed && !feedback) {
    return null;
  }

  if (feedback) {
    const factors = feedback.externalFactors
      .map((factor) => EXTERNAL_FACTOR_LABEL[factor] ?? factor)
      .join(", ");
    return (
      <div className="mt-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
        <p className="font-medium">
          {PLAN_DEVIATION_LABEL[feedback.planDeviation] ??
            feedback.planDeviation}
          {feedback.perceivedExertion != null
            ? ` · RPE ${feedback.perceivedExertion}`
            : ""}
        </p>
        <p className="mt-0.5 text-muted-foreground">
          {feedback.deviationSummary}
        </p>
        {factors ? (
          <p className="mt-0.5 text-muted-foreground">Fattori: {factors}</p>
        ) : null}
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    const result = await submitWorkoutFeedback(
      new FormData(event.currentTarget),
    );
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.proposalCreated) {
      setNotice(
        "Feedback salvato. C'è una proposta di ricalcolo da approvare.",
      );
    } else if (result.usedFallback) {
      setNotice("Feedback salvato senza analisi automatica.");
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt-2">
      {notice ? (
        <p className="mb-1 text-xs text-muted-foreground">{notice}</p>
      ) : null}
      {open ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
          <input type="hidden" name="workoutId" value={workoutId} />
          <label className="sr-only" htmlFor={`feedback-${workoutId}`}>
            Feedback allenamento
          </label>
          <textarea
            id={`feedback-${workoutId}`}
            name="freeText"
            required
            minLength={10}
            maxLength={2000}
            rows={3}
            disabled={pending}
            placeholder="Come è andata? Sonno, fatica, meteo…"
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-1.5">
            <Button type="submit" size="xs" disabled={pending}>
              {pending ? "Analisi…" : "Invia feedback"}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Annulla
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          Lascia un feedback
        </Button>
      )}
    </div>
  );
}
