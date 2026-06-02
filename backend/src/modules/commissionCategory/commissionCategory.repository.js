const prisma = require("../../config/prisma");

const findAll = ({ skip, take, where }) =>
  prisma.commissionCategory.findMany({
    skip, take, where,
    orderBy: { createdAt: "desc" },
  });

const count = (where) => prisma.commissionCategory.count({ where });

const findById = (id) => prisma.commissionCategory.findUnique({ where: { id } });

const findByCode = (code) => prisma.commissionCategory.findUnique({ where: { code } });

const create = (data) => prisma.commissionCategory.create({ data });

const update = (id, data) => prisma.commissionCategory.update({ where: { id }, data });

module.exports = { findAll, count, findById, findByCode, create, update };
