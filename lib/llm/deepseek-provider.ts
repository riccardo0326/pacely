import { DEEPSEEK_CHAT_URL, DEEPSEEK_MODEL } from "@/lib/llm/constants";
import { createOpenAICompatibleChatClient } from "@/lib/llm/chat";
import { LLMConfigError } from "@/lib/llm/errors";
import { createStructuredLLMProvider } from "@/lib/llm/structured";
import type { LLMProvider, LLMProviderDeps } from "@/lib/llm/types";

export function createDeepSeekProvider(
  deps: LLMProviderDeps = {},
): LLMProvider {
  const chat = deps.completeJson
    ? {
        name: "deepseek" as const,
        model: DEEPSEEK_MODEL,
        completeJson: deps.completeJson,
      }
    : createOpenAICompatibleChatClient({
        name: "deepseek",
        model: DEEPSEEK_MODEL,
        url: DEEPSEEK_CHAT_URL,
        getApiKey: () => {
          const key = process.env.DEEPSEEK_API_KEY?.trim();
          if (!key) {
            throw new LLMConfigError("DEEPSEEK_API_KEY non configurata");
          }
          return key;
        },
        fetchImpl: deps.fetch,
        sleep: deps.sleep,
      });

  return createStructuredLLMProvider(chat, deps);
}
