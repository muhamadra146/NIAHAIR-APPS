-- AlterTable: add staff_count_max to commission_jobs
-- Digunakan untuk rate dinamis Home Service (HS):
-- job dengan staffCountMax=3 berlaku ketika total staff ≤ 3
-- job tanpa staffCountMax (null) berlaku ketika total staff > threshold job lainnya
ALTER TABLE "commission_jobs" ADD COLUMN "staff_count_max" INTEGER;
