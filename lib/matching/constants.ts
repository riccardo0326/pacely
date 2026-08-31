export const WORKOUT_STATUS = {
  planned: "planned",
  completed: "completed",
  skipped: "skipped",
} as const;

export type WorkoutStatus =
  (typeof WORKOUT_STATUS)[keyof typeof WORKOUT_STATUS];

export const MATCH_SOURCE = {
  auto: "auto",
  manual: "manual",
} as const;

export type MatchSource = (typeof MATCH_SOURCE)[keyof typeof MATCH_SOURCE];

/** Same UTC day only — timezone edge cases are corrected in the UI. */
export const MATCH_MAX_DAY_OFFSET = 0;

/** Relative duration gap allowed (40% of planned duration). */
export const MATCH_MAX_RELATIVE_DURATION_DELTA = 0.4;

/** Absolute duration gap allowed (covers short workouts). */
export const MATCH_MAX_ABSOLUTE_DURATION_DELTA_SEC = 15 * 60;

/** Unmatched planned workouts older than this become skipped. */
export const AUTO_SKIP_GRACE_DAYS = 2;
