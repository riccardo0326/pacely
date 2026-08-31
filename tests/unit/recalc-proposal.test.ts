import { describe, expect, it } from "vitest";
import { evaluateRecalcFromFeedback } from "@/lib/feedback/evaluate";
import { buildRecalcChanges } from "@/lib/feedback/proposal";
import type { RecalcTargetWorkout } from "@/lib/feedback/proposal";
import type { FeedbackAnalysisOutput } from "@/lib/llm/schemas";
import { WORKOUT_STATUS } from "@/lib/matching/constants";

const BLOCKS = [
  { type: "warm-up" as const, durationMin: 10, description: "Jog" },
  { type: "main-set" as const, durationMin: 30, description: "Z2" },
  { type: "cool-down" as const, durationMin: 10, description: "Walk" },
];

function workout(
  overrides: Partial<RecalcTargetWorkout> & Pick<RecalcTargetWorkout, "id">,
): RecalcTargetWorkout {
  return {
    weekId: "week-1",
    name: "Fondo",
    plannedDate: new Date("2026-04-08T00:00:00.000Z"),
    dayOfWeek: 3,
    durationMin: 50,
    tss: 80,
    status: WORKOUT_STATUS.planned,
    weekLoadTarget: 300,
    blocks: BLOCKS,
    ...overrides,
  };
}

const significant: FeedbackAnalysisOutput = {
  perceivedExertion: 9,
  externalFactors: ["sleep"],
  factorNotes: "3 ore di sonno",
  planDeviation: "significant",
  deviationSummary: "Carico percepito troppo alto rispetto al piano",
  suggestedAction: "reduce_load",
};

describe("buildRecalcChanges", () => {
  it("scales upcoming planned workouts for reduce_load", () => {
    const source = workout({
      id: "w1",
      status: WORKOUT_STATUS.completed,
    });
    const next = workout({
      id: "w2",
      plannedDate: new Date("2026-04-10T00:00:00.000Z"),
      tss: 100,
      durationMin: 50,
    });
    const changes = buildRecalcChanges("reduce_load", source, [source, next]);
    expect(changes).not.toBeNull();
    expect(changes?.workouts).toHaveLength(1);
    expect(changes?.workouts[0]?.tss?.to).toBe(80);
    expect(changes?.workouts[0]?.durationMin?.to).toBe(40);
  });

  it("moves the next workout by one day when the slot is free", () => {
    const source = workout({
      id: "w1",
      status: WORKOUT_STATUS.completed,
    });
    const next = workout({
      id: "w2",
      plannedDate: new Date("2026-04-10T00:00:00.000Z"),
      dayOfWeek: 5,
    });
    const changes = buildRecalcChanges("shift_rest_day", source, [
      source,
      next,
    ]);
    expect(changes?.workouts[0]?.plannedDate).toEqual({
      from: "2026-04-10",
      to: "2026-04-11",
    });
    expect(changes?.workouts[0]?.dayOfWeek?.to).toBe(6);
  });

  it("falls back to load reduction when the next day is occupied", () => {
    const source = workout({
      id: "w1",
      status: WORKOUT_STATUS.completed,
    });
    const next = workout({
      id: "w2",
      plannedDate: new Date("2026-04-10T00:00:00.000Z"),
      dayOfWeek: 5,
    });
    const occupied = workout({
      id: "w3",
      plannedDate: new Date("2026-04-11T00:00:00.000Z"),
      dayOfWeek: 6,
    });
    const changes = buildRecalcChanges("shift_rest_day", source, [
      source,
      next,
      occupied,
    ]);
    expect(changes?.workouts[0]?.tss).toBeDefined();
    expect(changes?.workouts[0]?.plannedDate).toBeUndefined();
  });
});

describe("evaluateRecalcFromFeedback", () => {
  const start = new Date("2026-04-06T00:00:00.000Z");
  const source = workout({
    id: "w1",
    status: WORKOUT_STATUS.completed,
    plannedDate: new Date("2026-04-08T00:00:00.000Z"),
  });
  const future = workout({
    id: "w2",
    plannedDate: new Date("2026-04-10T00:00:00.000Z"),
  });

  it("does not propose for a minor deviation inside the window", () => {
    const result = evaluateRecalcFromFeedback({
      analysis: { ...significant, planDeviation: "minor" },
      programStartDate: start,
      durationWeeks: 8,
      sourceWorkout: source,
      programWorkouts: [source, future],
      hasPendingProposal: false,
    });
    expect(result.proposal).toBeNull();
    expect(result.skipReason).toBe("not_significant");
  });

  it("skips when a pending proposal already exists", () => {
    const result = evaluateRecalcFromFeedback({
      analysis: significant,
      programStartDate: start,
      durationWeeks: 8,
      sourceWorkout: source,
      programWorkouts: [source, future],
      hasPendingProposal: true,
    });
    expect(result.skipReason).toBe("pending_exists");
  });
});
