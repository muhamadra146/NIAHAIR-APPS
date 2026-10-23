const prisma = require("../../config/prisma");

const INCLUDE = {
  employee: {
    select: {
      id: true, name: true, employeeCode: true,
      role:       { select: { id: true, code: true, name: true } },
      homeBranch: { select: { id: true, code: true, name: true } },
    },
  },
  leaveType: { select: { id: true, code: true, name: true, isPaid: true, quotaType: true } },
};

const findAll = ({ skip, take, where, orderBy }) =>
  prisma.leave.findMany({ where, include: INCLUDE, orderBy: orderBy ?? { createdAt: "desc" }, skip, take });

const count = (where) => prisma.leave.count({ where });

const findById = (id) =>
  prisma.leave.findUnique({ where: { id }, include: INCLUDE });

const create = (data) =>
  prisma.leave.create({ data, include: INCLUDE });

const update = (id, data) =>
  prisma.leave.update({ where: { id }, data, include: INCLUDE });

/** Pengajuan cuti PENDING/APPROVED milik karyawan yang beririsan dengan rentang [start, end] */
const findOverlapping = (employeeId, start, end) =>
  prisma.leave.findFirst({
    where:  { employeeId, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: end }, endDate: { gte: start } },
    select: { id: true, startDate: true, endDate: true, status: true },
  });

/** Jadwal karyawan (semua cabang) dalam rentang tanggal — untuk menghitung hari kerja cuti */
const findSchedulesInRange = (employeeId, start, end, client = prisma) =>
  client.staffSchedule.findMany({
    where:  { employeeId, workDate: { gte: start, lte: end } },
    select: {
      id: true, branchId: true, workDate: true, status: true, shiftId: true, notes: true,
      shift:      { select: { id: true, startTime: true, isWorking: true } },
      attendance: { select: { id: true } },
    },
  });

/** Hari libur nasional (Pengaturan → Hari Libur) dalam rentang tanggal */
const findHolidaysInRange = (start, end, client = prisma) =>
  client.holiday.findMany({ where: { date: { gte: start, lte: end } }, select: { date: true } });

module.exports = { findAll, count, findById, create, update, findOverlapping, findSchedulesInRange, findHolidaysInRange };
