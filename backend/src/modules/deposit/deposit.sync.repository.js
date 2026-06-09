const prisma = require("../../config/prisma");

const findDepositForSync = (id) =>
  prisma.deposit.findUnique({
    where: { id },
    select: {
      id:                    true,
      amount:                true,
      paidAt:                true,
      createdAt:             true,
      notes:                 true,
      accurateDepositId:     true,
      customer: {
        select: {
          customerNo:         true,
          accurateCustomerId: true,
          name:               true,
        },
      },
      appointment: {
        select: { bookingNo: true },
      },
    },
  });

const markDepositSynced = ({ id, accurateDepositId, accurateDepositNumber }) =>
  prisma.deposit.update({
    where: { id },
    data: {
      accurateDepositId,
      accurateDepositNumber,
      lastSyncAt: new Date(),
    },
  });

module.exports = { findDepositForSync, markDepositSynced };
