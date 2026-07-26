-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "phone" TEXT,
    "website" TEXT,
    "agentPortalUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TripSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "supplierId" TEXT,
    "confirmationNumber" TEXT,
    "startDateTime" DATETIME,
    "endDateTime" DATETIME,
    "location" TEXT,
    "cost" INTEGER,
    "notes" TEXT,
    "details" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TripSegment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripSegment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TripSegment" ("confirmationNumber", "cost", "createdAt", "details", "endDateTime", "id", "location", "notes", "provider", "sortOrder", "startDateTime", "title", "tripId", "type", "updatedAt") SELECT "confirmationNumber", "cost", "createdAt", "details", "endDateTime", "id", "location", "notes", "provider", "sortOrder", "startDateTime", "title", "tripId", "type", "updatedAt" FROM "TripSegment";
DROP TABLE "TripSegment";
ALTER TABLE "new_TripSegment" RENAME TO "TripSegment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
