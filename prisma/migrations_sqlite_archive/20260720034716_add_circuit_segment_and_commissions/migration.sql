-- CreateTable
CREATE TABLE "SegmentCommission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "segmentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "receivedDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SegmentCommission_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "TripSegment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
