const prisma = require("../../config/prisma");

// Match ONLY on accurateItemId — never on name, code, or type.
const findByAccurateId = (accurateId) =>
  prisma.item.findUnique({
    where: { accurateItemId: accurateId },
    select: { id: true },
  });

const createFromAccurate = (data) => prisma.item.create({ data });

const updateByAccurateId = (accurateItemId, data) =>
  prisma.item.update({ where: { accurateItemId }, data });

module.exports = { findByAccurateId, createFromAccurate, updateByAccurateId };
