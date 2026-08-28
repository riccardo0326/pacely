import { describe, expect, it } from "vitest";
import {
  applyBackfillPage,
  normalizeStravaActivity,
} from "@/lib/strava/normalize";

function activity(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    name: "Morning Run",
    distance: 5000,
    moving_time: 1500,
    elapsed_time: 1600,
    total_elevation_gain: 40,
    sport_type: "Run",
    type: "Run",
    start_date: "2026-03-01T07:00:00Z",
    average_speed: 3.33,
    average_heartrate: 150,
    max_heartrate: 172,
    average_cadence: 84,
    perceived_exertion: 6,
    extra_field: "kept-in-raw",
    ...overrides,
  };
}

describe("normalizeStravaActivity", () => {
  it("maps a run summary onto the Activity fields", () => {
    const raw = activity();
    const normalized = normalizeStravaActivity(raw);
    expect(normalized).toMatchObject({
      stravaActivityId: "101",
      sport: "run",
      name: "Morning Run",
      durationSec: 1500,
      elapsedSec: 1600,
      distanceM: 5000,
      elevationGainM: 40,
      averageHeartrate: 150,
      maxHeartrate: 172,
      averageCadence: 84,
      averageSpeedMps: 3.33,
      perceivedExertion: 6,
    });
    expect(normalized?.startedAt.toISOString()).toBe(
      "2026-03-01T07:00:00.000Z",
    );
    expect(normalized?.sourceRaw).toEqual(raw);
  });

  it("maps ride and swim variants, and skips unsupported sports", () => {
    expect(
      normalizeStravaActivity(activity({ sport_type: "GravelRide" }))?.sport,
    ).toBe("ride");
    expect(
      normalizeStravaActivity(
        activity({ sport_type: "OpenWaterSwim", type: "Swim" }),
      )?.sport,
    ).toBe("swim");
    expect(
      normalizeStravaActivity(
        activity({ sport_type: "EBikeRide", type: "EBikeRide" }),
      ),
    ).toBeNull();
    expect(
      normalizeStravaActivity(
        activity({ sport_type: "Workout", type: "Workout" }),
      ),
    ).toBeNull();
  });

  it("falls back to elapsed_time and type when moving_time/sport_type are missing", () => {
    const normalized = normalizeStravaActivity(
      activity({
        sport_type: null,
        type: "VirtualRun",
        moving_time: 0,
        elapsed_time: 900,
      }),
    );
    expect(normalized?.sport).toBe("run");
    expect(normalized?.durationSec).toBe(900);
  });

  it("returns null for an invalid payload", () => {
    expect(normalizeStravaActivity({ name: "no-id" })).toBeNull();
    expect(
      normalizeStravaActivity(activity({ start_date: "not-a-date" })),
    ).toBeNull();
  });
});

describe("applyBackfillPage", () => {
  it("counts imported vs skipped sports and advances the page", () => {
    const result = applyBackfillPage({ page: 2, imported: 10, skipped: 1 }, [
      activity({ id: 1, sport_type: "Run" }),
      activity({ id: 2, sport_type: "Yoga" }),
      activity({ id: 3, sport_type: "Swim" }),
    ]);
    expect(result.activities.map((item) => item.sport)).toEqual([
      "run",
      "swim",
    ]);
    expect(result.progress).toEqual({ page: 3, imported: 12, skipped: 2 });
  });
});
