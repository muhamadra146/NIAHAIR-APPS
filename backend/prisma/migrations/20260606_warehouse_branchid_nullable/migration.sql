-- Warehouse is Accurate master.
-- branchId is nullable so warehouses can be synced from Accurate first,
-- then mapped to a local Branch by an admin.

-- DropForeignKey
ALTER TABLE "warehouses" DROP CONSTRAINT "warehouses_branchId_fkey";

-- AlterTable
ALTER TABLE "warehouses" ALTER COLUMN "branchId" DROP NOT NULL;

-- AddForeignKey (SET NULL on delete since branchId is now optional)
ALTER TABLE "warehouses"
  ADD CONSTRAINT "warehouses_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
