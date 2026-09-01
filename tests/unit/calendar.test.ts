import { describe, expect, it } from "vitest";
import {
  durationDeltaPct,
  summarizePlannedVsActual,
} from "@/lib/calendar/compare";
import {
  calendarRange,
  enumerateUtcDates,
  parseCalendarView,
  shiftFocus,
  startOfUtcWeek,
} from "@/lib/calendar/range";

describe("calendar range", () => {
  it("starts the week on Monday UTC", () => {
    const wednesday = new Date("2026-09-02T12:00:00.000Z");
    expect(startOfUtcWeek(wednesday).toISOString()).toBe(
      "2026-08-31T00:00:00.000Z",
    );
  });

  it("returns 7 days for week view, 42 for month grid, and 1 for day view", () => {
    const week = calendarRange("week", new Date("2026-08-31T00:00:00.000Z"));
    expect(enumerateUtcDates(week.startKey, week.endKey)).toHaveLength(7);
    expect(week.startKey).toBe("2026-08-31");
    expect(week.endKey).toBe("2026-09-07");

    const month = calendarRange("month", new Date("2026-08-15T00:00:00.000Z"));
    expect(enumerateUtcDates(month.startKey, month.endKey)).toHaveLength(42);

    const day = calendarRange("day", new Date("2026-09-01T12:00:00.000Z"));
    expect(enumerateUtcDates(day.startKey, day.endKey)).toHaveLength(1);
    expect(day.startKey).toBe("2026-09-01");
    expect(day.endKey).toBe("2026-09-02");
  });

  it("shifts week by 7 days and month by calendar month", () => {
    const focus = new Date("2026-08-31T00:00:00.000Z");
    expect(shiftFocus("week", focus, 1).toISOString()).toBe(
      "2026-09-07T00:00:00.000Z",
    );
    expect(shiftFocus("day", focus, 1).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
    expect(shiftFocus("month", focus, 1).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
    expect(parseCalendarView("month")).toBe("month");
    expect(parseCalendarView("day")).toBe("day");
    expect(parseCalendarView("nope")).toBe("week");
  });
});

describe("planned vs actual summary", () => {
  it("aggregates weekly planned and completed load", () => {
    const totals = summarizePlannedVsActual([
      {
        status: "completed",
        plannedTss: 50,
        plannedDurationMin: 40,
        actualTss: 48,
        actualDurationMin: 42,
      },
      {
        status: "planned",
        plannedTss: 80,
        plannedDurationMin: 90,
        actualTss: null,
        actualDurationMin: null,
      },
      {
        status: "skipped",
        plannedTss: 30,
        plannedDurationMin: 20,
        actualTss: null,
        actualDurationMin: null,
      },
    ]);
    expect(totals).toMatchObject({
      plannedCount: 3,
      completedCount: 1,
      skippedCount: 1,
      unmatchedCount: 1,
      plannedTss: 160,
      actualTss: 48,
      plannedDurationMin: 150,
      actualDurationMin: 42,
    });
    expect(durationDeltaPct(40, 42)).toBeCloseTo(5);
    expect(durationDeltaPct(40, null)).toBeNull();
  });
});
