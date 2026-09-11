-- AlterTable
ALTER TABLE "RecalcProposal" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'feedback';
ALTER TABLE "RecalcProposal" ADD COLUMN "situationText" TEXT;
ALTER TABLE "RecalcProposal" ADD COLUMN "situationTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
