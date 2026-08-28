import { OPENAI_CHAT_URL, OPENAI_MODEL } from "@/lib/llm/constants";
import { createOpenAICompatibleChatClient } from "@/lib/llm/chat";
import { LLMConfigError } from "@/lib/llm/errors";
import { createStructuredLLMProvider } from "@/lib/llm/structured";
import type { LLMProvider, LLMProviderDeps } from "@/lib/llm/types";

export function createOpenAIProvider(deps: LLMProviderDeps = {}): LLMProvider {
  const chat = deps.completeJson
    ? {
        name: "openai" as const,
        model: OPENAI_MODEL,
        completeJson: deps.completeJson,
      }
    : createOpenAICompatibleChatClient({
        name: "openai",
        model: OPENAI_MODEL,
        url: OPENAI_CHAT_URL,
        getApiKey: () => {
          const key = process.env.OPENAI_API_KEY?.trim();
          if (!key) {
            throw new LLMConfigError("OPENAI_API_KEY non configurata");
          }
          return key;
        },
        fetchImpl: deps.fetch,
        sleep: deps.sleep,
      });

  return createStructuredLLMProvider(chat, deps);
}
