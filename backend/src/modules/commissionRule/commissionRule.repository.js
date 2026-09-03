const prisma = require("../../config/prisma");

const INCLUDE = {
  employee:           { select: { id: true, name: true } },
  commissionCategory: { select: { id: true, code: true, name: true } },
  commissionJob:      { select: { id: true, name: true, jobKey: true } },
};

const findAll = ({ skip, take, where, orderBy }) =>
  prisma.commissionRule.findMany({
    skip, take, where,
    orderBy: orderBy ?? { createdAt: "desc" },
    include: INCLUDE,
  });

const count = (where) => prisma.commissionRule.count({ where });

const findById = (id) =>
  prisma.commissionRule.findUnique({ where: { id }, include: INCLUDE });

const findActiveByEmployeeAndCategory = (employeeId, commissionCategoryId, slotKey) =>
  prisma.commissionRule.findFirst({
    where: {
      employeeId,
      commissionCategoryId,
      isActive: true,
      slotKey:  slotKey ?? null,
    },
    select: { id: true },
  });

// asOfDate: tanggal invoice — pastikan rule sudah berlaku dan belum expired
// (konsisten dengan _buildCategoryJobRows di commission.service.js)
const findActiveByEmployeeAndJob = (employeeId, commissionCategoryId, commissionJobId, asOfDate = new Date()) =>
  prisma.commissionRule.findFirst({
    where: {
      employeeId, commissionCategoryId, commissionJobId, isActive: true,
      effectiveDate: { lte: asOfDate },
      OR: [{ endDate: null }, { endDate: { gte: asOfDate } }],
    },
    orderBy: { effectiveDate: "desc" },
    select: {
      id: true,
      commissionType:  true,
      commissionValue: true,
      commissionBase:  true,
    },
  });

const findDuplicate = (employeeId, commissionCategoryId, slotKey, effectiveDate, commissionJobId) =>
  prisma.commissionRule.findFirst({
    where: {
      employeeId,
      commissionCategoryId,
      slotKey:         slotKey         ?? null,
      commissionJobId: commissionJobId ?? null,
      effectiveDate:   new Date(effectiveDate),
    },
    select: { id: true },
  });

const findEmployeeById = (id) =>
  prisma.employee.findUnique({ where: { id }, select: { id: true, name: true } });

const findCommissionCategoryById = (id) =>
  prisma.commissionCategory.findUnique({ where: { id }, select: { id: true, code: true, name: true } });

const create = (data) => prisma.commissionRule.create({ data, include: INCLUDE });

const update = (id, data) => prisma.commissionRule.update({ where: { id }, data, include: INCLUDE });

const deleteById = (id) => prisma.commissionRule.delete({ where: { id } });

module.exports = {
  findAll,
  count,
  findById,
  findActiveByEmployeeAndCategory,
  findActiveByEmployeeAndJob,
  findDuplicate,
  findEmployeeById,
  findCommissionCategoryById,
  create,
  update,
  deleteById,
};
