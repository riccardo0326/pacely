import {
  CSS_MIN_DISTANCE_M,
  CSS_MIN_DURATION_SEC,
  FTP_FROM_20MIN_FACTOR,
  FTP_MIN_DURATION_SEC,
  LTHR_FROM_MAX_HR,
  THRESHOLD_LOOKBACK_DAYS,
  VDOT_MAX_DISTANCE_M,
  VDOT_MAX_DURATION_SEC,
  VDOT_MAX_SPEED_MPS,
  VDOT_MIN_DISTANCE_M,
  VDOT_MIN_DURATION_SEC,
  VDOT_MIN_SPEED_MPS,
} from "@/lib/metrics/constants";
import { addUtcDays, utcDateKey } from "@/lib/metrics/dates";
import type {
  ActivityMetricsInput,
  AthleteThresholds,
} from "@/lib/metrics/types";
import {
  thresholdSpeedMpsFromVdot,
  vdotFromPerformance,
} from "@/lib/metrics/vdot";

function inLookback(activity: ActivityMetricsInput, asOf: Date): boolean {
  const start = addUtcDays(utcDateKey(asOf), -THRESHOLD_LOOKBACK_DAYS);
  return utcDateKey(activity.startedAt) >= start && activity.startedAt <= asOf;
}

function normalizedPower(activity: ActivityMetricsInput): number | null {
  const np = activity.weightedWatts ?? activity.averageWatts;
  return np !== null && np > 0 ? np : null;
}

function swimPaceSecPer100m(activity: ActivityMetricsInput): number | null {
  if (
    activity.distanceM === null ||
    activity.distanceM < CSS_MIN_DISTANCE_M ||
    activity.durationSec < CSS_MIN_DURATION_SEC
  ) {
    return null;
  }
  return (activity.durationSec / activity.distanceM) * 100;
}

function runSpeedMps(activity: ActivityMetricsInput): number | null {
  if (activity.averageSpeedMps && activity.averageSpeedMps > 0) {
    return activity.averageSpeedMps;
  }
  if (
    activity.distanceM !== null &&
    activity.distanceM > 0 &&
    activity.durationSec > 0
  ) {
    return activity.distanceM / activity.durationSec;
  }
  return null;
}

export function estimateFtpWatts(
  activities: ActivityMetricsInput[],
  asOf = new Date(),
): number | null {
  let bestNp: number | null = null;
  for (const activity of activities) {
    if (activity.sport !== "ride" || !inLookback(activity, asOf)) {
      continue;
    }
    if (activity.durationSec < FTP_MIN_DURATION_SEC) {
      continue;
    }
    const np = normalizedPower(activity);
    if (np === null) {
      continue;
    }
    if (bestNp === null || np > bestNp) {
      bestNp = np;
    }
  }
  if (bestNp === null) {
    return null;
  }
  return bestNp * FTP_FROM_20MIN_FACTOR;
}

export function estimateVdot(
  activities: ActivityMetricsInput[],
  asOf = new Date(),
): number | null {
  let best: number | null = null;
  for (const activity of activities) {
    if (activity.sport !== "run" || !inLookback(activity, asOf)) {
      continue;
    }
    if (
      activity.durationSec < VDOT_MIN_DURATION_SEC ||
      activity.durationSec > VDOT_MAX_DURATION_SEC
    ) {
      continue;
    }
    const distance = activity.distanceM;
    if (
      distance === null ||
      distance < VDOT_MIN_DISTANCE_M ||
      distance > VDOT_MAX_DISTANCE_M
    ) {
      continue;
    }
    const speed = runSpeedMps(activity);
    if (
      speed === null ||
      speed < VDOT_MIN_SPEED_MPS ||
      speed > VDOT_MAX_SPEED_MPS
    ) {
      continue;
    }
    const vdot = vdotFromPerformance(distance, activity.durationSec);
    if (vdot === null) {
      continue;
    }
    if (best === null || vdot > best) {
      best = vdot;
    }
  }
  return best;
}

export function estimateSwimThresholdPaceSecPer100m(
  activities: ActivityMetricsInput[],
  asOf = new Date(),
): number | null {
  let fastest: number | null = null;
  for (const activity of activities) {
    if (activity.sport !== "swim" || !inLookback(activity, asOf)) {
      continue;
    }
    const pace = swimPaceSecPer100m(activity);
    if (pace === null) {
      continue;
    }
    if (fastest === null || pace < fastest) {
      fastest = pace;
    }
  }
  return fastest;
}

export function estimateLthrBpm(
  activities: ActivityMetricsInput[],
  asOf = new Date(),
): { lthr: number | null; maxHeartrate: number | null } {
  let maxHr: number | null = null;
  for (const activity of activities) {
    if (!inLookback(activity, asOf)) {
      continue;
    }
    const hr = activity.maxHeartrate;
    if (hr !== null && hr > 0 && (maxHr === null || hr > maxHr)) {
      maxHr = hr;
    }
  }
  if (maxHr === null) {
    return { lthr: null, maxHeartrate: null };
  }
  return { lthr: maxHr * LTHR_FROM_MAX_HR, maxHeartrate: maxHr };
}

export function estimateThresholds(
  activities: ActivityMetricsInput[],
  asOf = new Date(),
): AthleteThresholds {
  const vdot = estimateVdot(activities, asOf);
  const { lthr, maxHeartrate } = estimateLthrBpm(activities, asOf);
  return {
    ftpWatts: estimateFtpWatts(activities, asOf),
    vdot,
    runThresholdMps: vdot === null ? null : thresholdSpeedMpsFromVdot(vdot),
    swimThresholdPaceSecPer100m: estimateSwimThresholdPaceSecPer100m(
      activities,
      asOf,
    ),
    lthr,
    maxHeartrate,
  };
}
