import { LLM_INTERACTION_TYPE } from "@/lib/llm/constants";
import { prisma } from "@/lib/prisma";

export const LLM_GENERATE_PROGRAM_MAX_PER_HOUR = 5;

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

/** Caps generate/regenerate LLM calls per user (serverless-safe: counts DB logs). */
export async function assertGenerateProgramQuota(
  userId: string,
): Promise<void> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.lLMInteractionLog.count({
    where: {
      userId,
      interactionType: LLM_INTERACTION_TYPE.generateProgram,
      createdAt: { gte: windowStart },
    },
  });
  if (isLlmQuotaExceeded(recentCount)) {
    throw new LlmQuotaExceededError(
      "Hai già generato troppi programmi nell'ultima ora. Riprova più tardi.",
    );
  }
}
