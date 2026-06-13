const prisma = require("../../config/prisma");

const INCLUDE = {
  staffSchedule: {
    include: {
      shift: { select: { id: true, code: true, name: true, startTime: true, endTime: true } },
    },
  },
  employee: {
    select: {
      id: true, name: true, employeeCode: true,
      role: { select: { id: true, code: true, name: true } },
    },
  },
  branch: { select: { id: true, code: true, name: true } },
};

const findMany = ({ skip, take, where }) =>
  prisma.attendance.findMany({
    skip, take, where,
    orderBy: { workDate: "desc" },
    include: INCLUDE,
  });

const count = (where) => prisma.attendance.count({ where });

const findById = (id) =>
  prisma.attendance.findUnique({ where: { id }, include: INCLUDE });

const findBySchedule = (staffScheduleId) =>
  prisma.attendance.findUnique({ where: { staffScheduleId }, include: INCLUDE });

const findByEmployeeAndDate = (employeeId, workDate) =>
  prisma.attendance.findMany({
    where: { employeeId, workDate },
    include: INCLUDE,
  });

const create = (data) =>
  prisma.attendance.create({ data, include: INCLUDE });

const update = (id, data) =>
  prisma.attendance.update({ where: { id }, data, include: INCLUDE });

const upsertBySchedule = (staffScheduleId, createData, updateData) =>
  prisma.attendance.upsert({
    where:  { staffScheduleId },
    create: createData,
    update: updateData,
    include: INCLUDE,
  });

module.exports = { findMany, count, findById, findBySchedule, findByEmployeeAndDate, create, update, upsertBySchedule };
