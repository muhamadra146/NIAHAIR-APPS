const prisma = require("../../config/prisma");

const INCLUDE = {
  employee: { select: { id: true, name: true, employeeCode: true, role: { select: { id: true, name: true } } } },
  branch:   { select: { id: true, code: true, name: true } },
  reviewer: { select: { id: true, employee: { select: { name: true } } } },
};

const normalize = (row) => {
  if (!row?.reviewer) return row;
  return { ...row, reviewer: { id: row.reviewer.id, name: row.reviewer.employee?.name ?? null } };
};

const findAll = async ({ skip, take, where }) => {
  const rows = await prisma.sickLeave.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" }, skip, take });
  return rows.map(normalize);
};

const count = (where) => prisma.sickLeave.count({ where });

const findById = async (id) => {
  const row = await prisma.sickLeave.findUnique({ where: { id }, include: INCLUDE });
  return normalize(row);
};

const create = async (data) => {
  const row = await prisma.sickLeave.create({ data, include: INCLUDE });
  return normalize(row);
};

const update = async (id, data) => {
  const row = await prisma.sickLeave.update({ where: { id }, data, include: INCLUDE });
  return normalize(row);
};

// Count no-letter sick leaves for an employee in a given year (APPROVED or PENDING)
const countNoLetterInYear = (employeeId, year) =>
  prisma.sickLeave.count({
    where: {
      employeeId,
      hasLetter: false,
      status:    { in: ["APPROVED", "PENDING"] },
      startDate: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt:  new Date(Date.UTC(year + 1, 0, 1)),
      },
    },
  });

/** Laporan sakit PENDING/APPROVED milik karyawan yang beririsan dengan rentang [start, end] */
const findOverlapping = (employeeId, start, end) =>
  prisma.sickLeave.findFirst({
    where:  { employeeId, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: end }, endDate: { gte: start } },
    select: { id: true, startDate: true, endDate: true, status: true },
  });

module.exports = { findAll, count, findById, create, update, countNoLetterInYear, findOverlapping };
