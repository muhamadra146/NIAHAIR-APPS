const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const prisma          = require("../../config/prisma");
const { paginate, paginationMeta } = require("../../utils/pagination");
const {
  findMovements,
  countMovements,
  findInventories,
  countInventories,
  findInvoiceForSaleMovement,
  findTreatmentSessionForServiceMovement,
  findWarehouseByBranchId,
} = require("./inventory.repository");
const { validatePeriodOpen } = require("./inventory.period.service");

const D = (v) => new Prisma.Decimal(String(v));

// ── Helper: compute qtyAvailable ──────────────────────────────────────
// Single source of truth: qtyAvailable = qtyOnHand - qtyReserved
const computeAvailable = (qtyOnHand, qtyReserved) =>
  D(qtyOnHand).sub(D(qtyReserved));

// ── Helper: append computed totalCost on each movement row ───────────
// totalCost is NOT stored — computed on read: |qtyChange| × unitCost
const appendTotalCost = (movements) =>
  movements.map((m) => ({
    ...m,
    totalCost:
      m.unitCost != null
        ? D(m.qtyChange).abs().mul(D(m.unitCost)).toFixed(2)
        : null,
  }));

// ── List inventory movements ──────────────────────────────────────────

const listMovements = async ({
  page, limit, referenceType, referenceId, referenceNo,
  itemId, warehouseId, branchId, movementType, sourceModule,
  startDate, endDate, direction,
}) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (referenceType)       where.referenceType = referenceType;
  if (referenceId)         where.referenceId   = referenceId;
  if (referenceNo)         where.referenceNo   = referenceNo;
  if (movementType)        where.movementType  = movementType;
  if (sourceModule)        where.sourceModule  = sourceModule;
  if (direction === "IN")  where.qtyChange     = { gt: 0 };
  if (direction === "OUT") where.qtyChange     = { lt: 0 };

  if (itemId || warehouseId || branchId) {
    where.inventory = {};
    if (itemId)      where.inventory.itemId      = itemId;
    if (warehouseId) where.inventory.warehouseId = warehouseId;
    if (branchId)    where.inventory.warehouse   = { branchId };
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate)   where.createdAt.lte = new Date(new Date(endDate).setUTCHours(23, 59, 59, 999));
  }

  const [raw, total] = await Promise.all([
    findMovements({ skip, take, where }),
    countMovements(where),
  ]);

  return { data: appendTotalCost(raw), meta: paginationMeta(total, pageNum, limitNum) };
};

// ── List inventory balances ───────────────────────────────────────────

const listInventories = async ({ page, limit, warehouseId, branchId, itemId, search }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (warehouseId) where.warehouseId = warehouseId;
  if (branchId)    where.warehouse   = { branchId };
  if (itemId)      where.itemId      = itemId;
  if (search)      where.item        = {
    OR: [
      { name:     { contains: search, mode: "insensitive" } },
      { itemCode: { contains: search, mode: "insensitive" } },
    ],
  };

  const [data, total] = await Promise.all([
    findInventories({ skip, take, where }),
    countInventories(where),
  ]);

  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Generate SALE movements when invoice becomes PAID ─────────────────
//
// One InventoryMovement per INVENTORY-type invoice item.
// Idempotent: per-item idempotency guard via (movementType=SALE, referenceId=invoiceItem.id).
// Negative stock is allowed (net-stock model) — Accurate is the authoritative source.
// qtyAvailable = qtyOnHand - qtyReserved (consistent on every write).

const generateSaleMovement = async (invoiceId, createdBy) => {
  await validatePeriodOpen(new Date());

  return prisma.$transaction(async (tx) => {
    const invoice = await findInvoiceForSaleMovement(invoiceId);
    if (!invoice) throw new AppError("Invoice not found", StatusCodes.NOT_FOUND);

    const warehouse = await findWarehouseByBranchId(invoice.branchId);
    if (!warehouse) {
      throw new AppError(
        `Branch ${invoice.branchId} has no mapped warehouse — sync warehouses from Accurate and map via PUT /warehouses/:id/branch`,
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    let created = 0;

    for (const invoiceItem of invoice.items) {
      if (invoiceItem.item.itemType !== "INVENTORY") continue;

      const alreadyMoved = await tx.inventoryMovement.count({
        where: { movementType: "SALE", referenceType: "INVOICE", referenceId: invoiceItem.id },
      });
      if (alreadyMoved > 0) continue;

      const itemUnit = await tx.itemUnit.findUnique({
        where:  { itemId_unitId: { itemId: invoiceItem.itemId, unitId: invoiceItem.unitId } },
        select: { conversionFactor: true },
      });
      const factor    = itemUnit?.conversionFactor ?? 1;
      const deductQty = D(invoiceItem.qty).mul(D(factor));

      const itemPrice = await tx.itemPrice.findFirst({
        where:   { itemId: invoiceItem.itemId, unitId: invoiceItem.unitId, isActive: true },
        orderBy: { effectiveDate: "desc" },
        select:  { costPrice: true },
      });
      const unitCost = D(itemPrice?.costPrice ?? invoiceItem.price);

      const inventory = await tx.inventory.upsert({
        where:  { warehouseId_itemId: { warehouseId: warehouse.id, itemId: invoiceItem.itemId } },
        create: {
          warehouseId: warehouse.id,
          itemId:      invoiceItem.itemId,
          qtyOnHand:    D("0"),
          qtyReserved:  D("0"),
          qtyAvailable: D("0"),
        },
        update: {},
        select: { id: true, qtyOnHand: true, qtyReserved: true },
      });

      const qtyBefore    = D(inventory.qtyOnHand);
      const qtyChange    = deductQty.negated();
      const qtyAfter     = qtyBefore.plus(qtyChange);
      const newAvailable = computeAvailable(qtyAfter, inventory.qtyReserved);

      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryId:         inventory.id,
          movementType:        "SALE",
          sourceModule:        "SALE",
          createdSource:       "SYSTEM",
          warehouseId:         warehouse.id,
          qtyBefore,
          qtyChange,
          qtyAfter,
          unitCost,
          referenceType:       "INVOICE",
          referenceId:         invoiceItem.id,
          referenceNo:         invoice.invoiceNo,
          notes:               `Invoice sale: ${invoiceItem.item.name}`,
          createdBy:           createdBy ?? null,
          createdByEmployeeId: invoice.createdByEmployeeId ?? null,
        },
        select: { id: true },
      });

      await tx.inventory.update({
        where: { id: inventory.id },
        data:  { qtyOnHand: qtyAfter, qtyAvailable: newAvailable },
      });

      created++;
    }

    return { created };
  });
};

// ── Generate SERVICE_USAGE movements from MaterialUsage ───────────────
//
// Called when material usage is recorded for a treatment session.
// One InventoryMovement per MaterialUsageItem where item.itemType === INVENTORY.
// Idempotent: skip if materialUsageItem already has an inventoryMovementId.
// referenceId = treatmentSessionId, referenceNo = invoice.invoiceNo.

const generateServiceMovement = async (treatmentSessionId, createdByEmployeeId) => {
  await validatePeriodOpen(new Date());

  return prisma.$transaction(async (tx) => {
    const session = await findTreatmentSessionForServiceMovement(treatmentSessionId);
    if (!session) throw new AppError("Treatment session not found", StatusCodes.NOT_FOUND);

    const warehouse = await findWarehouseByBranchId(session.branchId);
    if (!warehouse) {
      throw new AppError(
        `Branch ${session.branchId} has no mapped warehouse`,
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    const referenceNo = session.invoice?.invoiceNo ?? null;
    let created = 0;

    for (const treatmentItem of session.treatmentItems) {
      for (const materialUsage of treatmentItem.materialUsages) {
        for (const usageItem of materialUsage.usageItems) {
          if (usageItem.materialItem.itemType !== "INVENTORY") continue;
          if (usageItem.inventoryMovementId) continue; // already linked

          const itemUnit = await tx.itemUnit.findUnique({
            where:  { itemId_unitId: { itemId: usageItem.materialItemId, unitId: usageItem.unitId } },
            select: { conversionFactor: true },
          });
          const factor    = itemUnit?.conversionFactor ?? 1;
          const deductQty = D(usageItem.qty).mul(D(factor));

          const inventory = await tx.inventory.upsert({
            where:  { warehouseId_itemId: { warehouseId: warehouse.id, itemId: usageItem.materialItemId } },
            create: {
              warehouseId: warehouse.id,
              itemId:      usageItem.materialItemId,
              qtyOnHand:    D("0"),
              qtyReserved:  D("0"),
              qtyAvailable: D("0"),
            },
            update: {},
            select: { id: true, qtyOnHand: true, qtyReserved: true },
          });

          const qtyBefore    = D(inventory.qtyOnHand);
          const qtyChange    = deductQty.negated();
          const qtyAfter     = qtyBefore.plus(qtyChange);
          const newAvailable = computeAvailable(qtyAfter, inventory.qtyReserved);

          const movement = await tx.inventoryMovement.create({
            data: {
              inventoryId:         inventory.id,
              movementType:        "SERVICE_USAGE",
              sourceModule:        "SERVICE",
              createdSource:       "USER",
              warehouseId:         warehouse.id,
              qtyBefore,
              qtyChange,
              qtyAfter,
              referenceType:       "TREATMENT",
              referenceId:         treatmentSessionId,
              referenceNo,
              notes:               `Service usage: ${usageItem.materialItem.name}`,
              createdByEmployeeId: createdByEmployeeId ?? null,
            },
            select: { id: true },
          });

          await tx.inventory.update({
            where: { id: inventory.id },
            data:  { qtyOnHand: qtyAfter, qtyAvailable: newAvailable },
          });

          // Link materialUsageItem → inventoryMovement
          await tx.materialUsageItem.update({
            where: { id: usageItem.id },
            data:  { inventoryMovementId: movement.id },
          });

          created++;
        }
      }
    }

    return { created };
  });
};

// ── Reverse SALE movements when invoice is voided/deleted ────────────
//
// Finds all SALE movements linked to the invoiceNo and creates a RETURN
// movement for each one, restoring qtyOnHand and qtyAvailable.
// Idempotent: skips any inventoryId that already has a RETURN for this invoiceNo.
// Called BEFORE deleteWithTransaction so invoiceItem FKs are still intact.

const reverseInvoiceSaleMovements = async (invoiceNo) => {
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      movementType:  "SALE",
      referenceType: "INVOICE",
      referenceNo:   invoiceNo,
    },
    include: {
      inventory: { select: { id: true, qtyOnHand: true, qtyReserved: true } },
    },
  });

  if (movements.length === 0) return { reversed: 0 };

  let reversed = 0;

  for (const movement of movements) {
    // Idempotency: keyed on the specific SALE movement ID so the same SALE
    // is never reversed twice, even when the same item appears across multiple edits.
    const alreadyReversed = await prisma.inventoryMovement.count({
      where: {
        movementType:  "RETURN",
        referenceType: "INVOICE",
        referenceNo:   invoiceNo,
        referenceId:   movement.id,
      },
    });
    if (alreadyReversed > 0) continue;

    const returnQty    = D(movement.qtyChange).abs();
    const qtyBefore    = D(movement.inventory.qtyOnHand);
    const qtyAfter     = qtyBefore.add(returnQty);
    const newAvailable = computeAvailable(qtyAfter, movement.inventory.qtyReserved);

    await prisma.inventoryMovement.create({
      data: {
        inventoryId:   movement.inventoryId,
        movementType:  "RETURN",
        sourceModule:  "SALE",
        createdSource: "SYSTEM",
        warehouseId:   movement.warehouseId,
        qtyBefore,
        qtyChange:     returnQty,
        qtyAfter,
        unitCost:      movement.unitCost ?? null,
        referenceType: "INVOICE",
        referenceId:   movement.id,
        referenceNo:   invoiceNo,
        notes:         `Void invoice: ${invoiceNo}`,
      },
    });

    await prisma.inventory.update({
      where: { id: movement.inventoryId },
      data:  { qtyOnHand: qtyAfter, qtyAvailable: newAvailable },
    });

    reversed++;
  }

  return { reversed };
};

// ── Reservation helpers (future use) ──────────────────────────────────
//
// These functions prepare the backend for booking-driven reservations.
// They are NOT called from any flow yet — they will be wired to the
// Booking / Appointment module when that feature is built.
//
// Flow:
//   Booking created → reserveInventory() → qtyReserved ↑, qtyAvailable ↓
//   Invoice PAID   → releaseReservation() → qtyReserved ↓ (sale already deducted qtyOnHand)
//   Booking cancel → releaseReservation() → qtyReserved ↓, qtyAvailable ↑

const reserveInventory = async (inventoryId, qty, referenceId, createdByEmployeeId, tx) => {
  const client = tx ?? prisma;
  const inv    = await client.inventory.findUnique({
    where:  { id: inventoryId },
    select: { qtyOnHand: true, qtyReserved: true },
  });
  if (!inv) throw new AppError(`Inventory ${inventoryId} not found`, StatusCodes.NOT_FOUND);

  const reserveQty   = D(qty);
  const newReserved  = D(inv.qtyReserved).plus(reserveQty);
  const newAvailable = computeAvailable(inv.qtyOnHand, newReserved);

  await client.inventory.update({
    where: { id: inventoryId },
    data:  { qtyReserved: newReserved, qtyAvailable: newAvailable },
  });

  return { inventoryId, qtyReserved: newReserved, qtyAvailable: newAvailable };
};

const releaseReservation = async (inventoryId, qty, tx) => {
  const client = tx ?? prisma;
  const inv    = await client.inventory.findUnique({
    where:  { id: inventoryId },
    select: { qtyOnHand: true, qtyReserved: true },
  });
  if (!inv) throw new AppError(`Inventory ${inventoryId} not found`, StatusCodes.NOT_FOUND);

  const releaseQty   = D(qty);
  const newReserved  = Prisma.Decimal.max(D("0"), D(inv.qtyReserved).sub(releaseQty));
  const newAvailable = computeAvailable(inv.qtyOnHand, newReserved);

  await client.inventory.update({
    where: { id: inventoryId },
    data:  { qtyReserved: newReserved, qtyAvailable: newAvailable },
  });

  return { inventoryId, qtyReserved: newReserved, qtyAvailable: newAvailable };
};

module.exports = {
  listMovements,
  listInventories,
  generateSaleMovement,
  reverseInvoiceSaleMovements,
  generateServiceMovement,
  reserveInventory,
  releaseReservation,
};
