const prisma = require("../../config/prisma");

const INCLUDE = {
  customer:          { select: { id: true, name: true, customerNo: true, mobilePhone: true } },
  branch:            { select: { id: true, code: true, name: true } },
  createdByEmployee: { select: { id: true, employeeCode: true, name: true } },
  services: {
    include: {
      serviceItem: { select: { id: true, name: true, itemCode: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  staffs: {
    include: {
      employee: {
        select: {
          id: true, name: true, employeeCode: true,
          role: { select: { id: true, code: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
  statusHistories: {
    orderBy: { createdAt: "asc" },
  },
  treatmentSessions: {
    select: { id: true, startedAt: true, completedAt: true, notes: true },
  },
  photos: {
    orderBy: { createdAt: "asc" },
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
  prisma.customer.findUnique({ where: { id }, select: { id: true, name: true, address: true } });

const findBranchById = (id) =>
  prisma.branch.findUnique({ where: { id }, select: { id: true, name: true } });

// ── Create ────────────────────────────────────────────────────────────

const createWithTransaction = ({ appointmentData, services = [], staffIds = [], userId }) =>
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

    if (services.length > 0) {
      await tx.appointmentService.createMany({
        data: services.map((s) => ({
          appointmentId:   appointment.id,
          serviceItemId:   s.serviceItemId,
          qty:             s.qty,
          price:           s.price,
          durationMinutes: s.durationMinutes ?? 0,
          notes:           s.notes ?? null,
        })),
      });
    }

    if (staffIds.length > 0) {
      await tx.appointmentStaff.createMany({
        data: staffIds.map((employeeId) => ({
          appointmentId: appointment.id,
          employeeId,
        })),
      });
    }

    return tx.appointment.findUnique({ where: { id: appointment.id }, include: INCLUDE });
  });

// ── Update fields ─────────────────────────────────────────────────────

const updateAppointment = (id, data) =>
  prisma.appointment.update({ where: { id }, data, include: INCLUDE });

// staffIds = undefined → leave staff untouched; [] → clear all; [...] → replace
const updateWithStaff = (id, data, staffIds) =>
  prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id }, data });

    if (staffIds !== undefined) {
      await tx.appointmentStaff.deleteMany({ where: { appointmentId: id } });
      if (staffIds.length > 0) {
        await tx.appointmentStaff.createMany({
          data: staffIds.map((employeeId) => ({ appointmentId: id, employeeId })),
        });
      }
    }

    return tx.appointment.findUnique({ where: { id }, include: INCLUDE });
  });

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
  updateWithStaff,
  changeStatusWithTransaction,
};
