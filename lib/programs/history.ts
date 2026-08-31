import type { Sport } from "@/lib/llm/schemas";
import { sportBreakdownSchema } from "@/lib/validation/metrics";

export type WeeklyHistorySummary = {
  weekStart: string;
  tssBySport?: Record<string, number>;
  hoursBySport?: Record<string, number>;
  activityCount?: number;
};

export type ActivityHistoryRow = {
  sport: Sport;
  durationSec: number;
  startedAt: Date;
};

export type SnapshotHistoryRow = {
  date: Date;
  sportBreakdown: unknown;
};

function startOfWeekMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setUTCDate(result.getUTCDate() + diff);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function weekKey(date: Date): string {
  return startOfWeekMonday(date).toISOString().slice(0, 10);
}

function emptyBucket() {
  return {
    tssBySport: {} as Record<string, number>,
    hoursBySport: {} as Record<string, number>,
    activityCount: 0,
  };
}

function toSummaries(
  byWeek: Map<string, ReturnType<typeof emptyBucket>>,
  weeks: number,
): WeeklyHistorySummary[] {
  const sortedKeys = [...byWeek.keys()].sort().slice(-weeks);
  return sortedKeys.map((weekStart) => {
    const bucket = byWeek.get(weekStart)!;
    return {
      weekStart,
      tssBySport: bucket.tssBySport,
      hoursBySport: bucket.hoursBySport,
      activityCount: bucket.activityCount,
    };
  });
}

/**
 * Aggregates Strava activities into weekly summaries for LLM context.
 * TSS is approximated from duration when snapshots are not available.
 */
export function buildAggregatedHistory(
  activities: ActivityHistoryRow[],
  weeks = 8,
): { weeklySummaries: WeeklyHistorySummary[] } {
  const byWeek = new Map<string, ReturnType<typeof emptyBucket>>();

  for (const activity of activities) {
    const key = weekKey(activity.startedAt);
    const bucket = byWeek.get(key) ?? emptyBucket();
    const hours = activity.durationSec / 3600;
    const roughTss = hours * 60;
    bucket.tssBySport[activity.sport] =
      (bucket.tssBySport[activity.sport] ?? 0) + roughTss;
    bucket.hoursBySport[activity.sport] =
      (bucket.hoursBySport[activity.sport] ?? 0) + hours;
    bucket.activityCount += 1;
    byWeek.set(key, bucket);
  }

  return { weeklySummaries: toSummaries(byWeek, weeks) };
}

/** Weekly TSS from persisted PMC snapshots (Fase 3), preferred over duration estimates. */
export function buildAggregatedHistoryFromSnapshots(
  snapshots: SnapshotHistoryRow[],
  weeks = 8,
): { weeklySummaries: WeeklyHistorySummary[] } {
  const byWeek = new Map<string, ReturnType<typeof emptyBucket>>();

  for (const snapshot of snapshots) {
    const parsed = sportBreakdownSchema.safeParse(snapshot.sportBreakdown);
    if (!parsed.success) {
      continue;
    }
    const key = weekKey(snapshot.date);
    const bucket = byWeek.get(key) ?? emptyBucket();
    for (const sport of ["run", "swim", "ride"] as const) {
      const load = parsed.data[sport];
      if (!load) {
        continue;
      }
      bucket.tssBySport[sport] = (bucket.tssBySport[sport] ?? 0) + load.tss;
      bucket.hoursBySport[sport] =
        (bucket.hoursBySport[sport] ?? 0) + load.durationSec / 3600;
      bucket.activityCount += load.activityCount;
    }
    byWeek.set(key, bucket);
  }

  return { weeklySummaries: toSummaries(byWeek, weeks) };
}
