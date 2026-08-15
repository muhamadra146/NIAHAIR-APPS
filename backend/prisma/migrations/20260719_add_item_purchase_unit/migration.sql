-- Add purchaseUnitId to items table (satuan beli dari Accurate)
ALTER TABLE "items" ADD COLUMN "purchaseUnitId" TEXT;

ALTER TABLE "items"
  ADD CONSTRAINT "items_purchaseUnitId_fkey"
  FOREIGN KEY ("purchaseUnitId") REFERENCES "units"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "items_purchaseUnitId_idx" ON "items"("purchaseUnitId");
