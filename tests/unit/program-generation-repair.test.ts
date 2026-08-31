import { describe, expect, it } from "vitest";
import type {
  ProgramGenerationInput,
  ProgramGenerationOutput,
} from "@/lib/llm/schemas";
import { buildProgramUserPrompt } from "@/lib/llm/prompts";
import {
  forbiddenTermsFromConstraints,
  looksLikeTriathlonGoal,
  missingTriathlonSports,
} from "@/lib/programs/constraints";
import { repairGeneratedProgram } from "@/lib/programs/repair-generated";
import {
  isGeneratedProgramValid,
  validateGeneratedProgram,
} from "@/lib/programs/validate-generated";

const ironmanInput: ProgramGenerationInput = {
  userId: "user-1",
  sports: ["run"],
  durationWeeks: 8,
  availableSlots: [
    { weekday: 1, timeOfDay: "07:00" },
    { weekday: 3, timeOfDay: "07:00" },
    { weekday: 5, timeOfDay: "07:00" },
  ],
  goal: {
    type: "generic",
    description: "Preparazione Mezzo Ironman",
  },
  constraints:
    "Infortunio al ginocchio destro, evitare corsa su asfalto e ripetute in salita",
  weeklyTssBudget: 210,
  currentMetrics: {},
  aggregatedHistory: { weeklySummaries: [] },
};

function hillWorkout(dayOfWeek: number, timeOfDay: string) {
  return {
    dayOfWeek,
    sport: "run" as const,
    name: "Corsa in salita",
    durationMin: 60,
    tss: 40,
    timeOfDay,
    blocks: [
      {
        type: "warm-up" as const,
        durationMin: 10,
        description: "Riscaldamento leggero in piano",
      },
      {
        type: "main-set" as const,
        durationMin: 40,
        description: "Corsa in salita a ritmo moderato",
      },
      {
        type: "cool-down" as const,
        durationMin: 10,
        description: "Defaticamento in piano",
      },
    ],
  };
}

/** Shape of the first live OpenAI plan (1 session/week, Sunday, hill theme). */
const ironmanHallucinated: ProgramGenerationOutput = {
  name: "Piano di Allenamento Mezzo Ironman",
  summary:
    "Piano di allenamento di 8 settimane per prepararsi a un mezzo Ironman, con focus sulla corsa in salita evitando l'asfalto",
  weeks: [1, 2, 3, 4, 5, 6, 7, 8].map((weekNumber) => ({
    weekNumber,
    weekLoadTarget: 100,
    focus: "Corsa in salita",
    workouts: [
      hillWorkout(
        weekNumber % 2 === 1 ? 0 : 1,
        weekNumber % 2 === 1 ? "02:33" : "16:00",
      ),
    ],
  })),
};

describe("validateGeneratedProgram", () => {
  it("rejects the first live Ironman hallucination", () => {
    const issues = validateGeneratedProgram(ironmanInput, ironmanHallucinated);
    const codes = new Set(issues.map((issue) => issue.code));
    expect(codes.has("missing_slot")).toBe(true);
    expect(codes.has("extra_day")).toBe(true);
    expect(codes.has("time_mismatch")).toBe(true);
    expect(codes.has("forbidden_term")).toBe(true);
    expect(isGeneratedProgramValid(ironmanInput, ironmanHallucinated)).toBe(
      false,
    );
  });
});

describe("repairGeneratedProgram", () => {
  it("forces Mon/Wed/Fri at 07:00 and strips hill-running language", () => {
    const repaired = repairGeneratedProgram(ironmanInput, ironmanHallucinated);
    expect(isGeneratedProgramValid(ironmanInput, repaired)).toBe(true);
    expect(repaired.weeks).toHaveLength(8);
    for (const week of repaired.weeks) {
      expect(week.workouts.map((workout) => workout.dayOfWeek).sort()).toEqual([
        1, 3, 5,
      ]);
      expect(
        week.workouts.every((workout) => workout.timeOfDay === "07:00"),
      ).toBe(true);
      expect(week.workouts).toHaveLength(3);
    }
    const blob = JSON.stringify(repaired).toLowerCase();
    expect(blob).not.toContain("salita");
    expect(blob).not.toContain("02:33");
  });
});

describe("constraint helpers", () => {
  it("extracts salita/asfalto from avoidance phrasing", () => {
    const terms = forbiddenTermsFromConstraints(ironmanInput.constraints);
    expect(terms.some((term) => term.includes("salita"))).toBe(true);
    expect(terms.some((term) => term.includes("asfalto"))).toBe(true);
  });

  it("detects triathlon goals that are missing sports", () => {
    expect(looksLikeTriathlonGoal("Preparazione Mezzo Ironman")).toBe(true);
    expect(missingTriathlonSports(["run"])).toEqual(["swim", "ride"]);
    expect(missingTriathlonSports(["run", "swim", "ride"])).toEqual([]);
  });
});

describe("buildProgramUserPrompt", () => {
  it("lists named slots and a VIETATO section", () => {
    const prompt = buildProgramUserPrompt({
      ...ironmanInput,
      forbiddenTerms: forbiddenTermsFromConstraints(ironmanInput.constraints),
    });
    expect(prompt).toContain("Lunedì");
    expect(prompt).toContain("Mercoledì");
    expect(prompt).toContain("Venerdì");
    expect(prompt).toContain("07:00");
    expect(prompt).toContain("VIETATO");
    expect(prompt).toContain("salita");
    expect(prompt).not.toContain(ironmanInput.userId);
  });
});
