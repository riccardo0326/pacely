import type { RecalcAction } from "@/lib/feedback/constants";
import {
  ADAPT_STRATEGY,
  RECALC_ACTION,
  RECALC_OP,
  SITUATION_TAG,
  type AdaptStrategy,
  type RecalcOp,
  type SituationTag,
} from "@/lib/feedback/constants";
import type { RecalcChanges } from "@/lib/feedback/schema";
import type { FeedbackAnalysisOutput } from "@/lib/llm/schemas";

export const RECALC_ACTION_LABEL: Record<RecalcAction, string> = {
  reduce_load: "Riduzione del carico",
  shift_rest_day: "Spostamento del giorno di riposo",
  extend_recovery: "Recupero extra",
  adapt_week: "Adatta la settimana",
};

export const ADAPT_STRATEGY_LABEL: Record<AdaptStrategy, string> = {
  [ADAPT_STRATEGY.recover]: "Settimana di recupero",
  [ADAPT_STRATEGY.reshape]: "Riorganizzazione della settimana",
  [ADAPT_STRATEGY.postponeQuality]: "Qualità spostata",
  [ADAPT_STRATEGY.timebox]: "Sedute accorciate",
};

export const RECALC_OP_LABEL: Record<RecalcOp, string> = {
  [RECALC_OP.scale]: "Carico ricalcolato",
  [RECALC_OP.retype]: "Tipo cambiato",
  [RECALC_OP.move]: "Spostato",
  [RECALC_OP.skip]: "Saltato",
  [RECALC_OP.swap]: "Scambiato",
};

export const SITUATION_TAG_LABEL: Record<SituationTag, string> = {
  [SITUATION_TAG.tired]: "Molto stanco",
  [SITUATION_TAG.littleTime]: "Poco tempo",
  [SITUATION_TAG.niggleInjury]: "Fastidio / infortunio",
  [SITUATION_TAG.illness]: "Malattia",
  [SITUATION_TAG.travel]: "Viaggio",
  [SITUATION_TAG.extraLoad]: "Ho già faticato extra",
  [SITUATION_TAG.noQuality]: "Non posso fare qualità",
  [SITUATION_TAG.personal]: "Impegno personale",
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
  if (changes.action === RECALC_ACTION.adaptWeek && changes.strategy) {
    return `${ADAPT_STRATEGY_LABEL[changes.strategy]} · ${count} ${noun}`;
  }
  return `${RECALC_ACTION_LABEL[changes.action]} su ${count} ${noun} futuri`;
}
