'use strict';

// PAY-001: karyawan masuk di tengah periode → gaji pokok, tunjangan & transport proporsional hari kerja

jest.mock('./payroll.repository');
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo   = require('./payroll.repository');
const prisma = require('../../config/prisma');
const svc    = require('./payroll.service');

const SALARY_SETTING = {
  baseSalary: 3000000, tunjangan: 600000, transportAllowance: 300000, mealAllowancePerDay: 0,
  overtimeRatePerHour: 0, absentDeductionPerDay: 50000,
  bpjsJhtPercent: 2, bpjsJpPercent: 0, isPpn: false, ppnRate: 0,
};

const genData = (employment) => ({
  salarySetting: SALARY_SETTING, schedules: [], attendances: [], commissions: [],
  activeLoans: [], unusedLeavePayouts: [], approvedLatePermissions: [], holidays: [],
  omsetBonusTiers: [], branchOmset: 0, employment,
});

const item = (r, category) => r.items.find((i) => i.category === category);

beforeEach(() => {
  jest.clearAllMocks();
  repo.findOverlapping.mockResolvedValue(null);
  repo.findPreviousPayroll.mockResolvedValue(null);
  repo.findEmployeePayDay.mockResolvedValue(1);
  repo.findScheduleDates.mockResolvedValue([]);
  prisma.$transaction.mockImplementation((fn) => fn({
    payroll:    { create: jest.fn(({ data }) => Promise.resolve({ id: 'pr1', items: data.items.createMany.data })) },
    commission: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
  }));
});

test('masuk 16 Juni (periode 30 hari, tanpa OFF) → 15/30 hari kerja', async () => {
  repo.getGenerationData.mockResolvedValue(genData({ hireDate: new Date('2024-06-16T00:00:00Z'), resignDate: null }));
  const r = await svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1');

  expect(Number(item(r, 'gaji').amount)).toBe(1500000);
  expect(item(r, 'gaji').label).toBe('Gaji Pokok (15/30 hari kerja)');
  expect(Number(item(r, 'tunjangan').amount)).toBe(300000);
  expect(item(r, 'tunjangan').label).toBe('Tunjangan (15/30 hari kerja)');
  // hari sebelum masuk bukan alpha: semua 15 hari kerja tidak absen → 15 alpha (bukan 30)
  expect(Number(item(r, 'absen').quantity)).toBe(15);
  // BPJS tetap dari gaji pokok penuh
  expect(Number(item(r, 'bpjs_jht').amount)).toBe(60000);
});

test('bekerja penuh periode → gaji pokok & tunjangan penuh', async () => {
  repo.getGenerationData.mockResolvedValue(genData({ hireDate: new Date('2020-01-01T00:00:00Z'), resignDate: null }));
  const r = await svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1');

  expect(Number(item(r, 'gaji').amount)).toBe(3000000);
  expect(item(r, 'gaji').label).toBe('Gaji Pokok');
  expect(Number(item(r, 'tunjangan').amount)).toBe(600000);
  expect(item(r, 'tunjangan').label).toBe('Tunjangan');
});
