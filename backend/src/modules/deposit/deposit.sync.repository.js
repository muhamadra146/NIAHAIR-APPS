const prisma = require("../../config/prisma");

// Minimal select — only fields needed for Accurate sync payload and guards.
const findDepositForSync = (id) =>
  prisma.deposit.findUnique({
    where: { id },
    select: {
      id:                    true,
      amount:                true,
      paidAt:                true,
      notes:                 true,
      accurateDepositId:     true,
      appointment: {
        select: {
          bookingNo: true,
          customer: {
            select: {
              customerNo:         true,
              accurateCustomerId: true,
            },
          },
        },
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
