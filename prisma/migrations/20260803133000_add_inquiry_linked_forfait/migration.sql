-- Link inquiries to package projects to preserve quote context through conversion.
ALTER TABLE "Inquiry"
ADD COLUMN "linkedForfaitQuoteId" TEXT;

CREATE INDEX "Inquiry_linkedForfaitQuoteId_idx" ON "Inquiry"("linkedForfaitQuoteId");

ALTER TABLE "Inquiry"
ADD CONSTRAINT "Inquiry_linkedForfaitQuoteId_fkey"
FOREIGN KEY ("linkedForfaitQuoteId") REFERENCES "ForfaitQuote"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
