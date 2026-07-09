-- Migration: 20260628_inventory_foundation
-- Refactors inventory domain:
--   • Inventory.availableQty/reservedQty/minimumQty → qtyOnHand + qtyAvailable
--   • StockMovement table → InventoryMovement (FK to inventoryId, richer movementType enum)
--   • Migrates existing stock_movements data before dropping old table

-- ── Step 1: New enum ──────────────────────────────────────────────────
CREATE TYPE "InventoryMovementType" AS ENUM (
  'PURCHASE',
  'SALE',
  'SERVICE_USAGE',
  'PRODUCTION',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'ADJUSTMENT',
  'OPENING_BALANCE',
  'RETURN',
  'SYNC'
);

-- ── Step 2: Add new qty columns to inventories ────────────────────────
ALTER TABLE "inventories"
  ADD COLUMN "qtyOnHand"    DECIMAL(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN "qtyAvailable" DECIMAL(18,6) NOT NULL DEFAULT 0;

-- ── Step 3: Seed from existing availableQty ───────────────────────────
UPDATE "inventories"
  SET "qtyOnHand" = "availableQty", "qtyAvailable" = "availableQty";

-- ── Step 4: Create inventory_movements table ──────────────────────────
CREATE TABLE "inventory_movements" (
  "id"            TEXT          NOT NULL,
  "inventoryId"   TEXT          NOT NULL,
  "movementType"  "InventoryMovementType" NOT NULL,
  "qtyBefore"     DECIMAL(18,6) NOT NULL,
  "qtyChange"     DECIMAL(18,6) NOT NULL,
  "qtyAfter"      DECIMAL(18,6) NOT NULL,
  "referenceType" TEXT,
  "referenceId"   TEXT,
  "notes"         TEXT,
  "createdBy"     TEXT,
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- ── Step 5: Migrate existing stock_movements ──────────────────────────
INSERT INTO "inventory_movements" (
  "id", "inventoryId", "movementType",
  "qtyBefore", "qtyChange", "qtyAfter",
  "referenceType", "referenceId", "notes", "createdAt"
)
SELECT
  sm."id",
  inv."id",
  CASE
    WHEN sm."referenceType" = 'ACCURATE_SYNC' THEN 'SYNC'::"InventoryMovementType"
    WHEN sm."type" = 'IN'            THEN 'OPENING_BALANCE'::"InventoryMovementType"
    WHEN sm."type" = 'OUT'           THEN 'SALE'::"InventoryMovementType"
    WHEN sm."type" = 'TRANSFER_IN'   THEN 'TRANSFER_IN'::"InventoryMovementType"
    WHEN sm."type" = 'TRANSFER_OUT'  THEN 'TRANSFER_OUT'::"InventoryMovementType"
    ELSE 'ADJUSTMENT'::"InventoryMovementType"
  END,
  sm."balanceBefore",
  sm."qty",
  sm."balanceAfter",
  CASE
    WHEN sm."referenceType" = 'ACCURATE_SYNC'   THEN 'SYNC'
    WHEN sm."referenceType" = 'INVOICE'          THEN 'SALE'
    WHEN sm."referenceType" = 'STOCK_TRANSFER'   THEN 'TRANSFER'
    ELSE sm."referenceType"
  END,
  COALESCE(sm."invoiceItemId"::TEXT, sm."referenceId"),
  sm."notes",
  sm."createdAt"
FROM "stock_movements" sm
INNER JOIN "inventories" inv
  ON inv."warehouseId" = sm."warehouseId"
  AND inv."itemId"     = sm."itemId";

-- ── Step 6: FK + indexes on inventory_movements ───────────────────────
ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_inventoryId_fkey"
  FOREIGN KEY ("inventoryId") REFERENCES "inventories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "inventory_movements_inventoryId_idx"   ON "inventory_movements"("inventoryId");
CREATE INDEX "inventory_movements_refType_refId_idx" ON "inventory_movements"("referenceType", "referenceId");
CREATE INDEX "inventory_movements_movementType_idx"  ON "inventory_movements"("movementType");
CREATE INDEX "inventory_movements_createdAt_idx"     ON "inventory_movements"("createdAt");

-- ── Step 7: Drop old columns from inventories ─────────────────────────
ALTER TABLE "inventories"
  DROP COLUMN "availableQty",
  DROP COLUMN "reservedQty",
  DROP COLUMN "minimumQty";

-- ── Step 8: Drop stock_movements table ───────────────────────────────
DROP TABLE "stock_movements";

-- ── Step 9: Drop old enum ─────────────────────────────────────────────
DROP TYPE "StockMovementType";
