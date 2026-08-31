import { describe, expect, it, vi } from "vitest";
import { validProgram, programInput } from "@/tests/unit/llm-fixtures";
import {
  buildProgramCreateData,
  sportBalanceRatio,
  summarizeSportBalance,
} from "@/lib/programs/persist";
import { buildAggregatedHistory } from "@/lib/programs/history";
import { getLLMProvider } from "@/lib/llm";
import { createProgramFormSchema } from "@/lib/validation/program";

vi.mock("@/lib/llm", () => ({
  getLLMProvider: vi.fn(),
}));

describe("program generation integration (mocked LLM)", () => {
  it("validates create form input", () => {
    const parsed = createProgramFormSchema.safeParse({
      sports: ["run", "ride"],
      durationWeeks: 8,
      startDate: "2026-04-06",
      goalType: "generic",
      goalDescription: "Migliorare la base aerobica",
      slots: [{ weekday: 1, timeOfDay: "07:00" }, { weekday: 3 }],
    });
    expect(parsed.success).toBe(true);
  });

  it("requires race date for race goals", () => {
    const parsed = createProgramFormSchema.safeParse({
      sports: ["run"],
      durationWeeks: 8,
      startDate: "2026-04-06",
      goalType: "race",
      goalDescription: "Ironman",
      raceDistance: "Full",
      slots: [{ weekday: 1 }],
    });
    expect(parsed.success).toBe(false);
  });

  it("balances load across sports in generated JSON", async () => {
    const mockGenerate = vi.fn().mockResolvedValue({
      data: validProgram,
      source: "llm",
      provider: "deepseek",
      model: "deepseek-chat",
      usedFallback: false,
    });

    vi.mocked(getLLMProvider).mockReturnValue({
      name: "deepseek",
      model: "deepseek-chat",
      generateProgram: mockGenerate,
      analyzeFeedback: vi.fn(),
      analyzePerformance: vi.fn(),
    });

    const provider = getLLMProvider();
    const result = await provider.generateProgram(programInput);

    expect(result.data.weeks.length).toBeGreaterThan(0);
    const totals = summarizeSportBalance(result.data);
    expect(totals.run).toBeGreaterThan(0);
    expect(totals.ride).toBeGreaterThan(0);

    const ratio = sportBalanceRatio(totals, ["run", "ride"]);
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeLessThan(3);

    const persisted = buildProgramCreateData(
      "user-1",
      {
        sports: ["run", "ride"],
        durationWeeks: 8,
        startDate: "2026-04-06",
        goalType: "generic",
        goalDescription: "Migliorare la base aerobica",
        slots: [{ weekday: 1, timeOfDay: "07:00" }, { weekday: 3 }],
      },
      result.data,
    );
    expect(persisted.weeks).toHaveLength(result.data.weeks.length);
    expect(persisted.weeks[0]?.workouts[0]?.blocks).toEqual(
      result.data.weeks[0]?.workouts[0]?.blocks,
    );
    expect(persisted.weeks[0]?.workouts[0]?.status).toBe("planned");
  });

  it("aggregates weekly history from activities", () => {
    const history = buildAggregatedHistory([
      {
        sport: "run",
        durationSec: 3600,
        startedAt: new Date("2026-03-03T06:00:00Z"),
      },
      {
        sport: "ride",
        durationSec: 7200,
        startedAt: new Date("2026-03-04T06:00:00Z"),
      },
    ]);

    expect(history.weeklySummaries.length).toBeGreaterThan(0);
    expect(history.weeklySummaries[0]?.activityCount).toBe(2);
  });
});
