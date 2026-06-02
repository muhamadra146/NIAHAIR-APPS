const prisma = require("../../config/prisma");

const INCLUDE = {
  employee:           { select: { id: true, name: true } },
  commissionCategory: { select: { id: true, code: true, name: true } },
};

const findAll = ({ skip, take, where }) =>
  prisma.commissionRule.findMany({
    skip, take, where,
    orderBy: { createdAt: "desc" },
    include: INCLUDE,
  });

const count = (where) => prisma.commissionRule.count({ where });

const findById = (id) =>
  prisma.commissionRule.findUnique({ where: { id }, include: INCLUDE });

const findActiveByEmployeeAndCategory = (employeeId, commissionCategoryId) =>
  prisma.commissionRule.findFirst({
    where: { employeeId, commissionCategoryId, isActive: true },
    select: { id: true },
  });

const findEmployeeById = (id) =>
  prisma.employee.findUnique({ where: { id }, select: { id: true, name: true } });

const findCommissionCategoryById = (id) =>
  prisma.commissionCategory.findUnique({ where: { id }, select: { id: true, code: true, name: true } });

const create = (data) => prisma.commissionRule.create({ data, include: INCLUDE });

const update = (id, data) => prisma.commissionRule.update({ where: { id }, data, include: INCLUDE });

module.exports = {
  findAll,
  count,
  findById,
  findActiveByEmployeeAndCategory,
  findEmployeeById,
  findCommissionCategoryById,
  create,
  update,
};
