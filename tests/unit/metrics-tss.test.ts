import { describe, expect, it } from "vitest";
import { computeActivityTss } from "@/lib/metrics/tss";
import type {
  ActivityMetricsInput,
  AthleteThresholds,
} from "@/lib/metrics/types";

const emptyThresholds: AthleteThresholds = {
  ftpWatts: null,
  vdot: null,
  runThresholdMps: null,
  swimThresholdPaceSecPer100m: null,
  lthr: null,
  maxHeartrate: null,
};

function activity(
  overrides: Partial<ActivityMetricsInput> &
    Pick<ActivityMetricsInput, "sport">,
): ActivityMetricsInput {
  return {
    startedAt: new Date("2026-04-01T08:00:00Z"),
    durationSec: 3600,
    distanceM: null,
    elevationGainM: null,
    averageHeartrate: null,
    maxHeartrate: null,
    averageWatts: null,
    weightedWatts: null,
    averageSpeedMps: null,
    perceivedExertion: null,
    ...overrides,
  };
}

describe("computeActivityTss", () => {
  it("gives 100 bikeTSS for one hour at FTP", () => {
    const tss = computeActivityTss(
      activity({ sport: "ride", weightedWatts: 250 }),
      { ...emptyThresholds, ftpWatts: 250 },
    );
    expect(tss).toBeCloseTo(100, 5);
  });

  it("uses average watts when weighted watts are missing", () => {
    const tss = computeActivityTss(
      activity({ sport: "ride", averageWatts: 200, durationSec: 3600 }),
      { ...emptyThresholds, ftpWatts: 250 },
    );
    expect(tss).toBeCloseTo(64, 5);
  });

  it("falls back to heart rate when power is absent", () => {
    const tss = computeActivityTss(
      activity({ sport: "ride", averageHeartrate: 150 }),
      { ...emptyThresholds, lthr: 150 },
    );
    expect(tss).toBeCloseTo(100, 5);
  });

  it("falls back to duration IF when ride data is missing", () => {
    const tss = computeActivityTss(
      activity({ sport: "ride" }),
      emptyThresholds,
    );
    expect(tss).toBeCloseTo((3600 / 3600) * 0.75 * 0.75 * 100, 5);
  });

  it("computes rTSS from grade-adjusted speed vs threshold", () => {
    const tss = computeActivityTss(
      activity({
        sport: "run",
        durationSec: 3600,
        distanceM: 12_000,
        elevationGainM: 0,
      }),
      { ...emptyThresholds, runThresholdMps: 12_000 / 3600 },
    );
    expect(tss).toBeCloseTo(100, 5);
  });

  it("computes sTSS from pace vs CSS", () => {
    const tss = computeActivityTss(
      activity({
        sport: "swim",
        durationSec: 3600,
        distanceM: 3600,
      }),
      { ...emptyThresholds, swimThresholdPaceSecPer100m: 100 },
    );
    expect(tss).toBeCloseTo(100, 5);
  });

  it("returns 0 for zero duration", () => {
    expect(
      computeActivityTss(
        activity({ sport: "run", durationSec: 0 }),
        emptyThresholds,
      ),
    ).toBe(0);
  });
});
