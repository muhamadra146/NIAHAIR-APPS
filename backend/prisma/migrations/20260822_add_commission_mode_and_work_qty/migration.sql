-- Add CommissionMode enum
CREATE TYPE "CommissionMode" AS ENUM ('FIXED_RATE', 'WORK_QTY');

-- Add commissionMode to service_job_slots (default FIXED_RATE untuk data existing)
ALTER TABLE "service_job_slots"
  ADD COLUMN "commissionMode" "CommissionMode" NOT NULL DEFAULT 'FIXED_RATE';

-- Add workQty to treatment_job_assignments (nullable — hanya untuk slot WORK_QTY)
ALTER TABLE "treatment_job_assignments"
  ADD COLUMN "workQty" DECIMAL(10, 2);

-- Drop unique index lama (treatmentItemId, serviceJobSlotId)
DROP INDEX "treatment_job_assignments_treatmentItemId_serviceJobSlotId_key";

-- Buat unique index baru (treatmentItemId, serviceJobSlotId, employeeId)
-- Satu slot WORK_QTY bisa banyak staff, satu FIXED_RATE tetap satu staff per slot
CREATE UNIQUE INDEX "treatment_job_assignments_treatmentItemId_serviceJobSlotId_employeeId_key"
  ON "treatment_job_assignments"("treatmentItemId", "serviceJobSlotId", "employeeId");
