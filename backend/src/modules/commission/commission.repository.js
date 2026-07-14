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
      id:           true,
      status:       true,
      invoiceDate:  true,
      inclusiveTax: true,
      items: {
        select: {
          id:       true,
          itemId:   true,
          qty:      true,
          price:    true,
          discount: true,
          subtotal: true,
          taxRate:  true,
        },
      },
      treatmentSessions: {
        select: {
          id:          true,
          completedAt: true,
          treatmentItems: {
            select: {
              id:                 true,
              itemId:             true,
              priceSnapshot:      true,
              qty:                true,
              conversionSnapshot: true,
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

// ── Delete all commissions for an invoice (full reset) ────────────────

const deleteAllByInvoice = (invoiceId) =>
  prisma.commission.deleteMany({ where: { invoiceId } });

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

// Cek apakah ada payroll APPROVED/PAID yang periode-nya mencakup approvedAt dari komisi-komisi ini.
// Digunakan sebelum regenerate untuk memastikan tidak ada komisi yang sudah masuk payroll final.
const findPayrollsContainingCommissions = (commissions, tx) => {
  const client = tx ?? prisma;
  const approved = commissions.filter((c) => c.approvedAt);
  if (approved.length === 0) return [];

  // Ambil semua kombinasi unik employeeId + approvedAt
  const employeeIds = [...new Set(approved.map((c) => c.employeeId))];
  const dates       = approved.map((c) => c.approvedAt);
  const minDate     = new Date(Math.min(...dates.map((d) => new Date(d).getTime())));
  const maxDate     = new Date(Math.max(...dates.map((d) => new Date(d).getTime())));

  return client.payroll.findMany({
    where: {
      employeeId: { in: employeeIds },
      status:     { in: ["APPROVED", "PAID"] },
      periodStart: { lte: maxDate },
      periodEnd:   { gte: minDate },
    },
    select: { id: true, employeeId: true, status: true, periodStart: true, periodEnd: true },
  });
};

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
  findPayrollsContainingCommissions,
  // override
  overrideOne,
  // full reset
  deleteAllByInvoice,
};
