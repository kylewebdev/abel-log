-- CreateTable
CREATE TABLE "BasecampIntake" (
    "id" SERIAL NOT NULL,
    "submissionId" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "cardTitle" TEXT NOT NULL,
    "cardContent" TEXT NOT NULL,
    "basecampCardId" TEXT,
    "basecampCardAppUrl" TEXT,
    "status" "BasecampJobStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BasecampIntake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BasecampIntake_submissionId_key" ON "BasecampIntake"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "BasecampIntake_basecampCardId_key" ON "BasecampIntake"("basecampCardId");

-- CreateIndex
CREATE INDEX "BasecampIntake_status_updatedAt_idx" ON "BasecampIntake"("status", "updatedAt");
