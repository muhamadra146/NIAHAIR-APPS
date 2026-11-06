'use strict';

// PPh 21 di payroll (PAY-037): generate/hitung ulang, persetujuan, jurnal Accurate
jest.mock('./payroll.repository');
jest.mock('../syncQueue/syncQueue.service', () => ({ createSyncJob: jest.fn() }));
jest.mock('../notification/notification.service', () => ({ payrollPending: jest.fn() }));
jest.mock('../../config/prisma', () => ({ $transaction: jest.fn() }));
jest.mock('../accurate/accurate.client', () => ({ accurateRequest: jest.fn() }));
jest.mock('./payroll.sync.repository', () => ({
  findPayrollForSync: jest.fn(), findGlMappings: jest.fn(), markPayrollSynced: jest.fn(),
}));

const fs     = require('fs');
const path   = require('path');
const repo   = require('./payroll.repository');
const prisma = require('../../config/prisma');
const svc    = require('./payroll.service');
const { buildJournalLines } = require('./payroll.sync.service');

const seedSql = fs.readFileSync(path.join(__dirname, '../../../prisma/migrations/20261106_pph21_setup/migration.sql'), 'utf8');
const [pasal17Brackets, terA, terB, terC] = [...seedSql.matchAll(/'(\[\{"upTo".*?\])'/g)].map((m) => JSON.parse(m[1]));
const TAX_SETTING = {
  year: 2024, ptkpSelf: '54000000', ptkpMarried: '4500000', ptkpDependent: '4500000', maxDependents: 3,
  positionCostPercent: '5', positionCostMonthlyMax: '500000', pasal17Brackets, terA, terB, terC,
};

// Gaji 15 jt, BPJS karyawan JHT 2% / JP 1%, perusahaan hanya Kesehatan 4% + JKK 0,24% + JKM 0,3%
const SALARY_SETTING = {
  baseSalary: '15000000', mealAllowancePerDay: 0, tunjangan: 0, transportAllowance: 0,
  overtimeRatePerHour: 0, holidayRatePerDay: 0, absentDeductionPerDay: 0,
  bpjsJhtPercent: '2', bpjsJpPercent: '1', bpjsKesehatanEmployeePercent: '0',
  bpjsJhtEmployerPercent: '0', bpjsJpEmployerPercent: '0', bpjsKesehatanEmployerPercent: '4',
  bpjsJkkEmployerPercent: '0.24', bpjsJkmEmployerPercent: '0.3',
};

const genData = (employment) => ({
  salarySetting: SALARY_SETTING, schedules: [], attendances: [], commissions: [], activeLoans: [],
  unusedLeavePayouts: [], approvedLatePermissions: [], holidays: [], omsetBonusTiers: [], branchOmset: 0,
  employment: { hireDate: null, resignDate: null, taxEmploymentType: 'PERMANENT', ...employment },
});

let created;
beforeEach(() => {
  jest.clearAllMocks();
  repo.findOverlapping.mockResolvedValue(null);
  repo.findPreviousPayroll.mockResolvedValue(null);
  repo.findEmployeePayDay.mockResolvedValue(1);
  repo.findScheduleDates.mockResolvedValue([]);
  repo.findTaxSetting.mockResolvedValue(TAX_SETTING);
  repo.findTaxYearPayrolls.mockResolvedValue([]);
  prisma.$transaction.mockImplementation((fn) => fn({
    payroll:    { create: jest.fn(({ data }) => { created = data; return { id: 'pr1', ...data, items: data.items.createMany.data }; }) },
    commission: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
  }));
});

const generate = (yearMonth) => svc.generate({ employeeId: 'e1', branchId: 'b1', yearMonth }, 'u1');
const amountOf = (items, category) => Number(items.find((i) => i.category === category)?.amount ?? 0);

describe('generate', () => {
  test('Gaji Desember 2026 (dibayar 1 Jan 2027) → masa Januari 2027, PPh 21 TER dipotong', async () => {
    repo.getGenerationData.mockResolvedValue(genData({ ptkpStatus: 'TK0' }));
    const r = await generate('2026-12');

    // bruto = 15 jt + Kes 600.000 + JKK 36.000 + JKM 45.000 = 15.681.000 → TER A 7%
    expect(created).toMatchObject({ taxPeriod: '2027-01', taxPtkpStatus: 'TK0', taxMethod: 'TER' });
    expect(Number(created.taxGross)).toBe(15681000);
    expect(Number(created.taxTerRate)).toBe(7);
    expect(Number(created.pph21)).toBe(1097670);
    expect(amountOf(r.items, 'pph21')).toBe(1097670);
    expect(r.items.find((i) => i.category === 'pph21').label).toBe('PPh 21 (TER A 7%)');
    // gaji bersih = 15 jt − JHT 300.000 − JP 150.000 − PPh
    expect(Number(created.netSalary)).toBe(15000000 - 300000 - 150000 - 1097670);
    expect(repo.findTaxYearPayrolls).toHaveBeenCalledWith('e1', 2027, null);
  });

  test('Gaji November 2026 (dibayar 1 Des 2026) → di luar ruang lingkup, tanpa PPh', async () => {
    repo.getGenerationData.mockResolvedValue(genData({ ptkpStatus: 'TK0' }));
    const r = await generate('2026-11');
    expect(created).toMatchObject({ taxPeriod: null, taxMethod: null });
    expect(Number(created.pph21)).toBe(0);
    expect(r.items.some((i) => i.category === 'pph21')).toBe(false);
    expect(repo.findTaxSetting).not.toHaveBeenCalled();
  });

  test('status PTKP kosong → masa pajak dicatat, PPh belum dihitung', async () => {
    repo.getGenerationData.mockResolvedValue(genData({ ptkpStatus: null }));
    const r = await generate('2027-02');
    expect(created).toMatchObject({ taxPeriod: '2027-03', taxPtkpStatus: null });
    expect(r.items.some((i) => i.category === 'pph21')).toBe(false);
  });

  test('tarif tahun pajak belum ada → 422', async () => {
    repo.getGenerationData.mockResolvedValue(genData({ ptkpStatus: 'TK0' }));
    repo.findTaxSetting.mockResolvedValue(null);
    await expect(generate('2027-02')).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe('semua komponen penghasilan masuk bruto pajak', () => {
  // Gaji Desember 2027 (dibayar 1 Jan 2028 → masa Januari 2028, TER): semua komponen sekaligus
  test('gaji + tunjangan + komisi + lembur + bonus omset + payout cuti − alpha − terlambat', async () => {
    const setting = {
      ...SALARY_SETTING, baseSalary: '6000000', tunjangan: '1000000', overtimeRatePerHour: '25000', absentDeductionPerDay: '0',
      lateDeductionBracket1: '25000', lateDeductionBracket2: '50000', lateDeductionBracket3: '75000',
      bpjsKesehatanEmployerPercent: '0', bpjsJkkEmployerPercent: '0', bpjsJkmEmployerPercent: '0',
    };
    repo.getGenerationData.mockResolvedValue({
      ...genData({ ptkpStatus: 'TK0' }),
      salarySetting: setting,
      attendances: [
        { workDate: new Date('2027-12-06'), status: 'LATE', lateMinutes: 45, overtimeMinutes: 120 },
      ],
      commissions: [{ id: 'c1', commissionAmount: '400000' }],
      omsetBonusTiers: [{ minimumOmset: '10000000', percentage: '1' }],
      branchOmset: 30000000,
      unusedLeavePayouts: [{ totalDays: 12, usedDays: 4, leaveType: { name: 'Cuti Tahunan', unusedDayPayoutRate: '100000' } }],
    });
    prisma.$transaction.mockImplementation((fn) => fn({
      payroll:    { create: jest.fn(({ data }) => { created = data; return { id: 'pr1', ...data, items: data.items.createMany.data }; }) },
      commission: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    }));

    const r = await generate('2027-12');
    const amt = (c) => Number(r.items.find((i) => i.category === c)?.amount ?? 0);
    expect([amt('gaji'), amt('tunjangan'), amt('komisi'), amt('lembur'), amt('bonus_omset'), amt('payout_cuti'), amt('terlambat')])
      .toEqual([6000000, 1000000, 400000, 50000, 300000, 800000, 50000]);
    // bruto = 6 jt + 1 jt + 400.000 + 50.000 + 300.000 + 800.000 − 50.000 = 8.500.000 → TER A 1,5%
    expect(Number(created.taxGross)).toBe(8500000);
    expect(Number(created.taxTerRate)).toBe(1.5);
    expect(amt('pph21')).toBe(127500);
  });
});

describe('approve', () => {
  test('slip kena pajak tanpa status PTKP tidak bisa disetujui', async () => {
    repo.findById.mockResolvedValue({ id: 'pr1', status: 'PENDING_APPROVAL', netSalary: '1000000', taxPeriod: '2027-03', taxPtkpStatus: null });
    await expect(svc.approve('pr1', 'u1')).rejects.toMatchObject({ statusCode: 422 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  test('slip di luar ruang lingkup tetap bisa disetujui', async () => {
    repo.findById.mockResolvedValue({ id: 'pr1', status: 'PENDING_APPROVAL', netSalary: '1000000', taxPeriod: null, taxPtkpStatus: null });
    repo.update.mockResolvedValue({ id: 'pr1', status: 'APPROVED' });
    await svc.approve('pr1', 'u1');
    expect(repo.update).toHaveBeenCalledWith('pr1', expect.objectContaining({ status: 'APPROVED' }));
  });
});

describe('jurnal Accurate', () => {
  const GL = Object.fromEntries(
    ['gaji', 'tunjangan_makan', 'tunjangan_transport', 'tunjangan_lain', 'bpjs_perusahaan', 'hutang_bpjs', 'hutang_pph21', 'kasbon', 'kas_bank']
      .map((c, i) => [c, { category: c, glAccount: { number: String(100 + i) } }]),
  );
  const item = (type, category, amount) => ({ type, category, label: category, amount: String(amount), quantity: null });

  test('PPh 21 dikredit ke Utang PPh 21; JKK/JKM masuk BPJS perusahaan; seimbang', () => {
    const payroll = {
      netSalary: '13452330',
      employee: { salarySettings: [SALARY_SETTING] },
      items: [
        item('INCOME', 'gaji', 15000000),
        item('DEDUCTION', 'bpjs_jht', 300000), item('DEDUCTION', 'bpjs_jp', 150000),
        item('DEDUCTION', 'pph21', 1097670),
      ],
    };
    const r = buildJournalLines(payroll, GL);
    expect(r.error).toBeNull();
    expect(r.unknownCategories).toEqual([]);
    expect(r.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountNo: GL.hutang_pph21.glAccount.number, amount: 1097670, amountType: 'CREDIT' }),
      expect.objectContaining({ accountNo: GL.bpjs_perusahaan.glAccount.number, amount: 681000, amountType: 'DEBIT' }),
      expect.objectContaining({ accountNo: GL.kas_bank.glAccount.number, amount: 13452330, amountType: 'CREDIT' }),
    ]));
    expect(r.totalDebit).toBe(r.totalCredit);
  });

  test('pengembalian lebih potong mendebit Utang PPh 21', () => {
    const payroll = {
      netSalary: '15550000',
      employee: { salarySettings: [{ ...SALARY_SETTING, bpjsKesehatanEmployerPercent: '0', bpjsJkkEmployerPercent: '0', bpjsJkmEmployerPercent: '0' }] },
      items: [
        item('INCOME', 'gaji', 15000000), item('INCOME', 'pph21_refund', 1000000),
        item('DEDUCTION', 'bpjs_jht', 300000), item('DEDUCTION', 'bpjs_jp', 150000),
      ],
    };
    const r = buildJournalLines(payroll, GL);
    expect(r.error).toBeNull();
    expect(r.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountNo: GL.hutang_pph21.glAccount.number, amount: 1000000, amountType: 'DEBIT' }),
    ]));
    expect(r.totalDebit).toBe(r.totalCredit);
  });
});
