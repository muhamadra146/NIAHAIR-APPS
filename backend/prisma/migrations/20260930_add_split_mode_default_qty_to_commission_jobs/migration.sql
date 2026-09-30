-- CreateEnum: cara bagi komisi job primary antar staf
CREATE TYPE "CommissionSplitMode" AS ENUM ('BY_QTY', 'EQUAL', 'FULL');

-- CreateEnum: qty default pengerjaan di Input Job
CREATE TYPE "CommissionDefaultQty" AS ENUM ('ITEM_QTY', 'ONE');

-- AlterTable
ALTER TABLE "commission_jobs"
  ADD COLUMN "split_mode"  "CommissionSplitMode"  NOT NULL DEFAULT 'BY_QTY',
  ADD COLUMN "default_qty" "CommissionDefaultQty" NOT NULL DEFAULT 'ITEM_QTY';

-- Data: pertahankan perilaku sebelumnya (sebelumnya diturunkan dari teks satuan)
--   satuan "helai"        → BY_QTY + ITEM_QTY (default)
--   satuan lain (kepala…) → EQUAL  + ONE
UPDATE "commission_jobs"
SET "split_mode" = 'EQUAL', "default_qty" = 'ONE'
WHERE LOWER(TRIM("unit")) <> 'helai';
