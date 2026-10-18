'use strict';

const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const repo            = require("./dashboard.repository");
const settingRepo     = require("../setting/setting.repository");
const { buildRevenue } = require("./dashboard.revenue");
const { ROLES }       = require("../../common/constants/role.constant");

// Kode item penentu pendapatan bersih — diatur di tabel settings (FIN-039)
const CODE_SETTINGS = {
  ongkosPP:     "finance_ongkos_pp_item_codes",
  chargeLembur: "finance_charge_lembur_item_codes",
  homeService:  "finance_home_service_item_codes",
};

/** Setting berisi JSON array kode item → Set. Kosong/rusak → Set kosong. */
const readCodes = async (key) => {
  const row = await settingRepo.findByKey(key);
  try {
    const list = JSON.parse(row?.value ?? "[]");
    return new Set(Array.isArray(list) ? list.map(String) : []);
  } catch {
    return new Set();
  }
};

const loadCodes = async () => {
  const entries = await Promise.all(Object.entries(CODE_SETTINGS).map(async ([k, key]) => [k, await readCodes(key)]));
  return Object.fromEntries(entries);
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Filter tanggal: format TTTT-BB-HH dan "Dari" tidak boleh sesudah "Sampai" */
const assertDateRange = (startDate, endDate) => {
  for (const d of [startDate, endDate]) {
    if (d && (!DATE_RE.test(d) || Number.isNaN(new Date(`${d}T00:00:00Z`).getTime()))) {
      throw new AppError("Format tanggal harus TTTT-BB-HH", StatusCodes.BAD_REQUEST);
    }
  }
  if (startDate && endDate && startDate > endDate) {
    throw new AppError("Tanggal \"Dari\" tidak boleh setelah tanggal \"Sampai\"", StatusCodes.BAD_REQUEST);
  }
};

/** Semua kejadian uang client dalam periode → baris pendapatan kotor/bersih */
const getRevenue = async (params) => {
  const [invoicePayments, depositPayments, depositApplications, depositRefunds, codes] = await Promise.all([
    repo.findInvoicePayments(params),
    repo.findDepositPayments(params),
    repo.findDepositApplications(params),
    repo.findDepositRefunds(params),
    loadCodes(),
  ]);
  const invoiceIds = [...new Set([...invoicePayments, ...depositApplications].map((r) => r.invoiceId))];
  const invoices   = await repo.findInvoicesForRevenue(invoiceIds);
  return buildRevenue({ invoicePayments, depositPayments, depositApplications, depositRefunds, invoices, codes });
};

/**
 * Aggregasi Finance Dashboard (per cabang bila branchId diisi).
 *
 * @param {{ branchId?: string, startDate?: string, endDate?: string }} params
 */
const getFinanceDashboard = async ({ branchId, startDate, endDate }) => {
  assertDateRange(startDate, endDate);
  const params = { branchId, startDate, endDate };
  const [revenue, invoices, purchases, warehouses, commissions, payroll] = await Promise.all([
    getRevenue(params),
    repo.getRevenueSummary(params),
    repo.getPurchaseSummary(params),
    repo.findBranchWarehouses(branchId),
    repo.getCommissionSummary(params),
    repo.getPayrollSummary(params),
  ]);

  // Arus kas bersih = pendapatan kotor − pembelian − gaji dibayar (FIN-038).
  // Komisi tidak dikurangkan terpisah: komisi dibayar di dalam gaji (COM-017).
  const netCashFlow = revenue.summary.gross - purchases.total - payroll.total;

  return {
    period: { startDate, endDate },
    income:      revenue.summary,
    invoices,
    purchases:   { ...purchases, warehouses: warehouses.map((w) => w.name) },
    commissions,
    payroll,
    netCashFlow: Math.round(netCashFlow * 100) / 100,
    dailyTrend:  revenue.daily,
  };
};

const DETAIL_TYPES = ["revenue", "purchases", "payroll"];

// Rincian gaji per karyawan: hanya yang boleh membuka Penggajian (PAY-001 / PAY-032) — bukan MANAGER
const PAYROLL_DETAIL_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.FINANCE];

/** Data di balik kartu dashboard: baris pendapatan, daftar pembelian, atau gaji dibayar */
const getFinanceDetails = async ({ type, branchId, startDate, endDate, roleCode }) => {
  if (!DETAIL_TYPES.includes(type)) {
    throw new AppError(`type harus salah satu dari: ${DETAIL_TYPES.join(", ")}`, StatusCodes.BAD_REQUEST);
  }
  assertDateRange(startDate, endDate);
  const params = { branchId, startDate, endDate };
  if (type === "revenue") {
    const { rows, summary } = await getRevenue(params);
    return { type, rows, summary };
  }
  if (type === "payroll") {
    if (!PAYROLL_DETAIL_ROLES.includes(roleCode)) {
      throw new AppError("Rincian gaji hanya untuk Owner, Super Admin, dan Finance", StatusCodes.FORBIDDEN);
    }
    const rows = (await repo.findPaidPayrolls(params)).map((r) => ({
      ...r,
      grossIncome:     Number(r.grossIncome),
      totalDeductions: Number(r.totalDeductions),
      netSalary:       Number(r.netSalary),
    }));
    return {
      type,
      rows,
      summary: {
        total:         rows.reduce((s, r) => s + r.netSalary, 0),
        count:         rows.length,
        employeeCount: new Set(rows.map((r) => r.employee.id)).size,
      },
    };
  }
  const rows = await repo.findPurchases(params);
  return {
    type,
    rows: rows.map((r) => ({ ...r, grandTotal: Number(r.grandTotal) })),
    summary: { total: rows.reduce((s, r) => s + Number(r.grandTotal), 0), count: rows.length },
  };
};

module.exports = { getFinanceDashboard, getFinanceDetails };
