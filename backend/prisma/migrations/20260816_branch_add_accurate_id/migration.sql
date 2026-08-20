-- AddColumn: accurateBranchId and lastSyncAt to branches table
ALTER TABLE "branches"
  ADD COLUMN IF NOT EXISTS "accurateBranchId" INTEGER,
  ADD COLUMN IF NOT EXISTS "lastSyncAt"       TIMESTAMP(3);

-- Unique constraint on accurateBranchId
CREATE UNIQUE INDEX IF NOT EXISTS "branches_accurateBranchId_key"
  ON "branches"("accurateBranchId");
