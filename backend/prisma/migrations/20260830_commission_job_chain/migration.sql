-- Migration: Add chain deduction fields to commission_jobs
-- deducts_from_job_id: FK ke job primary yang basenya berkurang (nullable, self-ref)
-- price_per_unit: harga default per helai/unit untuk PERCENTAGE helper (nullable)

ALTER TABLE "commission_jobs"
ADD COLUMN "deducts_from_job_id" TEXT REFERENCES "commission_jobs"("id") ON DELETE SET NULL,
ADD COLUMN "price_per_unit"      DECIMAL(15,2);
