'use strict';

// Regression: keputusan user 2026-10-17 — pemberian jatah cuti dibatasi wewenang divisi
// (manager divisi: stafnya sendiri; Owner / Super Admin: semua karyawan).

jest.mock('./leaveQuota.repository');
jest.mock('../leaveType/leaveType.repository');
jest.mock('../division/division.repository', () => ({ findEmployeeScope: jest.fn() }));

const repo          = require('./leaveQuota.repository');
const leaveTypeRepo = require('../leaveType/leaveType.repository');
const divisionRepo  = require('../division/division.repository');
const svc           = require('./leaveQuota.service');

const BODY    = { employeeId: 'e1', leaveTypeId: 'lt1', year: 2026, totalDays: 12 };
const MANAGER = { roleCode: 'MANAGER', employeeId: 'm1' };
const SCOPE_M = { id: 'm1', isActive: true, isDivisionManager: true, divisionId: 'd1', homeBranchId: 'b1' };

beforeEach(() => {
  jest.clearAllMocks();
  repo.findEmployeeById.mockResolvedValue({ id: 'e1' });
  leaveTypeRepo.findById.mockResolvedValue({ id: 'lt1', maxDaysPerYear: 12 });
  repo.upsert.mockResolvedValue({ id: 'q1' });
});

test('manager memberi jatah ke staf divisi lain → 403', async () => {
  divisionRepo.findEmployeeScope.mockImplementation(async (id) => (id === 'm1'
    ? SCOPE_M
    : { id: 'e1', divisionId: 'd2', homeBranchId: 'b1', isDivisionManager: false }));
  await expect(svc.assign(BODY, MANAGER)).rejects.toMatchObject({ statusCode: 403 });
  expect(repo.upsert).not.toHaveBeenCalled();
});

test('manager memberi jatah ke staf divisinya → boleh', async () => {
  divisionRepo.findEmployeeScope.mockImplementation(async (id) => (id === 'm1'
    ? SCOPE_M
    : { id: 'e1', divisionId: 'd1', homeBranchId: 'b1', isDivisionManager: false }));
  await expect(svc.assign(BODY, MANAGER)).resolves.toEqual({ id: 'q1' });
});

test('Owner memberi jatah ke siapa saja → boleh', async () => {
  await expect(svc.assign(BODY, { roleCode: 'OWNER', employeeId: 'o1' })).resolves.toEqual({ id: 'q1' });
  expect(divisionRepo.findEmployeeScope).not.toHaveBeenCalled();
});
