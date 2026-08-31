import { LLM_INTERACTION_TYPE } from "@/lib/llm/constants";
import { prisma } from "@/lib/prisma";

export const LLM_GENERATE_PROGRAM_MAX_PER_HOUR = 5;
export const LLM_ANALYZE_FEEDBACK_MAX_PER_HOUR = 20;

export class LlmQuotaExceededError extends Error {
  constructor(message = "Limite di generazioni raggiunto. Riprova più tardi.") {
    super(message);
    this.name = "LlmQuotaExceededError";
  }
}

export function isLlmQuotaExceeded(
  recentCount: number,
  max = LLM_GENERATE_PROGRAM_MAX_PER_HOUR,
): boolean {
  return recentCount >= max;
}

async function countRecentInteractions(
  userId: string,
  interactionType: string,
): Promise<number> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000);
  return prisma.lLMInteractionLog.count({
    where: {
      userId,
      interactionType,
      createdAt: { gte: windowStart },
    },
  });
}

/** Caps generate/regenerate LLM calls per user (serverless-safe: counts DB logs). */
export async function assertGenerateProgramQuota(
  userId: string,
): Promise<void> {
  const recentCount = await countRecentInteractions(
    userId,
    LLM_INTERACTION_TYPE.generateProgram,
  );
  if (isLlmQuotaExceeded(recentCount)) {
    throw new LlmQuotaExceededError(
      "Hai già generato troppi programmi nell'ultima ora. Riprova più tardi.",
    );
  }
}

export async function assertAnalyzeFeedbackQuota(
  userId: string,
): Promise<void> {
  const recentCount = await countRecentInteractions(
    userId,
    LLM_INTERACTION_TYPE.analyzeFeedback,
  );
  if (isLlmQuotaExceeded(recentCount, LLM_ANALYZE_FEEDBACK_MAX_PER_HOUR)) {
    throw new LlmQuotaExceededError(
      "Hai già analizzato troppi feedback nell'ultima ora. Riprova più tardi.",
    );
  }
}
