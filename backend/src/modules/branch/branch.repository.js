const prisma = require("../../config/prisma");

const findAll = ({ skip, take, where }) =>
  prisma.branch.findMany({
    skip,
    take,
    where,
    orderBy: { createdAt: "desc" },
  });

const count = (where) => prisma.branch.count({ where });

const findById = (id) =>
  prisma.branch.findUnique({ where: { id } });

const findByCode = (code) =>
  prisma.branch.findUnique({ where: { code } });

const create = (data) => prisma.branch.create({ data });

const update = (id, data) =>
  prisma.branch.update({ where: { id }, data });

const softDelete = (id) =>
  prisma.branch.update({ where: { id }, data: { isActive: false } });

const countActiveEmployees = (branchId) =>
  prisma.employee.count({
    where: {
      isActive: true,
      OR: [
        { homeBranchId: branchId },
        { employeeBranches: { some: { branchId, isActive: true } } },
      ],
    },
  });

module.exports = { findAll, count, findById, findByCode, create, update, softDelete, countActiveEmployees };
