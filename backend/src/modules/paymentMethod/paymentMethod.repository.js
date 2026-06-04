const prisma = require("../../config/prisma");

const findAll = ({ skip, take, where }) =>
  prisma.paymentMethod.findMany({ skip, take, where, orderBy: { name: "asc" } });

const count = (where) => prisma.paymentMethod.count({ where });

const findById = (id) =>
  prisma.paymentMethod.findUnique({ where: { id } });

const findByCode = (code) =>
  prisma.paymentMethod.findUnique({ where: { code } });

const create = (data) => prisma.paymentMethod.create({ data });

const update = (id, data) =>
  prisma.paymentMethod.update({ where: { id }, data });

module.exports = { findAll, count, findById, findByCode, create, update };
