import { describe, expect, it } from "vitest";
import { LLM_INTERACTION_TYPE } from "@/lib/llm/constants";
import {
  BETA_MONTHLY_USAGE,
  estimateMonthlyLlmCost,
} from "@/lib/llm/usage-scenario";

describe("estimateMonthlyLlmCost", () => {
  it("prices a realistic amateur month on DeepSeek under one dollar", () => {
    const estimate = estimateMonthlyLlmCost("deepseek");
    expect(estimate.calls).toBe(20);
    expect(estimate.totalUsd).toBeGreaterThan(0);
    expect(estimate.totalUsd).toBeLessThan(0.05);
    const types = estimate.breakdown.map((row) => row.interactionType);
    expect(types).toEqual([
      LLM_INTERACTION_TYPE.generateProgram,
      LLM_INTERACTION_TYPE.analyzeFeedback,
      LLM_INTERACTION_TYPE.analyzePerformance,
    ]);
  });

  it("OpenAI gpt-4o-mini list prices stay in the same order of magnitude", () => {
    const estimate = estimateMonthlyLlmCost("openai");
    expect(estimate.totalUsd).toBeLessThan(0.05);
  });

  it("uses the documented beta scenario token sizes", () => {
    expect(BETA_MONTHLY_USAGE.generate_program.count).toBe(2);
    expect(BETA_MONTHLY_USAGE.analyze_feedback.count).toBe(16);
    expect(BETA_MONTHLY_USAGE.analyze_performance.count).toBe(2);
  });
});
