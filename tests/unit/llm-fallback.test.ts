import { describe, expect, it } from "vitest";
import {
  fallbackAnalyzePerformance,
  fallbackGenerateProgram,
} from "@/lib/llm/fallback";
import { programInput } from "./llm-fixtures";

describe("fallbackGenerateProgram", () => {
  it("spreads TSS across sports and keeps a recovery week", () => {
    const program = fallbackGenerateProgram(programInput);

    expect(program.weeks).toHaveLength(4);
    expect(program.weeks[3]?.focus).toBe("recupero");
    expect(program.weeks[3]?.weekLoadTarget).toBeCloseTo(210, 5);

    const week1 = program.weeks[0];
    expect(week1?.weekLoadTarget).toBeCloseTo(300, 5);
    const sports = week1?.workouts.map((workout) => workout.sport) ?? [];
    expect(sports).toContain("run");
    expect(sports).toContain("ride");
    expect(week1?.workouts.every((workout) => workout.blocks.length >= 3)).toBe(
      true,
    );

    const tssSum =
      week1?.workouts.reduce((sum, workout) => sum + workout.tss, 0) ?? 0;
    expect(tssSum).toBeCloseTo(week1?.weekLoadTarget ?? 0, 5);
  });
});

describe("fallbackAnalyzePerformance", () => {
  it("treats a TSB drop as fatigue, not a strength", () => {
    const report = fallbackAnalyzePerformance({
      userId: "user-1",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-14",
      metricTrends: { tsbChange: -6, atlChange: 6, ctlChange: 0 },
      feedbackSummaries: [],
    });

    expect(report.improvements.some((item) => item.includes("TSB"))).toBe(true);
    expect(report.improvements.some((item) => item.includes("ATL"))).toBe(true);
    expect(report.strengths.some((item) => item.includes("migliorata"))).toBe(
      false,
    );
  });
});
