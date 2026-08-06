-- CreateEnum
CREATE TYPE "BasecampJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'NEEDS_ATTENTION');

-- CreateTable
CREATE TABLE "BasecampCardLink" (
    "id" SERIAL NOT NULL,
    "basecampCardId" TEXT NOT NULL,
    "basecampConstructionId" TEXT,
    "basecampProjectId" TEXT,
    "basecampProjectAppUrl" TEXT,
    "cardTitle" TEXT NOT NULL,
    "cardContent" TEXT,
    "cardAppUrl" TEXT,
    "teamLeadPersonId" TEXT,
    "estateSaleId" INTEGER,
    "status" "BasecampJobStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "teamLeadGranted" BOOLEAN NOT NULL DEFAULT false,
    "saleSheetLinked" BOOLEAN NOT NULL DEFAULT false,
    "milestoneCompleted" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT,
    "manualFollowUp" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BasecampCardLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasecampOAuthCredential" (
    "id" TEXT NOT NULL DEFAULT 'primary',
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BasecampOAuthCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BasecampCardLink_basecampCardId_key" ON "BasecampCardLink"("basecampCardId");

-- CreateIndex
CREATE UNIQUE INDEX "BasecampCardLink_basecampConstructionId_key" ON "BasecampCardLink"("basecampConstructionId");

-- CreateIndex
CREATE UNIQUE INDEX "BasecampCardLink_basecampProjectId_key" ON "BasecampCardLink"("basecampProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "BasecampCardLink_estateSaleId_key" ON "BasecampCardLink"("estateSaleId");

-- CreateIndex
CREATE INDEX "BasecampCardLink_status_updatedAt_idx" ON "BasecampCardLink"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "BasecampCardLink" ADD CONSTRAINT "BasecampCardLink_estateSaleId_fkey" FOREIGN KEY ("estateSaleId") REFERENCES "EstateSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
