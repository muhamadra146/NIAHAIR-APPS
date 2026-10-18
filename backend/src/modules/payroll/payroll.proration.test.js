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

// ── Mode Rentang Tanggal (PAY-001, keputusan user 2026-10-18) ──────────
// Gaji pokok, tunjangan & transport = nominal bulanan × Σ (hari rentang selama bekerja ÷ hari bulan kalender)
describe('mode Rentang Tanggal: proporsional hari kalender', () => {
  const present = (...days) => days.map((d) => ({ workDate: new Date(`${d}T00:00:00Z`), status: 'PRESENT' }));
  const range = (periodStart, periodEnd) => svc.generate({ employeeId: 'e1', branchId: 'b1', periodStart, periodEnd }, 'u1');
  const veteran = { hireDate: new Date('2020-01-01T00:00:00Z'), resignDate: null };

  test('2–5 Jun (4 hari, Juni 30 hari) → 4/30, bukan sebulan penuh', async () => {
    repo.getGenerationData.mockResolvedValue({
      ...genData(veteran), attendances: present('2024-06-02', '2024-06-03', '2024-06-04', '2024-06-05'),
    });
    const r = await range('2024-06-02', '2024-06-05');

    expect(Number(item(r, 'gaji').amount)).toBe(400000);            // sebelumnya 3.000.000
    expect(item(r, 'gaji').label).toBe('Gaji Pokok (4/30 hari)');
    expect(Number(item(r, 'gaji').quantity)).toBe(4);
    expect(Number(item(r, 'tunjangan').amount)).toBe(80000);        // sebelumnya 600.000
    expect(item(r, 'tunjangan').label).toBe('Tunjangan (4/30 hari)');
    expect(Number(item(r, 'transport').amount)).toBe(40000);        // sebelumnya 300.000
    expect(Number(item(r, 'bpjs_jht').amount)).toBe(60000);         // BPJS tetap dari gaji pokok penuh
  });

  test('melewati dua bulan: 28 Mei – 3 Jun → 4/31 + 3/30', async () => {
    repo.getGenerationData.mockResolvedValue({
      ...genData(veteran),
      attendances: present('2024-05-28', '2024-05-29', '2024-05-30', '2024-05-31', '2024-06-01', '2024-06-02', '2024-06-03'),
    });
    const r = await range('2024-05-28', '2024-06-03');
    expect(Number(item(r, 'gaji').amount)).toBeCloseTo(3000000 * (4 / 31 + 3 / 30), 2); // 687.096,77
    expect(item(r, 'gaji').label).toBe('Gaji Pokok (4/31 + 3/30 hari)');
    expect(Number(item(r, 'gaji').quantity)).toBe(7);
  });

  test('masuk di tengah rentang: 10–20 Jun, masuk 16 Jun → 5/30', async () => {
    repo.getGenerationData.mockResolvedValue({
      ...genData({ hireDate: new Date('2024-06-16T00:00:00Z'), resignDate: null }),
      attendances: present('2024-06-16', '2024-06-17', '2024-06-18', '2024-06-19', '2024-06-20'),
    });
    const r = await range('2024-06-10', '2024-06-20');
    expect(Number(item(r, 'gaji').amount)).toBe(500000);
    expect(item(r, 'gaji').label).toBe('Gaji Pokok (5/30 hari)');
    expect(item(r, 'absen')).toBeUndefined();                      // hari sebelum masuk bukan alpha
  });

  test('tidak hadir di rentang → transport dipotong per hari kerja rentang', async () => {
    repo.getGenerationData.mockResolvedValue({
      ...genData(veteran), attendances: present('2024-06-02', '2024-06-03', '2024-06-04'),
    });
    const r = await range('2024-06-02', '2024-06-05');
    expect(Number(item(r, 'transport').amount)).toBe(30000);        // 40.000 − 1 × 10.000
    expect(Number(item(r, 'gaji').amount)).toBe(400000);            // gaji pokok tidak terpengaruh
    expect(Number(item(r, 'absen').quantity)).toBe(1);
  });

  test('rentang = satu periode gaji penuh (1–30 Jun) → sama dengan mode Per Bulan', async () => {
    repo.getGenerationData.mockResolvedValue(genData(veteran));
    const r = await range('2024-06-01', '2024-06-30');
    expect(Number(item(r, 'gaji').amount)).toBe(3000000);
    expect(item(r, 'gaji').label).toBe('Gaji Pokok');
  });

  test('mode Per Bulan tanggal gajian 7 (7 Jun – 6 Jul) tidak berubah', async () => {
    repo.findEmployeePayDay.mockResolvedValue(7);
    repo.getGenerationData.mockResolvedValue(genData(veteran));
    const r = await svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth: '2024-06' }, 'u1');
    expect(Number(item(r, 'gaji').amount)).toBe(3000000);
    expect(item(r, 'gaji').label).toBe('Gaji Pokok');
    expect(Number(item(r, 'tunjangan').amount)).toBe(600000);
  });
});
