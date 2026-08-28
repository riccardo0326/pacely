import { mapStravaSport } from "@/lib/strava/sports";
import {
  stravaActivityPayloadSchema,
  type BackfillProgress,
} from "@/lib/strava/schemas";
import type { Sport } from "@/lib/strava/constants";

export type NormalizedActivity = {
  stravaActivityId: string;
  sport: Sport;
  name: string | null;
  startedAt: Date;
  durationSec: number;
  elapsedSec: number | null;
  distanceM: number | null;
  elevationGainM: number | null;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  averageWatts: number | null;
  weightedWatts: number | null;
  averageCadence: number | null;
  averageSpeedMps: number | null;
  perceivedExertion: number | null;
  splits: unknown | null;
  sourceRaw: unknown;
};

function nullableNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeStravaActivity(
  payload: unknown,
): NormalizedActivity | null {
  const parsed = stravaActivityPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }

  const sport = mapStravaSport(parsed.data.sport_type, parsed.data.type);
  if (!sport) {
    return null;
  }

  const startedAt = new Date(parsed.data.start_date);
  if (Number.isNaN(startedAt.getTime())) {
    return null;
  }

  const moving = parsed.data.moving_time;
  const elapsed = parsed.data.elapsed_time;
  const durationSec =
    typeof moving === "number" && moving > 0
      ? Math.round(moving)
      : typeof elapsed === "number" && elapsed > 0
        ? Math.round(elapsed)
        : 0;

  return {
    stravaActivityId: parsed.data.id,
    sport,
    name: parsed.data.name?.trim() ? parsed.data.name.trim() : null,
    startedAt,
    durationSec,
    elapsedSec: nullableNumber(elapsed) !== null ? Math.round(elapsed!) : null,
    distanceM: nullableNumber(parsed.data.distance),
    elevationGainM: nullableNumber(parsed.data.total_elevation_gain),
    averageHeartrate: nullableNumber(parsed.data.average_heartrate),
    maxHeartrate: nullableNumber(parsed.data.max_heartrate),
    averageWatts: nullableNumber(parsed.data.average_watts),
    weightedWatts: nullableNumber(parsed.data.weighted_average_watts),
    averageCadence: nullableNumber(parsed.data.average_cadence),
    averageSpeedMps: nullableNumber(parsed.data.average_speed),
    perceivedExertion:
      nullableNumber(parsed.data.perceived_exertion) !== null
        ? Math.round(parsed.data.perceived_exertion!)
        : null,
    splits: parsed.data.splits_metric ?? null,
    sourceRaw: payload,
  };
}

export function applyBackfillPage(
  progress: BackfillProgress,
  payloads: unknown[],
): { progress: BackfillProgress; activities: NormalizedActivity[] } {
  const activities: NormalizedActivity[] = [];
  let skipped = progress.skipped;

  for (const payload of payloads) {
    const normalized = normalizeStravaActivity(payload);
    if (!normalized) {
      skipped += 1;
      continue;
    }
    activities.push(normalized);
  }

  return {
    progress: {
      page: progress.page + 1,
      imported: progress.imported + activities.length,
      skipped,
    },
    activities,
  };
}
