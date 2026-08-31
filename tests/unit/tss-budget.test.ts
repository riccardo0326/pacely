import { describe, expect, it } from "vitest";
import {
  plannedDateForWorkout,
  nextMonday,
  programEndDate,
} from "@/lib/programs/dates";
import {
  calculateWeeklyTssBudget,
  distributeTssAcrossSports,
} from "@/lib/programs/tss-budget";

describe("calculateWeeklyTssBudget", () => {
  it("uses CTL when available", () => {
    expect(calculateWeeklyTssBudget({ ctl: 300 })).toBe(315);
  });

  it("falls back to ATL when CTL is missing", () => {
    expect(calculateWeeklyTssBudget({ atl: 250 })).toBe(263);
  });

  it("estimates from recent activities when metrics are absent", () => {
    const now = new Date("2026-04-01T12:00:00Z");
    const budget = calculateWeeklyTssBudget({
      activities: [
        {
          sport: "run",
          durationSec: 3600,
          startedAt: new Date("2026-03-25T06:00:00Z"),
        },
        {
          sport: "ride",
          durationSec: 5400,
          startedAt: new Date("2026-03-20T06:00:00Z"),
        },
      ],
      referenceDate: now,
    });
    expect(budget).toBeGreaterThanOrEqual(120);
    expect(budget).toBeLessThanOrEqual(600);
  });

  it("returns default when there is no history", () => {
    expect(calculateWeeklyTssBudget({ activities: [] })).toBe(210);
  });
});

describe("distributeTssAcrossSports", () => {
  it("splits load evenly across selected sports", () => {
    expect(distributeTssAcrossSports(300, ["run", "ride"])).toEqual({
      run: 150,
      swim: 0,
      ride: 150,
    });
  });
});

describe("plannedDateForWorkout", () => {
  it("maps week number and weekday from program start", () => {
    const start = new Date("2026-04-06T00:00:00Z");
    const date = plannedDateForWorkout(start, 2, 3);
    expect(date.toISOString().slice(0, 10)).toBe("2026-04-15");
  });
});

describe("nextMonday", () => {
  it("returns the following Monday when called mid-week", () => {
    const monday = nextMonday(new Date("2026-04-08T10:00:00Z"));
    expect(monday.getUTCDay()).toBe(1);
    expect(monday.toISOString().slice(0, 10)).toBe("2026-04-13");
  });
});

describe("programEndDate", () => {
  it("is the first day after the last full week", () => {
    const end = programEndDate("2026-09-07", 8);
    expect(end?.toISOString().slice(0, 10)).toBe("2026-11-02");
  });
});
