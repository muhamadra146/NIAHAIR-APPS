const prisma = require("../../config/prisma");
const { Prisma } = require("@prisma/client");

// ── helpers ───────────────────────────────────────────────────────────────────

function dateWhere(startDate, endDate, field = "createdAt") {
  const filter = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate)   filter.lte = new Date(endDate + "T23:59:59.999Z");
  return Object.keys(filter).length ? { [field]: filter } : {};
}

// ── Summary ───────────────────────────────────────────────────────────────────

const getSummary = async ({ branchId, startDate, endDate }) => {
  const branchFilter = branchId ? { branchId } : {};
  const dateInvoice  = dateWhere(startDate, endDate, "invoiceDate");
  const dateCr       = dateWhere(startDate, endDate, "createdAt");

  const [
    invoiceStats,
    paidInvoiceStats,
    depositStats,
    appointmentTotal,
    appointmentByStatus,
    activeLoans,
    commissionStats,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { ...branchFilter, ...dateInvoice },
      _count: { _all: true },
      _sum:   { grandTotal: true },
    }),
    prisma.invoice.aggregate({
      where: { ...branchFilter, ...dateInvoice, status: "PAID" },
      _count: { _all: true },
      _sum:   { grandTotal: true },
    }),
    prisma.deposit.aggregate({
      where: { ...branchFilter, ...dateCr, status: { in: ["PAID", "PARTIAL_USED", "USED"] } },
      _count: { _all: true },
      _sum:   { amount: true },
    }),
    prisma.appointment.count({
      where: { ...branchFilter, ...dateWhere(startDate, endDate, "visitDate") },
    }),
    prisma.appointment.groupBy({
      by:     ["status"],
      where:  { ...branchFilter, ...dateWhere(startDate, endDate, "visitDate") },
      _count: { _all: true },
    }),
    prisma.loan.count({ where: { status: "ACTIVE", ...branchFilter } }),
    prisma.commission.aggregate({
      where: { ...dateCr },
      _count: { _all: true },
      _sum:   { commissionAmount: true },
    }),
  ]);

  const apptByStatus = appointmentByStatus.reduce(
    (acc, r) => { acc[r.status] = r._count._all; return acc; },
    {},
  );

  return {
    invoices: {
      total:        invoiceStats._count._all,
      paid:         paidInvoiceStats._count._all,
      totalRevenue: paidInvoiceStats._sum.grandTotal ?? new Prisma.Decimal(0),
    },
    deposits: {
      total:       depositStats._count._all,
      totalAmount: depositStats._sum.amount ?? new Prisma.Decimal(0),
    },
    appointments: {
      total:    appointmentTotal,
      byStatus: apptByStatus,
    },
    loans: {
      active: activeLoans,
    },
    commissions: {
      total:       commissionStats._count._all,
      totalAmount: commissionStats._sum.commissionAmount ?? new Prisma.Decimal(0),
    },
  };
};

// ── Daily revenue ─────────────────────────────────────────────────────────────

const getDailyRevenue = async ({ branchId, startDate, endDate }) => {
  const conditions = ["status = 'PAID'"];
  const values     = [];
  let   idx        = 1;

  if (branchId) {
    conditions.push(`branch_id = $${idx++}::uuid`);
    values.push(branchId);
  }
  if (startDate) {
    conditions.push(`invoice_date >= $${idx++}`);
    values.push(new Date(startDate));
  }
  if (endDate) {
    conditions.push(`invoice_date <= $${idx++}`);
    values.push(new Date(endDate + "T23:59:59.999Z"));
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       DATE(invoice_date)      AS date,
       COUNT(*)::int            AS invoice_count,
       SUM(grand_total)         AS revenue
     FROM invoices
     ${where}
     GROUP BY DATE(invoice_date)
     ORDER BY date ASC`,
    ...values,
  );

  return rows.map((r) => ({
    date:         r.date.toISOString().slice(0, 10),
    invoiceCount: r.invoice_count,
    revenue:      r.revenue,
  }));
};

// ── Commission by employee ────────────────────────────────────────────────────

const getCommissionByEmployee = async ({ startDate, endDate }) => {
  const dateCr = dateWhere(startDate, endDate, "createdAt");

  const rows = await prisma.commission.groupBy({
    by:     ["employeeId"],
    where:  { ...dateCr },
    _count: { _all: true },
    _sum:   { commissionAmount: true },
  });

  if (rows.length === 0) return [];

  const employeeIds = rows.map((r) => r.employeeId);
  const employees   = await prisma.employee.findMany({
    where:  { id: { in: employeeIds } },
    select: { id: true, name: true, employeeCode: true },
  });
  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

  const byStatus = await prisma.commission.groupBy({
    by:    ["employeeId", "status"],
    where: { employeeId: { in: employeeIds }, ...dateCr },
    _sum:  { commissionAmount: true },
  });

  const statusMap = {};
  for (const r of byStatus) {
    if (!statusMap[r.employeeId]) statusMap[r.employeeId] = {};
    statusMap[r.employeeId][r.status] = r._sum.commissionAmount ?? 0;
  }

  return rows
    .sort((a, b) =>
      Number(b._sum.commissionAmount ?? 0) - Number(a._sum.commissionAmount ?? 0),
    )
    .map((r) => ({
      employeeId:  r.employeeId,
      employee:    empMap[r.employeeId] ?? null,
      total:       r._count._all,
      totalAmount: r._sum.commissionAmount ?? 0,
      pending:     statusMap[r.employeeId]?.PENDING  ?? 0,
      approved:    statusMap[r.employeeId]?.APPROVED ?? 0,
      paid:        statusMap[r.employeeId]?.PAID     ?? 0,
    }));
};

module.exports = { getSummary, getDailyRevenue, getCommissionByEmployee };
