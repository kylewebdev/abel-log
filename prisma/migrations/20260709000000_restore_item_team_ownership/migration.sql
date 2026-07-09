-- Preserve the team that originally submitted each sold item so sale
-- reassignment does not transfer authority over historical entries.

ALTER TABLE "SoldItem" ADD COLUMN "submittedTeamId" INTEGER;

UPDATE "SoldItem" AS item
SET "submittedTeamId" = creator."teamId"
FROM "User" AS creator
WHERE creator."id" = item."createdByUserId"
  AND creator."role" = 'TEAM';

CREATE INDEX "SoldItem_submittedTeamId_idx" ON "SoldItem"("submittedTeamId");

ALTER TABLE "SoldItem"
ADD CONSTRAINT "SoldItem_submittedTeamId_fkey"
FOREIGN KEY ("submittedTeamId") REFERENCES "Team"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
