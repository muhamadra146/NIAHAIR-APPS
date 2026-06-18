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
    select: {
      id: true, slotKey: true,
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
  rescheduleHistories: {
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

// staffsBySlot: [{ employeeId, slotKey }] or legacy flat staffIds converted upstream
const createWithTransaction = ({ appointmentData, services = [], staffsBySlot = [], userId }) =>
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

    if (staffsBySlot.length > 0) {
      await tx.appointmentStaff.createMany({
        data: staffsBySlot.map(({ employeeId, slotKey }) => ({
          appointmentId: appointment.id,
          employeeId,
          slotKey: slotKey ?? null,
        })),
      });
    }

    return tx.appointment.findUnique({ where: { id: appointment.id }, include: INCLUDE });
  });

// ── Update fields ─────────────────────────────────────────────────────

const updateAppointment = (id, data) =>
  prisma.appointment.update({ where: { id }, data, include: INCLUDE });

// staffsBySlot = undefined → leave staff untouched; [] → clear all; [...] → replace
const updateWithStaff = (id, data, staffsBySlot) =>
  prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id }, data });

    if (staffsBySlot !== undefined) {
      await tx.appointmentStaff.deleteMany({ where: { appointmentId: id } });
      if (staffsBySlot.length > 0) {
        await tx.appointmentStaff.createMany({
          data: staffsBySlot.map(({ employeeId, slotKey }) => ({
            appointmentId: id,
            employeeId,
            slotKey: slotKey ?? null,
          })),
        });
      }
    }

    return tx.appointment.findUnique({ where: { id }, include: INCLUDE });
  });

// ── Change status ─────────────────────────────────────────────────────

const changeStatusWithTransaction = ({ appointment, newStatus, notes, cancelReason, userId }) =>
  prisma.$transaction(async (tx) => {
    const updateData = { status: newStatus };
    if (newStatus === "CANCELLED") {
      updateData.cancelReason      = cancelReason ?? null;
      updateData.cancelledAt       = new Date();
      updateData.cancelledByUserId = userId ?? null;
    }

    await tx.appointment.update({
      where: { id: appointment.id },
      data:  updateData,
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

const rescheduleWithTransaction = ({ appointment, newVisitDate, newStartTime, newEndTime, reason, userId }) =>
  prisma.$transaction(async (tx) => {
    await tx.appointmentRescheduleHistory.create({
      data: {
        appointmentId:   appointment.id,
        oldVisitDate:    appointment.visitDate,
        oldStartTime:    appointment.startTime,
        oldEndTime:      appointment.endTime,
        newVisitDate,
        newStartTime,
        newEndTime,
        reason,
        changedByUserId: userId ?? null,
      },
    });

    await tx.appointment.update({
      where: { id: appointment.id },
      data:  { visitDate: newVisitDate, startTime: newStartTime, endTime: newEndTime },
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
  rescheduleWithTransaction,
};
