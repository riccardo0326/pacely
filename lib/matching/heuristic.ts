import { daysBetween, utcDateKey } from "@/lib/metrics/dates";
import {
  MATCH_MAX_ABSOLUTE_DURATION_DELTA_SEC,
  MATCH_MAX_DAY_OFFSET,
  MATCH_MAX_RELATIVE_DURATION_DELTA,
} from "@/lib/matching/constants";
import type {
  MatchableActivity,
  MatchableWorkout,
  WorkoutActivityMatch,
} from "@/lib/matching/types";

function plannedDurationSec(workout: MatchableWorkout): number {
  return workout.durationMin * 60;
}

export function isDurationCompatible(
  plannedSec: number,
  actualSec: number,
): boolean {
  if (plannedSec <= 0 || actualSec <= 0) {
    return false;
  }
  const delta = Math.abs(plannedSec - actualSec);
  const relative = delta / plannedSec;
  return (
    relative <= MATCH_MAX_RELATIVE_DURATION_DELTA ||
    delta <= MATCH_MAX_ABSOLUTE_DURATION_DELTA_SEC
  );
}

export function scoreWorkoutActivityPair(
  workout: MatchableWorkout,
  activity: MatchableActivity,
): number | null {
  if (workout.sport !== activity.sport) {
    return null;
  }
  const dayOffset = Math.abs(
    daysBetween(
      utcDateKey(workout.plannedDate),
      utcDateKey(activity.startedAt),
    ),
  );
  if (dayOffset > MATCH_MAX_DAY_OFFSET) {
    return null;
  }
  const plannedSec = plannedDurationSec(workout);
  if (!isDurationCompatible(plannedSec, activity.durationSec)) {
    return null;
  }
  const relative =
    Math.abs(plannedSec - activity.durationSec) / Math.max(plannedSec, 1);
  return 1 - Math.min(1, relative);
}

/**
 * Greedy 1:1 assignment: highest duration-similarity first.
 * One activity never binds to two workouts.
 */
export function pairWorkoutsToActivities(
  workouts: MatchableWorkout[],
  activities: MatchableActivity[],
): WorkoutActivityMatch[] {
  const pairs: WorkoutActivityMatch[] = [];
  for (const workout of workouts) {
    for (const activity of activities) {
      const score = scoreWorkoutActivityPair(workout, activity);
      if (score === null) {
        continue;
      }
      pairs.push({
        workoutId: workout.id,
        activityId: activity.id,
        score,
      });
    }
  }

  pairs.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const workoutCmp = a.workoutId.localeCompare(b.workoutId);
    if (workoutCmp !== 0) {
      return workoutCmp;
    }
    return a.activityId.localeCompare(b.activityId);
  });

  const usedWorkouts = new Set<string>();
  const usedActivities = new Set<string>();
  const matches: WorkoutActivityMatch[] = [];
  for (const pair of pairs) {
    if (
      usedWorkouts.has(pair.workoutId) ||
      usedActivities.has(pair.activityId)
    ) {
      continue;
    }
    usedWorkouts.add(pair.workoutId);
    usedActivities.add(pair.activityId);
    matches.push(pair);
  }
  return matches;
}
