'use strict';

// Keputusan user 2026-10-13:
//   B1 — pulang cepat tidak dipotong per menit (hanya memengaruhi uang makan)
//   B4 — kerja hari libur dibayar hanya bila dijadwalkan kerja (permintaan manager) DAN hadir

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
  earlyLeaveDeductionPerMinute: 1000, bpjsJhtPercent: 0, bpjsJpPercent: 0,
};
const sched = (d, status = 'WORKING') => ({ workDate: day(d), status, shift: status === 'WORKING' ? { startTime: '09:00', endTime: '19:00' } : null });

const generate = async (data) => {
  repo.getGenerationData.mockResolvedValue({
    salarySetting: SALARY_SETTING, commissions: [], activeLoans: [], unusedLeavePayouts: [],
    approvedLatePermissions: [], omsetBonusTiers: [], branchOmset: 0, employment: null, holidays: [],
    ...data,
  });
  return svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1');
};

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

test('B1: pulang cepat 120 menit tidak menghasilkan potongan per menit', async () => {
  const r = await generate({
    schedules:   [sched('2024-06-10')],
    attendances: [{ workDate: day('2024-06-10'), status: 'EARLY_LEAVE', earlyLeaveMinutes: 120 }],
  });
  expect(r.items.find((i) => i.category === 'pulang_cepat')).toBeUndefined();
});

test('B4: libur nasional dibayar hanya bila dijadwalkan kerja dan hadir', async () => {
  const r = await generate({
    // 17: dijadwalkan kerja + hadir → dibayar
    // 18: jadwal OFF tapi datang sendiri → tidak dibayar
    // 19: dijadwalkan kerja tapi tidak hadir → tidak dibayar
    schedules:   [sched('2024-06-17'), sched('2024-06-18', 'OFF'), sched('2024-06-19')],
    attendances: [
      { workDate: day('2024-06-17'), status: 'PRESENT' },
      { workDate: day('2024-06-18'), status: 'PRESENT' },
    ],
    holidays: [{ date: day('2024-06-17') }, { date: day('2024-06-18') }, { date: day('2024-06-19') }],
  });
  const libur = r.items.find((i) => i.category === 'libur_kerja');
  expect(Number(libur.quantity)).toBe(1);
  expect(Number(libur.amount)).toBe(100000);
});
