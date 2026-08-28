import { z } from "zod";
import {
  LLM_MAX_HTTP_RETRIES,
  LLM_MAX_TOKENS,
  LLM_REQUEST_TIMEOUT_MS,
  LLM_TEMPERATURE,
} from "@/lib/llm/constants";
import {
  LLMApiError,
  LLMConfigError,
  LLMParseError,
  LLMRateLimitError,
  LLMTimeoutError,
} from "@/lib/llm/errors";
import type {
  ChatClient,
  ChatCompletionRequest,
  ChatCompletionResult,
  LLMProviderName,
  TokenUsage,
} from "@/lib/llm/types";

const chatCompletionResponseSchema = z.object({
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable(),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
});

export function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const text = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new LLMParseError("La risposta LLM non è JSON valido");
  }
}

function parseRetryAfterMs(headers: Headers, fallbackMs: number): number {
  const raw = headers.get("Retry-After") ?? headers.get("retry-after");
  if (!raw) {
    return fallbackMs;
  }
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const date = Date.parse(raw);
  if (!Number.isNaN(date)) {
    return Math.max(0, date - Date.now());
  }
  return fallbackMs;
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof LLMTimeoutError ||
    (error instanceof Error && error.name === "TimeoutError") ||
    (error instanceof DOMException && error.name === "TimeoutError")
  );
}

function usageFromResponse(
  usage:
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      }
    | undefined,
): TokenUsage {
  const promptTokens = usage?.prompt_tokens ?? 0;
  const completionTokens = usage?.completion_tokens ?? 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens: usage?.total_tokens ?? promptTokens + completionTokens,
  };
}

export type OpenAICompatibleChatConfig = {
  name: LLMProviderName;
  model: string;
  url: string;
  getApiKey: () => string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export function createOpenAICompatibleChatClient(
  config: OpenAICompatibleChatConfig,
): ChatClient {
  const fetchImpl = config.fetchImpl ?? fetch;
  const sleep = config.sleep ?? sleepMs;

  return {
    name: config.name,
    model: config.model,
    async completeJson(
      request: ChatCompletionRequest,
    ): Promise<ChatCompletionResult> {
      const apiKey = config.getApiKey();
      if (!apiKey) {
        throw new LLMConfigError(
          `API key mancante per il provider ${config.name}`,
        );
      }

      let lastError: unknown;

      for (let attempt = 0; attempt <= LLM_MAX_HTTP_RETRIES; attempt += 1) {
        try {
          const response = await fetchImpl(config.url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: config.model,
              temperature: LLM_TEMPERATURE,
              max_tokens: LLM_MAX_TOKENS,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: request.system },
                { role: "user", content: request.user },
              ],
            }),
            signal: AbortSignal.timeout(LLM_REQUEST_TIMEOUT_MS),
          });

          if (response.status === 429) {
            const retryAfterMs = parseRetryAfterMs(
              response.headers,
              500 * 2 ** attempt,
            );
            lastError = new LLMRateLimitError(retryAfterMs);
            if (attempt < LLM_MAX_HTTP_RETRIES) {
              await sleep(retryAfterMs);
              continue;
            }
            throw lastError;
          }

          if (response.status >= 500) {
            lastError = new LLMApiError(
              `Il provider LLM ha restituito ${response.status}`,
              response.status,
            );
            if (attempt < LLM_MAX_HTTP_RETRIES) {
              await sleep(500 * 2 ** attempt);
              continue;
            }
            throw lastError;
          }

          if (!response.ok) {
            throw new LLMApiError(
              `Richiesta LLM fallita (${response.status})`,
              response.status,
            );
          }

          const json: unknown = await response.json();
          const parsed = chatCompletionResponseSchema.parse(json);
          const content = parsed.choices[0]?.message.content;
          if (!content) {
            throw new LLMApiError(
              "Il provider LLM ha restituito una risposta vuota",
              502,
            );
          }

          return {
            content,
            model: parsed.model ?? config.model,
            usage: usageFromResponse(parsed.usage),
          };
        } catch (error) {
          if (error instanceof LLMApiError || error instanceof LLMConfigError) {
            throw error;
          }
          if (isTimeoutError(error)) {
            lastError = new LLMTimeoutError();
            if (attempt < LLM_MAX_HTTP_RETRIES) {
              await sleep(500 * 2 ** attempt);
              continue;
            }
            throw lastError;
          }
          lastError = error;
          if (attempt < LLM_MAX_HTTP_RETRIES) {
            await sleep(500 * 2 ** attempt);
            continue;
          }
          throw new LLMApiError(
            error instanceof Error ? error.message : "Richiesta LLM fallita",
          );
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new LLMApiError("Richiesta LLM fallita");
    },
  };
}
