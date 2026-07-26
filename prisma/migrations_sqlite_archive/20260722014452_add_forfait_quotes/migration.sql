-- CreateTable
CREATE TABLE "ForfaitQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "clientId" TEXT,
    "tripId" TEXT,
    "createdById" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "totalSaleCents" INTEGER NOT NULL DEFAULT 0,
    "totalRevenueCents" INTEGER NOT NULL DEFAULT 0,
    "avgMarginPct" REAL NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "constants" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ForfaitQuote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ForfaitQuote_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ForfaitQuote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ForfaitQuote_updatedAt_idx" ON "ForfaitQuote"("updatedAt");

-- CreateIndex
CREATE INDEX "ForfaitQuote_clientId_idx" ON "ForfaitQuote"("clientId");

-- CreateIndex
CREATE INDEX "ForfaitQuote_tripId_idx" ON "ForfaitQuote"("tripId");
