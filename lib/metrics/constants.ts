export const JOB_TYPE_METRICS_RECALC = "metrics_recalc";

/** PMC time constants (TrainingPeaks / Banister). */
export const CTL_TIME_CONSTANT_DAYS = 42;
export const ATL_TIME_CONSTANT_DAYS = 7;

/** Rolling window used to estimate FTP / VDOT / CSS from recent performances. */
export const THRESHOLD_LOOKBACK_DAYS = 90;

/** 20-minute best NP × this factor ≈ FTP (standard 20-min test protocol). */
export const FTP_FROM_20MIN_FACTOR = 0.95;
export const FTP_MIN_DURATION_SEC = 20 * 60;

/** Runs shorter/slower than this are not treated as VDOT performances. */
export const VDOT_MIN_DURATION_SEC = 8 * 60;
export const VDOT_MAX_DURATION_SEC = 3 * 60 * 60;
export const VDOT_MIN_DISTANCE_M = 1500;
export const VDOT_MAX_DISTANCE_M = 50_000;
export const VDOT_MIN_SPEED_MPS = 1.8;
export const VDOT_MAX_SPEED_MPS = 7.5;

/** Extra equivalent distance per metre of elevation (grade-adjusted pace). */
export const RUN_ELEVATION_DISTANCE_FACTOR = 8;

/** Sustained swims used for critical swim speed. */
export const CSS_MIN_DISTANCE_M = 400;
export const CSS_MIN_DURATION_SEC = 8 * 60;

/** LTHR ≈ this fraction of the highest observed max HR. */
export const LTHR_FROM_MAX_HR = 0.85;

/** Intensity factor cap so bad GPS/HR spikes cannot explode TSS. */
export const MAX_INTENSITY_FACTOR = 1.5;

/** Duration-only IF when power, pace, HR, and RPE are all missing. */
export const FALLBACK_IF: Record<"run" | "swim" | "ride", number> = {
  run: 0.8,
  ride: 0.75,
  swim: 0.75,
};
