import { describe, expect, it } from "vitest";
import {
  estimateFtpWatts,
  estimateSwimThresholdPaceSecPer100m,
  estimateThresholds,
  estimateVdot,
} from "@/lib/metrics/thresholds";
import { vdotFromPerformance } from "@/lib/metrics/vdot";
import { computeIntensityZones } from "@/lib/metrics/zones";
import type { ActivityMetricsInput } from "@/lib/metrics/types";

function ride(
  overrides: Partial<ActivityMetricsInput> = {},
): ActivityMetricsInput {
  return {
    sport: "ride",
    startedAt: new Date("2026-03-15T08:00:00Z"),
    durationSec: 40 * 60,
    distanceM: 20_000,
    elevationGainM: 0,
    averageHeartrate: null,
    maxHeartrate: null,
    averageWatts: null,
    weightedWatts: 250,
    averageSpeedMps: null,
    perceivedExertion: null,
    ...overrides,
  };
}

function run(
  overrides: Partial<ActivityMetricsInput> = {},
): ActivityMetricsInput {
  return {
    sport: "run",
    startedAt: new Date("2026-03-15T08:00:00Z"),
    durationSec: 20 * 60,
    distanceM: 5000,
    elevationGainM: 0,
    averageHeartrate: 170,
    maxHeartrate: 185,
    averageWatts: null,
    weightedWatts: null,
    averageSpeedMps: 5000 / (20 * 60),
    perceivedExertion: null,
    ...overrides,
  };
}

function swim(
  overrides: Partial<ActivityMetricsInput> = {},
): ActivityMetricsInput {
  return {
    sport: "swim",
    startedAt: new Date("2026-03-15T08:00:00Z"),
    durationSec: 1000,
    distanceM: 1000,
    elevationGainM: null,
    averageHeartrate: null,
    maxHeartrate: null,
    averageWatts: null,
    weightedWatts: null,
    averageSpeedMps: 1,
    perceivedExertion: null,
    ...overrides,
  };
}

describe("threshold estimates", () => {
  it("returns null FTP when there are no powered rides", () => {
    expect(estimateFtpWatts([run()])).toBeNull();
    expect(estimateFtpWatts([])).toBeNull();
    expect(
      estimateFtpWatts([ride({ weightedWatts: null, averageWatts: null })]),
    ).toBeNull();
  });

  it("estimates FTP as 95% of the best 20+ min NP", () => {
    const ftp = estimateFtpWatts(
      [
        ride({ weightedWatts: 200 }),
        ride({
          weightedWatts: 250,
          startedAt: new Date("2026-03-20T08:00:00Z"),
        }),
        ride({ durationSec: 10 * 60, weightedWatts: 400 }),
      ],
      new Date("2026-04-01T00:00:00Z"),
    );
    expect(ftp).toBeCloseTo(250 * 0.95, 6);
  });

  it("estimates VDOT from the best recent run (5K in 20:00 ≈ 49.8)", () => {
    const vdot = vdotFromPerformance(5000, 20 * 60);
    expect(vdot).toBeCloseTo(49.8, 1);
    expect(estimateVdot([run()], new Date("2026-04-01T00:00:00Z"))).toBeCloseTo(
      vdot!,
      6,
    );
    expect(estimateVdot([])).toBeNull();
  });

  it("estimates swim CSS as the fastest sustained pace /100m", () => {
    const css = estimateSwimThresholdPaceSecPer100m(
      [swim(), swim({ durationSec: 1200, distanceM: 1000 })],
      new Date("2026-04-01T00:00:00Z"),
    );
    expect(css).toBeCloseTo(100, 6);
    expect(estimateSwimThresholdPaceSecPer100m([])).toBeNull();
  });

  it("ignores activities outside the 90-day window", () => {
    const old = ride({
      startedAt: new Date("2025-01-01T08:00:00Z"),
      weightedWatts: 300,
    });
    expect(
      estimateFtpWatts([old], new Date("2026-04-01T00:00:00Z")),
    ).toBeNull();
  });
});

describe("computeIntensityZones", () => {
  it("builds 5 zones per sport when anchors exist", () => {
    const zones = computeIntensityZones(
      estimateThresholds(
        [ride(), run(), swim()],
        new Date("2026-04-01T00:00:00Z"),
      ),
    );
    expect(
      zones.some((group) => group.sport === "ride" && group.zones.length === 5),
    ).toBe(true);
    expect(
      zones.some((group) => group.sport === "run" && group.metric === "pace"),
    ).toBe(true);
    expect(zones.some((group) => group.sport === "swim")).toBe(true);
  });

  it("returns no zones when every anchor is missing", () => {
    expect(
      computeIntensityZones({
        ftpWatts: null,
        vdot: null,
        runThresholdMps: null,
        swimThresholdPaceSecPer100m: null,
        lthr: null,
        maxHeartrate: null,
      }),
    ).toEqual([]);
  });
});
