import type { LLMUsageLog } from "@/lib/llm/types";
import { prisma } from "@/lib/prisma";

export async function persistLLMUsage(entry: LLMUsageLog): Promise<void> {
  await prisma.lLMInteractionLog.create({
    data: {
      userId: entry.userId,
      interactionType: entry.interactionType,
      provider: entry.provider,
      model: entry.model,
      promptTokens: entry.promptTokens,
      completionTokens: entry.completionTokens,
      totalTokens: entry.totalTokens,
      estimatedCostUsd: entry.estimatedCostUsd,
      success: entry.success,
      usedFallback: entry.usedFallback,
      error: entry.error,
    },
  });
}

export async function safePersistLLMUsage(entry: LLMUsageLog): Promise<void> {
  try {
    await persistLLMUsage(entry);
  } catch (error) {
    console.error("Impossibile salvare LLMInteractionLog", error);
  }
}
