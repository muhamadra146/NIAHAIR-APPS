'use strict';

// Regression: QA 2026-10-15
//   G3-16 — POST /attendance/manual: tanpa alasan (EMP-011), jam keluar sebelum jam masuk,
//           status sembarang (500), checkInAt rusak (500)
//   G5-16 — setting attendance_geofence_exempt_employees berisi JSON rusak → setiap absen 500

jest.mock('./attendance.repository', () => ({ findBySchedule: jest.fn(), upsertBySchedule: jest.fn(), update: jest.fn() }));
jest.mock('../setting/setting.repository', () => ({ findByKey: jest.fn() }));
jest.mock('../../utils/logger', () => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn() }));
jest.mock('../../config/prisma', () => ({
  staffSchedule: { findUnique: jest.fn() },
  branch:        { findUnique: jest.fn() },
}));

const { safeParse } = require('valibot');
const repo        = require('./attendance.repository');
const settingRepo = require('../setting/setting.repository');
const logger      = require('../../utils/logger');
const prisma      = require('../../config/prisma');
const { wibDateStr } = require('../../utils/date');
const svc         = require('./attendance.service');
const { manualSetSchema } = require('./attendance.validation');

const todayStr = wibDateStr(new Date());
const today = new Date(`${todayStr}T00:00:00Z`);
const SCHED = { id: 'ss1', employeeId: 'e1', branchId: 'b1', workDate: today, status: 'WORKING', shift: { startTime: '09:00', endTime: '18:00' } };

beforeEach(() => {
  jest.clearAllMocks();
  prisma.staffSchedule.findUnique.mockResolvedValue(SCHED);
  repo.findBySchedule.mockResolvedValue(null);
  repo.upsertBySchedule.mockResolvedValue({ id: 'a1' });
});

describe('G3-16 validasi absensi manual', () => {
  const ok = { staffScheduleId: 'ss1', status: 'PRESENT', checkInAt: `${todayStr}T09:00:00+07:00`, notes: 'lupa absen' };
  const valid = (body) => safeParse(manualSetSchema, body).success;

  test('data lengkap lolos', () => expect(valid(ok)).toBe(true));
  test('tanpa alasan ditolak', () => {
    expect(valid({ ...ok, notes: undefined })).toBe(false);
    expect(valid({ ...ok, notes: '   ' })).toBe(false);
  });
  test('status di luar pilihan ditolak', () => expect(valid({ ...ok, status: 'NGAWUR' })).toBe(false));
  test('tanggal rusak ditolak', () => expect(valid({ ...ok, checkInAt: 'bukan-tanggal' })).toBe(false));

  test('service: jam keluar sebelum/sama dengan jam masuk → 400', async () => {
    await expect(svc.manualSet({ ...ok, checkOutAt: `${todayStr}T08:00:00+07:00` })).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.upsertBySchedule).not.toHaveBeenCalled();
  });

  test('service: tanpa alasan → 400', async () => {
    await expect(svc.manualSet({ ...ok, notes: '' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('service: data valid tersimpan', async () => {
    await svc.manualSet({ ...ok, checkOutAt: `${todayStr}T18:00:00+07:00` });
    expect(repo.upsertBySchedule).toHaveBeenCalled();
  });
});

describe('G5-16 setting pengecualian geofence rusak', () => {
  test('JSON rusak → dianggap kosong (GPS tetap dicek), dicatat warn, tidak 500', async () => {
    prisma.branch.findUnique.mockResolvedValue({ latitude: -6.27, longitude: 106.79, radiusMeters: 50 });
    settingRepo.findByKey.mockResolvedValue({ value: '{rusak' });
    await expect(svc.checkIn({ staffScheduleId: 'ss1', latitude: -6.27, longitude: 106.79 }, { employeeId: 'e1' }))
      .resolves.toEqual({ id: 'a1' });
    expect(logger.warn).toHaveBeenCalled();
  });

  test('JSON bukan array → dianggap kosong', async () => {
    prisma.branch.findUnique.mockResolvedValue({ latitude: -6.27, longitude: 106.79, radiusMeters: 50 });
    settingRepo.findByKey.mockResolvedValue({ value: '{"employeeId":"e1"}' });
    await expect(svc.checkIn({ staffScheduleId: 'ss1' }, { employeeId: 'e1' }))
      .rejects.toMatchObject({ statusCode: 422 }); // tidak dikecualikan → GPS wajib
  });
});
