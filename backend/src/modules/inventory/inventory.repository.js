const prisma = require("../../config/prisma");

const MOVEMENT_INCLUDE = {
  item:      { select: { id: true, name: true, itemCode: true, itemType: true } },
  warehouse: { select: { id: true, name: true } },
};

const INVENTORY_INCLUDE = {
  item:      { select: { id: true, name: true, itemCode: true, itemType: true } },
  warehouse: { select: { id: true, name: true } },
};

// ── Stock movements ───────────────────────────────────────────────────

const findMovements = ({ skip, take, where }) =>
  prisma.stockMovement.findMany({
    skip,
    take,
    where,
    orderBy: { createdAt: "desc" },
    include: MOVEMENT_INCLUDE,
  });

const countMovements = (where) => prisma.stockMovement.count({ where });

// Used for idempotency pre-check (outside tx)
const countMovementsByReference = (referenceType, referenceId) =>
  prisma.stockMovement.count({ where: { referenceType, referenceId } });

// ── Inventory balances ────────────────────────────────────────────────

const findInventories = ({ skip, take, where }) =>
  prisma.inventory.findMany({
    skip,
    take,
    where,
    orderBy: { updatedAt: "desc" },
    include: INVENTORY_INCLUDE,
  });

const countInventories = (where) => prisma.inventory.count({ where });

// ── Invoice fetch for stock generation ───────────────────────────────

const findInvoiceForStockMovement = (invoiceId) =>
  prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id:       true,
      branchId: true,
      items: {
        select: {
          id:     true,
          itemId: true,
          unitId: true,
          qty:    true,
          item:   { select: { id: true, name: true, itemType: true } },
        },
      },
    },
  });

// One warehouse per branch (branchId @unique on Warehouse)
const findWarehouseByBranchId = (branchId) =>
  prisma.warehouse.findFirst({
    where:  { branchId, isActive: true },
    select: { id: true, branchId: true, accurateWarehouseId: true },
  });

module.exports = {
  findMovements,
  countMovements,
  countMovementsByReference,
  findInventories,
  countInventories,
  findInvoiceForStockMovement,
  findWarehouseByBranchId,
};
