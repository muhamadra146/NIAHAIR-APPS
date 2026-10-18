'use strict';

const prisma           = require("../../config/prisma");
const { wibDayStart, wibDayEnd } = require("../../utils/date");

// ── Helpers ───────────────────────────────────────────────────────────────────

// Kolom timestamp → batas hari WIB
function dateWhere(field, startDate, endDate) {
  const f = {};
  if (startDate) f.gte = wibDayStart(startDate);
  if (endDate)   f.lte = wibDayEnd(endDate);
  return Object.keys(f).length ? { [field]: f } : {};
}

// ── Invoice terbit (tanggal invoice) — untuk kartu piutang ────────────────────

const getRevenueSummary = async ({ branchId, startDate, endDate }) => {
  const where = {
    status: { in: ["UNPAID", "PARTIAL", "PAID"] },
    ...(branchId ? { branchId } : {}),
    ...dateWhere("invoiceDate", startDate, endDate),
  };

  const [all, paid] = await Promise.all([
    prisma.invoice.aggregate({
      where,
      _count: { _all: true },
      _sum:   { grandTotal: true, paidAmount: true, outstandingAmount: true },
    }),
    prisma.invoice.aggregate({
      where: { ...where, status: "PAID" },
      _count: { _all: true },
      _sum:   { grandTotal: true },
    }),
  ]);

  return {
    total:        Number(all._sum.grandTotal        ?? 0),
    paidAmount:   Number(all._sum.paidAmount        ?? 0),
    outstanding:  Number(all._sum.outstandingAmount ?? 0),
    invoiceCount: all._count._all,
    paidCount:    paid._count._all,
    paidTotal:    Number(paid._sum.grandTotal       ?? 0),
  };
};

// ── Uang client (pendapatan kotor/bersih, FIN-039) ────────────────────────────

const CUSTOMER = { select: { id: true, name: true } };

/** Pembayaran invoice pada tanggal bayar. Bagian yang dibayar pakai DP tidak ada di sini. */
const findInvoicePayments = ({ branchId, startDate, endDate }) =>
  prisma.payment.findMany({
    where:   { ...(branchId ? { branchId } : {}), ...dateWhere("paymentDate", startDate, endDate) },
    select:  {
      id: true, paymentNo: true, amount: true, paymentDate: true, invoiceId: true,
      invoice: { select: { invoiceNo: true, customer: CUSTOMER } },
    },
    orderBy: { paymentDate: "asc" },
  });

/** Pembayaran DP dari client pada tanggal bayar (cabang deposit) */
const findDepositPayments = ({ branchId, startDate, endDate }) =>
  prisma.depositPayment.findMany({
    where:   { ...(branchId ? { deposit: { branchId } } : {}), ...dateWhere("paidAt", startDate, endDate) },
    select:  {
      id: true, paymentNo: true, amount: true, paidAt: true, depositId: true,
      deposit: { select: { customer: CUSTOMER } },
    },
    orderBy: { paidAt: "asc" },
  });

/** DP yang dipakai di invoice — potongan pendapatan bersih untuk porsi DP dihitung di sini */
const findDepositApplications = ({ branchId, startDate, endDate }) =>
  prisma.invoiceDeposit.findMany({
    where:   {
      invoice: { status: { not: "CANCELLED" }, ...(branchId ? { branchId } : {}) },
      ...dateWhere("createdAt", startDate, endDate),
    },
    select:  {
      id: true, amountApplied: true, createdAt: true, invoiceId: true, depositId: true,
      invoice: { select: { invoiceNo: true, customer: CUSTOMER } },
    },
    orderBy: { createdAt: "asc" },
  });

/** Uang DP yang dikembalikan ke client (refund / batal setelah dibayar) */
const findDepositRefunds = ({ branchId, startDate, endDate }) =>
  prisma.deposit.findMany({
    where:   {
      refundedAmount: { gt: 0 },
      ...(branchId ? { branchId } : {}),
      ...dateWhere("refundedAt", startDate, endDate),
    },
    select:  { id: true, status: true, refundedAt: true, refundedAmount: true, customer: CUSTOMER },
    orderBy: { refundedAt: "asc" },
  });

/** Rincian invoice untuk menghitung porsi bersih: item, PPN, dan komisi (kecuali ditolak) */
const findInvoicesForRevenue = (ids) =>
  ids.length === 0 ? Promise.resolve([]) : prisma.invoice.findMany({
    where:  { id: { in: ids } },
    select: {
      id: true, grandTotal: true, totalTax: true,
      items: {
        select: {
          subtotal: true, isMaterial: true,
          item: { select: { itemCode: true, commissionCategoryId: true } },
        },
      },
      commissions: {
        where:  { status: { not: "REJECTED" } },
        select: { commissionAmount: true, serviceItem: { select: { itemCode: true } } },
      },
    },
  });

// ── Pembelian (gudang milik cabang) ───────────────────────────────────────────

const purchaseWhere = ({ branchId, startDate, endDate }) => ({
  status: "POSTED",
  ...(branchId ? { warehouse: { branchId } } : {}),
  ...dateWhere("invoiceDate", startDate, endDate),
});

const getPurchaseSummary = async (params) => {
  const agg = await prisma.purchaseInvoice.aggregate({
    where:  purchaseWhere(params),
    _count: { _all: true },
    _sum:   { grandTotal: true },
  });
  return {
    total:        Number(agg._sum.grandTotal ?? 0),
    invoiceCount: agg._count._all,
  };
};

const findPurchases = (params) =>
  prisma.purchaseInvoice.findMany({
    where:   purchaseWhere(params),
    select:  {
      id: true, invoiceNo: true, supplierInvoiceNo: true, invoiceDate: true, grandTotal: true,
      supplier:  { select: { name: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { invoiceDate: "asc" },
  });

const findBranchWarehouses = (branchId) =>
  prisma.warehouse.findMany({ where: branchId ? { branchId } : { branchId: { not: null } }, select: { name: true }, orderBy: { name: "asc" } });

// ── Commission Summary ────────────────────────────────────────────────────────

const getCommissionSummary = async ({ branchId, startDate, endDate }) => {
  const where = {
    ...dateWhere("createdAt", startDate, endDate),
    ...(branchId ? { invoice: { branchId } } : {}),
  };

  const [agg, byStatus] = await Promise.all([
    prisma.commission.aggregate({
      where:  { ...where, status: { in: ["APPROVED", "PAID"] } },
      _count: { _all: true },
      _sum:   { commissionAmount: true },
    }),
    prisma.commission.groupBy({
      by:    ["status"],
      where,
      _sum:  { commissionAmount: true },
      _count:{ _all: true },
    }),
  ]);

  const statusBreakdown = byStatus.reduce((acc, r) => {
    acc[r.status] = {
      amount: Number(r._sum.commissionAmount ?? 0),
      count:  r._count._all,
    };
    return acc;
  }, {});

  return {
    total:    Number(agg._sum.commissionAmount ?? 0),
    count:    agg._count._all,
    byStatus: statusBreakdown,
  };
};

// ── Payroll Summary ───────────────────────────────────────────────────────────

// Gaji dibayar menurut TANGGAL BAYAR (paidAt, batas hari WIB) — keputusan owner 2026-10-18,
// bukan periode kerja, agar cocok dengan arus kas.
const paidPayrollWhere = ({ branchId, startDate, endDate }) => ({
  status: "PAID",
  ...(branchId ? { branchId } : {}),
  ...dateWhere("paidAt", startDate, endDate),
});

const getPayrollSummary = async ({ branchId, startDate, endDate }) => {
  const where = paidPayrollWhere({ branchId, startDate, endDate });

  const agg = await prisma.payroll.aggregate({
    where,
    _count: { _all: true },
    _sum:   { netSalary: true, grossIncome: true, totalDeductions: true },
  });

  // count unique employees
  const grouped = await prisma.payroll.groupBy({
    by:    ["employeeId"],
    where,
  });

  return {
    total:           Number(agg._sum.netSalary       ?? 0),
    grossIncome:     Number(agg._sum.grossIncome     ?? 0),
    totalDeductions: Number(agg._sum.totalDeductions ?? 0),
    count:           agg._count._all,
    employeeCount:   grouped.length,
  };
};

/** Rincian kartu "Gaji Dibayar": payroll PAID menurut tanggal bayar */
const findPaidPayrolls = ({ branchId, startDate, endDate }) =>
  prisma.payroll.findMany({
    where:   paidPayrollWhere({ branchId, startDate, endDate }),
    orderBy: { paidAt: "asc" },
    select: {
      id: true, periodStart: true, periodEnd: true, paidAt: true,
      grossIncome: true, totalDeductions: true, netSalary: true,
      accurateJournalNumber: true,
      employee: { select: { id: true, name: true, employeeCode: true } },
      branch:   { select: { id: true, name: true } },
    },
  });

module.exports = {
  findPaidPayrolls,
  getRevenueSummary,
  findInvoicePayments,
  findDepositPayments,
  findDepositApplications,
  findDepositRefunds,
  findInvoicesForRevenue,
  getPurchaseSummary,
  findPurchases,
  findBranchWarehouses,
  getCommissionSummary,
  getPayrollSummary,
};
