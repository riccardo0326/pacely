export {
  AUTO_SKIP_GRACE_DAYS,
  MATCH_SOURCE,
  MATCH_MAX_ABSOLUTE_DURATION_DELTA_SEC,
  MATCH_MAX_DAY_OFFSET,
  MATCH_MAX_RELATIVE_DURATION_DELTA,
  WORKOUT_STATUS,
  type MatchSource,
  type WorkoutStatus,
} from "@/lib/matching/constants";
export {
  isDurationCompatible,
  pairWorkoutsToActivities,
  scoreWorkoutActivityPair,
} from "@/lib/matching/heuristic";
export type {
  MatchableActivity,
  MatchableWorkout,
  WorkoutActivityMatch,
} from "@/lib/matching/types";
