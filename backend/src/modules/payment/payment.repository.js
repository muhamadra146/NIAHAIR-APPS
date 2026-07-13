const { Prisma } = require("@prisma/client");
const prisma     = require("../../config/prisma");

const INCLUDE = {
  invoice: {
    select: {
      id: true, invoiceNo: true, status: true, grandTotal: true,
      customer: { select: { id: true, name: true, customerNo: true, mobilePhone: true } },
    },
  },
  paymentMethod:     { select: { id: true, name: true, code: true } },
  branch:            { select: { id: true, code: true, name: true } },
  createdByEmployee: { select: { id: true, employeeCode: true, name: true } },
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
      id:                true,
      status:            true,
      branchId:          true,
      paidAmount:        true,
      outstandingAmount: true,
      grandTotal:        true,
      totalDeposit:      true,
    },
  });

const findPaymentMethodById = (id) =>
  prisma.paymentMethod.findUnique({
    where: { id },
    select: { id: true, name: true, isActive: true },
  });

// Fetch invoice with relations needed for post-payment completion
const findInvoiceWithRelations = (id) =>
  prisma.invoice.findUnique({
    where: { id },
    select: {
      id:            true,
      appointmentId: true,
      treatmentSessions: {
        select: { id: true, completedAt: true },
      },
      appointment: {
        select: { id: true, status: true },
      },
    },
  });

// Complete sessions + appointment in one atomic operation
const completeInvoiceRelations = ({ sessionIds, appointmentId, oldAppointmentStatus, userId }) =>
  prisma.$transaction(async (tx) => {
    if (sessionIds.length > 0) {
      await tx.treatmentSession.updateMany({
        where: { id: { in: sessionIds } },
        data:  { completedAt: new Date() },
      });
    }

    if (appointmentId && oldAppointmentStatus) {
      await tx.appointment.update({
        where: { id: appointmentId },
        data:  { status: "COMPLETED" },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId,
          oldStatus:  oldAppointmentStatus,
          newStatus:  "COMPLETED",
          notes:      "Auto completed after invoice paid",
          createdBy:  userId ?? null,
        },
      });
    }
  });

// Fresh read after all side-effects commit — richer invoice fields than INCLUDE
const findPaymentById = (id) =>
  prisma.payment.findUnique({
    where: { id },
    select: {
      id:          true,
      paymentNo:   true,
      amount:      true,
      paymentDate: true,
      referenceNo: true,
      notes:       true,
      invoice: {
        select: {
          id:                true,
          invoiceNo:         true,
          status:            true,
          grandTotal:        true,
          paidAmount:        true,
          outstandingAmount: true,
        },
      },
      paymentMethod: {
        select: { id: true, name: true, code: true },
      },
    },
  });

// ── Invoice lookup for delete recalc ─────────────────────────────────

const findInvoiceForDelete = (id) =>
  prisma.invoice.findUnique({
    where: { id },
    select: {
      id:                true,
      status:            true,
      paidAmount:        true,
      outstandingAmount: true,
      grandTotal:        true,
      totalDeposit:      true,
      _count:            { select: { commissions: true } },
    },
  });

// ── Delete (atomic) ───────────────────────────────────────────────────

const deleteWithTransaction = ({ payment, invoice, D, userId }) =>
  prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: payment.id } });

    const newPaidAmount   = D(invoice.paidAmount).sub(D(payment.amount));
    const newOutstanding  = Prisma.Decimal.max(
      D("0"),
      D(invoice.grandTotal).sub(D(invoice.totalDeposit)).sub(newPaidAmount),
    );
    const newStatus = newOutstanding.lte(D("0")) ? "PAID" : "UNPAID";

    await tx.invoice.update({
      where: { id: invoice.id },
      data:  {
        paidAmount:        newPaidAmount,
        outstandingAmount: newOutstanding,
        status:            newStatus,
      },
    });

    if (invoice.status !== newStatus) {
      await tx.invoiceStatusHistory.create({
        data: {
          invoiceId: invoice.id,
          oldStatus: invoice.status,
          newStatus,
          notes:     "Payment deleted",
          createdBy: userId ?? null,
        },
      });
    }
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
  findPaymentById,
  countToday,
  findInvoiceForPayment,
  findInvoiceForDelete,
  deleteWithTransaction,
  findPaymentMethodById,
  findInvoiceWithRelations,
  completeInvoiceRelations,
  createWithTransaction,
};
