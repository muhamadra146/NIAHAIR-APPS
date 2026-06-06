-- Phase 10F.0.1: Multi Branch Foundation
-- User → Employee → EmployeeBranch → Branch access

-- AlterTable: link users to employees
ALTER TABLE "users" ADD COLUMN "employeeId" TEXT;

-- CreateTable: branch access permission per employee
CREATE TABLE "employee_branches" (
    "id"        TEXT        NOT NULL,
    "employeeId" TEXT       NOT NULL,
    "branchId"   TEXT       NOT NULL,
    "isPrimary"  BOOLEAN    NOT NULL DEFAULT false,
    "isActive"   BOOLEAN    NOT NULL DEFAULT true,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_branches_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "users_employeeId_key"                      ON "users"("employeeId");
CREATE INDEX       "users_employeeId_idx"                       ON "users"("employeeId");
CREATE INDEX       "employee_branches_employeeId_idx"           ON "employee_branches"("employeeId");
CREATE INDEX       "employee_branches_branchId_idx"             ON "employee_branches"("branchId");
CREATE UNIQUE INDEX "employee_branches_employeeId_branchId_key" ON "employee_branches"("employeeId", "branchId");

-- Foreign keys
ALTER TABLE "users"
  ADD CONSTRAINT "users_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employee_branches"
  ADD CONSTRAINT "employee_branches_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employee_branches"
  ADD CONSTRAINT "employee_branches_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
