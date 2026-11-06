'use strict';

// ── Perhitungan PPh 21 (PAY-037) ─────────────────────────────
// Fungsi murni: tidak menyentuh database. Rumus & contoh: docs/23_PPH21_PLANNING.md.
// Tarif (TER, Pasal 17, PTKP) datang dari baris TaxSetting — bukan konstanta di kode.

// Slip dengan tanggal gajian sebelum tanggal ini tidak dihitung PPh 21 (keputusan owner 2026-11-06)
const PPH21_START_DATE = "2027-01-01";

const DAY_MS = 24 * 60 * 60 * 1000;

// Kategori TER bulanan dari status PTKP (PP 58/2023)
const TER_CATEGORY = {
  TK0: "A", TK1: "A", K0: "A",
  TK2: "B", TK3: "B", K1: "B", K2: "B",
  K3:  "C",
};

const PTKP_LABEL = {
  TK0: "TK/0", TK1: "TK/1", TK2: "TK/2", TK3: "TK/3",
  K0:  "K/0",  K1:  "K/1",  K2:  "K/2",  K3:  "K/3",
};

// Item yang bukan penghasilan bruto: hasil perhitungan pajak itu sendiri
const TAX_ITEM_CATEGORIES = ["pph21", "pph21_refund"];

const num = (v) => Number(v ?? 0);

/** Tanggal gajian = sehari setelah akhir periode → masa pajak "YYYY-MM" */
const taxPeriodOf = (periodEnd) =>
  new Date(new Date(periodEnd).getTime() + DAY_MS).toISOString().slice(0, 7);

const isTaxable = (periodEnd) =>
  new Date(new Date(periodEnd).getTime() + DAY_MS).toISOString().slice(0, 10) >= PPH21_START_DATE;

/** Tarif dari tabel bracket [{ upTo, rate }] — upTo inklusif, null = tanpa batas atas */
const rateFor = (brackets, amount) => {
  const row = brackets.find((b) => b.upTo == null || amount <= num(b.upTo));
  return num(row?.rate);
};

/** PTKP setahun: diri sendiri + kawin (K/…) + tanggungan (maks maxDependents) */
const ptkpAmount = (ptkpStatus, setting) => {
  const married    = ptkpStatus.startsWith("K");
  const dependents = Math.min(Number(ptkpStatus.replace(/\D/g, "")), setting.maxDependents ?? 3);
  return num(setting.ptkpSelf) + (married ? num(setting.ptkpMarried) : 0) + dependents * num(setting.ptkpDependent);
};

/** Tarif progresif Pasal 17 atas PKP */
const pasal17 = (pkp, brackets) => {
  let tax = 0;
  let lower = 0;
  for (const b of brackets) {
    const upper = b.upTo == null ? Infinity : num(b.upTo);
    if (pkp <= lower) break;
    tax += (Math.min(pkp, upper) - lower) * num(b.rate) / 100;
    lower = upper;
  }
  return Math.floor(tax);
};

/**
 * Bruto pajak satu slip (PAY-037):
 *   semua item penghasilan − potongan alpha − potongan terlambat
 *   + BPJS Kesehatan perusahaan + JKK + JKM
 * JHT & JP perusahaan, iuran BPJS karyawan, dan kasbon tidak memengaruhi bruto.
 */
const computeTaxGross = ({ items = [], employer }) => {
  let gross = 0;
  for (const i of items) {
    if (TAX_ITEM_CATEGORIES.includes(i.category)) continue;
    if (i.type === "DEDUCTION") {
      if (i.category === "absen" || i.category === "terlambat") gross -= num(i.amount);
    } else {
      gross += num(i.amount);
    }
  }
  gross += num(employer?.kes) + num(employer?.jkk) + num(employer?.jkm);
  return Math.round(Math.max(gross, 0) * 100) / 100;
};

/** Iuran JHT + JP yang dibayar karyawan (pengurang neto tahunan) */
const employeePensionContribution = (items = []) =>
  items
    .filter((i) => i.type === "DEDUCTION" && (i.category === "bpjs_jht" || i.category === "bpjs_jp"))
    .reduce((s, i) => s + num(i.amount), 0);

/**
 * PPh 21 masa biasa: bruto × TER bulanan.
 * Slip lain di masa yang sama (mode rentang) ikut dijumlahkan: PPh = TER(total) × total − PPh slip lain.
 */
const computeTerTax = ({ gross, ptkpStatus, setting, sameMonth = [] }) => {
  const category   = TER_CATEGORY[ptkpStatus];
  const otherGross = sameMonth.reduce((s, p) => s + num(p.taxGross), 0);
  const otherTax   = sameMonth.reduce((s, p) => s + num(p.pph21), 0);
  const total      = gross + otherGross;
  const rate       = rateFor(setting[`ter${category}`], total);
  const pph21      = Math.max(Math.floor(total * rate / 100) - otherTax, 0);
  return { method: "TER", category, rate, pph21 };
};

/**
 * PPh 21 masa terakhir (Desember / slip terakhir karyawan resign) — hitung ulang setahun:
 *   bruto setahun − biaya jabatan − iuran JHT & JP karyawan = neto
 *   neto − PTKP = PKP (bulat ke bawah ribuan) → tarif Pasal 17 − PPh yang sudah dipotong
 * Hasil minus = lebih potong (dikembalikan ke karyawan).
 * Penghasilan karyawan yang masuk di tengah tahun tidak disetahunkan.
 */
const computeAnnualTax = ({ gross, pension, ptkpStatus, setting, priorSlips = [], taxPeriod }) => {
  const yearGross   = gross + priorSlips.reduce((s, p) => s + num(p.taxGross), 0);
  const yearPension = pension + priorSlips.reduce((s, p) => s + employeePensionContribution(p.items), 0);
  const withheld    = priorSlips.reduce((s, p) => s + num(p.pph21), 0);
  const months      = new Set([taxPeriod, ...priorSlips.map((p) => p.taxPeriod)]).size;

  const positionCost = Math.min(
    yearGross * num(setting.positionCostPercent) / 100,
    num(setting.positionCostMonthlyMax) * months,
  );
  const neto      = yearGross - positionCost - yearPension;
  const ptkp      = ptkpAmount(ptkpStatus, setting);
  const pkp       = Math.max(Math.floor((neto - ptkp) / 1000) * 1000, 0);
  const annualTax = pasal17(pkp, setting.pasal17Brackets);

  return {
    method: "ANNUAL",
    pph21:  annualTax - withheld,
    detail: { yearGross, positionCost, yearPension, neto, ptkp, pkp, annualTax, withheld, months },
  };
};

/** Masa terakhir pegawai tetap: Desember, atau slip yang memuat tanggal resign */
const isFinalPeriod = ({ taxPeriod, employmentType, resignDate, periodEnd }) =>
  employmentType !== "NON_PERMANENT" &&
  (taxPeriod.endsWith("-12") || (resignDate != null && new Date(resignDate) <= new Date(periodEnd)));

/**
 * PPh 21 satu slip.
 * @param priorSlips slip lain karyawan di tahun pajak yang sama: { taxPeriod, taxGross, pph21, items }
 * @returns null bila slip di luar ruang lingkup (tanggal gajian < 2027-01-01);
 *          { missingPtkp: true, taxPeriod } bila status PTKP belum diisi;
 *          selain itu { taxPeriod, taxPtkpStatus, taxGross, taxMethod, taxTerRate, pph21, item }
 */
const computePayrollTax = ({ items, employer, periodEnd, ptkpStatus, employmentType, resignDate, setting, priorSlips = [] }) => {
  if (!isTaxable(periodEnd)) return null;
  const taxPeriod = taxPeriodOf(periodEnd);
  if (!ptkpStatus) return { missingPtkp: true, taxPeriod };
  if (!setting) throw new Error(`Tarif PPh 21 untuk tahun ${taxPeriod.slice(0, 4)} belum diatur`);

  const gross = computeTaxGross({ items, employer });
  const final = isFinalPeriod({ taxPeriod, employmentType, resignDate, periodEnd });

  const result = final
    ? computeAnnualTax({ gross, pension: employeePensionContribution(items), ptkpStatus, setting, priorSlips, taxPeriod })
    : computeTerTax({ gross, ptkpStatus, setting, sameMonth: priorSlips.filter((p) => p.taxPeriod === taxPeriod) });

  let item = null;
  if (result.pph21 > 0) {
    const label = result.method === "TER"
      ? `PPh 21 (TER ${result.category} ${String(result.rate).replace(".", ",")}%)`
      : "PPh 21 (hitung ulang tahunan)";
    item = { type: "DEDUCTION", category: "pph21", label, amount: result.pph21 };
  } else if (result.pph21 < 0) {
    item = { type: "INCOME", category: "pph21_refund", label: "Pengembalian Lebih Potong PPh 21", amount: -result.pph21 };
  }

  return {
    taxPeriod,
    taxPtkpStatus: ptkpStatus,
    taxGross:      gross,
    taxMethod:     result.method,
    taxTerRate:    result.method === "TER" ? result.rate : null,
    pph21:         result.pph21,
    item,
    detail:        result.detail ?? null,
  };
};

module.exports = {
  PPH21_START_DATE,
  TER_CATEGORY,
  PTKP_LABEL,
  TAX_ITEM_CATEGORIES,
  taxPeriodOf,
  isTaxable,
  rateFor,
  ptkpAmount,
  pasal17,
  computeTaxGross,
  employeePensionContribution,
  computeTerTax,
  computeAnnualTax,
  isFinalPeriod,
  computePayrollTax,
};
