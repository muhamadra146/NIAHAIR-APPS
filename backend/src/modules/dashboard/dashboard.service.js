'use strict';

const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const repo            = require("./dashboard.repository");
const settingRepo     = require("../setting/setting.repository");
const { buildRevenue } = require("./dashboard.revenue");

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

const DETAIL_TYPES = ["revenue", "purchases"];

/** Data di balik kartu dashboard: baris pendapatan atau daftar pembelian */
const getFinanceDetails = async ({ type, branchId, startDate, endDate }) => {
  if (!DETAIL_TYPES.includes(type)) {
    throw new AppError(`type harus salah satu dari: ${DETAIL_TYPES.join(", ")}`, StatusCodes.BAD_REQUEST);
  }
  const params = { branchId, startDate, endDate };
  if (type === "revenue") {
    const { rows, summary } = await getRevenue(params);
    return { type, rows, summary };
  }
  const rows = await repo.findPurchases(params);
  return {
    type,
    rows: rows.map((r) => ({ ...r, grandTotal: Number(r.grandTotal) })),
    summary: { total: rows.reduce((s, r) => s + Number(r.grandTotal), 0), count: rows.length },
  };
};

module.exports = { getFinanceDashboard, getFinanceDetails };
