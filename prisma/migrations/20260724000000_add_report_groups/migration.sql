-- Add sale-specific report groups without changing or backfilling existing
-- sold-item data. Existing items remain unassigned until edited.

-- AlterTable
ALTER TABLE "SoldItem" ADD COLUMN "reportGroupId" INTEGER;

-- CreateTable
CREATE TABLE "ReportGroup" (
    "id" SERIAL NOT NULL,
    "estateSaleId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportGroup_estateSaleId_isActive_idx"
ON "ReportGroup"("estateSaleId", "isActive");

-- Support a database-enforced same-sale relationship from SoldItem.
CREATE UNIQUE INDEX "ReportGroup_id_estateSaleId_key"
ON "ReportGroup"("id", "estateSaleId");

-- One reusable group per palette color within a sale.
CREATE UNIQUE INDEX "ReportGroup_estateSaleId_color_key"
ON "ReportGroup"("estateSaleId", "color");

-- Support group-filtered report queries.
CREATE INDEX "SoldItem_estateSaleId_reportGroupId_isArchived_idx"
ON "SoldItem"("estateSaleId", "reportGroupId", "isArchived");

-- AddForeignKey
ALTER TABLE "ReportGroup"
ADD CONSTRAINT "ReportGroup_estateSaleId_fkey"
FOREIGN KEY ("estateSaleId") REFERENCES "EstateSale"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Composite relation prevents an item from referencing a group on another sale.
ALTER TABLE "SoldItem"
ADD CONSTRAINT "SoldItem_reportGroupId_estateSaleId_fkey"
FOREIGN KEY ("reportGroupId", "estateSaleId")
REFERENCES "ReportGroup"("id", "estateSaleId")
ON DELETE RESTRICT ON UPDATE CASCADE;
