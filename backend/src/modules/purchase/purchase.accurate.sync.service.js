'use strict';

const logger = require('../../utils/logger');
const { StatusCodes }     = require("http-status-codes");
const AppError            = require("../../common/errors/AppError");
const prisma              = require("../../config/prisma");
const { accurateRequest } = require("../accurate/accurate.client");
const { getAccurateBranchId } = require("../branch/branch.repository");
const { mapPurchaseInvoiceToAccurate } = require("./purchase.sync.mapper");

const ACCURATE_PURCHASE_INVOICE_SAVE = "/purchase-invoice/save.do";
const ACCURATE_ITEM_DETAIL           = "/item/detail.do";

// Baris ber-PPN hanya dikenai pajak oleh Accurate bila master item Accurate punya pajak (PPN).
// Tanpa itu Accurate diam-diam tidak memungut PPN → total faktur Accurate ≠ total ERP.
// Cek (baca saja) sebelum kirim, hentikan sync dengan pesan jelas (sama dengan faktur penjualan).
const assertAccurateItemsTaxable = async (payload, items) => {
  const taxedIds = new Set((payload.detailItem ?? []).filter((d) => d.useTax1 === true).map((d) => d.itemId));
  if (taxedIds.size === 0) return;

  const codeById = new Map();
  for (const line of items) {
    if (taxedIds.has(line.item.accurateItemId)) codeById.set(line.item.accurateItemId, line.item.itemCode);
  }

  const missing = [];
  for (const [accurateItemId, itemCode] of codeById) {
    const resp = await accurateRequest(`${ACCURATE_ITEM_DETAIL}?id=${accurateItemId}`, { method: "GET" });
    if (!resp.s) {
      throw new AppError(`Gagal membaca master item Accurate ${itemCode}`, StatusCodes.BAD_GATEWAY);
    }
    if (!(resp.d?.tax1Id ?? resp.d?.tax1)) missing.push(`${itemCode} ${resp.d?.name ?? ""}`.trim());
  }
  if (missing.length > 0) {
    throw new AppError(
      `PPN belum diatur di master item Accurate: ${missing.join(", ")}. ` +
      "Atur pajak PPN pada item tersebut di Accurate, lalu ulangi sinkron faktur pembelian ini.",
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }
};

const pushPurchaseInvoiceToAccurate = async (purchaseInvoiceId) => {
  const invoice = await prisma.purchaseInvoice.findUnique({
    where:   { id: purchaseInvoiceId },
    include: {
      supplier:  { select: { id: true, name: true, accurateVendorId: true } },
      warehouse: { select: { id: true, name: true, branchId: true } },
      items: {
        include: {
          item: {
            select: {
              id: true, name: true, itemCode: true, itemType: true,
              accurateItemId: true,
              defaultUnit: { select: { id: true, name: true, accurateUnitId: true } },
            },
          },
          unit: { select: { id: true, name: true, accurateUnitId: true } },
        },
      },
    },
  });

  if (!invoice) throw new AppError("Faktur pembelian tidak ditemukan", StatusCodes.NOT_FOUND);

  // Jangan push invoice yang sudah dibatalkan — sync job mungkin dibuat sebelum cancel
  if (invoice.status === "CANCELLED") {
    return { skipped: true, reason: "Invoice is cancelled" };
  }

  // Idempotency
  if (invoice.accuratePurchaseInvoiceId) {
    return { skipped: true, reason: "Already synced to Accurate" };
  }

  if (!invoice.supplier.accurateVendorId) {
    throw new AppError(
      `Pemasok ${invoice.supplier.name} belum tersinkron ke Accurate`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  for (const item of invoice.items) {
    if (item.item.itemType === "INVENTORY" && !item.item.accurateItemId) {
      throw new AppError(
        `Barang ${item.item.name} belum tersinkron ke Accurate`,
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }
  }

  const syncableItems = invoice.items.filter((item) => item.item.accurateItemId);
  if (syncableItems.length === 0) {
    throw new AppError(
      "Tidak ada barang yang tersinkron ke Accurate — sync barang terlebih dahulu",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  // Cari Accurate branch ID dari warehouse — graceful jika tidak ada
  const warehouseBranchId = invoice.warehouse?.branchId ?? null;
  let accurateBranchId = null;
  if (warehouseBranchId) {
    try {
      accurateBranchId = await getAccurateBranchId(warehouseBranchId);
    } catch {
      // Branch belum di-mapping ke Accurate — lanjutkan tanpa branchId
      accurateBranchId = null;
    }
  }

  // Try with supplierInvoiceNo first; if Accurate rejects as duplicate, retry with internal invoiceNo
  const primaryBillNo = invoice.supplierInvoiceNo || invoice.invoiceNo;
  let payload  = mapPurchaseInvoiceToAccurate(invoice, primaryBillNo, accurateBranchId);
  await assertAccurateItemsTaxable(payload, syncableItems);

  let response = await accurateRequest(ACCURATE_PURCHASE_INVOICE_SAVE, {
    method: "POST",
    body:   payload,
  });

  if (!response.s && invoice.supplierInvoiceNo && primaryBillNo !== invoice.invoiceNo) {
    const isDuplicate = JSON.stringify(response).includes("sudah ada");
    if (isDuplicate) {
      logger.info("[purchase sync] billNumber duplicate, retrying with internal invoiceNo");
      payload  = mapPurchaseInvoiceToAccurate(invoice, invoice.invoiceNo, accurateBranchId);
      response = await accurateRequest(ACCURATE_PURCHASE_INVOICE_SAVE, {
        method: "POST",
        body:   payload,
      });
    }
  }

  if (!response.s || !response.r?.id) {
    const reason = Array.isArray(response?.d) ? response.d.join("; ") : (response?.d ?? JSON.stringify(response));
    throw new AppError(
      `Accurate menolak faktur pembelian: ${reason}`,
      StatusCodes.BAD_GATEWAY
    );
  }

  const accuratePurchaseInvoiceId     = response.r.id;
  const accuratePurchaseInvoiceNumber = response.r.number ?? response.r.invoiceNo ?? null;

  await prisma.purchaseInvoice.update({
    where: { id: purchaseInvoiceId },
    data:  {
      accuratePurchaseInvoiceId,
      accuratePurchaseInvoiceNumber,
      lastSyncAt: new Date(),
    },
  });

  // details[i] maps 1:1 to syncableItems[i] (filtered list, not full invoice.items)
  const details = response.r.detailItem ?? [];
  for (let i = 0; i < details.length; i++) {
    if (!details[i]?.id || !syncableItems[i]) continue;
    await prisma.purchaseInvoiceItem.update({
      where: { id: syncableItems[i].id },
      data:  { accurateDetailId: details[i].id },
    }).catch(() => {});
  }

  logger.info(`[purchase sync] success invoiceId=${purchaseInvoiceId} accurateId=${accuratePurchaseInvoiceId}`);

  return { synced: true, accuratePurchaseInvoiceId, accuratePurchaseInvoiceNumber };
};

module.exports = { pushPurchaseInvoiceToAccurate };
