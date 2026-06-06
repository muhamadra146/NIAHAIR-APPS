-- Branch is website master data. Accurate does NOT own branch.
-- Remove Accurate ownership fields from Branch and Warehouse.
-- Remove User.branchId — access is now via User → Employee → EmployeeBranch → Branch.

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_branchId_fkey";

-- DropIndex
DROP INDEX "branches_accurateBranchId_key";
DROP INDEX "users_branchId_idx";
DROP INDEX "warehouses_code_key";

-- AlterTable: Branch — remove Accurate fields, add city/province
ALTER TABLE "branches"
  DROP COLUMN "accurateBranchId",
  DROP COLUMN "lastSyncAt",
  ADD COLUMN  "city"     TEXT,
  ADD COLUMN  "province" TEXT;

-- AlterTable: User — remove branch ownership
ALTER TABLE "users" DROP COLUMN "branchId";

-- AlterTable: Warehouse — Accurate warehouse ID is the only external mapping
ALTER TABLE "warehouses"
  DROP COLUMN "code",
  DROP COLUMN "lastSyncAt";
