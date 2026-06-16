const prisma = require("../../config/prisma");

const INCLUDE = {
  leaveType: { select: { id: true, code: true, name: true, maxDaysPerYear: true, isPaid: true } },
  employee:  { select: { id: true, name: true, employeeCode: true } },
};

const findMany = (where) =>
  prisma.leaveQuota.findMany({ where, include: INCLUDE, orderBy: [{ year: "desc" }, { leaveType: { name: "asc" } }] });

const findOne = (employeeId, leaveTypeId, year) =>
  prisma.leaveQuota.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    include: INCLUDE,
  });

const findById = (id) =>
  prisma.leaveQuota.findUnique({ where: { id }, include: INCLUDE });

const upsert = (employeeId, leaveTypeId, year, totalDays) =>
  prisma.leaveQuota.upsert({
    where:  { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    create: { employeeId, leaveTypeId, year, totalDays, usedDays: 0 },
    update: { totalDays },
    include: INCLUDE,
  });

const incrementUsed = (employeeId, leaveTypeId, year, days) =>
  prisma.leaveQuota.update({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    data:  { usedDays: { increment: days } },
    include: INCLUDE,
  });

const decrementUsed = (employeeId, leaveTypeId, year, days) =>
  prisma.leaveQuota.update({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    data:  { usedDays: { decrement: days } },
    include: INCLUDE,
  });

module.exports = { findMany, findOne, findById, upsert, incrementUsed, decrementUsed };
