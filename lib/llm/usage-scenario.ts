import {
  LLM_INTERACTION_TYPE,
  type LLMInteractionType,
  type LLMProviderName,
} from "@/lib/llm/constants";
import { estimateCostUsd } from "@/lib/llm/costs";

export type UsageCallEstimate = {
  count: number;
  promptTokens: number;
  completionTokens: number;
};

export type MonthlyUsageScenario = Record<
  LLMInteractionType,
  UsageCallEstimate
>;

/**
 * Conservative amateur-athlete month (DeepSeek default).
 * Token sizes are above typical observed payloads so the estimate is a ceiling,
 * not an invoice.
 */
export const BETA_MONTHLY_USAGE: MonthlyUsageScenario = {
  [LLM_INTERACTION_TYPE.generateProgram]: {
    count: 2,
    promptTokens: 8_000,
    completionTokens: 12_000,
  },
  [LLM_INTERACTION_TYPE.analyzeFeedback]: {
    count: 16,
    promptTokens: 1_200,
    completionTokens: 400,
  },
  [LLM_INTERACTION_TYPE.analyzePerformance]: {
    count: 2,
    promptTokens: 3_000,
    completionTokens: 1_200,
  },
};

export type MonthlyCostBreakdown = {
  interactionType: LLMInteractionType;
  calls: number;
  estimatedCostUsd: number;
};

export type MonthlyCostEstimate = {
  provider: LLMProviderName;
  totalUsd: number;
  calls: number;
  breakdown: MonthlyCostBreakdown[];
};

export function estimateMonthlyLlmCost(
  provider: LLMProviderName,
  scenario: MonthlyUsageScenario = BETA_MONTHLY_USAGE,
): MonthlyCostEstimate {
  const breakdown: MonthlyCostBreakdown[] = [];
  let totalUsd = 0;
  let calls = 0;

  for (const [interactionType, usage] of Object.entries(scenario) as Array<
    [LLMInteractionType, UsageCallEstimate]
  >) {
    const perCall = estimateCostUsd(provider, {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.promptTokens + usage.completionTokens,
    });
    const lineCost = Math.round(perCall * usage.count * 1_000_000) / 1_000_000;
    breakdown.push({
      interactionType,
      calls: usage.count,
      estimatedCostUsd: lineCost,
    });
    totalUsd += lineCost;
    calls += usage.count;
  }

  return {
    provider,
    totalUsd: Math.round(totalUsd * 1_000_000) / 1_000_000,
    calls,
    breakdown,
  };
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(4)}`;
}
