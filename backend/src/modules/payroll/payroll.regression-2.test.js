'use strict';

// Regression: Kerja Hari Libur dibayar dari jadwal, bukan kehadiran —
// staf yang dijadwalkan kerja di libur nasional tapi tidak datang tetap dibayar.
// Found by /qa on 2026-10-10

jest.mock('./payroll.repository');
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo   = require('./payroll.repository');
const prisma = require('../../config/prisma');
const svc    = require('./payroll.service');

const day = (d) => new Date(`${d}T00:00:00.000Z`);
const SALARY_SETTING = {
  baseSalary: 3000000, tunjangan: 0, transportAllowance: 0, mealAllowancePerDay: 0,
  overtimeRatePerHour: 0, holidayRatePerDay: 100000, absentDeductionPerDay: 0,
  bpjsJhtPercent: 0, bpjsJpPercent: 0,
};
const working = (d) => ({ workDate: day(d), status: 'WORKING', shift: { startTime: '09:00', endTime: '19:00' } });

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

test('hanya hari libur nasional yang dihadiri yang dibayar', async () => {
  repo.getGenerationData.mockResolvedValue({
    salarySetting: SALARY_SETTING,
    // dijadwalkan kerja di dua hari libur nasional
    schedules:   [working('2024-06-17'), working('2024-06-18')],
    // hanya hadir di tanggal 17
    attendances: [{ workDate: day('2024-06-17'), status: 'PRESENT' }],
    holidays:    [{ date: day('2024-06-17') }, { date: day('2024-06-18') }],
    commissions: [], activeLoans: [], unusedLeavePayouts: [], approvedLatePermissions: [],
    omsetBonusTiers: [], branchOmset: 0, employment: null,
  });

  const r = await svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1');
  const libur = r.items.find((i) => i.category === 'libur_kerja');

  expect(Number(libur.quantity)).toBe(1);
  expect(Number(libur.amount)).toBe(100000);
});
