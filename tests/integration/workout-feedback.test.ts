import { describe, expect, it } from "vitest";
import { evaluateRecalcFromFeedback } from "@/lib/feedback/evaluate";
import type { RecalcTargetWorkout } from "@/lib/feedback/proposal";
import type { FeedbackAnalysisOutput } from "@/lib/llm/schemas";
import { WORKOUT_STATUS } from "@/lib/matching/constants";

const BLOCKS = [
  { type: "warm-up" as const, durationMin: 10, description: "Jog" },
  { type: "main-set" as const, durationMin: 30, description: "Z2" },
  { type: "cool-down" as const, durationMin: 10, description: "Walk" },
];

const significantSleep: FeedbackAnalysisOutput = {
  perceivedExertion: 9,
  externalFactors: ["sleep", "stress"],
  factorNotes: "3 ore di sonno, uscito ieri sera, FC più alta del solito",
  planDeviation: "significant",
  deviationSummary: "Sforzo percepito molto sopra il piano",
  suggestedAction: "reduce_load",
};

function target(
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

describe("workout feedback → recalc proposal (mocked LLM analysis)", () => {
  const start = new Date("2026-04-06T00:00:00.000Z");
  const future = target({
    id: "future-1",
    weekId: "week-1",
    plannedDate: new Date("2026-04-10T00:00:00.000Z"),
    tss: 100,
  });

  it("generates a proposal when significant deviation is inside the window", () => {
    const source = target({
      id: "done-1",
      status: WORKOUT_STATUS.completed,
      plannedDate: new Date("2026-04-08T00:00:00.000Z"),
    });

    const result = evaluateRecalcFromFeedback({
      analysis: significantSleep,
      programStartDate: start,
      durationWeeks: 8,
      sourceWorkout: source,
      programWorkouts: [source, future],
      hasPendingProposal: false,
    });

    expect(result.skipReason).toBeNull();
    expect(result.proposal).not.toBeNull();
    expect(result.proposal?.changes.action).toBe("reduce_load");
    expect(result.proposal?.changes.workouts.length).toBeGreaterThan(0);
    expect(result.proposal?.rationale).toBe(significantSleep.deviationSummary);
  });

  it("saves feedback without a proposal when the same deviation is outside the window", () => {
    const source = target({
      id: "done-late",
      status: WORKOUT_STATUS.completed,
      plannedDate: new Date("2026-04-27T00:00:00.000Z"),
    });
    const later = target({
      id: "future-late",
      plannedDate: new Date("2026-04-29T00:00:00.000Z"),
    });

    const result = evaluateRecalcFromFeedback({
      analysis: significantSleep,
      programStartDate: start,
      durationWeeks: 8,
      sourceWorkout: source,
      programWorkouts: [source, later],
      hasPendingProposal: false,
    });

    expect(result.proposal).toBeNull();
    expect(result.skipReason).toBe("outside_window");
  });

  it("uses a 3-week window for a 12-week program", () => {
    const source = target({
      id: "done-w3",
      status: WORKOUT_STATUS.completed,
      plannedDate: new Date("2026-04-24T00:00:00.000Z"),
    });
    const later = target({
      id: "future-w3",
      plannedDate: new Date("2026-04-26T00:00:00.000Z"),
    });

    const inside = evaluateRecalcFromFeedback({
      analysis: significantSleep,
      programStartDate: start,
      durationWeeks: 12,
      sourceWorkout: source,
      programWorkouts: [source, later],
      hasPendingProposal: false,
    });
    expect(inside.proposal).not.toBeNull();

    const outsideSource = target({
      id: "done-w4",
      status: WORKOUT_STATUS.completed,
      plannedDate: new Date("2026-04-27T00:00:00.000Z"),
    });
    const outside = evaluateRecalcFromFeedback({
      analysis: significantSleep,
      programStartDate: start,
      durationWeeks: 12,
      sourceWorkout: outsideSource,
      programWorkouts: [
        outsideSource,
        target({
          id: "future-w4",
          plannedDate: new Date("2026-04-29T00:00:00.000Z"),
        }),
      ],
      hasPendingProposal: false,
    });
    expect(outside.proposal).toBeNull();
    expect(outside.skipReason).toBe("outside_window");
  });
});
