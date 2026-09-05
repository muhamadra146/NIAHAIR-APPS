const prisma = require("../../config/prisma");

const findAll = ({ skip = 0, take = 10, where = {} } = {}) =>
  prisma.shift.findMany({ where, skip, take, orderBy: [{ isWorking: "desc" }, { code: "asc" }] });

const count = (where = {}) => prisma.shift.count({ where });

const findById = (id) => prisma.shift.findUnique({ where: { id } });

const findByCode = (code) => prisma.shift.findUnique({ where: { code } });

const create = (data) => prisma.shift.create({ data });

const update = (id, data) => prisma.shift.update({ where: { id }, data });

const isShiftUsed = async (id) => {
  const c = await prisma.staffSchedule.count({ where: { shiftId: id } });
  return c > 0;
};

const findUsedShiftIds = async () => {
  const rows = await prisma.staffSchedule.findMany({
    where:    { shiftId: { not: null } },
    select:   { shiftId: true },
    distinct: ["shiftId"],
  });
  return new Set(rows.map((r) => r.shiftId));
};

const softDelete = (id) => prisma.shift.update({ where: { id }, data: { isActive: false } });

const hardDelete = (id) => prisma.shift.delete({ where: { id } });

module.exports = { findAll, count, findById, findByCode, create, update, isShiftUsed, findUsedShiftIds, softDelete, hardDelete };
