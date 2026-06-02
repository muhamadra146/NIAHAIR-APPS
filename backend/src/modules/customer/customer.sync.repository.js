const prisma = require("../../config/prisma");

// Match ONLY on accurateCustomerId — never on name, email, phone, or customerNo.
const findByAccurateId = (accurateId) =>
  prisma.customer.findUnique({
    where: { accurateCustomerId: accurateId },
    select: { id: true },
  });

const createFromAccurate = (data) => prisma.customer.create({ data });

const updateByAccurateId = (accurateCustomerId, data) =>
  prisma.customer.update({ where: { accurateCustomerId }, data });

module.exports = { findByAccurateId, createFromAccurate, updateByAccurateId };
