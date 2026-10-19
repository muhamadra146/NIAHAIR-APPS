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
const { toBaseQty }          = require("../inventory/inventory.conversion");
const { assertUnitsBelongToItems } = require("../item/item.units");
const { computeDocumentTax } = require("../../utils/tax");
const { toDateStr, wibDateStr } = require("../../utils/date");

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

// ── Validasi baris & tanggal faktur ─────────────────────────────────────────
// Satu item + satuan hanya boleh muncul sekali (qty digabung di satu baris).
const assertNoDuplicateLines = (items) => {
  const seen = new Set();
  for (const line of items) {
    const key = `${line.itemId}|${line.unitId}`;
    if (seen.has(key)) {
      throw new AppError(
        "Item yang sama dengan satuan yang sama muncul lebih dari sekali — gabungkan qty-nya dalam satu baris",
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
    seen.add(key);
  }
};

// Tanggal faktur pembelian tidak boleh di masa depan (kalender WIB)
const assertNotFutureDate = (invoiceDate) => {
  if (toDateStr(invoiceDate) > wibDateStr()) {
    throw new AppError("Tanggal faktur tidak boleh melebihi hari ini", StatusCodes.UNPROCESSABLE_ENTITY);
  }
};

// ── Retur POSTED memblokir batal/hapus faktur (G4-09) ────────────────────────
const assertNoPostedReturns = async (client, invoiceId) => {
  const posted = await client.purchaseReturn.count({ where: { purchaseInvoiceId: invoiceId, status: "POSTED" } });
  if (posted > 0) {
    throw new AppError(
      "Faktur sudah punya retur pembelian yang diposting, tidak bisa dibatalkan atau dihapus",
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }
};

// ── Qty yang dulu benar-benar masuk stok untuk satu baris faktur ─────────────
// Dibaca dari movement PURCHASE aslinya (satuan dasar) agar pembalikan persis sama;
// fallback ke konversi satuan jika movement tidak ditemukan.
const purchasedBaseQty = async (tx, item) => {
  const agg = await tx.inventoryMovement.aggregate({
    _sum:  { qtyChange: true },
    where: { purchaseInvoiceItemId: item.id, movementType: "PURCHASE" },
  });
  if (agg?._sum?.qtyChange != null) return D(agg._sum.qtyChange);
  return toBaseQty(tx, item.itemId, item.unitId, item.qty);
};

// ── Compute totals (discount stored as percentage 0-100, matching Accurate) ───
const computeItemSubtotal = (qty, price, discountPct) => {
  const gross       = D(qty).mul(D(price));
  const discAmount  = gross.mul(D(discountPct)).div(D(100));
  return gross.sub(discAmount);
};

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

  // PPN satu kali per dokumen, dibulatkan ke rupiah penuh — sama dengan Accurate dan faktur
  // penjualan (utils/tax.js), sehingga total ERP == total faktur pembelian di Accurate.
  let totalTax   = D(0);
  let grandTotal = net;
  if (taxable) {
    totalTax   = computeDocumentTax(net, inclusiveTax);
    grandTotal = inclusiveTax ? net : net.add(totalTax);
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

  assertNotFutureDate(invoiceDate);
  assertNoDuplicateLines(items);
  await validatePeriodOpen(invoiceDate);
  await assertUnitsBelongToItems(items);

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
      // Stok dalam satuan dasar (G4-05) — 1 TUBE (=80 GRAM) menambah 80
      const qtyChange = await toBaseQty(tx, item.itemId, item.unitId, item.qty);
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

  if (invoiceDate) assertNotFutureDate(invoiceDate);
  if (items) {
    assertNoDuplicateLines(items);
    await assertUnitsBelongToItems(items);
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

// ── Hapus faktur di Accurate (retry-safe) ─────────────────────────────────────
// Dipanggil DI DALAM transaksi ERP setelah guard status (baris faktur terkunci), sehingga
// batal/hapus paralel mendapat 409 sebelum menyentuh Accurate, dan bila Accurate menolak
// seluruh perubahan ERP di-rollback (ERP & Accurate tetap konsisten).
// Bila dokumen sudah tidak ada di Accurate (mis. percobaan sebelumnya terhenti setelah
// Accurate terhapus), dianggap sudah terhapus agar bisa diulang.
const ACCURATE_TX_OPTIONS = { timeout: 60000, maxWait: 10000 };

const deleteInAccurate = async (accurateId, verb) => {
  let resp;
  try {
    resp = await accurateRequest("/purchase-invoice/delete.do", { method: "POST", body: { id: accurateId } });
  } catch (err) {
    throw new AppError(`Gagal menghubungi Accurate: ${err.message}`, StatusCodes.BAD_GATEWAY);
  }
  if (resp.s) return;
  const detail = await accurateRequest(`/purchase-invoice/detail.do?id=${accurateId}`, { method: "GET" }).catch(() => null);
  if (detail && detail.s === false) return; // sudah tidak ada di Accurate
  const reason = Array.isArray(resp.d) ? resp.d.join("; ") : (resp.d ?? resp.e ?? "ditolak Accurate");
  throw new AppError(`Tidak bisa ${verb} di Accurate: ${reason}`, StatusCodes.UNPROCESSABLE_ENTITY);
};

// ── Cancel ────────────────────────────────────────────────────────────────────
// DRAFT  → cancel langsung (tidak ada inventory movement)
// POSTED → satu transaksi: (1) guard status POSTED → CANCELLED (409 bila paralel),
//          (2) balik inventory, (3) void di Accurate — gagal di Accurate = rollback semua
const cancelPurchaseInvoice = async (id) => {
  const invoice = await findPurchaseInvoiceById(id);
  if (!invoice) throw new AppError("Faktur pembelian tidak ditemukan", StatusCodes.NOT_FOUND);
  if (invoice.status === "CANCELLED") {
    throw new AppError("Faktur sudah dibatalkan", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  if (invoice.status === "POSTED") {
    await validatePeriodOpen(invoice.invoiceDate);
    await assertNoPostedReturns(prisma, id);

    await prisma.$transaction(async (tx) => {
      // Guard race condition: transisi bersyarat POSTED → CANCELLED (mengunci baris faktur),
      // lalu cek ulang retur POSTED di dalam transaksi.
      const { count } = await tx.purchaseInvoice.updateMany({
        where: { id, status: "POSTED" },
        data:  { status: "CANCELLED" },
      });
      if (count === 0) throw new AppError("Dokumen sudah diproses", StatusCodes.CONFLICT);
      await assertNoPostedReturns(tx, id);
      // Dibaca ulang setelah baris terkunci — sync worker mungkin baru saja mengisinya
      const { accuratePurchaseInvoiceId } = await tx.purchaseInvoice.findUnique({
        where: { id }, select: { accuratePurchaseInvoiceId: true },
      });
      for (const item of invoice.items) {
        if (item.item.itemType !== "INVENTORY") continue;

        const inventory = await tx.inventory.findUnique({
          where: { warehouseId_itemId: { warehouseId: invoice.warehouseId, itemId: item.itemId } },
        });
        if (!inventory) continue;

        const qtyBefore = D(inventory.qtyOnHand);
        const qtyChange = (await purchasedBaseQty(tx, item)).negated(); // satuan dasar (G4-05)
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

      // Void di Accurate terakhir, setelah guard & pembalikan stok berhasil (B6)
      if (accuratePurchaseInvoiceId) {
        await deleteInAccurate(accuratePurchaseInvoiceId, "void");
        await tx.purchaseInvoice.update({
          where: { id },
          data:  { accuratePurchaseInvoiceId: null, accuratePurchaseInvoiceNumber: null },
        });
      }
    }, ACCURATE_TX_OPTIONS);

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

  if (invoice.status === "POSTED") await assertNoPostedReturns(prisma, id);

  // Guard status → balik stok (POSTED) → hapus di Accurate → hapus faktur, satu transaksi (B6).
  // Accurate menolak (mis. sudah ada pembayaran) = rollback semua.
  if (invoice.status === "POSTED") {
    await validatePeriodOpen(invoice.invoiceDate);

    // Reversal stok + hapus invoice dalam satu transaksi agar atomic
    await prisma.$transaction(async (tx) => {
      // Guard race condition: kunci baris faktur yang masih POSTED, cek ulang retur POSTED
      const { count } = await tx.purchaseInvoice.updateMany({ where: { id, status: "POSTED" }, data: { status: "POSTED" } });
      if (count === 0) throw new AppError("Dokumen sudah diproses", StatusCodes.CONFLICT);
      await assertNoPostedReturns(tx, id);
      const { accuratePurchaseInvoiceId } = await tx.purchaseInvoice.findUnique({
        where: { id }, select: { accuratePurchaseInvoiceId: true },
      });

      for (const item of invoice.items) {
        if (item.item.itemType !== "INVENTORY") continue;

        const inventory = await tx.inventory.findUnique({
          where: { warehouseId_itemId: { warehouseId: invoice.warehouseId, itemId: item.itemId } },
        });
        if (!inventory) continue;

        const qtyBefore = D(inventory.qtyOnHand);
        const qtyChange = (await purchasedBaseQty(tx, item)).negated(); // satuan dasar (G4-05)
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

      if (accuratePurchaseInvoiceId) await deleteInAccurate(accuratePurchaseInvoiceId, "hapus");

      // Hapus invoice di dalam transaksi yang sama → atomic
      await tx.purchaseInvoice.delete({ where: { id } });
    }, ACCURATE_TX_OPTIONS);
  } else {
    // DRAFT atau CANCELLED — tidak ada reversal, hapus langsung (bersyarat status)
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.purchaseInvoice.updateMany({
        where: { id, status: invoice.status }, data: { status: invoice.status },
      });
      if (count === 0) throw new AppError("Dokumen sudah diproses", StatusCodes.CONFLICT);
      const { accuratePurchaseInvoiceId } = await tx.purchaseInvoice.findUnique({
        where: { id }, select: { accuratePurchaseInvoiceId: true },
      });
      if (accuratePurchaseInvoiceId) await deleteInAccurate(accuratePurchaseInvoiceId, "hapus");
      await tx.purchaseInvoice.delete({ where: { id } });
    }, ACCURATE_TX_OPTIONS);
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
