import type { Sport } from "@/lib/llm/schemas";

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

/**
 * Aggregates Strava activities into weekly summaries for LLM context.
 * TSS is approximated from duration when snapshots are not passed in.
 */
export function buildAggregatedHistory(
  activities: ActivityHistoryRow[],
  weeks = 8,
): { weeklySummaries: WeeklyHistorySummary[] } {
  const byWeek = new Map<
    string,
    {
      tssBySport: Record<string, number>;
      hoursBySport: Record<string, number>;
      activityCount: number;
    }
  >();

  for (const activity of activities) {
    const key = weekKey(activity.startedAt);
    const bucket = byWeek.get(key) ?? {
      tssBySport: {},
      hoursBySport: {},
      activityCount: 0,
    };
    const hours = activity.durationSec / 3600;
    const roughTss = hours * 60;
    bucket.tssBySport[activity.sport] =
      (bucket.tssBySport[activity.sport] ?? 0) + roughTss;
    bucket.hoursBySport[activity.sport] =
      (bucket.hoursBySport[activity.sport] ?? 0) + hours;
    bucket.activityCount += 1;
    byWeek.set(key, bucket);
  }

  const sortedKeys = [...byWeek.keys()].sort().slice(-weeks);
  const weeklySummaries = sortedKeys.map((weekStart) => {
    const bucket = byWeek.get(weekStart)!;
    return {
      weekStart,
      tssBySport: bucket.tssBySport,
      hoursBySport: bucket.hoursBySport,
      activityCount: bucket.activityCount,
    };
  });

  return { weeklySummaries };
}
