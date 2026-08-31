import type { Sport } from "@/lib/strava/constants";

export type ActivityMetricsInput = {
  sport: Sport;
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
};

export type AthleteThresholds = {
  ftpWatts: number | null;
  vdot: number | null;
  /** Lactate-threshold running speed (m/s), from VDOT T-pace. */
  runThresholdMps: number | null;
  /** Critical swim speed as seconds per 100 m. */
  swimThresholdPaceSecPer100m: number | null;
  lthr: number | null;
  maxHeartrate: number | null;
};

export type SportDayLoad = {
  tss: number;
  durationSec: number;
  activityCount: number;
};

export type SportBreakdown = Partial<Record<Sport, SportDayLoad>>;

export type DailyLoad = {
  date: string;
  tss: number;
  sportBreakdown: SportBreakdown;
};

export type PmcPoint = {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  tss: number;
  sportBreakdown: SportBreakdown;
};

export type MetricSnapshot = PmcPoint & {
  ftp: number | null;
  vdot: number | null;
  swimThresholdPaceSecPer100m: number | null;
};

export type IntensityZone = {
  zone: number;
  label: string;
  /** Inclusive lower bound; unit depends on `unit`. */
  min: number;
  /** Exclusive upper bound; omitted on the top zone. */
  max?: number;
  unit: "watts" | "secPerKm" | "secPer100m" | "bpm";
};

export type SportZones = {
  sport: Sport;
  metric: "power" | "pace" | "hr";
  zones: IntensityZone[];
};
