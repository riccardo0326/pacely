import { describe, expect, it } from "vitest";
import { estimateCostUsd } from "@/lib/llm/costs";

describe("estimateCostUsd", () => {
  it("uses provider list prices per million tokens", () => {
    const usage = {
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      totalTokens: 2_000_000,
    };
    expect(estimateCostUsd("deepseek", usage)).toBeCloseTo(0.7, 6);
    expect(estimateCostUsd("openai", usage)).toBeCloseTo(0.75, 6);
  });

  it("rounds small requests to 6 decimal places", () => {
    const cost = estimateCostUsd("deepseek", {
      promptTokens: 80,
      completionTokens: 40,
      totalTokens: 120,
    });
    expect(cost).toBe(0.000039);
  });
});
