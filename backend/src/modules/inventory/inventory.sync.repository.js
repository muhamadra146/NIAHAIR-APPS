const { Prisma }  = require("@prisma/client");
const prisma      = require("../../config/prisma");

const D = (v) => new Prisma.Decimal(String(v));

// ── Read ──────────────────────────────────────────────────────────────

// Returns only warehouses that have been mapped to Accurate.
const findWarehousesForSync = () =>
  prisma.warehouse.findMany({
    where:  { isActive: true, accurateWarehouseId: { not: null } },
    select: { id: true, name: true, accurateWarehouseId: true },
  });

// Find the local Item that matches an Accurate item.
// Returns null when the item has not been synced from Accurate yet.
const findItemByAccurateId = (accurateItemId) =>
  prisma.item.findUnique({
    where:  { accurateItemId },
    select: { id: true, itemCode: true, name: true, itemType: true },
  });

const findInventoryBalance = ({ warehouseId, itemId }) =>
  prisma.inventory.findUnique({
    where:  { warehouseId_itemId: { warehouseId, itemId } },
    select: { availableQty: true },
  });

// ── Write ─────────────────────────────────────────────────────────────

// Reconciles local Inventory.availableQty against the quantity reported by Accurate.
//
// Rules:
//   diff = 0  → update lastSyncAt only (no movement created)
//   diff ≠ 0  → create ADJUSTMENT StockMovement + update Inventory in one transaction
//
// The @@unique([referenceType, referenceId, invoiceItemId]) constraint on
// StockMovement allows multiple ACCURATE_SYNC rows per warehouse (invoiceItemId=null,
// which is distinct from null in PostgreSQL unique constraints).
const syncInventoryQuantity = async ({ warehouseId, itemId, accurateQty }) => {
  const newQty  = D(String(accurateQty));

  const existing = await findInventoryBalance({ warehouseId, itemId });
  const oldQty   = existing ? D(existing.availableQty) : D("0");

  if (oldQty.equals(newQty)) {
    // No change — touch lastSyncAt to record the sync ran
    await prisma.inventory.upsert({
      where:  { warehouseId_itemId: { warehouseId, itemId } },
      create: { warehouseId, itemId, availableQty: newQty, reservedQty: 0, minimumQty: 0, lastSyncAt: new Date() },
      update: { lastSyncAt: new Date() },
    });
    return { changed: false };
  }

  // Quantities differ — create an ADJUSTMENT movement and update the balance
  await prisma.$transaction(async (tx) => {
    const diff = newQty.sub(oldQty);

    await tx.stockMovement.create({
      data: {
        warehouseId,
        itemId,
        type:          "ADJUSTMENT",
        qty:           diff.abs(),
        balanceBefore: oldQty,
        balanceAfter:  newQty,
        referenceType: "ACCURATE_SYNC",
        referenceId:   warehouseId,
        notes:         `Accurate sync: ${oldQty.toFixed(6)} → ${newQty.toFixed(6)}`,
      },
    });

    await tx.inventory.upsert({
      where:  { warehouseId_itemId: { warehouseId, itemId } },
      create: { warehouseId, itemId, availableQty: newQty, reservedQty: 0, minimumQty: 0, lastSyncAt: new Date() },
      update: { availableQty: newQty, lastSyncAt: new Date() },
    });
  });

  return { changed: true };
};

module.exports = {
  findWarehousesForSync,
  findItemByAccurateId,
  findInventoryBalance,
  syncInventoryQuantity,
};
