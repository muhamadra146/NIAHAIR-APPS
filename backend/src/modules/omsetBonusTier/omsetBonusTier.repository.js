const prisma = require("../../config/prisma");

const findByEmployee = (employeeId) =>
  prisma.employeeOmsetBonusTier.findMany({
    where:   { employeeId },
    orderBy: { sortOrder: "asc" },
  });

const findById = (id) =>
  prisma.employeeOmsetBonusTier.findUnique({ where: { id } });

const create = (data) =>
  prisma.employeeOmsetBonusTier.create({ data });

const update = (id, data) =>
  prisma.employeeOmsetBonusTier.update({ where: { id }, data });

const remove = (id) =>
  prisma.employeeOmsetBonusTier.delete({ where: { id } });

module.exports = { findByEmployee, findById, create, update, remove };
