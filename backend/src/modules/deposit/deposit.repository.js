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

const findAll = ({ skip, take, where }) =>
  prisma.deposit.findMany({ skip, take, where, orderBy: { createdAt: "desc" }, include: INCLUDE });

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

const updateStatus = (id, status) =>
  prisma.deposit.update({ where: { id }, data: { status }, include: INCLUDE });

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
  updateAppointmentLink,
};
