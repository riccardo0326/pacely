export const RECALC_STATUS = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const;

export type RecalcStatus = (typeof RECALC_STATUS)[keyof typeof RECALC_STATUS];

export const RECALC_SOURCE = {
  feedback: "feedback",
  weekAdapt: "week_adapt",
} as const;

export type RecalcSource = (typeof RECALC_SOURCE)[keyof typeof RECALC_SOURCE];

export const RECALC_ACTION = {
  reduceLoad: "reduce_load",
  shiftRestDay: "shift_rest_day",
  extendRecovery: "extend_recovery",
  adaptWeek: "adapt_week",
} as const;

export type RecalcAction = (typeof RECALC_ACTION)[keyof typeof RECALC_ACTION];

export const RECALC_OP = {
  scale: "scale",
  retype: "retype",
  move: "move",
  skip: "skip",
  swap: "swap",
} as const;

export type RecalcOp = (typeof RECALC_OP)[keyof typeof RECALC_OP];

export const SITUATION_TAG = {
  tired: "tired",
  littleTime: "little_time",
  niggleInjury: "niggle_injury",
  illness: "illness",
  travel: "travel",
  extraLoad: "extra_load",
  noQuality: "no_quality",
  personal: "personal",
} as const;

export type SituationTag = (typeof SITUATION_TAG)[keyof typeof SITUATION_TAG];

export const SITUATION_TAG_OPTIONS = [
  SITUATION_TAG.tired,
  SITUATION_TAG.littleTime,
  SITUATION_TAG.niggleInjury,
  SITUATION_TAG.illness,
  SITUATION_TAG.travel,
  SITUATION_TAG.extraLoad,
  SITUATION_TAG.noQuality,
  SITUATION_TAG.personal,
] as const;

export const ADAPT_STRATEGY = {
  recover: "recover",
  reshape: "reshape",
  postponeQuality: "postpone_quality",
  timebox: "timebox",
} as const;

export type AdaptStrategy =
  (typeof ADAPT_STRATEGY)[keyof typeof ADAPT_STRATEGY];

export const KEY_SESSION_SKIP_TAGS: ReadonlySet<SituationTag> = new Set([
  SITUATION_TAG.niggleInjury,
  SITUATION_TAG.illness,
]);

/**
 * Calibration window for suggested recals (PROJECT_SPEC.md §5.3).
 * Parameterized so 8-week vs 12-week programs are not special-cased in callers.
 */
export type CalibrationWindowConfig = {
  shortMaxWeeks: number;
  shortWindowWeeks: number;
  longMinWeeks: number;
  longWindowWeeks: number;
};

export const DEFAULT_CALIBRATION_CONFIG: CalibrationWindowConfig = {
  shortMaxWeeks: 8,
  shortWindowWeeks: 2,
  longMinWeeks: 10,
  longWindowWeeks: 3,
};

export const LOAD_SCALE = {
  reduce_load: 0.8,
  extend_recovery: 0.7,
  adapt_recover: 0.7,
} as const;

export const REDUCE_LOAD_MAX_WORKOUTS = 4;
export const EXTEND_RECOVERY_MAX_WORKOUTS = 2;
export const MIN_BLOCK_DURATION_MIN = 5;

export const ADAPT_TSS_BAND = {
  minFactor: 0.4,
  maxFactor: 1.1,
  illnessMinFactor: 0,
} as const;

export const EXTRA_LOAD_DURATION_MIN = 90;
export const EXTRA_LOAD_TSS = 60;
export const EXTRA_LOAD_LOOKBACK_HOURS = 48;
