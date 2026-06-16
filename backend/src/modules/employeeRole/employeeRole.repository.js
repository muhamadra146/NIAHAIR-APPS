const prisma = require("../../config/prisma");

const findAll = ({ skip, take, where }) =>
  prisma.employeeRole.findMany({
    skip,
    take,
    where,
    orderBy: { createdAt: "desc" },
  });

const count = (where) => prisma.employeeRole.count({ where });

const findById = (id) =>
  prisma.employeeRole.findUnique({ where: { id } });

const findByCode = (code) =>
  prisma.employeeRole.findUnique({ where: { code } });

const create = (data) => prisma.employeeRole.create({ data });

const update = (id, data) =>
  prisma.employeeRole.update({ where: { id }, data });

const remove = (id) => prisma.employeeRole.delete({ where: { id } });

const countEmployees = (roleId) => prisma.employee.count({ where: { roleId } });

module.exports = { findAll, count, findById, findByCode, create, update, remove, countEmployees };
