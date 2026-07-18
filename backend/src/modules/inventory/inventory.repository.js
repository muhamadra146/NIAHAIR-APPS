const prisma = require("../../config/prisma");

const MOVEMENT_INCLUDE = {
  inventory: {
    select: {
      id:        true,
      item:      { select: { id: true, name: true, itemCode: true, itemType: true } },
      warehouse: { select: { id: true, name: true } },
    },
  },
  createdByEmployee: { select: { id: true, name: true, employeeCode: true } },
};

const INVENTORY_INCLUDE = {
  item: {
    select: {
      id: true, name: true, itemCode: true, itemType: true,
      category: { select: { id: true, name: true } },
    },
  },
  warehouse: { select: { id: true, name: true } },
};

// ── Inventory movements ────────────────────────────────────────────────

const findMovements = ({ skip, take, where }) =>
  prisma.inventoryMovement.findMany({
    skip, take, where,
    orderBy: { createdAt: "desc" },
    include: MOVEMENT_INCLUDE,
  });

const countMovements = (where) => prisma.inventoryMovement.count({ where });

// ── Inventory balances ─────────────────────────────────────────────────

const findInventories = ({ skip, take, where }) =>
  prisma.inventory.findMany({
    skip, take, where,
    orderBy: { updatedAt: "desc" },
    include: INVENTORY_INCLUDE,
  });

const countInventories = (where) => prisma.inventory.count({ where });

// ── Invoice fetch for sale movement generation ─────────────────────────

const findInvoiceForSaleMovement = (invoiceId) =>
  prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id:        true,
      branchId:  true,
      invoiceNo: true,
      createdByEmployeeId: true,
      items: {
        select: {
          id:     true,
          itemId: true,
          unitId: true,
          qty:    true,
          price:  true,
          item:   { select: { id: true, name: true, itemType: true } },
        },
      },
    },
  });

// ── Treatment session fetch for service-usage movement generation ──────

const findTreatmentSessionForServiceMovement = (treatmentSessionId) =>
  prisma.treatmentSession.findUnique({
    where: { id: treatmentSessionId },
    select: {
      id:      true,
      branchId: true,
      invoice: { select: { id: true, invoiceNo: true } },
      treatmentItems: {
        select: {
          id: true,
          materialUsages: {
            select: {
              id: true,
              usageItems: {
                select: {
                  id:                 true,
                  materialItemId:     true,
                  unitId:             true,
                  qty:                true,
                  inventoryMovementId: true,
                  materialItem: { select: { id: true, name: true, itemType: true } },
                  unit:         { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

// ── Warehouse lookup ───────────────────────────────────────────────────

const findWarehouseByBranchId = (branchId) =>
  prisma.warehouse.findFirst({
    where:  { branchId, isActive: true },
    select: { id: true, branchId: true, accurateWarehouseId: true },
  });

module.exports = {
  findMovements,
  countMovements,
  findInventories,
  countInventories,
  findInvoiceForSaleMovement,
  findTreatmentSessionForServiceMovement,
  findWarehouseByBranchId,
};
