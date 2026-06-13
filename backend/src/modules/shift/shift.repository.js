const prisma = require("../../config/prisma");

const findAll = ({ where = {} } = {}) =>
  prisma.shift.findMany({ where, orderBy: [{ isWorking: "desc" }, { code: "asc" }] });

const findById = (id) => prisma.shift.findUnique({ where: { id } });

const findByCode = (code) => prisma.shift.findUnique({ where: { code } });

const create = (data) => prisma.shift.create({ data });

const update = (id, data) => prisma.shift.update({ where: { id }, data });

const isShiftUsed = async (id) => {
  const count = await prisma.staffSchedule.count({ where: { shiftId: id } });
  return count > 0;
};

const findUsedShiftIds = async () => {
  const rows = await prisma.staffSchedule.findMany({
    where:    { shiftId: { not: null } },
    select:   { shiftId: true },
    distinct: ["shiftId"],
  });
  return new Set(rows.map((r) => r.shiftId));
};

module.exports = { findAll, findById, findByCode, create, update, isShiftUsed, findUsedShiftIds };
