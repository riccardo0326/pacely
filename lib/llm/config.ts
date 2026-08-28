import {
  DEFAULT_LLM_PROVIDER,
  type LLMProviderName,
} from "@/lib/llm/constants";
import { LLMConfigError } from "@/lib/llm/errors";

export function resolveLLMProviderName(
  override?: LLMProviderName | string | null,
): LLMProviderName {
  const raw = override ?? process.env.LLM_PROVIDER ?? DEFAULT_LLM_PROVIDER;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "openai" || normalized === "deepseek") {
    return normalized;
  }
  throw new LLMConfigError(
    `LLM_PROVIDER non valido: "${raw}". Usa "deepseek" o "openai".`,
  );
}
