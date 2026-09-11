import { describe, expect, it } from "vitest";
import { pickAdaptableWeeks } from "@/lib/feedback/adapt-weeks";

function week(
  id: string,
  number: number,
  dates: Array<{ date: string; status?: string }>,
) {
  return {
    id,
    number,
    workouts: dates.map((row) => ({
      status: row.status ?? "planned",
      plannedDate: row.date,
    })),
  };
}

describe("pickAdaptableWeeks", () => {
  it("returns current and next when both have remaining workouts", () => {
    const weeks = [
      week("w1", 1, [{ date: "2026-08-31" }, { date: "2026-09-02" }]),
      week("w2", 2, [{ date: "2026-09-07" }, { date: "2026-09-09" }]),
      week("w3", 3, [{ date: "2026-09-14" }]),
    ];
    expect(pickAdaptableWeeks(weeks, "2026-09-02")).toEqual([
      { id: "w1", number: 1, remainingCount: 1 },
      { id: "w2", number: 2, remainingCount: 2 },
    ]);
  });

  it("skips past weeks and weeks with no remaining planned workouts", () => {
    const weeks = [
      week("w1", 1, [
        { date: "2026-08-31", status: "completed" },
        { date: "2026-09-02", status: "completed" },
      ]),
      week("w2", 2, [{ date: "2026-09-07" }]),
    ];
    expect(pickAdaptableWeeks(weeks, "2026-09-03")).toEqual([
      { id: "w2", number: 2, remainingCount: 1 },
    ]);
  });

  it("does not include week +2", () => {
    const weeks = [
      week("w1", 1, [{ date: "2026-08-31" }]),
      week("w2", 2, [{ date: "2026-09-07" }]),
      week("w3", 3, [{ date: "2026-09-14" }]),
    ];
    const ids = pickAdaptableWeeks(weeks, "2026-08-31").map((row) => row.id);
    expect(ids).toEqual(["w1", "w2"]);
  });
});
