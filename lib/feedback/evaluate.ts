import { isWithinCalibrationWindow } from "@/lib/feedback/calibration";
import type { CalibrationWindowConfig } from "@/lib/feedback/constants";
import {
  buildRecalcChanges,
  isSignificantDeviation,
  rationaleFromAnalysis,
  resolveRecalcAction,
  type RecalcProposalDraft,
  type RecalcSkipReason,
  type RecalcTargetWorkout,
} from "@/lib/feedback/proposal";
import type { FeedbackAnalysisOutput } from "@/lib/llm/schemas";

export type EvaluateRecalcInput = {
  analysis: FeedbackAnalysisOutput;
  programStartDate: Date;
  durationWeeks: number;
  sourceWorkout: RecalcTargetWorkout;
  programWorkouts: RecalcTargetWorkout[];
  hasPendingProposal: boolean;
  config?: CalibrationWindowConfig;
};

export type EvaluateRecalcResult = {
  proposal: RecalcProposalDraft | null;
  skipReason: RecalcSkipReason | null;
};

/**
 * Decides whether a saved feedback analysis should yield a recalc proposal.
 * Always returns a skip reason when no proposal is produced.
 */
export function evaluateRecalcFromFeedback(
  input: EvaluateRecalcInput,
): EvaluateRecalcResult {
  if (input.hasPendingProposal) {
    return { proposal: null, skipReason: "pending_exists" };
  }

  if (!isSignificantDeviation(input.analysis)) {
    return { proposal: null, skipReason: "not_significant" };
  }

  if (
    !isWithinCalibrationWindow(
      input.programStartDate,
      input.durationWeeks,
      input.sourceWorkout.plannedDate,
      input.config,
    )
  ) {
    return { proposal: null, skipReason: "outside_window" };
  }

  const action = resolveRecalcAction(input.analysis);
  const changes = buildRecalcChanges(
    action,
    input.sourceWorkout,
    input.programWorkouts,
  );
  if (!changes) {
    return { proposal: null, skipReason: "no_future_workouts" };
  }

  return {
    proposal: {
      weekId: changes.workouts[0]?.weekId ?? input.sourceWorkout.weekId,
      rationale: rationaleFromAnalysis(input.analysis),
      changes,
    },
    skipReason: null,
  };
}
