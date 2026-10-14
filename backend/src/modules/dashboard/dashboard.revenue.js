'use strict';

// ── Pendapatan kotor & bersih (FIN-039, keputusan user 2026-10-14) ────────────
//
// Kotor  = uang yang dibayar client pada tanggal bayar:
//          pembayaran invoice + pembayaran DP − uang DP yang dikembalikan.
//          Bagian invoice yang dibayar pakai DP tidak dihitung lagi.
// Bersih sebelum komisi = Kotor − PPN − Ongkos PP − 50% Charge Lembur − komisi tim Home Service
// Bersih setelah komisi = Bersih sebelum komisi − komisi staf lainnya (kecuali ditolak)
//
// Potongan melekat di invoice, uangnya bisa masuk bertahap → potongan dihitung
// SEBANDING dengan uang yang masuk (pembayaran ÷ grand total invoice).
// DP dari menu Deposit masuk kotor & bersih penuh saat dibayar; potongannya
// dihitung saat DP itu dipakai di invoice.

const { wibDateStr } = require("../../utils/date");

const LEMBUR_TEAM_SHARE = 0.5;

const round2 = (n) => Math.round(n * 100) / 100;
const num    = (v) => Number(v ?? 0);

/**
 * Komponen potongan satu invoice.
 * @param {object} invoice { grandTotal, totalTax, items[{ subtotal, isMaterial, item{ itemCode, commissionCategoryId } }],
 *                           commissions[{ commissionAmount, serviceItem{ itemCode } }] }
 * @param {{ ongkosPP: Set, chargeLembur: Set, homeService: Set }} codes  kode item dari pengaturan
 */
function invoiceComponents(invoice, codes) {
  const lines = invoice.items.filter((l) => !l.isMaterial);
  const sumLines = (set) => lines.filter((l) => set.has(l.item.itemCode)).reduce((s, l) => s + num(l.subtotal), 0);

  const hsCommission = invoice.commissions
    .filter((c) => codes.homeService.has(c.serviceItem.itemCode))
    .reduce((s, c) => s + num(c.commissionAmount), 0);
  // Komisi Charge Lembur tidak dihitung lagi: bagian tim (50%) sudah dipotong dari nilai item
  const staffCommission = invoice.commissions
    .filter((c) => !codes.homeService.has(c.serviceItem.itemCode) && !codes.chargeLembur.has(c.serviceItem.itemCode))
    .reduce((s, c) => s + num(c.commissionAmount), 0);

  // Ada item berkategori komisi tapi belum ada komisi sama sekali → Input Pekerjaan belum diisi
  const commissionPending = invoice.commissions.length === 0 && lines.some((l) => l.item.commissionCategoryId);

  return {
    grandTotal: num(invoice.grandTotal),
    tax:        num(invoice.totalTax),
    ongkosPP:   sumLines(codes.ongkosPP),
    lemburTeam: sumLines(codes.chargeLembur) * LEMBUR_TEAM_SHARE,
    hsTeam:     hsCommission,
    commission: staffCommission,
    commissionPending,
  };
}

const DEDUCTION_KEYS = ["tax", "ongkosPP", "lemburTeam", "hsTeam", "commission"];
const zeroDeductions = () => Object.fromEntries(DEDUCTION_KEYS.map((k) => [k, 0]));

/** Potongan sebanding untuk sejumlah uang yang terkait invoice */
function proportionalDeductions(amount, comp) {
  if (!(comp.grandTotal > 0)) return zeroDeductions();
  const ratio = amount / comp.grandTotal;
  return Object.fromEntries(DEDUCTION_KEYS.map((k) => [k, round2(comp[k] * ratio)]));
}

function makeRow({ type, date, ref, invoiceId = null, invoiceNo = null, depositId = null, customer, gross, deductions, commissionPending = false }) {
  const beforeCommission = deductions.tax + deductions.ongkosPP + deductions.lemburTeam + deductions.hsTeam;
  const netBefore = round2(gross - beforeCommission);
  return {
    type, date: wibDateStr(date), ref, invoiceId, invoiceNo, depositId,
    customerName: customer?.name ?? null,
    gross: round2(gross),
    netBefore,
    netAfter: round2(netBefore - deductions.commission),
    deductions,
    commissionPending,
  };
}

/**
 * Susun baris pendapatan dari semua kejadian uang dalam periode.
 * @returns {{ rows: object[], summary: object, daily: object[] }}
 */
function buildRevenue({ invoicePayments, depositPayments, depositApplications, depositRefunds, invoices, codes }) {
  const comps = new Map(invoices.map((inv) => [inv.id, invoiceComponents(inv, codes)]));
  const compOf = (id) => comps.get(id) ?? { grandTotal: 0, commissionPending: false };
  const rows = [];

  for (const p of invoicePayments) {
    const comp = compOf(p.invoiceId);
    rows.push(makeRow({
      type: "INVOICE_PAYMENT", date: p.paymentDate, ref: p.paymentNo,
      invoiceId: p.invoiceId, invoiceNo: p.invoice?.invoiceNo, customer: p.invoice?.customer,
      gross: num(p.amount), deductions: proportionalDeductions(num(p.amount), comp), commissionPending: comp.commissionPending,
    }));
  }
  for (const d of depositPayments) {
    rows.push(makeRow({
      type: "DEPOSIT_PAYMENT", date: d.paidAt, ref: d.paymentNo, depositId: d.depositId,
      customer: d.deposit?.customer, gross: num(d.amount), deductions: zeroDeductions(),
    }));
  }
  for (const a of depositApplications) {
    const comp = compOf(a.invoiceId);
    rows.push(makeRow({
      type: "DEPOSIT_APPLIED", date: a.createdAt, ref: a.invoice?.invoiceNo,
      invoiceId: a.invoiceId, invoiceNo: a.invoice?.invoiceNo, depositId: a.depositId, customer: a.invoice?.customer,
      gross: 0, deductions: proportionalDeductions(num(a.amountApplied), comp), commissionPending: comp.commissionPending,
    }));
  }
  for (const r of depositRefunds) {
    rows.push(makeRow({
      type: "DEPOSIT_REFUND", date: r.refundedAt, ref: r.status === "CANCELLED" ? "Batal DP" : "Refund DP",
      depositId: r.id, customer: r.customer, gross: -num(r.refundedAmount), deductions: zeroDeductions(),
    }));
  }

  rows.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));

  const sum = (pick) => round2(rows.reduce((s, r) => s + pick(r), 0));
  const sumType = (type) => sum((r) => (r.type === type ? r.gross : 0));
  const pendingInvoices = new Set(rows.filter((r) => r.commissionPending).map((r) => r.invoiceId));

  const summary = {
    gross:     sum((r) => r.gross),
    netBefore: sum((r) => r.netBefore),
    netAfter:  sum((r) => r.netAfter),
    deductions: Object.fromEntries(DEDUCTION_KEYS.map((k) => [k, sum((r) => r.deductions[k])])),
    breakdown: {
      invoicePayments:     sumType("INVOICE_PAYMENT"),
      invoicePaymentCount: invoicePayments.length,
      depositPayments:     sumType("DEPOSIT_PAYMENT"),
      depositPaymentCount: depositPayments.length,
      refunds:             -sumType("DEPOSIT_REFUND"),
      refundCount:         depositRefunds.length,
    },
    commissionPendingInvoices: pendingInvoices.size,
  };

  const byDate = new Map();
  for (const r of rows) {
    const d = byDate.get(r.date) ?? { date: r.date, gross: 0, netBefore: 0, netAfter: 0 };
    d.gross += r.gross; d.netBefore += r.netBefore; d.netAfter += r.netAfter;
    byDate.set(r.date, d);
  }
  const daily = [...byDate.values()].map((d) => ({
    date: d.date, gross: round2(d.gross), netBefore: round2(d.netBefore), netAfter: round2(d.netAfter),
  }));

  return { rows, summary, daily };
}

module.exports = { buildRevenue, invoiceComponents, LEMBUR_TEAM_SHARE };
