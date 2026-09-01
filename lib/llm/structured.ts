import { ZodError, type ZodType } from "zod";
import { parseJsonContent } from "@/lib/llm/chat";
import {
  LLM_MAX_PARSE_ATTEMPTS,
  type LLMInteractionType,
} from "@/lib/llm/constants";
import { addUsage, emptyUsage, estimateCostUsd } from "@/lib/llm/costs";
import { LLMParseError } from "@/lib/llm/errors";
import {
  fallbackAnalyzeFeedback,
  fallbackAnalyzePerformance,
  fallbackGenerateProgram,
} from "@/lib/llm/fallback";
import { safePersistLLMUsage } from "@/lib/llm/log";
import {
  FEEDBACK_SYSTEM_PROMPT,
  PROGRAM_SYSTEM_PROMPT,
  buildPerformanceUserPrompt,
  buildProgramUserPrompt,
  performanceSystemPrompt,
} from "@/lib/llm/prompts";
import {
  feedbackAnalysisInputSchema,
  feedbackAnalysisOutputSchema,
  performanceAnalysisInputSchema,
  performanceReportOutputSchema,
  programGenerationInputSchema,
  programGenerationOutputSchema,
  type FeedbackAnalysisInput,
  type PerformanceAnalysisInput,
  type ProgramGenerationInput,
} from "@/lib/llm/schemas";
import type {
  ChatClient,
  ChatCompletionResult,
  LLMProvider,
  LLMProviderDeps,
  LLMResult,
  LLMUsageLog,
  TokenUsage,
} from "@/lib/llm/types";
import { forbiddenTermsFromConstraints } from "@/lib/programs/constraints";
import { repairGeneratedProgram } from "@/lib/programs/repair-generated";

function errorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return "Output LLM non conforme allo schema";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Errore LLM sconosciuto";
}

class StructuredCallError extends Error {
  readonly usage: TokenUsage;
  readonly model: string;

  constructor(cause: unknown, usage: TokenUsage, model: string) {
    super(errorMessage(cause));
    this.name = "StructuredCallError";
    this.usage = usage;
    this.model = model;
  }
}

function isParseFailure(error: unknown): boolean {
  return (
    error instanceof LLMParseError ||
    error instanceof ZodError ||
    error instanceof SyntaxError
  );
}

async function completeValidated<T>(
  chat: ChatClient,
  schema: ZodType<T>,
  system: string,
  user: string,
): Promise<{ data: T; usage: TokenUsage; model: string }> {
  let lastError: unknown;
  let usage = emptyUsage();
  let model = chat.model;

  for (let attempt = 0; attempt < LLM_MAX_PARSE_ATTEMPTS; attempt += 1) {
    const userMessage =
      attempt === 0
        ? user
        : `${user}\n\nTentativo precedente non valido (${errorMessage(lastError)}). Rispondi SOLO con un oggetto JSON conforme allo schema.`;

    try {
      const completion: ChatCompletionResult = await chat.completeJson({
        system,
        user: userMessage,
      });
      usage = addUsage(usage, completion.usage);
      model = completion.model;
      const parsed = parseJsonContent(completion.content);
      return { data: schema.parse(parsed), usage, model };
    } catch (error) {
      lastError = error;
      if (isParseFailure(error)) {
        continue;
      }
      throw new StructuredCallError(error, usage, model);
    }
  }

  throw new StructuredCallError(
    lastError instanceof Error
      ? lastError
      : new LLMParseError("Output LLM non conforme allo schema"),
    usage,
    model,
  );
}

function usageFields(usage: TokenUsage, provider: ChatClient["name"]) {
  const hasTokens = usage.totalTokens > 0;
  return {
    promptTokens: hasTokens ? usage.promptTokens : null,
    completionTokens: hasTokens ? usage.completionTokens : null,
    totalTokens: hasTokens ? usage.totalTokens : null,
    estimatedCostUsd: hasTokens ? estimateCostUsd(provider, usage) : null,
  };
}

export function createStructuredLLMProvider(
  chat: ChatClient,
  deps: LLMProviderDeps = {},
): LLMProvider {
  const logUsage = deps.logUsage ?? safePersistLLMUsage;

  async function log(entry: Omit<LLMUsageLog, "provider">): Promise<void> {
    await logUsage({ ...entry, provider: chat.name });
  }

  async function run<TInput, TOutput>(options: {
    input: TInput;
    parseInput: (input: TInput) => TInput;
    userId: string;
    interactionType: LLMInteractionType;
    schema: ZodType<TOutput>;
    system: string;
    userPrompt: (input: TInput) => string;
    fallback: (input: TInput) => TOutput;
  }): Promise<LLMResult<TOutput>> {
    const parsedInput = options.parseInput(options.input);
    let usage = emptyUsage();
    let model = chat.model;

    try {
      const result = await completeValidated(
        chat,
        options.schema,
        options.system,
        options.userPrompt(parsedInput),
      );
      usage = result.usage;
      model = result.model;
      await log({
        userId: options.userId,
        interactionType: options.interactionType,
        model,
        ...usageFields(usage, chat.name),
        success: true,
        usedFallback: false,
        error: null,
      });
      return {
        data: result.data,
        source: "llm",
        provider: chat.name,
        model,
        usedFallback: false,
      };
    } catch (error) {
      if (error instanceof StructuredCallError) {
        usage = error.usage;
        model = error.model;
      }
      const data = options.fallback(parsedInput);
      await log({
        userId: options.userId,
        interactionType: options.interactionType,
        model,
        ...usageFields(usage, chat.name),
        success: true,
        usedFallback: true,
        error: errorMessage(error),
      });
      return {
        data,
        source: "fallback",
        provider: chat.name,
        model,
        usedFallback: true,
      };
    }
  }

  return {
    name: chat.name,
    model: chat.model,
    generateProgram(input: ProgramGenerationInput) {
      return run({
        input,
        parseInput: (value) => programGenerationInputSchema.parse(value),
        userId: input.userId,
        interactionType: "generate_program",
        schema: programGenerationOutputSchema,
        system: PROGRAM_SYSTEM_PROMPT,
        userPrompt: (value) =>
          buildProgramUserPrompt({
            ...value,
            forbiddenTerms: forbiddenTermsFromConstraints(value.constraints),
          }),
        fallback: fallbackGenerateProgram,
      }).then((result) => ({
        ...result,
        data: repairGeneratedProgram(
          programGenerationInputSchema.parse(input),
          result.data,
        ),
      }));
    },
    analyzeFeedback(input: FeedbackAnalysisInput) {
      return run({
        input,
        parseInput: (value) => feedbackAnalysisInputSchema.parse(value),
        userId: input.userId,
        interactionType: "analyze_feedback",
        schema: feedbackAnalysisOutputSchema,
        system: FEEDBACK_SYSTEM_PROMPT,
        userPrompt: (value) => JSON.stringify(value),
        fallback: fallbackAnalyzeFeedback,
      });
    },
    analyzePerformance(input: PerformanceAnalysisInput) {
      return run({
        input,
        parseInput: (value) => performanceAnalysisInputSchema.parse(value),
        userId: input.userId,
        interactionType: "analyze_performance",
        schema: performanceReportOutputSchema,
        system: performanceSystemPrompt(input.style),
        userPrompt: (value) => buildPerformanceUserPrompt(value),
        fallback: fallbackAnalyzePerformance,
      });
    },
  };
}
