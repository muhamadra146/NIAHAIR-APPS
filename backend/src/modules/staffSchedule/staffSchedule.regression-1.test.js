'use strict';

// Regression: QA G3 (2026-10-15)
//   G3-13 — simpan jadwal massal menimpa hari LEAVE/IZIN/SAKIT dari pengajuan yang disetujui
//   G3-14 — simpan massal tidak atomik (repo dipanggil tanpa klien transaksi)
//   G3-15 — karyawan tanpa akses cabang bisa dijadwalkan di cabang tsb

jest.mock('./staffSchedule.repository');
jest.mock('../../config/prisma', () => ({
  shift:        { findMany: jest.fn() },
  $transaction: jest.fn(),
}));

const repo   = require('./staffSchedule.repository');
const prisma = require('../../config/prisma');
const svc    = require('./staffSchedule.service');

const TX = { __tx: true };
const d  = (s) => new Date(`${s}T00:00:00Z`);
const EMP = (over = {}) => ({ id: 'e1', name: 'Nia', homeBranchId: 'b1', employeeBranches: [], ...over });

beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation(async (fn) => fn(TX));
  prisma.shift.findMany.mockResolvedValue([{ id: 'sh1' }]);
  repo.findEmployeesBranchAccess.mockResolvedValue([EMP()]);
  repo.findApprovedAbsences.mockResolvedValue({ leaves: [], permissions: [], sickLeaves: [] });
  repo.upsertSchedule.mockResolvedValue({});
  repo.deleteSchedule.mockResolvedValue({});
});

const bulk = (schedules) => svc.bulkUpsert({ branchId: 'b1', schedules });

describe('G3-13 hari cuti/izin/sakit yang disetujui', () => {
  test('menimpa hari cuti yang disetujui → 422 dengan daftar tanggal, tidak ada yang disimpan', async () => {
    repo.findApprovedAbsences.mockResolvedValue({
      leaves: [{ employeeId: 'e1', startDate: d('2026-11-02'), endDate: d('2026-11-03') }], permissions: [], sickLeaves: [],
    });
    await expect(bulk([
      { employeeId: 'e1', date: '2026-11-01', shiftId: 'sh1' },
      { employeeId: 'e1', date: '2026-11-03', shiftId: 'sh1' },
    ])).rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('2026-11-03') });
    expect(repo.upsertSchedule).not.toHaveBeenCalled();
  });

  test('hari izin & sakit disetujui juga dilindungi (termasuk hapus jadwal)', async () => {
    repo.findApprovedAbsences.mockResolvedValue({
      leaves: [], permissions: [{ employeeId: 'e1', date: d('2026-11-05') }],
      sickLeaves: [{ employeeId: 'e1', startDate: d('2026-11-07'), endDate: d('2026-11-07') }],
    });
    await expect(bulk([{ employeeId: 'e1', date: '2026-11-05', shiftId: null, status: null }]))
      .rejects.toMatchObject({ statusCode: 422 });
    await expect(bulk([{ employeeId: 'e1', date: '2026-11-07', status: 'OFF' }]))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  test('ketidakhadiran karyawan lain tidak memblokir', async () => {
    repo.findApprovedAbsences.mockResolvedValue({
      leaves: [{ employeeId: 'e2', startDate: d('2026-11-01'), endDate: d('2026-11-30') }], permissions: [], sickLeaves: [],
    });
    await expect(bulk([{ employeeId: 'e1', date: '2026-11-03', shiftId: 'sh1' }])).resolves.toEqual({ updated: 1 });
  });
});

describe('G3-14 atomik', () => {
  test('upsert & delete memakai klien transaksi', async () => {
    await bulk([
      { employeeId: 'e1', date: '2026-11-01', shiftId: 'sh1' },
      { employeeId: 'e1', date: '2026-11-02', shiftId: null, status: null },
    ]);
    expect(repo.upsertSchedule.mock.calls[0][4]).toBe(TX);
    expect(repo.deleteSchedule.mock.calls[0][3]).toBe(TX);
  });
});

describe('G3-15 akses cabang', () => {
  test('karyawan tanpa akses cabang → 422 dengan nama', async () => {
    repo.findEmployeesBranchAccess.mockResolvedValue([EMP({ homeBranchId: 'b2', employeeBranches: [{ branchId: 'b3' }] })]);
    await expect(bulk([{ employeeId: 'e1', date: '2026-11-01', shiftId: 'sh1' }]))
      .rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('Nia') });
    expect(repo.upsertSchedule).not.toHaveBeenCalled();
  });

  test('akses lewat employeeBranches → boleh', async () => {
    repo.findEmployeesBranchAccess.mockResolvedValue([EMP({ homeBranchId: 'b2', employeeBranches: [{ branchId: 'b1' }] })]);
    await expect(bulk([{ employeeId: 'e1', date: '2026-11-01', shiftId: 'sh1' }])).resolves.toEqual({ updated: 1 });
  });

  test('karyawan tidak ada → 404', async () => {
    repo.findEmployeesBranchAccess.mockResolvedValue([]);
    await expect(bulk([{ employeeId: 'zz', date: '2026-11-01', shiftId: 'sh1' }])).rejects.toMatchObject({ statusCode: 404 });
  });
});
