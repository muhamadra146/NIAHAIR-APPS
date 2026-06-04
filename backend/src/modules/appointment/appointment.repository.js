const prisma = require("../../config/prisma");

const INCLUDE = {
  customer: { select: { id: true, name: true, customerNo: true, mobilePhone: true } },
  branch:   { select: { id: true, name: true, code: true } },
  services: {
    include: {
      serviceItem: { select: { id: true, name: true, itemCode: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  staffs: {
    include: {
      employee: { select: { id: true, name: true, employeeCode: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  statusHistories: {
    orderBy: { createdAt: "asc" },
  },
  treatmentSessions: {
    select: { id: true, startedAt: true, completedAt: true, notes: true },
  },
};

// ── List / single ─────────────────────────────────────────────────────

const findAll = ({ skip, take, where }) =>
  prisma.appointment.findMany({ skip, take, where, orderBy: { createdAt: "desc" }, include: INCLUDE });

const count = (where) => prisma.appointment.count({ where });

const findById = (id) =>
  prisma.appointment.findUnique({ where: { id }, include: INCLUDE });

const countToday = (startOfDay) =>
  prisma.appointment.count({ where: { createdAt: { gte: startOfDay } } });

// ── Lookup helpers ────────────────────────────────────────────────────

const findCustomerById = (id) =>
  prisma.customer.findUnique({ where: { id }, select: { id: true, name: true } });

const findBranchById = (id) =>
  prisma.branch.findUnique({ where: { id }, select: { id: true, name: true } });

// ── Create ────────────────────────────────────────────────────────────

const createWithTransaction = ({ appointmentData, userId }) =>
  prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.create({ data: appointmentData });

    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: appointment.id,
        oldStatus:     null,
        newStatus:     "BOOKED",
        notes:         "Appointment created",
        createdBy:     userId ?? null,
      },
    });

    return tx.appointment.findUnique({ where: { id: appointment.id }, include: INCLUDE });
  });

// ── Update fields ─────────────────────────────────────────────────────

const updateAppointment = (id, data) =>
  prisma.appointment.update({ where: { id }, data, include: INCLUDE });

// ── Change status ─────────────────────────────────────────────────────

const changeStatusWithTransaction = ({ appointment, newStatus, notes, userId }) =>
  prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appointment.id },
      data:  { status: newStatus },
    });

    await tx.appointmentStatusHistory.create({
      data: {
        appointmentId: appointment.id,
        oldStatus:     appointment.status,
        newStatus,
        notes:         notes ?? null,
        createdBy:     userId ?? null,
      },
    });

    return tx.appointment.findUnique({ where: { id: appointment.id }, include: INCLUDE });
  });

module.exports = {
  findAll,
  count,
  findById,
  countToday,
  findCustomerById,
  findBranchById,
  createWithTransaction,
  updateAppointment,
  changeStatusWithTransaction,
};
