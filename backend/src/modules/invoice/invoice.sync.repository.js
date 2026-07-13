const prisma = require("../../config/prisma");

const findInvoiceForSync = async (id) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: {
      id:                true,
      invoiceNo:         true,
      invoiceDate:       true,
      notes:             true,
      branchId:          true,
      accurateInvoiceId: true,
      taxable:           true,
      inclusiveTax:      true,
      customer: {
        select: {
          customerNo:         true,
          accurateCustomerId: true,
        },
      },
      membershipDiscountTotal: true,
      membershipId:            true,
      membership: {
        select: { discountType: true },
      },
      items: {
        select: {
          id:                      true,
          qty:                     true,
          price:                   true,
          discount:                true,
          discountType:            true,
          taxable:                 true,
          accurateInvoiceDetailId: true,
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
      treatmentSessions: {
        select: {
          treatmentItems: {
            select: {
              materialUsages: {
                select: {
                  usageItems: {
                    select: {
                      qty: true,
                      materialItem: {
                        select: {
                          itemCode:       true,
                          accurateItemId: true,
                        },
                      },
                      unit: {
                        select: {
                          name:           true,
                          accurateUnitId: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
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

  return invoice;
};

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
