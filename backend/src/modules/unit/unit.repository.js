const prisma = require("../../config/prisma");

const findAll = ({ skip, take, where }) =>
  prisma.unit.findMany({
    skip, take, where,
    orderBy: { createdAt: "desc" },
  });

const count = (where) => prisma.unit.count({ where });

const findById = (id) => prisma.unit.findUnique({ where: { id } });

module.exports = { findAll, count, findById };
