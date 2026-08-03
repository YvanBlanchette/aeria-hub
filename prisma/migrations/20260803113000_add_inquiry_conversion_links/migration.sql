-- Persist conversion traceability between Inquiry and generated CRM records.
ALTER TABLE "Inquiry"
ADD COLUMN "convertedClientId" TEXT,
ADD COLUMN "convertedTripId" TEXT,
ADD COLUMN "convertedAt" TIMESTAMP(3);

CREATE INDEX "Inquiry_convertedClientId_idx" ON "Inquiry"("convertedClientId");
CREATE INDEX "Inquiry_convertedTripId_idx" ON "Inquiry"("convertedTripId");

ALTER TABLE "Inquiry"
ADD CONSTRAINT "Inquiry_convertedClientId_fkey"
FOREIGN KEY ("convertedClientId") REFERENCES "Client"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Inquiry"
ADD CONSTRAINT "Inquiry_convertedTripId_fkey"
FOREIGN KEY ("convertedTripId") REFERENCES "Trip"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
