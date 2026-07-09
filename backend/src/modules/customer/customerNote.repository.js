const prisma = require("../../config/prisma");

const findAllByCustomer = (customerId) =>
  prisma.customerNote.findMany({
    where:   { customerId },
    orderBy: { createdAt: "desc" },
  });

const create = (data) => prisma.customerNote.create({ data });

const findById = (id) => prisma.customerNote.findUnique({ where: { id } });

const remove = (id) => prisma.customerNote.delete({ where: { id } });

module.exports = { findAllByCustomer, create, findById, remove };
