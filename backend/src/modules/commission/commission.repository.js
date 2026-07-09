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

const findAll = ({ skip, take, where, orderBy }) =>
  prisma.commission.findMany({
    skip,
    take,
    where,
    orderBy: orderBy ?? { createdAt: "desc" },
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
      id:          true,
      status:      true,
      invoiceDate: true,   // dipakai untuk rule lookup (effectiveDate) dan cek forfeiture
      items: {
        select: {
          id:       true,
          itemId:   true,
          qty:      true,
          price:    true,
          subtotal: true,  // after discount, before PPN — ini base komisi
        },
      },
      treatmentSessions: {
        select: {
          id:          true,
          completedAt: true, // dibandingkan dengan invoiceDate (WIB) untuk aturan hangus
          treatmentItems: {
            select: {
              id:            true,
              itemId:        true,
              priceSnapshot: true,
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

// Lookup order: specific slotKey match first, then fallback to null (wildcard).
// coloristPresent: apakah ada slotKey 'colorist' di session ini (Opsi B).
// invoiceDate: dipakai untuk filter effectiveDate / endDate.
const findActiveRuleForGeneration = async (
  employeeId,
  commissionCategoryId,
  slotKey,
  invoiceDate,
  tx
) => {
  const client = tx ?? prisma;
  const select = {
    id:              true,
    commissionType:  true,
    commissionValue: true,
    commissionBase:  true,
  };

  const baseWhere = {
    employeeId,
    commissionCategoryId,
    isActive:      true,
    effectiveDate: { lte: invoiceDate },
    OR: [
      { endDate: null },
      { endDate: { gte: invoiceDate } },
    ],
  };

  // 1. Coba exact slotKey match
  if (slotKey) {
    const exact = await client.commissionRule.findFirst({
      where:   { ...baseWhere, slotKey },
      select,
      orderBy: { effectiveDate: "desc" },
    });
    if (exact) return exact;
  }

  // 2. Fallback: wildcard rule (slotKey null)
  return client.commissionRule.findFirst({
    where:   { ...baseWhere, slotKey: null },
    select,
    orderBy: { effectiveDate: "desc" },
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

// ── Regenerator: fetch all commissions for invoice (tx-aware) ─────────

const findAllByInvoice = (invoiceId, tx) =>
  (tx ?? prisma).commission.findMany({
    where:   { invoiceId },
    include: INCLUDE,
  });

// ── Regenerator: delete PENDING commissions for invoice ───────────────

const deletePendingByInvoice = (invoiceId, tx) => {
  const client = tx ?? prisma;
  return client.commission.deleteMany({
    where: { invoiceId, status: "PENDING" },
  });
};

// ── Delete single ─────────────────────────────────────────────────────

const deleteOne = (id) =>
  prisma.commission.delete({ where: { id } });

// ── Override ──────────────────────────────────────────────────────────
// Override selalu menang atas forfeit: override manual dari SUPER_ADMIN
// membatalkan forfeit otomatis sistem.

const overrideOne = (id, { commissionAmount, overrideBy, overrideNotes }) =>
  prisma.commission.update({
    where: { id },
    data: {
      commissionAmount,
      isManualOverride: true,
      overrideBy,
      overrideAt:    new Date(),
      overrideNotes: overrideNotes ?? null,
      // Override menang atas forfeit
      isForfeit:     false,
      forfeitReason: null,
    },
    include: INCLUDE,
  });

module.exports = {
  // management
  findAll,
  count,
  findById,
  approveOne,
  markPaidOne,
  deleteOne,
  // generator / regenerator
  withTransaction,
  findInvoiceForGeneration,
  findActiveRuleForGeneration,
  countByInvoice,
  bulkCreate,
  findAllByInvoice,
  deletePendingByInvoice,
  // override
  overrideOne,
};
