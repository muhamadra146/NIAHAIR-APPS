'use strict';

// Regression: QA G3 (2026-10-15)
//   G3-07 — GET /leaves/:id, /permissions/:id, /sick-leaves/:id, /attendance-corrections/:id
//           bisa dibaca user mana pun (bocor diagnosis sakit)
//   G3-12 — cuti / izin / sakit yang tumpang tindih tetap diterima

jest.mock('../../config/prisma', () => ({ leaveType: { findUnique: jest.fn() }, employee: { findUnique: jest.fn() } }));
jest.mock('./leave.repository');
jest.mock('../permission/permission.repository');
jest.mock('../sickLeave/sickLeave.repository');
jest.mock('../correction/correction.repository');
jest.mock('../leaveQuota/leaveQuota.service');
jest.mock('../notification/notification.service', () => ({ requestCreated: jest.fn(), requestDecided: jest.fn() }));
jest.mock('../division/division.repository', () => ({ findEmployeeScope: jest.fn() }));

const prisma         = require('../../config/prisma');
const leaveRepo      = require('./leave.repository');
const permissionRepo = require('../permission/permission.repository');
const sickRepo       = require('../sickLeave/sickLeave.repository');
const correctionRepo = require('../correction/correction.repository');
const divisionRepo   = require('../division/division.repository');
const quotaSvc       = require('../leaveQuota/leaveQuota.service');
const { assertNoOverlappingRequest } = require('./leave.overlap');
const { wibDateStr } = require('../../utils/date');

const services = {
  leave:      [require('./leave.service'), leaveRepo],
  permission: [require('../permission/permission.service'), permissionRepo],
  sickLeave:  [require('../sickLeave/sickLeave.service'), sickRepo],
  correction: [require('../correction/correction.service'), correctionRepo],
};

const OWNER_REQ = { id: 'r1', employeeId: 'staff1', diagnosis: 'rahasia' };
const STAFF     = { id: 'u1', roleCode: 'CASHIER', employeeId: 'staff1' };
const STRANGER  = { id: 'u2', roleCode: 'CASHIER', employeeId: 'other' };
const MANAGER   = { id: 'u3', roleCode: 'MANAGER', employeeId: 'mgr1' };
const OWNER     = { id: 'u4', roleCode: 'OWNER',   employeeId: null };

const SCOPES = {
  other:  { id: 'other',  isActive: true, divisionId: 'd1', homeBranchId: 'b1', isDivisionManager: false },
  mgr1:   { id: 'mgr1',   isActive: true, divisionId: 'd1', homeBranchId: 'b1', isDivisionManager: true },
  staff1: { id: 'staff1', isActive: true, divisionId: 'd1', homeBranchId: 'b1', isDivisionManager: false },
};

beforeEach(() => {
  jest.clearAllMocks();
  divisionRepo.findEmployeeScope.mockImplementation(async (id) => SCOPES[id] ?? null);
  for (const [, repo] of Object.values(services)) repo.findById.mockResolvedValue(OWNER_REQ);
  leaveRepo.findOverlapping.mockResolvedValue(null);
  permissionRepo.findOverlapping.mockResolvedValue(null);
  sickRepo.findOverlapping.mockResolvedValue(null);
});

describe.each(Object.keys(services))('G3-07 %s getById', (name) => {
  const [svc] = services[name];

  test('pemilik pengajuan boleh melihat', async () => {
    await expect(svc.getById('r1', STAFF)).resolves.toEqual(OWNER_REQ);
  });

  test('karyawan lain → 403', async () => {
    await expect(svc.getById('r1', STRANGER)).rejects.toMatchObject({ statusCode: 403 });
  });

  test('manager divisi karyawan tsb boleh melihat', async () => {
    await expect(svc.getById('r1', MANAGER)).resolves.toEqual(OWNER_REQ);
  });

  test('manager divisi lain → 403', async () => {
    divisionRepo.findEmployeeScope.mockImplementation(async (id) =>
      id === 'mgr1' ? { ...SCOPES.mgr1, divisionId: 'd2' } : SCOPES[id]);
    await expect(svc.getById('r1', MANAGER)).rejects.toMatchObject({ statusCode: 403 });
  });

  test('Owner boleh melihat', async () => {
    await expect(svc.getById('r1', OWNER)).resolves.toEqual(OWNER_REQ);
  });
});

describe('G3-12 pengajuan tumpang tindih', () => {
  const d = (s) => new Date(`${s}T00:00:00Z`);
  // Tanggal relatif hari ini (WIB) agar tidak kena aturan tanggal mundur seiring waktu:
  // F(n) = hari ini + 10 + n hari, "YYYY-MM-DD"
  const F = (n) => wibDateStr(new Date(Date.now() + (10 + n) * 24 * 60 * 60 * 1000));

  test('tidak ada tabrakan → lolos', async () => {
    await expect(assertNoOverlappingRequest('e1', d(F(2)), d(F(3)))).resolves.toBeUndefined();
    expect(leaveRepo.findOverlapping).toHaveBeenCalledWith('e1', d(F(2)), d(F(3)));
  });

  test('bertabrakan dengan cuti yang disetujui → 409', async () => {
    leaveRepo.findOverlapping.mockResolvedValue({ startDate: d(F(1)), endDate: d(F(5)), status: 'APPROVED' });
    await expect(assertNoOverlappingRequest('e1', d(F(3)), d(F(3))))
      .rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('cuti') });
  });

  test('bertabrakan dengan izin menunggu → 409', async () => {
    permissionRepo.findOverlapping.mockResolvedValue({ date: d(F(3)), status: 'PENDING' });
    await expect(assertNoOverlappingRequest('e1', d(F(3)), d(F(3))))
      .rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('izin') });
  });

  test('izin pada hari cuti yang disetujui ditolak dan tidak dibuat', async () => {
    prisma.employee.findUnique.mockResolvedValue({ homeBranchId: 'b1' });
    leaveRepo.findOverlapping.mockResolvedValue({ startDate: d(F(3)), endDate: d(F(3)), status: 'APPROVED' });
    await expect(services.permission[0].create('e1', null, { date: F(3), reason: 'urusan' }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(permissionRepo.create).not.toHaveBeenCalled();
  });

  test('sakit yang beririsan dengan sakit lain ditolak', async () => {
    sickRepo.countNoLetterInYear.mockResolvedValue(0);
    sickRepo.findOverlapping.mockResolvedValue({ startDate: d(F(3)), endDate: d(F(4)), status: 'PENDING' });
    await expect(services.sickLeave[0].create('e1', 'b1', { startDate: F(4), endDate: F(5) }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(sickRepo.create).not.toHaveBeenCalled();
  });

  test('cuti yang beririsan ditolak', async () => {
    prisma.leaveType.findUnique.mockResolvedValue({ quotaType: 'EVENT_BASED' });
    sickRepo.findOverlapping.mockResolvedValue({ startDate: d(F(3)), endDate: d(F(3)), status: 'APPROVED' });
    await expect(services.leave[0].createLeave('e1', { startDate: F(2), endDate: F(4), leaveTypeId: 'lt1' }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(leaveRepo.create).not.toHaveBeenCalled();
    expect(quotaSvc.getBalance).not.toHaveBeenCalled();
  });
});
