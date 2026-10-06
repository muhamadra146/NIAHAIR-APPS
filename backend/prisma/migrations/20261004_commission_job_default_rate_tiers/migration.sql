-- Tarif bawaan per job komisi + tingkatan tarif berdasarkan jumlah staf (COM-013, COM-016).
-- Menggantikan staff_count_max (memecah tarif menjadi beberapa job).

-- Pengaman: batalkan jika masih ada job yang memakai staff_count_max
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "commission_jobs" WHERE "staff_count_max" IS NOT NULL) THEN
    RAISE EXCEPTION 'Masih ada job dengan staff_count_max. Pindahkan ke tingkatan tarif sebelum menjalankan migration ini.';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "commission_jobs" DROP COLUMN "staff_count_max",
ADD COLUMN     "default_commission_type" "CommissionType",
ADD COLUMN     "default_commission_value" DECIMAL(15,2);

-- CreateTable
CREATE TABLE "commission_job_rate_tiers" (
    "id" TEXT NOT NULL,
    "commission_job_id" TEXT NOT NULL,
    "max_staff" INTEGER,
    "value" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_job_rate_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commission_job_rate_tiers_commission_job_id_idx" ON "commission_job_rate_tiers"("commission_job_id");

-- AddForeignKey
ALTER TABLE "commission_job_rate_tiers" ADD CONSTRAINT "commission_job_rate_tiers_commission_job_id_fkey" FOREIGN KEY ("commission_job_id") REFERENCES "commission_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

