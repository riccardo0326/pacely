import {
  addUtcDays,
  parseUtcDateKey,
  utcDateKey,
  utcToday,
} from "@/lib/metrics/dates";

export type CalendarView = "week" | "month";

/** Monday 00:00 UTC of the week containing `date`. */
export function startOfUtcWeek(date: Date): Date {
  const start = parseUtcDateKey(utcDateKey(date));
  const day = start.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  start.setUTCDate(start.getUTCDate() - offset);
  return start;
}

/** First day of the UTC month containing `date`. */
export function startOfUtcMonth(date: Date): Date {
  const start = parseUtcDateKey(utcDateKey(date));
  start.setUTCDate(1);
  return start;
}

export function addUtcMonths(date: Date, months: number): Date {
  const next = parseUtcDateKey(utcDateKey(date));
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export type DateRange = {
  start: Date;
  end: Date;
  startKey: string;
  endKey: string;
};

/**
 * Inclusive start, exclusive end. Week = 7 days from Monday.
 * Month grid = 6 weeks from the Monday on/before the 1st.
 */
export function calendarRange(view: CalendarView, focus: Date): DateRange {
  if (view === "week") {
    const start = startOfUtcWeek(focus);
    const end = parseUtcDateKey(addUtcDays(utcDateKey(start), 7));
    return {
      start,
      end,
      startKey: utcDateKey(start),
      endKey: utcDateKey(end),
    };
  }
  const monthStart = startOfUtcMonth(focus);
  const start = startOfUtcWeek(monthStart);
  const end = parseUtcDateKey(addUtcDays(utcDateKey(start), 42));
  return {
    start,
    end,
    startKey: utcDateKey(start),
    endKey: utcDateKey(end),
  };
}

export function enumerateUtcDates(startKey: string, endKey: string): string[] {
  const dates: string[] = [];
  let cursor = startKey;
  while (cursor < endKey) {
    dates.push(cursor);
    cursor = addUtcDays(cursor, 1);
  }
  return dates;
}

export function parseCalendarView(value: string | undefined): CalendarView {
  return value === "month" ? "month" : "week";
}

export function parseFocusDate(value: string | undefined): Date {
  if (!value) {
    return parseUtcDateKey(utcToday());
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return parseUtcDateKey(utcToday());
  }
  return parseUtcDateKey(value);
}

export function shiftFocus(
  view: CalendarView,
  focus: Date,
  direction: -1 | 1,
): Date {
  if (view === "week") {
    return parseUtcDateKey(addUtcDays(utcDateKey(focus), direction * 7));
  }
  return addUtcMonths(startOfUtcMonth(focus), direction);
}

export function formatWeekRangeLabel(startKey: string, endKey: string): string {
  const start = parseUtcDateKey(startKey);
  const last = parseUtcDateKey(addUtcDays(endKey, -1));
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  };
  const startLabel = start.toLocaleDateString("it-IT", opts);
  const endLabel = last.toLocaleDateString("it-IT", {
    ...opts,
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatMonthLabel(focus: Date): string {
  return startOfUtcMonth(focus).toLocaleDateString("it-IT", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}
