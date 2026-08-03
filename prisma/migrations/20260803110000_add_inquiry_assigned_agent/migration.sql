-- Add ownership to Inquiry so agent scoping can be enforced.
ALTER TABLE "Inquiry"
ADD COLUMN "assignedAgentId" TEXT;

CREATE INDEX "Inquiry_assignedAgentId_idx" ON "Inquiry"("assignedAgentId");

ALTER TABLE "Inquiry"
ADD CONSTRAINT "Inquiry_assignedAgentId_fkey"
FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
