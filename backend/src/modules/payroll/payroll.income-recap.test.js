'use strict';

// Rekap Penghasilan (bahan PPh 21, PAY-036) — komponen slip direkap apa adanya
jest.mock('./payroll.repository');
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('../notification/notification.service', () => ({ payrollPending: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));

const repo = require('./payroll.repository');
const svc  = require('./payroll.service');

const employee = (id, name) => ({
  id, name, employeeCode: id.toUpperCase(), nikKtp: '3174000000000001',
  role: { name: 'Stylist' },
  salarySettings: [{ baseSalary: '3000000', bpjsJhtEmployerPercent: '3.7', bpjsJpEmployerPercent: '2', bpjsKesehatanEmployerPercent: '4' }],
});

const slip = (emp, month, items, netSalary) => ({
  id: `${emp.id}-${month}`, employeeId: emp.id, branchId: 'b1', status: 'PAID',
  periodStart: new Date(`2026-${month}-01`), periodEnd: new Date(`2026-${month}-28`),
  netSalary, employee: emp, items,
});

const ITEMS = [
  { type: 'INCOME',    category: 'gaji',           amount: '3000000', quantity: null },
  { type: 'INCOME',    category: 'tunjangan',      amount: '200000' },
  { type: 'INCOME',    category: 'transport',      amount: '500000' },
  { type: 'INCOME',    category: 'makan',          amount: '300000' },
  { type: 'INCOME',    category: 'komisi',         amount: '1250000.50' },
  { type: 'INCOME',    category: 'lembur',         amount: '100000' },
  { type: 'INCOME',    category: 'libur_kerja',    amount: '150000' },
  { type: 'INCOME',    category: 'bonus_omset',    amount: '75000' },
  { type: 'INCOME',    category: 'tunjangan_lain', amount: '50000' },
  { type: 'DEDUCTION', category: 'absen',          amount: '100000' },
  { type: 'DEDUCTION', category: 'terlambat',      amount: '20000' },
  { type: 'DEDUCTION', category: 'bpjs_jht',       amount: '60000' },
  { type: 'DEDUCTION', category: 'bpjs_jp',        amount: '30000' },
  { type: 'DEDUCTION', category: 'bpjs_kesehatan', amount: '30000' },
  { type: 'DEDUCTION', category: 'kasbon',         amount: '500000' },
];

beforeEach(() => jest.clearAllMocks());

describe('getIncomeRecap', () => {
  test('bulan: komponen dikelompokkan, total = jumlah item penghasilan', async () => {
    const a = employee('e1', 'Ani');
    repo.findIncomeRecapData.mockResolvedValue([slip(a, '09', ITEMS, '4885000.50')]);

    const { data, totals, period } = await svc.getIncomeRecap({ yearMonth: '2026-09' });

    expect(period.mode).toBe('MONTH');
    expect(data).toHaveLength(1);
    const r = data[0];
    expect(r.employee).toEqual({ id: 'e1', name: 'Ani', employeeCode: 'E1', nikKtp: '3174000000000001', role: { name: 'Stylist' } });
    expect(r).toMatchObject({
      gaji: 3000000, tunjangan: 200000, transport: 500000, makan: 300000,
      komisi: 1250000.5, lembur: 250000, bonus: 75000, payoutCuti: 0, lainnya: 50000,
      totalIncome: 5625000.5, potonganAbsen: 120000,
      bpjsJht: 60000, bpjsJp: 30000, bpjsKesehatan: 30000,
      bpjsJhtEmployer: 111000, bpjsJpEmployer: 60000, bpjsKesehatanEmployer: 120000,
      netSalary: 4885000.5, slipCount: 1,
    });
    expect(totals.totalIncome).toBe(5625000.5);
    // kasbon bukan komponen penghasilan/pajak → tidak direkap
    expect(r).not.toHaveProperty('kasbon');
  });

  test('tahun: slip per karyawan dijumlahkan jadi satu baris', async () => {
    const a = employee('e1', 'Ani');
    const b = employee('e2', 'Budi');
    repo.findIncomeRecapData.mockResolvedValue([
      slip(a, '01', [{ type: 'INCOME', category: 'gaji', amount: '3000000' }], '3000000'),
      slip(a, '02', [{ type: 'INCOME', category: 'gaji', amount: '3000000' }, { type: 'INCOME', category: 'komisi', amount: '500000' }], '3500000'),
      slip(b, '01', [{ type: 'INCOME', category: 'gaji', amount: '2000000' }], '2000000'),
    ]);

    const { data, totals, period } = await svc.getIncomeRecap({ year: '2026' });

    expect(period.mode).toBe('YEAR');
    expect(repo.findIncomeRecapData).toHaveBeenCalledWith({
      branchId: undefined,
      periodStart: new Date('2026-01-01T00:00:00Z'),
      periodEnd:   new Date('2026-12-31T00:00:00Z'),
    });
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ employee: { id: 'e1' }, slipCount: 2, gaji: 6000000, komisi: 500000, totalIncome: 6500000, netSalary: 6500000 });
    expect(data[0].periodStart).toEqual(new Date('2026-01-01'));
    expect(data[0].periodEnd).toEqual(new Date('2026-02-28'));
    expect(data[1]).toMatchObject({ employee: { id: 'e2' }, slipCount: 1, totalIncome: 2000000 });
    expect(totals.totalIncome).toBe(8500000);
  });

  test.each([
    [{}, 'Pilih bulan atau tahun'],
    [{ yearMonth: '2026-13' }, 'Format bulan harus YYYY-MM'],
    [{ year: '26' }, 'Format tahun harus YYYY'],
  ])('parameter tidak valid %p → 400', async (params, message) => {
    await expect(svc.getIncomeRecap(params)).rejects.toMatchObject({ statusCode: 400, message });
    expect(repo.findIncomeRecapData).not.toHaveBeenCalled();
  });
});
