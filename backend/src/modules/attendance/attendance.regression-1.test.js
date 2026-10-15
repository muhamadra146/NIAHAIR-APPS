'use strict';

// Regression: G3-01/G3-03/G3-04 (QA 2026-10-15) — absen untuk jadwal rekan, absen masuk dobel /
// di luar tanggal jadwal, dan GPS 0/kosong melewati geofence.
// Report: .gstack/qa-reports/run-20261015T083444Z/qa-report-localhost-2026-10-15.md

jest.mock('./attendance.repository', () => ({ findBySchedule: jest.fn(), upsertBySchedule: jest.fn(), update: jest.fn() }));
jest.mock('../setting/setting.repository', () => ({ findByKey: jest.fn().mockResolvedValue(null) }));
jest.mock('../../config/prisma', () => ({
  staffSchedule: { findUnique: jest.fn() },
  branch:        { findUnique: jest.fn() },
}));

const repo   = require('./attendance.repository');
const prisma = require('../../config/prisma');
const { wibDateStr } = require('../../utils/date');
const svc    = require('./attendance.service');

const today = new Date(`${wibDateStr(new Date())}T00:00:00Z`);
const SCHED = { id: 'ss1', employeeId: 'e1', branchId: 'b1', workDate: today, status: 'WORKING', shift: { startTime: '09:00', endTime: '18:00' } };
const ME = { id: 'u1', employeeId: 'e1' };
const AT_BRANCH = { latitude: -6.27125562, longitude: 106.79936108 };

beforeEach(() => {
  jest.clearAllMocks();
  prisma.staffSchedule.findUnique.mockResolvedValue(SCHED);
  prisma.branch.findUnique.mockResolvedValue({ latitude: -6.27125562, longitude: 106.79936108, radiusMeters: 30 });
  repo.findBySchedule.mockResolvedValue(null);
  repo.upsertBySchedule.mockResolvedValue({ id: 'a1' });
});

test('absen masuk untuk jadwal sendiri di lokasi cabang berhasil', async () => {
  await svc.checkIn({ staffScheduleId: 'ss1', ...AT_BRANCH }, ME);
  expect(repo.upsertBySchedule).toHaveBeenCalled();
});

test('G3-01: absen masuk memakai jadwal rekan → 403', async () => {
  await expect(svc.checkIn({ staffScheduleId: 'ss1', ...AT_BRANCH }, { id: 'u2', employeeId: 'e2' }))
    .rejects.toMatchObject({ statusCode: 403 });
  expect(repo.upsertBySchedule).not.toHaveBeenCalled();
});

test('G3-01: absen keluar memakai absensi rekan → 403', async () => {
  repo.findBySchedule.mockResolvedValue({ id: 'a1', employeeId: 'e1', checkInAt: new Date(), checkOutAt: null });
  await expect(svc.checkOut({ staffScheduleId: 'ss1' }, { id: 'u2', employeeId: 'e2' })).rejects.toMatchObject({ statusCode: 403 });
});

test('G3-03: absen masuk dua kali → 409', async () => {
  repo.findBySchedule.mockResolvedValue({ id: 'a1', checkInAt: new Date() });
  await expect(svc.checkIn({ staffScheduleId: 'ss1', ...AT_BRANCH }, ME)).rejects.toMatchObject({ statusCode: 409 });
});

test('G3-03: absen masuk untuk jadwal tanggal lain → 422', async () => {
  prisma.staffSchedule.findUnique.mockResolvedValue({ ...SCHED, workDate: new Date('2027-08-10T00:00:00Z') });
  await expect(svc.checkIn({ staffScheduleId: 'ss1', ...AT_BRANCH }, ME)).rejects.toMatchObject({ statusCode: 422 });
});

test.each([
  ['koordinat 0,0', { latitude: 0, longitude: 0 }],
  ['tanpa koordinat', {}],
])('G3-04: %s di cabang bergeofence → 422', async (_, coords) => {
  await expect(svc.checkIn({ staffScheduleId: 'ss1', ...coords }, ME)).rejects.toMatchObject({ statusCode: 422 });
});
