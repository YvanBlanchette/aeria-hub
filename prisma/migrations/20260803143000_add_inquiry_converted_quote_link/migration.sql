-- Persist quote conversion traceability for inquiry idempotence.
ALTER TABLE "Inquiry"
ADD COLUMN "convertedQuoteId" TEXT;

CREATE INDEX "Inquiry_convertedQuoteId_idx" ON "Inquiry"("convertedQuoteId");

ALTER TABLE "Inquiry"
ADD CONSTRAINT "Inquiry_convertedQuoteId_fkey"
FOREIGN KEY ("convertedQuoteId") REFERENCES "Quote"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
