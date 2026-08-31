import { daysBetween, utcDateKey } from "@/lib/metrics/dates";
import {
  DEFAULT_CALIBRATION_CONFIG,
  type CalibrationWindowConfig,
} from "@/lib/feedback/constants";

/** Weeks of suggested recalc from program start, given program length. */
export function calibrationWeekCount(
  durationWeeks: number,
  config: CalibrationWindowConfig = DEFAULT_CALIBRATION_CONFIG,
): number {
  if (durationWeeks >= config.longMinWeeks) {
    return config.longWindowWeeks;
  }
  return config.shortWindowWeeks;
}

/**
 * True when the workout's planned UTC date falls in the first N weeks
 * of the program (N from `calibrationWeekCount`).
 */
export function isWithinCalibrationWindow(
  programStart: Date,
  durationWeeks: number,
  workoutPlannedDate: Date,
  config: CalibrationWindowConfig = DEFAULT_CALIBRATION_CONFIG,
): boolean {
  const weeks = calibrationWeekCount(durationWeeks, config);
  const offset = daysBetween(
    utcDateKey(programStart),
    utcDateKey(workoutPlannedDate),
  );
  if (offset < 0) {
    return false;
  }
  return offset < weeks * 7;
}
