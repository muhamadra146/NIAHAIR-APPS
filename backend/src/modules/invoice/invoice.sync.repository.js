const prisma = require("../../config/prisma");

const findInvoiceForSync = (id) =>
  prisma.invoice.findUnique({
    where: { id },
    select: {
      id:                true,
      invoiceNo:         true,
      invoiceDate:       true,
      notes:             true,
      branchId:          true,
      accurateInvoiceId: true,
      customer: {
        select: {
          customerNo:         true,
          accurateCustomerId: true,
        },
      },
      items: {
        select: {
          id:       true,
          qty:      true,
          price:    true,
          discount: true,
          item: {
            select: {
              id:             true,
              itemCode:       true,
              accurateItemId: true,
              itemType:       true,
            },
          },
          unit: {
            select: {
              id:             true,
              name:           true,
              accurateUnitId: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      invoiceDeposits: {
        select: {
          amountApplied: true,
          deposit: {
            select: {
              id:                    true,
              accurateDepositId:     true,
              accurateDepositNumber: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

const markInvoiceSynced = ({ id, accurateInvoiceId, accurateInvoiceNumber }) =>
  prisma.invoice.update({
    where: { id },
    data: {
      accurateInvoiceId,
      accurateInvoiceNumber,
      lastSyncAt: new Date(),
    },
  });

const markInvoiceItemSynced = (id, accurateInvoiceDetailId) =>
  prisma.invoiceItem.update({
    where: { id },
    data: { accurateInvoiceDetailId },
  });

module.exports = { findInvoiceForSync, markInvoiceSynced, markInvoiceItemSynced };
