/**
 * Returns the calendar date for a workout in a program week.
 * Week 1 starts on `startDate` (normalized to UTC midnight).
 */
export function plannedDateForWorkout(
  startDate: Date,
  weekNumber: number,
  dayOfWeek: number,
): Date {
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);

  const startDay = start.getUTCDay();
  const daysUntilFirstSlot = (dayOfWeek - startDay + 7) % 7;
  const firstWeekOffset = daysUntilFirstSlot;

  const result = new Date(start);
  result.setUTCDate(
    result.getUTCDate() + firstWeekOffset + (weekNumber - 1) * 7,
  );
  return result;
}

export function nextMonday(from = new Date()): Date {
  const date = new Date(from);
  date.setUTCHours(0, 0, 0, 0);
  const day = date.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  return date;
}
