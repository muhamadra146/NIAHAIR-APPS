'use strict';

// Notifikasi (keputusan user 2026-10-14): penerima tepat & tidak pernah menggagalkan proses utama

jest.mock('./notification.repository');
jest.mock('../division/division.repository');
jest.mock('../../common/utils/mailer', () => ({ sendMail: jest.fn().mockResolvedValue() }));

const repo         = require('./notification.repository');
const divisionRepo = require('../division/division.repository');
const { sendMail } = require('../../common/utils/mailer');
const svc          = require('./notification.service');

const OWNER   = { id: 'u-owner',   email: 'owner@x.id' };
const ADMIN   = { id: 'u-admin',   email: 'admin@x.id' };
const MGR_OPS = { id: 'u-mgr',     email: 'mgr@x.id' };
const FIN     = { id: 'u-finance', email: 'fin@x.id' };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SMTP_HOST = 'smtp.test';
  repo.createMany.mockResolvedValue({ count: 1 });
  repo.findEmployeeName.mockResolvedValue({ name: 'Ani' });
  repo.findUsersByRoles.mockImplementation(async (roles) => [
    ...(roles.includes('OWNER') ? [OWNER] : []),
    ...(roles.includes('SUPER_ADMIN') ? [ADMIN] : []),
    ...(roles.includes('FINANCE') ? [FIN] : []),
  ]);
});

const recipients = () => repo.createMany.mock.calls[0][0].map((r) => r.userId).sort();

describe('requestCreated → penyetuju', () => {
  test('staf berdivisi → manager divisinya di cabangnya', async () => {
    divisionRepo.findEmployeeScope.mockResolvedValue({ id: 'e1', divisionId: 'ops', homeBranchId: 'A', isDivisionManager: false });
    divisionRepo.findDivisionManagers.mockResolvedValue([{ id: 'm1', user: MGR_OPS }]);

    await svc.requestCreated('LEAVE', { employeeId: 'e1', detail: '2 hari' });

    expect(divisionRepo.findDivisionManagers).toHaveBeenCalledWith({ divisionId: 'ops', branchId: 'A', excludeEmployeeId: 'e1' });
    expect(recipients()).toEqual(['u-mgr']);
    expect(repo.createMany.mock.calls[0][0][0]).toMatchObject({
      type: 'LEAVE_REQUEST', link: '/pengajuan?tab=cuti-izin&jenis=cuti',
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'mgr@x.id' }));
  });

  test('pengajuan manager divisi → Owner & Super Admin', async () => {
    divisionRepo.findEmployeeScope.mockResolvedValue({ id: 'm1', divisionId: 'ops', homeBranchId: 'A', isDivisionManager: true });
    await svc.requestCreated('PERMISSION', { employeeId: 'm1' });
    expect(divisionRepo.findDivisionManagers).not.toHaveBeenCalled();
    expect(recipients()).toEqual(['u-admin', 'u-owner']);
  });

  test('karyawan tanpa divisi → Owner & Super Admin', async () => {
    divisionRepo.findEmployeeScope.mockResolvedValue({ id: 'e2', divisionId: null, homeBranchId: 'A', isDivisionManager: false });
    await svc.requestCreated('SICK', { employeeId: 'e2' });
    expect(recipients()).toEqual(['u-admin', 'u-owner']);
  });

  test('divisi tanpa manager → Owner & Super Admin', async () => {
    divisionRepo.findEmployeeScope.mockResolvedValue({ id: 'e1', divisionId: 'fin', homeBranchId: 'A', isDivisionManager: false });
    divisionRepo.findDivisionManagers.mockResolvedValue([]);
    await svc.requestCreated('CORRECTION', { employeeId: 'e1' });
    expect(recipients()).toEqual(['u-admin', 'u-owner']);
  });
});

test('requestDecided → karyawan yang mengajukan, link ke Pengajuan Saya', async () => {
  repo.findUsersByEmployeeIds.mockResolvedValue([{ id: 'u-ani', email: 'ani@x.id' }]);
  await svc.requestDecided('LEAVE', { employeeId: 'e1', approved: false, note: 'Kuota habis' });
  const row = repo.createMany.mock.calls[0][0][0];
  expect(row).toMatchObject({ userId: 'u-ani', type: 'REQUEST_DECIDED', title: 'Pengajuan cuti Anda ditolak' });
  expect(row.message).toContain('Kuota habis');
  expect(row.link).toBe('/pengajuan?lihat=saya&tab=cuti-izin&jenis=cuti');
});

test('payroll & kasbon → Owner, Super Admin & Finance, kecuali pembuatnya', async () => {
  await svc.payrollPending({ employeeName: 'Ani', periodLabel: 'Gaji Oktober 2026', submittedByUserId: 'u-finance' });
  expect(recipients()).toEqual(['u-admin', 'u-owner']);

  repo.createMany.mockClear();
  await svc.loanCreated({ employeeId: 'e1', totalAmount: '500000', createdByUserId: null });
  expect(recipients()).toEqual(['u-admin', 'u-finance', 'u-owner']);
  expect(repo.createMany.mock.calls[0][0][0].message).toContain('Rp 500.000');
});

test('kegagalan database tidak dilempar ke proses utama', async () => {
  divisionRepo.findEmployeeScope.mockRejectedValue(new Error('db down'));
  repo.findUsersByRoles.mockRejectedValue(new Error('db down'));
  await expect(svc.requestCreated('LEAVE', { employeeId: 'e1' })).resolves.toBe(0);
  await expect(svc.payrollPending({ employeeName: 'Ani', periodLabel: '' })).resolves.toBe(0);
  await expect(svc.loanCreated({ employeeId: 'e1', totalAmount: 1 })).resolves.toBe(0);
});
