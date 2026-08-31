export const RECALC_STATUS = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const;

export type RecalcStatus = (typeof RECALC_STATUS)[keyof typeof RECALC_STATUS];

export const RECALC_ACTION = {
  reduceLoad: "reduce_load",
  shiftRestDay: "shift_rest_day",
  extendRecovery: "extend_recovery",
} as const;

export type RecalcAction = (typeof RECALC_ACTION)[keyof typeof RECALC_ACTION];

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
} as const;

export const REDUCE_LOAD_MAX_WORKOUTS = 4;
export const EXTEND_RECOVERY_MAX_WORKOUTS = 2;
export const MIN_BLOCK_DURATION_MIN = 5;
