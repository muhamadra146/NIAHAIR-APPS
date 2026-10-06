'use strict';

const { computeMealAllowance, computeTransportAllowance, countUnscheduledDays, shiftHours } = require("./payroll.calc");

const day = (d) => new Date(`${d}T00:00:00.000Z`);
const wib = (d, hhmm) => new Date(`${d}T${hhmm}:00+07:00`);
const shift = (startTime, endTime) => ({ startTime, endTime });

// Jadwal 1 bulan: tanggal di `off` = OFF, sisanya WORKING shift 09:00–19:00 (10 jam)
const monthSchedules = (y, m, days, off = []) =>
  Array.from({ length: days }, (_, i) => {
    const d = `${y}-${String(m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
    return off.includes(i + 1)
      ? { workDate: day(d), status: "OFF", shift: null }
      : { workDate: day(d), status: "WORKING", shift: shift("09:00", "19:00") };
  });

const presentAll = (schedules, skip = []) =>
  schedules
    .filter((sc) => sc.status === "WORKING" && !skip.includes(sc.workDate.toISOString().slice(0, 10)))
    .map((sc) => {
      const d = sc.workDate.toISOString().slice(0, 10);
      return { workDate: sc.workDate, status: "PRESENT", checkInAt: wib(d, "09:00"), checkOutAt: wib(d, "19:00") };
    });

describe("computeTransportAllowance (PAY-018)", () => {
  test("contoh: periode 31 hari, libur 4 → pembagi 27, tarif harian 18.519", () => {
    const schedules = monthSchedules(2026, 10, 31, [5, 12, 19, 26]);
    const r = computeTransportAllowance({
      monthlyAmount: 500000, periodStart: day("2026-10-01"), periodEnd: day("2026-10-31"),
      schedules, attendances: presentAll(schedules), holidays: [],
    });
    expect(r.divisor).toBe(27);
    expect(Math.round(Number(r.dailyRate))).toBe(18519);
    expect(r.absentDays).toBe(0);
    expect(Number(r.amount)).toBe(500000);
  });

  test("contoh: 30 hari, libur 4, sakit 1 hari → 500.000 ÷ 26 × 25", () => {
    const schedules = monthSchedules(2026, 11, 30, [1, 8, 15, 22]);
    const r = computeTransportAllowance({
      monthlyAmount: 500000, periodStart: day("2026-11-01"), periodEnd: day("2026-11-30"),
      schedules, attendances: presentAll(schedules, ["2026-11-10"]), holidays: [],
    });
    expect(r.divisor).toBe(26);
    expect(r.absentDays).toBe(1);
    expect(Number(r.amount)).toBeCloseTo((500000 / 26) * 25, 2);
  });

  test("cuti/sakit/izin/alpha dipotong; libur nasional tidak", () => {
    const schedules = monthSchedules(2026, 11, 30, [1, 8, 15, 22]);
    schedules[9].status  = "SAKIT"; // 10 Nov
    schedules[10].status = "LEAVE"; // 11 Nov
    // 12 Nov alpha (WORKING tanpa absensi), 17 Nov libur nasional tidak masuk
    const attendances = presentAll(schedules, ["2026-11-12", "2026-11-17"]);
    const r = computeTransportAllowance({
      monthlyAmount: 520000, periodStart: day("2026-11-01"), periodEnd: day("2026-11-30"),
      schedules, attendances, holidays: [{ date: day("2026-11-17") }],
    });
    expect(r.absentDays).toBe(3); // sakit + cuti + alpha
    expect(Number(r.amount)).toBeCloseTo(520000 - (520000 / 26) * 3, 2);
  });

  test("hari tanpa jadwal dianggap hari kerja (tidak masuk → dipotong)", () => {
    const r = computeTransportAllowance({
      monthlyAmount: 300000, periodStart: day("2026-11-01"), periodEnd: day("2026-11-30"),
      schedules: [], attendances: [], holidays: [],
    });
    expect(r.divisor).toBe(30);
    expect(r.absentDays).toBe(30);
    expect(Number(r.amount)).toBe(0);
  });

  test("shift 'Day Off' (tanpa jam) dihitung libur", () => {
    const schedules = [{ workDate: day("2026-11-01"), status: "WORKING", shift: shift(null, null) }];
    const r = computeTransportAllowance({
      monthlyAmount: 300000, periodStart: day("2026-11-01"), periodEnd: day("2026-11-03"),
      schedules, attendances: [], holidays: [],
    });
    expect(r.offDays).toBe(1);
    expect(r.divisor).toBe(2);
  });

  test("periode tanggal gajian 7 (melewati 2 bulan)", () => {
    const r = computeTransportAllowance({
      monthlyAmount: 500000, periodStart: day("2026-10-07"), periodEnd: day("2026-11-06"),
      schedules: [], attendances: [], holidays: [],
    });
    expect(r.periodDays).toBe(31);
  });
});

describe("computeMealAllowance (PAY-018)", () => {
  const sched = (d, s = "09:00", e = "19:00") => ({ workDate: day(d), status: "WORKING", shift: shift(s, e) });
  const att = (d, inT, outT, status = "PRESENT") => ({
    workDate: day(d), status, checkInAt: inT && wib(d, inT), checkOutAt: outT && wib(d, outT),
  });

  test("shift 10 jam: batas 4,5 jam — pulang setelah ≥ 4,5 jam tetap penuh", () => {
    const r = computeMealAllowance({
      ratePerDay: 50000, schedules: [sched("2026-11-02")], attendances: [att("2026-11-02", "09:00", "13:30")],
    });
    expect(r.fullDays).toBe(1);
    expect(Number(r.amount)).toBe(50000);
  });

  test("shift 10 jam: pulang sebelum 4,5 jam → setengah", () => {
    const r = computeMealAllowance({
      ratePerDay: 50000, schedules: [sched("2026-11-02")], attendances: [att("2026-11-02", "09:00", "13:29")],
    });
    expect(r.halfDays).toBe(1);
    expect(Number(r.amount)).toBe(25000);
  });

  test("shift 9 jam: batas 4 jam", () => {
    const schedules = [sched("2026-11-02", "09:00", "18:00"), sched("2026-11-03", "09:00", "18:00")];
    const r = computeMealAllowance({
      ratePerDay: 50000, schedules,
      attendances: [att("2026-11-02", "09:00", "13:00"), att("2026-11-03", "09:00", "12:59")],
    });
    expect([r.fullDays, r.halfDays]).toEqual([1, 1]);
    expect(Number(r.amount)).toBe(75000);
  });

  test("lupa absen pulang → penuh", () => {
    const r = computeMealAllowance({
      ratePerDay: 50000, schedules: [sched("2026-11-02")], attendances: [att("2026-11-02", "09:00", null)],
    });
    expect(r.fullDays).toBe(1);
  });

  test("tidak hadir (ABSENT) tidak dapat; terlambat tetap dapat", () => {
    const r = computeMealAllowance({
      ratePerDay: 50000,
      schedules: [sched("2026-11-02"), sched("2026-11-03")],
      attendances: [att("2026-11-02", null, null, "ABSENT"), att("2026-11-03", "10:00", "19:00", "LATE")],
    });
    expect(r.units).toBe(1);
    expect(Number(r.amount)).toBe(50000);
  });
});

describe("helpers", () => {
  test("shiftHours: shift melewati tengah malam", () => {
    expect(shiftHours({ shift: shift("20:00", "06:00") })).toBe(10);
    expect(shiftHours({ shift: shift(null, null) })).toBeNull();
  });

  test("countUnscheduledDays", () => {
    expect(countUnscheduledDays({
      periodStart: day("2026-11-01"), periodEnd: day("2026-11-05"),
      schedules: [{ workDate: day("2026-11-02") }, { workDate: day("2026-11-04") }],
    })).toBe(3);
  });
});

describe("masuk/keluar di tengah periode (PAY-001) dan alpha (PAY-019)", () => {
  const { computeProration, computeAlphaDays } = require("./payroll.calc");
  const OCT = { periodStart: day("2026-10-01"), periodEnd: day("2026-10-31") };
  const off = [5, 12, 19, 26]; // 4 hari OFF → 27 hari kerja

  test("contoh: masuk 15 Okt → gaji pokok 15/27", () => {
    const schedules = monthSchedules(2026, 10, 31, off);
    const r = computeProration({ ...OCT, schedules, hireDate: day("2026-10-15") });
    expect(r.prorated).toBe(true);
    expect(r.divisor).toBe(27);
    expect(r.employedWorkDays).toBe(15); // 15–31 Okt = 17 hari − OFF 19 & 26
    expect(Math.round(3000000 * Number(r.factor))).toBe(1666667);
  });

  test("bekerja penuh → tidak proporsional", () => {
    const schedules = monthSchedules(2026, 10, 31, off);
    const r = computeProration({ ...OCT, schedules, hireDate: day("2025-01-01") });
    expect(r.prorated).toBe(false);
  });

  test("resign 10 Okt → hanya hari kerja s/d 10 Okt", () => {
    const schedules = monthSchedules(2026, 10, 31, off);
    const r = computeProration({ ...OCT, schedules, resignDate: day("2026-10-10") });
    expect(r.employedWorkDays).toBe(9); // 1–10 Okt minus OFF 5
  });

  test("transport: hari sebelum masuk tidak dipotong sebagai tidak hadir, tapi dibayar proporsional", () => {
    const schedules = monthSchedules(2026, 10, 31, off);
    const attendances = presentAll(schedules).filter((a) => a.workDate >= day("2026-10-15"));
    const r = computeTransportAllowance({
      monthlyAmount: 540000, ...OCT, schedules, attendances, holidays: [], hireDate: day("2026-10-15"),
    });
    expect(r.absentDays).toBe(0);
    expect(Number(r.amount)).toBeCloseTo((540000 / 27) * 15, 2);
  });

  test("alpha: hanya hari kerja tanpa absen; cuti/izin/sakit, OFF, libur nasional tidak dihitung", () => {
    const schedules = monthSchedules(2026, 10, 31, off);
    schedules[1].status = "LEAVE"; // 2 Okt cuti
    schedules[2].status = "SAKIT"; // 3 Okt sakit
    schedules[3].status = "IZIN";  // 4 Okt izin
    // tidak hadir: 2,3,4 (excused), 6 (alpha), 7 (libur nasional)
    const attendances = presentAll(schedules, ["2026-10-06", "2026-10-07"]);
    const n = computeAlphaDays({ ...OCT, schedules, attendances, holidays: [{ date: day("2026-10-07") }] });
    expect(n).toBe(1);
  });

  test("alpha: hari sebelum tanggal masuk tidak dihitung", () => {
    const n = computeAlphaDays({ ...OCT, schedules: [], attendances: [], holidays: [], hireDate: day("2026-10-30") });
    expect(n).toBe(2); // 30 & 31 Okt tanpa jadwal & tanpa absen
  });
});
