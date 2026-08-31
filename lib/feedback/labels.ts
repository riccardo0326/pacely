import type { RecalcAction } from "@/lib/feedback/constants";
import type { RecalcChanges } from "@/lib/feedback/schema";
import type { FeedbackAnalysisOutput } from "@/lib/llm/schemas";

export const RECALC_ACTION_LABEL: Record<RecalcAction, string> = {
  reduce_load: "Riduzione del carico",
  shift_rest_day: "Spostamento del giorno di riposo",
  extend_recovery: "Recupero extra",
};

export const PLAN_DEVIATION_LABEL: Record<
  FeedbackAnalysisOutput["planDeviation"],
  string
> = {
  none: "In linea col piano",
  minor: "Scostamento lieve",
  significant: "Scostamento significativo",
};

export const EXTERNAL_FACTOR_LABEL: Record<
  FeedbackAnalysisOutput["externalFactors"][number],
  string
> = {
  sleep: "Sonno",
  stress: "Stress",
  illness: "Malattia",
  weather: "Meteo",
  nutrition: "Alimentazione",
  other: "Altro",
};

export function summarizeRecalcChanges(changes: RecalcChanges): string {
  const count = changes.workouts.length;
  const noun = count === 1 ? "allenamento" : "allenamenti";
  return `${RECALC_ACTION_LABEL[changes.action]} su ${count} ${noun} futuri`;
}
