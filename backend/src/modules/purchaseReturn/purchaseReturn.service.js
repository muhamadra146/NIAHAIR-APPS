'use strict';

const logger = require('../../utils/logger');
const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const prisma          = require("../../config/prisma");
const repo            = require("./purchaseReturn.repository");
const { pushPurchaseReturnToAccurate } = require("./purchaseReturn.accurate.sync.service");
const { validatePeriodOpen } = require("../inventory/inventory.period.service");

const D = (v) => new Prisma.Decimal(String(v));

// ── Auto-number: PR-YYYYMMDD-XXXX ────────────────────────────────────────────
const buildReturnNo = async () => {
  const now    = new Date(Date.now() + 7 * 3600 * 1000);
  const yyyy   = now.getUTCFullYear();
  const mm     = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd     = String(now.getUTCDate()).padStart(2, "0");
  const prefix = `PR-${yyyy}${mm}${dd}-`;

  const last = await prisma.purchaseReturn.findFirst({
    where:   { returnNo: { startsWith: prefix } },
    orderBy: { returnNo: "desc" },
    select:  { returnNo: true },
  });
  const seq = last ? parseInt(last.returnNo.slice(prefix.length), 10) : 0;
  return `${prefix}${String(seq + 1).padStart(4, "0")}`;
};

// ── List ──────────────────────────────────────────────────────────────────────
const listPurchaseReturns = async (query) => {
  const { page = 1, limit = 20, purchaseInvoiceId, status } = query;
  return repo.findAll({ purchaseInvoiceId, status, page: Number(page), limit: Number(limit) });
};

// ── Get one ───────────────────────────────────────────────────────────────────
const getPurchaseReturn = async (id) => {
  const ret = await repo.findById(id);
  if (!ret) throw new AppError("Retur pembelian tidak ditemukan", StatusCodes.NOT_FOUND);
  return ret;
};

// ── Create ────────────────────────────────────────────────────────────────────
const createPurchaseReturn = async (body, createdByEmployeeId) => {
  const { purchaseInvoiceId, returnDate, notes, items } = body;

  // Validasi: parent invoice harus ada dan POSTED
  const invoice = await prisma.purchaseInvoice.findUnique({
    where:   { id: purchaseInvoiceId },
    include: {
      warehouse: { select: { id: true } },
      items:     { select: { itemId: true, qty: true, unitId: true } },
    },
  });
  if (!invoice) throw new AppError("Faktur pembelian tidak ditemukan", StatusCodes.NOT_FOUND);
  if (invoice.status !== "POSTED") {
    throw new AppError(
      "Retur hanya bisa dibuat dari faktur yang sudah POSTED",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  await validatePeriodOpen(returnDate);

  const returnNo = await buildReturnNo();

  // Hitung subtotal dan grandTotal dari items
  let subtotal   = D(0);
  const mappedItems = items.map((item) => {
    const lineSubtotal = D(item.qty).mul(D(item.price));
    subtotal = subtotal.add(lineSubtotal);
    return {
      itemId:   item.itemId,
      unitId:   item.unitId,
      qty:      D(item.qty),
      price:    D(item.price),
      discount: D(item.discount ?? 0),
      subtotal: lineSubtotal,
      notes:    item.notes || undefined,
    };
  });
  const grandTotal = subtotal;

  const ret = await prisma.$transaction(async (tx) => {
    const created = await tx.purchaseReturn.create({
      data: {
        purchaseInvoiceId,
        returnNo,
        returnDate:          new Date(returnDate),
        notes:               notes || undefined,
        status:              "DRAFT",
        subtotal,
        grandTotal,
        createdByEmployeeId: createdByEmployeeId || undefined,
        items: { create: mappedItems },
      },
      include: {
        purchaseInvoice: { select: { id: true, invoiceNo: true } },
        createdBy:       { select: { id: true, name: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, sku: true } },
            unit: { select: { id: true, name: true } },
          },
        },
      },
    });
    return created;
  });

  return ret;
};

// ── Post (DRAFT → POSTED + inventory movements) ───────────────────────────────
const postPurchaseReturn = async (id, employeeId) => {
  const ret = await repo.findById(id);
  if (!ret) throw new AppError("Retur pembelian tidak ditemukan", StatusCodes.NOT_FOUND);
  if (ret.status !== "DRAFT") {
    throw new AppError("Hanya retur DRAFT yang dapat di-posting", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const invoice = await prisma.purchaseInvoice.findUnique({
    where:  { id: ret.purchaseInvoiceId },
    select: { warehouseId: true },
  });

  await validatePeriodOpen(ret.returnDate);

  await prisma.$transaction(async (tx) => {
    for (const item of ret.items) {
      if (!item.item || item.item.itemType !== "INVENTORY") continue;

      const warehouseId = invoice.warehouseId;
      let inventory = await tx.inventory.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId: item.itemId } },
      });
      if (!inventory) continue; // tidak mungkin retur barang yang belum ada di stok

      const qtyBefore = D(inventory.qtyOnHand);
      const qtyChange = D(item.qty).negated(); // retur = keluar dari gudang
      const qtyAfter  = qtyBefore.add(qtyChange);

      // Stok tidak boleh negatif setelah retur
      if (qtyAfter.lt(D(0))) {
        throw new AppError(
          `Stok ${item.item.name} tidak cukup untuk diretur. ` +
          `Stok saat ini: ${Number(qtyBefore).toLocaleString("id-ID")}, ` +
          `qty retur: ${Number(item.qty).toLocaleString("id-ID")}`,
          StatusCodes.UNPROCESSABLE_ENTITY
        );
      }

      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryId:         inventory.id,
          movementType:        "PURCHASE_RETURN",
          qtyBefore,
          qtyChange,
          qtyAfter,
          referenceType:       "PURCHASE_RETURN",
          referenceId:         id,
          referenceNo:         ret.returnNo,
          notes:               ret.notes || undefined,
          sourceModule:        "PURCHASE",
          createdSource:       "USER",
          warehouseId,
          unitCost:            D(item.price),
          createdByEmployeeId: employeeId || undefined,
        },
      });

      // Link movement ke item
      await tx.purchaseReturnItem.update({
        where: { id: item.id },
        data:  { inventoryMovementId: movement.id },
      });

      await tx.inventory.update({
        where: { id: inventory.id },
        data:  {
          qtyOnHand:    qtyAfter,
          qtyAvailable: qtyAfter.sub(D(inventory.qtyReserved)),
        },
      });
    }

    await tx.purchaseReturn.update({ where: { id }, data: { status: "POSTED" } });
  });

  // Enqueue Accurate sync (non-blocking)
  pushPurchaseReturnToAccurate(id).catch((err) => {
    logger.error(`[return sync] failed returnId=${id}:`, err.message);
  });

  return repo.findById(id);
};

// ── Cancel (DRAFT only) ───────────────────────────────────────────────────────
const cancelPurchaseReturn = async (id) => {
  const ret = await repo.findById(id);
  if (!ret) throw new AppError("Retur pembelian tidak ditemukan", StatusCodes.NOT_FOUND);
  if (ret.status !== "DRAFT") {
    throw new AppError(
      "Hanya retur DRAFT yang dapat dibatalkan. Retur POSTED tidak bisa dibatalkan.",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }
  return repo.updateStatus(id, "CANCELLED");
};

// ── Delete (DRAFT only) ───────────────────────────────────────────────────────
const deletePurchaseReturn = async (id) => {
  const ret = await repo.findById(id);
  if (!ret) throw new AppError("Retur pembelian tidak ditemukan", StatusCodes.NOT_FOUND);
  if (ret.status !== "DRAFT") {
    throw new AppError("Hanya retur DRAFT yang dapat dihapus", StatusCodes.UNPROCESSABLE_ENTITY);
  }
  return repo.remove(id);
};

// ── Sync to Accurate (manual trigger) ────────────────────────────────────────
const syncReturnToAccurate = async (id) => {
  const ret = await repo.findById(id);
  if (!ret) throw new AppError("Retur pembelian tidak ditemukan", StatusCodes.NOT_FOUND);
  if (ret.status !== "POSTED") {
    throw new AppError("Hanya retur POSTED yang dapat disinkronkan ke Accurate", StatusCodes.UNPROCESSABLE_ENTITY);
  }
  return pushPurchaseReturnToAccurate(id);
};

module.exports = {
  listPurchaseReturns,
  getPurchaseReturn,
  createPurchaseReturn,
  postPurchaseReturn,
  cancelPurchaseReturn,
  deletePurchaseReturn,
  syncReturnToAccurate,
};
