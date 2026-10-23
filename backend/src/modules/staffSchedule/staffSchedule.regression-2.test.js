'use strict';

// Regression: QA Kehadiran (2026-10-19) — jadwal
//   · status Cuti / Izin / Sakit hanya dari pengajuan yang disetujui (tidak bisa diset di roster)
//   · SCH-002: jadwal WORKING wajib punya shift kerja
//   · tanggal mustahil di simpan massal → 400

jest.mock('./staffSchedule.repository');
jest.mock('../../config/prisma', () => ({
  shift:        { findMany: jest.fn() },
  $transaction: jest.fn(),
}));

const { safeParse } = require('valibot');
const repo   = require('./staffSchedule.repository');
const prisma = require('../../config/prisma');
const svc    = require('./staffSchedule.service');
const { bulkScheduleSchema } = require('./staffSchedule.validation');

beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation(async (fn) => fn({}));
  const SHIFTS = [{ id: 'sh1', code: 'S1', isWorking: true }, { id: 'off', code: 'OFF', isWorking: false }];
  prisma.shift.findMany.mockImplementation(async ({ where }) => SHIFTS.filter((s) => where.id.in.includes(s.id)));
  repo.findEmployeesBranchAccess.mockResolvedValue([{ id: 'e1', name: 'Nia', homeBranchId: 'b1', employeeBranches: [] }]);
  repo.findApprovedAbsences.mockResolvedValue({ leaves: [], permissions: [], sickLeaves: [] });
  repo.upsertSchedule.mockResolvedValue({});
});

const bulk = (schedules) => svc.bulkUpsert({ branchId: 'b1', schedules });

test.each(['LEAVE', 'IZIN', 'SAKIT'])('status %s ditolak (validasi & service 422), tidak tersimpan', async (status) => {
  const item = { employeeId: 'e1', date: '2026-11-05', shiftId: null, status };
  const parsed = safeParse(bulkScheduleSchema, { branchId: 'b1', schedules: [item] });
  expect(parsed.success).toBe(false);
  expect(parsed.issues[0].message).toMatch(/pengajuan yang disetujui/);
  await expect(bulk([item])).rejects.toMatchObject({ statusCode: 422 });
  expect(repo.upsertSchedule).not.toHaveBeenCalled();
});

test('WORKING tanpa shift → 422 (SCH-002)', async () => {
  await expect(bulk([{ employeeId: 'e1', date: '2026-11-05', shiftId: null, status: 'WORKING' }]))
    .rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('Shift wajib dipilih') });
  expect(repo.upsertSchedule).not.toHaveBeenCalled();
});

test('WORKING dengan shift non-kerja → 422', async () => {
  await expect(bulk([{ employeeId: 'e1', date: '2026-11-05', shiftId: 'off', status: 'WORKING' }]))
    .rejects.toMatchObject({ statusCode: 422 });
});

test('WORKING dengan shift kerja & OFF tanpa shift tetap boleh', async () => {
  await expect(bulk([
    { employeeId: 'e1', date: '2026-11-05', shiftId: 'sh1', status: 'WORKING' },
    { employeeId: 'e1', date: '2026-11-06', shiftId: null, status: 'OFF' },
  ])).resolves.toEqual({ updated: 2 });
});

test('tanggal mustahil → 400 "Tanggal tidak valid"', async () => {
  await expect(bulk([{ employeeId: 'e1', date: '2026-02-30', shiftId: 'sh1', status: 'WORKING' }]))
    .rejects.toMatchObject({ statusCode: 400, message: 'Tanggal tidak valid' });
  expect(repo.upsertSchedule).not.toHaveBeenCalled();
});
