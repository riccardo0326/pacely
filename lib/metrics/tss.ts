import {
  FALLBACK_IF,
  MAX_INTENSITY_FACTOR,
  RUN_ELEVATION_DISTANCE_FACTOR,
} from "@/lib/metrics/constants";
import type {
  ActivityMetricsInput,
  AthleteThresholds,
} from "@/lib/metrics/types";

function clampIf(value: number): number {
  if (value < 0) {
    return 0;
  }
  return Math.min(value, MAX_INTENSITY_FACTOR);
}

function hours(durationSec: number): number {
  return durationSec / 3600;
}

function tssFromIf(durationSec: number, intensityFactor: number): number {
  const iff = clampIf(intensityFactor);
  return hours(durationSec) * iff * iff * 100;
}

function rpeIntensity(perceivedExertion: number | null): number | null {
  if (perceivedExertion === null || perceivedExertion <= 0) {
    return null;
  }
  return clampIf(perceivedExertion / 10);
}

function hrIntensity(
  averageHeartrate: number | null,
  lthr: number | null,
): number | null {
  if (averageHeartrate === null || lthr === null || lthr <= 0) {
    return null;
  }
  return clampIf(averageHeartrate / lthr);
}

function normalizedPower(activity: ActivityMetricsInput): number | null {
  const np = activity.weightedWatts ?? activity.averageWatts;
  return np !== null && np > 0 ? np : null;
}

/**
 * bikeTSS: (sec × NP × IF) / (FTP × 3600) × 100 with IF = NP/FTP.
 * Fallback: HR vs LTHR, then RPE, then duration-only IF.
 */
function bikeTss(
  activity: ActivityMetricsInput,
  thresholds: AthleteThresholds,
): number {
  const np = normalizedPower(activity);
  if (np !== null && thresholds.ftpWatts !== null && thresholds.ftpWatts > 0) {
    return tssFromIf(activity.durationSec, np / thresholds.ftpWatts);
  }
  const fromHr = hrIntensity(activity.averageHeartrate, thresholds.lthr);
  if (fromHr !== null) {
    return tssFromIf(activity.durationSec, fromHr);
  }
  const fromRpe = rpeIntensity(activity.perceivedExertion);
  if (fromRpe !== null) {
    return tssFromIf(activity.durationSec, fromRpe);
  }
  return tssFromIf(activity.durationSec, FALLBACK_IF.ride);
}

function gradeAdjustedSpeedMps(activity: ActivityMetricsInput): number | null {
  const duration = activity.durationSec;
  if (duration <= 0) {
    return null;
  }
  const distance = activity.distanceM;
  if (distance !== null && distance > 0) {
    const climb = activity.elevationGainM ?? 0;
    const effective =
      distance + Math.max(0, climb) * RUN_ELEVATION_DISTANCE_FACTOR;
    return effective / duration;
  }
  if (activity.averageSpeedMps !== null && activity.averageSpeedMps > 0) {
    return activity.averageSpeedMps;
  }
  return null;
}

/**
 * rTSS: hours × IF² × 100, IF = grade-adjusted speed / T-pace speed.
 * Without a VDOT-derived threshold, fall back to HR / RPE / duration.
 */
function runTss(
  activity: ActivityMetricsInput,
  thresholds: AthleteThresholds,
): number {
  const speed = gradeAdjustedSpeedMps(activity);
  if (
    speed !== null &&
    thresholds.runThresholdMps !== null &&
    thresholds.runThresholdMps > 0
  ) {
    return tssFromIf(activity.durationSec, speed / thresholds.runThresholdMps);
  }
  const fromHr = hrIntensity(activity.averageHeartrate, thresholds.lthr);
  if (fromHr !== null) {
    return tssFromIf(activity.durationSec, fromHr);
  }
  const fromRpe = rpeIntensity(activity.perceivedExertion);
  if (fromRpe !== null) {
    return tssFromIf(activity.durationSec, fromRpe);
  }
  return tssFromIf(activity.durationSec, FALLBACK_IF.run);
}

/**
 * sTSS: hours × IF² × 100, IF = actual speed / CSS.
 */
function swimTss(
  activity: ActivityMetricsInput,
  thresholds: AthleteThresholds,
): number {
  const css = thresholds.swimThresholdPaceSecPer100m;
  const distance = activity.distanceM;
  if (
    css !== null &&
    css > 0 &&
    distance !== null &&
    distance > 0 &&
    activity.durationSec > 0
  ) {
    const actualPace = (activity.durationSec / distance) * 100;
    if (actualPace > 0) {
      return tssFromIf(activity.durationSec, css / actualPace);
    }
  }
  const fromHr = hrIntensity(activity.averageHeartrate, thresholds.lthr);
  if (fromHr !== null) {
    return tssFromIf(activity.durationSec, fromHr);
  }
  const fromRpe = rpeIntensity(activity.perceivedExertion);
  if (fromRpe !== null) {
    return tssFromIf(activity.durationSec, fromRpe);
  }
  return tssFromIf(activity.durationSec, FALLBACK_IF.swim);
}

export function computeActivityTss(
  activity: ActivityMetricsInput,
  thresholds: AthleteThresholds,
): number {
  if (activity.durationSec <= 0) {
    return 0;
  }
  switch (activity.sport) {
    case "ride":
      return computeFinite(bikeTss(activity, thresholds));
    case "run":
      return computeFinite(runTss(activity, thresholds));
    case "swim":
      return computeFinite(swimTss(activity, thresholds));
  }
}

function computeFinite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
