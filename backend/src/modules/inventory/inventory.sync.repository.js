const { Prisma } = require("@prisma/client");
const prisma     = require("../../config/prisma");
const { validatePeriodOpen } = require("./inventory.period.service");

const D = (v) => new Prisma.Decimal(String(v));

// ── Read ──────────────────────────────────────────────────────────────

const findWarehousesForSync = () =>
  prisma.warehouse.findMany({
    where:  { isActive: true, accurateWarehouseId: { not: null } },
    select: { id: true, name: true, accurateWarehouseId: true },
  });

const findItemByAccurateId = (accurateItemId) =>
  prisma.item.findUnique({
    where:  { accurateItemId },
    select: { id: true, itemCode: true, name: true, itemType: true },
  });

const findInventoryBalance = ({ warehouseId, itemId }) =>
  prisma.inventory.findUnique({
    where:  { warehouseId_itemId: { warehouseId, itemId } },
    select: { id: true, qtyOnHand: true, qtyReserved: true, qtyAvailable: true },
  });

// ── Write ─────────────────────────────────────────────────────────────

// Reconciles local Inventory against the quantity reported by Accurate.
//   diff = 0  → update lastSyncAt only (no movement created)
//   diff ≠ 0  → create SYNC movement + update Inventory in one transaction
//
// qtyReserved is preserved on sync updates — Accurate sets qtyOnHand,
// but reservations are managed locally.
// qtyAvailable = qtyOnHand - qtyReserved (enforced here)
const syncInventoryQuantity = async ({ warehouseId, itemId, accurateQty }) => {
  await validatePeriodOpen(new Date());

  const newQty = D(String(accurateQty));

  const existing = await findInventoryBalance({ warehouseId, itemId });
  const oldQty   = existing ? D(existing.qtyOnHand)    : D("0");
  const reserved = existing ? D(existing.qtyReserved)  : D("0");

  const newAvailable = newQty.sub(reserved);

  if (oldQty.equals(newQty)) {
    await prisma.inventory.upsert({
      where:  { warehouseId_itemId: { warehouseId, itemId } },
      create: {
        warehouseId, itemId,
        qtyOnHand:    newQty,
        qtyReserved:  D("0"),
        qtyAvailable: newQty,
        lastSyncAt:   new Date(),
      },
      update: { lastSyncAt: new Date() },
    });
    return { changed: false };
  }

  await prisma.$transaction(async (tx) => {
    const qtyChange = newQty.sub(oldQty);

    const inventory = await tx.inventory.upsert({
      where:  { warehouseId_itemId: { warehouseId, itemId } },
      create: {
        warehouseId, itemId,
        qtyOnHand:    newQty,
        qtyReserved:  D("0"),
        qtyAvailable: newQty,
        lastSyncAt:   new Date(),
      },
      update: {
        qtyOnHand:    newQty,
        qtyAvailable: newAvailable,
        lastSyncAt:   new Date(),
      },
      select: { id: true },
    });

    await tx.inventoryMovement.create({
      data: {
        inventoryId:   inventory.id,
        movementType:  "SYNC",
        sourceModule:  "SYNC",
        createdSource: "SYNC",
        warehouseId,
        qtyBefore:     oldQty,
        qtyChange,
        qtyAfter:      newQty,
        referenceType: "SYNC",
        referenceId:   warehouseId,
        referenceNo:   `SYNC-${warehouseId}`,
        notes:         `Accurate sync: ${oldQty.toFixed(6)} → ${newQty.toFixed(6)}`,
      },
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
