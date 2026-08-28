import type { LLMInteractionType, LLMProviderName } from "@/lib/llm/constants";
import type {
  FeedbackAnalysisInput,
  FeedbackAnalysisOutput,
  PerformanceAnalysisInput,
  PerformanceReportOutput,
  ProgramGenerationInput,
  ProgramGenerationOutput,
} from "@/lib/llm/schemas";

export type { LLMProviderName };

export type LLMResultSource = "llm" | "fallback";

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type LLMResult<T> = {
  data: T;
  source: LLMResultSource;
  provider: LLMProviderName;
  model: string;
  usedFallback: boolean;
};

export type LLMUsageLog = {
  userId: string;
  interactionType: LLMInteractionType;
  provider: LLMProviderName;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  success: boolean;
  usedFallback: boolean;
  error: string | null;
};

export type ChatCompletionRequest = {
  system: string;
  user: string;
};

export type ChatCompletionResult = {
  content: string;
  model: string;
  usage: TokenUsage;
};

export type ChatClient = {
  name: LLMProviderName;
  model: string;
  completeJson: (
    request: ChatCompletionRequest,
  ) => Promise<ChatCompletionResult>;
};

export type LLMProviderDeps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  logUsage?: (entry: LLMUsageLog) => Promise<void>;
  completeJson?: ChatClient["completeJson"];
};

/**
 * Common provider surface from PROJECT_SPEC.md §8.2.
 * Results include `source` so a fallback is never silent.
 */
export interface LLMProvider {
  readonly name: LLMProviderName;
  readonly model: string;
  generateProgram(
    input: ProgramGenerationInput,
  ): Promise<LLMResult<ProgramGenerationOutput>>;
  analyzeFeedback(
    input: FeedbackAnalysisInput,
  ): Promise<LLMResult<FeedbackAnalysisOutput>>;
  analyzePerformance(
    input: PerformanceAnalysisInput,
  ): Promise<LLMResult<PerformanceReportOutput>>;
}
