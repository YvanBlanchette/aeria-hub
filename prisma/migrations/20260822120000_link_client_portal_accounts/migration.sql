-- Link a login account directly to one client portal record.
ALTER TABLE "User" ADD COLUMN "clientId" TEXT;

CREATE UNIQUE INDEX "User_clientId_key" ON "User"("clientId");

ALTER TABLE "User"
ADD CONSTRAINT "User_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
