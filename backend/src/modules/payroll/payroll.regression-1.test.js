'use strict';

// Regression: generate/recalculate bersamaan bisa membayar komisi dua kali
// (komisi dihitung di slip tapi sudah terhubung ke payroll lain)
// Found by /qa on 2026-10-06
// Report: .gstack/qa-reports/qa-report-localhost-2026-10-06.md

jest.mock('./payroll.repository');
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo   = require('./payroll.repository');
const prisma = require('../../config/prisma');
const svc    = require('./payroll.service');

const SALARY_SETTING = {
  baseSalary: 5000000, mealAllowance: 0, transportAllowance: 0, overtimeRate: 0,
  bpjsJhtPercent: 0, bpjsKesPercent: 0, bpjsTkPercent: 0, isPpn: false, ppnRate: 0,
};
const GEN_DATA = {
  salarySetting: SALARY_SETTING, schedules: [], attendances: [],
  commissions: [{ id: 'c1', commissionAmount: 50000 }, { id: 'c2', commissionAmount: 5000 }],
  activeLoans: [], unusedLeavePayouts: [], approvedLatePermissions: [], holidays: [],
};

const makeTx = (linkedCount) => ({
  payroll:     { create: jest.fn().mockResolvedValue({ id: 'pr1', items: [] }), update: jest.fn() },
  payrollItem: { deleteMany: jest.fn(), createMany: jest.fn() },
  commission:  { updateMany: jest.fn().mockResolvedValue({ count: linkedCount }) },
});

beforeEach(() => {
  jest.clearAllMocks();
  repo.findOverlapping.mockResolvedValue(null);
  repo.findPreviousPayroll.mockResolvedValue(null);
  repo.findEmployeePayDay.mockResolvedValue(1);
  repo.findScheduleDates.mockResolvedValue([]);
  repo.getGenerationData.mockResolvedValue(GEN_DATA);
});

describe('generate', () => {
  test('gagal (409) bila sebagian komisi sudah terhubung ke payroll lain', async () => {
    const tx = makeTx(1); // hanya 1 dari 2 komisi berhasil dihubungkan
    prisma.$transaction.mockImplementation((fn) => fn(tx));
    await expect(svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1'))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('sukses bila semua komisi terhubung', async () => {
    const tx = makeTx(2);
    prisma.$transaction.mockImplementation((fn) => fn(tx));
    const r = await svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1');
    expect(r.id).toBe('pr1');
  });
});

describe('recalculate', () => {
  const DRAFT = {
    id: 'pr1', status: 'DRAFT', employeeId: 'e1', branchId: 'b1',
    periodStart: new Date('2024-06-01T00:00:00Z'), periodEnd: new Date('2024-06-30T00:00:00Z'),
  };

  test('item, komisi dan total disimpan di transaksi yang sama', async () => {
    repo.findById.mockResolvedValue(DRAFT);
    const tx = makeTx(2);
    prisma.$transaction.mockImplementation((fn) => fn(tx));
    repo.update.mockResolvedValue({ ...DRAFT });
    await svc.recalculate('pr1', 'u1');
    expect(repo.replaceAutoItems).toHaveBeenCalledWith('pr1', expect.any(Array), tx);
    expect(repo.update).toHaveBeenCalledWith('pr1', expect.objectContaining({ lastRecalculatedBy: 'u1' }), tx);
  });

  test('gagal (409) dan tidak menyimpan total bila komisi diambil payroll lain', async () => {
    repo.findById.mockResolvedValue(DRAFT);
    const tx = makeTx(1);
    prisma.$transaction.mockImplementation((fn) => fn(tx));
    await expect(svc.recalculate('pr1', 'u1')).rejects.toMatchObject({ statusCode: 409 });
    expect(repo.update).not.toHaveBeenCalled();
  });
});
