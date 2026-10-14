const prisma = require("../../config/prisma");

const INCLUDE = {
  customer: {
    select: { id: true, name: true, customerNo: true, mobilePhone: true, accurateCustomerId: true },
  },
  appointment: {
    select: { id: true, bookingNo: true, visitDate: true, status: true },
  },
  branch:            { select: { id: true, code: true, name: true } },
  createdByEmployee: { select: { id: true, employeeCode: true, name: true } },
  invoiceDeposits: {
    include: {
      invoice: { select: { id: true, invoiceNo: true, status: true, grandTotal: true } },
    },
  },
};

// ── List / single ─────────────────────────────────────────────────────

const findAll = ({ skip, take, where, orderBy }) =>
  prisma.deposit.findMany({ skip, take, where, orderBy: orderBy ?? { createdAt: "desc" }, include: INCLUDE });

const count = (where) => prisma.deposit.count({ where });

const findById = (id) =>
  prisma.deposit.findUnique({ where: { id }, include: INCLUDE });

// ── Lookup helpers ────────────────────────────────────────────────────

const findCustomerById = (id) =>
  prisma.customer.findUnique({ where: { id }, select: { id: true, isActive: true } });

const findAppointmentById = (id) =>
  prisma.appointment.findUnique({ where: { id }, select: { id: true, customerId: true } });

// ── Write ─────────────────────────────────────────────────────────────

const create = (data) =>
  prisma.deposit.create({ data, include: INCLUDE });

/** extra: mis. { refundedAt, refundedAmount } saat uang DP dikembalikan */
const updateStatus = (id, status, extra = {}) =>
  prisma.deposit.update({ where: { id }, data: { status, ...extra }, include: INCLUDE });

/** Total uang DP yang sudah dibayar client */
const sumPaid = async (depositId) => {
  const agg = await prisma.depositPayment.aggregate({ where: { depositId }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
};

const updateDeposit = (id, data) =>
  prisma.deposit.update({ where: { id }, data, include: INCLUDE });

const removeDeposit = (id) =>
  prisma.deposit.delete({ where: { id } });

const updateAppointmentLink = (id, appointmentId) =>
  prisma.deposit.update({ where: { id }, data: { appointmentId }, include: INCLUDE });

module.exports = {
  findAll,
  count,
  findById,
  findCustomerById,
  findAppointmentById,
  create,
  updateStatus,
  sumPaid,
  updateDeposit,
  removeDeposit,
  updateAppointmentLink,
};
