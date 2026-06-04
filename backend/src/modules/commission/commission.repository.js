const prisma = require("../../config/prisma");

// ── Transaction helper ────────────────────────────────────────────────
// Exposes the Prisma transaction runner so the service never imports
// prisma directly (per architecture rule: only repository accesses Prisma).

const withTransaction = (fn) => prisma.$transaction(fn);

// ── Invoice fetch for generation ──────────────────────────────────────

const findInvoiceForGeneration = (invoiceId, tx) => {
  const client = tx ?? prisma;
  return client.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id:     true,
      status: true,
      items: {
        select: {
          id:       true,
          itemId:   true,
          qty:      true,
          price:    true,
          subtotal: true,
        },
      },
      treatmentSessions: {
        select: {
          id: true,
          treatmentItems: {
            select: {
              id:                  true,
              itemId:              true,
              qty:                 true,
              priceSnapshot:       true,
              conversionSnapshot:  true,
              item: {
                select: {
                  id:                   true,
                  commissionCategoryId: true,
                },
              },
              assignments: {
                select: {
                  id:         true,
                  employeeId: true,
                  workQty:    true,
                },
              },
            },
          },
        },
      },
    },
  });
};

// ── Commission rule lookup for generator ──────────────────────────────

const findActiveRuleForGeneration = (employeeId, commissionCategoryId, tx) => {
  const client = tx ?? prisma;
  return client.commissionRule.findFirst({
    where:  { employeeId, commissionCategoryId, isActive: true },
    select: {
      id:              true,
      commissionType:  true,
      commissionValue: true,
      commissionBase:  true,
    },
  });
};

// ── Duplicate guard ───────────────────────────────────────────────────

const countByInvoice = (invoiceId, tx) => {
  const client = tx ?? prisma;
  return client.commission.count({ where: { invoiceId } });
};

// ── Bulk insert ───────────────────────────────────────────────────────

const bulkCreate = (dataArray, tx) => {
  const client = tx ?? prisma;
  return client.commission.createMany({ data: dataArray });
};

module.exports = {
  withTransaction,
  findInvoiceForGeneration,
  findActiveRuleForGeneration,
  countByInvoice,
  bulkCreate,
};
