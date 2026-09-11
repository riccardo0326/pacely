import { startOfUtcWeek } from "@/lib/calendar/range";
import { WORKOUT_STATUS } from "@/lib/matching/constants";
import { parseUtcDateKey, utcDateKey } from "@/lib/metrics/dates";

export type WeekAdaptCandidate = {
  id: string;
  number: number;
  remainingCount: number;
};

export type AdaptWeekInputWeek = {
  id: string;
  number: number;
  workouts: Array<{ status: string; plannedDate: string | Date }>;
};

function dateKey(value: string | Date): string {
  return typeof value === "string" ? value.slice(0, 10) : utcDateKey(value);
}

export function remainingWorkoutCount(
  week: AdaptWeekInputWeek,
  today: string,
): number {
  return week.workouts.filter(
    (workout) =>
      workout.status === WORKOUT_STATUS.planned &&
      dateKey(workout.plannedDate) >= today,
  ).length;
}

function weekStartKey(week: AdaptWeekInputWeek): string | null {
  const dates = week.workouts.map((workout) => dateKey(workout.plannedDate));
  const first = dates.sort()[0];
  if (!first) {
    return null;
  }
  return utcDateKey(startOfUtcWeek(parseUtcDateKey(first)));
}

/**
 * Only the ISO week containing `today` and the following program week,
 * and only if they still have planned workouts from today onward.
 */
export function pickAdaptableWeeks(
  weeks: AdaptWeekInputWeek[],
  today: string,
): WeekAdaptCandidate[] {
  const sorted = [...weeks].sort((a, b) => a.number - b.number);
  const todayWeekStart = utcDateKey(startOfUtcWeek(parseUtcDateKey(today)));
  let currentIndex = sorted.findIndex(
    (week) => weekStartKey(week) === todayWeekStart,
  );
  if (currentIndex < 0) {
    currentIndex = sorted.findIndex((week) => {
      const start = weekStartKey(week);
      return start != null && start >= todayWeekStart;
    });
  }
  if (currentIndex < 0) {
    return [];
  }
  const result: WeekAdaptCandidate[] = [];
  const current = sorted[currentIndex];
  const next = sorted[currentIndex + 1];
  const currentRemaining = remainingWorkoutCount(current, today);
  if (currentRemaining > 0) {
    result.push({
      id: current.id,
      number: current.number,
      remainingCount: currentRemaining,
    });
  }
  if (next) {
    const nextRemaining = remainingWorkoutCount(next, today);
    if (nextRemaining > 0) {
      result.push({
        id: next.id,
        number: next.number,
        remainingCount: nextRemaining,
      });
    }
  }
  return result;
}
