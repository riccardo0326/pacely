import { resolveLLMProviderName } from "@/lib/llm/config";
import { createDeepSeekProvider } from "@/lib/llm/deepseek-provider";
import { createOpenAIProvider } from "@/lib/llm/openai-provider";
import type {
  LLMProvider,
  LLMProviderDeps,
  LLMProviderName,
} from "@/lib/llm/types";

export function getLLMProvider(
  options: LLMProviderDeps & { provider?: LLMProviderName } = {},
): LLMProvider {
  const name = resolveLLMProviderName(options.provider);
  if (name === "openai") {
    return createOpenAIProvider(options);
  }
  return createDeepSeekProvider(options);
}

export { resolveLLMProviderName } from "@/lib/llm/config";
export { createDeepSeekProvider } from "@/lib/llm/deepseek-provider";
export { createOpenAIProvider } from "@/lib/llm/openai-provider";
export { createStructuredLLMProvider } from "@/lib/llm/structured";
export { parseJsonContent } from "@/lib/llm/chat";
export { estimateCostUsd } from "@/lib/llm/costs";
export {
  fallbackAnalyzeFeedback,
  fallbackAnalyzePerformance,
  fallbackGenerateProgram,
} from "@/lib/llm/fallback";
export {
  DEFAULT_LLM_PROVIDER,
  LLM_INTERACTION_TYPE,
  LLM_MAX_PARSE_ATTEMPTS,
} from "@/lib/llm/constants";
export type { LLMInteractionType, LLMProviderName } from "@/lib/llm/constants";
export type {
  ChatClient,
  LLMProvider,
  LLMProviderDeps,
  LLMResult,
  LLMUsageLog,
  TokenUsage,
} from "@/lib/llm/types";
export type {
  FeedbackAnalysisInput,
  FeedbackAnalysisOutput,
  PerformanceAnalysisInput,
  PerformanceReportOutput,
  ProgramGenerationInput,
  ProgramGenerationOutput,
} from "@/lib/llm/schemas";
export {
  feedbackAnalysisInputSchema,
  feedbackAnalysisOutputSchema,
  performanceAnalysisInputSchema,
  performanceReportOutputSchema,
  programGenerationInputSchema,
  programGenerationOutputSchema,
} from "@/lib/llm/schemas";
export {
  LLMApiError,
  LLMConfigError,
  LLMParseError,
  LLMRateLimitError,
  LLMTimeoutError,
} from "@/lib/llm/errors";
export {
  assertAnalyzeFeedbackQuota,
  assertGenerateProgramQuota,
  isLlmQuotaExceeded,
  LlmQuotaExceededError,
  LLM_ANALYZE_FEEDBACK_MAX_PER_HOUR,
  LLM_GENERATE_PROGRAM_MAX_PER_HOUR,
} from "@/lib/llm/quota";
