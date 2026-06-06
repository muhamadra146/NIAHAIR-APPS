-- Finalize Branch/Warehouse foundation.
-- 1. Restore Warehouse.lastSyncAt for Accurate mapping refresh tracking.
-- 2. Remove Employee.branchId — branch access is via EmployeeBranch only.
--    Data migration: seed EmployeeBranch from existing Employee.branchId
--    BEFORE dropping the column.

-- ── Step 1: Warehouse.lastSyncAt ─────────────────────────────────────
ALTER TABLE "warehouses" ADD COLUMN "lastSyncAt" TIMESTAMP(3);

-- ── Step 2: Seed EmployeeBranch from Employee.branchId ───────────────
-- Only inserts rows that don't already exist (idempotent).
INSERT INTO "employee_branches" (id, "employeeId", "branchId", "isPrimary", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  e.id,
  e."branchId",
  true,
  true,
  NOW(),
  NOW()
FROM "employees" e
WHERE e."branchId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "employee_branches" eb
    WHERE eb."employeeId" = e.id
      AND eb."branchId"   = e."branchId"
  );

-- ── Step 3: Remove Employee.branchId ─────────────────────────────────
ALTER TABLE "employees" DROP CONSTRAINT "employees_branchId_fkey";
DROP INDEX "employees_branchId_idx";
ALTER TABLE "employees" DROP COLUMN "branchId";
