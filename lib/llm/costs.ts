import {
  LLM_PRICE_PER_MILLION_TOKENS,
  type LLMProviderName,
} from "@/lib/llm/constants";
import type { TokenUsage } from "@/lib/llm/types";

export function estimateCostUsd(
  provider: LLMProviderName,
  usage: TokenUsage,
): number {
  const rates = LLM_PRICE_PER_MILLION_TOKENS[provider];
  const cost =
    (usage.promptTokens / 1_000_000) * rates.input +
    (usage.completionTokens / 1_000_000) * rates.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function emptyUsage(): TokenUsage {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

export function addUsage(left: TokenUsage, right: TokenUsage): TokenUsage {
  return {
    promptTokens: left.promptTokens + right.promptTokens,
    completionTokens: left.completionTokens + right.completionTokens,
    totalTokens: left.totalTokens + right.totalTokens,
  };
}
