-- AlterTable: add nullable homeBranchId FK to employees
ALTER TABLE "employees" ADD COLUMN "homeBranchId" TEXT;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_homeBranchId_fkey"
  FOREIGN KEY ("homeBranchId") REFERENCES "branches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "employees_homeBranchId_idx" ON "employees"("homeBranchId");
