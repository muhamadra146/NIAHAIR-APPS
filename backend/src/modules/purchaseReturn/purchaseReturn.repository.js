'use strict';

const prisma = require("../../config/prisma");

const RETURN_INCLUDE = {
  purchaseInvoice: {
    select: { id: true, invoiceNo: true, invoiceDate: true, warehouseId: true },
  },
  createdBy: {
    select: { id: true, fullName: true },
  },
  items: {
    include: {
      item: { select: { id: true, name: true, sku: true, itemType: true } },
      unit: { select: { id: true, name: true } },
      inventoryMovement: { select: { id: true, movementType: true, qty: true } },
    },
  },
};

async function findAll({ purchaseInvoiceId, status, page = 1, limit = 20 } = {}) {
  const where = {};
  if (purchaseInvoiceId) where.purchaseInvoiceId = purchaseInvoiceId;
  if (status) where.status = status;

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.purchaseReturn.findMany({
      where,
      include: {
        purchaseInvoice: { select: { id: true, invoiceNo: true } },
        createdBy:       { select: { id: true, fullName: true } },
        _count:          { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchaseReturn.count({ where }),
  ]);
  return { data, total, page, limit };
}

async function findById(id) {
  return prisma.purchaseReturn.findUnique({ where: { id }, include: RETURN_INCLUDE });
}

async function create(data) {
  const { items, ...header } = data;
  return prisma.purchaseReturn.create({
    data: {
      ...header,
      items: { create: items },
    },
    include: RETURN_INCLUDE,
  });
}

async function updateStatus(id, status) {
  return prisma.purchaseReturn.update({
    where: { id },
    data:  { status },
    include: RETURN_INCLUDE,
  });
}

async function updateAccurateSync(id, { accuratePurchaseReturnId, accurateReturnNo }) {
  return prisma.purchaseReturn.update({
    where: { id },
    data:  { accuratePurchaseReturnId, accurateReturnNo, lastSyncAt: new Date() },
  });
}

async function remove(id) {
  return prisma.purchaseReturn.delete({ where: { id } });
}

module.exports = {
  findAll,
  findById,
  create,
  updateStatus,
  updateAccurateSync,
  remove,
};
