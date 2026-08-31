-- AlterTable
ALTER TABLE "Workout" ADD COLUMN "matchSource" TEXT;

-- DropIndex
DROP INDEX "Workout_activityId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Workout_activityId_key" ON "Workout"("activityId");

-- CreateIndex
CREATE INDEX "Workout_plannedDate_idx" ON "Workout"("plannedDate");
