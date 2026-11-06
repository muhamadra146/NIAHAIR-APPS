'use strict';

// Laporan PPh 21 / bahan e-Bupot (PAY-037): bulanan, simulasi uji coba, A1 tahunan
jest.mock('./payroll.repository');

const fs   = require('fs');
const path = require('path');
const repo = require('./payroll.repository');
const svc  = require('./payroll.pph21.service');

const seedSql = fs.readFileSync(path.join(__dirname, '../../../prisma/migrations/20261106_pph21_setup/migration.sql'), 'utf8');
const [pasal17Brackets, terA, terB, terC] = [...seedSql.matchAll(/'(\[\{"upTo".*?\])'/g)].map((m) => JSON.parse(m[1]));
const TAX_SETTING = {
  year: 2024, ptkpSelf: '54000000', ptkpMarried: '4500000', ptkpDependent: '4500000', maxDependents: 3,
  positionCostPercent: '5', positionCostMonthlyMax: '500000', pasal17Brackets, terA, terB, terC,
};

const NO_EMPLOYER = { baseSalary: '15000000', bpjsJhtEmployerPercent: '0', bpjsJpEmployerPercent: '0', bpjsKesehatanEmployerPercent: '0', bpjsJkkEmployerPercent: '0', bpjsJkmEmployerPercent: '0' };
const employee = (over = {}) => ({
  id: 'e1', name: 'Dani', employeeCode: 'EMP001', nikKtp: '3174000000000001', ptkpStatus: 'TK0', taxEmploymentType: 'PERMANENT',
  role: { name: 'Stylist' }, salarySettings: [NO_EMPLOYER], ...over,
});
const daniItems = [
  { type: 'INCOME',    category: 'gaji',           amount: '15000000' },
  { type: 'DEDUCTION', category: 'bpjs_kesehatan', amount: '35000' },
  { type: 'DEDUCTION', category: 'bpjs_jht',       amount: '65000' },
  { type: 'DEDUCTION', category: 'bpjs_jp',        amount: '65000' },
];
// Slip masa ke-n tahun 2027 (periodEnd = hari terakhir bulan sebelumnya)
const slip = (month, over = {}) => ({
  id: `p${month}`, status: 'PAID', employee: employee(),
  periodEnd: new Date(Date.UTC(2027, month - 1, 0)),
  taxPeriod: `2027-${String(month).padStart(2, '0')}`, taxPtkpStatus: 'TK0', taxGross: '15000000',
  taxMethod: 'TER', taxTerRate: '6', pph21: '900000', items: [...daniItems, { type: 'DEDUCTION', category: 'pph21', amount: '900000' }],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  repo.findTaxSetting.mockResolvedValue(TAX_SETTING);
});

describe('bulanan (masa berlaku)', () => {
  test('baris BPMP: NIK, PTKP, kode objek, bruto, tarif, PPh, tanggal potong', async () => {
    repo.findPph21ReportData.mockResolvedValue([slip(3)]);
    const r = await svc.getMonthlyReport({ taxPeriod: '2027-03' });
    expect(repo.findPph21ReportData).toHaveBeenCalledWith({ taxPeriodPrefix: '2027-03', branchId: undefined });
    expect(r.mode).toBe('ACTUAL');
    expect(r.data[0]).toMatchObject({
      employee: { nikKtp: '3174000000000001', position: 'Stylist' },
      ptkpLabel: 'TK/0', taxObjectCode: '21-100-01', document: 'BPMP',
      gross: 15000000, terRate: 6, pph21: 900000, withholdingDate: '2027-03-01',
    });
    expect(r.totals).toEqual({ gross: 15000000, pph21: 900000 });
  });

  test('masa terakhir ditandai A1; pegawai tidak tetap BP21', async () => {
    repo.findPph21ReportData.mockResolvedValue([
      slip(12, { taxMethod: 'ANNUAL', taxTerRate: null, pph21: '1866000' }),
      slip(12, { id: 'x', employee: employee({ id: 'e2', name: 'Eka', taxEmploymentType: 'NON_PERMANENT' }) }),
    ]);
    const r = await svc.getMonthlyReport({ taxPeriod: '2027-12' });
    expect(r.data.map((d) => [d.employee.name, d.document, d.taxObjectCode])).toEqual([
      ['Dani', 'A1', '21-100-01'], ['Eka', 'BP21', '21-100-03'],
    ]);
  });

  test('format masa salah → 400', async () => {
    await expect(svc.getMonthlyReport({ taxPeriod: '2027-13' })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('simulasi uji coba (masa sebelum 2027-01)', () => {
  test('slip dibayar November 2026 dihitung TER tanpa disimpan; PTKP kosong ditandai', async () => {
    repo.findPayrollsByPayDate.mockResolvedValue([
      { id: 'n1', status: 'DRAFT', employee: employee(), periodEnd: new Date('2026-10-31'), items: daniItems },
      { id: 'n2', status: 'PAID',  employee: employee({ id: 'e2', name: 'Eka', ptkpStatus: null }), periodEnd: new Date('2026-10-31'), items: daniItems },
    ]);
    const r = await svc.getMonthlyReport({ taxPeriod: '2026-11' });
    expect(repo.findPayrollsByPayDate).toHaveBeenCalledWith({
      periodEndFrom: new Date('2026-10-31'), periodEndTo: new Date('2026-11-29'), branchId: undefined,
    });
    expect(r.mode).toBe('SIMULATION');
    expect(r.data[0]).toMatchObject({ gross: 15000000, terRate: 6, pph21: 900000, missingPtkp: false, statuses: ['DRAFT'] });
    expect(r.data[1]).toMatchObject({ pph21: 0, missingPtkp: true });
    expect(repo.findPph21ReportData).not.toHaveBeenCalled();
  });
});

describe('A1 tahunan', () => {
  test('contoh Dani: rincian hitung ulang setahun', async () => {
    const slips = Array.from({ length: 11 }, (_, i) => slip(i + 1));
    slips.push(slip(12, { taxMethod: 'ANNUAL', taxTerRate: null, pph21: '1866000' }));
    repo.findPph21ReportData.mockResolvedValue(slips);

    const r = await svc.getAnnualReport({ year: '2027' });
    expect(r.data).toHaveLength(1);
    expect(r.data[0]).toMatchObject({
      periodFrom: '2027-01', periodTo: '2027-12', taxObjectCode: '21-100-01',
      lines: { salary: 180000000, otherAllowance: 0, insurancePremium: 0, bonus: 0 },
      gross: 180000000, positionCost: 6000000, pension: 1560000, neto: 172440000,
      ptkp: 54000000, pkp: 118440000, annualTax: 11766000, withheldBefore: 9900000, finalPeriodTax: 1866000,
    });
  });

  test('karyawan tanpa masa terakhir tidak dibuatkan A1', async () => {
    repo.findPph21ReportData.mockResolvedValue([slip(1), slip(2)]);
    const r = await svc.getAnnualReport({ year: '2027' });
    expect(r.data).toEqual([]);
  });

  test('premi BPJS perusahaan & potongan alpha masuk rincian', async () => {
    repo.findPph21ReportData.mockResolvedValue([slip(12, {
      taxMethod: 'ANNUAL', taxGross: '15550000',
      items: [
        { type: 'INCOME', category: 'gaji', amount: '15000000' },
        { type: 'INCOME', category: 'komisi', amount: '500000' },
        { type: 'INCOME', category: 'bonus_omset', amount: '200000' },
        { type: 'DEDUCTION', category: 'absen', amount: '750000' },
      ],
    })]);
    const r = await svc.getAnnualReport({ year: '2027' });
    // bruto 15.550.000 = gaji 14.250.000 + lainnya 500.000 + bonus 200.000 + premi 600.000
    expect(r.data[0].lines).toEqual({ salary: 14250000, otherAllowance: 500000, bonus: 200000, insurancePremium: 600000 });
  });
});
