-- Migration: Add ServiceJobRole + SlotType enum + update ServiceJobSlot
-- Tanggal: 2026-08-23

-- 1. Enum baru
CREATE TYPE "SlotType" AS ENUM ('PERCENTAGE', 'FLAT');

-- 2. Tabel baru: service_job_roles
CREATE TABLE "service_job_roles" (
  "id"             TEXT         NOT NULL,
  "itemId"         TEXT         NOT NULL,
  "roleName"       TEXT         NOT NULL,
  "commissionRate" DECIMAL(8,4) NOT NULL,
  "sortOrder"      INTEGER      NOT NULL DEFAULT 0,
  "isActive"       BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "service_job_roles_pkey"             PRIMARY KEY ("id"),
  CONSTRAINT "service_job_roles_itemId_roleName_key" UNIQUE ("itemId", "roleName"),
  CONSTRAINT "service_job_roles_itemId_fkey"      FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "service_job_roles_itemId_idx" ON "service_job_roles"("itemId");

-- 3. Kolom baru di service_job_slots
ALTER TABLE "service_job_slots"
  ADD COLUMN "roleId"    TEXT,
  ADD COLUMN "isMainJob" BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN "slotType"  "SlotType"   NOT NULL DEFAULT 'PERCENTAGE';

ALTER TABLE "service_job_slots"
  ADD CONSTRAINT "service_job_slots_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "service_job_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "service_job_slots_roleId_idx" ON "service_job_slots"("roleId");
