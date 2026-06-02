const prisma = require("../../config/prisma");

const findAll = ({ skip, take, where }) =>
  prisma.item.findMany({
    skip,
    take,
    where,
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { id: true, name: true } },
      defaultUnit: { select: { id: true, name: true } },
    },
  });

const count = (where) => prisma.item.count({ where });

const findById = (id) =>
  prisma.item.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      defaultUnit: { select: { id: true, name: true } },
    },
  });

const findByItemCode = (itemCode) =>
  prisma.item.findUnique({ where: { itemCode } });

const create = (data) => prisma.item.create({ data });

const update = (id, data) => prisma.item.update({ where: { id }, data });

module.exports = { findAll, count, findById, findByItemCode, create, update };
