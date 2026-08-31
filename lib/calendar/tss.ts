import { computeActivityTss } from "@/lib/metrics/tss";
import type {
  ActivityMetricsInput,
  AthleteThresholds,
} from "@/lib/metrics/types";
import { thresholdSpeedMpsFromVdot } from "@/lib/metrics/vdot";
import type { Sport } from "@/lib/strava/constants";

export function thresholdsFromSnapshot(
  snapshot: {
    ftp: number | null;
    vdot: number | null;
    swimThresholdPaceSecPer100m: number | null;
  } | null,
): AthleteThresholds {
  const vdot = snapshot?.vdot ?? null;
  return {
    ftpWatts: snapshot?.ftp ?? null,
    vdot,
    runThresholdMps: vdot === null ? null : thresholdSpeedMpsFromVdot(vdot),
    swimThresholdPaceSecPer100m: snapshot?.swimThresholdPaceSecPer100m ?? null,
    lthr: null,
    maxHeartrate: null,
  };
}

export function activityTssFromRow(
  row: {
    sport: string;
    startedAt: Date;
    durationSec: number;
    distanceM: number | null;
    elevationGainM: number | null;
    averageHeartrate: number | null;
    maxHeartrate: number | null;
    averageWatts: number | null;
    weightedWatts: number | null;
    averageSpeedMps: number | null;
    perceivedExertion: number | null;
  },
  thresholds: AthleteThresholds,
): number {
  if (row.sport !== "run" && row.sport !== "swim" && row.sport !== "ride") {
    return 0;
  }
  const input: ActivityMetricsInput = {
    sport: row.sport as Sport,
    startedAt: row.startedAt,
    durationSec: row.durationSec,
    distanceM: row.distanceM,
    elevationGainM: row.elevationGainM,
    averageHeartrate: row.averageHeartrate,
    maxHeartrate: row.maxHeartrate,
    averageWatts: row.averageWatts,
    weightedWatts: row.weightedWatts,
    averageSpeedMps: row.averageSpeedMps,
    perceivedExertion: row.perceivedExertion,
  };
  return computeActivityTss(input, thresholds);
}
