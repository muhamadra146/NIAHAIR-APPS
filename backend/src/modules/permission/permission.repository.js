const prisma = require("../../config/prisma");

const INCLUDE = {
  employee: { select: { id: true, name: true, employeeCode: true, role: { select: { id: true, name: true } } } },
  branch:   { select: { id: true, code: true, name: true } },
  reviewer: { select: { id: true, employee: { select: { name: true } } } },
};

// User has no name field — flatten reviewer.employee.name → reviewer.name
const normalize = (row) => {
  if (!row?.reviewer) return row;
  return { ...row, reviewer: { id: row.reviewer.id, name: row.reviewer.employee?.name ?? null } };
};

const findAll = async ({ skip, take, where }) => {
  const rows = await prisma.permissionRequest.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" }, skip, take });
  return rows.map(normalize);
};

const count = (where) => prisma.permissionRequest.count({ where });

const findById = async (id) => {
  const row = await prisma.permissionRequest.findUnique({ where: { id }, include: INCLUDE });
  return normalize(row);
};

const create = async (data) => {
  const row = await prisma.permissionRequest.create({ data, include: INCLUDE });
  return normalize(row);
};

const update = async (id, data) => {
  const row = await prisma.permissionRequest.update({ where: { id }, data, include: INCLUDE });
  return normalize(row);
};

module.exports = { findAll, count, findById, create, update };
