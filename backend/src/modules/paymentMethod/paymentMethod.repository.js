const prisma = require("../../config/prisma");

const CASH_ACCOUNT_SELECT = {
  cashAccount: {
    select: {
      id:                true,
      name:              true,
      code:              true,
      accurateAccountId: true,
      accurateAccountNo: true,
    },
  },
};

const findAll = ({ skip, take, where }) =>
  prisma.paymentMethod.findMany({ skip, take, where, orderBy: { name: "asc" }, include: CASH_ACCOUNT_SELECT });

const count = (where) => prisma.paymentMethod.count({ where });

const findById = (id) =>
  prisma.paymentMethod.findUnique({ where: { id }, include: CASH_ACCOUNT_SELECT });

const findByCode = (code) =>
  prisma.paymentMethod.findUnique({ where: { code }, include: CASH_ACCOUNT_SELECT });

const create = (data) =>
  prisma.paymentMethod.create({ data, include: CASH_ACCOUNT_SELECT });

const update = (id, data) =>
  prisma.paymentMethod.update({ where: { id }, data, include: CASH_ACCOUNT_SELECT });

module.exports = { findAll, count, findById, findByCode, create, update };
