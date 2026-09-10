'use strict';

const prisma = require("../../config/prisma");

const INVOICE_INCLUDE = {
  supplier:  { select: { id: true, name: true, code: true, paymentTerms: true } },
  warehouse: { select: { id: true, name: true } },
  createdByEmployee: { select: { id: true, name: true, employeeCode: true } },
  items: {
    include: {
      item: { select: { id: true, name: true, itemCode: true, itemType: true } },
      unit: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  },
};

const buildWhere = ({ supplierId, status, synced, startDate, endDate, search }) => {
  const where = {};
  if (supplierId) where.supplierId = supplierId;
  if (status)     where.status     = status;
  if (synced === true)  where.accuratePurchaseInvoiceId = { not: null };
  if (synced === false) where.accuratePurchaseInvoiceId = null;
  if (startDate || endDate) {
    where.invoiceDate = {};
    if (startDate) where.invoiceDate.gte = new Date(startDate);
    if (endDate)   where.invoiceDate.lte = new Date(endDate + "T23:59:59.999Z");
  }
  if (search) {
    where.OR = [
      { invoiceNo:         { contains: search, mode: "insensitive" } },
      { supplierInvoiceNo: { contains: search, mode: "insensitive" } },
      { supplier: { name:  { contains: search, mode: "insensitive" } } },
    ];
  }
  return where;
};

const findPurchaseInvoices = ({ supplierId, status, synced, startDate, endDate, search, skip, take }) => {
  const where = buildWhere({ supplierId, status, synced, startDate, endDate, search });
  return prisma.purchaseInvoice.findMany({ where, include: INVOICE_INCLUDE, skip, take, orderBy: { createdAt: "desc" } });
};

const countPurchaseInvoices = ({ supplierId, status, synced, startDate, endDate, search }) => {
  const where = buildWhere({ supplierId, status, synced, startDate, endDate, search });
  return prisma.purchaseInvoice.count({ where });
};

const findPurchaseInvoiceById = (id) =>
  prisma.purchaseInvoice.findUnique({ where: { id }, include: INVOICE_INCLUDE });

const findMaxPurchaseSeqToday = async (prefix) => {
  const last = await prisma.purchaseInvoice.findFirst({
    where:   { invoiceNo: { startsWith: prefix } },
    orderBy: { invoiceNo: "desc" },
    select:  { invoiceNo: true },
  });
  if (!last) return 0;
  const seq = parseInt(last.invoiceNo.split("-").pop(), 10);
  return isNaN(seq) ? 0 : seq;
};

const findLastPurchasePrice = (itemId, unitId) =>
  prisma.purchaseInvoiceItem.findFirst({
    where: {
      itemId,
      unitId,
      purchaseInvoice: { status: "POSTED" },
    },
    orderBy: { createdAt: "desc" },
    select:  { price: true },
  });

module.exports = {
  findPurchaseInvoices,
  countPurchaseInvoices,
  buildWhere,
  findPurchaseInvoiceById,
  findMaxPurchaseSeqToday,
  findLastPurchasePrice,
};
