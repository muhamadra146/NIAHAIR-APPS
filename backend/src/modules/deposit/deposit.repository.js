const prisma = require("../../config/prisma");

const INCLUDE = {
  appointment: {
    include: {
      customer: { select: { id: true, name: true, customerNo: true, mobilePhone: true } },
    },
  },
  paymentMethod: { select: { id: true, name: true, code: true } },
  invoiceDeposits: {
    include: {
      invoice: { select: { id: true, invoiceNo: true, status: true, grandTotal: true } },
    },
  },
};

// ── List / single ─────────────────────────────────────────────────────

const findAll = ({ skip, take, where }) =>
  prisma.deposit.findMany({ skip, take, where, orderBy: { createdAt: "desc" }, include: INCLUDE });

const count = (where) => prisma.deposit.count({ where });

const findById = (id) =>
  prisma.deposit.findUnique({ where: { id }, include: INCLUDE });

// ── Lookup helpers ────────────────────────────────────────────────────

const findAppointmentById = (id) =>
  prisma.appointment.findUnique({ where: { id }, select: { id: true, status: true } });

const findPaymentMethodById = (id) =>
  prisma.paymentMethod.findUnique({ where: { id }, select: { id: true, name: true, isActive: true } });

// ── Write ─────────────────────────────────────────────────────────────

const create = (data) =>
  prisma.deposit.create({ data, include: INCLUDE });

const updateStatus = (id, status) =>
  prisma.deposit.update({ where: { id }, data: { status }, include: INCLUDE });

module.exports = {
  findAll,
  count,
  findById,
  findAppointmentById,
  findPaymentMethodById,
  create,
  updateStatus,
};
