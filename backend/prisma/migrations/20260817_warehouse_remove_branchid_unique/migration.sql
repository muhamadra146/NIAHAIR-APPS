-- Remove unique constraint on Warehouse.branchId
-- A branch can now have MANY warehouses (one-to-many: Branch → Warehouses)
-- Previously branchId was @unique, limiting each branch to exactly one warehouse.

DROP INDEX IF EXISTS "warehouses_branchId_key";
