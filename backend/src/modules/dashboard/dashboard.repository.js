'use strict';

const prisma           = require("../../config/prisma");

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateWhere(field, startDate, endDate) {
  const f = {};
  if (startDate) f.gte = new Date(startDate);
  if (endDate)   f.lte = new Date(endDate + "T23:59:59.999Z");
  return Object.keys(f).length ? { [field]: f } : {};
}

// ── Revenue (dari Invoice) ────────────────────────────────────────────────────

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

// ── Cash Received (dari Payment) ─────────────────────────────────────────────

const getCashReceivedSummary = async ({ branchId, startDate, endDate }) => {
  const where = {
    ...(branchId ? { branchId } : {}),
    ...dateWhere("paymentDate", startDate, endDate),
  };

  const agg = await prisma.payment.aggregate({
    where,
    _count: { _all: true },
    _sum:   { amount: true },
  });

  return {
    total:        Number(agg._sum.amount ?? 0),
    paymentCount: agg._count._all,
  };
};

// ── Purchases / Expenses (dari PurchaseInvoice) ───────────────────────────────

const getPurchaseSummary = async ({ startDate, endDate }) => {
  const where = {
    status: "POSTED",
    ...dateWhere("invoiceDate", startDate, endDate),
  };

  const agg = await prisma.purchaseInvoice.aggregate({
    where,
    _count: { _all: true },
    _sum:   { grandTotal: true },
  });

  return {
    total:        Number(agg._sum.grandTotal ?? 0),
    invoiceCount: agg._count._all,
  };
};

// ── Commission Summary ────────────────────────────────────────────────────────

const getCommissionSummary = async ({ startDate, endDate }) => {
  const dateF = dateWhere("createdAt", startDate, endDate);

  const [agg, byStatus] = await Promise.all([
    prisma.commission.aggregate({
      where:  { ...dateF, status: { in: ["APPROVED", "PAID"] } },
      _count: { _all: true },
      _sum:   { commissionAmount: true },
    }),
    prisma.commission.groupBy({
      by:    ["status"],
      where: { ...dateF },
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

const getPayrollSummary = async ({ branchId, startDate, endDate }) => {
  const where = {
    status: "PAID",
    ...(branchId ? { branchId } : {}),
    ...dateWhere("periodStart", startDate, endDate),
  };

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

// ── Daily Trend (Revenue + Cash Received) ────────────────────────────────────

const getDailyTrend = async ({ branchId, startDate, endDate }) => {
  // ── Revenue per hari ─────────────────────────────────────────────────────
  const revConditions = [`status IN ('UNPAID', 'PARTIAL', 'PAID')`];
  const revValues     = [];
  let   ri            = 1;

  if (branchId) { revConditions.push(`"branchId" = $${ri++}`); revValues.push(branchId); }
  if (startDate){ revConditions.push(`"invoiceDate" >= $${ri++}`); revValues.push(new Date(startDate)); }
  if (endDate)  { revConditions.push(`"invoiceDate" <= $${ri++}`); revValues.push(new Date(endDate + "T23:59:59.999Z")); }

  const revRows = await prisma.$queryRawUnsafe(
    `SELECT
       DATE("invoiceDate")   AS date,
       COUNT(*)::int         AS invoice_count,
       SUM("grandTotal")     AS revenue
     FROM invoices
     WHERE ${revConditions.join(" AND ")}
     GROUP BY DATE("invoiceDate")
     ORDER BY date ASC`,
    ...revValues,
  );

  // ── Cash received per hari ───────────────────────────────────────────────
  const payConditions = [];
  const payValues     = [];
  let   pi            = 1;

  if (branchId) { payConditions.push(`"branchId" = $${pi++}`); payValues.push(branchId); }
  if (startDate){ payConditions.push(`"paymentDate" >= $${pi++}`); payValues.push(new Date(startDate)); }
  if (endDate)  { payConditions.push(`"paymentDate" <= $${pi++}`); payValues.push(new Date(endDate + "T23:59:59.999Z")); }

  const payRows = await prisma.$queryRawUnsafe(
    `SELECT
       DATE("paymentDate")  AS date,
       COUNT(*)::int        AS payment_count,
       SUM(amount)          AS cash_received
     FROM payments
     ${payConditions.length ? `WHERE ${payConditions.join(" AND ")}` : ""}
     GROUP BY DATE("paymentDate")
     ORDER BY date ASC`,
    ...payValues,
  );

  // ── Merge ke satu array ──────────────────────────────────────────────────
  const dateMap = new Map();

  const toDateStr = (d) => (d instanceof Date
    ? d.toISOString().slice(0, 10)
    : String(d).slice(0, 10));

  for (const r of revRows) {
    const d = toDateStr(r.date);
    dateMap.set(d, {
      date:         d,
      revenue:      Number(r.revenue      ?? 0),
      invoiceCount: Number(r.invoice_count ?? 0),
      cashReceived: 0,
      paymentCount: 0,
    });
  }

  for (const r of payRows) {
    const d   = toDateStr(r.date);
    const key = dateMap.get(d);
    if (key) {
      key.cashReceived = Number(r.cash_received ?? 0);
      key.paymentCount = Number(r.payment_count ?? 0);
    } else {
      dateMap.set(d, {
        date:         d,
        revenue:      0,
        invoiceCount: 0,
        cashReceived: Number(r.cash_received ?? 0),
        paymentCount: Number(r.payment_count ?? 0),
      });
    }
  }

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
};

module.exports = {
  getRevenueSummary,
  getCashReceivedSummary,
  getPurchaseSummary,
  getCommissionSummary,
  getPayrollSummary,
  getDailyTrend,
};
