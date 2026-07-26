-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "finalPaymentDate" DATETIME;

-- CreateTable
CREATE TABLE "TripPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "cardHolder" TEXT,
    "cardNumber" TEXT,
    "confirmationNumber" TEXT,
    "amount" INTEGER NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "paidTo" TEXT,
    "comments" TEXT,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TripPayment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
