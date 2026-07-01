-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TEAM', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('PAPER', 'LIVE_APP', 'MANAGEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NEEDS_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "AliasScope" AS ENUM ('GLOBAL', 'TEAM');

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "teamId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateSale" (
    "id" SERIAL NOT NULL,
    "addressRaw" TEXT NOT NULL,
    "formattedAddress" TEXT,
    "normalizedAddress" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "googlePlaceId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "saleName" TEXT,
    "clientName" TEXT,
    "notes" TEXT,
    "status" "SaleStatus" NOT NULL DEFAULT 'ACTIVE',
    "reportThresholdCents" INTEGER NOT NULL DEFAULT 2500,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "assignedTeamId" INTEGER,
    "createdByUserId" INTEGER NOT NULL,
    "createdByTeamId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "EstateSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoldItem" (
    "id" SERIAL NOT NULL,
    "estateSaleId" INTEGER NOT NULL,
    "submittedTeamId" INTEGER NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "finalSoldPriceCents" INTEGER NOT NULL,
    "teamLabel" TEXT,
    "reportCategoryId" INTEGER,
    "entrySource" "EntrySource" NOT NULL DEFAULT 'LIVE_APP',
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "archivedByUserId" INTEGER,
    "archiveReason" TEXT,
    "soldDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoldItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryAlias" (
    "id" SERIAL NOT NULL,
    "aliasKey" TEXT NOT NULL,
    "aliasText" TEXT NOT NULL,
    "normalizedAliasText" TEXT NOT NULL,
    "reportCategoryId" INTEGER NOT NULL,
    "teamId" INTEGER,
    "scope" "AliasScope" NOT NULL DEFAULT 'GLOBAL',
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" INTEGER,
    "approvedByUserId" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "actorUserId" INTEGER NOT NULL,
    "actorTeamId" INTEGER,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "EstateSale_status_idx" ON "EstateSale"("status");

-- CreateIndex
CREATE INDEX "EstateSale_normalizedAddress_status_idx" ON "EstateSale"("normalizedAddress", "status");

-- CreateIndex
CREATE INDEX "EstateSale_googlePlaceId_status_idx" ON "EstateSale"("googlePlaceId", "status");

-- CreateIndex
CREATE INDEX "SoldItem_estateSaleId_isArchived_idx" ON "SoldItem"("estateSaleId", "isArchived");

-- CreateIndex
CREATE INDEX "SoldItem_submittedTeamId_idx" ON "SoldItem"("submittedTeamId");

-- CreateIndex
CREATE INDEX "SoldItem_reportCategoryId_idx" ON "SoldItem"("reportCategoryId");

-- CreateIndex
CREATE INDEX "SoldItem_reviewStatus_idx" ON "SoldItem"("reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCategory_name_key" ON "ReportCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCategory_slug_key" ON "ReportCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryAlias_aliasKey_key" ON "CategoryAlias"("aliasKey");

-- CreateIndex
CREATE INDEX "CategoryAlias_normalizedAliasText_idx" ON "CategoryAlias"("normalizedAliasText");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_actorUserId_idx" ON "ActivityLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateSale" ADD CONSTRAINT "EstateSale_assignedTeamId_fkey" FOREIGN KEY ("assignedTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateSale" ADD CONSTRAINT "EstateSale_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateSale" ADD CONSTRAINT "EstateSale_createdByTeamId_fkey" FOREIGN KEY ("createdByTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldItem" ADD CONSTRAINT "SoldItem_estateSaleId_fkey" FOREIGN KEY ("estateSaleId") REFERENCES "EstateSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldItem" ADD CONSTRAINT "SoldItem_submittedTeamId_fkey" FOREIGN KEY ("submittedTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldItem" ADD CONSTRAINT "SoldItem_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldItem" ADD CONSTRAINT "SoldItem_reportCategoryId_fkey" FOREIGN KEY ("reportCategoryId") REFERENCES "ReportCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldItem" ADD CONSTRAINT "SoldItem_archivedByUserId_fkey" FOREIGN KEY ("archivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAlias" ADD CONSTRAINT "CategoryAlias_reportCategoryId_fkey" FOREIGN KEY ("reportCategoryId") REFERENCES "ReportCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAlias" ADD CONSTRAINT "CategoryAlias_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAlias" ADD CONSTRAINT "CategoryAlias_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorTeamId_fkey" FOREIGN KEY ("actorTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

