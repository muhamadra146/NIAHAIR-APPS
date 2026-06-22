const prisma = require("../../config/prisma");

const findAll = ({ year }) =>
  prisma.holiday.findMany({
    where: year ? { year: Number(year) } : undefined,
    orderBy: { date: "asc" },
  });

const findById = (id) =>
  prisma.holiday.findUnique({ where: { id } });

const findByDate = (date) =>
  prisma.holiday.findUnique({ where: { date } });

const findInRange = (start, end) =>
  prisma.holiday.findMany({
    where: { date: { gte: start, lte: end } },
    select: { date: true },
  });

const create = (data) =>
  prisma.holiday.create({ data });

const update = (id, data) =>
  prisma.holiday.update({ where: { id }, data });

const remove = (id) =>
  prisma.holiday.delete({ where: { id } });

module.exports = { findAll, findById, findByDate, findInRange, create, update, remove };
