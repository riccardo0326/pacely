-- CreateTable
CREATE TABLE "WorkoutFeedback" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "freeText" TEXT NOT NULL,
    "analysis" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecalcProposal" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "weekId" TEXT,
    "feedbackId" TEXT,
    "rationale" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "RecalcProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutFeedback_workoutId_key" ON "WorkoutFeedback"("workoutId");

-- CreateIndex
CREATE UNIQUE INDEX "RecalcProposal_feedbackId_key" ON "RecalcProposal"("feedbackId");

-- CreateIndex
CREATE INDEX "RecalcProposal_programId_status_idx" ON "RecalcProposal"("programId", "status");

-- AddForeignKey
ALTER TABLE "WorkoutFeedback" ADD CONSTRAINT "WorkoutFeedback_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecalcProposal" ADD CONSTRAINT "RecalcProposal_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecalcProposal" ADD CONSTRAINT "RecalcProposal_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecalcProposal" ADD CONSTRAINT "RecalcProposal_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "WorkoutFeedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;
