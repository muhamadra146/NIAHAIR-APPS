const prisma = require("../../config/prisma");

const findAll = ({ skip = 0, take = 10, where = {} } = {}) =>
  prisma.leaveType.findMany({ where, skip, take, orderBy: { name: "asc" } });

const count = (where = {}) => prisma.leaveType.count({ where });

const findById = (id) =>
  prisma.leaveType.findUnique({ where: { id } });

const findByCode = (code) =>
  prisma.leaveType.findUnique({ where: { code } });

const create = (data) => prisma.leaveType.create({ data });

const update = (id, data) => prisma.leaveType.update({ where: { id }, data });

module.exports = { findAll, count, findById, findByCode, create, update };
