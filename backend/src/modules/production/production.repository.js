const prisma = require("../../config/prisma");

// ── Include ───────────────────────────────────────────────────────────────────

const INCLUDE = {
  branch:    { select: { id: true, name: true, code: true } },
  warehouse: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, employeeCode: true } },
  items: {
    include: {
      item: { select: { id: true, name: true, itemCode: true, itemType: true } },
      unit: { select: { id: true, name: true } },
    },
  },
  materials: {
    include: {
      item:      { select: { id: true, name: true, itemCode: true, itemType: true } },
      unit:      { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } },
    },
  },
  employees: {
    include: {
      employee: { select: { id: true, name: true, employeeCode: true } },
    },
  },
  qcRecords: {
    include: {
      qcEmployee: { select: { id: true, name: true, employeeCode: true } },
    },
    orderBy: { createdAt: "desc" },
  },
  timelines: {
    include: {
      createdBy: { select: { id: true, name: true, employeeCode: true } },
    },
    orderBy: { createdAt: "asc" },
  },
};

const INCLUDE_LIST = {
  branch:    { select: { id: true, name: true, code: true } },
  warehouse: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, employeeCode: true } },
  _count: { select: { items: true, materials: true } },
};

// ── Queries ───────────────────────────────────────────────────────────────────

const findAll = ({ skip, take, where }) =>
  prisma.productionOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    include: INCLUDE_LIST,
  });

const count = (where) => prisma.productionOrder.count({ where });

const findById = (id) =>
  prisma.productionOrder.findUnique({ where: { id }, include: INCLUDE });

const findByProductionNo = (productionNo) =>
  prisma.productionOrder.findUnique({ where: { productionNo } });

const create = (data, tx = prisma) =>
  tx.productionOrder.create({ data, include: INCLUDE });

const update = (id, data, tx = prisma) =>
  tx.productionOrder.update({ where: { id }, data, include: INCLUDE });

const remove = (id, tx = prisma) =>
  tx.productionOrder.delete({ where: { id } });

// ── Production number sequence ─────────────────────────────────────────────────

const findMaxSeqToday = async (prefix, tx = prisma) => {
  const last = await tx.productionOrder.findFirst({
    where:   { productionNo: { startsWith: prefix } },
    orderBy: { productionNo: "desc" },
    select:  { productionNo: true },
  });
  if (!last) return 0;
  const seq = parseInt(last.productionNo.slice(prefix.length), 10);
  return isNaN(seq) ? 0 : seq;
};

// ── Items / Materials ─────────────────────────────────────────────────────────

const createItems = (items, tx = prisma) =>
  tx.productionItem.createMany({ data: items });

const createMaterials = (materials, tx = prisma) =>
  tx.productionMaterial.createMany({ data: materials });

const createEmployees = (employees, tx = prisma) =>
  tx.productionEmployee.createMany({ data: employees });

const addTimeline = (data, tx = prisma) =>
  tx.productionTimeline.create({ data });

module.exports = {
  findAll, count, findById, findByProductionNo,
  create, update, remove,
  findMaxSeqToday,
  createItems, createMaterials, createEmployees, addTimeline,
};
