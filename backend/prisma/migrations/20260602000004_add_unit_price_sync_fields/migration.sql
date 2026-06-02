-- Unit: add isActive and lastSyncAt (same sync-tracking pattern as Branch, Item, Customer)
ALTER TABLE "units" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "units" ADD COLUMN "lastSyncAt" TIMESTAMP(3);

-- ItemPrice: add costPrice for margin reporting
ALTER TABLE "item_prices" ADD COLUMN "costPrice" DECIMAL(18,2);

-- ItemPrice: partial unique indexes to enforce one active price per combination
-- Rule 1: only one active GLOBAL price per item+unit (branchId IS NULL)
CREATE UNIQUE INDEX "item_prices_global_active_unique"
  ON "item_prices"("itemId", "unitId")
  WHERE "branchId" IS NULL AND "isActive" = true;

-- Rule 2: only one active BRANCH price per item+unit+branch (branchId IS NOT NULL)
CREATE UNIQUE INDEX "item_prices_branch_active_unique"
  ON "item_prices"("itemId", "unitId", "branchId")
  WHERE "branchId" IS NOT NULL AND "isActive" = true;
