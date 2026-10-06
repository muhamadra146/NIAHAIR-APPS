const prisma = require("../../config/prisma");
const { toDateOnly, wibDayStart, wibDayEnd } = require("../../utils/date");

// ── Transaction helper ────────────────────────────────────────────────

const withTransaction = (fn) => prisma.$transaction(fn);

// ── Field CommissionJob untuk kalkulasi kategori-job ──────────────────
// Dipakai include generator (di sini) & worksheet (invoice.repository).

const JOB_CALC_SELECT = {
  id: true, name: true, jobKey: true, sortOrder: true, isActive: true,
  deductsFromJobId: true, pricePerUnit: true, unit: true,
  splitMode: true, defaultQty: true,
  // Tarif bawaan job + tingkatan jumlah staf (dipakai jika staf tidak punya rule sendiri)
  defaultCommissionType: true, defaultCommissionValue: true,
  rateTiers: { select: { maxStaff: true, value: true } },
};

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
  serviceItem: {
    select: { id: true, name: true },
  },
  // Job kategori-job — untuk menampilkan rincian perhitungan (cara bagi, satuan)
  treatmentJobAssignment: {
    select: {
      commissionJob: {
        select: { id: true, name: true, unit: true, splitMode: true, deductsFromJobId: true, pricePerUnit: true },
      },
    },
  },
  // Invoice summary untuk per-invoice grouping di UI
  invoice: {
    select: {
      invoiceNo:   true,
      invoiceDate: true,
      grandTotal:  true,
      customer:    { select: { name: true } },
    },
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

// Jumlah & nominal komisi per status (ringkasan Komisi Saya)
const sumByStatus = (where) =>
  prisma.commission.groupBy({
    by:    ["status"],
    where,
    _sum:  { commissionAmount: true },
    _count: { _all: true },
  });

const findEmployeePayDay = async (employeeId) =>
  (await prisma.employee.findUnique({ where: { id: employeeId }, select: { payDay: true } }))?.payDay ?? null;

// Payroll karyawan untuk periode gaji tsb (bila sudah dibuat)
const findPayrollForPeriod = (employeeId, periodStart, periodEnd) =>
  prisma.payroll.findFirst({
    where:  { employeeId, periodStart: { lte: periodEnd }, periodEnd: { gte: periodStart } },
    select: { id: true, status: true, periodStart: true, periodEnd: true },
  });

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
                  commissionCategory: {
                    select: {
                      id: true, name: true,
                      jobs: { select: JOB_CALC_SELECT, orderBy: { sortOrder: "asc" } },
                    },
                  },
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
              jobAssignments: {
                where: { employeeId: { not: null } },
                select: {
                  id:               true,
                  employeeId:       true,
                  commissionJobId:  true,
                  workQty:          true,
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
    // Berlaku pada tanggal invoice menurut kalender WIB
    effectiveDate: { lte: wibDayEnd(invoiceDate) },
    OR: [
      { endDate: null },
      { endDate: { gte: wibDayStart(invoiceDate) } },
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

// Payroll APPROVED/PAID yang memuat komisi-komisi ini (lewat payrollId — pasti, bukan tebakan tanggal).
// Dipakai sebelum regenerate: komisi yang sudah masuk payroll final tidak boleh diubah.
const findPayrollsContainingCommissions = (commissions, tx) => {
  const payrollIds = [...new Set(commissions.map((c) => c.payrollId).filter(Boolean))];
  if (payrollIds.length === 0) return [];
  return (tx ?? prisma).payroll.findMany({
    where:  { id: { in: payrollIds }, status: { in: ["APPROVED", "PAID"] } },
    select: { id: true, employeeId: true, status: true, periodStart: true, periodEnd: true },
  });
};

module.exports = {
  JOB_CALC_SELECT,
  // management
  findAll,
  count,
  sumByStatus,
  findEmployeePayDay,
  findPayrollForPeriod,
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
