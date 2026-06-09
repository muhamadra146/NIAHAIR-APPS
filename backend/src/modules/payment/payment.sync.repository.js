const prisma = require("../../config/prisma");

const findPaymentForSync = (id) =>
  prisma.payment.findUnique({
    where: { id },
    select: {
      id:                true,
      paymentNo:         true,
      amount:            true,
      paymentDate:       true,
      notes:             true,
      accurateReceiptId: true,
      invoice: {
        select: {
          id:                    true,
          invoiceNo:             true,
          notes:                 true,
          accurateInvoiceId:     true,
          accurateInvoiceNumber: true,
          customer: {
            select: {
              accurateCustomerId: true,
              customerNo:         true,
            },
          },
        },
      },
      paymentMethod: {
        select: {
          id:   true,
          name: true,
          code: true,
          cashAccount: {
            select: {
              id:                true,
              accurateAccountId: true,
              accurateAccountNo: true,
            },
          },
        },
      },
    },
  });

const markPaymentSynced = ({ id, accurateReceiptId, accurateReceiptNumber }) =>
  prisma.payment.update({
    where: { id },
    data: {
      accurateReceiptId,
      accurateReceiptNumber,
      lastSyncAt: new Date(),
    },
  });

module.exports = { findPaymentForSync, markPaymentSynced };
