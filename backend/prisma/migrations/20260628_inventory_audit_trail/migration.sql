-- Migration: 20260628_inventory_audit_trail
-- Strengthens InventoryMovement as an immutable ERP audit trail:
--   • referenceType String → typed InventoryReferenceType enum
--   • totalCost dropped (computed on read: |qtyChange| × unitCost)
--   • createdSource enum added (USER / SYSTEM / SYNC / WORKER)
--   • warehouseId snapshot column added (denormalized for historical audit)
-- All existing data is migrated with sensible defaults.

-- ── Step 1: New enums ─────────────────────────────────────────────────
CREATE TYPE "InventoryReferenceType" AS ENUM (
  'INVOICE',
  'PURCHASE_RECEIPT',
  'PURCHASE_RETURN',
  'TRANSFER',
  'TREATMENT',
  'PRODUCTION',
  'STOCK_OPNAME',
  'OPENING_BALANCE',
  'MANUAL',
  'SYNC'
);

CREATE TYPE "InventoryCreatedSource" AS ENUM (
  'USER',
  'SYSTEM',
  'SYNC',
  'WORKER'
);

-- ── Step 2: Add new typed column (temp name to avoid collision) ───────
ALTER TABLE "inventory_movements"
  ADD COLUMN "refTypeNew"    "InventoryReferenceType",
  ADD COLUMN "createdSource" "InventoryCreatedSource",
  ADD COLUMN "warehouseId"   TEXT;

-- ── Step 3: Migrate referenceType String → InventoryReferenceType ─────
-- Old values in production data:
--   'SALE'       → INVOICE     (invoice sale movements)
--   'TRANSFER'   → TRANSFER    (stock transfer movements)
--   'SYNC'       → SYNC        (Accurate sync movements)
--   'SERVICE'    → TREATMENT   (material usage movements)
--   NULL / other → NULL        (no reference, e.g. opening balance)
UPDATE "inventory_movements"
  SET "refTypeNew" = CASE
    WHEN "referenceType" = 'SALE'       THEN 'INVOICE'::"InventoryReferenceType"
    WHEN "referenceType" = 'TRANSFER'   THEN 'TRANSFER'::"InventoryReferenceType"
    WHEN "referenceType" = 'SYNC'       THEN 'SYNC'::"InventoryReferenceType"
    WHEN "referenceType" = 'SERVICE'    THEN 'TREATMENT'::"InventoryReferenceType"
    WHEN "referenceType" = 'ADJUSTMENT' THEN 'MANUAL'::"InventoryReferenceType"
    WHEN "referenceType" = 'OPENING_BALANCE' THEN 'OPENING_BALANCE'::"InventoryReferenceType"
    ELSE NULL
  END;

-- ── Step 4: Populate createdSource from movement context ─────────────
-- SYNC movements → SYNC; everything else that existed → SYSTEM
-- (historical movements before this migration are system-generated)
UPDATE "inventory_movements"
  SET "createdSource" = CASE
    WHEN "movementType" = 'SYNC' THEN 'SYNC'::"InventoryCreatedSource"
    ELSE 'SYSTEM'::"InventoryCreatedSource"
  END;

-- ── Step 5: Populate warehouseId snapshot from linked Inventory ───────
UPDATE "inventory_movements" im
  SET "warehouseId" = inv."warehouseId"
FROM "inventories" inv
WHERE inv."id" = im."inventoryId";

-- ── Step 6: Drop old referenceType (String) column + its index ────────
DROP INDEX IF EXISTS "inventory_movements_refType_refId_idx";
DROP INDEX IF EXISTS "inventory_movements_referenceType_referenceId_idx";

ALTER TABLE "inventory_movements" DROP COLUMN "referenceType";

-- ── Step 7: Rename new typed column to referenceType ─────────────────
ALTER TABLE "inventory_movements" RENAME COLUMN "refTypeNew" TO "referenceType";

-- ── Step 8: Drop totalCost (computed on read, never stored) ──────────
ALTER TABLE "inventory_movements" DROP COLUMN "totalCost";

-- ── Step 9: Rebuild indexes ───────────────────────────────────────────
CREATE INDEX "inventory_movements_referenceType_referenceId_idx" ON "inventory_movements"("referenceType", "referenceId");
CREATE INDEX "inventory_movements_createdSource_idx"             ON "inventory_movements"("createdSource");
CREATE INDEX "inventory_movements_warehouseId_idx"               ON "inventory_movements"("warehouseId");
