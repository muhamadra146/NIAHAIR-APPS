'use strict';

const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const prisma          = require("../../config/prisma");
const repo            = require("./purchaseReturn.repository");
const { pushPurchaseReturnToAccurate } = require("./purchaseReturn.accurate.sync.service");
const { createSyncJob }      = require("../syncQueue/syncQueue.service");
const { validatePeriodOpen } = require("../inventory/inventory.period.service");
const { toDateOnly }         = require("../../utils/date");

const { toBaseQty }          = require("../inventory/inventory.conversion");

const D = (v) => new Prisma.Decimal(String(v));

// ── Subtotal baris = qty × harga − diskon% (sama dengan faktur pembelian, G4-18) ──
const lineSubtotal = (qty, price, discountPct) => {
  const gross = D(qty).mul(D(price));
  return gross.sub(gross.mul(D(discountPct ?? 0)).div(D(100)));
};

// ── Validasi qty retur vs sisa yang bisa diretur (G4-08) ─────────────────────
// Dibandingkan dalam satuan dasar per item:
//   sisa = qty di faktur − qty retur POSTED sebelumnya (kecuali excludeReturnId).
// client = prisma atau tx.
const assertReturnable = async (client, invoiceId, invoiceItems, returnItems, excludeReturnId = null) => {
  const sumBase = async (rows) => {
    const map = new Map();
    for (const r of rows) {
      const base = await toBaseQty(client, r.itemId, r.unitId, r.qty);
      map.set(r.itemId, (map.get(r.itemId) ?? D(0)).add(base));
    }
    return map;
  };

  const postedRows = await client.purchaseReturnItem.findMany({
    where: {
      purchaseReturn: {
        purchaseInvoiceId: invoiceId,
        status:            "POSTED",
        ...(excludeReturnId ? { id: { not: excludeReturnId } } : {}),
      },
    },
    select: { itemId: true, unitId: true, qty: true },
  });

  const purchased = await sumBase(invoiceItems);
  const returned  = await sumBase(postedRows);
  const requested = await sumBase(returnItems);

  for (const [itemId, qty] of requested) {
    const name = returnItems.find((r) => r.itemId === itemId)?.item?.name;
    if (!purchased.has(itemId)) {
      throw new AppError(
        `Item ${name ? `"${name}" ` : ""}tidak ada di faktur pembelian ini`,
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
    const remaining = purchased.get(itemId).sub(returned.get(itemId) ?? D(0));
    if (qty.greaterThan(remaining)) {
      throw new AppError(
        `Qty retur ${name ? `"${name}" ` : ""}melebihi sisa yang bisa diretur (sisa ${remaining} satuan dasar)`,
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
  }
};

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

  // Item harus ada di faktur dan qty tidak melebihi sisa yang bisa diretur
  await assertReturnable(prisma, purchaseInvoiceId, invoice.items, items);

  const returnNo = await buildReturnNo();

  // Hitung subtotal dan grandTotal dari items (setelah diskon baris)
  let subtotal   = D(0);
  const mappedItems = items.map((item) => {
    const netSubtotal = lineSubtotal(item.qty, item.price, item.discount);
    subtotal = subtotal.add(netSubtotal);
    return {
      itemId:   item.itemId,
      unitId:   item.unitId,
      qty:      D(item.qty),
      price:    D(item.price),
      discount: D(item.discount ?? 0),
      subtotal: netSubtotal,
      notes:    item.notes || undefined,
    };
  });
  const grandTotal = subtotal;

  const ret = await prisma.$transaction(async (tx) => {
    const created = await tx.purchaseReturn.create({
      data: {
        purchaseInvoiceId,
        returnNo,
        returnDate:          toDateOnly(returnDate),
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
            item: { select: { id: true, name: true, itemCode: true } },
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

  await validatePeriodOpen(ret.returnDate);

  await prisma.$transaction(async (tx) => {
    // Guard race condition: DRAFT → POSTED bersyarat. Request paralel kedua → count 0 → 409.
    const { count } = await tx.purchaseReturn.updateMany({
      where: { id, status: "DRAFT" },
      data:  { status: "POSTED" },
    });
    if (count === 0) throw new AppError("Dokumen sudah diproses", StatusCodes.CONFLICT);

    // Kunci baris faktur induk (serialisasi dengan retur lain & batal faktur), harus masih POSTED
    const [invoice] = await tx.$queryRawUnsafe(
      `SELECT "warehouseId", status FROM "purchase_invoices" WHERE id = $1 FOR UPDATE`,
      ret.purchaseInvoiceId,
    );
    if (!invoice || invoice.status !== "POSTED") {
      throw new AppError("Faktur pembelian induk sudah tidak POSTED", StatusCodes.UNPROCESSABLE_ENTITY);
    }

    // Cek ulang sisa qty yang bisa diretur di dalam transaksi (retur lain mungkin sudah diposting)
    const invoiceItems = await tx.purchaseInvoiceItem.findMany({
      where:  { purchaseInvoiceId: ret.purchaseInvoiceId },
      select: { itemId: true, unitId: true, qty: true },
    });
    await assertReturnable(tx, ret.purchaseInvoiceId, invoiceItems, ret.items, id);

    for (const item of ret.items) {
      if (!item.item || item.item.itemType !== "INVENTORY") continue;

      const warehouseId = invoice.warehouseId;
      let inventory = await tx.inventory.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId: item.itemId } },
      });
      if (!inventory) continue; // tidak mungkin retur barang yang belum ada di stok

      const qtyBefore = D(inventory.qtyOnHand);
      // retur = keluar dari gudang, dalam satuan dasar (G4-05)
      const qtyChange = (await toBaseQty(tx, item.itemId, item.unitId, item.qty)).negated();
      const qtyAfter  = qtyBefore.add(qtyChange);

      // Stok tidak boleh negatif setelah retur
      if (qtyAfter.lt(D(0))) {
        throw new AppError(
          `Stok ${item.item.name} tidak cukup untuk diretur. ` +
          `Stok saat ini: ${Number(qtyBefore).toLocaleString("id-ID")}, ` +
          `qty retur: ${Number(qtyChange.abs()).toLocaleString("id-ID")}`,
          StatusCodes.UNPROCESSABLE_ENTITY
        );
      }

      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryId:         inventory.id,
          movementType:        "RETURN", // enum InventoryMovementType: RETURN = Retur Pembelian
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
  });

  // Enqueue Accurate sync — worker retry + tampil di monitor sync
  await createSyncJob({ entityType: "PURCHASE_RETURN", entityId: id, direction: "APP_TO_ACCURATE" });

  return repo.findById(id);
};

// ── Cancel (DRAFT only) ───────────────────────────────────────────────────────
const cancelPurchaseReturn = async (id) => {
  const ret = await repo.findById(id);
  if (!ret) throw new AppError("Retur pembelian tidak ditemukan", StatusCodes.NOT_FOUND);
  if (ret.status === "CANCELLED") {
    throw new AppError("Retur sudah dibatalkan", StatusCodes.UNPROCESSABLE_ENTITY);
  }
  if (ret.status !== "DRAFT") {
    throw new AppError(
      "Hanya retur DRAFT yang dapat dibatalkan. Retur POSTED tidak bisa dibatalkan.",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }
  // Bersyarat status DRAFT — cegah batal bersamaan dengan posting
  const { count } = await prisma.purchaseReturn.updateMany({ where: { id, status: "DRAFT" }, data: { status: "CANCELLED" } });
  if (count === 0) throw new AppError("Dokumen sudah diproses", StatusCodes.CONFLICT);
  return repo.findById(id);
};

// ── Delete (DRAFT / CANCELLED) ────────────────────────────────────────────────
const deletePurchaseReturn = async (id) => {
  const ret = await repo.findById(id);
  if (!ret) throw new AppError("Retur pembelian tidak ditemukan", StatusCodes.NOT_FOUND);
  if (ret.status !== "DRAFT" && ret.status !== "CANCELLED") {
    throw new AppError("Hanya retur DRAFT atau Dibatalkan yang dapat dihapus", StatusCodes.UNPROCESSABLE_ENTITY);
  }
  // Bersyarat status — retur yang paralel diposting tidak ikut terhapus
  const { count } = await prisma.purchaseReturn.deleteMany({ where: { id, status: { in: ["DRAFT", "CANCELLED"] } } });
  if (count === 0) throw new AppError("Dokumen sudah diproses", StatusCodes.CONFLICT);
  return ret;
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
