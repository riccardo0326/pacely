import type {
  AthleteThresholds,
  IntensityZone,
  SportZones,
} from "@/lib/metrics/types";

function powerZones(ftp: number): IntensityZone[] {
  return [
    { zone: 1, label: "Recupero", min: 0, max: ftp * 0.55, unit: "watts" },
    {
      zone: 2,
      label: "Endurance",
      min: ftp * 0.55,
      max: ftp * 0.75,
      unit: "watts",
    },
    { zone: 3, label: "Tempo", min: ftp * 0.75, max: ftp * 0.9, unit: "watts" },
    {
      zone: 4,
      label: "Soglia",
      min: ftp * 0.9,
      max: ftp * 1.05,
      unit: "watts",
    },
    { zone: 5, label: "VO2 / anaerobica", min: ftp * 1.05, unit: "watts" },
  ];
}

/** Pace zones as seconds/km from threshold speed (faster = lower sec/km). */
function runPaceZones(thresholdMps: number): IntensityZone[] {
  const tSecPerKm = 1000 / thresholdMps;
  return [
    { zone: 1, label: "Recupero", min: tSecPerKm * 1.29, unit: "secPerKm" },
    {
      zone: 2,
      label: "Endurance",
      min: tSecPerKm * 1.14,
      max: tSecPerKm * 1.29,
      unit: "secPerKm",
    },
    {
      zone: 3,
      label: "Tempo",
      min: tSecPerKm * 1.06,
      max: tSecPerKm * 1.14,
      unit: "secPerKm",
    },
    {
      zone: 4,
      label: "Soglia",
      min: tSecPerKm * 0.99,
      max: tSecPerKm * 1.06,
      unit: "secPerKm",
    },
    {
      zone: 5,
      label: "VO2 / ripetute",
      min: 0,
      max: tSecPerKm * 0.99,
      unit: "secPerKm",
    },
  ];
}

function swimPaceZones(cssSecPer100m: number): IntensityZone[] {
  return [
    {
      zone: 1,
      label: "Recupero",
      min: cssSecPer100m * 1.15,
      unit: "secPer100m",
    },
    {
      zone: 2,
      label: "Endurance",
      min: cssSecPer100m * 1.06,
      max: cssSecPer100m * 1.15,
      unit: "secPer100m",
    },
    {
      zone: 3,
      label: "Tempo",
      min: cssSecPer100m,
      max: cssSecPer100m * 1.06,
      unit: "secPer100m",
    },
    {
      zone: 4,
      label: "Soglia",
      min: cssSecPer100m * 0.95,
      max: cssSecPer100m,
      unit: "secPer100m",
    },
    {
      zone: 5,
      label: "VO2 / sprint",
      min: 0,
      max: cssSecPer100m * 0.95,
      unit: "secPer100m",
    },
  ];
}

function hrZones(maxHr: number): IntensityZone[] {
  return [
    {
      zone: 1,
      label: "Recupero",
      min: maxHr * 0.5,
      max: maxHr * 0.6,
      unit: "bpm",
    },
    {
      zone: 2,
      label: "Endurance",
      min: maxHr * 0.6,
      max: maxHr * 0.7,
      unit: "bpm",
    },
    {
      zone: 3,
      label: "Tempo",
      min: maxHr * 0.7,
      max: maxHr * 0.8,
      unit: "bpm",
    },
    {
      zone: 4,
      label: "Soglia",
      min: maxHr * 0.8,
      max: maxHr * 0.9,
      unit: "bpm",
    },
    { zone: 5, label: "VO2 / anaerobica", min: maxHr * 0.9, unit: "bpm" },
  ];
}

export function computeIntensityZones(
  thresholds: AthleteThresholds,
): SportZones[] {
  const result: SportZones[] = [];
  if (thresholds.ftpWatts !== null && thresholds.ftpWatts > 0) {
    result.push({
      sport: "ride",
      metric: "power",
      zones: powerZones(thresholds.ftpWatts),
    });
  }
  if (thresholds.runThresholdMps !== null && thresholds.runThresholdMps > 0) {
    result.push({
      sport: "run",
      metric: "pace",
      zones: runPaceZones(thresholds.runThresholdMps),
    });
  }
  if (
    thresholds.swimThresholdPaceSecPer100m !== null &&
    thresholds.swimThresholdPaceSecPer100m > 0
  ) {
    result.push({
      sport: "swim",
      metric: "pace",
      zones: swimPaceZones(thresholds.swimThresholdPaceSecPer100m),
    });
  }
  if (thresholds.maxHeartrate !== null && thresholds.maxHeartrate > 0) {
    result.push({
      sport: "run",
      metric: "hr",
      zones: hrZones(thresholds.maxHeartrate),
    });
  }
  return result;
}
