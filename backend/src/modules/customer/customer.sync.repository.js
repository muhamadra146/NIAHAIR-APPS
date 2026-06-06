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

// Soft-delete local customers whose accurateCustomerId is no longer present
// in the Accurate sync list. Hard delete is forbidden — customers have
// relations (appointments, invoices, deposits, payments) that must be preserved.
const deactivateMissingFromAccurate = (accurateCustomerIds) =>
  prisma.customer.updateMany({
    where: {
      accurateCustomerId: { not: null, notIn: accurateCustomerIds },
      isActive: true,
    },
    data: { isActive: false },
  });

module.exports = {
  findByAccurateId,
  createFromAccurate,
  updateByAccurateId,
  deactivateMissingFromAccurate,
};
