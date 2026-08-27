-- AlterTable
ALTER TABLE "Client"
  ADD COLUMN "aeriaProfilePrimary" TEXT,
  ADD COLUMN "aeriaProfileSecondary" TEXT,
  ADD COLUMN "aeriaProfileScores" JSONB,
  ADD COLUMN "aeriaProfileCompletedAt" TIMESTAMP(3);
