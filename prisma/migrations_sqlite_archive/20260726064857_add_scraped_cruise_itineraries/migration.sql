-- CreateTable
CREATE TABLE "ScrapedCruiseItinerary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalKey" TEXT NOT NULL,
    "shipId" TEXT,
    "shipName" TEXT NOT NULL,
    "cruiseLine" TEXT,
    "title" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "sourceUrl" TEXT NOT NULL,
    "scrapedAt" DATETIME,
    "payload" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ScrapedCruiseItinerary_externalKey_key" ON "ScrapedCruiseItinerary"("externalKey");

-- CreateIndex
CREATE INDEX "ScrapedCruiseItinerary_shipId_startDate_idx" ON "ScrapedCruiseItinerary"("shipId", "startDate");

-- CreateIndex
CREATE INDEX "ScrapedCruiseItinerary_updatedAt_idx" ON "ScrapedCruiseItinerary"("updatedAt");
