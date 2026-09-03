const prisma = require("../../config/prisma");

/**
 * Fetch notes for a customer, newest first.
 * Supports pagination via skip/take (default: latest 50).
 */
const findAllByCustomer = (customerId, { skip = 0, take = 50 } = {}) =>
  prisma.customerNote.findMany({
    where:   { customerId },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

const create = (data) => prisma.customerNote.create({ data });

const findById = (id) => prisma.customerNote.findUnique({ where: { id } });

const update = (id, data) => prisma.customerNote.update({ where: { id }, data });

const remove = (id) => prisma.customerNote.delete({ where: { id } });

module.exports = { findAllByCustomer, create, findById, update, remove };
