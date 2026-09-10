'use strict';

const { Prisma }      = require("@prisma/client");
const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const prisma          = require("../../config/prisma");
const { paginate, paginationMeta } = require("../../utils/pagination");
const {
  findPurchaseInvoices,
  countPurchaseInvoices,
  findPurchaseInvoiceById,
  findMaxPurchaseSeqToday,
  findLastPurchasePrice,
} = require("./purchase.repository");
const { createSyncJob }      = require("../syncQueue/syncQueue.service");
const { processSyncQueue }   = require("../../workers/accurateSync.worker");
const { validatePeriodOpen } = require("../inventory/inventory.period.service");
const { accurateRequest }    = require("../accurate/accurate.client");

const D = (v) => new Prisma.Decimal(String(v));

// ── Invoice number: PI-YYYYMMDD-XXXX ──────────────────────────────────────────
const buildPurchaseInvoiceNo = async () => {
  const now    = new Date(Date.now() + 7 * 3600 * 1000);
  const yyyy   = now.getUTCFullYear();
  const mm     = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd     = String(now.getUTCDate()).padStart(2, "0");
  const prefix = `PI-${yyyy}${mm}${dd}-`;
  const maxSeq = await findMaxPurchaseSeqToday(prefix);
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
};

// ── List ──────────────────────────────────────────────────────────────────────
const listPurchaseInvoices = async (query) => {
  const { page = 1, limit = 20, supplierId, status, startDate, endDate, search } = query;
  // synced param dari query string: "true" | "false" | undefined
  const synced = query.synced === "true" ? true : query.synced === "false" ? false : undefined;
  const { skip, take } = paginate(page, limit);
  const [data, total]  = await Promise.all([
    findPurchaseInvoices({ supplierId, status, synced, startDate, endDate, search, skip, take }),
    countPurchaseInvoices({ supplierId, status, synced, startDate, endDate, search }),
  ]);
  return { data, meta: paginationMeta(total, page, limit) };
};

// ── Get one ───────────────────────────────────────────────────────────────────
const getPurchaseInvoice = async (id) => {
  const invoice = await findPurchaseInvoiceById(id);
  if (!invoice) throw new AppError("Faktur pembelian tidak ditemukan", StatusCodes.NOT_FOUND);
  return invoice;
};

// ── Compute totals (discount stored as percentage 0-100, matching Accurate) ───
const computeItemSubtotal = (qty, price, discountPct) => {
  const gross       = D(qty).mul(D(price));
  const discAmount  = gross.mul(D(discountPct)).div(D(100));
  return gross.sub(discAmount);
};

const TAX_RATE = D("0.11"); // PPN 11%

const computeTotals = (items, taxable = false, inclusiveTax = false) => {
  let subtotal      = D(0);
  let totalDiscount = D(0);
  for (const item of items) {
    const gross      = D(item.qty).mul(D(item.price));
    const discAmount = gross.mul(D(item.discount ?? 0)).div(D(100));
    subtotal      = subtotal.add(gross);
    totalDiscount = totalDiscount.add(discAmount);
  }
  const net = subtotal.sub(totalDiscount);

  let totalTax   = D(0);
  let grandTotal = net;
  if (taxable) {
    if (inclusiveTax) {
      // PPN sudah termasuk dalam harga: tax = net * 11/111
      totalTax   = net.mul(D(11)).div(D(111));
      grandTotal = net;
    } else {
      // PPN ditambahkan di atas: tax = net * 11%
      totalTax   = net.mul(TAX_RATE);
      grandTotal = net.add(totalTax);
    }
  }

  return { subtotal, totalDiscount, totalTax, grandTotal };
};

// ── Create (langsung POSTED, sama dengan pola sales invoice) ─────────────────
const createPurchaseInvoice = async (body, createdByEmployeeId) => {
  const {
    supplierId, warehouseId, invoiceDate, supplierInvoiceNo,
    dueDate, deliveryDate, paymentTerms, taxable = false,
    inclusiveTax = false, taxInvoiceDate, taxInvoiceNo,
    notes, items,
  } = body;

  if (!warehouseId) {
    throw new AppError("Gudang tujuan wajib dipilih", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  await validatePeriodOpen(invoiceDate);

  const invoiceNo = await buildPurchaseInvoiceNo();

  const mappedItems = items.map((item) => ({
    ...item,
    discount: item.discount ?? 0,
    subtotal: computeItemSubtotal(item.qty, item.price, item.discount ?? 0),
  }));

  const { subtotal, totalDiscount, totalTax, grandTotal } = computeTotals(mappedItems, taxable, inclusiveTax);

  // Buat invoice + inventory movements dalam satu transaksi
  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.purchaseInvoice.create({
      data: {
        supplierId,
        warehouseId,
        invoiceNo,
        supplierInvoiceNo:  supplierInvoiceNo || undefined,
        invoiceDate:        new Date(invoiceDate),
        dueDate:            dueDate      ? new Date(dueDate)      : undefined,
        deliveryDate:       deliveryDate ? new Date(deliveryDate) : undefined,
        paymentTerms:       paymentTerms || undefined,
        taxable,
        inclusiveTax,
        taxInvoiceDate:     taxable && taxInvoiceDate ? new Date(taxInvoiceDate) : undefined,
        taxInvoiceNo:       taxable ? (taxInvoiceNo || undefined) : undefined,
        notes:              notes || undefined,
        status:             "POSTED",
        subtotal,
        totalDiscount,
        totalTax,
        grandTotal,
        createdByEmployeeId: createdByEmployeeId || undefined,
        items: {
          create: mappedItems.map((item) => ({
            itemId:   item.itemId,
            unitId:   item.unitId,
            qty:      D(item.qty),
            price:    D(item.price),
            discount: D(item.discount),
            subtotal: item.subtotal,
            notes:    item.notes || undefined,
          })),
        },
      },
      include: {
        supplier:  { select: { id: true, name: true, code: true } },
        warehouse: { select: { id: true, name: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, itemCode: true, itemType: true } },
            unit: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Buat inventory movements untuk setiap item INVENTORY
    for (const item of created.items) {
      if (item.item.itemType !== "INVENTORY") continue;

      let inventory = await tx.inventory.findUnique({
        where: { warehouseId_itemId: { warehouseId, itemId: item.itemId } },
      });

      if (!inventory) {
        inventory = await tx.inventory.create({
          data: {
            warehouseId,
            itemId:       item.itemId,
            qtyOnHand:    D(0),
            qtyReserved:  D(0),
            qtyAvailable: D(0),
          },
        });
      }

      const qtyBefore = D(inventory.qtyOnHand);
      const qtyChange = D(item.qty);
      const qtyAfter  = qtyBefore.add(qtyChange);

      await tx.inventoryMovement.create({
        data: {
          inventoryId:           inventory.id,
          movementType:          "PURCHASE",
          qtyBefore,
          qtyChange,
          qtyAfter,
          referenceType:         "PURCHASE_RECEIPT",
          referenceId:           created.id,
          referenceNo:           created.invoiceNo,
          notes:                 created.notes,
          sourceModule:          "PURCHASE",
          createdSource:         "USER",
          warehouseId,
          unitCost:              D(item.price),
          createdByEmployeeId:   createdByEmployeeId || undefined,
          purchaseInvoiceItemId: item.id,
        },
      });

      await tx.inventory.update({
        where: { id: inventory.id },
        data:  {
          qtyOnHand:    qtyAfter,
          qtyAvailable: qtyAfter.sub(D(inventory.qtyReserved)),
        },
      });
    }

    return created;
  });

  // Enqueue Accurate sync — non-blocking, sama dengan sales invoice
  createSyncJob({ entityType: "PURCHASE_INVOICE", entityId: invoice.id, direction: "APP_TO_ACCURATE" })
    .then(() => processSyncQueue().catch(() => {}))
    .catch(() => {});

  return invoice;
};

// ── Update (DRAFT only) ───────────────────────────────────────────────────────
const updatePurchaseInvoice = async (id, body) => {
  const existing = await findPurchaseInvoiceById(id);
  if (!existing) throw new AppError("Faktur pembelian tidak ditemukan", StatusCodes.NOT_FOUND);
  if (existing.status !== "DRAFT") {
    throw new AppError("Hanya faktur DRAFT yang dapat diubah", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const {
    supplierId, warehouseId, invoiceDate, supplierInvoiceNo,
    dueDate, deliveryDate, paymentTerms, taxable, inclusiveTax,
    taxInvoiceDate, taxTransactionType, taxInvoiceNo, notes, items,
  } = body;

  const updateData = {};
  if (supplierId)        updateData.supplierId        = supplierId;
  if (warehouseId)       updateData.warehouseId       = warehouseId;
  if (invoiceDate)       updateData.invoiceDate       = new Date(invoiceDate);
  if (supplierInvoiceNo !== undefined) updateData.supplierInvoiceNo = supplierInvoiceNo || null;
  if (dueDate !== undefined)      updateData.dueDate      = dueDate ? new Date(dueDate) : null;
  if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
  if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms || null;
  if (taxable !== undefined)      updateData.taxable      = taxable;
  if (inclusiveTax !== undefined) updateData.inclusiveTax = inclusiveTax;
  if (taxInvoiceDate !== undefined)     updateData.taxInvoiceDate     = taxInvoiceDate ? new Date(taxInvoiceDate) : null;
  if (taxTransactionType !== undefined) updateData.taxTransactionType = taxTransactionType || null;
  if (taxInvoiceNo !== undefined)       updateData.taxInvoiceNo       = taxInvoiceNo || null;
  if (notes !== undefined)        updateData.notes        = notes || null;

  const effectiveTaxable      = taxable      ?? existing.taxable;
  const effectiveInclusiveTax = inclusiveTax ?? existing.inclusiveTax;

  if (items) {
    const mappedItems = items.map((item) => ({
      ...item,
      discount: item.discount ?? 0,
      subtotal: computeItemSubtotal(item.qty, item.price, item.discount ?? 0),
    }));
    const { subtotal, totalDiscount, totalTax, grandTotal } = computeTotals(mappedItems, effectiveTaxable, effectiveInclusiveTax);
    Object.assign(updateData, { subtotal, totalDiscount, totalTax, grandTotal });

    // Replace items
    await prisma.purchaseInvoiceItem.deleteMany({ where: { purchaseInvoiceId: id } });
    await prisma.purchaseInvoiceItem.createMany({
      data: mappedItems.map((item) => ({
        purchaseInvoiceId: id,
        itemId:   item.itemId,
        unitId:   item.unitId,
        qty:      D(item.qty),
        price:    D(item.price),
        discount: D(item.discount),
        subtotal: item.subtotal,
        notes:    item.notes || undefined,
      })),
    });
  }

  await prisma.purchaseInvoice.update({ where: { id }, data: updateData });
  return findPurchaseInvoiceById(id);
};

// ── Cancel ────────────────────────────────────────────────────────────────────
// DRAFT  → cancel langsung (tidak ada inventory movement)
// POSTED → (1) void di Accurate jika sudah sync, (2) balik inventory, (3) cancel status
const cancelPurchaseInvoice = async (id) => {
  const invoice = await findPurchaseInvoiceById(id);
  if (!invoice) throw new AppError("Faktur pembelian tidak ditemukan", StatusCodes.NOT_FOUND);
  if (invoice.status === "CANCELLED") {
    throw new AppError("Faktur sudah dibatalkan", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  if (invoice.status === "POSTED") {
    await validatePeriodOpen(invoice.invoiceDate);

    // Void di Accurate sebelum menyentuh data lokal
    if (invoice.accuratePurchaseInvoiceId) {
      let resp;
      try {
        resp = await accurateRequest("/purchase-invoice/delete.do", {
          method: "POST",
          body:   { id: invoice.accuratePurchaseInvoiceId },
        });
      } catch (err) {
        throw new AppError(`Gagal menghubungi Accurate: ${err.message}`, StatusCodes.BAD_GATEWAY);
      }
      if (!resp.s) {
        const reason = resp.d ?? resp.e ?? JSON.stringify(resp);
        throw new AppError(`Tidak bisa void di Accurate: ${reason}`, StatusCodes.UNPROCESSABLE_ENTITY);
      }
    }

    await prisma.$transaction(async (tx) => {
      // Balik setiap inventory movement yang dibuat saat posting
      for (const item of invoice.items) {
        if (item.item.itemType !== "INVENTORY") continue;

        const inventory = await tx.inventory.findUnique({
          where: { warehouseId_itemId: { warehouseId: invoice.warehouseId, itemId: item.itemId } },
        });
        if (!inventory) continue;

        const qtyBefore = D(inventory.qtyOnHand);
        const qtyChange = D(item.qty).negated();
        const qtyAfter  = qtyBefore.add(qtyChange);

        await tx.inventoryMovement.create({
          data: {
            inventoryId:           inventory.id,
            movementType:          "RETURN",
            qtyBefore,
            qtyChange,
            qtyAfter,
            referenceType:         "PURCHASE_RETURN",
            referenceId:           invoice.id,
            referenceNo:           invoice.invoiceNo,
            notes:                 `Pembatalan faktur pembelian ${invoice.invoiceNo}`,
            sourceModule:          "PURCHASE",
            createdSource:         "USER",
            warehouseId:           invoice.warehouseId,
            unitCost:              D(item.price),
            purchaseInvoiceItemId: item.id,
          },
        });

        await tx.inventory.update({
          where: { id: inventory.id },
          data:  {
            qtyOnHand:    qtyAfter,
            qtyAvailable: qtyAfter.sub(D(inventory.qtyReserved)),
          },
        });
      }

      await tx.purchaseInvoice.update({
        where: { id },
        data:  {
          status:                      "CANCELLED",
          // Hapus referensi Accurate karena sudah di-void
          accuratePurchaseInvoiceId:     null,
          accuratePurchaseInvoiceNumber: null,
        },
      });
    });

    return { invoiceId: id, cancelled: true };
  }

  // DRAFT — cancel langsung
  await prisma.purchaseInvoice.update({ where: { id }, data: { status: "CANCELLED" } });
  return { invoiceId: id, cancelled: true };
};

// ── Delete ────────────────────────────────────────────────────────────────────
const deletePurchaseInvoice = async (id) => {
  const invoice = await findPurchaseInvoiceById(id);
  if (!invoice) throw new AppError("Faktur pembelian tidak ditemukan", StatusCodes.NOT_FOUND);

  // Cek Accurate dulu sebelum menyentuh data lokal —
  // jika sudah ada pembayaran di Accurate, delete ditolak dan kita block di sini.
  if (invoice.accuratePurchaseInvoiceId) {
    let resp;
    try {
      resp = await accurateRequest("/purchase-invoice/delete.do", {
        method: "POST",
        body:   { id: invoice.accuratePurchaseInvoiceId },
      });
    } catch (err) {
      throw new AppError(
        `Gagal menghubungi Accurate: ${err.message}`,
        StatusCodes.BAD_GATEWAY,
      );
    }
    if (!resp.s) {
      const reason = resp.d ?? resp.e ?? JSON.stringify(resp);
      throw new AppError(
        `Tidak bisa hapus di Accurate: ${reason}`,
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
  }

  // Accurate sudah hapus (atau belum tersinkron) — balik stok jika POSTED
  if (invoice.status === "POSTED") {
    await validatePeriodOpen(invoice.invoiceDate);

    // Reversal stok + hapus invoice dalam satu transaksi agar atomic
    await prisma.$transaction(async (tx) => {
      for (const item of invoice.items) {
        if (item.item.itemType !== "INVENTORY") continue;

        const inventory = await tx.inventory.findUnique({
          where: { warehouseId_itemId: { warehouseId: invoice.warehouseId, itemId: item.itemId } },
        });
        if (!inventory) continue;

        const qtyBefore = D(inventory.qtyOnHand);
        const qtyChange = D(item.qty).negated();
        const qtyAfter  = qtyBefore.add(qtyChange);

        await tx.inventoryMovement.create({
          data: {
            inventoryId:           inventory.id,
            movementType:          "RETURN",
            qtyBefore,
            qtyChange,
            qtyAfter,
            referenceType:         "PURCHASE_RETURN",
            referenceId:           invoice.id,
            referenceNo:           invoice.invoiceNo,
            notes:                 `Hapus faktur pembelian ${invoice.invoiceNo}`,
            sourceModule:          "PURCHASE",
            createdSource:         "USER",
            warehouseId:           invoice.warehouseId,
            unitCost:              D(item.price),
            purchaseInvoiceItemId: item.id,
          },
        });

        await tx.inventory.update({
          where: { id: inventory.id },
          data:  {
            qtyOnHand:    qtyAfter,
            qtyAvailable: qtyAfter.sub(D(inventory.qtyReserved)),
          },
        });
      }

      // Hapus invoice di dalam transaksi yang sama → atomic
      await tx.purchaseInvoice.delete({ where: { id } });
    });
  } else {
    // DRAFT atau CANCELLED — tidak ada reversal, hapus langsung
    await prisma.purchaseInvoice.delete({ where: { id } });
  }

  return { invoiceId: id, deleted: true };
};

const getLastPurchasePrice = async (itemId, unitId) => {
  const last = await findLastPurchasePrice(itemId, unitId);
  return { price: last ? last.price.toString() : null };
};

module.exports = {
  listPurchaseInvoices,
  getPurchaseInvoice,
  createPurchaseInvoice,
  updatePurchaseInvoice,
  cancelPurchaseInvoice,
  deletePurchaseInvoice,
  getLastPurchasePrice,
};
