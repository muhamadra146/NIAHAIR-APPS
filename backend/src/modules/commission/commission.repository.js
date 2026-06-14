const prisma = require("../../config/prisma");

// ── Transaction helper ────────────────────────────────────────────────

const withTransaction = (fn) => prisma.$transaction(fn);

// ── Include shape for management reads ───────────────────────────────

const INCLUDE = {
  employee: {
    select: { id: true, name: true, employeeCode: true },
  },
  treatmentAssignment: {
    select: { workQty: true },
  },
  commissionRule: {
    select: { id: true },
  },
  invoiceItem: {
    select: { id: true, itemId: true, qty: true, price: true, subtotal: true },
  },
};

// ── Management reads ──────────────────────────────────────────────────

const findAll = ({ skip, take, where }) =>
  prisma.commission.findMany({
    skip,
    take,
    where,
    orderBy: { createdAt: "desc" },
    include: INCLUDE,
  });

const count = (where) => prisma.commission.count({ where });

const findById = (id) =>
  prisma.commission.findUnique({ where: { id }, include: INCLUDE });

// ── Status transitions ────────────────────────────────────────────────

const approveOne = (id, userId) =>
  prisma.commission.update({
    where: { id },
    data: {
      status:     "APPROVED",
      approvedBy: userId,
      approvedAt: new Date(),
    },
    include: INCLUDE,
  });

const markPaidOne = (id, userId) =>
  prisma.commission.update({
    where: { id },
    data: {
      status: "PAID",
      paidBy: userId,
      paidAt: new Date(),
    },
    include: INCLUDE,
  });

// ── Generator: invoice fetch ──────────────────────────────────────────

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
                  slotKey:    true,
                },
              },
            },
          },
        },
      },
    },
  });
};

// ── Generator: commission rule lookup ─────────────────────────────────

// Lookup order: specific slotKey match first, then fallback to null (wildcard)
const findActiveRuleForGeneration = async (employeeId, commissionCategoryId, slotKey, tx) => {
  const client = tx ?? prisma;
  const select = { id: true, commissionType: true, commissionValue: true, commissionBase: true };

  // 1. Try exact slotKey match
  if (slotKey) {
    const exact = await client.commissionRule.findFirst({
      where:  { employeeId, commissionCategoryId, slotKey, isActive: true },
      select,
    });
    if (exact) return exact;
  }

  // 2. Fallback: wildcard rule (no slotKey)
  return client.commissionRule.findFirst({
    where:  { employeeId, commissionCategoryId, slotKey: null, isActive: true },
    select,
  });
};

// ── Generator: duplicate guard ────────────────────────────────────────

const countByInvoice = (invoiceId, tx) => {
  const client = tx ?? prisma;
  return client.commission.count({ where: { invoiceId } });
};

// ── Generator: bulk insert ────────────────────────────────────────────

const bulkCreate = (dataArray, tx) => {
  const client = tx ?? prisma;
  return client.commission.createMany({ data: dataArray });
};

module.exports = {
  // management
  findAll,
  count,
  findById,
  approveOne,
  markPaidOne,
  // generator
  withTransaction,
  findInvoiceForGeneration,
  findActiveRuleForGeneration,
  countByInvoice,
  bulkCreate,
};
