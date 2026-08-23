-- AlterTable
ALTER TABLE "CruisePort"
  ADD COLUMN     "externalId" TEXT,
  ADD COLUMN     "latitude" DOUBLE PRECISION,
  ADD COLUMN     "longitude" DOUBLE PRECISION,
  ADD COLUMN     "locode" TEXT,
  ADD COLUMN     "region" TEXT,
  ADD COLUMN     "description" TEXT,
  ADD COLUMN     "gettingFromPort" TEXT,
  ADD COLUMN     "thingsToDo" JSONB,
  ADD COLUMN     "sourceUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CruisePort_externalId_key" ON "CruisePort"("externalId");
