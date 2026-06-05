const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const prisma          = require("../../config/prisma");
const { paginate, paginationMeta } = require("../../utils/pagination");
const {
  findMovements,
  countMovements,
  countMovementsByReference,
  findInventories,
  countInventories,
  findInvoiceForStockMovement,
  findWarehouseByBranchId,
} = require("./inventory.repository");

const D = (v) => new Prisma.Decimal(String(v));

// ── List stock movements ──────────────────────────────────────────────

const listStockMovements = async ({ page, limit, referenceType, referenceId, itemId, warehouseId, type }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (referenceType) where.referenceType = referenceType;
  if (referenceId)   where.referenceId   = referenceId;
  if (itemId)        where.itemId        = itemId;
  if (warehouseId)   where.warehouseId   = warehouseId;
  if (type)          where.type          = type;

  const [data, total] = await Promise.all([
    findMovements({ skip, take, where }),
    countMovements(where),
  ]);

  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── List inventory balances ───────────────────────────────────────────

const listInventories = async ({ page, limit, warehouseId, itemId }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (warehouseId) where.warehouseId = warehouseId;
  if (itemId)      where.itemId      = itemId;

  const [data, total] = await Promise.all([
    findInventories({ skip, take, where }),
    countInventories(where),
  ]);

  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Generate stock movements when invoice becomes PAID ────────────────

const generateStockMovement = async (invoiceId) => {
  // Fast early exit — common non-concurrent case
  const existing = await countMovementsByReference("INVOICE", invoiceId);
  if (existing > 0) return { created: 0 };

  return prisma.$transaction(async (tx) => {
    // Re-check inside tx for concurrent safety
    const existingInTx = await tx.stockMovement.count({
      where: { referenceType: "INVOICE", referenceId: invoiceId },
    });
    if (existingInTx > 0) return { created: 0 };

    const invoice = await findInvoiceForStockMovement(invoiceId);
    if (!invoice) throw new AppError("Invoice not found", StatusCodes.NOT_FOUND);

    const warehouse = await findWarehouseByBranchId(invoice.branchId);
    if (!warehouse) return { created: 0 };  // branch has no warehouse — skip silently

    let created = 0;

    for (const invoiceItem of invoice.items) {
      if (invoiceItem.item.itemType !== "INVENTORY") continue;

      // Convert invoice qty to base unit qty via ItemUnit.conversionFactor
      const itemUnit = await tx.itemUnit.findUnique({
        where:  { itemId_unitId: { itemId: invoiceItem.itemId, unitId: invoiceItem.unitId } },
        select: { conversionFactor: true },
      });
      const factor    = itemUnit?.conversionFactor ?? 1;
      const deductQty = D(invoiceItem.qty).mul(D(factor));

      // Upsert inventory row — creates with 0 balance if first movement for this item
      const inventory = await tx.inventory.upsert({
        where:  { warehouseId_itemId: { warehouseId: warehouse.id, itemId: invoiceItem.itemId } },
        create: { warehouseId: warehouse.id, itemId: invoiceItem.itemId, availableQty: 0, reservedQty: 0, minimumQty: 0 },
        update: {},
        select: { availableQty: true },
      });

      const balanceBefore = D(inventory.availableQty);
      const balanceAfter  = balanceBefore.sub(deductQty);

      // @@unique([referenceType, referenceId, invoiceItemId]) is the final DB-level guard
      await tx.stockMovement.create({
        data: {
          warehouseId:   warehouse.id,
          itemId:        invoiceItem.itemId,
          invoiceItemId: invoiceItem.id,
          type:          "OUT",
          qty:           deductQty,
          balanceBefore,
          balanceAfter,
          referenceType: "INVOICE",
          referenceId:   invoiceId,
          notes:         `Invoice sale: ${invoiceItem.item.name}`,
        },
      });

      await tx.inventory.update({
        where: { warehouseId_itemId: { warehouseId: warehouse.id, itemId: invoiceItem.itemId } },
        data:  { availableQty: balanceAfter },
      });

      created++;
    }

    return { created };
  });
};

module.exports = { listStockMovements, listInventories, generateStockMovement };
