const prisma = require("../../config/prisma");

const INCLUDE = {
  employee:      { select: { id: true, name: true, employeeCode: true } },
  staffSchedule: { select: { id: true, workDate: true, shiftStart: true, shiftEnd: true } },
  attendance:    { select: { id: true, checkIn: true, checkOut: true } },
  reviewer:      { select: { id: true, employee: { select: { name: true } } } },
};

const normalize = (row) => {
  if (!row?.reviewer) return row;
  return { ...row, reviewer: { id: row.reviewer.id, name: row.reviewer.employee?.name ?? null } };
};

const findAll = async ({ skip, take, where }) => {
  const rows = await prisma.attendanceCorrectionRequest.findMany({
    where,
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
  return rows.map(normalize);
};

const count = (where) => prisma.attendanceCorrectionRequest.count({ where });

const findById = async (id) => {
  const row = await prisma.attendanceCorrectionRequest.findUnique({ where: { id }, include: INCLUDE });
  return normalize(row);
};

const create = async (data) => {
  const row = await prisma.attendanceCorrectionRequest.create({ data, include: INCLUDE });
  return normalize(row);
};

const update = async (id, data) => {
  const row = await prisma.attendanceCorrectionRequest.update({ where: { id }, data, include: INCLUDE });
  return normalize(row);
};

module.exports = { findAll, count, findById, create, update };
