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
      items: {
        select: {
          id:                      true,
          qty:                     true,
          price:                   true,
          discount:                true,
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

  if (!invoice) return null;

  // discountType column exists in DB (migration applied) but not yet in Prisma client
  // (pending prisma generate). Read it via raw SQL and merge into items.
  const rawItems = await prisma.$queryRaw`
    SELECT id, "discountType" FROM invoice_items WHERE "invoiceId" = ${id}
  `;
  const discountTypeMap = Object.fromEntries(rawItems.map((r) => [r.id, r.discountType]));
  invoice.items = invoice.items.map((item) => ({
    ...item,
    discountType: discountTypeMap[item.id] ?? "AMOUNT",
  }));

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
