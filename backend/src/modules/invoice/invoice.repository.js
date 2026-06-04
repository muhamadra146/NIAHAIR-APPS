const prisma = require("../../config/prisma");

const INCLUDE = {
  customer: { select: { id: true, name: true, customerNo: true } },
  branch:   { select: { id: true, name: true, code: true } },
  items: {
    include: {
      item: { select: { id: true, name: true, itemCode: true, itemType: true } },
      unit: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  payments: {
    include: {
      paymentMethod: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  treatmentSessions: {
    select: { id: true, startedAt: true, completedAt: true, notes: true },
  },
};

// ── List / single ─────────────────────────────────────────────────────

const findAll = ({ skip, take, where }) =>
  prisma.invoice.findMany({ skip, take, where, orderBy: { createdAt: "desc" }, include: INCLUDE });

const count = (where) => prisma.invoice.count({ where });

const findById = (id) =>
  prisma.invoice.findUnique({ where: { id }, include: INCLUDE });

const countToday = (startOfDay) =>
  prisma.invoice.count({ where: { createdAt: { gte: startOfDay } } });

// ── Lookup helpers ────────────────────────────────────────────────────

const findCustomerById = (id) =>
  prisma.customer.findUnique({ where: { id }, select: { id: true, name: true } });

const findBranchById = (id) =>
  prisma.branch.findUnique({ where: { id }, select: { id: true, name: true } });

const findItemById = (id) =>
  prisma.item.findUnique({
    where: { id },
    select: { id: true, itemCode: true, name: true, itemType: true },
  });

const findItemUnit = ({ itemId, unitId }) =>
  prisma.itemUnit.findUnique({
    where: { itemId_unitId: { itemId, unitId } },
    select: { id: true },
  });

const findActivePrice = ({ itemId, unitId, branchId }) =>
  prisma.itemPrice.findFirst({
    where: { itemId, unitId, branchId, isActive: true },
    select: { sellingPrice: true },
  });

const findActivePriceGlobal = ({ itemId, unitId }) =>
  prisma.itemPrice.findFirst({
    where: { itemId, unitId, branchId: null, isActive: true },
    select: { sellingPrice: true },
  });

const findTreatmentSessionsByIds = (ids) =>
  prisma.treatmentSession.findMany({
    where: { id: { in: ids } },
    select: { id: true, invoiceId: true },
  });

// ── Create ────────────────────────────────────────────────────────────

const createWithTransaction = ({ invoiceData, itemsData, sessionIds, userId }) =>
  prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({ data: invoiceData });

    if (itemsData.length > 0) {
      await tx.invoiceItem.createMany({
        data: itemsData.map((d) => ({ ...d, invoiceId: invoice.id })),
      });
    }

    if (sessionIds && sessionIds.length > 0) {
      await tx.treatmentSession.updateMany({
        where: { id: { in: sessionIds } },
        data:  { invoiceId: invoice.id },
      });
    }

    await tx.invoiceStatusHistory.create({
      data: {
        invoiceId: invoice.id,
        oldStatus: null,
        newStatus: "UNPAID",
        notes:     "Invoice created",
        createdBy: userId ?? null,
      },
    });

    return tx.invoice.findUnique({ where: { id: invoice.id }, include: INCLUDE });
  });

// ── Cancel ────────────────────────────────────────────────────────────

const cancelWithTransaction = ({ invoice, userId }) =>
  prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data:  { status: "CANCELLED" },
    });

    await tx.invoiceStatusHistory.create({
      data: {
        invoiceId: invoice.id,
        oldStatus: invoice.status,
        newStatus: "CANCELLED",
        notes:     "Invoice cancelled",
        createdBy: userId ?? null,
      },
    });

    return tx.invoice.findUnique({ where: { id: invoice.id }, include: INCLUDE });
  });

module.exports = {
  findAll,
  count,
  findById,
  countToday,
  findCustomerById,
  findBranchById,
  findItemById,
  findItemUnit,
  findActivePrice,
  findActivePriceGlobal,
  findTreatmentSessionsByIds,
  createWithTransaction,
  cancelWithTransaction,
};
