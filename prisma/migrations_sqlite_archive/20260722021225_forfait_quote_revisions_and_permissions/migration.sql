-- CreateTable
CREATE TABLE "ForfaitQuoteRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "forfaitQuoteId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "constants" JSONB NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "totalSaleCents" INTEGER NOT NULL DEFAULT 0,
    "totalRevenueCents" INTEGER NOT NULL DEFAULT 0,
    "avgMarginPct" REAL NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ForfaitQuoteRevision_forfaitQuoteId_fkey" FOREIGN KEY ("forfaitQuoteId") REFERENCES "ForfaitQuote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ForfaitQuoteRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ForfaitQuote" (
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
    "currentRevision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ForfaitQuote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ForfaitQuote_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ForfaitQuote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ForfaitQuote" ("avgMarginPct", "clientId", "constants", "createdAt", "createdById", "currency", "id", "name", "passengers", "payload", "totalRevenueCents", "totalSaleCents", "tripId", "updatedAt") SELECT "avgMarginPct", "clientId", "constants", "createdAt", "createdById", "currency", "id", "name", "passengers", "payload", "totalRevenueCents", "totalSaleCents", "tripId", "updatedAt" FROM "ForfaitQuote";
DROP TABLE "ForfaitQuote";
ALTER TABLE "new_ForfaitQuote" RENAME TO "ForfaitQuote";
CREATE INDEX "ForfaitQuote_updatedAt_idx" ON "ForfaitQuote"("updatedAt");
CREATE INDEX "ForfaitQuote_clientId_idx" ON "ForfaitQuote"("clientId");
CREATE INDEX "ForfaitQuote_tripId_idx" ON "ForfaitQuote"("tripId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ForfaitQuoteRevision_forfaitQuoteId_createdAt_idx" ON "ForfaitQuoteRevision"("forfaitQuoteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ForfaitQuoteRevision_forfaitQuoteId_revisionNumber_key" ON "ForfaitQuoteRevision"("forfaitQuoteId", "revisionNumber");
