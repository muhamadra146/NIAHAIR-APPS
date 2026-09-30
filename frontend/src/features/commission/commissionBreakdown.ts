// ── Rincian perhitungan komisi (tampilan) ─────────────────────────────
//
// Perhitungan dilakukan backend (commission.calc.calcCategoryItem). File ini hanya
// MENYUSUN teks rincian dari hasil hitung — dipakai Kalkulator, daftar Komisi admin,
// dan Komisi Saya agar semua menampilkan dasar angka yang sama.

import { formatCurrency } from "@/lib/utils";
import type { Commission, CommissionDefaultQty, CommissionSplitMode } from "./types";

export const SPLIT_MODE_LABEL: Record<CommissionSplitMode, string> = {
  BY_QTY: "Proporsional qty",
  EQUAL:  "Bagi rata per staf",
  FULL:   "Penuh per staf",
};

export const SPLIT_MODE_HINT: Record<CommissionSplitMode, string> = {
  BY_QTY: "porsi = qty dikerjakan ÷ qty item (mis. helai)",
  EQUAL:  "porsi = 1 ÷ jumlah staf yang mengerjakan",
  FULL:   "setiap staf dapat komisi penuh (tidak dibagi)",
};

export const DEFAULT_QTY_LABEL: Record<CommissionDefaultQty, string> = {
  ITEM_QTY: "Dari qty item",
  ONE:      "1",
};

export type BreakdownRole = "PRIMARY" | "HELPER_UNIT" | "HELPER_FLAT";

export interface BreakdownInput {
  role:            BreakdownRole;
  splitMode:       CommissionSplitMode;
  unit:            string;
  pricePerUnit:    number | null;
  commissionType:  "PERCENTAGE" | "FIXED" | null;
  commissionValue: number;
  workQty:         number;
  workRatio:       number | null;
  /** primary: base item setelah potongan helper */
  remainingBase:   number;
  /** primary: jumlah staf di job ini */
  staffCount:      number;
  /** qty item dalam satuan konversi (untuk BY_QTY) */
  itemQty:         number | null;
  effectiveBase:   number;
  grossAmount:     number;
  flatDeduction:   number;
  amount:          number;
}

const rp  = (n: number) => formatCurrency(n);
const num = (n: number) => Number(n.toFixed(2)).toLocaleString("id-ID");

function portionText(b: BreakdownInput): string {
  if (b.splitMode === "FULL")  return "penuh";
  if (b.splitMode === "EQUAL") return `1/${b.staffCount} staf`;
  if (b.itemQty && b.itemQty > 0) return `${num(b.workQty)}/${num(b.itemQty)} ${b.unit}`;
  return `${num((b.workRatio ?? 0) * 100)}%`;
}

/** Susun baris rincian, mis. "Rp 938.500 × 1/2 staf × 10% = Rp 46.925" */
export function buildBreakdownLines(b: BreakdownInput): string[] {
  if (!b.commissionType) return ["Staf belum punya rule komisi untuk job ini"];

  const rate = `${num(b.commissionValue)}%`;

  if (b.role === "HELPER_UNIT") {
    const lines = [`${num(b.workQty)} ${b.unit} × ${rp(b.pricePerUnit ?? 0)} = ${rp(b.effectiveBase)} (memotong base job utama)`];
    lines.push(b.commissionType === "PERCENTAGE"
      ? `${rp(b.effectiveBase)} × ${rate} = ${rp(b.amount)}`
      : `Komisi flat ${rp(b.amount)}`);
    return lines;
  }

  if (b.role === "HELPER_FLAT") {
    return [`Komisi flat ${rp(b.amount)} (memotong komisi job utama)`];
  }

  // PRIMARY
  const lines = b.commissionType === "PERCENTAGE"
    ? [`${rp(b.remainingBase)} × ${portionText(b)} × ${rate} = ${rp(b.grossAmount)}`]
    : [`Komisi flat ${rp(b.commissionValue)}${b.splitMode === "FULL" ? "" : ` (porsi ${portionText(b)} untuk potongan)`}`];

  if (b.flatDeduction > 0) {
    lines.push(`− potongan helper ${rp(b.flatDeduction)} = ${rp(b.amount)}`);
  }
  return lines;
}

/**
 * Susun input rincian dari komisi TERSIMPAN (sistem kategori-job).
 * Tersimpan: baseAmount = base staf (sisa base × porsi, atau qty × harga untuk helper).
 * null jika komisi berasal dari sistem lama (tanpa commissionJob).
 */
export function breakdownFromCommission(c: Commission): BreakdownInput | null {
  const job = c.treatmentJobAssignment?.commissionJob;
  if (!job) return null;

  const price  = job.pricePerUnit != null ? Number(job.pricePerUnit) : null;
  const role: BreakdownRole = job.deductsFromJobId
    ? ((price ?? 0) > 0 ? "HELPER_UNIT" : "HELPER_FLAT")
    : "PRIMARY";

  const base   = Number(c.baseAmount) || 0;
  const qty    = Number(c.workQty) || 0;
  const ratio  = c.workRatio != null && c.workRatio !== "" ? Number(c.workRatio) : null;
  const value  = Number(c.commissionValue) || 0;
  const amount = Number(c.commissionAmount) || 0;
  const type   = c.commissionType === "FIXED" ? "FIXED" : "PERCENTAGE";

  const gross = role === "PRIMARY"
    ? (type === "PERCENTAGE" ? (base * value) / 100 : value)
    : amount;
  // Potongan flat tidak disimpan terpisah → selisih hitungan kotor dan komisi (kecuali manual)
  const flat  = role === "PRIMARY" && !c.isManualOverride ? Math.max(0, Math.round(gross) - amount) : 0;

  return {
    role,
    splitMode:       job.splitMode,
    unit:            job.unit || "helai",
    pricePerUnit:    price,
    commissionType:  type,
    commissionValue: value,
    workQty:         qty,
    workRatio:       ratio,
    remainingBase:   ratio && ratio > 0 ? base / ratio : base,
    staffCount:      ratio && ratio > 0 ? Math.round(1 / ratio) : 1,
    itemQty:         ratio && ratio > 0 && qty > 0 ? Math.round(qty / ratio) : null,
    effectiveBase:   base,
    grossAmount:     gross,
    flatDeduction:   flat,
    amount,
  };
}
