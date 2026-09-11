export const STRAVA_API_BASE = "https://www.strava.com/api/v3";
export const STRAVA_ACTIVITIES_PER_PAGE = 200;
export const STRAVA_REQUEST_TIMEOUT_MS = 15_000;
export const STRAVA_SHORT_RATE_WINDOW_MS = 15 * 60 * 1000;

export const JOB_TYPE_STRAVA_BACKFILL = "strava_backfill";

export const JOB_STATUS = {
  pending: "pending",
  running: "running",
  done: "done",
  failed: "failed",
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export const SPORTS = ["run", "swim", "ride"] as const;
export type Sport = (typeof SPORTS)[number];

export const ACTIVITY_SPORTS = ["run", "swim", "ride", "other"] as const;
export type ActivitySport = (typeof ACTIVITY_SPORTS)[number];
export type ActivitySportFilter = ActivitySport | "all";

export const SPORT_LABELS: Record<ActivitySport, string> = {
  run: "Corsa",
  swim: "Nuoto",
  ride: "Ciclismo",
  other: "Extra",
};

export function parseActivitySportFilter(
  value: string | undefined,
): ActivitySportFilter {
  if (value && (ACTIVITY_SPORTS as readonly string[]).includes(value)) {
    return value as ActivitySport;
  }
  return "all";
}
