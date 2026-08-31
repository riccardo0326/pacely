import { describe, expect, it } from "vitest";
import { buildProgramXlsx, excelFilename } from "@/lib/programs/excel";
import type { ProgramDetail } from "@/server/actions/programs";

const program: ProgramDetail = {
  id: "prog-1",
  name: "Base aerobica",
  status: "active",
  sportsIncluded: ["run", "ride"],
  durationWeeks: 8,
  startDate: "2026-04-06T00:00:00.000Z",
  constraints: "Ginocchio sensibile",
  summary: "Piano bilanciato corsa e bici",
  goal: {
    type: "generic",
    description: "Migliorare la base aerobica",
    raceType: null,
    distance: null,
    targetDate: null,
  },
  weeks: [
    {
      id: "w-1",
      number: 1,
      weekLoadTarget: 300,
      focus: "base",
      workouts: [
        {
          id: "wk-1",
          sport: "run",
          plannedDate: "2026-04-06T00:00:00.000Z",
          dayOfWeek: 1,
          name: "Fondo",
          durationMin: 45,
          tss: 100,
          timeOfDay: "07:00",
          status: "planned",
          feedback: null,
          blocks: [
            {
              type: "warm-up",
              durationMin: 10,
              description: "Jog",
              target: { zone: 1, metric: "hr" },
            },
            {
              type: "main-set",
              durationMin: 25,
              description: "Zona 2",
              target: { zone: 2, metric: "pace" },
            },
          ],
        },
      ],
    },
  ],
};

describe("buildProgramXlsx", () => {
  it("builds a zip xlsx with summary and workout rows", () => {
    const { filename, bytes } = buildProgramXlsx(program);
    expect(filename).toBe("base-aerobica.xlsx");
    expect(
      String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!),
    ).toBe("PK\u0003\u0004");

    const asText = new TextDecoder().decode(bytes);
    expect(asText).toContain("Riepilogo");
    expect(asText).toContain("Allenamenti");
    expect(asText).toContain("Base aerobica");
    expect(asText).toContain("Fondo");
    expect(asText).toContain("Riscaldamento");
    expect(asText).toContain("Ginocchio sensibile");
    expect(asText).toContain("Attivo");
    expect(asText).toContain("6 apr 2026");
  });

  it("escapes xml in cell values", () => {
    const { bytes } = buildProgramXlsx({
      ...program,
      name: 'A <B> & "C"',
    });
    const asText = new TextDecoder().decode(bytes);
    expect(asText).toContain("A &lt;B&gt; &amp; &quot;C&quot;");
    expect(asText).not.toContain("A <B>");
  });
});

describe("excelFilename", () => {
  it("slugifies the program name", () => {
    expect(excelFilename("Mezzo Ironman 70.3")).toBe("mezzo-ironman-70-3.xlsx");
  });
});
