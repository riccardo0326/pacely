import { describe, expect, it } from "vitest";
import {
  ATL_TIME_CONSTANT_DAYS,
  CTL_TIME_CONSTANT_DAYS,
} from "@/lib/metrics/constants";
import { computePmc } from "@/lib/metrics/pmc";
import { computeMetricSnapshots } from "@/lib/metrics/compute";
import type { ActivityMetricsInput } from "@/lib/metrics/types";

describe("computePmc", () => {
  it("returns an empty series when there is no load", () => {
    expect(computePmc([], "2026-04-01")).toEqual([]);
  });

  it("applies Banister EMA and includes rest days", () => {
    const points = computePmc(
      [
        {
          date: "2026-04-01",
          tss: 100,
          sportBreakdown: {
            ride: { tss: 100, durationSec: 3600, activityCount: 1 },
          },
        },
      ],
      "2026-04-02",
    );

    expect(points).toHaveLength(2);
    expect(points[0]!.ctl).toBeCloseTo(100 / CTL_TIME_CONSTANT_DAYS, 8);
    expect(points[0]!.atl).toBeCloseTo(100 / ATL_TIME_CONSTANT_DAYS, 8);
    expect(points[0]!.tsb).toBeCloseTo(points[0]!.ctl - points[0]!.atl, 8);

    const ctl1 = points[0]!.ctl;
    const atl1 = points[0]!.atl;
    expect(points[1]!.tss).toBe(0);
    expect(points[1]!.ctl).toBeCloseTo(
      ctl1 + (0 - ctl1) / CTL_TIME_CONSTANT_DAYS,
      8,
    );
    expect(points[1]!.atl).toBeCloseTo(
      atl1 + (0 - atl1) / ATL_TIME_CONSTANT_DAYS,
      8,
    );
  });
});

describe("computeMetricSnapshots", () => {
  it("returns no snapshots when there are no activities", () => {
    expect(computeMetricSnapshots([], "2026-04-01")).toEqual([]);
  });

  it("aggregates a single sport and ignores empty-duration rows", () => {
    const activities: ActivityMetricsInput[] = [
      {
        sport: "run",
        startedAt: new Date("2026-04-01T07:00:00Z"),
        durationSec: 0,
        distanceM: 5000,
        elevationGainM: 0,
        averageHeartrate: null,
        maxHeartrate: null,
        averageWatts: null,
        weightedWatts: null,
        averageSpeedMps: null,
        perceivedExertion: null,
      },
      {
        sport: "run",
        startedAt: new Date("2026-04-01T08:00:00Z"),
        durationSec: 1800,
        distanceM: 5000,
        elevationGainM: 0,
        averageHeartrate: null,
        maxHeartrate: null,
        averageWatts: null,
        weightedWatts: null,
        averageSpeedMps: 5000 / 1800,
        perceivedExertion: null,
      },
    ];

    const snapshots = computeMetricSnapshots(activities, "2026-04-01");
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.sportBreakdown.ride).toBeUndefined();
    expect(snapshots[0]!.sportBreakdown.swim).toBeUndefined();
    expect(snapshots[0]!.sportBreakdown.run?.activityCount).toBe(1);
    expect(snapshots[0]!.tss).toBeGreaterThan(0);
    expect(snapshots[0]!.vdot).not.toBeNull();
  });
});
