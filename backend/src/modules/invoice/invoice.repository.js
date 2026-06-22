const prisma = require("../../config/prisma");

const INCLUDE = {
  customer:          { select: { id: true, name: true, customerNo: true, mobilePhone: true } },
  branch:            { select: { id: true, code: true, name: true } },
  createdByEmployee: { select: { id: true, employeeCode: true, name: true } },
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
  invoiceDeposits: {
    include: {
      deposit: {
        select: { id: true, amount: true, status: true, paidAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  },
  treatmentSessions: {
    select: { id: true, startedAt: true, completedAt: true, notes: true },
  },
};

// ── Daily assignment INCLUDE (heavier — treatmentItems + assignments) ──

const DAILY_INCLUDE = {
  customer: { select: { id: true, name: true, customerNo: true } },
  treatmentSessions: {
    include: {
      treatmentItems: {
        include: {
          item: { select: { id: true, name: true, itemCode: true } },
          unit: { select: { id: true, name: true } },
          assignments: {
            include: {
              employee: { select: { id: true, name: true, employeeCode: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  },
  _count: { select: { commissions: true } },
};

const findDailyAssignment = ({ start, end, branchId }) => {
  const where = { invoiceDate: { gte: start, lte: end } };
  if (branchId) where.branchId = branchId;
  return prisma.invoice.findMany({
    where,
    include:  DAILY_INCLUDE,
    orderBy:  { createdAt: "asc" },
    take:     100,
  });
};

// ── List / single ─────────────────────────────────────────────────────

const findAll = ({ skip, take, where }) =>
  prisma.invoice.findMany({ skip, take, where, orderBy: { createdAt: "desc" }, include: INCLUDE });

const count = (where) => prisma.invoice.count({ where });

const findById = (id) =>
  prisma.invoice.findUnique({ where: { id }, include: INCLUDE });

const countToday = (startOfDay) =>
  prisma.invoice.count({ where: { createdAt: { gte: startOfDay } } });

const findMaxInvoiceSeqToday = async (prefix) => {
  const result = await prisma.invoice.findFirst({
    where:   { invoiceNo: { startsWith: prefix } },
    orderBy: { invoiceNo: "desc" },
    select:  { invoiceNo: true },
  });
  if (!result) return 0;
  const seq = parseInt(result.invoiceNo.split("-").pop(), 10);
  return isNaN(seq) ? 0 : seq;
};

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

const findDepositsByIds = (ids) =>
  prisma.deposit.findMany({
    where: { id: { in: ids } },
    select: {
      id:         true,
      amount:     true,
      status:     true,
      customerId: true,
      invoiceDeposits: { select: { amountApplied: true } },
    },
  });

const findDepositForApply = (id) =>
  prisma.deposit.findUnique({
    where: { id },
    select: {
      id:         true,
      amount:     true,
      status:     true,
      customerId: true,
      invoiceDeposits: { select: { amountApplied: true } },
    },
  });

const findInvoiceForDepositApply = (id) =>
  prisma.invoice.findUnique({
    where: { id },
    select: {
      id:               true,
      status:           true,
      customerId:       true,
      grandTotal:       true,
      totalDeposit:     true,
      outstandingAmount: true,
    },
  });

// ── Create ────────────────────────────────────────────────────────────

// depositsData: [{ depositId, amountApplied, newDepositStatus }]
const createWithTransaction = ({ invoiceData, itemsData, sessionIds, depositsData, userId }) =>
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

    if (depositsData && depositsData.length > 0) {
      await tx.invoiceDeposit.createMany({
        data: depositsData.map(({ depositId, amountApplied }) => ({
          invoiceId:     invoice.id,
          depositId,
          amountApplied,
        })),
      });

      for (const { depositId, newDepositStatus } of depositsData) {
        await tx.deposit.update({
          where: { id: depositId },
          data:  { status: newDepositStatus },
        });
      }
    }

    await tx.invoiceStatusHistory.create({
      data: {
        invoiceId: invoice.id,
        oldStatus: null,
        newStatus: invoiceData.status,
        notes:     "Invoice created",
        createdBy: userId ?? null,
      },
    });

    return tx.invoice.findUnique({ where: { id: invoice.id }, include: INCLUDE });
  });

// ── Apply deposit to existing invoice ────────────────────────────────

const applyDepositWithTransaction = ({
  invoiceId, depositId, amountApplied,
  newDepositStatus, newTotalDeposit, newOutstanding, newInvoiceStatus,
  oldInvoiceStatus, userId,
}) =>
  prisma.$transaction(async (tx) => {
    await tx.invoiceDeposit.create({
      data: { invoiceId, depositId, amountApplied },
    });

    await tx.deposit.update({
      where: { id: depositId },
      data:  { status: newDepositStatus },
    });

    await tx.invoice.update({
      where: { id: invoiceId },
      data:  {
        totalDeposit:      newTotalDeposit,
        outstandingAmount: newOutstanding,
        status:            newInvoiceStatus,
      },
    });

    await tx.invoiceStatusHistory.create({
      data: {
        invoiceId,
        oldStatus: oldInvoiceStatus,
        newStatus: newInvoiceStatus,
        notes:     `Deposit applied: ${amountApplied}`,
        createdBy: userId ?? null,
      },
    });

    return tx.invoice.findUnique({ where: { id: invoiceId }, include: INCLUDE });
  });

// ── Update items ─────────────────────────────────────────────────────

const updateWithTransaction = ({ invoiceId, invoiceData, itemsData, oldStatus, userId }) =>
  prisma.$transaction(async (tx) => {
    // Replace all line items
    await tx.invoiceItem.deleteMany({ where: { invoiceId } });
    if (itemsData.length > 0) {
      await tx.invoiceItem.createMany({
        data: itemsData.map((d) => ({ ...d, invoiceId })),
      });
    }

    await tx.invoice.update({ where: { id: invoiceId }, data: invoiceData });

    if (oldStatus !== invoiceData.status) {
      await tx.invoiceStatusHistory.create({
        data: {
          invoiceId,
          oldStatus,
          newStatus: invoiceData.status,
          notes:     "Invoice updated",
          createdBy: userId ?? null,
        },
      });
    }

    return tx.invoice.findUnique({ where: { id: invoiceId }, include: INCLUDE });
  });

// ── Delete ────────────────────────────────────────────────────────────

const deleteWithTransaction = (invoiceId) =>
  prisma.$transaction(async (tx) => {
    // Get treatment session IDs linked to this invoice
    const sessions = await tx.treatmentSession.findMany({
      where:  { invoiceId },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);

    if (sessionIds.length > 0) {
      // Get treatment item IDs
      const tItems = await tx.treatmentItem.findMany({
        where:  { treatmentSessionId: { in: sessionIds } },
        select: { id: true },
      });
      const tItemIds = tItems.map((t) => t.id);

      if (tItemIds.length > 0) {
        // Get materialUsage IDs first
        const usages = await tx.materialUsage.findMany({
          where:  { treatmentItemId: { in: tItemIds } },
          select: { id: true },
        });
        if (usages.length > 0) {
          await tx.materialUsageItem.deleteMany({ where: { materialUsageId: { in: usages.map((u) => u.id) } } });
          await tx.materialUsage.deleteMany({ where: { id: { in: usages.map((u) => u.id) } } });
        }
        await tx.treatmentAssignment.deleteMany({ where: { treatmentItemId: { in: tItemIds } } });
        await tx.treatmentItem.deleteMany({ where: { id: { in: tItemIds } } });
      }

      await tx.treatmentMedia.deleteMany({ where: { treatmentSessionId: { in: sessionIds } } });
      await tx.treatmentSession.deleteMany({ where: { id: { in: sessionIds } } });
    }

    await tx.commission.deleteMany({ where: { invoiceId } });
    await tx.invoiceDeposit.deleteMany({ where: { invoiceId } });
    await tx.invoiceStatusHistory.deleteMany({ where: { invoiceId } });
    await tx.payment.deleteMany({ where: { invoiceId } });
    await tx.invoiceItem.deleteMany({ where: { invoiceId } });
    await tx.invoice.delete({ where: { id: invoiceId } });
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
  findMaxInvoiceSeqToday,
  findCustomerById,
  findBranchById,
  findItemById,
  findItemUnit,
  deleteWithTransaction,
  findActivePrice,
  findActivePriceGlobal,
  findTreatmentSessionsByIds,
  findDepositsByIds,
  findDepositForApply,
  findInvoiceForDepositApply,
  createWithTransaction,
  applyDepositWithTransaction,
  updateWithTransaction,
  cancelWithTransaction,
  findDailyAssignment,
};
