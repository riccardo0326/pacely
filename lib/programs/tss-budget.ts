import type { Sport } from "@/lib/llm/schemas";

export type ActivityLoadSample = {
  sport: Sport;
  durationSec: number;
  startedAt: Date;
};

const DEFAULT_WEEKLY_TSS = 200;
const MIN_WEEKLY_TSS = 120;
const MAX_WEEKLY_TSS = 600;

/** Rough TSS/min by sport when CTL/ATL snapshots are not yet available. */
const TSS_PER_MINUTE: Record<Sport, number> = {
  run: 1.1,
  ride: 0.9,
  swim: 1.3,
};

function roundTss(value: number): number {
  return Math.round(value);
}

function estimateWeeklyTssFromActivities(
  activities: ActivityLoadSample[],
  referenceDate = new Date(),
): number {
  const windowStart = new Date(referenceDate);
  windowStart.setDate(windowStart.getDate() - 28);

  const recent = activities.filter(
    (activity) => activity.startedAt >= windowStart,
  );
  if (recent.length === 0) {
    return DEFAULT_WEEKLY_TSS;
  }

  let totalTss = 0;
  for (const activity of recent) {
    const minutes = activity.durationSec / 60;
    totalTss += minutes * (TSS_PER_MINUTE[activity.sport] ?? 1);
  }

  const weeklyAverage = totalTss / 4;
  return roundTss(weeklyAverage);
}

/**
 * Weekly TSS budget for program generation.
 * Uses CTL when available; otherwise estimates from recent activity volume.
 * Caps progression at ~10% above current load.
 */
export function calculateWeeklyTssBudget(options: {
  ctl?: number;
  atl?: number;
  activities?: ActivityLoadSample[];
  referenceDate?: Date;
}): number {
  const { ctl, atl, activities = [], referenceDate = new Date() } = options;

  let base: number;
  if (ctl !== undefined && ctl > 0) {
    base = ctl;
  } else if (atl !== undefined && atl > 0) {
    base = atl;
  } else {
    base = estimateWeeklyTssFromActivities(activities, referenceDate);
  }

  const progression = roundTss(base * 1.05);
  return Math.min(MAX_WEEKLY_TSS, Math.max(MIN_WEEKLY_TSS, progression));
}

export function distributeTssAcrossSports(
  totalTss: number,
  sports: Sport[],
): Record<Sport, number> {
  if (sports.length === 0) {
    return { run: 0, swim: 0, ride: 0 };
  }

  const share = totalTss / sports.length;
  const result: Record<Sport, number> = { run: 0, swim: 0, ride: 0 };
  sports.forEach((sport, index) => {
    const isLast = index === sports.length - 1;
    const allocated = isLast
      ? roundTss(totalTss - share * (sports.length - 1))
      : roundTss(share);
    result[sport] = allocated;
  });
  return result;
}
