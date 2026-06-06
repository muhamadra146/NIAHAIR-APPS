-- Phase 10F: Customer sync lifecycle tracking

-- CreateEnum
CREATE TYPE "CustomerSyncSource" AS ENUM ('LOCAL', 'ACCURATE');

-- CreateEnum
CREATE TYPE "CustomerSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- AlterTable
ALTER TABLE "customers"
  ADD COLUMN "lastSyncAttemptAt" TIMESTAMP(3),
  ADD COLUMN "syncError"         TEXT,
  ADD COLUMN "syncSource"        "CustomerSyncSource" NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN "syncStatus"        "CustomerSyncStatus" NOT NULL DEFAULT 'PENDING';

-- Back-fill: customers that already have an accurateCustomerId were synced successfully
-- before this migration.  Mark them SYNCED so dashboards start accurate.
UPDATE "customers"
SET "syncStatus" = 'SYNCED'
WHERE "accurateCustomerId" IS NOT NULL;
