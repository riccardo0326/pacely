import { describe, expect, it } from "vitest";
import {
  buildPerformanceUserPrompt,
  performanceSystemPrompt,
} from "@/lib/llm/prompts";
import { generateReportFormSchema } from "@/lib/validation/report";

describe("performance report style", () => {
  it("asks the simple prompt to sound like a coach, not a machine", () => {
    const prompt = performanceSystemPrompt("simple");
    expect(prompt).toMatch(/coach/i);
    expect(prompt).toMatch(/discorsiv/i);
    expect(prompt).toMatch(/niente frasi del tipo/i);
  });

  it("asks the technical prompt to keep numeric deltas", () => {
    const prompt = performanceSystemPrompt("technical");
    expect(prompt).toMatch(/delta numerici/i);
    expect(prompt).toMatch(/CTL/);
  });

  it("puts the chosen style in the user prompt", () => {
    const simple = buildPerformanceUserPrompt({
      userId: "user-1",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-14",
      style: "simple",
      metricTrends: { atlChange: 6, tsbChange: -6 },
      feedbackSummaries: [],
    });
    expect(simple).toMatch(/STILE: semplice/);

    const technical = buildPerformanceUserPrompt({
      userId: "user-1",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-14",
      style: "technical",
      metricTrends: { atlChange: 6, tsbChange: -6 },
      feedbackSummaries: [],
    });
    expect(technical).toMatch(/STILE: tecnico/);
  });

  it("accepts semplice/tecnico on the generate form", () => {
    expect(
      generateReportFormSchema.parse({ periodDays: 14, style: "technical" })
        .style,
    ).toBe("technical");
    expect(generateReportFormSchema.parse({ periodDays: 28 }).style).toBe(
      "simple",
    );
  });
});
