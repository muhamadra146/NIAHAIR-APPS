const prisma = require("../../config/prisma");

const INCLUDE = {
  invoice:       { select: { id: true, invoiceNo: true, status: true, grandTotal: true } },
  paymentMethod: { select: { id: true, name: true, code: true } },
};

// ── List / single ─────────────────────────────────────────────────────

const findAll = ({ skip, take, where }) =>
  prisma.payment.findMany({ skip, take, where, orderBy: { createdAt: "desc" }, include: INCLUDE });

const count = (where) => prisma.payment.count({ where });

const findById = (id) =>
  prisma.payment.findUnique({ where: { id }, include: INCLUDE });

const countToday = (startOfDay) =>
  prisma.payment.count({ where: { createdAt: { gte: startOfDay } } });

// ── Lookup helpers ────────────────────────────────────────────────────

const findInvoiceForPayment = (id) =>
  prisma.invoice.findUnique({
    where: { id },
    select: {
      id:               true,
      status:           true,
      paidAmount:       true,
      outstandingAmount: true,
      grandTotal:       true,
      totalDeposit:     true,
      treatmentSessions: { select: { id: true } },
    },
  });

const findPaymentMethodById = (id) =>
  prisma.paymentMethod.findUnique({
    where: { id },
    select: { id: true, name: true, isActive: true },
  });

// ── Create (atomic) ───────────────────────────────────────────────────

const createWithTransaction = ({
  paymentData,
  invoiceId,
  newPaidAmount,
  outstandingAmount,
  oldStatus,
  newStatus,
  userId,
}) =>
  prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({ data: paymentData, include: INCLUDE });

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount:        newPaidAmount,
        outstandingAmount,
        status:            newStatus,
      },
    });

    if (oldStatus !== newStatus) {
      await tx.invoiceStatusHistory.create({
        data: {
          invoiceId,
          oldStatus,
          newStatus,
          notes:     "Payment received",
          createdBy: userId ?? null,
        },
      });
    }

    return payment;
  });

module.exports = {
  findAll,
  count,
  findById,
  countToday,
  findInvoiceForPayment,
  findPaymentMethodById,
  createWithTransaction,
};
