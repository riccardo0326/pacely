import {
  ATL_TIME_CONSTANT_DAYS,
  CTL_TIME_CONSTANT_DAYS,
} from "@/lib/metrics/constants";
import { addUtcDays } from "@/lib/metrics/dates";
import type { DailyLoad, PmcPoint } from "@/lib/metrics/types";

/**
 * Banister exponentially-weighted moving averages:
 * CTL (42d) and ATL (7d). TSB = CTL − ATL. Rest days (TSS 0) are included.
 */
export function computePmc(
  dailyLoads: DailyLoad[],
  throughDate: string,
): PmcPoint[] {
  if (dailyLoads.length === 0) {
    return [];
  }

  const byDate = new Map(dailyLoads.map((day) => [day.date, day]));
  const sorted = [...byDate.keys()].sort();
  const start = sorted[0]!;
  if (throughDate < start) {
    return [];
  }

  const points: PmcPoint[] = [];
  let ctl = 0;
  let atl = 0;
  let cursor = start;

  while (cursor <= throughDate) {
    const load = byDate.get(cursor);
    const tss = load?.tss ?? 0;
    ctl = ctl + (tss - ctl) / CTL_TIME_CONSTANT_DAYS;
    atl = atl + (tss - atl) / ATL_TIME_CONSTANT_DAYS;
    points.push({
      date: cursor,
      ctl,
      atl,
      tsb: ctl - atl,
      tss,
      sportBreakdown: load?.sportBreakdown ?? {},
    });
    cursor = addUtcDays(cursor, 1);
  }

  return points;
}
