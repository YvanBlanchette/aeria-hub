-- CreateTable
CREATE TABLE "TripTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" DATETIME,
    "assigneeId" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TripTask_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT,
    "travelerId" TEXT,
    "segmentId" TEXT,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "expiryDate" DATETIME,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "Traveler" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "TripSegment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("clientId", "expiryDate", "fileName", "fileSize", "id", "mimeType", "storagePath", "travelerId", "type", "uploadedAt") SELECT "clientId", "expiryDate", "fileName", "fileSize", "id", "mimeType", "storagePath", "travelerId", "type", "uploadedAt" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE TABLE "new_TripSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
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
    CONSTRAINT "TripSegment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TripSegment" ("confirmationNumber", "cost", "createdAt", "details", "endDateTime", "id", "location", "notes", "provider", "startDateTime", "title", "tripId", "type", "updatedAt") SELECT "confirmationNumber", "cost", "createdAt", "details", "endDateTime", "id", "location", "notes", "provider", "startDateTime", "title", "tripId", "type", "updatedAt" FROM "TripSegment";
DROP TABLE "TripSegment";
ALTER TABLE "new_TripSegment" RENAME TO "TripSegment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
