// ── Hari kerja cuti (EMP-012, keputusan user 2026-10-19) ──────────────
//
// Durasi cuti dihitung dalam HARI KERJA. Satu tanggal di rentang cuti memakai jatah
// KECUALI:
//   · jadwal karyawan pada tanggal itu OFF (status OFF atau shift tanpa jam — sama
//     dengan definisi hari libur di payroll, payroll.calc isOffSchedule), atau
//   · tanggal itu hari libur nasional (Pengaturan → Hari Libur).
// Tanggal tanpa jadwal TETAP dihitung (sejalan payroll: hari tanpa jadwal = hari kerja).
//
// Dipakai untuk: cek sisa jatah, jumlah menunggu (Leave.totalDays), penambahan/
// pengembalian hari terpakai, dan pratinjau "N hari kerja" di form.

const repo = require("./leave.repository");

const DAY_MS = 24 * 60 * 60 * 1000;

const dateKey = (d) => new Date(d).toISOString().slice(0, 10);

/** Jadwal libur: status OFF atau shift tanpa jam (mis. shift "Day Off") */
const isOffSchedule = (sc) => sc.status === "OFF" || Boolean(sc.shift && !sc.shift.startTime);

/** Semua tanggal "YYYY-MM-DD" dari start s/d end (inklusif); start/end = 00:00 UTC */
const rangeDates = (start, end) => {
  const out = [];
  for (let t = new Date(start).getTime(); t <= new Date(end).getTime(); t += DAY_MS) out.push(dateKey(t));
  return out;
};

/**
 * Fungsi murni.
 * @returns {{ totalDays: number, calendarDays: number, offDays: number, holidayDays: number, offDates: Set<string> }}
 */
const computeWorkingDays = ({ start, end, schedules = [], holidays = [] }) => {
  const offDates   = new Set((schedules ?? []).filter(isOffSchedule).map((s) => dateKey(s.workDate)));
  const holidaySet = new Set((holidays ?? []).map((h) => dateKey(h.date)));
  const dates      = rangeDates(start, end);
  const offDays     = dates.filter((d) => offDates.has(d)).length;
  const holidayDays = dates.filter((d) => !offDates.has(d) && holidaySet.has(d)).length;
  return {
    totalDays:    dates.length - offDays - holidayDays,
    calendarDays: dates.length,
    offDays,
    holidayDays,
    offDates,
  };
};

/** Hitung hari kerja cuti seorang karyawan dari jadwal & hari libur di database */
const countWorkingDays = async (employeeId, start, end) => {
  const [schedules, holidays] = await Promise.all([
    repo.findSchedulesInRange(employeeId, start, end),
    repo.findHolidaysInRange(start, end),
  ]);
  return { ...computeWorkingDays({ start, end, schedules, holidays }), schedules: schedules ?? [] };
};

module.exports = { computeWorkingDays, countWorkingDays, isOffSchedule, rangeDates, dateKey };
