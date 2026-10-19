'use strict';

// Regression: QA Kehadiran 2026-10-19 (keputusan user 2026-10-19)
//   · Absen keluar: wajib GPS di radius cabang (pengecualian sama dengan absen masuk) & hanya di tanggal jadwal
//   · Absen masuk di hari izin / sakit / cuti yang disetujui → ditolak
//   · Absensi Manual: hanya manager divisi karyawan / Owner / SA; bukan tanggal depan; bukan hari
//     cuti/izin/sakit; jam di tanggal jadwal; status dihitung dari jam; jam yang tidak dikirim tetap
//   · Laporan Kehadiran: hari kerja setelah hari ini tidak dihitung Absen
//   · Pantau tim (daftar / laporan / roster) dibatasi divisi & cabang untuk selain Owner/SA/Finance

jest.mock('./attendance.repository', () => ({
  findBySchedule: jest.fn(), upsertBySchedule: jest.fn(), update: jest.fn(),
  findMany: jest.fn(), count: jest.fn(), findById: jest.fn(), getReportData: jest.fn(),
}));
jest.mock('../setting/setting.repository', () => ({ findByKey: jest.fn() }));
jest.mock('../division/division.repository', () => ({ findEmployeeScope: jest.fn() }));
jest.mock('../../config/prisma', () => ({
  staffSchedule: { findUnique: jest.fn(), findMany: jest.fn() },
  branch:        { findUnique: jest.fn() },
}));

const { safeParse } = require('valibot');
const repo         = require('./attendance.repository');
const settingRepo  = require('../setting/setting.repository');
const divisionRepo = require('../division/division.repository');
const prisma       = require('../../config/prisma');
const { wibDateStr } = require('../../utils/date');
const svc          = require('./attendance.service');
const { manualSetSchema, checkInSchema } = require('./attendance.validation');

const todayStr = wibDateStr(new Date());
const dateOnly = (s) => new Date(`${s}T00:00:00Z`);
const shiftDay = (n) => wibDateStr(new Date(Date.now() + n * 86400000));
const at = (hhmm, day = todayStr) => `${day}T${hhmm}:00+07:00`;

const BRANCH = { latitude: -6.27125562, longitude: 106.79936108, radiusMeters: 30 };
const AT_BRANCH = { latitude: -6.27125562, longitude: 106.79936108 };
const FAR       = { latitude: -6.2800, longitude: 106.8100 };
const SCHED = { id: 'ss1', employeeId: 'e1', branchId: 'b1', workDate: dateOnly(todayStr), status: 'WORKING', shift: { startTime: '09:00', endTime: '18:00' } };

const SA      = { id: 'u0', roleCode: 'SUPER_ADMIN', employeeId: null };
const MGR     = { id: 'u1', roleCode: 'MANAGER', employeeId: 'm1' };
const OFFICE  = { id: 'u2', roleCode: 'OFFICE', employeeId: 'o1' };
const FINANCE = { id: 'u3', roleCode: 'FINANCE', employeeId: 'f1' };
const SCOPES = {
  e1: { id: 'e1', divisionId: 'd-ops', homeBranchId: 'b1', isDivisionManager: false, isActive: true },
  m1: { id: 'm1', divisionId: 'd-ops', homeBranchId: 'b1', isDivisionManager: true,  isActive: true },
  o1: { id: 'o1', divisionId: 'd-off', homeBranchId: 'b1', isDivisionManager: false, isActive: true },
  f1: { id: 'f1', divisionId: 'd-fin', homeBranchId: 'b1', isDivisionManager: false, isActive: true },
};

beforeEach(() => {
  jest.clearAllMocks();
  settingRepo.findByKey.mockResolvedValue(null);
  divisionRepo.findEmployeeScope.mockImplementation(async (id) => SCOPES[id] ?? null);
  prisma.staffSchedule.findUnique.mockResolvedValue(SCHED);
  prisma.branch.findUnique.mockResolvedValue(BRANCH);
  repo.findBySchedule.mockResolvedValue(null);
  repo.upsertBySchedule.mockImplementation(async (_id, create) => create);
  repo.update.mockImplementation(async (_id, data) => data);
});

// ── Absen keluar ─────────────────────────────────────────────────────────────

describe('absen keluar: geofence & tanggal jadwal', () => {
  const ME = { id: 'u9', employeeId: 'e1' };
  const record = (over = {}) => ({
    id: 'a1', employeeId: 'e1', branchId: 'b1', workDate: dateOnly(todayStr),
    checkInAt: new Date(at('09:00')), checkOutAt: null,
    staffSchedule: { ...SCHED }, ...over,
  });

  test('di lokasi cabang → berhasil', async () => {
    repo.findBySchedule.mockResolvedValue(record());
    await svc.checkOut({ staffScheduleId: 'ss1', ...AT_BRANCH }, ME);
    expect(repo.update).toHaveBeenCalled();
  });

  test('di luar radius → 422 "terlalu jauh"', async () => {
    repo.findBySchedule.mockResolvedValue(record());
    await expect(svc.checkOut({ staffScheduleId: 'ss1', ...FAR }, ME))
      .rejects.toMatchObject({ statusCode: 422, message: expect.stringMatching(/terlalu jauh/) });
    expect(repo.update).not.toHaveBeenCalled();
  });

  test('tanpa GPS → 422 "GPS wajib aktif"', async () => {
    repo.findBySchedule.mockResolvedValue(record());
    await expect(svc.checkOut({ staffScheduleId: 'ss1' }, ME))
      .rejects.toMatchObject({ statusCode: 422, message: expect.stringMatching(/GPS/) });
  });

  test('karyawan dikecualikan geofence → boleh tanpa GPS', async () => {
    repo.findBySchedule.mockResolvedValue(record());
    settingRepo.findByKey.mockResolvedValue({ value: JSON.stringify([{ employeeId: 'e1', branchId: null }]) });
    await svc.checkOut({ staffScheduleId: 'ss1' }, ME);
    expect(repo.update).toHaveBeenCalled();
  });

  test('jadwal kemarin (lupa absen keluar) → 422, harus lewat koreksi', async () => {
    const y = shiftDay(-1);
    repo.findBySchedule.mockResolvedValue(record({ workDate: dateOnly(y), staffSchedule: { ...SCHED, workDate: dateOnly(y) } }));
    await expect(svc.checkOut({ staffScheduleId: 'ss1', ...AT_BRANCH }, ME))
      .rejects.toMatchObject({ statusCode: 422 });
  });
});

// ── Absen masuk di hari izin / sakit / cuti ──────────────────────────────────

test.each(['IZIN', 'SAKIT', 'LEAVE'])('absen masuk pada jadwal %s yang disetujui → 422', async (st) => {
  prisma.staffSchedule.findUnique.mockResolvedValue({ ...SCHED, status: st });
  await expect(svc.checkIn({ staffScheduleId: 'ss1', ...AT_BRANCH }, { employeeId: 'e1' }))
    .rejects.toMatchObject({ statusCode: 422 });
  expect(repo.upsertBySchedule).not.toHaveBeenCalled();
});

// ── Absensi Manual ───────────────────────────────────────────────────────────

describe('absensi manual', () => {
  const base = { staffScheduleId: 'ss1', checkInAt: at('09:00'), notes: 'lupa absen' };

  test('Office (bukan manager divisi karyawan) → 403', async () => {
    await expect(svc.manualSet(base, OFFICE)).rejects.toMatchObject({ statusCode: 403 });
  });

  test('manager divisi karyawan & Super Admin → boleh', async () => {
    await svc.manualSet(base, MGR);
    await svc.manualSet(base, SA);
    expect(repo.upsertBySchedule).toHaveBeenCalledTimes(2);
  });

  test('tanggal yang akan datang → 422', async () => {
    const tm = shiftDay(1);
    prisma.staffSchedule.findUnique.mockResolvedValue({ ...SCHED, workDate: dateOnly(tm) });
    await expect(svc.manualSet({ ...base, checkInAt: at('09:00', tm) }, SA)).rejects.toMatchObject({ statusCode: 422 });
  });

  test.each(['LEAVE', 'IZIN', 'SAKIT'])('hari %s yang disetujui → 422', async (st) => {
    prisma.staffSchedule.findUnique.mockResolvedValue({ ...SCHED, status: st });
    await expect(svc.manualSet(base, SA)).rejects.toMatchObject({ statusCode: 422 });
  });

  test('jam masuk di luar tanggal jadwal → 422', async () => {
    await expect(svc.manualSet({ ...base, checkInAt: at('09:00', shiftDay(-1)) }, SA)).rejects.toMatchObject({ statusCode: 422 });
  });

  test('status dihitung dari jam: masuk 10:00 (shift 09:00) → LATE 60 menit', async () => {
    const r = await svc.manualSet({ ...base, checkInAt: at('10:00') }, SA);
    expect(r).toMatchObject({ status: 'LATE', lateMinutes: 60 });
  });

  test('status Hadir dipilih padahal terlambat → 422', async () => {
    await expect(svc.manualSet({ ...base, status: 'PRESENT', checkInAt: at('10:00') }, SA))
      .rejects.toMatchObject({ statusCode: 422, message: expect.stringMatching(/Terlambat/) });
  });

  test('status Absen + jam → 422; Absen tanpa jam → jam dikosongkan', async () => {
    await expect(svc.manualSet({ ...base, status: 'ABSENT' }, SA)).rejects.toMatchObject({ statusCode: 422 });
    const r = await svc.manualSet({ staffScheduleId: 'ss1', status: 'ABSENT', notes: 'tidak datang' }, SA);
    expect(r).toMatchObject({ status: 'ABSENT', checkInAt: null, checkOutAt: null });
  });

  test('hanya jam masuk dikirim → jam keluar lama tetap (koreksi tidak menghapus check-out)', async () => {
    repo.findBySchedule.mockResolvedValue({ checkInAt: new Date(at('10:30')), checkOutAt: new Date(at('18:00')) });
    const r = await svc.manualSet({ staffScheduleId: 'ss1', checkInAt: at('09:00'), notes: 'Koreksi disetujui: lupa' });
    expect(r.checkInAt.toISOString()).toBe(new Date(at('09:00')).toISOString());
    expect(r.checkOutAt.toISOString()).toBe(new Date(at('18:00')).toISOString());
    expect(r.status).toBe('PRESENT');
  });

  test('hanya jam keluar dikirim tetapi sebelum jam masuk lama → 400', async () => {
    repo.findBySchedule.mockResolvedValue({ checkInAt: new Date(at('10:00')), checkOutAt: null });
    await expect(svc.manualSet({ staffScheduleId: 'ss1', checkOutAt: at('09:30'), notes: 'koreksi' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('null = jam keluar dikosongkan', async () => {
    repo.findBySchedule.mockResolvedValue({ checkInAt: new Date(at('09:00')), checkOutAt: new Date(at('18:00')) });
    const r = await svc.manualSet({ staffScheduleId: 'ss1', checkInAt: at('09:00'), checkOutAt: null, notes: 'salah input' }, SA);
    expect(r.checkOutAt).toBeNull();
  });

  test('validasi: checkOutAt null diterima; pesan error berbahasa Indonesia', () => {
    expect(safeParse(manualSetSchema, { ...base, checkOutAt: null }).success).toBe(true);
    const bad = safeParse(checkInSchema, { latitude: 'x' });
    expect(bad.success).toBe(false);
    for (const i of bad.issues) expect(i.message).not.toMatch(/Invalid|Expected/);
  });
});

// ── Laporan & pantau tim ─────────────────────────────────────────────────────

describe('laporan kehadiran & lingkup pantau', () => {
  const emp = { id: 'e1', name: 'Staf', employeeCode: 'E1' };

  test('hari kerja setelah hari ini tanpa absensi tidak dihitung Absen', async () => {
    repo.getReportData.mockResolvedValue([
      { employeeId: 'e1', employee: emp, status: 'WORKING', workDate: dateOnly(shiftDay(-1)), attendance: null },
      { employeeId: 'e1', employee: emp, status: 'WORKING', workDate: dateOnly(todayStr), attendance: { status: 'PRESENT', lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0 } },
      { employeeId: 'e1', employee: emp, status: 'WORKING', workDate: dateOnly(shiftDay(1)), attendance: null },
      { employeeId: 'e1', employee: emp, status: 'WORKING', workDate: dateOnly(shiftDay(2)), attendance: null },
    ]);
    const { data } = await svc.getReport({ branchId: 'b1', startDate: shiftDay(-1), endDate: shiftDay(2) }, SA);
    expect(data[0]).toMatchObject({ scheduledDays: 2, presentDays: 1, absentDays: 1, attendanceRate: 50 });
  });

  test('manager divisi: laporan & daftar dibatasi divisi + cabang; Finance/SA semua', async () => {
    repo.getReportData.mockResolvedValue([]);
    await svc.getReport({ branchId: 'b1', startDate: todayStr, endDate: todayStr }, MGR);
    expect(repo.getReportData).toHaveBeenLastCalledWith(expect.objectContaining({ employeeWhere: { divisionId: 'd-ops', homeBranchId: 'b1' } }));
    await svc.getReport({ branchId: 'b1', startDate: todayStr, endDate: todayStr }, FINANCE);
    expect(repo.getReportData).toHaveBeenLastCalledWith(expect.objectContaining({ employeeWhere: null }));

    repo.findMany.mockResolvedValue([]); repo.count.mockResolvedValue(0);
    await svc.getAll({}, MGR);
    expect(repo.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { employee: { divisionId: 'd-ops', homeBranchId: 'b1' } } }));
  });

  test('detail absensi karyawan divisi lain → 403 untuk manager', async () => {
    repo.findById.mockResolvedValue({ id: 'a9' });
    repo.count.mockResolvedValue(0);
    await expect(svc.getById('a9', MGR)).rejects.toMatchObject({ statusCode: 403 });
  });

  test('roster: canManualSet hanya untuk staf yang boleh diurus, bukan tanggal depan / hari izin', async () => {
    const row = (id, extra = {}) => ({
      id: `s-${id}`, status: 'WORKING', shift: null, attendance: null,
      employee: { id, name: id, employeeCode: id, role: { id: 'r', code: 'X', name: 'X' }, ...SCOPES[id] }, ...extra,
    });
    prisma.staffSchedule.findMany.mockResolvedValue([row('e1'), row('m1'), { ...row('e1'), id: 's-izin', status: 'IZIN' }]);
    const rows = await svc.getDailyRoster('b1', todayStr, MGR);
    expect(rows.map((r) => r.canManualSet)).toEqual([true, false, false]);
    expect(rows[0].employee).not.toHaveProperty('divisionId');
    expect(prisma.staffSchedule.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ employee: { divisionId: 'd-ops', homeBranchId: 'b1' } }),
    }));

    const future = await svc.getDailyRoster('b1', shiftDay(1), SA);
    expect(future.every((r) => r.canManualSet === false)).toBe(true);
  });
});
