const prisma = require("../../config/prisma");

const INCLUDE = {
  employee: { select: { id: true, name: true, employeeCode: true, role: { select: { id: true, name: true } } } },
  branch:   { select: { id: true, code: true, name: true } },
  reviewer: { select: { id: true, name: true } },
};

const findAll = ({ skip, take, where }) =>
  prisma.sickLeave.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" }, skip, take });

const count = (where) => prisma.sickLeave.count({ where });

const findById = (id) =>
  prisma.sickLeave.findUnique({ where: { id }, include: INCLUDE });

const create = (data) =>
  prisma.sickLeave.create({ data, include: INCLUDE });

const update = (id, data) =>
  prisma.sickLeave.update({ where: { id }, data, include: INCLUDE });

// Count no-letter sick leaves for an employee in a given year (APPROVED or PENDING)
const countNoLetterInYear = (employeeId, year) =>
  prisma.sickLeave.count({
    where: {
      employeeId,
      hasLetter: false,
      status:    { in: ["APPROVED", "PENDING"] },
      startDate: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt:  new Date(Date.UTC(year + 1, 0, 1)),
      },
    },
  });

module.exports = { findAll, count, findById, create, update, countNoLetterInYear };
