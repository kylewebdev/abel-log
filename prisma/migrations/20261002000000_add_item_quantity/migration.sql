ALTER TABLE "SoldItem" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "SoldItem" ADD CONSTRAINT "SoldItem_quantity_positive" CHECK ("quantity" > 0);
