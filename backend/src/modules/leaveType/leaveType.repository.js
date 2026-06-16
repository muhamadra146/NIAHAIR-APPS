const prisma = require("../../config/prisma");

const findAll = (where = {}) =>
  prisma.leaveType.findMany({ where, orderBy: { name: "asc" } });

const findById = (id) =>
  prisma.leaveType.findUnique({ where: { id } });

const findByCode = (code) =>
  prisma.leaveType.findUnique({ where: { code } });

const create = (data) => prisma.leaveType.create({ data });

const update = (id, data) => prisma.leaveType.update({ where: { id }, data });

module.exports = { findAll, findById, findByCode, create, update };
