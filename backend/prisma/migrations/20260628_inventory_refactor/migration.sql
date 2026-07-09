-- Migration: 20260628_inventory_refactor
-- Extends inventory foundation with:
--   • qtyReserved column on inventories (qtyAvailable = qtyOnHand - qtyReserved)
--   • sourceModule, referenceNo, reason, unitCost, totalCost, createdByEmployeeId on inventory_movements
--   • Rename material_usage_items.stockMovementId → inventoryMovementId with FK to inventory_movements
-- All changes are additive — no existing data is lost.

-- ── Step 1: New enum ──────────────────────────────────────────────────
CREATE TYPE "InventorySourceModule" AS ENUM (
  'SALE',
  'SERVICE',
  'PURCHASE',
  'PRODUCTION',
  'TRANSFER',
  'ADJUSTMENT',
  'OPNAME',
  'SYNC',
  'OPENING_BALANCE'
);

-- ── Step 2: Add qtyReserved to inventories ────────────────────────────
ALTER TABLE "inventories"
  ADD COLUMN "qtyReserved" DECIMAL(18,6) NOT NULL DEFAULT 0;

-- Step 2b: qtyAvailable already equals qtyOnHand (no active reservations).
-- Recalculate to confirm consistency; this is a no-op since qtyReserved = 0.
UPDATE "inventories" SET "qtyAvailable" = "qtyOnHand" - "qtyReserved";

-- ── Step 3: Extend inventory_movements ───────────────────────────────
ALTER TABLE "inventory_movements"
  ADD COLUMN "sourceModule"         "InventorySourceModule",
  ADD COLUMN "referenceNo"          TEXT,
  ADD COLUMN "reason"               TEXT,
  ADD COLUMN "unitCost"             DECIMAL(18,6),
  ADD COLUMN "totalCost"            DECIMAL(18,2),
  ADD COLUMN "createdByEmployeeId"  TEXT;

-- ── Step 4: Populate sourceModule from existing movement data ─────────
UPDATE "inventory_movements"
  SET "sourceModule" = CASE
    WHEN "movementType" = 'SYNC'            THEN 'SYNC'::"InventorySourceModule"
    WHEN "movementType" = 'ADJUSTMENT'      THEN 'ADJUSTMENT'::"InventorySourceModule"
    WHEN "movementType" = 'OPENING_BALANCE' THEN 'OPENING_BALANCE'::"InventorySourceModule"
    WHEN "movementType" = 'PURCHASE'        THEN 'PURCHASE'::"InventorySourceModule"
    WHEN "movementType" = 'PRODUCTION'      THEN 'PRODUCTION'::"InventorySourceModule"
    WHEN "movementType" = 'SERVICE_USAGE'   THEN 'SERVICE'::"InventorySourceModule"
    WHEN "movementType" IN ('TRANSFER_IN','TRANSFER_OUT') THEN 'TRANSFER'::"InventorySourceModule"
    WHEN "movementType" IN ('SALE','RETURN')              THEN 'SALE'::"InventorySourceModule"
    ELSE 'ADJUSTMENT'::"InventorySourceModule"
  END;

-- ── Step 5: FK + indexes for new inventory_movements columns ──────────
ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_createdByEmployeeId_fkey"
  FOREIGN KEY ("createdByEmployeeId") REFERENCES "employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "inventory_movements_sourceModule_idx"           ON "inventory_movements"("sourceModule");
CREATE INDEX "inventory_movements_referenceNo_idx"            ON "inventory_movements"("referenceNo");
CREATE INDEX "inventory_movements_createdByEmployeeId_idx"    ON "inventory_movements"("createdByEmployeeId");

-- ── Step 6: Rename material_usage_items.stockMovementId ───────────────
-- The old stock_movements table was already dropped in a prior migration.
-- We rename the dangling column and wire it to inventory_movements.
ALTER TABLE "material_usage_items"
  RENAME COLUMN "stockMovementId" TO "inventoryMovementId";

ALTER TABLE "material_usage_items"
  ADD CONSTRAINT "material_usage_items_inventoryMovementId_fkey"
  FOREIGN KEY ("inventoryMovementId") REFERENCES "inventory_movements"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "material_usage_items_inventoryMovementId_idx"
  ON "material_usage_items"("inventoryMovementId");
