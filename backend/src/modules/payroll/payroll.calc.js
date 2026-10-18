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

const offDateSet = (dates, schedules) => {
  const inPeriod = new Set(dates);
  return new Set(schedules.filter(isOffSchedule).map((sc) => dateKey(sc.workDate)).filter((d) => inPeriod.has(d)));
};

const presentDateSet = (attendances) =>
  new Set(attendances.filter((a) => PRESENT_STATUSES.includes(a.status)).map((a) => dateKey(a.workDate)));

/** Tanggal periode selama karyawan bekerja: mulai tanggal masuk, s/d tanggal resign (inklusif) */
const employedDates = (dates, hireDate, resignDate) => {
  const from = hireDate   ? dateKey(hireDate)   : null;
  const to   = resignDate ? dateKey(resignDate) : null;
  return dates.filter((d) => (!from || d >= from) && (!to || d <= to));
};

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
const computeTransportAllowance = ({ monthlyAmount, periodStart, periodEnd, schedules, attendances, holidays, hireDate = null, resignDate = null, rangeFactor = null }) => {
  const dates      = periodDates(periodStart, periodEnd);
  const offDates   = offDateSet(dates, schedules);
  const holidaySet = new Set(holidays.map((h) => dateKey(h.date)));
  const present    = presentDateSet(attendances);
  const employed   = employedDates(dates, hireDate, resignDate);

  const divisor          = dates.length - offDates.size;
  const employedWorkDays = employed.filter((d) => !offDates.has(d)).length;
  const absentDays = employed.filter((d) => !offDates.has(d) && !holidaySet.has(d) && !present.has(d)).length;

  // Mode Rentang Tanggal (PAY-001, keputusan user 2026-10-18): tunjangan bulanan diproporsikan
  // hari kalender (rangeFactor), lalu dibagi rata ke hari kerja rentang untuk potongan tidak hadir.
  if (rangeFactor != null) {
    const base = D(monthlyAmount).mul(D(rangeFactor));
    if (employedWorkDays <= 0) {
      return { amount: base, divisor: 0, dailyRate: D(0), absentDays: 0, offDays: offDates.size, periodDays: dates.length, employedWorkDays: 0 };
    }
    const dailyRate = base.div(D(employedWorkDays));
    const amount    = Prisma.Decimal.max(D(0), base.minus(dailyRate.mul(D(absentDays))));
    return { amount, divisor: employedWorkDays, dailyRate, absentDays, offDays: offDates.size, periodDays: dates.length, employedWorkDays };
  }

  if (divisor <= 0) {
    return { amount: D(monthlyAmount), divisor: 0, dailyRate: D(0), absentDays: 0, offDays: offDates.size, periodDays: dates.length, employedWorkDays: 0 };
  }
  const dailyRate = D(monthlyAmount).div(D(divisor));
  // Masuk/keluar di tengah periode (PAY-001): hanya hari kerja selama bekerja yang dibayar
  const base   = employedWorkDays === divisor ? D(monthlyAmount) : dailyRate.mul(D(employedWorkDays));
  const amount = Prisma.Decimal.max(D(0), base.minus(dailyRate.mul(D(absentDays))));
  return { amount, divisor, dailyRate, absentDays, offDays: offDates.size, periodDays: dates.length, employedWorkDays };
};

/**
 * Proporsi hari kerja untuk karyawan yang masuk/keluar di tengah periode (PAY-001).
 *   factor = hari kerja selama bekerja ÷ hari kerja periode   (hari kerja = hari − OFF, sama dengan pembagi transport)
 *   contoh: periode 31 hari, OFF 4, masuk tanggal 15 → 15 ÷ 27
 */
const computeProration = ({ periodStart, periodEnd, schedules, hireDate = null, resignDate = null }) => {
  const dates    = periodDates(periodStart, periodEnd);
  const offDates = offDateSet(dates, schedules);
  const divisor  = dates.length - offDates.size;
  const employedWorkDays = employedDates(dates, hireDate, resignDate).filter((d) => !offDates.has(d)).length;
  const prorated = employedWorkDays !== divisor;
  const factor   = divisor > 0 ? D(employedWorkDays).div(D(divisor)) : D(1);
  return { factor, prorated, divisor, employedWorkDays };
};

const daysInMonthOf = (yearMonth) => {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/**
 * Proporsi mode Rentang Tanggal (PAY-001, keputusan user 2026-10-18).
 *   factor = Σ per bulan kalender: hari rentang selama bekerja ÷ jumlah hari bulan itu
 *   contoh: 1–4 Nov → 4/30; 28 Okt – 3 Nov → 4/31 + 3/30
 * Hari kalender (OFF ikut dihitung), sejalan dengan gaji bulanan yang dibayar penuh untuk sebulan.
 */
const computeRangeProration = ({ periodStart, periodEnd, hireDate = null, resignDate = null }) => {
  const employed = employedDates(periodDates(periodStart, periodEnd), hireDate, resignDate);
  const counts = new Map();
  for (const d of employed) counts.set(d.slice(0, 7), (counts.get(d.slice(0, 7)) ?? 0) + 1);
  const parts  = [...counts].map(([yearMonth, days]) => ({ yearMonth, days, monthDays: daysInMonthOf(yearMonth) }));
  const factor = parts.reduce((acc, p) => acc.plus(D(p.days).div(D(p.monthDays))), D(0));
  return { factor, prorated: true, range: true, parts, employedDays: employed.length };
};

/** "4/30 hari" atau "4/31 + 3/30 hari" */
const rangeProrationLabel = (parts) => `${parts.map((p) => `${p.days}/${p.monthDays}`).join(" + ")} hari`;

/**
 * Hari alpha untuk Potongan Absen (PAY-019): hari kerja selama bekerja yang tidak ada absensi hadir.
 *   tidak dihitung: OFF, libur nasional, Cuti/Izin/Sakit (status jadwal LEAVE/IZIN/SAKIT)
 *   hari tanpa jadwal dihitung hari kerja (sama dengan transport)
 */
const computeAlphaDays = ({ periodStart, periodEnd, schedules, attendances, holidays, hireDate = null, resignDate = null }) => {
  const dates      = periodDates(periodStart, periodEnd);
  const offDates   = offDateSet(dates, schedules);
  const excused    = new Set(schedules.filter((sc) => ["LEAVE", "IZIN", "SAKIT"].includes(sc.status)).map((sc) => dateKey(sc.workDate)));
  const holidaySet = new Set(holidays.map((h) => dateKey(h.date)));
  const present    = presentDateSet(attendances);
  return employedDates(dates, hireDate, resignDate)
    .filter((d) => !offDates.has(d) && !excused.has(d) && !holidaySet.has(d) && !present.has(d)).length;
};

/**
 * Periode seluruhnya di luar masa kerja: berakhir sebelum Tanggal Masuk atau mulai sesudah
 * tanggal resign → tidak ada hari kerja yang bisa dibayar (generate ditolak).
 */
const isOutsideEmployment = ({ periodStart, periodEnd, hireDate = null, resignDate = null }) =>
  (hireDate   != null && dateKey(hireDate)   > dateKey(periodEnd)) ||
  (resignDate != null && dateKey(resignDate) < dateKey(periodStart));

/**
 * BPJS bagian perusahaan untuk satu slip — dipakai Laporan BPJS dan jurnal penggajian Accurate
 * agar angkanya sama. Dasar = gaji pokok PENUH (PAY-001), bukan gaji pokok proporsional:
 *   · slip tidak proporsional → item gaji = gaji pokok penuh saat slip dibuat (historis)
 *   · slip proporsional (item gaji punya quantity) → gaji pokok dari Setting Gaji aktif
 * Tiap komponen dibulatkan ke rupiah (sama dengan Laporan BPJS).
 */
const computeEmployerBpjs = ({ items = [], setting = null }) => {
  const gajiItem   = items.find((i) => i.type !== "DEDUCTION" && i.category === "gaji");
  const isProrated = gajiItem?.quantity != null;
  const baseSalary = isProrated && setting?.baseSalary != null
    ? Number(setting.baseSalary)
    : Number(gajiItem?.amount ?? setting?.baseSalary ?? 0);

  const jht = Math.round(baseSalary * Number(setting?.bpjsJhtEmployerPercent       ?? 0) / 100);
  const jp  = Math.round(baseSalary * Number(setting?.bpjsJpEmployerPercent        ?? 0) / 100);
  const kes = Math.round(baseSalary * Number(setting?.bpjsKesehatanEmployerPercent ?? 0) / 100);
  return { baseSalary, jht, jp, kes, total: jht + jp + kes };
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
  computeProration,
  computeRangeProration,
  rangeProrationLabel,
  computeAlphaDays,
  countUnscheduledDays,
  isOutsideEmployment,
  computeEmployerBpjs,
};
