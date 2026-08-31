import type { Sport } from "@/lib/strava/constants";

export type MatchableWorkout = {
  id: string;
  sport: Sport;
  plannedDate: Date;
  durationMin: number;
};

export type MatchableActivity = {
  id: string;
  sport: Sport;
  startedAt: Date;
  durationSec: number;
};

export type WorkoutActivityMatch = {
  workoutId: string;
  activityId: string;
  score: number;
};
