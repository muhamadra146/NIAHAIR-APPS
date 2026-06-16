const prisma = require("../../config/prisma");

const INCLUDE = {
  employee:      { select: { id: true, name: true, employeeCode: true } },
  staffSchedule: { select: { id: true, workDate: true, shiftStart: true, shiftEnd: true } },
  attendance:    { select: { id: true, checkIn: true, checkOut: true } },
  reviewer:      { select: { id: true, name: true } },
};

const findAll = ({ skip, take, where }) =>
  prisma.attendanceCorrectionRequest.findMany({
    where,
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

const count = (where) => prisma.attendanceCorrectionRequest.count({ where });

const findById = (id) =>
  prisma.attendanceCorrectionRequest.findUnique({ where: { id }, include: INCLUDE });

const create = (data) =>
  prisma.attendanceCorrectionRequest.create({ data, include: INCLUDE });

const update = (id, data) =>
  prisma.attendanceCorrectionRequest.update({ where: { id }, data, include: INCLUDE });

module.exports = { findAll, count, findById, create, update };
