-- CreateTable
CREATE TABLE "TripSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "confirmationNumber" TEXT,
    "startDateTime" DATETIME,
    "endDateTime" DATETIME,
    "location" TEXT,
    "cost" REAL,
    "notes" TEXT,
    "details" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TripSegment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
