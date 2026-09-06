'use strict';

const { StatusCodes }     = require("http-status-codes");
const AppError            = require("../../common/errors/AppError");
const prisma              = require("../../config/prisma");
const { accurateRequest } = require("../accurate/accurate.client");
const { getAccurateBranchId } = require("../branch/branch.repository");
const { mapPurchaseReturnToAccurate } = require("./purchaseReturn.sync.mapper");

const ACCURATE_PURCHASE_RETURN_SAVE = "/purchase-return/save.do";

const pushPurchaseReturnToAccurate = async (returnId) => {
  const ret = await prisma.purchaseReturn.findUnique({
    where: { id: returnId },
    include: {
      purchaseInvoice: {
        include: {
          supplier: { select: { id: true, name: true, accurateVendorId: true } },
        },
      },
      items: {
        include: {
          item: {
            select: {
              id: true, name: true, sku: true, itemType: true,
              accurateItemId: true,
              defaultUnit: { select: { id: true, name: true, accurateUnitId: true } },
            },
          },
          unit: { select: { id: true, name: true, accurateUnitId: true } },
        },
      },
    },
  });

  if (!ret) throw new AppError("Purchase return not found", StatusCodes.NOT_FOUND);

  // Idempotency
  if (ret.accuratePurchaseReturnId) {
    return { skipped: true, reason: "Already synced to Accurate" };
  }

  // Parent invoice must already be synced
  if (!ret.purchaseInvoice.accuratePurchaseInvoiceId) {
    throw new AppError(
      "Invoice pembelian induk belum tersinkron ke Accurate. Sync invoice terlebih dahulu.",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  // Supplier must have Accurate ID
  if (!ret.purchaseInvoice.supplier.accurateVendorId) {
    throw new AppError(
      `Pemasok ${ret.purchaseInvoice.supplier.name} belum tersinkron ke Accurate`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  // All INVENTORY items must have accurateItemId
  for (const item of ret.items) {
    if (item.item.itemType === "INVENTORY" && !item.item.accurateItemId) {
      throw new AppError(
        `Barang ${item.item.name} belum tersinkron ke Accurate`,
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }
  }

  const syncableItems = ret.items.filter((i) => i.item.accurateItemId);
  if (syncableItems.length === 0) {
    throw new AppError(
      "Tidak ada barang yang tersinkron ke Accurate — sync barang terlebih dahulu",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  const accurateBranchId = await getAccurateBranchId(ret.purchaseInvoice.branchId);

  const payload  = mapPurchaseReturnToAccurate(ret, accurateBranchId);
  const response = await accurateRequest(ACCURATE_PURCHASE_RETURN_SAVE, {
    method: "POST",
    body:   payload,
  });

  if (!response.s || !response.r?.id) {
    throw new AppError(
      `Accurate API error: ${JSON.stringify(response)}`,
      StatusCodes.BAD_GATEWAY
    );
  }

  const accuratePurchaseReturnId = response.r.id;
  const accurateReturnNo         = response.r.number ?? null;

  await prisma.purchaseReturn.update({
    where: { id: returnId },
    data:  { accuratePurchaseReturnId, accurateReturnNo, lastSyncAt: new Date() },
  });

  console.log(`[return sync] success returnId=${returnId} accurateId=${accuratePurchaseReturnId}`);

  return { synced: true, accuratePurchaseReturnId, accurateReturnNo };
};

module.exports = { pushPurchaseReturnToAccurate };
