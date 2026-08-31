/** UTC calendar date `YYYY-MM-DD` (PMC is day-based, not local-tz). */
export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseUtcDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addUtcDays(key: string, days: number): string {
  const date = parseUtcDateKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateKey(date);
}

export function utcToday(now = new Date()): string {
  return utcDateKey(now);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const from = parseUtcDateKey(fromKey).getTime();
  const to = parseUtcDateKey(toKey).getTime();
  return Math.round((to - from) / 86_400_000);
}
