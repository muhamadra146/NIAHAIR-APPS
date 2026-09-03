-- Migration: Add CommissionJob + update CommissionRule + update TreatmentJobAssignment

-- 1. Buat tabel commission_jobs
CREATE TABLE "commission_jobs" (
    "id"                   TEXT NOT NULL,
    "commissionCategoryId" TEXT NOT NULL,
    "name"                 TEXT NOT NULL,
    "jobKey"               TEXT NOT NULL,
    "sortOrder"            INTEGER NOT NULL DEFAULT 0,
    "isActive"             BOOLEAN NOT NULL DEFAULT true,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "commission_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commission_jobs_commissionCategoryId_jobKey_key"
    ON "commission_jobs"("commissionCategoryId", "jobKey");

CREATE INDEX "commission_jobs_commissionCategoryId_idx"
    ON "commission_jobs"("commissionCategoryId");

ALTER TABLE "commission_jobs"
    ADD CONSTRAINT "commission_jobs_commissionCategoryId_fkey"
    FOREIGN KEY ("commissionCategoryId")
    REFERENCES "commission_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Tambah commissionJobId ke commission_rules
ALTER TABLE "commission_rules" ADD COLUMN "commissionJobId" TEXT;

CREATE INDEX "commission_rules_commissionJobId_idx"
    ON "commission_rules"("commissionJobId");

ALTER TABLE "commission_rules"
    ADD CONSTRAINT "commission_rules_commissionJobId_fkey"
    FOREIGN KEY ("commissionJobId")
    REFERENCES "commission_jobs"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Update treatment_job_assignments
--    a. Buat serviceJobSlotId nullable
ALTER TABLE "treatment_job_assignments"
    ALTER COLUMN "serviceJobSlotId" DROP NOT NULL;

--    b. Tambah commissionJobId
ALTER TABLE "treatment_job_assignments" ADD COLUMN "commissionJobId" TEXT;

CREATE INDEX "treatment_job_assignments_commissionJobId_idx"
    ON "treatment_job_assignments"("commissionJobId");

ALTER TABLE "treatment_job_assignments"
    ADD CONSTRAINT "treatment_job_assignments_commissionJobId_fkey"
    FOREIGN KEY ("commissionJobId")
    REFERENCES "commission_jobs"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

--    c. Hapus old unique constraint (serviceJobSlotId sekarang nullable)
ALTER TABLE "treatment_job_assignments"
    DROP CONSTRAINT IF EXISTS "treatment_job_assignments_treatmentItemId_serviceJobSlotId_employeeId_key";

--    d. Buat partial unique indexes yang lebih tepat
CREATE UNIQUE INDEX "tja_slot_unique"
    ON "treatment_job_assignments"("treatmentItemId", "serviceJobSlotId", "employeeId")
    WHERE "serviceJobSlotId" IS NOT NULL;

CREATE UNIQUE INDEX "tja_job_unique"
    ON "treatment_job_assignments"("treatmentItemId", "commissionJobId", "employeeId")
    WHERE "commissionJobId" IS NOT NULL;
