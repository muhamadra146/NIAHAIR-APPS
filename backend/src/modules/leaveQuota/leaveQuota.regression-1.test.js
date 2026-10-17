'use strict';

// Regression: QA G3-20 (2026-10-15) — jatah cuti pecahan / melebihi maks jenis cuti,
// karyawan asal → 409 (harus 404), manager membaca jatah divisi lain.

jest.mock('./leaveQuota.repository');
jest.mock('../leaveType/leaveType.repository');
jest.mock('../division/division.repository', () => ({ findEmployeeScope: jest.fn() }));

const { safeParse } = require('valibot');
const repo          = require('./leaveQuota.repository');
const leaveTypeRepo = require('../leaveType/leaveType.repository');
const divisionRepo  = require('../division/division.repository');
const svc           = require('./leaveQuota.service');
const { assignLeaveQuotaSchema } = require('./leaveQuota.validation');

const BODY = { employeeId: 'e1', leaveTypeId: 'lt1', year: 2026, totalDays: 12 };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findEmployeeById.mockResolvedValue({ id: 'e1' });
  leaveTypeRepo.findById.mockResolvedValue({ id: 'lt1', maxDaysPerYear: 12 });
  repo.upsert.mockResolvedValue({ id: 'q1' });
  repo.findAll.mockResolvedValue([]);
  repo.count.mockResolvedValue(0);
});

test('validasi: jatah pecahan / negatif ditolak', () => {
  expect(safeParse(assignLeaveQuotaSchema, { ...BODY, totalDays: 1.5 }).success).toBe(false);
  expect(safeParse(assignLeaveQuotaSchema, { ...BODY, totalDays: -1 }).success).toBe(false);
  expect(safeParse(assignLeaveQuotaSchema, BODY).success).toBe(true);
});

test('jatah melebihi maksimal jenis cuti → 422', async () => {
  await expect(svc.assign({ ...BODY, totalDays: 13 })).rejects.toMatchObject({ statusCode: 422 });
  expect(repo.upsert).not.toHaveBeenCalled();
});

test('jatah pecahan lewat service → 400', async () => {
  await expect(svc.assign({ ...BODY, totalDays: 2.5 })).rejects.toMatchObject({ statusCode: 400 });
});

test('karyawan tidak ada → 404', async () => {
  repo.findEmployeeById.mockResolvedValue(null);
  await expect(svc.assign(BODY)).rejects.toMatchObject({ statusCode: 404 });
});

test('daftar jatah dibatasi wewenang divisi untuk non Owner/SA', async () => {
  divisionRepo.findEmployeeScope.mockResolvedValue({ id: 'm1', isActive: true, isDivisionManager: true, divisionId: 'd1', homeBranchId: 'b1' });
  await svc.getQuotas({}, { roleCode: 'MANAGER', employeeId: 'm1' });
  expect(repo.findAll.mock.calls[0][0].where.employee).toEqual({
    divisionId: 'd1', homeBranchId: 'b1', isDivisionManager: false, id: { not: 'm1' },
  });
});

test('MANAGER bukan manager divisi tidak melihat jatah siapa pun', async () => {
  divisionRepo.findEmployeeScope.mockResolvedValue({ id: 'm1', isActive: true, isDivisionManager: false, divisionId: null, homeBranchId: 'b1' });
  await svc.getQuotas({}, { roleCode: 'MANAGER', employeeId: 'm1' });
  expect(repo.findAll.mock.calls[0][0].where.employee).toEqual({ id: '__tidak_ada__' });
});

test('Owner melihat semua', async () => {
  await svc.getQuotas({}, { roleCode: 'OWNER' });
  expect(repo.findAll.mock.calls[0][0].where).not.toHaveProperty('employee');
});
