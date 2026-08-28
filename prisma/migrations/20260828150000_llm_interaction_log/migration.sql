-- CreateTable
CREATE TABLE "LLMInteractionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interactionType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "estimatedCostUsd" DECIMAL(12,6),
    "success" BOOLEAN NOT NULL,
    "usedFallback" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LLMInteractionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LLMInteractionLog_userId_createdAt_idx" ON "LLMInteractionLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LLMInteractionLog_userId_interactionType_idx" ON "LLMInteractionLog"("userId", "interactionType");

-- AddForeignKey
ALTER TABLE "LLMInteractionLog" ADD CONSTRAINT "LLMInteractionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
