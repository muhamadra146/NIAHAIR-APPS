'use strict';

// ── Perhitungan uang makan & transport (PAY-018) ─────────────
// Fungsi murni: tidak menyentuh database. Tanggal dibandingkan sebagai "YYYY-MM-DD"
// dari kolom tanggal (workDate / holiday.date / periode payroll) yang disimpan 00:00 UTC.

const { Prisma } = require("@prisma/client");

const D = (v) => new Prisma.Decimal(String(v ?? 0));
const DAY_MS = 24 * 60 * 60 * 1000;

const PRESENT_STATUSES = ["PRESENT", "LATE", "EARLY_LEAVE", "HALF_DAY"];

const dateKey = (d) => new Date(d).toISOString().slice(0, 10);

/** Semua tanggal ("YYYY-MM-DD") dari periodStart s/d periodEnd (inklusif) */
const periodDates = (periodStart, periodEnd) => {
  const out = [];
  for (let t = new Date(periodStart).getTime(); t <= new Date(periodEnd).getTime(); t += DAY_MS) {
    out.push(dateKey(t));
  }
  return out;
};

const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
};

/** Jadwal libur: status OFF atau shift tanpa jam (mis. shift "Day Off") */
const isOffSchedule = (sc) => sc.status === "OFF" || (sc.shift && !sc.shift.startTime);

/** Durasi shift (jam) dari jadwal; shift melewati tengah malam ditangani. null bila tidak diketahui */
const shiftHours = (sc) => {
  const start = toMinutes(sc?.shift?.startTime);
  const end   = toMinutes(sc?.shift?.endTime);
  if (start == null || end == null) return null;
  const mins = end > start ? end - start : end + 24 * 60 - start;
  return mins / 60;
};

/**
 * Uang makan per hari masuk (PAY-018).
 *   batas setengah hari = (jam kerja shift − 1 jam istirahat) ÷ 2   (10 jam → 4,5 jam; 9 jam → 4 jam)
 *   lama kerja ≥ batas → penuh; < batas → setengah (50%)
 *   tidak ada absen pulang / jam shift tidak diketahui → penuh
 *   libur, cuti, sakit, izin tidak masuk, alpha → tidak dapat (tidak ada absensi hadir)
 * @returns { amount: Decimal, fullDays, halfDays, units } units = fullDays + 0,5 × halfDays
 */
const computeMealAllowance = ({ ratePerDay, attendances, schedules }) => {
  const scheduleByDate = new Map(schedules.map((sc) => [dateKey(sc.workDate), sc]));
  let fullDays = 0;
  let halfDays = 0;

  for (const a of attendances) {
    if (!PRESENT_STATUSES.includes(a.status)) continue;
    const hours = shiftHours(scheduleByDate.get(dateKey(a.workDate)));
    if (!a.checkInAt || !a.checkOutAt || hours == null) { fullDays += 1; continue; }

    const threshold = Math.max(hours - 1, 0) / 2;
    const worked    = (new Date(a.checkOutAt) - new Date(a.checkInAt)) / (60 * 60 * 1000);
    if (worked >= threshold) fullDays += 1;
    else halfDays += 1;
  }

  const units = fullDays + halfDays * 0.5;
  return { amount: D(ratePerDay).mul(D(units)), fullDays, halfDays, units };
};

/**
 * Tunjangan transport per bulan (PAY-018).
 *   pembagi = jumlah hari periode − hari libur (OFF) di jadwal          (31 − 4 = 27)
 *   tarif harian = tunjangan ÷ pembagi                                 (500.000 ÷ 27 = 18.519)
 *   potongan = hari tidak hadir × tarif harian
 *   hari tidak hadir = hari kerja (bukan OFF, bukan libur nasional) tanpa absensi hadir
 *                      → cuti, sakit, izin tidak masuk, alpha dipotong; libur nasional tidak
 *   hari tanpa jadwal dianggap hari kerja (jadwal harus diisi lengkap)
 */
const computeTransportAllowance = ({ monthlyAmount, periodStart, periodEnd, schedules, attendances, holidays }) => {
  const dates      = periodDates(periodStart, periodEnd);
  const inPeriod   = new Set(dates);
  const offDates   = new Set(schedules.filter(isOffSchedule).map((sc) => dateKey(sc.workDate)).filter((d) => inPeriod.has(d)));
  const holidaySet = new Set(holidays.map((h) => dateKey(h.date)));
  const present    = new Set(attendances.filter((a) => PRESENT_STATUSES.includes(a.status)).map((a) => dateKey(a.workDate)));

  const divisor = dates.length - offDates.size;
  const absentDays = dates.filter((d) => !offDates.has(d) && !holidaySet.has(d) && !present.has(d)).length;

  if (divisor <= 0) {
    return { amount: D(monthlyAmount), divisor: 0, dailyRate: D(0), absentDays: 0, offDays: offDates.size, periodDays: dates.length };
  }
  const dailyRate = D(monthlyAmount).div(D(divisor));
  const amount    = Prisma.Decimal.max(D(0), D(monthlyAmount).minus(dailyRate.mul(D(absentDays))));
  return { amount, divisor, dailyRate, absentDays, offDays: offDates.size, periodDays: dates.length };
};

/** Hari dalam periode yang belum punya jadwal (untuk peringatan sebelum generate) */
const countUnscheduledDays = ({ periodStart, periodEnd, schedules }) => {
  const scheduled = new Set(schedules.map((sc) => dateKey(sc.workDate)));
  return periodDates(periodStart, periodEnd).filter((d) => !scheduled.has(d)).length;
};

module.exports = {
  PRESENT_STATUSES,
  periodDates,
  shiftHours,
  computeMealAllowance,
  computeTransportAllowance,
  countUnscheduledDays,
};
