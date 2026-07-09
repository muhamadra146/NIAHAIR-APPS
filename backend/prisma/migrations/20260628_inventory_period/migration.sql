-- Migration: 20260628_inventory_period
-- Adds Inventory Closing foundation:
--   • InventoryPeriodStatus enum (OPEN / CLOSED)
--   • inventory_periods table — one row per calendar month
--   • isLocked column on inventory_movements — set true when period is closed

-- ── Step 1: New enum ──────────────────────────────────────────────────
CREATE TYPE "InventoryPeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- ── Step 2: inventory_periods table ──────────────────────────────────
CREATE TABLE "inventory_periods" (
  "id"                  TEXT        NOT NULL,
  "year"                INTEGER     NOT NULL,
  "month"               INTEGER     NOT NULL,
  "status"              "InventoryPeriodStatus" NOT NULL DEFAULT 'OPEN',
  "closedAt"            TIMESTAMP(3),
  "closedByEmployeeId"  TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,

  CONSTRAINT "inventory_periods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_periods_year_month_key" ON "inventory_periods"("year", "month");
CREATE INDEX "inventory_periods_status_idx"             ON "inventory_periods"("status");

ALTER TABLE "inventory_periods"
  ADD CONSTRAINT "inventory_periods_closedByEmployeeId_fkey"
  FOREIGN KEY ("closedByEmployeeId") REFERENCES "employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Step 3: isLocked on inventory_movements ───────────────────────────
ALTER TABLE "inventory_movements"
  ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX "inventory_movements_isLocked_idx" ON "inventory_movements"("isLocked");
