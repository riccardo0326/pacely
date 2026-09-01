import { describe, expect, it } from "vitest";
import { buildAthleteContext } from "@/lib/profile/athlete-context";
import { buildProgramUserPrompt } from "@/lib/llm/prompts";
import { programInput } from "@/tests/unit/llm-fixtures";

describe("buildAthleteContext", () => {
  it("returns undefined when nothing is set", () => {
    expect(buildAthleteContext({ gear: [] })).toBeUndefined();
  });

  it("derives age and keeps gear", () => {
    const context = buildAthleteContext({
      weightKg: 72,
      heightCm: 178,
      birthDate: new Date("1992-03-01T00:00:00.000Z"),
      now: new Date("2026-09-01T00:00:00.000Z"),
      gear: [
        {
          sport: "run",
          kind: "shoes",
          name: "Pegasus",
          isPrimary: true,
        },
      ],
    });
    expect(context).toEqual({
      weightKg: 72,
      heightCm: 178,
      ageYears: 34,
      gear: [
        {
          sport: "run",
          kind: "shoes",
          name: "Pegasus",
          isPrimary: true,
        },
      ],
    });
  });
});

describe("buildProgramUserPrompt athlete context", () => {
  it("omits the profile section when context is empty", () => {
    const prompt = buildProgramUserPrompt(programInput);
    expect(prompt).not.toContain("PROFILO ATLETA");
    expect(prompt).not.toContain(programInput.userId);
  });

  it("includes physiological data and gear without the user id", () => {
    const prompt = buildProgramUserPrompt({
      ...programInput,
      athleteContext: {
        weightKg: 72,
        heightCm: 178,
        ageYears: 34,
        gear: [
          {
            sport: "ride",
            kind: "bike",
            name: "Canyon Endurace",
            isPrimary: true,
          },
        ],
      },
    });
    expect(prompt).toContain("PROFILO ATLETA");
    expect(prompt).toContain("peso: 72 kg");
    expect(prompt).toContain("altezza: 178 cm");
    expect(prompt).toContain("età: 34 anni");
    expect(prompt).toContain("Canyon Endurace");
    expect(prompt).toContain("(primaria)");
    expect(prompt).not.toContain(programInput.userId);
  });
});
