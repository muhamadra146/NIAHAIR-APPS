const prisma = require("../../config/prisma");

const findAll = ({ skip, take, where }) =>
  prisma.userRole.findMany({ skip, take, where, orderBy: { createdAt: "desc" } });

const count = (where) => prisma.userRole.count({ where });

const findById = (id) =>
  prisma.userRole.findUnique({ where: { id } });

const findByCode = (code) =>
  prisma.userRole.findUnique({ where: { code } });

const create = (data) => prisma.userRole.create({ data });

const update = (id, data) =>
  prisma.userRole.update({ where: { id }, data });

const deactivate = (id) =>
  prisma.userRole.update({ where: { id }, data: { isActive: false } });

module.exports = { findAll, count, findById, findByCode, create, update, deactivate };
