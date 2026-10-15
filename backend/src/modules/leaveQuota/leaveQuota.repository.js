const prisma = require("../../config/prisma");

const INCLUDE = {
  leaveType: { select: { id: true, code: true, name: true, maxDaysPerYear: true, isPaid: true } },
  employee:  { select: { id: true, name: true, employeeCode: true } },
};

// Paginated list (manager view)
const findAll = ({ skip = 0, take = 10, where = {} } = {}) =>
  prisma.leaveQuota.findMany({ where, skip, take, include: INCLUDE, orderBy: [{ year: "desc" }, { leaveType: { name: "asc" } }] });

const count = (where = {}) => prisma.leaveQuota.count({ where });

// Internal use only (e.g. getBalance, incrementUsed)
const findMany = (where) =>
  prisma.leaveQuota.findMany({ where, include: INCLUDE, orderBy: [{ year: "desc" }, { leaveType: { name: "asc" } }] });

const findOne = (employeeId, leaveTypeId, year) =>
  prisma.leaveQuota.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    include: INCLUDE,
  });

/** Total hari cuti yang masih MENUNGGU persetujuan, per jenis cuti, untuk tahun tsb */
const sumPendingDays = async (employeeId, year, leaveTypeId = undefined) => {
  const rows = await prisma.leave.groupBy({
    by:    ["leaveTypeId"],
    where: {
      employeeId,
      status: "PENDING",
      leaveTypeId: leaveTypeId ?? { not: null },
      startDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
    },
    _sum: { totalDays: true },
  });
  return Object.fromEntries(rows.map((r) => [r.leaveTypeId, Number(r._sum.totalDays ?? 0)]));
};

const findById = (id) =>
  prisma.leaveQuota.findUnique({ where: { id }, include: INCLUDE });

const upsert = (employeeId, leaveTypeId, year, totalDays) =>
  prisma.leaveQuota.upsert({
    where:  { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    create: { employeeId, leaveTypeId, year, totalDays, usedDays: 0 },
    update: { totalDays },
    include: INCLUDE,
  });

const incrementUsed = (employeeId, leaveTypeId, year, days) =>
  prisma.leaveQuota.update({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    data:  { usedDays: { increment: days } },
    include: INCLUDE,
  });

const decrementUsed = (employeeId, leaveTypeId, year, days) =>
  prisma.leaveQuota.update({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    data:  { usedDays: { decrement: days } },
    include: INCLUDE,
  });

module.exports = { findAll, count, findMany, findOne, sumPendingDays, findById, upsert, incrementUsed, decrementUsed };
