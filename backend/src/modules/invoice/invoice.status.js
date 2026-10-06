'use strict';

const { Prisma } = require("@prisma/client");

const ZERO = new Prisma.Decimal(0);

/**
 * Status invoice dari sisa tagihan dan uang yang sudah masuk (deposit + pembayaran) — FIN-015.
 *   PAID    → sisa tagihan 0
 *   PARTIAL → sudah ada uang masuk, masih ada sisa ("Sebagian")
 *   UNPAID  → belum ada uang masuk
 * Hanya status di ERP; Accurate menghitung status pelunasannya sendiri dari penerimaan.
 */
const resolveInvoiceStatus = (outstanding, received) => {
  const out = new Prisma.Decimal(String(outstanding ?? 0));
  const rec = new Prisma.Decimal(String(received ?? 0));
  if (out.lte(ZERO)) return "PAID";
  return rec.gt(ZERO) ? "PARTIAL" : "UNPAID";
};

/** Status yang masih bisa dibayar / masih punya sisa tagihan */
const OPEN_INVOICE_STATUSES = ["UNPAID", "PARTIAL"];

module.exports = { resolveInvoiceStatus, OPEN_INVOICE_STATUSES };
