import { WORKOUT_STATUS } from "@/lib/matching/constants";

export type PlannedActualTotals = {
  plannedCount: number;
  completedCount: number;
  skippedCount: number;
  unmatchedCount: number;
  plannedTss: number;
  actualTss: number;
  plannedDurationMin: number;
  actualDurationMin: number;
};

export type PlannedActualItem = {
  status: string;
  plannedTss: number;
  plannedDurationMin: number;
  actualTss: number | null;
  actualDurationMin: number | null;
};

export function emptyPlannedActualTotals(): PlannedActualTotals {
  return {
    plannedCount: 0,
    completedCount: 0,
    skippedCount: 0,
    unmatchedCount: 0,
    plannedTss: 0,
    actualTss: 0,
    plannedDurationMin: 0,
    actualDurationMin: 0,
  };
}

export function summarizePlannedVsActual(
  items: PlannedActualItem[],
): PlannedActualTotals {
  const totals = emptyPlannedActualTotals();
  for (const item of items) {
    totals.plannedCount += 1;
    totals.plannedTss += item.plannedTss;
    totals.plannedDurationMin += item.plannedDurationMin;
    if (item.status === WORKOUT_STATUS.completed) {
      totals.completedCount += 1;
    } else if (item.status === WORKOUT_STATUS.skipped) {
      totals.skippedCount += 1;
    } else {
      totals.unmatchedCount += 1;
    }
    if (item.actualTss !== null) {
      totals.actualTss += item.actualTss;
    }
    if (item.actualDurationMin !== null) {
      totals.actualDurationMin += item.actualDurationMin;
    }
  }
  return totals;
}

export function durationDeltaPct(
  plannedMin: number,
  actualMin: number | null,
): number | null {
  if (actualMin === null || plannedMin <= 0) {
    return null;
  }
  return ((actualMin - plannedMin) / plannedMin) * 100;
}
