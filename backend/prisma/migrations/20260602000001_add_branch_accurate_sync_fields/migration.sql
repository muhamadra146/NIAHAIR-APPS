-- AlterTable
ALTER TABLE "branches" ADD COLUMN "accurateBranchId" INTEGER;
ALTER TABLE "branches" ADD COLUMN "lastSyncAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "branches_accurateBranchId_key" ON "branches"("accurateBranchId");
