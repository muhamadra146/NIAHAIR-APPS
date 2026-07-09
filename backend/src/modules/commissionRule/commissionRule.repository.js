const prisma = require("../../config/prisma");

const INCLUDE = {
  employee:           { select: { id: true, name: true } },
  commissionCategory: { select: { id: true, code: true, name: true } },
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

const findDuplicate = (employeeId, commissionCategoryId, slotKey, effectiveDate) =>
  prisma.commissionRule.findFirst({
    where: {
      employeeId,
      commissionCategoryId,
      slotKey:       slotKey ?? null,
      effectiveDate: new Date(effectiveDate),
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
  findDuplicate,
  findEmployeeById,
  findCommissionCategoryById,
  create,
  update,
  deleteById,
};
