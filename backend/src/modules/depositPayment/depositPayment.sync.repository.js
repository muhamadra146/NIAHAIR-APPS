const prisma = require("../../config/prisma");

const findDepositPaymentForSync = (id) =>
  prisma.depositPayment.findUnique({
    where: { id },
    select: {
      id:                true,
      paymentNo:         true,
      amount:            true,
      paidAt:            true,
      notes:             true,
      accurateReceiptId: true,
      deposit: {
        select: {
          id:                    true,
          accurateDepositId:     true,
          accurateDepositNumber: true,
          customer: {
            select: { customerNo: true, accurateCustomerId: true },
          },
        },
      },
      paymentMethod: {
        select: {
          id:   true,
          name: true,
          code: true,
          cashAccount: {
            select: { id: true, accurateAccountId: true, accurateAccountNo: true },
          },
        },
      },
    },
  });

const markDepositPaymentSynced = ({ id, accurateReceiptId, accurateReceiptNumber }) =>
  prisma.depositPayment.update({
    where: { id },
    data: {
      accurateReceiptId,
      accurateReceiptNumber,
      lastSyncAt: new Date(),
    },
  });

module.exports = { findDepositPaymentForSync, markDepositPaymentSynced };
