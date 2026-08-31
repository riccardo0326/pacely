import { describe, expect, it } from "vitest";
import {
  buildAggregatedHistory,
  buildAggregatedHistoryFromSnapshots,
} from "@/lib/programs/history";

describe("buildAggregatedHistoryFromSnapshots", () => {
  it("sums weekly TSS from sportBreakdown instead of duration estimates", () => {
    const history = buildAggregatedHistoryFromSnapshots([
      {
        date: new Date("2026-03-03T00:00:00Z"),
        sportBreakdown: {
          run: { tss: 80, durationSec: 3600, activityCount: 1 },
          ride: { tss: 120, durationSec: 5400, activityCount: 1 },
        },
      },
      {
        date: new Date("2026-03-04T00:00:00Z"),
        sportBreakdown: {
          run: { tss: 40, durationSec: 1800, activityCount: 1 },
        },
      },
    ]);

    expect(history.weeklySummaries).toHaveLength(1);
    expect(history.weeklySummaries[0]?.tssBySport).toEqual({
      run: 120,
      ride: 120,
    });
    expect(history.weeklySummaries[0]?.activityCount).toBe(3);
  });

  it("skips snapshots with invalid breakdown JSON", () => {
    const history = buildAggregatedHistoryFromSnapshots([
      { date: new Date("2026-03-03T00:00:00Z"), sportBreakdown: "nope" },
    ]);
    expect(history.weeklySummaries).toEqual([]);
  });
});

describe("buildAggregatedHistory", () => {
  it("still estimates TSS from duration when snapshots are absent", () => {
    const history = buildAggregatedHistory([
      {
        sport: "run",
        durationSec: 3600,
        startedAt: new Date("2026-03-03T06:00:00Z"),
      },
    ]);
    expect(history.weeklySummaries[0]?.tssBySport?.run).toBe(60);
  });
});
