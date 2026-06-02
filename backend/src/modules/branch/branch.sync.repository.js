const prisma = require("../../config/prisma");

// Match ONLY on accurateBranchId — never on name or code.
const findByAccurateId = (accurateId) =>
  prisma.branch.findUnique({
    where: { accurateBranchId: accurateId },
    select: { id: true },
  });

const createFromAccurate = (data) => prisma.branch.create({ data });

const updateByAccurateId = (accurateBranchId, data) =>
  prisma.branch.update({ where: { accurateBranchId }, data });

module.exports = { findByAccurateId, createFromAccurate, updateByAccurateId };
