'use strict';

// Regression: QA Kehadiran (2026-10-19) — cuti / izin / sakit
//   · tanggal mustahil (2026-02-30) digeser diam-diam → 400 "Tanggal tidak valid"
//   · durasi cuti = hari kerja (OFF & libur nasional tidak memakai jatah) — keputusan user 2026-10-19
//   · cuti tidak boleh mundur; izin / sakit maks. 7 hari ke belakang
//   · cuti yang sudah disetujui bisa dibatalkan (belum dimulai): jatah kembali, jadwal dipulihkan
//   · alasan izin spasi saja ditolak; "dr. dr." pada nama dokter; notifikasi pembatalan

jest.mock('./leave.repository');
jest.mock('../permission/permission.repository');
jest.mock('../sickLeave/sickLeave.repository');
jest.mock('./leave.overlap', () => ({ assertNoOverlappingRequest: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../leaveQuota/leaveQuota.service');
jest.mock('../notification/notification.service', () => ({
  requestCreated: jest.fn(), requestDecided: jest.fn(), requestCancelled: jest.fn(), requestRevoked: jest.fn(),
}));
jest.mock('../division/division.repository', () => ({ findEmployeeScope: jest.fn() }));
jest.mock('../../config/prisma', () => ({
  leaveType:    { findUnique: jest.fn() },
  employee:     { findUnique: jest.fn() },
  $transaction: jest.fn(),
}));

const { safeParse } = require('valibot');
const prisma        = require('../../config/prisma');
const repo          = require('./leave.repository');
const permRepo      = require('../permission/permission.repository');
const sickRepo      = require('../sickLeave/sickLeave.repository');
const quotaSvc      = require('../leaveQuota/leaveQuota.service');
const notification  = require('../notification/notification.service');
const divisionRepo  = require('../division/division.repository');
const leaveSvc      = require('./leave.service');
const permSvc       = require('../permission/permission.service');
const sickSvc       = require('../sickLeave/sickLeave.service');
const { computeWorkingDays } = require('./leave.workdays');
const { createPermissionSchema } = require('../permission/permission.validation');

const d = (s) => new Date(`${s}T00:00:00.000Z`);
// "Hari ini" = Senin 2 Nov 2026, 10:00 WIB
const NOW = new Date('2026-11-02T03:00:00Z');

const TX = {
  staffSchedule: { create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  leave:         { update: jest.fn() },
};

const OWNER   = { id: 'u-owner', roleCode: 'OWNER', employeeId: null };
const MANAGER = { id: 'u-mgr', roleCode: 'MANAGER', employeeId: 'mgr1' };
const SCOPES = {
  mgr1:  { id: 'mgr1',  isActive: true, divisionId: 'd1', homeBranchId: 'b1', isDivisionManager: true },
  e1:    { id: 'e1',    isActive: true, divisionId: 'd1', homeBranchId: 'b1', isDivisionManager: false },
  other: { id: 'other', isActive: true, divisionId: 'd2', homeBranchId: 'b1', isDivisionManager: false },
};

beforeAll(() => jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'] }));
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation(async (fn) => fn(TX));
  divisionRepo.findEmployeeScope.mockImplementation(async (id) => SCOPES[id] ?? null);
  repo.findSchedulesInRange.mockResolvedValue([]);
  repo.findHolidaysInRange.mockResolvedValue([]);
  repo.create.mockImplementation(async (data) => ({ id: 'lv1', createdAt: NOW, ...data }));
  prisma.leaveType.findUnique.mockResolvedValue({ quotaType: 'ANNUAL' });
  quotaSvc.getBalance.mockResolvedValue({ totalDays: 12, usedDays: 0, pendingDays: 0, remainingDays: 12 });
  quotaSvc.incrementUsed.mockResolvedValue({});
  quotaSvc.decrementUsed.mockResolvedValue({});
  prisma.employee.findUnique.mockResolvedValue({ homeBranchId: 'b1' });
  permRepo.create.mockImplementation(async (data) => ({ id: 'p1', createdAt: NOW, ...data }));
  sickRepo.create.mockImplementation(async (data) => ({ id: 's1', createdAt: NOW, ...data }));
  sickRepo.countNoLetterInYear.mockResolvedValue(0);
});

// ── Hari kerja ─────────────────────────────────────────────────────────

describe('computeWorkingDays', () => {
  test('OFF (status / shift tanpa jam) & libur nasional tidak dihitung; tanpa jadwal tetap dihitung', () => {
    const r = computeWorkingDays({
      start: d('2026-11-02'), end: d('2026-11-08'),
      schedules: [
        { workDate: d('2026-11-03'), status: 'OFF', shift: null },
        { workDate: d('2026-11-04'), status: 'WORKING', shift: { startTime: null } }, // shift "Day Off"
        { workDate: d('2026-11-05'), status: 'WORKING', shift: { startTime: '09:00' } },
      ],
      holidays: [{ date: d('2026-11-06') }, { date: d('2026-11-03') }], // 3 Nov sudah OFF, tidak dobel
    });
    expect(r).toMatchObject({ calendarDays: 7, offDays: 2, holidayDays: 1, totalDays: 4 });
  });
});

// ── createLeave ────────────────────────────────────────────────────────

describe('createLeave', () => {
  const body = (over = {}) => ({ startDate: '2026-11-09', endDate: '2026-11-13', leaveTypeId: 'lt1', ...over });

  test('tanggal mustahil 2026-02-30 → 400 "Tanggal tidak valid" (tidak digeser ke 2 Mar)', async () => {
    await expect(leaveSvc.createLeave('e1', body({ startDate: '2027-02-30', endDate: '2027-03-02' })))
      .rejects.toMatchObject({ statusCode: 400, message: 'Tanggal tidak valid' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  test('cuti mulai kemarin → 422; mulai hari ini boleh', async () => {
    await expect(leaveSvc.createLeave('e1', body({ startDate: '2026-11-01', endDate: '2026-11-03' })))
      .rejects.toMatchObject({ statusCode: 422 });
    await expect(leaveSvc.createLeave('e1', body({ startDate: '2026-11-02', endDate: '2026-11-02' }))).resolves.toBeTruthy();
  });

  test('totalDays = hari kerja (OFF & libur nasional dilewati)', async () => {
    repo.findSchedulesInRange.mockResolvedValue([{ workDate: d('2026-11-10'), status: 'OFF', shift: null }]);
    repo.findHolidaysInRange.mockResolvedValue([{ date: d('2026-11-12') }]);
    await leaveSvc.createLeave('e1', body());
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ totalDays: 3 }));
    expect(notification.requestCreated).toHaveBeenCalledWith('LEAVE', expect.objectContaining({
      detail: expect.stringContaining('3 hari kerja'),
    }));
  });

  test('cek sisa jatah memakai hari kerja: sisa 3, cuti 5 hari kalender (2 OFF) → diterima', async () => {
    quotaSvc.getBalance.mockResolvedValue({ totalDays: 3, usedDays: 0, pendingDays: 0, remainingDays: 3 });
    repo.findSchedulesInRange.mockResolvedValue([
      { workDate: d('2026-11-09'), status: 'OFF' }, { workDate: d('2026-11-10'), status: 'OFF' },
    ]);
    await expect(leaveSvc.createLeave('e1', body())).resolves.toMatchObject({ totalDays: 3 });
  });

  test('semua hari OFF / libur → 422, tidak tersimpan', async () => {
    repo.findSchedulesInRange.mockResolvedValue([{ workDate: d('2026-11-09'), status: 'OFF' }]);
    await expect(leaveSvc.createLeave('e1', body({ endDate: '2026-11-09' }))).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.create).not.toHaveBeenCalled();
  });
});

// ── approve ────────────────────────────────────────────────────────────

const LEAVE = (over = {}) => ({
  id: 'lv1', employeeId: 'e1', status: 'PENDING', leaveTypeId: 'lt1', leaveType: { quotaType: 'ANNUAL' },
  startDate: d('2026-11-09'), endDate: d('2026-11-11'), totalDays: 3, createdAt: NOW,
  employee: { homeBranch: { id: 'b1' } }, ...over,
});

describe('approve', () => {
  test('hari OFF tidak ditimpa LEAVE; jadwal kerja → LEAVE; tanpa jadwal → baris LEAVE baru; terpakai += hari kerja', async () => {
    repo.findById.mockResolvedValueOnce(LEAVE()).mockResolvedValueOnce(LEAVE({ status: 'APPROVED', totalDays: 2 }));
    repo.findSchedulesInRange.mockResolvedValue([
      { id: 'sc-off', workDate: d('2026-11-09'), status: 'OFF', shift: null },
      { id: 'sc-w',   workDate: d('2026-11-10'), status: 'WORKING', shiftId: 'sh1', shift: { startTime: '09:00' } },
    ]);
    await leaveSvc.approve('lv1', 'u-owner', OWNER);

    expect(TX.staffSchedule.update).toHaveBeenCalledTimes(1);
    expect(TX.staffSchedule.update).toHaveBeenCalledWith({ where: { id: 'sc-w' }, data: { status: 'LEAVE' } });
    expect(TX.staffSchedule.create).toHaveBeenCalledWith({ data: expect.objectContaining({ workDate: d('2026-11-11'), status: 'LEAVE', notes: 'Cuti', branchId: 'b1' }) });
    expect(TX.leave.update).toHaveBeenCalledWith({ where: { id: 'lv1' }, data: expect.objectContaining({ status: 'APPROVED', totalDays: 2 }) });
    expect(quotaSvc.incrementUsed).toHaveBeenCalledWith('e1', 'lt1', 2026, 2);
    expect(notification.requestDecided).toHaveBeenCalledWith('LEAVE', expect.objectContaining({ detail: expect.stringContaining('9 Nov 2026') }));
  });
});

// ── cancelApproved ─────────────────────────────────────────────────────

describe('cancelApproved (batalkan cuti yang sudah disetujui)', () => {
  test('memulihkan jadwal, mengembalikan jatah, status CANCELLED, memberi tahu karyawan', async () => {
    repo.findById.mockResolvedValueOnce(LEAVE({ status: 'APPROVED' })).mockResolvedValueOnce(LEAVE({ status: 'CANCELLED' }));
    repo.findSchedulesInRange.mockResolvedValue([
      { id: 'a', status: 'LEAVE', shiftId: 'sh1', shift: { startTime: '09:00' } },   // dulu WORKING S1
      { id: 'b', status: 'LEAVE', shiftId: null, notes: 'Cuti', attendance: null },  // dibuat oleh persetujuan
      { id: 'c', status: 'OFF',   shiftId: null },                                   // tidak disentuh
    ]);
    const r = await leaveSvc.cancelApproved('lv1', OWNER);

    expect(TX.staffSchedule.update).toHaveBeenCalledWith({ where: { id: 'a' }, data: { status: 'WORKING' } });
    expect(TX.staffSchedule.delete).toHaveBeenCalledWith({ where: { id: 'b' } });
    expect(TX.staffSchedule.update).toHaveBeenCalledTimes(1);
    expect(TX.leave.update).toHaveBeenCalledWith({ where: { id: 'lv1' }, data: { status: 'CANCELLED' } });
    expect(quotaSvc.decrementUsed).toHaveBeenCalledWith('e1', 'lt1', 2026, 3);
    expect(r.restoredSchedules).toEqual({ working: 1, off: 0, removed: 1 });
    expect(notification.requestRevoked).toHaveBeenCalledWith('LEAVE', expect.objectContaining({ employeeId: 'e1' }));
  });

  test('cuti yang sudah dimulai → 422, tidak ada perubahan', async () => {
    repo.findById.mockResolvedValue(LEAVE({ status: 'APPROVED', startDate: d('2026-11-01'), endDate: d('2026-11-03') }));
    await expect(leaveSvc.cancelApproved('lv1', OWNER)).rejects.toMatchObject({ statusCode: 422 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(quotaSvc.decrementUsed).not.toHaveBeenCalled();
  });

  test('cuti mulai hari ini masih boleh dibatalkan', async () => {
    repo.findById.mockResolvedValue(LEAVE({ status: 'APPROVED', startDate: d('2026-11-02'), endDate: d('2026-11-02') }));
    await expect(leaveSvc.cancelApproved('lv1', OWNER)).resolves.toBeTruthy();
  });

  test('cuti yang masih PENDING → 400 (dibatalkan karyawan lewat DELETE)', async () => {
    repo.findById.mockResolvedValue(LEAVE());
    await expect(leaveSvc.cancelApproved('lv1', OWNER)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('manager divisi lain → 403; manager divisinya boleh', async () => {
    repo.findById.mockResolvedValue(LEAVE({ status: 'APPROVED', employeeId: 'other' }));
    await expect(leaveSvc.cancelApproved('lv1', MANAGER)).rejects.toMatchObject({ statusCode: 403 });
    repo.findById.mockResolvedValue(LEAVE({ status: 'APPROVED' }));
    await expect(leaveSvc.cancelApproved('lv1', MANAGER)).resolves.toBeTruthy();
  });
});

describe('cancel pengajuan sendiri', () => {
  test('notifikasi "menunggu persetujuan" milik penyetuju diperbarui', async () => {
    repo.findById.mockResolvedValue(LEAVE());
    repo.update.mockResolvedValue(LEAVE({ status: 'CANCELLED' }));
    await leaveSvc.cancel('lv1', 'e1');
    expect(notification.requestCancelled).toHaveBeenCalledWith('LEAVE', {
      employeeId: 'e1', detail: '9 Nov 2026 – 11 Nov 2026', since: NOW,
    });
  });
});

// ── Izin ───────────────────────────────────────────────────────────────

describe('izin', () => {
  const create = (over = {}) => permSvc.create('e1', 'b1', { type: 'ABSENCE', date: '2026-11-05', reason: 'Urusan keluarga', ...over });

  test('tanggal mustahil → 400', async () => {
    await expect(create({ date: '2026-02-30' })).rejects.toMatchObject({ statusCode: 400, message: 'Tanggal tidak valid' });
  });

  test('mundur 7 hari boleh, 8 hari → 422', async () => {
    await expect(create({ date: '2026-10-26' })).resolves.toBeTruthy();
    await expect(create({ date: '2026-10-25' })).rejects.toMatchObject({ statusCode: 422 });
  });

  test('alasan spasi saja ditolak (validasi & service); alasan di-trim', async () => {
    expect(safeParse(createPermissionSchema, { date: '2026-11-05', reason: '     ' }).success).toBe(false);
    await expect(create({ reason: '   ' })).rejects.toMatchObject({ statusCode: 400 });
    await create({ reason: '  Ke dokter gigi  ' });
    expect(permRepo.create).toHaveBeenCalledWith(expect.objectContaining({ reason: 'Ke dokter gigi' }));
  });

  test('batal → notifikasi penyetuju diperbarui', async () => {
    permRepo.findById.mockResolvedValue({ id: 'p1', employeeId: 'e1', status: 'PENDING' });
    permRepo.update.mockResolvedValue({ id: 'p1', employeeId: 'e1', type: 'ABSENCE', date: d('2026-11-05'), status: 'CANCELLED', createdAt: NOW });
    await permSvc.cancel('p1', 'e1');
    expect(notification.requestCancelled).toHaveBeenCalledWith('PERMISSION', expect.objectContaining({ detail: 'tidak masuk, 5 Nov 2026' }));
  });
});

// ── Sakit ──────────────────────────────────────────────────────────────

describe('sakit', () => {
  const create = (over = {}) => sickSvc.create('e1', 'b1', { startDate: '2026-11-02', endDate: '2026-11-03', ...over });

  test('tanggal mustahil → 400', async () => {
    await expect(create({ startDate: '2026-11-31', endDate: '2026-12-01' })).rejects.toMatchObject({ statusCode: 400, message: 'Tanggal tidak valid' });
  });

  test('mundur 7 hari boleh, 8 hari → 422', async () => {
    await expect(create({ startDate: '2026-10-26' })).resolves.toBeTruthy();
    await expect(create({ startDate: '2026-10-25' })).rejects.toMatchObject({ statusCode: 422 });
  });

  test('awalan "dr." pada nama dokter dibuang (cegah "dr. dr.")', async () => {
    await create({ hasLetter: true, doctorName: '  dr. Budi ' });
    expect(sickRepo.create).toHaveBeenCalledWith(expect.objectContaining({ doctorName: 'Budi' }));
  });

  test('unggah dokumen hanya untuk pengajuan PENDING', async () => {
    sickRepo.findById.mockResolvedValue({ id: 's1', employeeId: 'e1', status: 'APPROVED' });
    await expect(sickSvc.uploadDocument('s1', 'e1', { path: 'x', filename: 'y' })).rejects.toMatchObject({ statusCode: 400 });
    sickRepo.findById.mockResolvedValue({ id: 's1', employeeId: 'e1', status: 'PENDING' });
    sickRepo.update.mockResolvedValue({});
    await expect(sickSvc.uploadDocument('s1', 'e1', { path: 'x', filename: 'y' })).resolves.toEqual({});
  });
});
