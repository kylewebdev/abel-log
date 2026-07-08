-- Remove category/alias infrastructure and per-item team attribution.
-- Team ownership now lives on EstateSale.assignedTeamId only.

ALTER TABLE "CategoryAlias" DROP CONSTRAINT IF EXISTS "CategoryAlias_approvedByUserId_fkey";
ALTER TABLE "CategoryAlias" DROP CONSTRAINT IF EXISTS "CategoryAlias_reportCategoryId_fkey";
ALTER TABLE "CategoryAlias" DROP CONSTRAINT IF EXISTS "CategoryAlias_teamId_fkey";
ALTER TABLE "SoldItem" DROP CONSTRAINT IF EXISTS "SoldItem_reportCategoryId_fkey";
ALTER TABLE "SoldItem" DROP CONSTRAINT IF EXISTS "SoldItem_submittedTeamId_fkey";

DROP INDEX IF EXISTS "CategoryAlias_aliasKey_key";
DROP INDEX IF EXISTS "CategoryAlias_normalizedAliasText_idx";
DROP INDEX IF EXISTS "ReportCategory_name_key";
DROP INDEX IF EXISTS "ReportCategory_slug_key";
DROP INDEX IF EXISTS "SoldItem_reportCategoryId_idx";
DROP INDEX IF EXISTS "SoldItem_submittedTeamId_idx";

ALTER TABLE "SoldItem"
  DROP COLUMN IF EXISTS "submittedTeamId",
  DROP COLUMN IF EXISTS "teamLabel",
  DROP COLUMN IF EXISTS "reportCategoryId";

DROP TABLE IF EXISTS "CategoryAlias";
DROP TABLE IF EXISTS "ReportCategory";
DROP TYPE IF EXISTS "AliasScope";
