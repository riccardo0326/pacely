import { describe, expect, it } from "vitest";
import {
  fallbackAdaptWeek,
  pickKeyWorkoutId,
  repairAdaptWeek,
} from "@/lib/feedback/adapt-week";
import type { AdaptWeekInput, AdaptWeekOutput } from "@/lib/llm/schemas";

const BLOCKS = [
  { type: "warm-up" as const, durationMin: 10, description: "Jog" },
  {
    type: "main-set" as const,
    durationMin: 30,
    description: "Tempo",
    target: { zone: 4 as const, metric: "pace" as const },
  },
  { type: "cool-down" as const, durationMin: 10, description: "Walk" },
];

function remaining(
  overrides: Partial<AdaptWeekInput["remainingWorkouts"][number]> & {
    id: string;
  },
): AdaptWeekInput["remainingWorkouts"][number] {
  return {
    weekId: "week-1",
    sport: "run",
    name: "Tempo",
    plannedDate: "2026-09-08",
    dayOfWeek: 2,
    durationMin: 50,
    tss: 90,
    status: "planned",
    isKeySession: false,
    blocks: BLOCKS,
    ...overrides,
  };
}

function baseInput(overrides: Partial<AdaptWeekInput> = {}): AdaptWeekInput {
  const workouts = [
    remaining({
      id: "w-key",
      name: "Tempo run",
      plannedDate: "2026-09-08",
      dayOfWeek: 2,
      tss: 100,
      isKeySession: true,
    }),
    remaining({
      id: "w-easy",
      name: "Fondo",
      plannedDate: "2026-09-10",
      dayOfWeek: 4,
      tss: 60,
      durationMin: 50,
    }),
  ];
  return {
    userId: "user-1",
    situationText: "Ieri trekking esaustivo, domani non posso fare qualità.",
    situationTags: ["extra_load", "tired"],
    remainingWorkouts: workouts,
    completedThisWeek: [],
    extraActivities: [
      {
        name: "Trekking",
        sport: "other",
        startedAt: "2026-09-07T10:00:00.000Z",
        durationMin: 240,
        tssEstimate: 80,
      },
    ],
    currentMetrics: { ctl: 50, atl: 60, tsb: -10 },
    weekLoadTarget: 300,
    remainingTss: 160,
    availableRemainingSlots: [{ weekday: 2 }, { weekday: 4 }, { weekday: 6 }],
    sportsIncluded: ["run"],
    keyWorkoutId: "w-key",
    ...overrides,
  };
}

describe("pickKeyWorkoutId", () => {
  it("prefers a named quality session", () => {
    expect(
      pickKeyWorkoutId([
        { id: "a", name: "Fondo", tss: 80, blocks: [] },
        { id: "b", name: "Tempo", tss: 70, blocks: BLOCKS },
      ]),
    ).toBe("b");
  });
});

describe("repairAdaptWeek", () => {
  it("converts a key-session skip into a retype unless illness/injury", () => {
    const input = baseInput();
    const output: AdaptWeekOutput = {
      rationale: "Salto il tempo",
      strategy: "recover",
      workouts: [{ workoutId: "w-key", op: "skip" }],
    };
    const changes = repairAdaptWeek(input, output);
    expect(changes).not.toBeNull();
    expect(changes?.workouts[0]?.op).toBe("retype");
    expect(changes?.workouts[0]?.status).toBeUndefined();
    expect(changes?.workouts[0]?.name?.to).toContain("Recupero");
  });

  it("allows skipping the key session for illness", () => {
    const input = baseInput({
      situationTags: ["illness"],
      situationText: "Influenza, non posso allenarmi.",
    });
    const output: AdaptWeekOutput = {
      rationale: "Skip qualità",
      strategy: "recover",
      workouts: [{ workoutId: "w-key", op: "skip" }],
    };
    const changes = repairAdaptWeek(input, output);
    expect(changes?.workouts[0]?.op).toBe("skip");
    expect(changes?.workouts[0]?.status?.to).toBe("skipped");
    expect(changes?.workouts[0]?.tss?.to).toBe(0);
  });

  it("drops a move onto a day that is not an available slot", () => {
    const input = baseInput();
    const output: AdaptWeekOutput = {
      rationale: "Sposto a domenica",
      strategy: "postpone_quality",
      workouts: [
        {
          workoutId: "w-key",
          op: "move",
          dayOfWeek: 0,
          plannedDate: "2026-09-06",
        },
      ],
    };
    const changes = repairAdaptWeek(input, output);
    expect(changes?.workouts[0]?.plannedDate).toBeUndefined();
    expect(changes?.workouts[0]?.op).toBe("retype");
  });

  it("ignores patches for workouts that are not remaining", () => {
    const input = baseInput();
    const output: AdaptWeekOutput = {
      rationale: "ok",
      strategy: "reshape",
      workouts: [
        { workoutId: "ghost", op: "skip" },
        {
          workoutId: "w-easy",
          op: "scale",
          durationMin: 40,
          tss: 48,
        },
      ],
    };
    const changes = repairAdaptWeek(input, output);
    expect(changes?.workouts).toHaveLength(1);
    expect(changes?.workouts[0]?.workoutId).toBe("w-easy");
  });

  it("caps remaining TSS so it does not grow more than 10%", () => {
    const input = baseInput();
    const output: AdaptWeekOutput = {
      rationale: "aumento",
      strategy: "reshape",
      workouts: [
        { workoutId: "w-key", op: "scale", tss: 400, durationMin: 120 },
        { workoutId: "w-easy", op: "scale", tss: 400, durationMin: 120 },
      ],
    };
    const changes = repairAdaptWeek(input, output);
    const next = changes?.workouts.reduce(
      (sum, patch) => sum + (patch.tss?.to ?? 0),
      0,
    );
    expect(next).toBeLessThanOrEqual(160 * 1.1 + 0.2);
  });
});

describe("fallbackAdaptWeek", () => {
  it("skips the key session when the tag is illness", () => {
    const output = fallbackAdaptWeek(
      baseInput({
        situationTags: ["illness"],
        situationText: "Febbre.",
      }),
    );
    expect(output.strategy).toBe("recover");
    expect(output.workouts.some((patch) => patch.op === "skip")).toBe(true);
  });

  it("moves or softens quality after extra load", () => {
    const output = fallbackAdaptWeek(baseInput());
    const key = output.workouts.find((patch) => patch.workoutId === "w-key");
    expect(key?.op === "move" || key?.op === "retype").toBe(true);
  });
});
