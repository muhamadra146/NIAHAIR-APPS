const prisma = require("../../config/prisma");

const INCLUDE = {
  employee: {
    select: {
      id: true, name: true, employeeCode: true,
      role:       { select: { id: true, code: true, name: true } },
      homeBranch: { select: { id: true, code: true, name: true } },
    },
  },
  leaveType: { select: { id: true, code: true, name: true, isPaid: true } },
};

const findAll = ({ skip, take, where }) =>
  prisma.leave.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" }, skip, take });

const count = (where) => prisma.leave.count({ where });

const findById = (id) =>
  prisma.leave.findUnique({ where: { id }, include: INCLUDE });

const create = (data) =>
  prisma.leave.create({ data, include: INCLUDE });

const update = (id, data) =>
  prisma.leave.update({ where: { id }, data, include: INCLUDE });

module.exports = { findAll, count, findById, create, update };
