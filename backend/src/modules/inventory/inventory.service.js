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
const { validatePeriodOpen }          = require("./inventory.period.service");
const { pushAdjustmentToAccurate }    = require("./inventory.adjustment.sync.service");

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

const listInventories = async ({ page, limit, warehouseId, branchId, itemId, search, categoryId, parentCategoryId }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (warehouseId) where.warehouseId = warehouseId;
  if (branchId)    where.warehouse   = { branchId };
  if (itemId)      where.itemId      = itemId;

  if (search || categoryId || parentCategoryId) {
    where.item = {};
    if (search)           where.item.OR         = [
      { name:     { contains: search, mode: "insensitive" } },
      { itemCode: { contains: search, mode: "insensitive" } },
    ];
    if (categoryId)       where.item.categoryId = categoryId;
    if (parentCategoryId) where.item.category   = { parentId: parentCategoryId };
  }

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

    // Warehouse hanya dibutuhkan untuk INVENTORY items — resolve sekali saat pertama kali diperlukan
    let warehouse = null;
    const getWarehouse = async () => {
      if (warehouse) return warehouse;
      warehouse = await findWarehouseByBranchId(invoice.branchId);
      if (!warehouse) {
        throw new AppError(
          `Branch ${invoice.branchId} has no mapped warehouse — sync warehouses from Accurate and map via PUT /warehouses/:id/branch`,
          StatusCodes.UNPROCESSABLE_ENTITY
        );
      }
      return warehouse;
    };

    let created = 0;

    for (const invoiceItem of invoice.items) {
      if (invoiceItem.item.itemType !== "INVENTORY") continue;

      // Cek warehouse hanya saat ada INVENTORY item
      await getWarehouse();

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

  // Semua operasi dalam satu transaction agar tidak ada partial-reverse
  await prisma.$transaction(async (tx) => {
    for (const movement of movements) {
      // Idempotency: keyed on the specific SALE movement ID so the same SALE
      // is never reversed twice, even when the same item appears across multiple edits.
      const alreadyReversed = await tx.inventoryMovement.count({
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

      await tx.inventoryMovement.create({
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

      await tx.inventory.update({
        where: { id: movement.inventoryId },
        data:  { qtyOnHand: qtyAfter, qtyAvailable: newAvailable },
      });

      reversed++;
    }
  });

  return { reversed };
};

// ── Reverse all SERVICE_USAGE movements for an invoice ───────────────
//
// Called before deleteWithTransaction so materialUsageItem FKs are still intact.
// Finds all SERVICE_USAGE movements linked to treatment sessions of the invoice,
// creates RETURN movements to restore inventory, and updates balances.
// Idempotent: skips any movement already reversed.

const reverseInvoiceServiceMovements = async (invoiceId) => {
  const sessions = await prisma.treatmentSession.findMany({
    where:  { invoiceId },
    select: { id: true },
  });
  if (sessions.length === 0) return { reversed: 0 };

  const sessionIds = sessions.map((s) => s.id);

  const movements = await prisma.inventoryMovement.findMany({
    where: {
      movementType:  "SERVICE_USAGE",
      referenceType: "TREATMENT",
      referenceId:   { in: sessionIds },
    },
    include: {
      inventory: { select: { id: true, qtyOnHand: true, qtyReserved: true } },
    },
  });

  if (movements.length === 0) return { reversed: 0 };

  let reversed = 0;

  // Semua operasi dalam satu transaction agar tidak ada partial-reverse
  await prisma.$transaction(async (tx) => {
    for (const movement of movements) {
      const alreadyReversed = await tx.inventoryMovement.count({
        where: {
          movementType:  "RETURN",
          referenceType: "TREATMENT",
          referenceId:   movement.id,
        },
      });
      if (alreadyReversed > 0) continue;

      const returnQty    = D(movement.qtyChange).abs();
      const qtyBefore    = D(movement.inventory.qtyOnHand);
      const qtyAfter     = qtyBefore.add(returnQty);
      const newAvailable = computeAvailable(qtyAfter, movement.inventory.qtyReserved);

      await tx.inventoryMovement.create({
        data: {
          inventoryId:   movement.inventoryId,
          movementType:  "RETURN",
          sourceModule:  "SERVICE",
          createdSource: "SYSTEM",
          warehouseId:   movement.warehouseId,
          qtyBefore,
          qtyChange:     returnQty,
          qtyAfter,
          referenceType: "TREATMENT",
          referenceId:   movement.id,
          referenceNo:   movement.referenceNo,
          notes:         `Void invoice service usage: ${movement.referenceNo ?? ""}`,
        },
      });

      await tx.inventory.update({
        where: { id: movement.inventoryId },
        data:  { qtyOnHand: qtyAfter, qtyAvailable: newAvailable },
      });

      reversed++;
    }
  });

  return { reversed };
};

// ── Reverse a single SERVICE_USAGE movement ───────────────────────────
//
// Called when a MaterialUsageItem is deleted or its qty is changed.
// Creates a RETURN movement to restore the inventory, then unlinks
// the inventoryMovementId from the MaterialUsageItem so it can be
// re-generated with the new qty.

const reverseServiceUsageMovement = async (movementId, materialUsageItemId) => {
  const movement = await prisma.inventoryMovement.findUnique({
    where:   { id: movementId },
    include: { inventory: { select: { id: true, qtyOnHand: true, qtyReserved: true } } },
  });
  if (!movement) return;

  const returnQty    = D(movement.qtyChange).abs();
  const qtyBefore    = D(movement.inventory.qtyOnHand);
  const qtyAfter     = qtyBefore.add(returnQty);
  const newAvailable = computeAvailable(qtyAfter, movement.inventory.qtyReserved);

  await prisma.$transaction([
    prisma.inventoryMovement.create({
      data: {
        inventoryId:   movement.inventoryId,
        movementType:  "RETURN",
        sourceModule:  "SERVICE",
        createdSource: "SYSTEM",
        warehouseId:   movement.warehouseId,
        qtyBefore,
        qtyChange:     returnQty,
        qtyAfter,
        referenceType: "TREATMENT",
        referenceId:   movement.referenceId,
        referenceNo:   movement.referenceNo,
        notes:         `Reversal service usage: ${movement.notes ?? ""}`,
      },
    }),
    prisma.inventory.update({
      where: { id: movement.inventoryId },
      data:  { qtyOnHand: qtyAfter, qtyAvailable: newAvailable },
    }),
    prisma.materialUsageItem.update({
      where: { id: materialUsageItemId },
      data:  { inventoryMovementId: null },
    }),
  ]);
};

// ── Stock Adjustment (INV-013) ────────────────────────────────────────
//
// Creates an ADJUSTMENT movement: sets qtyOnHand to the physical count (qtyActual),
// computes the signed qtyChange, and updates inventory balances.
// Requires a reason (selisih stok, barang rusak, barang hilang, koreksi).
// Permission: SUPER_ADMIN and OWNER only — enforced at route level.

const createStockAdjustment = async (inventoryId, { qtyActual, reason, notes, glAccountId, createdByEmployeeId }) => {
  await validatePeriodOpen(new Date());

  const result = await prisma.$transaction(async (tx) => {
    const inventory = await tx.inventory.findUnique({
      where:  { id: inventoryId },
      select: { id: true, qtyOnHand: true, qtyReserved: true, warehouseId: true },
    });
    if (!inventory) throw new AppError("Inventory not found", StatusCodes.NOT_FOUND);

    const qtyBefore    = D(inventory.qtyOnHand);
    const qtyAfter     = D(qtyActual);
    const qtyChange    = qtyAfter.sub(qtyBefore);
    const newAvailable = computeAvailable(qtyAfter, inventory.qtyReserved);

    const movement = await tx.inventoryMovement.create({
      data: {
        inventoryId:         inventory.id,
        movementType:        "ADJUSTMENT",
        sourceModule:        "ADJUSTMENT",
        createdSource:       "USER",
        warehouseId:         inventory.warehouseId,
        qtyBefore,
        qtyChange,
        qtyAfter,
        referenceType:       "MANUAL",
        reason,
        notes:               notes ?? `Penyesuaian stok: ${reason}`,
        glAccountId:         glAccountId ?? null,
        createdByEmployeeId: createdByEmployeeId ?? null,
      },
      select: { id: true },
    });

    await tx.inventory.update({
      where: { id: inventory.id },
      data:  { qtyOnHand: qtyAfter, qtyAvailable: newAvailable },
    });

    return {
      movementId: movement.id,
      qtyBefore:  qtyBefore.toFixed(6),
      qtyChange:  qtyChange.toFixed(6),
      qtyAfter:   qtyAfter.toFixed(6),
    };
  });

  // Push ke Accurate (best-effort — jika gagal, ERP adjustment tetap tersimpan)
  let accurateSynced = false;
  let accurateError  = null;
  if (glAccountId) {
    try {
      await pushAdjustmentToAccurate(result.movementId);
      accurateSynced = true;
    } catch (err) {
      console.error("[adjustment] Accurate push failed:", err.message);
      accurateError = err.message;
    }
  }

  return { ...result, accurateSynced, accurateError };
};

// ── Batch Stock Adjustment (INV-013) ─────────────────────────────────
//
// Processes multiple inventory adjustments in a single transaction.
// Each item gets its own ADJUSTMENT movement. After the transaction,
// attempts to push each movement to Accurate (best-effort).

const createBatchStockAdjustment = async ({ glAccountId, reason, notes, items, createdByEmployeeId }) => {
  await validatePeriodOpen(new Date());

  const movementIds = await prisma.$transaction(async (tx) => {
    const ids = [];

    for (const { inventoryId, qtyActual } of items) {
      const inventory = await tx.inventory.findUnique({
        where:  { id: inventoryId },
        select: { id: true, qtyOnHand: true, qtyReserved: true, warehouseId: true },
      });
      if (!inventory) throw new AppError(`Inventory ${inventoryId} tidak ditemukan`, StatusCodes.NOT_FOUND);

      const qtyBefore    = D(inventory.qtyOnHand);
      const qtyAfter     = D(qtyActual);
      const qtyChange    = qtyAfter.sub(qtyBefore);
      const newAvailable = computeAvailable(qtyAfter, inventory.qtyReserved);

      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryId:         inventory.id,
          movementType:        "ADJUSTMENT",
          sourceModule:        "ADJUSTMENT",
          createdSource:       "USER",
          warehouseId:         inventory.warehouseId,
          qtyBefore,
          qtyChange,
          qtyAfter,
          referenceType:       "MANUAL",
          reason,
          notes:               notes ?? `Penyesuaian stok: ${reason}`,
          glAccountId:         glAccountId ?? null,
          createdByEmployeeId: createdByEmployeeId ?? null,
        },
        select: { id: true },
      });

      await tx.inventory.update({
        where: { id: inventory.id },
        data:  { qtyOnHand: qtyAfter, qtyAvailable: newAvailable },
      });

      ids.push({ movementId: movement.id, qtyBefore: qtyBefore.toFixed(6), qtyChange: qtyChange.toFixed(6), qtyAfter: qtyAfter.toFixed(6) });
    }

    return ids;
  });

  // Push ke Accurate (best-effort per movement)
  let syncedCount = 0;
  const accurateErrors = [];

  if (glAccountId) {
    for (const { movementId } of movementIds) {
      try {
        await pushAdjustmentToAccurate(movementId);
        syncedCount++;
      } catch (err) {
        console.error(`[batch adjustment] Accurate push failed movementId=${movementId}:`, err.message);
        accurateErrors.push(err.message);
      }
    }
  }

  return {
    adjustedCount:  movementIds.length,
    movements:      movementIds,
    accurateSynced: syncedCount,
    accurateErrors: accurateErrors.length > 0 ? accurateErrors : null,
  };
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

// ── GAP 2: Opening Balance ─────────────────────────────────────────────────────
//
// Membuat OPENING_BALANCE movement untuk setiap item yang belum pernah ada
// movement di warehouse tersebut. Idempotent: skip item yang sudah ada movement.
// Permission: SUPER_ADMIN + OWNER only (enforced at route level).

const createOpeningBalance = async ({ warehouseId, notes, items, createdByEmployeeId }) => {
  await validatePeriodOpen(new Date());

  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!warehouse) throw new AppError("Gudang tidak ditemukan", StatusCodes.NOT_FOUND);

  const created = [];
  const skipped = [];

  await prisma.$transaction(async (tx) => {
    for (const { itemId, qty, unitCost } of items) {
      // Upsert inventory record
      const inventory = await tx.inventory.upsert({
        where:  { warehouseId_itemId: { warehouseId, itemId } },
        create: { warehouseId, itemId, qtyOnHand: D("0"), qtyReserved: D("0"), qtyAvailable: D("0") },
        update: {},
        select: { id: true, qtyOnHand: true, qtyReserved: true },
      });

      // Idempotency: skip jika sudah ada movement OPENING_BALANCE untuk inventory ini
      const existing = await tx.inventoryMovement.count({
        where: { inventoryId: inventory.id, movementType: "OPENING_BALANCE" },
      });
      if (existing > 0) {
        skipped.push(itemId);
        continue;
      }

      const qtyBefore    = D(inventory.qtyOnHand);
      const qtyAfter     = D(String(qty));
      const qtyChange    = qtyAfter.sub(qtyBefore);
      const newAvailable = computeAvailable(qtyAfter, inventory.qtyReserved);

      await tx.inventoryMovement.create({
        data: {
          inventoryId:         inventory.id,
          movementType:        "OPENING_BALANCE",
          sourceModule:        "OPENING_BALANCE",
          createdSource:       "USER",
          warehouseId,
          qtyBefore,
          qtyChange,
          qtyAfter,
          unitCost:            unitCost ? D(String(unitCost)) : null,
          referenceType:       "OPENING_BALANCE",
          notes:               notes ?? "Saldo awal inventori",
          createdByEmployeeId: createdByEmployeeId ?? null,
        },
      });

      await tx.inventory.update({
        where: { id: inventory.id },
        data:  { qtyOnHand: qtyAfter, qtyAvailable: newAvailable },
      });

      created.push(itemId);
    }
  });

  return { created: created.length, skipped: skipped.length };
};

// ── GAP 3: Update minStock ────────────────────────────────────────────────────
const updateMinStock = async (inventoryId, minStock) => {
  const inventory = await prisma.inventory.findUnique({ where: { id: inventoryId } });
  if (!inventory) throw new AppError("Inventory tidak ditemukan", StatusCodes.NOT_FOUND);

  const updated = await prisma.inventory.update({
    where: { id: inventoryId },
    data:  { minStock: minStock !== null ? D(String(minStock)) : null },
    select: { id: true, itemId: true, warehouseId: true, minStock: true, qtyOnHand: true, qtyAvailable: true },
  });

  return updated;
};

// ── GAP 3: Low stock list ─────────────────────────────────────────────────────
// Returns inventory records where qtyOnHand < minStock (and minStock is set).
const listLowStock = async ({ branchId, warehouseId }) => {
  const where = {
    minStock: { not: null },
  };
  if (warehouseId) where.warehouseId = warehouseId;
  if (branchId)    where.warehouse   = { branchId };

  const rows = await prisma.inventory.findMany({
    where,
    select: {
      id:           true,
      qtyOnHand:    true,
      qtyAvailable: true,
      minStock:     true,
      warehouseId:  true,
      warehouse: { select: { id: true, name: true, branch: { select: { id: true, name: true, code: true } } } },
      item: {
        select: {
          id:       true,
          itemCode: true,
          name:     true,
          defaultUnit: { select: { id: true, name: true } },
          category:    { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ warehouse: { name: "asc" } }, { item: { name: "asc" } }],
  });

  // Filter: hanya yang qtyOnHand < minStock
  return rows.filter(
    (r) => r.minStock !== null && D(r.qtyOnHand).lt(D(r.minStock))
  );
};

// ── GAP 6: Inventory Valuation ────────────────────────────────────────────────
// Menghitung total nilai stok: nilai = qtyOnHand (per defaultUnit) × harga pokok per defaultUnit.
// Harga pokok diambil dari itemPrices.costPrice dibagi conversionFactor satuan beli ke satuan default.
// Contoh: costPrice = Rp 137.000/TUBE, conversionFactor TUBE = 95 GRAM → Rp 1.442,1/GRAM.
const getValuation = async ({ branchId, warehouseId }) => {
  const where = {};
  if (warehouseId) where.warehouseId = warehouseId;
  if (branchId)    where.warehouse   = { branchId };

  const rows = await prisma.inventory.findMany({
    where: { ...where, item: { itemType: "INVENTORY" } },
    select: {
      id:           true,
      qtyOnHand:    true,
      qtyAvailable: true,
      warehouseId:  true,
      warehouse: { select: { id: true, name: true, branch: { select: { id: true, name: true, code: true } } } },
      item: {
        select: {
          id:       true,
          itemCode: true,
          name:     true,
          category: { select: { id: true, name: true } },
          defaultUnit: { select: { id: true, name: true } },
          itemPrices: {
            where:   { isActive: true },
            orderBy: { effectiveDate: "desc" },
            take:    1,
            // sertakan unitId agar bisa cari conversionFactor yang sesuai
            select:  { costPrice: true, unitId: true },
          },
          // semua satuan item beserta faktor konversinya ke satuan default
          itemUnits: {
            select: { unitId: true, conversionFactor: true },
          },
        },
      },
    },
    orderBy: [{ warehouse: { name: "asc" } }, { item: { name: "asc" } }],
  });

  let totalValue = D("0");

  const data = rows.map((r) => {
    const qty        = D(r.qtyOnHand);
    const priceEntry = r.item.itemPrices[0];
    const rawCost    = priceEntry?.costPrice ? D(priceEntry.costPrice) : D("0");

    // Konversi harga ke per-satuan-default:
    // itemPrices.costPrice adalah harga per unitId (misal TUBE).
    // qtyOnHand tersimpan dalam satuan default (misal GRAM).
    // → bagi rawCost dengan conversionFactor satuan beli (misal 95)
    //   agar diperoleh harga per GRAM.
    let costPerDefaultUnit = rawCost;
    if (priceEntry?.unitId) {
      const priceUnitRow = r.item.itemUnits.find((u) => u.unitId === priceEntry.unitId);
      const factor       = priceUnitRow ? D(String(priceUnitRow.conversionFactor)) : D("1");
      if (factor.gt(D("0"))) costPerDefaultUnit = rawCost.div(factor);
    }

    const value = qty.mul(costPerDefaultUnit);
    totalValue  = totalValue.add(value);

    return {
      inventoryId:  r.id,
      warehouseId:  r.warehouseId,
      warehouseName: r.warehouse.name,
      branch:        r.warehouse.branch ?? null,
      itemId:        r.item.id,
      itemCode:      r.item.itemCode,
      itemName:      r.item.name,
      category:      r.item.category,
      unit:          r.item.defaultUnit,
      qtyOnHand:     qty.toFixed(4),
      qtyAvailable:  D(r.qtyAvailable).toFixed(4),
      costPrice:     costPerDefaultUnit.toFixed(2),
      totalValue:    value.toFixed(2),
    };
  });

  return {
    data,
    totalValue: totalValue.toFixed(2),
    itemCount:  data.length,
  };
};

module.exports = {
  listMovements,
  listInventories,
  generateSaleMovement,
  reverseInvoiceSaleMovements,
  reverseInvoiceServiceMovements,
  generateServiceMovement,
  reverseServiceUsageMovement,
  createStockAdjustment,
  createBatchStockAdjustment,
  reserveInventory,
  releaseReservation,
  createOpeningBalance,
  updateMinStock,
  listLowStock,
  getValuation,
};
