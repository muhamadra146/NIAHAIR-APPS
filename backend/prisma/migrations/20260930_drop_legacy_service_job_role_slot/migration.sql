-- Hapus sistem komisi lama: Service Job Role & Service Job Slot.
-- Digantikan sistem Kategori → Job (commission_categories / commission_jobs).
-- Lihat docs/02_BUSINESS_RULES.md COM-006 s/d COM-011.

-- Pengaman: batalkan migration jika masih ada data sistem lama (jangan hapus data diam-diam)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "service_job_roles")
     OR EXISTS (SELECT 1 FROM "service_job_slots")
     OR EXISTS (SELECT 1 FROM "treatment_job_assignments" WHERE "serviceJobSlotId" IS NOT NULL)
     OR EXISTS (SELECT 1 FROM "commissions" WHERE "serviceJobSlotId" IS NOT NULL) THEN
    RAISE EXCEPTION 'Masih ada data Service Job Role/Slot. Migrasikan atau hapus data tersebut sebelum menjalankan migration ini.';
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_serviceJobSlotId_fkey";

-- DropForeignKey
ALTER TABLE "service_job_roles" DROP CONSTRAINT "service_job_roles_itemId_fkey";

-- DropForeignKey
ALTER TABLE "service_job_slots" DROP CONSTRAINT "service_job_slots_itemId_fkey";

-- DropForeignKey
ALTER TABLE "service_job_slots" DROP CONSTRAINT "service_job_slots_roleId_fkey";

-- DropForeignKey
ALTER TABLE "treatment_job_assignments" DROP CONSTRAINT "treatment_job_assignments_serviceJobSlotId_fkey";

-- DropIndex
DROP INDEX "commissions_serviceJobSlotId_idx";

-- DropIndex
DROP INDEX "treatment_job_assignments_serviceJobSlotId_idx";

-- AlterTable
ALTER TABLE "commissions" DROP COLUMN "serviceJobSlotId";

-- AlterTable
ALTER TABLE "treatment_job_assignments" DROP COLUMN "serviceJobSlotId";

-- DropTable
DROP TABLE "service_job_roles";

-- DropTable
DROP TABLE "service_job_slots";

-- DropEnum
DROP TYPE "CommissionMode";

-- DropEnum
DROP TYPE "SlotType";

