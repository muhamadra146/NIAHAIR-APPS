const prisma = require("../../config/prisma");

const INCLUDE = {
  paymentMethods: {
    where:  { isActive: true },
    select: { id: true, code: true, name: true },
  },
};

const findAll = ({ skip, take, where }) =>
  prisma.cashAccount.findMany({ skip, take, where, orderBy: { name: "asc" }, include: INCLUDE });

const count = (where) => prisma.cashAccount.count({ where });

const findById = (id) =>
  prisma.cashAccount.findUnique({ where: { id }, include: INCLUDE });

const findByCode = (code) =>
  prisma.cashAccount.findUnique({ where: { code } });

const findByAccurateAccountId = (accurateAccountId) =>
  prisma.cashAccount.findFirst({ where: { accurateAccountId, isActive: true }, include: INCLUDE });

const create = (data) =>
  prisma.cashAccount.create({ data, include: INCLUDE });

const update = (id, data) =>
  prisma.cashAccount.update({ where: { id }, data, include: INCLUDE });

const remove = (id) =>
  prisma.cashAccount.delete({ where: { id } });

module.exports = { findAll, count, findById, findByCode, findByAccurateAccountId, create, update, remove };
