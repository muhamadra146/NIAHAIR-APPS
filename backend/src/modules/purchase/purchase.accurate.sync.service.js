'use strict';

const { StatusCodes }     = require("http-status-codes");
const AppError            = require("../../common/errors/AppError");
const prisma              = require("../../config/prisma");
const { accurateRequest } = require("../accurate/accurate.client");
const { getAccurateBranchId } = require("../branch/branch.repository");
const { mapPurchaseInvoiceToAccurate } = require("./purchase.sync.mapper");

const ACCURATE_PURCHASE_INVOICE_SAVE = "/purchase-invoice/save.do";

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

  if (!invoice) throw new AppError("Purchase invoice not found", StatusCodes.NOT_FOUND);

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

  let response = await accurateRequest(ACCURATE_PURCHASE_INVOICE_SAVE, {
    method: "POST",
    body:   payload,
  });

  if (!response.s && invoice.supplierInvoiceNo && primaryBillNo !== invoice.invoiceNo) {
    const isDuplicate = JSON.stringify(response).includes("sudah ada");
    if (isDuplicate) {
      console.log("[purchase sync] billNumber duplicate, retrying with internal invoiceNo");
      payload  = mapPurchaseInvoiceToAccurate(invoice, invoice.invoiceNo, accurateBranchId);
      response = await accurateRequest(ACCURATE_PURCHASE_INVOICE_SAVE, {
        method: "POST",
        body:   payload,
      });
    }
  }

  if (!response.s || !response.r?.id) {
    throw new AppError(
      `Accurate API error: ${JSON.stringify(response)}`,
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

  console.log(`[purchase sync] success invoiceId=${purchaseInvoiceId} accurateId=${accuratePurchaseInvoiceId}`);

  return { synced: true, accuratePurchaseInvoiceId, accuratePurchaseInvoiceNumber };
};

module.exports = { pushPurchaseInvoiceToAccurate };
