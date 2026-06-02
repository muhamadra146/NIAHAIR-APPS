const prisma = require("../../config/prisma");

// Match ONLY on accurateUnitId — never on name.
const findByAccurateId = (accurateId) =>
  prisma.unit.findUnique({
    where: { accurateUnitId: accurateId },
    select: { id: true },
  });

const createFromAccurate = (data) => prisma.unit.create({ data });

const updateByAccurateId = (accurateUnitId, data) =>
  prisma.unit.update({ where: { accurateUnitId }, data });

module.exports = { findByAccurateId, createFromAccurate, updateByAccurateId };
