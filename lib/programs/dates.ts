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

export function parseIsoDateUtc(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function toIsoDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** First day after the last full program week. */
export function programEndDate(
  startIso: string,
  durationWeeks: number,
): Date | null {
  const start = parseIsoDateUtc(startIso);
  if (!start || !Number.isFinite(durationWeeks) || durationWeeks < 1) {
    return null;
  }
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + durationWeeks * 7);
  return end;
}

export function formatItalianDate(iso: string): string {
  const date = parseIsoDateUtc(iso) ?? new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString("it-IT", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
