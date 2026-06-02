const prisma = require("../../config/prisma");

const findAll = ({ skip, take, where }) =>
  prisma.customer.findMany({
    skip,
    take,
    where,
    orderBy: { createdAt: "desc" },
    include: {
      membership: { select: { id: true, name: true } },
    },
  });

const count = (where) => prisma.customer.count({ where });

const findById = (id) =>
  prisma.customer.findUnique({
    where: { id },
    include: {
      membership: { select: { id: true, name: true } },
    },
  });

const findByCustomerNo = (customerNo) =>
  prisma.customer.findUnique({ where: { customerNo } });

const create = (data) => prisma.customer.create({ data });

const update = (id, data) =>
  prisma.customer.update({ where: { id }, data });

module.exports = { findAll, count, findById, findByCustomerNo, create, update };
