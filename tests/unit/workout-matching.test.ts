import { describe, expect, it } from "vitest";
import {
  isDurationCompatible,
  pairWorkoutsToActivities,
  scoreWorkoutActivityPair,
} from "@/lib/matching/heuristic";
import type { MatchableActivity, MatchableWorkout } from "@/lib/matching/types";

function workout(
  overrides: Partial<MatchableWorkout> & Pick<MatchableWorkout, "id">,
): MatchableWorkout {
  return {
    sport: "run",
    plannedDate: new Date("2026-08-31T00:00:00.000Z"),
    durationMin: 60,
    ...overrides,
  };
}

function activity(
  overrides: Partial<MatchableActivity> & Pick<MatchableActivity, "id">,
): MatchableActivity {
  return {
    sport: "run",
    startedAt: new Date("2026-08-31T07:00:00.000Z"),
    durationSec: 60 * 60,
    ...overrides,
  };
}

describe("duration compatibility", () => {
  it("accepts a gap within 40% or 15 minutes", () => {
    expect(isDurationCompatible(60 * 60, 50 * 60)).toBe(true);
    expect(isDurationCompatible(20 * 60, 32 * 60)).toBe(true);
  });

  it("rejects a large duration mismatch", () => {
    expect(isDurationCompatible(40 * 60, 180 * 60)).toBe(false);
    expect(isDurationCompatible(180 * 60, 40 * 60)).toBe(false);
  });
});

describe("pair scoring", () => {
  it("returns null when sport or calendar day differs", () => {
    expect(
      scoreWorkoutActivityPair(
        workout({ id: "w1", sport: "run" }),
        activity({ id: "a1", sport: "ride" }),
      ),
    ).toBeNull();
    expect(
      scoreWorkoutActivityPair(
        workout({ id: "w1" }),
        activity({ id: "a1", startedAt: new Date("2026-09-01T07:00:00.000Z") }),
      ),
    ).toBeNull();
  });

  it("scores closer durations higher", () => {
    const planned = workout({ id: "w1", durationMin: 90 });
    const close = scoreWorkoutActivityPair(
      planned,
      activity({ id: "a1", durationSec: 88 * 60 }),
    );
    const farther = scoreWorkoutActivityPair(
      planned,
      activity({ id: "a2", durationSec: 70 * 60 }),
    );
    expect(close).not.toBeNull();
    expect(farther).not.toBeNull();
    expect(close!).toBeGreaterThan(farther!);
  });
});

describe("ambiguous matching", () => {
  it("pairs two same-day runs by closest duration", () => {
    const matches = pairWorkoutsToActivities(
      [
        workout({ id: "easy", durationMin: 40 }),
        workout({ id: "long", durationMin: 90 }),
      ],
      [
        activity({ id: "short-run", durationSec: 42 * 60 }),
        activity({ id: "long-run", durationSec: 88 * 60 }),
      ],
    );
    expect(matches).toHaveLength(2);
    expect(matches.find((row) => row.workoutId === "easy")?.activityId).toBe(
      "short-run",
    );
    expect(matches.find((row) => row.workoutId === "long")?.activityId).toBe(
      "long-run",
    );
  });

  it("matches by sport when run and ride happen the same day", () => {
    const matches = pairWorkoutsToActivities(
      [
        workout({ id: "run-w", sport: "run", durationMin: 60 }),
        workout({ id: "ride-w", sport: "ride", durationMin: 60 }),
      ],
      [
        activity({ id: "run-a", sport: "run", durationSec: 58 * 60 }),
        activity({ id: "ride-a", sport: "ride", durationSec: 62 * 60 }),
      ],
    );
    expect(matches).toHaveLength(2);
    expect(matches.find((row) => row.workoutId === "run-w")?.activityId).toBe(
      "run-a",
    );
    expect(matches.find((row) => row.workoutId === "ride-w")?.activityId).toBe(
      "ride-a",
    );
  });

  it("binds one activity to a single workout when two plans collide", () => {
    const matches = pairWorkoutsToActivities(
      [
        workout({ id: "w-a", durationMin: 60 }),
        workout({ id: "w-b", durationMin: 62 }),
      ],
      [activity({ id: "only", durationSec: 60 * 60 })],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.workoutId).toBe("w-a");
    expect(matches[0]?.activityId).toBe("only");
  });

  it("does not match a duration that is too far off", () => {
    const matches = pairWorkoutsToActivities(
      [workout({ id: "w1", durationMin: 40 })],
      [activity({ id: "a1", durationSec: 3 * 60 * 60 })],
    );
    expect(matches).toEqual([]);
  });

  it("does not cross calendar days", () => {
    const matches = pairWorkoutsToActivities(
      [workout({ id: "w1", durationMin: 60 })],
      [
        activity({
          id: "a1",
          startedAt: new Date("2026-09-01T07:00:00.000Z"),
          durationSec: 60 * 60,
        }),
      ],
    );
    expect(matches).toEqual([]);
  });
});
