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

/**
 * Hari cuti MENUNGGU persetujuan untuk banyak kuota sekaligus.
 * @returns {Record<string, number>} kunci "employeeId|leaveTypeId|tahun" (tahun = tahun tanggal mulai)
 */
const sumPendingDaysMany = async (quotas) => {
  const employeeIds = [...new Set(quotas.map((q) => q.employeeId))];
  const years       = quotas.map((q) => q.year);
  const rows = await prisma.leave.findMany({
    where: {
      employeeId:  { in: employeeIds },
      status:      "PENDING",
      leaveTypeId: { not: null },
      startDate:   { gte: new Date(Date.UTC(Math.min(...years), 0, 1)), lt: new Date(Date.UTC(Math.max(...years) + 1, 0, 1)) },
    },
    select: { employeeId: true, leaveTypeId: true, startDate: true, totalDays: true },
  });
  const out = {};
  for (const r of rows) {
    const k = `${r.employeeId}|${r.leaveTypeId}|${new Date(r.startDate).getUTCFullYear()}`;
    out[k] = (out[k] ?? 0) + Number(r.totalDays ?? 0);
  }
  return out;
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

const findEmployeeById = (id) =>
  prisma.employee.findUnique({ where: { id }, select: { id: true } });

module.exports = { findEmployeeById, findAll, count, findMany, findOne, sumPendingDays, sumPendingDaysMany, findById, upsert, incrementUsed, decrementUsed };
