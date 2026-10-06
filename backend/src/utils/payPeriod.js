// ── Periode gaji berdasarkan tanggal gajian (payDay) ──────────────────
//
// Satu sumber aturan untuk payroll (generate, bulk generate) dan Komisi Saya.
//
// Nama gaji mengikuti BULAN KERJA (bulan periode dimulai), dibayar pada tanggal gajian bulan berikutnya:
//   payDay 1 → "Gaji Oktober" = kerja 1–31 Okt, dibayar 1 Nov
//   payDay 7 → "Gaji Oktober" = kerja 7 Okt – 6 Nov, dibayar 7 Nov
//
// Tanggal gajian 29–31: bila bulan tidak punya tanggal tsb, pakai hari terakhir bulan itu.
// Periode selalu berakhir sehari sebelum gajian berikutnya → antar periode tanpa celah/tumpang tindih.
//   payDay 31, 2026 → Gaji Januari = 31 Jan – 27 Feb (dibayar 28 Feb), Gaji Februari = 28 Feb – 30 Mar

const { toDateOnly, wibParts } = require("./date");

const DEFAULT_PAY_DAY = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n) => String(n).padStart(2, "0");

const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Tanggal gajian efektif di bulan (y, m): payDay atau hari terakhir bulan bila lebih pendek */
const payDayIn = (y, m, payDay) => Math.min(payDay, daysInMonth(y, m));

const nextMonth = (y, m) => (m === 12 ? [y + 1, 1] : [y, m + 1]);
const prevMonth = (y, m) => (m === 1 ? [y - 1, 12] : [y, m - 1]);

/**
 * Periode gaji untuk bulan kerja `workMonth` (YYYY-MM).
 * @returns { periodStart, periodEnd, payDate } — Date @db.Date (00:00 UTC)
 */
const buildWorkPeriod = (payDay, workMonth) => {
  const p = payDay || DEFAULT_PAY_DAY;
  const [y, m] = workMonth.split("-").map(Number);
  const [ny, nm] = nextMonth(y, m);

  const periodStart = toDateOnly(new Date(Date.UTC(y, m - 1, payDayIn(y, m, p))));
  const payDate     = toDateOnly(new Date(Date.UTC(ny, nm - 1, payDayIn(ny, nm, p))));
  const periodEnd   = new Date(payDate.getTime() - DAY_MS);

  return { periodStart, periodEnd, payDate };
};

/** Bulan kerja (YYYY-MM) yang periodenya memuat tanggal `date` (kalender WIB) */
const workMonthFor = (payDay, date = new Date()) => {
  const p = payDay || DEFAULT_PAY_DAY;
  const { year, month, day } = wibParts(date);
  // Belum sampai tanggal gajian bulan ini → masih periode yang dimulai bulan lalu
  if (day < payDayIn(year, month, p)) {
    const [py, pm] = prevMonth(year, month);
    return `${py}-${pad(pm)}`;
  }
  return `${year}-${pad(month)}`;
};

/** Ringkasan periode: { yearMonth (bulan kerja), payDay, periodStart, periodEnd, payDate } */
const resolvePayPeriod = (payDay, workMonth) => {
  const p  = payDay || DEFAULT_PAY_DAY;
  const ym = workMonth || workMonthFor(p);
  return { yearMonth: ym, payDay: p, ...buildWorkPeriod(p, ym) };
};

module.exports = { DEFAULT_PAY_DAY, buildWorkPeriod, workMonthFor, resolvePayPeriod };
