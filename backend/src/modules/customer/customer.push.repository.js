const prisma = require("../../config/prisma");

const updateAfterPush = (id, { accurateCustomerId, customerNo }) =>
  prisma.customer.update({
    where: { id },
    data: { accurateCustomerId, customerNo, lastSyncAt: new Date() },
  });

module.exports = { updateAfterPush };
