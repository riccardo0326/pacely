import { describe, expect, it } from "vitest";
import { workoutBlockSchema } from "@/lib/llm/schemas";
import {
  parseEditableBlocks,
  toStoredWorkoutBlocks,
} from "@/lib/programs/blocks";
import { updateWorkoutFormSchema } from "@/lib/validation/program";

describe("workout block editor", () => {
  it("round-trips warm-up/main/cool-down with zone and metric", () => {
    const stored = toStoredWorkoutBlocks([
      {
        type: "warm-up",
        durationMin: 10,
        description: "Jog",
        zone: "1",
        metric: "hr",
      },
      {
        type: "main-set",
        durationMin: 30,
        description: "Intervalli",
        zone: "4",
        metric: "pace",
      },
      {
        type: "cool-down",
        durationMin: 8,
        description: "Camminata",
        zone: "",
        metric: "",
      },
    ]);

    expect(workoutBlockSchema.array().parse(stored)).toHaveLength(3);
    expect(stored[1]?.target).toEqual({ zone: 4, metric: "pace" });
    expect(stored[2]?.target).toBeUndefined();

    const parsed = parseEditableBlocks(stored);
    expect(parsed[1]).toMatchObject({
      type: "main-set",
      zone: "4",
      metric: "pace",
    });
  });

  it("accepts edited blocks through the update workout schema", () => {
    const parsed = updateWorkoutFormSchema.safeParse({
      workoutId: "wk-1",
      name: "Fondo",
      durationMin: 45,
      tss: 80,
      timeOfDay: "07:00",
      blocks: toStoredWorkoutBlocks([
        {
          type: "main-set",
          durationMin: 45,
          description: "Zona 2",
          zone: "2",
          metric: "hr",
        },
      ]),
    });
    expect(parsed.success).toBe(true);
  });

  it("falls back to a single main-set when stored JSON is invalid", () => {
    const parsed = parseEditableBlocks({ not: "blocks" });
    expect(parsed).toEqual([
      {
        type: "main-set",
        durationMin: 20,
        description: "",
        zone: "",
        metric: "",
      },
    ]);
  });
});
