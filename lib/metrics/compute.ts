import { utcDateKey, utcToday } from "@/lib/metrics/dates";
import { computePmc } from "@/lib/metrics/pmc";
import { estimateThresholds } from "@/lib/metrics/thresholds";
import { computeActivityTss } from "@/lib/metrics/tss";
import type {
  ActivityMetricsInput,
  DailyLoad,
  MetricSnapshot,
  SportBreakdown,
  SportDayLoad,
} from "@/lib/metrics/types";
import { computeIntensityZones } from "@/lib/metrics/zones";
import type { Sport } from "@/lib/strava/constants";

function emptyLoad(): SportDayLoad {
  return { tss: 0, durationSec: 0, activityCount: 0 };
}

function addLoad(
  breakdown: SportBreakdown,
  sport: Sport,
  tss: number,
  durationSec: number,
) {
  const current = breakdown[sport] ?? emptyLoad();
  breakdown[sport] = {
    tss: current.tss + tss,
    durationSec: current.durationSec + durationSec,
    activityCount: current.activityCount + 1,
  };
}

export function buildDailyLoads(activities: ActivityMetricsInput[]): {
  loads: DailyLoad[];
  thresholds: ReturnType<typeof estimateThresholds>;
} {
  const asOf = activities.reduce((latest, activity) => {
    return activity.startedAt > latest ? activity.startedAt : latest;
  }, new Date(0));
  const thresholds = estimateThresholds(
    activities,
    asOf.getTime() === 0 ? new Date() : asOf,
  );

  const byDate = new Map<string, DailyLoad>();
  for (const activity of activities) {
    if (activity.durationSec <= 0) {
      continue;
    }
    const date = utcDateKey(activity.startedAt);
    const day = byDate.get(date) ?? {
      date,
      tss: 0,
      sportBreakdown: {},
    };
    const tss = computeActivityTss(activity, thresholds);
    day.tss += tss;
    addLoad(day.sportBreakdown, activity.sport, tss, activity.durationSec);
    byDate.set(date, day);
  }

  const loads = [...byDate.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return { loads, thresholds };
}

export function computeMetricSnapshots(
  activities: ActivityMetricsInput[],
  throughDate = utcToday(),
): MetricSnapshot[] {
  if (activities.length === 0) {
    return [];
  }
  const { loads, thresholds } = buildDailyLoads(activities);
  return computePmc(loads, throughDate).map((point) => ({
    ...point,
    ftp: thresholds.ftpWatts,
    vdot: thresholds.vdot,
    swimThresholdPaceSecPer100m: thresholds.swimThresholdPaceSecPer100m,
  }));
}

export function computeCurrentMetrics(activities: ActivityMetricsInput[]) {
  const snapshots = computeMetricSnapshots(activities);
  const latest = snapshots.at(-1) ?? null;
  const { thresholds } = buildDailyLoads(activities);
  return {
    latest,
    snapshots,
    thresholds,
    zones: computeIntensityZones(thresholds),
  };
}
