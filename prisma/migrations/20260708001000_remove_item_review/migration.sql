-- Items are final when entered. Remove management review status.

DROP INDEX IF EXISTS "SoldItem_reviewStatus_idx";

ALTER TABLE "SoldItem"
  DROP COLUMN IF EXISTS "reviewStatus";

DROP TYPE IF EXISTS "ReviewStatus";
