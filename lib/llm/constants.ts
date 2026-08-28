export const LLM_PROVIDER_NAMES = ["deepseek", "openai"] as const;
export type LLMProviderName = (typeof LLM_PROVIDER_NAMES)[number];

export const DEFAULT_LLM_PROVIDER: LLMProviderName = "deepseek";

export const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
export const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/v1/chat/completions";

export const OPENAI_MODEL = "gpt-4o-mini";
export const DEEPSEEK_MODEL = "deepseek-chat";

export const LLM_REQUEST_TIMEOUT_MS = 60_000;
export const LLM_MAX_HTTP_RETRIES = 2;
export const LLM_MAX_PARSE_ATTEMPTS = 2;
export const LLM_MAX_TOKENS = 8192;
export const LLM_TEMPERATURE = 0.2;

export const LLM_INTERACTION_TYPE = {
  generateProgram: "generate_program",
  analyzeFeedback: "analyze_feedback",
  analyzePerformance: "analyze_performance",
} as const;

export type LLMInteractionType =
  (typeof LLM_INTERACTION_TYPE)[keyof typeof LLM_INTERACTION_TYPE];

/** USD per 1M tokens. Conservative list-price estimates, not billed amounts. */
export const LLM_PRICE_PER_MILLION_TOKENS: Record<
  LLMProviderName,
  { input: number; output: number }
> = {
  deepseek: { input: 0.28, output: 0.42 },
  openai: { input: 0.15, output: 0.6 },
};
